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
import { CrmAngebotService } from './crm-angebot.service';
import { CreateCrmAngebotDto } from './dto/create-crm-angebot.dto';
import { UpdateCrmAngebotDto } from './dto/update-crm-angebot.dto';
import { AddCrmAngebotPositionDto } from './dto/add-crm-angebot-position.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('crm-angebot')
@UseGuards(JwtAuthGuard)
export class CrmAngebotController {
  constructor(private readonly crmAngebotService: CrmAngebotService) {}

  @Post()
  async create(@Request() req, @Body() createCrmAngebotDto: CreateCrmAngebotDto) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmAngebotService.create(lizenznehmerId, createCrmAngebotDto);
  }

  @Get('kontakt/:crmKontaktId')
  async findAllByKontakt(@Request() req, @Param('crmKontaktId') crmKontaktId: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmAngebotService.findAllByKontakt(lizenznehmerId, crmKontaktId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmAngebotService.findOne(lizenznehmerId, id);
  }

  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateCrmAngebotDto: UpdateCrmAngebotDto,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmAngebotService.update(lizenznehmerId, id, updateCrmAngebotDto);
  }

  @Post(':id/positionen')
  async addPosition(
    @Request() req,
    @Param('id') id: string,
    @Body() addCrmAngebotPositionDto: AddCrmAngebotPositionDto,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmAngebotService.addPosition(lizenznehmerId, id, addCrmAngebotPositionDto);
  }

  @Delete(':id/positionen/:positionId')
  async removePosition(
    @Request() req,
    @Param('id') id: string,
    @Param('positionId') positionId: string,
  ) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmAngebotService.removePosition(lizenznehmerId, id, positionId);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const lizenznehmerId = req.user.lizenznehmerId;
    return this.crmAngebotService.remove(lizenznehmerId, id);
  }
}
