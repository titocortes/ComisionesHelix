import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { ProductsModule } from './products/products.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { CommissionsModule } from './commissions/commissions.module.js';
import { CatalogsModule } from './catalogs/catalogs.module.js';
import { HelixModule } from './helix/helix.module.js';
import { IngestionModule } from './ingestion/ingestion.module.js';
import { AuthorizationModule } from './authorization/authorization.module.js';
import { BeneficiariesModule } from './beneficiaries/beneficiaries.module.js';
import { CommissionPaymentsModule } from './commission-payments/commission-payments.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    ProductsModule,
    TransactionsModule,
    PaymentsModule,
    CommissionsModule,
    CatalogsModule,
    HelixModule,
    IngestionModule,
    AuthorizationModule,
    BeneficiariesModule,
    CommissionPaymentsModule,
    DashboardModule,
  ],
})
export class AppModule {}
