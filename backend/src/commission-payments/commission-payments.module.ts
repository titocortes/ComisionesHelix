import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { QboModule } from '../qbo/qbo.module.js';
import { CommissionPaymentsService } from './commission-payments.service.js';
import { CommissionPaymentsCron } from './commission-payments.cron.js';
import { CommissionPaymentsController, WebhooksController } from './commission-payments.controller.js';

@Module({
  imports: [PrismaModule, QboModule],
  providers: [CommissionPaymentsService, CommissionPaymentsCron],
  controllers: [WebhooksController, CommissionPaymentsController],
})
export class CommissionPaymentsModule {}
