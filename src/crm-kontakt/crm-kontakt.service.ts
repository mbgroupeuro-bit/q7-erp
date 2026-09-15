import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrmPipelineStatus } from '@prisma/client';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';
import { CreateCrmKontaktDto } from './dto/create-crm-kontakt.dto';
import { UpdateCrmKontaktDto } from './dto/update-crm-kontakt.dto';
import { CRM_KONTAKT_EVENTS, CrmKontaktEvent } from './events/crm-kontakt-events';

@Injectable()
export class CrmKontaktService extends PrismaTenantService {
  private readonly logger = new Logger(CrmKontaktService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {
    super();
  }

  /**
   * Löst ein CrmKontakt-Domain-Event ENTKOPPELT aus — gleiches Muster
   * wie PartnerService (A73): Fehler im Listener darf die eigentliche
   * Operation nie zum Scheitern bringen (Master-Dok 3.5).
   */
  private loeseCrmKontaktEventAus(
    eventName: (typeof CRM_KONTAKT_EVENTS)[keyof typeof CRM_KONTAKT_EVENTS],
    lizenznehmerId: string,
    crmKontaktId: string,
  ): void {
    const payload: CrmKontaktEvent = {
      lizenznehmerId,
      crmKontaktId,
      zeitpunkt: new Date().toISOString(),
    };

    try {
      this.eventEmitter.emit(eventName, payload);
    } catch (error) {
      const nachricht = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Event "${eventName}" für CrmKontakt ${crmKontaktId} (Lizenznehmer ${lizenznehmerId}) konnte nicht verarbeitet werden — ${nachricht}. CrmKontakt-Operation selbst war NICHT betroffen.`,
      );
    }
  }

  /**
   * Legt einen neuen CRM-Kontakt für den aktuellen Lizenznehmer an.
   * partnerId ist optional (Grill-Me-Entscheidung Option 3, 23.08.2026):
   * ein Kontakt muss nicht sofort einem Partner zugeordnet sein.
   */
  async create(lizenznehmerId: string, dto: CreateCrmKontaktDto) {
    const kontakt = await this.withTenantContext(async (prisma) => {
      return prisma.crmKontakt.create({
        data: {
          name: dto.name,
          email: dto.email,
          telefon: dto.telefon,
          partnerId: dto.partnerId,
          pipelineStatus: dto.pipelineStatus || CrmPipelineStatus.NEU,
          quelle: dto.quelle,
          lizenznehmerId,
        },
      });
    });

    this.loeseCrmKontaktEventAus(CRM_KONTAKT_EVENTS.ANGELEGT, lizenznehmerId, kontakt.id);

    return kontakt;
  }

  /**
   * Holt alle CRM-Kontakte des aktuellen Lizenznehmers.
   */
  async findAll(lizenznehmerId: string) {
    return this.withTenantContext(async (prisma) => {
      return prisma.crmKontakt.findMany({
        where: {
          lizenznehmerId,
        },
      });
    });
  }

  /**
   * Holt einen einzelnen CRM-Kontakt anhand seiner ID.
   */
  async findOne(lizenznehmerId: string, id: string) {
    return this.withTenantContext(async (prisma) => {
      const kontakt = await prisma.crmKontakt.findFirst({
        where: {
          id,
          lizenznehmerId,
        },
      });

      if (!kontakt) {
        throw new NotFoundException(`CRM-Kontakt mit ID "${id}" wurde nicht gefunden.`);
      }

      return kontakt;
    });
  }

  /**
   * Aktualisiert einen bestehenden CRM-Kontakt.
   * IDOR-Schutz wie PartnerService.update() (Master-Dok 3.6, Szenario 2):
   * erst findFirst mit id + lizenznehmerId, dann erst update.
   */
  async update(lizenznehmerId: string, id: string, dto: UpdateCrmKontaktDto) {
    const aktualisiert = await this.withTenantContext(async (prisma) => {
      const existing = await prisma.crmKontakt.findFirst({
        where: {
          id,
          lizenznehmerId,
        },
      });

      if (!existing) {
        throw new NotFoundException(`CRM-Kontakt mit ID "${id}" wurde nicht gefunden.`);
      }

      return prisma.crmKontakt.update({
        where: { id },
        data: {
          name: dto.name,
          email: dto.email,
          telefon: dto.telefon,
          partnerId: dto.partnerId,
          pipelineStatus: dto.pipelineStatus,
          quelle: dto.quelle,
        },
      });
    });

    this.loeseCrmKontaktEventAus(CRM_KONTAKT_EVENTS.AKTUALISIERT, lizenznehmerId, aktualisiert.id);

    return aktualisiert;
  }

  /**
   * Durchsucht CRM-Kontakte des aktuellen Lizenznehmers nach Name,
   * E-Mail, Telefon oder Quelle (case-insensitive Teilstring-Suche).
   * A130 (Option C, Memory): zentraler Such-Service je Modul, damit
   * Frontend UND spaeterer ERP-Agent denselben Endpunkt nutzen (3.1).
   * Vorerst nur CrmKontakt-Felder — Aktivitaeten/Angebote-Volltext
   * bewusst nicht eingeschlossen (Admin-Entscheidung, 25.08.2026),
   * kann bei Bedarf spaeter ergaenzt werden (3.4).
   */
  async search(lizenznehmerId: string, query: string) {
    return this.withTenantContext(async (prisma) => {
      return prisma.crmKontakt.findMany({
        where: {
          lizenznehmerId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { telefon: { contains: query, mode: 'insensitive' } },
            { quelle: { contains: query, mode: 'insensitive' } },
          ],
        },
      });
    });
  }

  /**
   * Löscht einen CRM-Kontakt. Gleicher IDOR-Schutz wie bei update().
   */
  async remove(lizenznehmerId: string, id: string) {
    const geloescht = await this.withTenantContext(async (prisma) => {
      const existing = await prisma.crmKontakt.findFirst({
        where: {
          id,
          lizenznehmerId,
        },
      });

      if (!existing) {
        throw new NotFoundException(`CRM-Kontakt mit ID "${id}" wurde nicht gefunden.`);
      }

      return prisma.crmKontakt.delete({
        where: { id },
      });
    });

    this.loeseCrmKontaktEventAus(CRM_KONTAKT_EVENTS.GELOESCHT, lizenznehmerId, geloescht.id);

    return geloescht;
  }
}
