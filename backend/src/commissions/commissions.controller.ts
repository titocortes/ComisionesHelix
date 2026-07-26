import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  ParseBoolPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { CommissionsService } from './commissions.service.js';
import { ReviewQueryDto } from './dto/review-query.dto.js';
import { CancelCommissionDto } from './dto/cancel-commission.dto.js';

interface AuthRequest {
  user: { idUser: number };
}

@Controller('commissions')
@UseGuards(JwtAuthGuard, AdminGuard)
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get('review')
  getReview(@Query() query: ReviewQueryDto) {
    return this.commissionsService.getReviewList(query);
  }

  @Get('cancellation-reasons')
  getCancellationReasons() {
    return this.commissionsService.getCancellationReasons();
  }

  @Post('recalculate')
  recalculate(
    @Query('dryRun', new DefaultValuePipe(false), ParseBoolPipe) dryRun: boolean,
  ) {
    return this.commissionsService.recalculateZeroAmounts(dryRun);
  }

  @Post('recalculate-ingested')
  recalculateIngested(
    @Query('dryRun', new DefaultValuePipe(false), ParseBoolPipe) dryRun: boolean,
  ) {
    return this.commissionsService.recalculateAllIngested(dryRun);
  }

  @Post(':id/recalculate')
  recalculateOne(@Param('id', ParseIntPipe) id: number) {
    return this.commissionsService.recalculateOne(id);
  }

  @Post(':id/cancel')
  cancelRecord(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelCommissionDto,
    @Request() req: AuthRequest,
  ) {
    return this.commissionsService.cancelRecord(id, dto, req.user.idUser);
  }
}
