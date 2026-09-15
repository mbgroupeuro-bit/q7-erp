import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { KontoService } from './konto.service';
import { CreateKontoDto } from './dto/create-konto.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('konto')
@UseGuards(JwtAuthGuard)
export class KontoController {
  constructor(private readonly kontoService: KontoService) {}

  @Post()
  async create(@Request() req, @Body() createKontoDto: CreateKontoDto) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.kontoService.create(lizenznehmerId, createKontoDto);
  }

  @Get()
  async findAll(@Request() req) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.kontoService.findAll(lizenznehmerId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.kontoService.findOne(lizenznehmerId, id);
  }
}
