import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { UpsertCommissionRateDto } from './dto/upsert-commission-rate.dto.js';
import { UpsertDiscountDto } from './dto/upsert-discount.dto.js';

@Controller('products')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list() {
    return this.productsService.list();
  }

  @Post('sync')
  syncFromHelix() {
    return this.productsService.syncFromHelix();
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Put(':id/commission-rate')
  upsertCommissionRate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertCommissionRateDto,
  ) {
    return this.productsService.upsertCommissionRate(id, dto);
  }

  @Get(':id/discounts')
  listDiscounts(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.listDiscounts(id);
  }

  @Post(':id/discounts')
  createDiscount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertDiscountDto,
  ) {
    return this.productsService.createDiscount(id, dto);
  }

  @Patch(':id/discounts/:did')
  updateDiscount(
    @Param('id', ParseIntPipe) id: number,
    @Param('did', ParseIntPipe) did: number,
    @Body() dto: UpsertDiscountDto,
  ) {
    return this.productsService.updateDiscount(id, did, dto);
  }

  @Delete(':id/discounts/:did')
  deleteDiscount(
    @Param('id', ParseIntPipe) id: number,
    @Param('did', ParseIntPipe) did: number,
  ) {
    return this.productsService.deleteDiscount(id, did);
  }
}
