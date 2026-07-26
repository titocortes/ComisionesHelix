import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  ParseIntPipe,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import type { QboWebhookPayload } from './commission-payments.service.js';
import { CommissionPaymentsService } from './commission-payments.service.js';
import {
  PaymentTrackingQueryDto,
  BeneficiarySummaryQueryDto,
  BatchesQueryDto,
} from './dto/payment-tracking-query.dto.js';

// ─── QBO Webhook (public — called by QuickBooks) ─────────────────────────────

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly commissionPayments: CommissionPaymentsService) {}

  @Post('quickbooks')
  async handleQboWebhook(
    @Body() payload: object,
    @Headers('intuit-signature') signature: string,
  ) {
    // TODO: replace with HMAC-SHA256 verification once QBO OAuth 2.0 is configured
    const expectedToken = process.env['QBO_VERIFIER_TOKEN'];
    if (expectedToken && signature !== expectedToken) {
      this.logger.warn('QBO webhook received with invalid signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    await this.commissionPayments.processWebhook(payload as QboWebhookPayload);
    return { success: true };
  }
}

// ─── Commission Payments admin endpoints (JWT + admin) ──────────────────────

@Controller('commission-payments')
@UseGuards(JwtAuthGuard, AdminGuard)
export class CommissionPaymentsController {
  constructor(private readonly commissionPayments: CommissionPaymentsService) {}

  // ── Tracking queries ────────────────────────────────────────────────────

  @Get()
  getTrackingRecords(@Query() query: PaymentTrackingQueryDto) {
    return this.commissionPayments.getTrackingRecords(query);
  }

  @Get('beneficiary-summary')
  getBeneficiarySummary(@Query() query: BeneficiarySummaryQueryDto) {
    return this.commissionPayments.getBeneficiarySummary(query);
  }

  @Get('batches')
  getPaymentBatches(@Query() query: BatchesQueryDto) {
    return this.commissionPayments.getPaymentBatches(query);
  }

  @Get('month-counts')
  getMonthCounts() {
    return this.commissionPayments.getMonthCounts();
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  @Post(':id/retry')
  retryPayment(@Param('id', ParseIntPipe) id: number) {
    return this.commissionPayments.retryPayment(id);
  }
}
