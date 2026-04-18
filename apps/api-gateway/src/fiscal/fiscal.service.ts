import { BadRequestException, Injectable } from '@nestjs/common';
import { FiscalDocumentStatus, FiscalSubmissionStatus, InvoiceRequestStatus, SaleOrderStatus } from '@prisma/client';
import { prisma } from '@metylosa/db';
import { DocumentDecisionEngine } from './document-decision.engine';
import { SandboxMockAdapter } from './sandbox-mock.adapter';

@Injectable()
export class FiscalService {
  private readonly decisionEngine = new DocumentDecisionEngine();
  private readonly adapter = new SandboxMockAdapter();

  async createSaleOrder(userId: string, externalRef: string, countryCode: string, currencyCode: string, amountMinor: bigint) {
    return prisma.saleOrder.create({
      data: {
        userId,
        externalRef,
        countryCode,
        currencyCode,
        amountMinor,
        status: SaleOrderStatus.CREATED,
      },
    });
  }

  async createInvoiceRequest(saleOrderId: string) {
    const saleOrder = await prisma.saleOrder.findUnique({ where: { id: saleOrderId } });
    if (!saleOrder) throw new BadRequestException('SaleOrder not found');

    const decision = this.decisionEngine.decide(saleOrder.amountMinor);

    const request = await prisma.invoiceRequest.create({
      data: {
        saleOrderId,
        decision,
        status: decision === 'ACCEPT' ? InvoiceRequestStatus.ACCEPTED : InvoiceRequestStatus.REJECTED,
        errorCode: decision === 'REJECT' ? 'INVALID_AMOUNT' : null,
        errorMessage: decision === 'REJECT' ? 'Amount must be positive' : null,
      },
    });

    if (decision === 'ACCEPT') {
      await prisma.fiscalDocument.create({
        data: {
          invoiceRequestId: request.id,
          status: FiscalDocumentStatus.DRAFT,
          documentNumber: `INV-${request.id}`,
        },
      });
    }

    return request;
  }

  async submitInvoiceRequest(invoiceRequestId: string) {
    const req = await prisma.invoiceRequest.findUnique({ where: { id: invoiceRequestId }, include: { fiscalDocuments: true } });
    if (!req) throw new BadRequestException('InvoiceRequest not found');
    if (req.status !== InvoiceRequestStatus.ACCEPTED) throw new BadRequestException('InvoiceRequest is not accepted');

    const doc = req.fiscalDocuments[0];
    if (!doc?.documentNumber) throw new BadRequestException('FiscalDocument missing');

    const response = await this.adapter.submit(doc.documentNumber);

    await prisma.$transaction([
      prisma.fiscalSubmission.create({
        data: {
          fiscalDocumentId: doc.id,
          provider: response.provider,
          status: FiscalSubmissionStatus.ACCEPTED,
          responseCode: response.code,
          responseMessage: response.message,
          requestPayload: { documentNumber: doc.documentNumber },
          responsePayload: response,
        },
      }),
      prisma.fiscalArtifact.create({
        data: {
          fiscalDocumentId: doc.id,
          kind: 'ACK',
          uri: response.ackUri,
          checksum: `sha256:${doc.id}`,
        },
      }),
      prisma.fiscalDocument.update({ where: { id: doc.id }, data: { status: FiscalDocumentStatus.ACCEPTED } }),
      prisma.saleOrder.update({ where: { id: req.saleOrderId }, data: { status: SaleOrderStatus.INVOICED } }),
    ]);

    return { ok: true, invoiceRequestId };
  }

  async getInvoiceRequest(id: string) {
    return prisma.invoiceRequest.findUnique({
      where: { id },
      include: {
        saleOrder: true,
        fiscalDocuments: {
          include: {
            submissions: true,
            artifacts: true,
          },
        },
      },
    });
  }
}
