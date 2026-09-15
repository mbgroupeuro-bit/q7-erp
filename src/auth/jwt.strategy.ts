// src/auth/jwt.strategy.ts
// ERSETZT die vorherige Version — behebt TS2345 (secretOrKey könnte undefined sein).

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string; // benutzerId
  lizenznehmerId: string;
  email: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET ist nicht in der .env gesetzt.');
  }
  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    return {
      benutzerId: payload.sub,
      lizenznehmerId: payload.lizenznehmerId,
      email: payload.email,
    };
  }
}
