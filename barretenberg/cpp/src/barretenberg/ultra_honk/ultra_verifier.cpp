#include "./ultra_verifier.hpp"
#include "barretenberg/commitment_schemes/zeromorph/zeromorph.hpp"
#include "barretenberg/numeric/bitop/get_msb.hpp"
#include "barretenberg/transcript/transcript.hpp"
#include "barretenberg/ultra_honk/oink_verifier.hpp"

namespace bb {
template <typename Flavor>
UltraVerifier_<Flavor>::UltraVerifier_(const std::shared_ptr<Transcript>& transcript,
                                       const std::shared_ptr<VerificationKey>& verifier_key)
    : key(verifier_key)
    , transcript(transcript)
{}

/**
 * @brief Construct an UltraVerifier directly from a verification key
 *
 * @tparam Flavor
 * @param verifier_key
 */
template <typename Flavor>
UltraVerifier_<Flavor>::UltraVerifier_(const std::shared_ptr<VerificationKey>& verifier_key)
    : key(verifier_key)
    , transcript(std::make_shared<Transcript>())
{}

template <typename Flavor>
UltraVerifier_<Flavor>::UltraVerifier_(UltraVerifier_&& other)
    : key(std::move(other.key))
{}

template <typename Flavor> UltraVerifier_<Flavor>& UltraVerifier_<Flavor>::operator=(UltraVerifier_&& other)
{
    key = other.key;
    return *this;
}

/**
 * @brief This function verifies an Ultra Honk proof for a given Flavor.
 *
 */
template <typename Flavor> bool UltraVerifier_<Flavor>::verify_proof(const HonkProof& proof)
{
    using FF = typename Flavor::FF;
    using PCS = typename Flavor::PCS;
    using Curve = typename Flavor::Curve;
    using ZeroMorph = ZeroMorphVerifier_<Curve>;
    using VerifierCommitments = typename Flavor::VerifierCommitments;

    transcript = std::make_shared<Transcript>(proof);
    VerifierCommitments commitments{ key };
    OinkVerifier<Flavor> oink_verifier{ key, transcript };
    auto [relation_parameters, witness_commitments, public_inputs, alphas] = oink_verifier.verify();

    // Copy the witness_commitments over to the VerifierCommitments
    for (auto [wit_comm_1, wit_comm_2] : zip_view(commitments.get_witness(), witness_commitments.get_all())) {
        wit_comm_1 = wit_comm_2;
    }

    // Execute Sumcheck Verifier
    const size_t log_circuit_size = static_cast<size_t>(numeric::get_msb(key->circuit_size));
    auto sumcheck = SumcheckVerifier<Flavor>(log_circuit_size, transcript);

    FF challenge_factor;

    auto gate_challenges = std::vector<FF>(log_circuit_size);
    for (size_t idx = 0; idx < log_circuit_size; idx++) {
        gate_challenges[idx] = transcript->template get_challenge<FF>("Sumcheck:gate_challenge_" + std::to_string(idx));
        if constexpr (Flavor::HasZK) {
            challenge_factor = gate_challenges[idx] * (FF(1) - gate_challenges[idx]);
            key->challenge_factor = challenge_factor;
        }
    }

    auto [multivariate_challenge, claimed_evaluations, sumcheck_verified] =
        sumcheck.verify(relation_parameters, alphas, gate_challenges);

    // If Sumcheck did not verify, return false
    if (sumcheck_verified.has_value() && !sumcheck_verified.value()) {
        info("Sumcheck verification failed.");
        return false;
    }

    // Modify commitments.get_all_witnesses()[k] by adding \sum u_i (1 - u_i) * eval_masking_commitment[k]
    if constexpr (Flavor::HasZK) {
        // VerifierCommitments eval_masking_commitments{ key };
        auto eval_masking_commitments = key->eval_masking_commitments;
        for (auto [witness_commitment, eval_masking_commitment] :
             zip_view(commitments.get_all_witnesses(), eval_masking_commitments)) {
            witness_commitment = witness_commitment + eval_masking_commitment * key->challenge_factor;
        }
    }

    // Execute ZeroMorph rounds to produce an opening claim and verify it with a univariate PCS. See
    // https://hackmd.io/dlf9xEwhTQyE3hiGbq4FsA?view for a complete description of the unrolled protocol.
    auto opening_claim = ZeroMorph::verify(key->circuit_size,
                                           commitments.get_unshifted(),
                                           commitments.get_to_be_shifted(),
                                           claimed_evaluations.get_unshifted(),
                                           claimed_evaluations.get_shifted(),
                                           multivariate_challenge,
                                           Commitment::one(),
                                           transcript);
    auto pairing_points = PCS::reduce_verify(opening_claim, transcript);
    auto pcs_verified = key->pcs_verification_key->pairing_check(pairing_points[0], pairing_points[1]);
    return sumcheck_verified.value() && pcs_verified;
}

template class UltraVerifier_<UltraFlavor>;
template class UltraVerifier_<UltraKeccakFlavor>;
template class UltraVerifier_<MegaFlavor>;
template class UltraVerifier_<UltraFlavorWithZK>;

} // namespace bb
