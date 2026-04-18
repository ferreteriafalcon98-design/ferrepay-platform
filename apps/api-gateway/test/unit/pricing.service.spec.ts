import { PricingService } from '../../src/pricing/pricing.service';

describe('PricingService', () => {
  it('is defined', () => {
    const service = new PricingService();
    expect(service).toBeDefined();
  });
});
