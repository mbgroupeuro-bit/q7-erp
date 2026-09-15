// src/auth/auth.service.ts
// ANGEPASST (Aufgabe 26): istSystemAdmin wird jetzt mit ins JWT gepackt,
// damit der neue AdminGuard darauf prüfen kann.

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface BenutzerLoginZeile {
  id: string;
  lizenznehmerId: string;
  email: string;
  passwortHash: string;
  istSystemAdmin: boolean;
  status: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(email: string, passwort: string) {
    const ergebnis = await prisma.$queryRaw<BenutzerLoginZeile[]>`
      SELECT * FROM login_benutzer_by_email(${email})
    `;
    const benutzer = ergebnis[0];

    if (!benutzer || benutzer.status !== 'AKTIV') {
      throw new UnauthorizedException('E-Mail oder Passwort falsch.');
    }

    const passwortGueltig = await bcrypt.compare(passwort, benutzer.passwortHash);
    if (!passwortGueltig) {
      throw new UnauthorizedException('E-Mail oder Passwort falsch.');
    }

    const payload = {
      sub: benutzer.id,
      lizenznehmerId: benutzer.lizenznehmerId,
      email: benutzer.email,
      istSystemAdmin: benutzer.istSystemAdmin,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}