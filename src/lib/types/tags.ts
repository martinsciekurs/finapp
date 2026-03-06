/**
 * Shared types for the transaction tags feature.
 */

export interface TagData {
  id: string;
  name: string;
  color: string;
}

export interface TransactionTagData {
  transactionId: string;
  tagId: string;
}
