import { SecurityService } from '../../src/security/security.service';

describe('SecurityService', () => {
  it('is defined', () => {
    const service = new SecurityService();
    expect(service).toBeDefined();
  });
});
