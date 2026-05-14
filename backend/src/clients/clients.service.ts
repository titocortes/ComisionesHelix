import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { QueryClientDto } from './dto/query-client.dto.js';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryClientDto) {
    const { search, page = 1, limit = 20, sortBy = 'lastName', sortOrder = 'asc' } = query;

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { idNumber: { contains: search } },
        { mobile: { contains: search } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.client.count({ where }),
      this.prisma.client.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          idClient: true,
          firstName: true,
          lastName: true,
          email: true,
          idType: true,
          idNumber: true,
          mobile: true,
          usa_mobile: true,
          gender: true,
          activo: true,
          assignedTo: true,
          source: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const client = await this.prisma.client.findFirst({
      where: { idClient: id, deletedAt: null },
      include: {
        countryCitizenship: { select: { idCountry: true, countryName: true } },
        countryResidence: { select: { idCountry: true, countryName: true } },
      },
    });
    if (!client) throw new NotFoundException(`Client #${id} not found`);
    return client;
  }

  async create(dto: CreateClientDto, createdBy: number) {
    const existing = await this.prisma.client.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existing) throw new ConflictException('Email already registered');

    return this.prisma.client.create({
      data: { ...dto, createdBy },
    });
  }

  async update(id: number, dto: UpdateClientDto) {
    await this.findOne(id);

    if (dto.email) {
      const conflict = await this.prisma.client.findFirst({
        where: { email: dto.email, deletedAt: null, NOT: { idClient: id } },
      });
      if (conflict) throw new ConflictException('Email already registered');
    }

    return this.prisma.client.update({
      where: { idClient: id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.client.update({
      where: { idClient: id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Client deleted successfully' };
  }
}
