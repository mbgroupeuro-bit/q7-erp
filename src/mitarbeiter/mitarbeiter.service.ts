import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';
import { CreateMitarbeiterDto } from './dto/create-mitarbeiter.dto';
import { UpdateMitarbeiterDto } from './dto/update-mitarbeiter.dto';

// A134: Struktur bewusst 1:1 am Muster von PartnerService orientiert
// (Kapselung über PrismaTenantService, IDOR-Doppel-Lock via findFirst
// mit id + lizenznehmerId, siehe Master-Dokument 3.6). Kein
// Event-Emitter wie bei PartnerService — dort erst nachträglich für
// A73 (Q7-Sync) ergänzt; für Mitarbeiter-Stammdaten aktuell kein
// Bedarf erkennbar, kann bei Bedarf später als Erweiterung ergänzt
// werden (3.4, Erweiterungspunkte statt Kern-Änderungen).
//
// GEÄNDERT (26.08.2026): einzelnes "gehalt"-Feld ersetzt durch
// verguetungsArt (TAGESLOHN/MONATSGEHALT) + verguetungsBetrag +
// optionale provisionBetrag (siehe Modell-Kommentar in schema.prisma).
@Injectable()
export class MitarbeiterService extends PrismaTenantService {
  /**
   * Legt einen neuen Mitarbeiter für den aktuellen Lizenznehmer an.
   */
  async create(lizenznehmerId: string, dto: CreateMitarbeiterDto) {
    return this.withTenantContext(async (prisma) => {
      return prisma.mitarbeiter.create({
        data: {
          name: dto.name,
          telefon: dto.telefon,
          verguetungsArt: dto.verguetungsArt,
          verguetungsBetrag: dto.verguetungsBetrag,
          provisionBetrag: dto.provisionBetrag,
          lizenznehmerId,
        },
      });
    });
  }

  /**
   * Holt alle Mitarbeiter des aktuellen Lizenznehmers.
   */
  async findAll(lizenznehmerId: string) {
    return this.withTenantContext(async (prisma) => {
      return prisma.mitarbeiter.findMany({
        where: {
          lizenznehmerId,
        },
      });
    });
  }

  /**
   * Holt einen einzelnen Mitarbeiter anhand seiner ID.
   */
  async findOne(lizenznehmerId: string, id: string) {
    return this.withTenantContext(async (prisma) => {
      const mitarbeiter = await prisma.mitarbeiter.findFirst({
        where: {
          id,
          lizenznehmerId,
        },
      });

      if (!mitarbeiter) {
        throw new NotFoundException(`Mitarbeiter mit ID "${id}" wurde nicht gefunden.`);
      }

      return mitarbeiter;
    });
  }

  /**
   * Aktualisiert einen bestehenden Mitarbeiter.
   * Prüft zuerst per findFirst (id + lizenznehmerId), dass der
   * Mitarbeiter tatsächlich zum aktuellen Lizenznehmer gehört
   * (IDOR-Schutz, Master-Dokument 3.6, Szenario 2) — erst danach
   * wird das Update ausgeführt.
   */
  async update(lizenznehmerId: string, id: string, dto: UpdateMitarbeiterDto) {
    return this.withTenantContext(async (prisma) => {
      const existing = await prisma.mitarbeiter.findFirst({
        where: {
          id,
          lizenznehmerId,
        },
      });

      if (!existing) {
        throw new NotFoundException(`Mitarbeiter mit ID "${id}" wurde nicht gefunden.`);
      }

      return prisma.mitarbeiter.update({
        where: { id },
        data: {
          name: dto.name,
          telefon: dto.telefon,
          verguetungsArt: dto.verguetungsArt,
          verguetungsBetrag: dto.verguetungsBetrag,
          provisionBetrag: dto.provisionBetrag,
        },
      });
    });
  }

  /**
   * Durchsucht Mitarbeiter des aktuellen Lizenznehmers nach Name oder
   * Telefon (case-insensitive Teilstring-Suche).
   * A144 (Option C, analog CrmKontaktService.search(), A130): zentraler
   * Such-Service je Modul, damit Frontend UND späterer ERP-Agent
   * denselben Endpunkt nutzen (3.1).
   */
  async search(lizenznehmerId: string, query: string) {
    return this.withTenantContext(async (prisma) => {
      return prisma.mitarbeiter.findMany({
        where: {
          lizenznehmerId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { telefon: { contains: query, mode: 'insensitive' } },
          ],
        },
      });
    });
  }

  /**
   * Löscht einen Mitarbeiter. Gleicher IDOR-Schutz wie bei update().
   */
  async remove(lizenznehmerId: string, id: string) {
    return this.withTenantContext(async (prisma) => {
      const existing = await prisma.mitarbeiter.findFirst({
        where: {
          id,
          lizenznehmerId,
        },
      });

      if (!existing) {
        throw new NotFoundException(`Mitarbeiter mit ID "${id}" wurde nicht gefunden.`);
      }

      return prisma.mitarbeiter.delete({
        where: { id },
      });
    });
  }
}
