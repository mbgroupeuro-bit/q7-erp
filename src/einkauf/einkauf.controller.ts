import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { EinkaufService } from './einkauf.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('einkauf')
@UseGuards(JwtAuthGuard)
export class EinkaufController {
  constructor(private readonly einkaufService: EinkaufService) {}

  /**
   * A148: Liefert den aktuellen Bestellvorschlag — alle Artikel, deren
   * Bestand unter dem hinterlegten mindestbestand liegt.
   */
  @Get('bestellvorschlag')
  async getBestellvorschlag(@Request() req) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.einkaufService.berechneBestellvorschlag(lizenznehmerId);
  }
}
