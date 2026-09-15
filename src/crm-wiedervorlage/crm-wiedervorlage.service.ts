import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';
import { CreateCrmWiedervorlageDto } from './dto/create-crm-wiedervorlage.dto';
import { UpdateCrmWiedervorlageDto } from './dto/update-crm-wiedervorlage.dto';
import { CRM_WIEDERVORLAGE_EVENTS, CrmWiedervorlageEvent } from './events/crm-wiedervorlage-events';

@Injectable()
export class CrmWiedervorlageService extends PrismaTenantService {
  private readonly logger = new Logger(CrmWiedervorlageService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {
    super();
  }

  /**
   * Löst ein CrmWiedervorlage-Domain-Event ENTKOPPELT aus — gleiches
   * Muster wie die übrigen CRM-Services (A73/A121/A125).
   */
  private loeseCrmWiedervorlageEventAus(
    eventName: (typeof CRM_WIEDERVORLAGE_EVENTS)[keyof typeof CRM_WIEDERVORLAGE_EVENTS],
    lizenznehmerId: string,
    crmWiedervorlageId: string,
  ): void {
    const payload: CrmWiedervorlageEvent = {
      lizenznehmerId,
      crmWiedervorlageId,
      zeitpunkt: new Date().toISOString(),
    };

    try {
      this.eventEmitter.emit(eventName, payload);
    } catch (error) {
      const nachricht = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Event "${eventName}" für CrmWiedervorlage ${crmWiedervorlageId} (Lizenznehmer ${lizenznehmerId}) konnte nicht verarbeitet werden — ${nachricht}. Operation selbst war NICHT betroffen.`,
      );
    }
  }

  /**
   * Legt eine neue Wiedervorlage/Aufgabe für einen CRM-Kontakt an.
   * Prüft zuerst, ob der referenzierte Kontakt zum aktuellen Lizenznehmer
   * gehört (IDOR-Schutz, Master-Dok 3.6, Szenario 2/3).
   */
  async create(lizenznehmerId: string, dto: CreateCrmWiedervorlageDto) {
    const wiedervorlage = await this.withTenantContext(async (prisma) => {
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

      return prisma.crmWiedervorlage.create({
        data: {
          text: dto.text,
          faelligkeitsDatum: new Date(dto.faelligkeitsDatum),
          erledigt: dto.erledigt ?? false,
          crmKontaktId: dto.crmKontaktId,
          lizenznehmerId,
        },
      });
    });

    this.loeseCrmWiedervorlageEventAus(
      CRM_WIEDERVORLAGE_EVENTS.ANGELEGT,
      lizenznehmerId,
      wiedervorlage.id,
    );

    return wiedervorlage;
  }

  /**
   * Holt alle Wiedervorlagen eines CRM-Kontakts (fälligste zuerst).
   * Gleicher IDOR-Schutz wie create().
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

      return prisma.crmWiedervorlage.findMany({
        where: {
          crmKontaktId,
          lizenznehmerId,
        },
        orderBy: { faelligkeitsDatum: 'asc' },
      });
    });
  }

  /**
   * Aktualisiert eine Wiedervorlage (z.B. erledigt=true setzen, Text
   * ändern, Fälligkeit verschieben). IDOR-Schutz wie PartnerService.update().
   */
  async update(lizenznehmerId: string, id: string, dto: UpdateCrmWiedervorlageDto) {
    const aktualisiert = await this.withTenantContext(async (prisma) => {
      const existing = await prisma.crmWiedervorlage.findFirst({
        where: {
          id,
          lizenznehmerId,
        },
      });

      if (!existing) {
        throw new NotFoundException(`Wiedervorlage mit ID "${id}" wurde nicht gefunden.`);
      }

      return prisma.crmWiedervorlage.update({
        where: { id },
        data: {
          text: dto.text,
          faelligkeitsDatum: dto.faelligkeitsDatum ? new Date(dto.faelligkeitsDatum) : undefined,
          erledigt: dto.erledigt,
        },
      });
    });

    this.loeseCrmWiedervorlageEventAus(
      CRM_WIEDERVORLAGE_EVENTS.AKTUALISIERT,
      lizenznehmerId,
      aktualisiert.id,
    );

    return aktualisiert;
  }

  /**
   * Löscht eine Wiedervorlage. Gleicher IDOR-Schutz wie bei update().
   */
  async remove(lizenznehmerId: string, id: string) {
    const geloescht = await this.withTenantContext(async (prisma) => {
      const existing = await prisma.crmWiedervorlage.findFirst({
        where: {
          id,
          lizenznehmerId,
        },
      });

      if (!existing) {
        throw new NotFoundException(`Wiedervorlage mit ID "${id}" wurde nicht gefunden.`);
      }

      return prisma.crmWiedervorlage.delete({
        where: { id },
      });
    });

    this.loeseCrmWiedervorlageEventAus(
      CRM_WIEDERVORLAGE_EVENTS.GELOESCHT,
      lizenznehmerId,
      geloescht.id,
    );

    return geloescht;
  }
}
