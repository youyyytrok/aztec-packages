#pragma once

#include "barretenberg/stdlib_circuit_builders/ultra_flavor.hpp"

namespace bb {

class UltraFlavorWithZK : public bb::UltraFlavor {

  public:
    static constexpr bool HasZK = true;

    // Determines the number of evaluations of Prover and Libra Polynomials the Prover needs to send to the Verifier in
    // zk-Sumcheck.
    static constexpr size_t BATCHED_RELATION_PARTIAL_LENGTH = compute_max_zk_length<Relations>() + 1;

    using SumcheckTupleOfTuplesOfUnivariates = decltype(create_zk_sumcheck_tuple_of_tuples_of_univariates<Relations>());

    using ExtendedEdges = ProverUnivariates<BATCHED_RELATION_PARTIAL_LENGTH>;

    // using TupleOfArraysOfValues = decltype(create_zk_tuple_of_arrays_of_values<Relations>());
    // using LibraUnivariates = std::vector<bb::Univariate<FF, BATCHED_RELATION_PARTIAL_LENGTH>>;
};
} // namespace bb