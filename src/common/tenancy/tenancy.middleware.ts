// common/tenancy/tenancy.middleware.ts
//
// ERSETZT die Version aus Aufgabe 5.
//
// Grund: In NestJS laufen Middlewares VOR Guards. Ein JwtAuthGuard hätte
// req.user zu diesem Zeitpunkt noch nicht gesetzt. Die Middleware verifiziert
// das Token darum selbst, bevor sie die lizenznehmerId in den Tenancy-Kontext
// schreibt. Ein zusätzlicher JwtAuthGuard auf den Controllern bleibt trotzdem
// sinnvoll (sauberer 401 statt evtl. verwirrender Fehlermeldungen, falls die
// Middleware aus irgendeinem Grund übersprungen wird).

import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { tenancyStorage } from './tenancy-context';
import { JwtPayload } from '../../auth/jwt.strategy';

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!token) {
      throw new UnauthorizedException('Kein Token vorhanden.');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token ungültig oder abgelaufen.');
    }

    if (!payload.lizenznehmerId) {
      throw new UnauthorizedException('Token enthält keinen Lizenznehmer-Kontext.');
    }

    tenancyStorage.run({ lizenznehmerId: payload.lizenznehmerId }, () => {
      next();
    });
  }
}
