import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BestellungService } from './bestellung.service';
import { CreateBestellungDto } from './dto/create-bestellung.dto';
import { UpdateBestellungStatusDto } from './dto/update-bestellung-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('bestellungen')
@UseGuards(JwtAuthGuard)
export class BestellungController {
  constructor(private readonly bestellungService: BestellungService) {}

  @Post()
  async create(@Request() req, @Body() createBestellungDto: CreateBestellungDto) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.bestellungService.create(lizenznehmerId, createBestellungDto);
  }

  @Get()
  async findAll(@Request() req, @Query('status') status?: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.bestellungService.findAll(lizenznehmerId, status);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.bestellungService.findOne(lizenznehmerId, id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() updateBestellungStatusDto: UpdateBestellungStatusDto,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.bestellungService.updateStatus(lizenznehmerId, id, updateBestellungStatusDto);
  }
}
