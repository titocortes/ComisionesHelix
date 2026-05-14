import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { userEmail: email },
      include: { userRole: true },
    });
  }

  findById(id: number) {
    return this.prisma.user.findUnique({
      where: { idUser: id },
      include: { userRole: true, affiliate: true },
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      where: { active: true },
      include: { userRole: true, affiliate: true, region: true },
      omit: { password: true, hashKeyConfirmation: true },
    });
  }
}
