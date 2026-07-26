import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { BeneficiariesService } from './beneficiaries.service.js';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto.js';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto.js';
import { ListBeneficiariesDto } from './dto/list-beneficiaries.dto.js';

interface AuthRequest {
  user: { idUser: number };
}

@Controller('beneficiaries')
@UseGuards(JwtAuthGuard, AdminGuard)
export class BeneficiariesController {
  constructor(private readonly beneficiariesService: BeneficiariesService) {}

  @Get()
  findAll(@Query() query: ListBeneficiariesDto) {
    return this.beneficiariesService.findAll(query);
  }

  @Get('helix-tree')
  getHelixTree() {
    return this.beneficiariesService.getHelixTree();
  }

  @Get('helix/agencies')
  getHelixAgencies() {
    return this.beneficiariesService.getHelixAgencies();
  }

  @Get('helix/affiliates')
  getAllHelixAffiliates() {
    return this.beneficiariesService.getAllHelixAffiliates();
  }

  @Get('helix/agencies/:idAgency/affiliates')
  getHelixAffiliatesByAgency(@Param('idAgency', ParseIntPipe) idAgency: number) {
    return this.beneficiariesService.getHelixAffiliatesByAgency(idAgency);
  }

  @Post()
  create(@Body() dto: CreateBeneficiaryDto, @Request() req: AuthRequest) {
    return this.beneficiariesService.create(dto, req.user.idUser);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBeneficiaryDto) {
    return this.beneficiariesService.update(id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.beneficiariesService.deactivate(id);
  }
}
