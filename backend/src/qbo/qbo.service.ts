import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class QboService {
  private readonly logger = new Logger(QboService.name);

  // TODO: implement QBO OAuth 2.0 and replace all stubs below

  async createVendor(name: string, email?: string): Promise<string | null> {
    this.logger.warn(
      `QBO not configured. Vendor "${name}" (${email ?? 'no email'}) created without qboVendorId.`,
    );
    return null;
  }

  async createBillAndPay(
    qboVendorId: string,
    amount: number,
    description: string,
  ): Promise<string | null> {
    this.logger.warn(
      `QBO not configured. Bill + payment for vendor ${qboVendorId} ($${amount.toFixed(2)}) not sent.`,
    );
    return null;
  }

  async getBillPaymentStatus(
    _qboBillPaymentId: string,
  ): Promise<{ status: 'paid' | 'rejected'; reason?: string } | null> {
    this.logger.warn(`QBO not configured. Cannot retrieve BillPayment status.`);
    return null;
  }
}
