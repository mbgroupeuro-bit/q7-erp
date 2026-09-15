import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PartnerTyp } from '@prisma/client';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { PARTNER_EVENTS, PartnerEvent } from './events/partner-events';

@Injectable()
export class PartnerService extends PrismaTenantService {
  private readonly logger = new Logger(PartnerService.name);

  // NEU (A73): EventEmitter2 injiziert. PrismaTenantService hat einen
  // parameterlosen Konstruktor — super() ohne Argumente ist daher korrekt.
  constructor(private readonly eventEmitter: EventEmitter2) {
    super();
  }

  /**
   * Löst ein Partner-Domain-Event ENTKOPPELT aus (Admin-Entscheidung,
   * A73-Grillme-Session, 17.08.2026): Ein Fehler bei der Event-Verarbeitung
   * (z.B. ein künftiger Listener aus A74 wirft) darf NIE den ursprünglichen
   * create()/update()/remove()-Aufruf zum Scheitern bringen — konsistent
   * mit Master-Dok 3.5 (Eigenständigkeits-Test). Deshalb try/catch statt
   * den Fehler durchzureichen; EventEmitter2.emit() läuft synchron und
   * würde einen Listener-Fehler sonst an den Aufrufer zurückwerfen.
   */
  private loesePartnerEventAus(
    eventName: (typeof PARTNER_EVENTS)[keyof typeof PARTNER_EVENTS],
    lizenznehmerId: string,
    partnerId: string,
  ): void {
    const payload: PartnerEvent = {
      lizenznehmerId,
      partnerId,
      zeitpunkt: new Date().toISOString(),
    };

    try {
      this.eventEmitter.emit(eventName, payload);
    } catch (error) {
      const nachricht = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Event "${eventName}" für Partner ${partnerId} (Lizenznehmer ${lizenznehmerId}) konnte nicht verarbeitet werden — ${nachricht}. Partner-Operation selbst war NICHT betroffen (entkoppelt, siehe A73).`,
      );
    }
  }

  /**
   * Legt einen neuen Partner für den aktuellen Lizenznehmer an.
   */
  async create(lizenznehmerId: string, dto: CreatePartnerDto) {
    const partner = await this.withTenantContext(async (prisma) => {
      return prisma.partner.create({
        data: {
          name: dto.name,
          typ: dto.typ || PartnerTyp.KUNDE,
          email: dto.email,
          telefon: dto.telefon,
          // Feldnamen im Prisma-Schema tragen das Präfix "adresse" —
          // DTO-Feldnamen (strasse, plz, ort, land) hier entsprechend zugeordnet.
          adresseStrasse: dto.strasse,
          adressePlz: dto.plz,
          adresseOrt: dto.ort,
          adresseLand: dto.land,
          lizenznehmerId,
        },
      });
    });

    // NEU (A73): Event ERST NACH erfolgreichem DB-Commit auslösen —
    // nie vorher, sonst könnte ein Event für einen Partner ausgelöst
    // werden, der am Ende gar nicht gespeichert wurde.
    this.loesePartnerEventAus(PARTNER_EVENTS.ANGELEGT, lizenznehmerId, partner.id);

    return partner;
  }

  /**
   * Holt alle Partner des aktuellen Lizenznehmers.
   */
  async findAll(lizenznehmerId: string) {
    return this.withTenantContext(async (prisma) => {
      return prisma.partner.findMany({
        where: {
          lizenznehmerId,
        },
      });
    });
  }

  /**
   * Holt einen einzelnen Partner anhand seiner ID.
   */
  async findOne(lizenznehmerId: string, id: string) {
    return this.withTenantContext(async (prisma) => {
      const partner = await prisma.partner.findFirst({
        where: {
          id,
          lizenznehmerId,
        },
      });

      if (!partner) {
        throw new NotFoundException(`Partner mit ID "${id}" wurde nicht gefunden.`);
      }

      return partner;
    });
  }

  /**
   * Aktualisiert einen bestehenden Partner.
   * Prüft zuerst per findFirst (id + lizenznehmerId), dass der Partner
   * tatsächlich zum aktuellen Lizenznehmer gehört (IDOR-Schutz, siehe
   * Master-Dokument 3.6, Szenario 2) — erst danach wird das Update ausgeführt.
   */
  async update(lizenznehmerId: string, id: string, dto: UpdatePartnerDto) {
    const aktualisiert = await this.withTenantContext(async (prisma) => {
      const existing = await prisma.partner.findFirst({
        where: {
          id,
          lizenznehmerId,
        },
      });

      if (!existing) {
        throw new NotFoundException(`Partner mit ID "${id}" wurde nicht gefunden.`);
      }

      return prisma.partner.update({
        where: { id },
        data: {
          name: dto.name,
          typ: dto.typ,
          email: dto.email,
          telefon: dto.telefon,
          adresseStrasse: dto.strasse,
          adressePlz: dto.plz,
          adresseOrt: dto.ort,
          adresseLand: dto.land,
        },
      });
    });

    // NEU (A73)
    this.loesePartnerEventAus(PARTNER_EVENTS.AKTUALISIERT, lizenznehmerId, aktualisiert.id);

    return aktualisiert;
  }

  /**
   * Löscht einen Partner. Gleicher IDOR-Schutz wie bei update().
   */
  async remove(lizenznehmerId: string, id: string) {
    const geloescht = await this.withTenantContext(async (prisma) => {
      const existing = await prisma.partner.findFirst({
        where: {
          id,
          lizenznehmerId,
        },
      });

      if (!existing) {
        throw new NotFoundException(`Partner mit ID "${id}" wurde nicht gefunden.`);
      }

      return prisma.partner.delete({
        where: { id },
      });
    });

    // NEU (A73) — id kommt aus dem gelöschten Datensatz selbst, da nach
    // dem delete() kein erneuter Zugriff über "id" mehr sinnvoll wäre.
    this.loesePartnerEventAus(PARTNER_EVENTS.GELOESCHT, lizenznehmerId, geloescht.id);

    return geloescht;
  }
}
