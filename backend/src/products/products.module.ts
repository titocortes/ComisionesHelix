import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { HelixModule } from '../helix/helix.module.js';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';

@Module({
  imports: [PrismaModule, HelixModule],
  providers: [ProductsService],
  controllers: [ProductsController],
})
export class ProductsModule {}
