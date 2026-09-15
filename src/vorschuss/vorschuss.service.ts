import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';
import { CreateVorschussDto } from './dto/create-vorschuss.dto';

// A140: Kein update() — Vorschuss-Einträge gelten als unveränderlicher
// Nachweis-Eintrag über einen Geldbetrag (Admin-Entscheidung,
// 26.08.2026, analog Arbeitstag/CrmAktivitaet). Korrekturen laufen
// über Löschen + Neuanlegen.
@Injectable()
export class VorschussService extends PrismaTenantService {
  /**
   * Legt einen neuen Vorschuss-Eintrag an.
   * IDOR-Schutz inkl. verknüpfter Abfrage (Master-Dokument 3.6,
   * Szenario 3): prüft zuerst, ob der referenzierte Mitarbeiter
   * tatsächlich zum aktuellen Lizenznehmer gehört, bevor der
   * Eintrag angelegt wird — analog Arbeitstag.create().
   */
  async create(lizenznehmerId: string, dto: CreateVorschussDto) {
    return this.withTenantContext(async (prisma) => {
      const mitarbeiter = await prisma.mitarbeiter.findFirst({
        where: {
          id: dto.mitarbeiterId,
          lizenznehmerId,
        },
      });

      if (!mitarbeiter) {
        throw new NotFoundException(
          `Mitarbeiter mit ID "${dto.mitarbeiterId}" wurde nicht gefunden.`,
        );
      }

      return prisma.vorschuss.create({
        data: {
          lizenznehmerId,
          mitarbeiterId: dto.mitarbeiterId,
          betrag: dto.betrag,
          datum: new Date(dto.datum),
          bemerkung: dto.bemerkung,
        },
      });
    });
  }

  /**
   * Holt alle Vorschuss-Einträge eines Mitarbeiters, optional
   * gefiltert auf einen Monat (jahr + monat, monat 1-12).
   * IDOR-Schutz: prüft zuerst, dass der Mitarbeiter zum aktuellen
   * Lizenznehmer gehört, bevor Einträge zurückgegeben werden.
   */
  async findAllByMitarbeiter(
    lizenznehmerId: string,
    mitarbeiterId: string,
    jahr?: number,
    monat?: number,
  ) {
    return this.withTenantContext(async (prisma) => {
      const mitarbeiter = await prisma.mitarbeiter.findFirst({
        where: { id: mitarbeiterId, lizenznehmerId },
      });

      if (!mitarbeiter) {
        throw new NotFoundException(
          `Mitarbeiter mit ID "${mitarbeiterId}" wurde nicht gefunden.`,
        );
      }

      const where: Prisma.VorschussWhereInput = {
        mitarbeiterId,
        lizenznehmerId,
      };

      if (jahr && monat) {
        const monatsStart = new Date(Date.UTC(jahr, monat - 1, 1));
        const monatsEnde = new Date(Date.UTC(jahr, monat, 1));
        where.datum = { gte: monatsStart, lt: monatsEnde };
      }

      return prisma.vorschuss.findMany({
        where,
        orderBy: { datum: 'asc' },
      });
    });
  }

  /**
   * Reine Summenanzeige der Vorschüsse für einen Mitarbeiter in
   * einem bestimmten Monat — KEINE Verrechnung mit Mitarbeiter.gehalt
   * im System (Payroll-Klärung, Master-Dokument Abschnitt 6, Punkt 1:
   * volle Lohn-/Gehaltsabrechnung gehört nicht ins Q7-ERP).
   */
  async monatsUebersicht(
    lizenznehmerId: string,
    mitarbeiterId: string,
    jahr: number,
    monat: number,
  ) {
    const eintraege = await this.findAllByMitarbeiter(
      lizenznehmerId,
      mitarbeiterId,
      jahr,
      monat,
    );

    const summeVorschuesse = eintraege.reduce(
      (summe, eintrag) => summe + Number(eintrag.betrag),
      0,
    );

    return {
      mitarbeiterId,
      jahr,
      monat,
      anzahlVorschuesse: eintraege.length,
      summeVorschuesse,
    };
  }

  /**
   * Löscht einen Vorschuss-Eintrag (Korrektur bei Fehleingabe).
   * IDOR-Schutz wie bei Mitarbeiter/Arbeitstag: findFirst mit id +
   * lizenznehmerId vor dem eigentlichen Löschen.
   */
  async remove(lizenznehmerId: string, id: string) {
    return this.withTenantContext(async (prisma) => {
      const existing = await prisma.vorschuss.findFirst({
        where: { id, lizenznehmerId },
      });

      if (!existing) {
        throw new NotFoundException(`Vorschuss-Eintrag mit ID "${id}" wurde nicht gefunden.`);
      }

      return prisma.vorschuss.delete({
        where: { id },
      });
    });
  }
}
