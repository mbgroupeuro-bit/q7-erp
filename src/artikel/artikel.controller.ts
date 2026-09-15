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
import { ArtikelService } from './artikel.service';
import { CreateArtikelDto } from './dto/create-artikel.dto';
import { UpdateArtikelDto } from './dto/update-artikel.dto';
import { CreateBundlePositionDto } from './dto/create-bundle-position.dto';
import { CreateBausteinGruppeDto } from './dto/create-baustein-gruppe.dto';
import { CreateBausteinOptionDto } from './dto/create-baustein-option.dto';
import { CreateKonfigurationsregelDto } from './dto/create-konfigurationsregel.dto';
import { CreateArtikelLieferantDto } from './dto/create-artikel-lieferant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('artikel')
@UseGuards(JwtAuthGuard)
export class ArtikelController {
  constructor(private readonly artikelService: ArtikelService) {}

  @Post()
  async create(@Request() req, @Body() createArtikelDto: CreateArtikelDto) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.artikelService.create(lizenznehmerId, createArtikelDto);
  }

  @Get()
  async findAll(@Request() req) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.artikelService.findAll(lizenznehmerId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.artikelService.findOne(lizenznehmerId, id);
  }

  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateArtikelDto: UpdateArtikelDto,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.artikelService.update(lizenznehmerId, id, updateArtikelDto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.artikelService.remove(lizenznehmerId, id);
  }

  /**
   * NEU (A62b, 16.08.2026): Fügt einem Bundle-Artikel eine
   * Stücklisten-Position hinzu. id = bundleArtikelId (der Bundle-Artikel).
   */
  @Post(':id/bundle-positionen')
  async addBundlePosition(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateBundlePositionDto,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.artikelService.addBundlePosition(lizenznehmerId, id, dto);
  }

  /**
   * NEU (A93, 19.08.2026): Liefert die Stücklisten-Positionen eines
   * Bundle-Artikels für die Anzeige im Dashboard.
   */
  @Get(':id/bundle-positionen')
  async getBundlePositionen(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.artikelService.findBundlePositionen(lizenznehmerId, id);
  }

  /**
   * NEU (A119, 23.08.2026): Entfernt eine einzelne Stücklisten-Position
   * aus einem Bundle-Artikel. id = bundleArtikelId, positionId = die zu
   * löschende BundlePosition.
   */
  @Delete(':id/bundle-positionen/:positionId')
  async removeBundlePosition(
    @Request() req,
    @Param('id') id: string,
    @Param('positionId') positionId: string,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.artikelService.removeBundlePosition(lizenznehmerId, id, positionId);
  }

  /**
   * NEU (A96a): Fügt einem konfigurierbaren Artikel (Stufe 4) eine
   * Baustein-Gruppe hinzu. id = artikelId (der konfigurierbare Artikel).
   */
  @Post(':id/baustein-gruppen')
  async addBausteinGruppe(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateBausteinGruppeDto,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.artikelService.addBausteinGruppe(lizenznehmerId, id, dto);
  }

  /**
   * NEU (A96a): Liefert die Baustein-Gruppen eines konfigurierbaren
   * Artikels für die Anzeige im Dashboard.
   */
  @Get(':id/baustein-gruppen')
  async getBausteinGruppen(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.artikelService.findBausteinGruppen(lizenznehmerId, id);
  }

  /**
   * NEU (A97): Fügt einer Baustein-Gruppe eine Baustein-Option hinzu.
   * gruppeId = ID der Baustein-Gruppe (nicht die Artikel-ID).
   */
  @Post('baustein-gruppen/:gruppeId/optionen')
  async addBausteinOption(
    @Request() req,
    @Param('gruppeId') gruppeId: string,
    @Body() dto: CreateBausteinOptionDto,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.artikelService.addBausteinOption(lizenznehmerId, gruppeId, dto);
  }

  /**
   * NEU (A97): Liefert die Baustein-Optionen einer Baustein-Gruppe für
   * die Anzeige im Dashboard.
   */
  @Get('baustein-gruppen/:gruppeId/optionen')
  async getBausteinOptionen(@Request() req, @Param('gruppeId') gruppeId: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.artikelService.findBausteinOptionen(lizenznehmerId, gruppeId);
  }

  /**
   * NEU (A98): Legt eine Konfigurationsregel an. optionId = wennOptionId
   * (die Baustein-Option, bei deren Auswahl die Ausschluss-Option in der
   * Regel nicht mehr wählbar sein soll).
   */
  @Post('baustein-optionen/:optionId/regeln')
  async addKonfigurationsregel(
    @Request() req,
    @Param('optionId') optionId: string,
    @Body() dto: CreateKonfigurationsregelDto,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.artikelService.addKonfigurationsregel(lizenznehmerId, optionId, dto);
  }

  /**
   * NEU (A98): Liefert die Konfigurationsregeln zu einer Baustein-Option
   * für die Anzeige im Dashboard.
   */
  @Get('baustein-optionen/:optionId/regeln')
  async getKonfigurationsregeln(@Request() req, @Param('optionId') optionId: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.artikelService.findKonfigurationsregeln(lizenznehmerId, optionId);
  }

  /**
   * NEU (A148, 29.08.2026): Ordnet einem Artikel eine Bezugsquelle
   * (Lieferant) zu. id = artikelId.
   */
  @Post(':id/lieferanten')
  async addArtikelLieferant(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateArtikelLieferantDto,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.artikelService.addArtikelLieferant(lizenznehmerId, id, dto);
  }

  /**
   * NEU (A148): Liefert alle Bezugsquellen eines Artikels, sortiert nach
   * Priorität.
   */
  @Get(':id/lieferanten')
  async getArtikelLieferanten(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.artikelService.findArtikelLieferanten(lizenznehmerId, id);
  }

  /**
   * NEU (A148): Entfernt eine Lieferanten-Zuordnung von einem Artikel.
   * id = artikelId, eintragId = die zu löschende ArtikelLieferant-Zeile.
   */
  @Delete(':id/lieferanten/:eintragId')
  async removeArtikelLieferant(
    @Request() req,
    @Param('id') id: string,
    @Param('eintragId') eintragId: string,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.artikelService.removeArtikelLieferant(lizenznehmerId, id, eintragId);
  }
}
