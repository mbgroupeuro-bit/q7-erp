// src/auth/admin.guard.ts
// NEU (Aufgabe 26) — Guard für Routen, die Systemebene betreffen
// (z.B. LizenznehmerController), nicht Mandanten-Ebene.
//
// Prüft JWT eigenständig (wie TenancyMiddleware), da diese Routen teilweise
// von der TenancyMiddleware ausgeschlossen sind (kein Tenant-Kontext beim
// Anlegen eines neuen Lizenznehmers) und daher kein req.user aus der
// Middleware garantiert vorhanden ist.

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Kein Token vorhanden.');
    }

    const token = authHeader.slice('Bearer '.length);

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Token ungültig oder abgelaufen.');
    }

    if (!payload.istSystemAdmin) {
      throw new ForbiddenException('Nur für System-Admins zugänglich.');
    }

    (request as any).user = payload;
    return true;
  }
}
