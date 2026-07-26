import { Injectable, NotFoundException, ConflictException, BadGatewayException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { HelixActiveProduct, HelixApiService } from '../helix/helix-api.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { UpsertCommissionRateDto } from './dto/upsert-commission-rate.dto.js';
import { UpsertDiscountDto } from './dto/upsert-discount.dto.js';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly helixApi: HelixApiService,
  ) {}

  async list() {
    const products = await this.prisma.product.findMany({
      include: {
        commissionRates: {
          where: { active: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { productName: 'asc' },
    });

    return products.map(p => ({
      idProduct:      p.idProduct,
      helixProductId: p.helixProductId,
      productName:    p.productName,
      shortName:      p.shortName,
      active:         p.active,
      commissionRate: p.commissionRates[0]
        ? {
            idCommissionRate:       p.commissionRates[0].idCommissionRate,
            monthlySellerAmount:    Number(p.commissionRates[0].monthlySellerAmount),
            monthlyAffiliateAmount: Number(p.commissionRates[0].monthlyAffiliateAmount),
            monthlyAgencyAmount:    Number(p.commissionRates[0].monthlyAgencyAmount),
            active:                 p.commissionRates[0].active,
          }
        : null,
    }));
  }

  async create(dto: CreateProductDto) {
    const provider = await this.getOrCreateDefaultProvider();
    const catPeriodo = await this.getOrCreateDefaultPeriodo();

    return this.prisma.product.create({
      data: {
        helixProductId: dto.helixProductId ?? null,
        productName:    dto.productName,
        shortName:      dto.shortName,
        priceList:      0,
        costProduct:    0,
        idProvider:     provider.idProvider,
        idCatPeriodo:   catPeriodo.idCatPeriodo,
        active:         true,
      },
    });
  }

  async update(idProduct: number, dto: UpdateProductDto) {
    await this.findOrFail(idProduct);
    return this.prisma.product.update({ where: { idProduct }, data: dto });
  }

  async syncFromHelix() {
    let helixProducts: HelixActiveProduct[];
    this.logger.log(`Starting sync with Helix for active products`);
    try {
      helixProducts = await this.helixApi.getActiveProducts();
    } catch (err: any) {
      this.logger.error(`Error fetching active products from Helix: ${err?.message}`);
      throw new BadGatewayException('No se pudo conectar con Helix para obtener los productos activos');
    }
    this.logger.log(`Helix returned ${helixProducts.length} active products`);

    const provider = await this.getOrCreateDefaultProvider();
    const catPeriodo = await this.getOrCreateDefaultPeriodo();

    let created = 0;
    let updated = 0;
    const helixIds = helixProducts.map(hp => hp.idProduct);

    for (const hp of helixProducts) {
      const existing = await this.prisma.product.findFirst({
        where: { helixProductId: hp.idProduct },
      });

      if (!existing) {
        await this.prisma.product.create({
          data: {
            helixProductId: hp.idProduct,
            productName:    hp.productName,
            shortName:      hp.productName.substring(0, 20),
            priceList:      0,
            costProduct:    0,
            idProvider:     provider.idProvider,
            idCatPeriodo:   catPeriodo.idCatPeriodo,
            active:         true,
          },
        });
        created++;
        this.logger.log(`Created product helixId=${hp.idProduct} name="${hp.productName}"`);
      } else {
        const needsUpdate =
          existing.productName !== hp.productName || !existing.active;
        if (needsUpdate) {
          await this.prisma.product.update({
            where: { idProduct: existing.idProduct },
            data: { productName: hp.productName, active: true },
          });
          updated++;
        }
      }
    }

    const deactivatedResult = await this.prisma.product.updateMany({
      where: {
        helixProductId: { not: null, notIn: helixIds },
        active: true,
      },
      data: { active: false },
    });
    const deactivated = deactivatedResult.count;
    this.logger.log(`Sync complete: created=${created} updated=${updated} deactivated=${deactivated}`);

    return { created, updated, deactivated, total: helixProducts.length };
  }

  private async getOrCreateDefaultProvider() {
    let provider = await this.prisma.provider.findFirst();
    if (!provider) {
      provider = await this.prisma.provider.create({ data: { providerName: 'Default' } });
    }
    return provider;
  }

  private async getOrCreateDefaultPeriodo() {
    let catPeriodo = await this.prisma.catPeriodo.findFirst();
    if (!catPeriodo) {
      catPeriodo = await this.prisma.catPeriodo.create({
        data: { periodName: 'Anual', periodMonths: 12 },
      });
    }
    return catPeriodo;
  }

  async upsertCommissionRate(idProduct: number, dto: UpsertCommissionRateDto) {
    await this.findOrFail(idProduct);

    const existing = await this.prisma.commissionRate.findFirst({
      where: { idProduct, active: true },
    });

    if (existing) {
      const updated = await this.prisma.commissionRate.update({
        where: { idCommissionRate: existing.idCommissionRate },
        data: {
          monthlySellerAmount:    dto.monthlySellerAmount,
          monthlyAffiliateAmount: dto.monthlyAffiliateAmount,
          monthlyAgencyAmount:    dto.monthlyAgencyAmount,
        },
      });
      return this.formatRate(updated);
    }

    const created = await this.prisma.commissionRate.create({
      data: {
        idProduct,
        monthlySellerAmount:    dto.monthlySellerAmount,
        monthlyAffiliateAmount: dto.monthlyAffiliateAmount,
        monthlyAgencyAmount:    dto.monthlyAgencyAmount,
        active: true,
      },
    });
    return this.formatRate(created);
  }

  async listDiscounts(idProduct: number) {
    await this.findOrFail(idProduct);
    const discounts = await this.prisma.dependentDiscount.findMany({
      where: { idProduct },
      orderBy: { dependentNumber: 'asc' },
    });
    return discounts.map(d => ({ ...d, discountPercentage: Number(d.discountPercentage) }));
  }

  async createDiscount(idProduct: number, dto: UpsertDiscountDto) {
    await this.findOrFail(idProduct);
    try {
      const d = await this.prisma.dependentDiscount.create({
        data: {
          idProduct,
          dependentNumber:    dto.dependentNumber,
          discountPercentage: dto.discountPercentage,
          orMore:             dto.orMore ?? false,
        },
      });
      return { ...d, discountPercentage: Number(d.discountPercentage) };
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          `Ya existe un descuento para el dependiente #${dto.dependentNumber} en este producto`,
        );
      }
      throw err;
    }
  }

  async updateDiscount(idProduct: number, idDependentDiscount: number, dto: UpsertDiscountDto) {
    const existing = await this.prisma.dependentDiscount.findFirst({
      where: { idDependentDiscount, idProduct },
    });
    if (!existing) throw new NotFoundException(`Discount ${idDependentDiscount} not found`);

    try {
      const d = await this.prisma.dependentDiscount.update({
        where: { idDependentDiscount },
        data: {
          dependentNumber:    dto.dependentNumber,
          discountPercentage: dto.discountPercentage,
          orMore:             dto.orMore ?? false,
        },
      });
      return { ...d, discountPercentage: Number(d.discountPercentage) };
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          `Ya existe un descuento para el dependiente #${dto.dependentNumber} en este producto`,
        );
      }
      throw err;
    }
  }

  async deleteDiscount(idProduct: number, idDependentDiscount: number) {
    const existing = await this.prisma.dependentDiscount.findFirst({
      where: { idDependentDiscount, idProduct },
    });
    if (!existing) throw new NotFoundException(`Discount ${idDependentDiscount} not found`);
    await this.prisma.dependentDiscount.delete({ where: { idDependentDiscount } });
    return { success: true };
  }

  private async findOrFail(idProduct: number) {
    const product = await this.prisma.product.findUnique({ where: { idProduct } });
    if (!product) throw new NotFoundException(`Product ${idProduct} not found`);
    return product;
  }

  private formatRate(rate: {
    idCommissionRate: number;
    monthlySellerAmount: unknown;
    monthlyAffiliateAmount: unknown;
    monthlyAgencyAmount: unknown;
    active: boolean;
  }) {
    return {
      idCommissionRate:       rate.idCommissionRate,
      monthlySellerAmount:    Number(rate.monthlySellerAmount),
      monthlyAffiliateAmount: Number(rate.monthlyAffiliateAmount),
      monthlyAgencyAmount:    Number(rate.monthlyAgencyAmount),
      active:                 rate.active,
    };
  }
}
