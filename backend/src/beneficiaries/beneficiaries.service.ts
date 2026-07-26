import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  HelixApiService,
  HelixPublicAffiliate,
  HelixPublicAgency,
  HelixTreeAgency,
} from '../helix/helix-api.service.js';
import { QboService } from '../qbo/qbo.service.js';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto.js';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto.js';
import { ListBeneficiariesDto } from './dto/list-beneficiaries.dto.js';

@Injectable()
export class BeneficiariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helixApi: HelixApiService,
    private readonly qbo: QboService,
  ) {}

  findAll(query: ListBeneficiariesDto) {
    const activeFilter =
      query.active === 'true' ? true : query.active === 'false' ? false : undefined;

    return this.prisma.beneficiary.findMany({
      where: {
        ...(query.type ? { beneficiaryType: query.type } : {}),
        ...(activeFilter !== undefined ? { active: activeFilter } : {}),
      },
      orderBy: [{ beneficiaryType: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateBeneficiaryDto, createdByUserId: number) {
    const existing = await this.prisma.beneficiary.findUnique({
      where: {
        beneficiaryType_helixEntityId: {
          beneficiaryType: dto.beneficiaryType,
          helixEntityId: dto.helixEntityId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `A ${dto.beneficiaryType} beneficiary for helixEntityId ${dto.helixEntityId} already exists`,
      );
    }

    const qboVendorId = await this.qbo.createVendor(dto.name, dto.email);

    return this.prisma.beneficiary.create({
      data: {
        name: dto.name,
        email: dto.email,
        beneficiaryType: dto.beneficiaryType,
        helixEntityId: dto.helixEntityId,
        qboVendorId,
        idUser: dto.idUser ?? null,
        createdByUserId,
      },
    });
  }

  async update(idBeneficiary: number, dto: UpdateBeneficiaryDto) {
    await this.findOneOrFail(idBeneficiary);

    return this.prisma.beneficiary.update({
      where: { idBeneficiary },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
      },
    });
  }

  async deactivate(idBeneficiary: number) {
    await this.findOneOrFail(idBeneficiary);

    await this.prisma.beneficiary.update({
      where: { idBeneficiary },
      data: { active: false },
    });

    return { success: true };
  }

  getHelixTree(): Promise<HelixTreeAgency[]> {
    return this.helixApi.getAgencyTree();
  }

  getHelixAgencies(): Promise<HelixPublicAgency[]> {
    return this.helixApi.getPublicAgencies();
  }

  getHelixAffiliatesByAgency(idAgency: number): Promise<HelixPublicAffiliate[]> {
    return this.helixApi.getPublicAffiliatesByAgency(idAgency);
  }

  getAllHelixAffiliates(): Promise<HelixPublicAffiliate[]> {
    return this.helixApi.getAllPublicAffiliates();
  }

  // Used by the deactivation cron
  async syncDeactivations(): Promise<number> {
    const tree = await this.helixApi.getAgencyTree();

    const activeAgencyIds = new Set<number>();
    const activeAffiliateIds = new Set<number>();
    const sellersInTree = new Map<number, boolean>(); // helixEntityId → active

    for (const agency of tree) {
      activeAgencyIds.add(agency.idAgency);
      for (const affiliate of agency.affiliates) {
        activeAffiliateIds.add(affiliate.idAffiliate);
        for (const user of affiliate.users) {
          sellersInTree.set(user.idUser, user.active);
        }
      }
    }

    const activeBeneficiaries = await this.prisma.beneficiary.findMany({
      where: { active: true },
      select: { idBeneficiary: true, beneficiaryType: true, helixEntityId: true },
    });

    let deactivated = 0;

    for (const b of activeBeneficiaries) {
      const shouldDeactivate = this.shouldDeactivate(
        b.beneficiaryType,
        b.helixEntityId,
        activeAgencyIds,
        activeAffiliateIds,
        sellersInTree,
      );

      if (shouldDeactivate) {
        await this.prisma.beneficiary.update({
          where: { idBeneficiary: b.idBeneficiary },
          data: { active: false },
        });
        deactivated++;
      }
    }

    return deactivated;
  }

  private shouldDeactivate(
    type: string,
    helixEntityId: number,
    agencyIds: Set<number>,
    affiliateIds: Set<number>,
    sellersInTree: Map<number, boolean>,
  ): boolean {
    switch (type) {
      case 'agency':
        return !agencyIds.has(helixEntityId);
      case 'affiliate':
        return !affiliateIds.has(helixEntityId);
      case 'seller': {
        const isActive = sellersInTree.get(helixEntityId);
        // not in tree OR in tree with active=false
        return isActive === undefined || isActive === false;
      }
      default:
        return false;
    }
  }

  private async findOneOrFail(idBeneficiary: number) {
    const record = await this.prisma.beneficiary.findUnique({ where: { idBeneficiary } });
    if (!record) throw new NotFoundException(`Beneficiary ${idBeneficiary} not found`);
    return record;
  }
}
