import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MitarbeiterService } from './mitarbeiter.service';
import { CreateMitarbeiterDto } from './dto/create-mitarbeiter.dto';
import { UpdateMitarbeiterDto } from './dto/update-mitarbeiter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('mitarbeiter')
@UseGuards(JwtAuthGuard)
export class MitarbeiterController {
  constructor(private readonly mitarbeiterService: MitarbeiterService) {}

  @Post()
  async create(@Request() req, @Body() createMitarbeiterDto: CreateMitarbeiterDto) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.mitarbeiterService.create(lizenznehmerId, createMitarbeiterDto);
  }

  @Get()
  async findAll(@Request() req) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.mitarbeiterService.findAll(lizenznehmerId);
  }

  // WICHTIG: muss VOR ':id' stehen, sonst faengt NestJS "search" als :id-Wert ab.
  @Get('search')
  async search(@Request() req, @Query('q') query: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.mitarbeiterService.search(lizenznehmerId, query ?? '');
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.mitarbeiterService.findOne(lizenznehmerId, id);
  }

  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateMitarbeiterDto: UpdateMitarbeiterDto,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.mitarbeiterService.update(lizenznehmerId, id, updateMitarbeiterDto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.mitarbeiterService.remove(lizenznehmerId, id);
  }
}
