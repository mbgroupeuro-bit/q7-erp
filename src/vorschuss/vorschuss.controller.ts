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
import { VorschussService } from './vorschuss.service';
import { CreateVorschussDto } from './dto/create-vorschuss.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('vorschuss')
@UseGuards(JwtAuthGuard)
export class VorschussController {
  constructor(private readonly vorschussService: VorschussService) {}

  @Post()
  async create(@Request() req, @Body() createVorschussDto: CreateVorschussDto) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.vorschussService.create(lizenznehmerId, createVorschussDto);
  }

  @Get('mitarbeiter/:mitarbeiterId')
  async findAllByMitarbeiter(
    @Request() req,
    @Param('mitarbeiterId') mitarbeiterId: string,
    @Query('jahr') jahr?: string,
    @Query('monat') monat?: string,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.vorschussService.findAllByMitarbeiter(
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
    return this.vorschussService.monatsUebersicht(
      lizenznehmerId,
      mitarbeiterId,
      Number(jahr),
      Number(monat),
    );
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.vorschussService.remove(lizenznehmerId, id);
  }
}
