// src/common/tenancy/prisma-tenant.service.ts
// AKTUALISIERT (Aufgabe 27) — zweite, unabhängige Sicherheitsebene zusätzlich
// zu RLS (Master-Dokument 3.6, Maßnahme 1: "Zentrale Durchsetzung statt
// Einzelfall-Disziplin").
//
// Was neu ist:
// 1. withTenantContext() bricht jetzt hart ab (Exception), falls keine
//    lizenznehmerId im Kontext vorhanden ist — verhindert, dass eine Abfrage
//    versehentlich OHNE Tenant-Filter läuft, selbst wenn RLS aus irgendeinem
//    Grund nicht greifen sollte (z.B. Konfigurationsfehler, neue Tabelle ohne
//    Policy).
// 2. getCurrentTenantId() ist jetzt öffentlich nutzbar — jeder Service MUSS
//    diese ID zusätzlich explizit in seine Prisma-where-Klauseln aufnehmen
//    (z.B. `where: { lizenznehmerId: this.tenant.getCurrentTenantId(), ... }`).
//    RLS bleibt das "erste Schloss", dieser explizite Filter das "zweite".
// 3. NEU (Aufgabe 68) — withExplicitTenantContext(): für Hintergrund-Kontexte
//    ohne eingehenden HTTP-Request (z.B. Connector-Export, A73-Domain-Events),
//    bei denen die lizenznehmerId bereits bekannt ist (z.B. aus einem
//    Envelope), aber KEIN Request-Kontext existiert, aus dem
//    getCurrentLizenznehmerId() lesen könnte. Nutzt denselben
//    Zwei-Schloss-Mechanismus (RLS-Session-Variable + expliziter Filter)
//    wie withTenantContext(), nur mit explizit übergebener ID statt
//    Request-Kontext-Lookup.

import {
  Injectable,
  InternalServerErrorException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getCurrentLizenznehmerId } from './tenancy-context';

@Injectable()
export class PrismaTenantService implements OnModuleInit, OnModuleDestroy {
  private readonly prisma: PrismaClient;

  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    this.prisma = new PrismaClient({ adapter });
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  /**
   * Gibt die aktuelle lizenznehmerId zurück oder wirft eine Exception,
   * falls keine gesetzt ist. Services nutzen dies, um den Filter zusätzlich
   * explizit in ihre eigenen Abfragen einzubauen (zweites Schloss, Aufgabe 27).
   */
  getCurrentTenantId(): string {
    const lizenznehmerId = getCurrentLizenznehmerId();
    if (!lizenznehmerId) {
      throw new InternalServerErrorException(
        'Kein Mandanten-Kontext (lizenznehmerId) gesetzt — Abfrage wurde sicherheitshalber blockiert.',
      );
    }
    return lizenznehmerId;
  }

  async withTenantContext<T>(
    callback: (tx: Prisma.TransactionClient, lizenznehmerId: string) => Promise<T>,
  ): Promise<T> {
    // Hartes Abbruchkriterium: ohne lizenznehmerId läuft gar nichts —
    // weder RLS-Session-Variable noch die Abfrage selbst.
    const lizenznehmerId = this.getCurrentTenantId();

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_lizenznehmer_id', ${lizenznehmerId}, true)`;
      return callback(tx, lizenznehmerId);
    });
  }

  /**
   * NEU (Aufgabe 68): Wie withTenantContext(), aber für Hintergrund-Kontexte
   * ohne eingehenden Request — die lizenznehmerId wird explizit übergeben
   * statt aus dem Request-Kontext gelesen (z.B. Connector-Export, A73).
   * Gleicher Zwei-Schloss-Mechanismus (RLS-Session-Variable + expliziter
   * Filter in der jeweiligen Abfrage durch den aufrufenden Service).
   */
  async withExplicitTenantContext<T>(
    lizenznehmerId: string,
    callback: (tx: Prisma.TransactionClient, lizenznehmerId: string) => Promise<T>,
  ): Promise<T> {
    if (!lizenznehmerId) {
      throw new InternalServerErrorException(
        'withExplicitTenantContext() ohne lizenznehmerId aufgerufen — sicherheitshalber blockiert.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_lizenznehmer_id', ${lizenznehmerId}, true)`;
      return callback(tx, lizenznehmerId);
    });
  }
}
