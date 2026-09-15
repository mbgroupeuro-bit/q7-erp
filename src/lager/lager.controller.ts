import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { LagerService } from './lager.service';
import { WareneingangDto } from './dto/wareneingang.dto';
import { WarenausgangDto } from './dto/warenausgang.dto';
import { BestandskorrekturDto } from './dto/bestandskorrektur.dto';
import { BundleVerkaufDto } from './dto/bundle-verkauf.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('lager')
@UseGuards(JwtAuthGuard)
export class LagerController {
  constructor(private readonly lagerService: LagerService) {}

  /**
   * NEU (A103, Option 3): Liefert den Bestand ALLER Artikel des
   * Lizenznehmers (angereichert um Artikelname/-nummer) für die
   * Bestandsübersicht im Dashboard. Optionaler Query-Parameter
   * lagerortId filtert auf einen bestimmten Lagerort — ohne Angabe
   * werden alle Lagerorte des Lizenznehmers zusammen zurückgegeben.
   *
   * WICHTIG: Diese Route steht bewusst VOR 'bestand/:artikelId', damit
   * sie nicht versehentlich als artikelId="alle" o.ä. interpretiert wird
   * (unterschiedliche Segment-Anzahl, daher ohnehin kein Routing-Konflikt,
   * aber zur Übersichtlichkeit hier oben platziert).
   */
  @Get('bestand')
  async holeAlleBestaende(@Request() req, @Query('lagerortId') lagerortId?: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.lagerService.holeAlleBestaende(lizenznehmerId, lagerortId);
  }

  @Get('bestand/:artikelId')
  async holeBestand(
    @Request() req,
    @Param('artikelId') artikelId: string,
    @Query('lagerortId') lagerortId?: string,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.lagerService.holeBestand(lizenznehmerId, artikelId, lagerortId);
  }

  @Post('wareneingang')
  async wareneingangBuchen(@Request() req, @Body() dto: WareneingangDto) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.lagerService.wareneingangBuchen(lizenznehmerId, dto);
  }

  @Post('warenausgang')
  async warenausgangBuchen(@Request() req, @Body() dto: WarenausgangDto) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.lagerService.warenausgangBuchen(lizenznehmerId, dto);
  }

  @Post('korrektur')
  async bestandskorrekturBuchen(@Request() req, @Body() dto: BestandskorrekturDto) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.lagerService.bestandskorrekturBuchen(lizenznehmerId, dto);
  }

  @Post('bundle-verkauf')
  async bundleVerkaufBuchen(@Request() req, @Body() dto: BundleVerkaufDto) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.lagerService.bundleVerkaufBuchen(lizenznehmerId, dto);
  }
}
