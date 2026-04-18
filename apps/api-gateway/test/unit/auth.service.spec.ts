import { AuthService } from '../../src/auth/auth.service';
import { WalletService } from '../../src/wallet/wallet.service';

describe('AuthService', () => {
  it('is defined', () => {
    const service = new AuthService({} as WalletService);
    expect(service).toBeDefined();
  });
});
