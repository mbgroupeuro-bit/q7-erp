import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';
import { CreateCrmAktivitaetDto } from './dto/create-crm-aktivitaet.dto';
import { CRM_AKTIVITAET_EVENTS, CrmAktivitaetEvent } from './events/crm-aktivitaet-events';

@Injectable()
export class CrmAktivitaetService extends PrismaTenantService {
  private readonly logger = new Logger(CrmAktivitaetService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {
    super();
  }

  /**
   * Löst ein CrmAktivitaet-Domain-Event ENTKOPPELT aus — gleiches Muster
   * wie PartnerService/CrmKontaktService (A73/A121).
   */
  private loeseCrmAktivitaetEventAus(
    eventName: (typeof CRM_AKTIVITAET_EVENTS)[keyof typeof CRM_AKTIVITAET_EVENTS],
    lizenznehmerId: string,
    crmAktivitaetId: string,
  ): void {
    const payload: CrmAktivitaetEvent = {
      lizenznehmerId,
      crmAktivitaetId,
      zeitpunkt: new Date().toISOString(),
    };

    try {
      this.eventEmitter.emit(eventName, payload);
    } catch (error) {
      const nachricht = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Event "${eventName}" für CrmAktivitaet ${crmAktivitaetId} (Lizenznehmer ${lizenznehmerId}) konnte nicht verarbeitet werden — ${nachricht}. CrmAktivitaet-Operation selbst war NICHT betroffen.`,
      );
    }
  }

  /**
   * Legt eine neue Aktivität/Notiz für einen CRM-Kontakt an.
   * Prüft zuerst, ob der referenzierte Kontakt zum aktuellen Lizenznehmer
   * gehört (IDOR-Schutz, Master-Dok 3.6, Szenario 2/3 — verknüpfte Abfrage).
   */
  async create(lizenznehmerId: string, dto: CreateCrmAktivitaetDto) {
    const aktivitaet = await this.withTenantContext(async (prisma) => {
      const kontakt = await prisma.crmKontakt.findFirst({
        where: {
          id: dto.crmKontaktId,
          lizenznehmerId,
        },
      });

      if (!kontakt) {
        throw new NotFoundException(
          `CRM-Kontakt mit ID "${dto.crmKontaktId}" wurde nicht gefunden.`,
        );
      }

      return prisma.crmAktivitaet.create({
        data: {
          text: dto.text,
          crmKontaktId: dto.crmKontaktId,
          lizenznehmerId,
        },
      });
    });

    this.loeseCrmAktivitaetEventAus(CRM_AKTIVITAET_EVENTS.ANGELEGT, lizenznehmerId, aktivitaet.id);

    return aktivitaet;
  }

  /**
   * Holt alle Aktivitäten eines CRM-Kontakts (neueste zuerst).
   * Gleicher IDOR-Schutz wie create(): erst prüfen, ob der Kontakt
   * überhaupt zum aktuellen Lizenznehmer gehört.
   */
  async findAllByKontakt(lizenznehmerId: string, crmKontaktId: string) {
    return this.withTenantContext(async (prisma) => {
      const kontakt = await prisma.crmKontakt.findFirst({
        where: {
          id: crmKontaktId,
          lizenznehmerId,
        },
      });

      if (!kontakt) {
        throw new NotFoundException(
          `CRM-Kontakt mit ID "${crmKontaktId}" wurde nicht gefunden.`,
        );
      }

      return prisma.crmAktivitaet.findMany({
        where: {
          crmKontaktId,
          lizenznehmerId,
        },
        orderBy: { erstelltAm: 'desc' },
      });
    });
  }

  /**
   * Löscht eine Aktivität. IDOR-Schutz wie PartnerService.remove().
   */
  async remove(lizenznehmerId: string, id: string) {
    const geloescht = await this.withTenantContext(async (prisma) => {
      const existing = await prisma.crmAktivitaet.findFirst({
        where: {
          id,
          lizenznehmerId,
        },
      });

      if (!existing) {
        throw new NotFoundException(`Aktivität mit ID "${id}" wurde nicht gefunden.`);
      }

      return prisma.crmAktivitaet.delete({
        where: { id },
      });
    });

    this.loeseCrmAktivitaetEventAus(CRM_AKTIVITAET_EVENTS.GELOESCHT, lizenznehmerId, geloescht.id);

    return geloescht;
  }
}
