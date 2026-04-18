import { AdminLedgerService } from '../../src/admin-ledger/admin-ledger.service';

describe('AdminLedgerService', () => {
  it('is defined', () => {
    const service = new AdminLedgerService();
    expect(service).toBeDefined();
  });
});
