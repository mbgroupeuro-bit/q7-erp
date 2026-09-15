import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CrmWiedervorlageService } from './crm-wiedervorlage.service';
import { CreateCrmWiedervorlageDto } from './dto/create-crm-wiedervorlage.dto';
import { UpdateCrmWiedervorlageDto } from './dto/update-crm-wiedervorlage.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('crm-wiedervorlage')
@UseGuards(JwtAuthGuard)
export class CrmWiedervorlageController {
  constructor(private readonly crmWiedervorlageService: CrmWiedervorlageService) {}

  @Post()
  async create(@Request() req, @Body() createCrmWiedervorlageDto: CreateCrmWiedervorlageDto) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmWiedervorlageService.create(lizenznehmerId, createCrmWiedervorlageDto);
  }

  // Liste je Kontakt (wie bei CrmAktivitaet) — Wiedervorlagen sind immer
  // im Kontext eines Kontakts relevant.
  @Get('kontakt/:crmKontaktId')
  async findAllByKontakt(@Request() req, @Param('crmKontaktId') crmKontaktId: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmWiedervorlageService.findAllByKontakt(lizenznehmerId, crmKontaktId);
  }

  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateCrmWiedervorlageDto: UpdateCrmWiedervorlageDto,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmWiedervorlageService.update(lizenznehmerId, id, updateCrmWiedervorlageDto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmWiedervorlageService.remove(lizenznehmerId, id);
  }
}
