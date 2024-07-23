#pragma once

#include "barretenberg/stdlib_circuit_builders/ultra_flavor.hpp"

namespace bb {

class UltraFlavorWithZK : public bb::UltraFlavor {

  public:
    // This flavor runs with ZK Sumcheck
    static constexpr bool HasZK = true;
    // Compute the maximum over all partial subrelation lengths incremented by the corresponding subrelation witness
    // degrees for the Relations inherited from UltraFlavor
    static constexpr size_t MAX_PARTIAL_RELATION_LENGTH = compute_max_zk_length<Relations>();
    // Determine the number of evaluations of Prover and Libra Polynomials that the Prover sends to the Verifier in
    // the rounds of ZK Sumcheck.
    static constexpr size_t BATCHED_RELATION_PARTIAL_LENGTH = MAX_PARTIAL_RELATION_LENGTH + 1;
    // Construct the container for the sub-relations contributions
    using SumcheckTupleOfTuplesOfUnivariates = decltype(create_zk_sumcheck_tuple_of_tuples_of_univariates<Relations>());
    // Re-define ExtendedEdges to account for the incremented MAX_PARTIAL_RELATION_LENGTH
    using ExtendedEdges = ProverUnivariates<MAX_PARTIAL_RELATION_LENGTH>;

    // Add masking polynomials to the proving key
    class ProvingKey : public bb::UltraFlavor::ProvingKey {
      public:
        // Add extra features here
        std::array<FF, NUM_ALL_WITNESSES> eval_masking_scalars;
        std::vector<bb::Univariate<FF, BATCHED_RELATION_PARTIAL_LENGTH>> libra_univariates;
        using UltraFlavor::ProvingKey::ProvingKey;
    };
};
} // namespace bb