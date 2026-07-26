import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtPayload } from './strategies/jwt.strategy.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Credenciales inválidas');

    if (!user.active) throw new UnauthorizedException('Usuario inactivo');

    return this.generateTokens(user);
  }

  async refresh(token: string) {
    const stored = await this.prisma.refreshToken.findFirst({
      where: { token, revoked: false },
      include: { user: { include: { userRole: true } } },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    await this.prisma.refreshToken.update({
      where: { idToken: stored.idToken },
      data: { revoked: true },
    });

    return this.generateTokens(stored.user);
  }

  async logout(userId: number) {
    await this.prisma.refreshToken.updateMany({
      where: { idUser: userId, revoked: false },
      data: { revoked: true },
    });
  }

  private async generateTokens(user: {
    idUser: number;
    firstName: string;
    lastName: string;
    userEmail: string;
    securityLevel: number;
    idUserRole: number;
    idAffiliate: number | null;
    userRole?: { roleName: string } | null;
  }) {
    const payload: JwtPayload = {
      sub: user.idUser,
      email: user.userEmail,
      securityLevel: user.securityLevel,
      idAffiliate: user.idAffiliate,
    };

    const access_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: (process.env.JWT_EXPIRATION ?? '15m') as any,
    });

    const refresh_token = this.jwtService.sign(
      { sub: user.idUser },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d' as any,
      },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refresh_token,
        idUser: user.idUser,
        expiresAt,
      },
    });

    return {
      access_token,
      refresh_token,
      user: {
        idUser: user.idUser,
        firstName: user.firstName,
        lastName: user.lastName,
        userEmail: user.userEmail,
        securityLevel: user.securityLevel,
        idUserRole: user.idUserRole,
        roleName: user.userRole?.roleName ?? null,
      },
    };
  }
}
