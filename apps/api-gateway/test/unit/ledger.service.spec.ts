import { LedgerService } from '../../src/ledger/ledger.service';

describe('LedgerService', () => {
  it('is defined', () => {
    const service = new LedgerService();
    expect(service).toBeDefined();
  });
});
