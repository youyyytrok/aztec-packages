#pragma once

#include "barretenberg/stdlib_circuit_builders/ultra_flavor.hpp"

namespace bb {

class UltraFlavorWithZK : public bb::UltraFlavor {

  public:
    static constexpr bool HasZK = true;
    // Determines the number of evaluations of Prover and Libra Polynomials the Prover needs to send to the Verifier in
    // zk-Sumcheck.
    static constexpr size_t BATCHED_RELATION_PARTIAL_LENGTH = compute_max_zk_length<Relations>() + 1;
    // Constructs the container for the sub-relations contributions
    using SumcheckTupleOfTuplesOfUnivariates = decltype(create_zk_sumcheck_tuple_of_tuples_of_univariates<Relations>());
    // Re-define ExtendedEdges to account for the incremented BATCHED_RELATION_PARTIAL_LENGTH
    using ExtendedEdges = ProverUnivariates<BATCHED_RELATION_PARTIAL_LENGTH>;
};
} // namespace bb