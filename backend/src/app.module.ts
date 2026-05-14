import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { ProductsModule } from './products/products.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { CommissionsModule } from './commissions/commissions.module.js';
import { CatalogsModule } from './catalogs/catalogs.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    ProductsModule,
    TransactionsModule,
    PaymentsModule,
    CommissionsModule,
    CatalogsModule,
  ],
})
export class AppModule {}
