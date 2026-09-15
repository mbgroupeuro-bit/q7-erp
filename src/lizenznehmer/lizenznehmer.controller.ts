// src/lizenznehmer/lizenznehmer.controller.ts
//
// AKTUALISIERT (Aufgabe 26): AdminGuard sichert alle Routen ab —
// nur Benutzer mit istSystemAdmin=true im JWT dürfen zugreifen.
//
// WICHTIG bleibt bestehen: Diese Routen dürfen nicht unter die
// TenancyMiddleware fallen (Anlage eines Lizenznehmers passiert vor
// Existenz eines Tenant-Kontexts). In app.module.ts weiterhin per
// .exclude() ausschließen, z.B.:
//   { path: 'lizenznehmer', method: RequestMethod.POST }
//   { path: 'lizenznehmer', method: RequestMethod.GET }
//   { path: 'lizenznehmer/:id', method: RequestMethod.GET }
//   { path: 'lizenznehmer/:id', method: RequestMethod.PATCH }
// Der AdminGuard prüft das JWT unabhängig davon selbst (siehe admin.guard.ts).

import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { LizenznehmerService } from './lizenznehmer.service';
import { CreateLizenznehmerDto } from './create-lizenznehmer.dto';
import { AdminGuard } from '../auth/admin.guard';

@Controller('lizenznehmer')
@UseGuards(AdminGuard)
export class LizenznehmerController {
  constructor(private readonly lizenznehmerService: LizenznehmerService) {}

  @Post()
  create(@Body() dto: CreateLizenznehmerDto) {
    return this.lizenznehmerService.create(dto);
  }

  @Get()
  findAll() {
    return this.lizenznehmerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lizenznehmerService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateLizenznehmerDto>) {
    return this.lizenznehmerService.update(id, dto);
  }
}
