-- Rollback Tramo 7: Admin ledger trace performance indexes
DROP INDEX idx_ledger_transaction_reference_created_at ON LedgerTransaction;
DROP INDEX idx_ledger_transaction_status_created_at ON LedgerTransaction;
DROP INDEX idx_ledger_entry_transaction_created_at ON LedgerEntry;
