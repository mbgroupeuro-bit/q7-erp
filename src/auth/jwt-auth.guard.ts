// src/auth/jwt-auth.guard.ts
//
// Auf geschützte Controller/Routen mit @UseGuards(JwtAuthGuard) anwenden.
// Prüft das JWT über JwtStrategy, bevor die TenancyMiddleware überhaupt
// req.user auslesen kann — Guard läuft vor Middleware in NestJS? Nein:
// Middleware läuft VOR Guards. Siehe README, Abschnitt "Reihenfolge".

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
