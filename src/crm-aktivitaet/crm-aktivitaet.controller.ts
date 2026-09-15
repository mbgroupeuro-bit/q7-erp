import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CrmAktivitaetService } from './crm-aktivitaet.service';
import { CreateCrmAktivitaetDto } from './dto/create-crm-aktivitaet.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('crm-aktivitaet')
@UseGuards(JwtAuthGuard)
export class CrmAktivitaetController {
  constructor(private readonly crmAktivitaetService: CrmAktivitaetService) {}

  @Post()
  async create(@Request() req, @Body() createCrmAktivitaetDto: CreateCrmAktivitaetDto) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmAktivitaetService.create(lizenznehmerId, createCrmAktivitaetDto);
  }

  // Liste je Kontakt (statt globaler findAll) — Aktivitäten sind immer
  // im Kontext eines Kontakts relevant, nie kontaktübergreifend gebraucht.
  @Get('kontakt/:crmKontaktId')
  async findAllByKontakt(@Request() req, @Param('crmKontaktId') crmKontaktId: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmAktivitaetService.findAllByKontakt(lizenznehmerId, crmKontaktId);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmAktivitaetService.remove(lizenznehmerId, id);
  }
}
