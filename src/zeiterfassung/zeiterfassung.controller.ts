import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ZeiterfassungService } from './zeiterfassung.service';
import { CreateArbeitstagDto } from './dto/create-arbeitstag.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('zeiterfassung')
@UseGuards(JwtAuthGuard)
export class ZeiterfassungController {
  constructor(private readonly zeiterfassungService: ZeiterfassungService) {}

  @Post()
  async create(@Request() req, @Body() createArbeitstagDto: CreateArbeitstagDto) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.zeiterfassungService.create(lizenznehmerId, createArbeitstagDto);
  }

  @Get('mitarbeiter/:mitarbeiterId')
  async findAllByMitarbeiter(
    @Request() req,
    @Param('mitarbeiterId') mitarbeiterId: string,
    @Query('jahr') jahr?: string,
    @Query('monat') monat?: string,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.zeiterfassungService.findAllByMitarbeiter(
      lizenznehmerId,
      mitarbeiterId,
      jahr ? Number(jahr) : undefined,
      monat ? Number(monat) : undefined,
    );
  }

  @Get('mitarbeiter/:mitarbeiterId/monatsuebersicht')
  async monatsUebersicht(
    @Request() req,
    @Param('mitarbeiterId') mitarbeiterId: string,
    @Query('jahr') jahr: string,
    @Query('monat') monat: string,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.zeiterfassungService.monatsUebersicht(
      lizenznehmerId,
      mitarbeiterId,
      Number(jahr),
      Number(monat),
    );
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.zeiterfassungService.remove(lizenznehmerId, id);
  }
}
