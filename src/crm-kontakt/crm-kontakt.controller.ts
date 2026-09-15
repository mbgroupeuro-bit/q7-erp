import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CrmKontaktService } from './crm-kontakt.service';
import { CreateCrmKontaktDto } from './dto/create-crm-kontakt.dto';
import { UpdateCrmKontaktDto } from './dto/update-crm-kontakt.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('crm-kontakt')
@UseGuards(JwtAuthGuard)
export class CrmKontaktController {
  constructor(private readonly crmKontaktService: CrmKontaktService) {}

  @Post()
  async create(@Request() req, @Body() createCrmKontaktDto: CreateCrmKontaktDto) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmKontaktService.create(lizenznehmerId, createCrmKontaktDto);
  }

  @Get()
  async findAll(@Request() req) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmKontaktService.findAll(lizenznehmerId);
  }

  // WICHTIG: muss VOR ':id' stehen, sonst faengt NestJS "search" als :id-Wert ab.
  @Get('search')
  async search(@Request() req, @Query('q') query: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmKontaktService.search(lizenznehmerId, query ?? '');
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmKontaktService.findOne(lizenznehmerId, id);
  }

  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateCrmKontaktDto: UpdateCrmKontaktDto,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmKontaktService.update(lizenznehmerId, id, updateCrmKontaktDto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmKontaktService.remove(lizenznehmerId, id);
  }
}
