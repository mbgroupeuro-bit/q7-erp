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
import { PartnerService } from './partner.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Pfad auf auth/jwt-auth.guard korrigiert

@Controller('partner')
@UseGuards(JwtAuthGuard)
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Post()
  async create(@Request() req, @Body() createPartnerDto: CreatePartnerDto) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.partnerService.create(lizenznehmerId, createPartnerDto);
  }

  @Get()
  async findAll(@Request() req) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.partnerService.findAll(lizenznehmerId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.partnerService.findOne(lizenznehmerId, id);
  }

  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updatePartnerDto: UpdatePartnerDto,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.partnerService.update(lizenznehmerId, id, updatePartnerDto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.partnerService.remove(lizenznehmerId, id);
  }
}
