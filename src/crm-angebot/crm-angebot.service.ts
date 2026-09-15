import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';
import { CreateCrmAngebotDto } from './dto/create-crm-angebot.dto';
import { UpdateCrmAngebotDto } from './dto/update-crm-angebot.dto';
import { AddCrmAngebotPositionDto } from './dto/add-crm-angebot-position.dto';
import { CRM_ANGEBOT_EVENTS, CrmAngebotEvent } from './events/crm-angebot-events';

@Injectable()
export class CrmAngebotService extends PrismaTenantService {
  private readonly logger = new Logger(CrmAngebotService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {
    super();
  }

  /**
   * Löst ein CrmAngebot-Domain-Event ENTKOPPELT aus — gleiches Muster
   * wie die übrigen CRM-Services (A73/A121/A125/A126).
   */
  private loeseCrmAngebotEventAus(
    eventName: (typeof CRM_ANGEBOT_EVENTS)[keyof typeof CRM_ANGEBOT_EVENTS],
    lizenznehmerId: string,
    crmAngebotId: string,
  ): void {
    const payload: CrmAngebotEvent = {
      lizenznehmerId,
      crmAngebotId,
      zeitpunkt: new Date().toISOString(),
    };

    try {
      this.eventEmitter.emit(eventName, payload);
    } catch (error) {
      const nachricht = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Event "${eventName}" für CrmAngebot ${crmAngebotId} (Lizenznehmer ${lizenznehmerId}) konnte nicht verarbeitet werden — ${nachricht}. Operation selbst war NICHT betroffen.`,
      );
    }
  }

  /**
   * Reichert Positionen mit einer rein INFORMATIVEN Verfügbarkeitsanzeige
   * an (Summe über Lagerbestand je Artikel, alle Lagerorte). Admin-
   * Entscheidung (24.08.2026, Grill-Me): keine Reservierung/Blockierung —
   * Lager-Modul bleibt eigenständig (3.2), Angebot fragt nur lesend ab.
   */
  private async reichereMitVerfuegbarkeitAn(prisma: any, positionen: any[]) {
    const artikelIds = positionen.map((p) => p.artikelId);
    if (artikelIds.length === 0) return positionen;

    const bestaende = await prisma.lagerbestand.groupBy({
      by: ['artikelId'],
      where: { artikelId: { in: artikelIds } },
      _sum: { menge: true },
    });

    const bestandProArtikel = new Map(
      bestaende.map((b: any) => [b.artikelId, b._sum.menge ?? 0]),
    );

    return positionen.map((p) => ({
      ...p,
      verfuegbareMenge: bestandProArtikel.get(p.artikelId) ?? 0,
    }));
  }

  /**
   * Legt ein neues Angebot mit Positionen an. Preis-Snapshot: einzelpreis
   * wird hier aus dem AKTUELLEN Artikel.grundpreis kopiert und danach
   * nie wieder mit dem Artikel synchronisiert (Admin-Entscheidung).
   * IDOR-Schutz: Kontakt UND jeder referenzierte Artikel müssen zum
   * aktuellen Lizenznehmer gehören.
   */
  async create(lizenznehmerId: string, dto: CreateCrmAngebotDto) {
    if (!dto.positionen || dto.positionen.length === 0) {
      throw new BadRequestException('Ein Angebot benötigt mindestens eine Position.');
    }

    const angebot = await this.withTenantContext(async (prisma) => {
      const kontakt = await prisma.crmKontakt.findFirst({
        where: { id: dto.crmKontaktId, lizenznehmerId },
      });
      if (!kontakt) {
        throw new NotFoundException(
          `CRM-Kontakt mit ID "${dto.crmKontaktId}" wurde nicht gefunden.`,
        );
      }

      // Alle referenzierten Artikel in einem Rutsch laden + Tenant-Zugehörigkeit prüfen
      const artikelIds = dto.positionen.map((p) => p.artikelId);
      const artikel = await prisma.artikel.findMany({
        where: { id: { in: artikelIds }, lizenznehmerId },
      });

      if (artikel.length !== new Set(artikelIds).size) {
        throw new NotFoundException(
          'Mindestens ein referenzierter Artikel wurde nicht gefunden.',
        );
      }

      const artikelMap = new Map(artikel.map((a) => [a.id, a]));

      return prisma.crmAngebot.create({
        data: {
          lizenznehmerId,
          crmKontaktId: dto.crmKontaktId,
          gueltigBis: dto.gueltigBis ? new Date(dto.gueltigBis) : null,
          positionen: {
            create: dto.positionen.map((p) => ({
              lizenznehmerId,
              artikelId: p.artikelId,
              menge: p.menge,
              einzelpreis: artikelMap.get(p.artikelId)!.grundpreis, // Preis-Snapshot
            })),
          },
        },
        include: { positionen: true },
      });
    });

    this.loeseCrmAngebotEventAus(CRM_ANGEBOT_EVENTS.ANGELEGT, lizenznehmerId, angebot.id);

    return angebot;
  }

  /**
   * Holt alle Angebote eines CRM-Kontakts (neueste zuerst), inkl. Positionen.
   */
  async findAllByKontakt(lizenznehmerId: string, crmKontaktId: string) {
    return this.withTenantContext(async (prisma) => {
      const kontakt = await prisma.crmKontakt.findFirst({
        where: { id: crmKontaktId, lizenznehmerId },
      });
      if (!kontakt) {
        throw new NotFoundException(
          `CRM-Kontakt mit ID "${crmKontaktId}" wurde nicht gefunden.`,
        );
      }

      return prisma.crmAngebot.findMany({
        where: { crmKontaktId, lizenznehmerId },
        include: { positionen: { include: { artikel: true } } },
        orderBy: { erstelltAm: 'desc' },
      });
    });
  }

  /**
   * Holt ein einzelnes Angebot inkl. Positionen + informativer
   * Verfügbarkeitsanzeige je Position (kein Reservieren, nur Anzeige).
   */
  async findOne(lizenznehmerId: string, id: string) {
    return this.withTenantContext(async (prisma) => {
      const angebot = await prisma.crmAngebot.findFirst({
        where: { id, lizenznehmerId },
        include: { positionen: { include: { artikel: true } } },
      });

      if (!angebot) {
        throw new NotFoundException(`Angebot mit ID "${id}" wurde nicht gefunden.`);
      }

      const positionenMitVerfuegbarkeit = await this.reichereMitVerfuegbarkeitAn(
        prisma,
        angebot.positionen,
      );

      return { ...angebot, positionen: positionenMitVerfuegbarkeit };
    });
  }

  /**
   * Aktualisiert Status und/oder Gültigkeitsdatum. IDOR-Schutz wie gewohnt.
   * Preis/Positionen werden hier NICHT angefasst (siehe addPosition/removePosition).
   */
  async update(lizenznehmerId: string, id: string, dto: UpdateCrmAngebotDto) {
    const aktualisiert = await this.withTenantContext(async (prisma) => {
      const existing = await prisma.crmAngebot.findFirst({
        where: { id, lizenznehmerId },
      });
      if (!existing) {
        throw new NotFoundException(`Angebot mit ID "${id}" wurde nicht gefunden.`);
      }

      return prisma.crmAngebot.update({
        where: { id },
        data: {
          status: dto.status,
          gueltigBis: dto.gueltigBis ? new Date(dto.gueltigBis) : undefined,
        },
        include: { positionen: true },
      });
    });

    this.loeseCrmAngebotEventAus(CRM_ANGEBOT_EVENTS.AKTUALISIERT, lizenznehmerId, aktualisiert.id);

    return aktualisiert;
  }

  /**
   * Fügt einem bestehenden Angebot eine weitere Position hinzu.
   * Preis-Snapshot wie bei create(): aktueller Artikelpreis zum
   * Zeitpunkt des Hinzufügens.
   */
  async addPosition(lizenznehmerId: string, angebotId: string, dto: AddCrmAngebotPositionDto) {
    const aktualisiert = await this.withTenantContext(async (prisma) => {
      const angebot = await prisma.crmAngebot.findFirst({
        where: { id: angebotId, lizenznehmerId },
      });
      if (!angebot) {
        throw new NotFoundException(`Angebot mit ID "${angebotId}" wurde nicht gefunden.`);
      }

      const artikel = await prisma.artikel.findFirst({
        where: { id: dto.artikelId, lizenznehmerId },
      });
      if (!artikel) {
        throw new NotFoundException(`Artikel mit ID "${dto.artikelId}" wurde nicht gefunden.`);
      }

      await prisma.crmAngebotPosition.create({
        data: {
          lizenznehmerId,
          crmAngebotId: angebotId,
          artikelId: dto.artikelId,
          menge: dto.menge,
          einzelpreis: artikel.grundpreis,
        },
      });

      return prisma.crmAngebot.findFirst({
        where: { id: angebotId },
        include: { positionen: true },
      });
    });

    this.loeseCrmAngebotEventAus(CRM_ANGEBOT_EVENTS.AKTUALISIERT, lizenznehmerId, angebotId);

    return aktualisiert;
  }

  /**
   * Entfernt eine einzelne Position aus einem Angebot. IDOR-Schutz:
   * Position muss zu diesem Angebot UND Lizenznehmer gehören.
   */
  async removePosition(lizenznehmerId: string, angebotId: string, positionId: string) {
    const aktualisiert = await this.withTenantContext(async (prisma) => {
      const position = await prisma.crmAngebotPosition.findFirst({
        where: { id: positionId, crmAngebotId: angebotId, lizenznehmerId },
      });
      if (!position) {
        throw new NotFoundException(`Angebotsposition mit ID "${positionId}" wurde nicht gefunden.`);
      }

      await prisma.crmAngebotPosition.delete({ where: { id: positionId } });

      return prisma.crmAngebot.findFirst({
        where: { id: angebotId },
        include: { positionen: true },
      });
    });

    this.loeseCrmAngebotEventAus(CRM_ANGEBOT_EVENTS.AKTUALISIERT, lizenznehmerId, angebotId);

    return aktualisiert;
  }

  /**
   * Löscht ein komplettes Angebot inkl. aller Positionen (erst Positionen,
   * dann Kopf — keine Kaskade im Schema definiert, daher manuell in der
   * gleichen Transaktion). IDOR-Schutz wie gewohnt.
   */
  async remove(lizenznehmerId: string, id: string) {
    const geloescht = await this.withTenantContext(async (prisma) => {
      const existing = await prisma.crmAngebot.findFirst({
        where: { id, lizenznehmerId },
      });
      if (!existing) {
        throw new NotFoundException(`Angebot mit ID "${id}" wurde nicht gefunden.`);
      }

      await prisma.crmAngebotPosition.deleteMany({ where: { crmAngebotId: id } });

      return prisma.crmAngebot.delete({ where: { id } });
    });

    this.loeseCrmAngebotEventAus(CRM_ANGEBOT_EVENTS.GELOESCHT, lizenznehmerId, geloescht.id);

    return geloescht;
  }
}
