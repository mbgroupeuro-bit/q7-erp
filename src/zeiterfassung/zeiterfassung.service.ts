import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';
import { CreateArbeitstagDto } from './dto/create-arbeitstag.dto';

// A138: Kein update() — Arbeitstag-Einträge gelten als unveränderlicher
// Nachweis-Eintrag (Admin-Entscheidung, siehe Modell-Kommentar in
// schema.prisma), analog CrmAktivitaet (Master-Dokument 10.3).
// A147: "gearbeitet"-Feld ergänzt (Fehltag-Dokumentation).
@Injectable()
export class ZeiterfassungService extends PrismaTenantService {
  /**
   * Legt einen neuen Arbeitstag-Eintrag an.
   * IDOR-Schutz inkl. verknüpfter Abfrage (Master-Dokument 3.6,
   * Szenario 3): prüft zuerst, ob der referenzierte Mitarbeiter
   * tatsächlich zum aktuellen Lizenznehmer gehört, bevor der
   * Eintrag angelegt wird — analog CrmAktivitaet.create().
   */
  async create(lizenznehmerId: string, dto: CreateArbeitstagDto) {
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

      try {
        return await prisma.arbeitstag.create({
          data: {
            lizenznehmerId,
            mitarbeiterId: dto.mitarbeiterId,
            datum: new Date(dto.datum),
            gearbeitet: dto.gearbeitet ?? true,
            bemerkung: dto.bemerkung,
          },
        });
      } catch (error) {
        // P2002 = @@unique([mitarbeiterId, datum]) verletzt — für
        // diesen Mitarbeiter existiert an diesem Tag bereits ein Eintrag.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            `Für Mitarbeiter "${dto.mitarbeiterId}" existiert am ${dto.datum} bereits ein Arbeitstag-Eintrag.`,
          );
        }
        throw error;
      }
    });
  }

  /**
   * Holt alle Arbeitstag-Einträge eines Mitarbeiters, optional
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

      const where: Prisma.ArbeitstagWhereInput = {
        mitarbeiterId,
        lizenznehmerId,
      };

      if (jahr && monat) {
        const monatsStart = new Date(Date.UTC(jahr, monat - 1, 1));
        const monatsEnde = new Date(Date.UTC(jahr, monat, 1));
        where.datum = { gte: monatsStart, lt: monatsEnde };
      }

      return prisma.arbeitstag.findMany({
        where,
        orderBy: { datum: 'asc' },
      });
    });
  }

  /**
   * Monatsübersicht: Anzahl gearbeiteter Tage, Anzahl Fehltage, und
   * eine kalendertaugliche Liste aller Tage (für Häkchen/X-Anzeige
   * im Frontend). A147: erweitert um gearbeitet/nichtGearbeitet-
   * Auszählung — vorher nur reine Gesamtanzahl (jeder Eintrag =
   * gearbeitet, keine Fehltage abbildbar).
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

    const anzahlGearbeitet = eintraege.filter((e) => e.gearbeitet).length;
    const anzahlNichtGearbeitet = eintraege.filter((e) => !e.gearbeitet).length;

    return {
      mitarbeiterId,
      jahr,
      monat,
      anzahlArbeitstage: eintraege.length,
      anzahlGearbeitet,
      anzahlNichtGearbeitet,
      tage: eintraege.map((e) => ({
        datum: e.datum,
        gearbeitet: e.gearbeitet,
        bemerkung: e.bemerkung,
      })),
    };
  }

  /**
   * Löscht einen Arbeitstag-Eintrag (Korrektur bei Fehleingabe).
   * IDOR-Schutz wie bei Mitarbeiter/Partner: findFirst mit id +
   * lizenznehmerId vor dem eigentlichen Löschen.
   */
  async remove(lizenznehmerId: string, id: string) {
    return this.withTenantContext(async (prisma) => {
      const existing = await prisma.arbeitstag.findFirst({
        where: { id, lizenznehmerId },
      });

      if (!existing) {
        throw new NotFoundException(`Arbeitstag-Eintrag mit ID "${id}" wurde nicht gefunden.`);
      }

      return prisma.arbeitstag.delete({
        where: { id },
      });
    });
  }
}
