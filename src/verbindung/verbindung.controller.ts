// src/verbindung/verbindung.controller.ts
// A109 – Q7-Verbindungsstatus anzeigen
// A110 – Secret-Rotation auslösen
//
// Tenant-ID kommt über req.user.lizenznehmerId aus dem JWT, wie bei den
// übrigen Tenant-Modulen (konto, lager, artikel) — bestätigt gegen
// konto.controller.ts.
//
// BEWUSST KEIN AdminGuard und KEIN Middleware-Exclude wie bei
// LizenznehmerController — diese Route läuft für einen bereits
// eingeloggten Mandanten, nicht davor (siehe lizenznehmer.controller.ts
// Kommentarkopf zur Begründung des Gegenteils dort).

import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VerbindungService } from './verbindung.service';

@Controller('verbindung')
@UseGuards(JwtAuthGuard)
export class VerbindungController {
  constructor(private readonly verbindungService: VerbindungService) {}

  @Get('status')
  status(@Req() req: Request) {
    const lizenznehmerId = (req.user as { lizenznehmerId: string }).lizenznehmerId;
    return this.verbindungService.holeStatus(lizenznehmerId);
  }

  @Post('rotieren')
  rotieren(@Req() req: Request) {
    const lizenznehmerId = (req.user as { lizenznehmerId: string }).lizenznehmerId;
    return this.verbindungService.rotiereGeheimnis(lizenznehmerId);
  }
}