-- Tramo 7: Admin ledger trace performance indexes
CREATE INDEX idx_ledger_transaction_reference_created_at ON LedgerTransaction(reference, createdAt);
CREATE INDEX idx_ledger_transaction_status_created_at ON LedgerTransaction(status, createdAt);
CREATE INDEX idx_ledger_entry_transaction_created_at ON LedgerEntry(transactionId, createdAt);
