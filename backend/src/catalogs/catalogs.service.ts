import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CatalogsService {
  constructor(private readonly prisma: PrismaService) {}

  getCountries() {
    return this.prisma.country.findMany({
      select: { idCountry: true, countryName: true, countryCode: true },
      orderBy: { countryName: 'asc' },
    });
  }
}
