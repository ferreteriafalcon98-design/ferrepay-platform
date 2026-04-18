export class SandboxMockAdapter {
  async submit(documentNumber: string) {
    return {
      provider: 'sandbox-mock',
      code: '200',
      message: 'accepted',
      ackUri: `s3://fiscal-sandbox/${documentNumber}/ack.json`,
    };
  }
}
