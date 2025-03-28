import type { IndexedTreeLeaf, IndexedTreeLeafPreimage } from '@aztec/foundation/trees';
import type { BatchInsertionResult } from '@aztec/stdlib/trees';

import type { IndexedTreeSnapshot, TreeSnapshot, TreeSnapshotBuilder } from '../snapshots/snapshot_builder.js';
import type { AppendOnlyTree } from './append_only_tree.js';
import type { MerkleTree } from './merkle_tree.js';

/**
 * Factory for creating leaf preimages.
 */
export interface PreimageFactory {
  /**
   * Creates a new preimage from a leaf.
   * @param leaf - Leaf to create a preimage from.
   * @param nextKey - Next key of the leaf.
   * @param nextIndex - Next index of the leaf.
   */
  fromLeaf(leaf: IndexedTreeLeaf, nextKey: bigint, nextIndex: bigint): IndexedTreeLeafPreimage;
  /**
   * Creates a new preimage from a buffer.
   * @param buffer - Buffer to create a preimage from.
   */
  fromBuffer(buffer: Buffer): IndexedTreeLeafPreimage;
  /**
   * Creates an empty preimage.
   */
  empty(): IndexedTreeLeafPreimage;
  /**
   * Creates a copy of a preimage.
   * @param preimage - Preimage to be cloned.
   */
  clone(preimage: IndexedTreeLeafPreimage): IndexedTreeLeafPreimage;
}

/**
 * Indexed merkle tree.
 */
export interface IndexedTree
  extends MerkleTree<Buffer>,
    TreeSnapshotBuilder<IndexedTreeSnapshot>,
    Omit<AppendOnlyTree<Buffer>, keyof TreeSnapshotBuilder<TreeSnapshot<Buffer>>> {
  /**
   * Finds the index of the largest leaf whose value is less than or equal to the provided value.
   * @param newValue - The new value to be inserted into the tree.
   * @param includeUncommitted - If true, the uncommitted changes are included in the search.
   * @returns The found leaf index and a flag indicating if the corresponding leaf's value is equal to `newValue`.
   */
  findIndexOfPreviousKey(
    newValue: bigint,
    includeUncommitted: boolean,
  ):
    | {
        /**
         * The index of the found leaf.
         */
        index: bigint;
        /**
         * A flag indicating if the corresponding leaf's value is equal to `newValue`.
         */
        alreadyPresent: boolean;
      }
    | undefined;

  /**
   * Gets the latest LeafPreimage copy.
   * @param index - Index of the leaf of which to obtain the LeafPreimage copy.
   * @param includeUncommitted - If true, the uncommitted changes are included in the search.
   * @returns A copy of the leaf preimage at the given index or undefined if the leaf was not found.
   */
  getLatestLeafPreimageCopy(index: bigint, includeUncommitted: boolean): IndexedTreeLeafPreimage | undefined;

  /**
   * Batch insert multiple leaves into the tree.
   * @param leaves - Leaves to insert into the tree.
   * @param subtreeHeight - Height of the subtree.
   * @param includeUncommitted - If true, the uncommitted changes are included in the search.
   */
  batchInsert<TreeHeight extends number, SubtreeHeight extends number, SubtreeSiblingPathHeight extends number>(
    leaves: Buffer[],
    subtreeHeight: SubtreeHeight,
    includeUncommitted: boolean,
  ): Promise<BatchInsertionResult<TreeHeight, SubtreeSiblingPathHeight>>;
}
