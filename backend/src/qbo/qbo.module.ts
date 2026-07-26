import { Module } from '@nestjs/common';
import { QboService } from './qbo.service.js';

@Module({
  providers: [QboService],
  exports: [QboService],
})
export class QboModule {}
