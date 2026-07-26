import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthorizationCron } from './authorization.cron.js';

@Module({
  imports: [PrismaModule],
  providers: [AuthorizationCron],
})
export class AuthorizationModule {}
