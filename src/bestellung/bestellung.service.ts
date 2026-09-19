import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';
import { CreateBestellungDto } from './dto/create-bestellung.dto';
import { UpdateBestellungStatusDto } from './dto/update-bestellung-status.dto';

/**
 * D05 — BestellungService-Grundgerüst (Block D, E-Commerce/Fulfillment).
 * Grundlage: Q7ERP_Konzept_Bestellung_v1.md (Grill-Me D03, Verdict PROCEED).
 *
 * Bewusst NUR Grundgerüst (analog PartnerService/ArtikelService) — enthält
 * KEINE Logistik-/Zahlungs-/Versand-Logik. Insbesondere ruft diese Version
 * NICHT automatisch LagerService.warenausgangBuchen() auf — das ist laut
 * D03 (Entscheidung 4) so vorgesehen, wird aber erst mit dem tatsächlichen
 * Versandfluss (D11+) verdrahtet, nicht schon beim reinen Anlegen einer
 * Bestellung. Bis dahin bucht ein Statuswechsel auf VERSANDT/ABGESCHLOSSEN
 * HIER noch keinen Warenausgang — TODO bei D11.
 */
@Injectable()
export class BestellungService extends PrismaTenantService {
  /**
   * Legt eine neue Bestellung mit ihren Positionen an.
   *
   * D05-Entscheidung: gesamtbetragNetto UND gesamtbetragBrutto werden
   * beide gespeichert (nicht nur einer + Einstellung) — hält die
   * Bestellhistorie eindeutig, unabhängig von einer späteren
   * Konfigurationsänderung (konsistent mit D03, Entscheidung 2:
   * Snapshot-Prinzip). Brutto wird je Position aus dem jeweiligen
   * mwstSatz berechnet (D03, Entscheidung 5 — pro Position, nicht
   * pauschal pro Bestellung), dann aufsummiert.
   *
   * Jeder artikelId in den Positionen wird geprüft (analog findOne-Check
   * in ArtikelService/pruefeArtikelGehoertZuTenant in LagerService) —
   * verhindert IDOR über eine fremde Artikel-Id (Master-Dokument 3.6,
   * Leck-Szenario 1/2).
   */
  async create(lizenznehmerId: string, dto: CreateBestellungDto) {
    return this.withTenantContext(async (prisma) => {
      if (dto.positionen.length === 0) {
        throw new BadRequestException('Eine Bestellung benötigt mindestens eine Position.');
      }

      for (const position of dto.positionen) {
        await this.pruefeArtikelExistiert(prisma, lizenznehmerId, position.artikelId);
      }

      const gesamtbetragNetto = dto.positionen.reduce(
        (summe, position) => summe + position.menge * position.einzelpreis,
        0,
      );

      const gesamtbetragBrutto = dto.positionen.reduce(
        (summe, position) =>
          summe + position.menge * position.einzelpreis * (1 + position.mwstSatz / 100),
        0,
      );

      return prisma.bestellung.create({
        data: {
          lizenznehmerId,
          quelle: dto.quelle,
          externeBestellId: dto.externeBestellId,
          kundeName: dto.kundeName,
          kundeTelefon: dto.kundeTelefon,
          kundeAdresse: dto.kundeAdresse,
          zahlartAdapterName: dto.zahlartAdapterName,
          lagerortId: dto.lagerortId,
          gesamtbetragNetto,
          gesamtbetragBrutto,
          positionen: {
            create: dto.positionen.map((position) => ({
              lizenznehmerId,
              artikelId: position.artikelId,
              menge: position.menge,
              einzelpreis: position.einzelpreis,
              mwstSatz: position.mwstSatz,
            })),
          },
        },
        include: { positionen: true },
      });
    });
  }

  /**
   * Holt alle Bestellungen des aktuellen Lizenznehmers, optional gefiltert
   * nach Status. Neueste zuerst.
   */
  async findAll(lizenznehmerId: string, status?: string) {
    return this.withTenantContext(async (prisma) => {
      return prisma.bestellung.findMany({
        where: {
          lizenznehmerId,
          ...(status ? { status } : {}),
        },
        include: { positionen: true },
        orderBy: { erstelltAm: 'desc' },
      });
    });
  }

  /**
   * Holt eine einzelne Bestellung samt Positionen anhand ihrer ID.
   * IDOR-Schutz: Filter auf id + lizenznehmerId (siehe Master-Dokument 3.6).
   */
  async findOne(lizenznehmerId: string, id: string) {
    return this.withTenantContext(async (prisma) => {
      const bestellung = await prisma.bestellung.findFirst({
        where: { id, lizenznehmerId },
        include: { positionen: true },
      });

      if (!bestellung) {
        throw new NotFoundException(`Bestellung mit ID "${id}" wurde nicht gefunden.`);
      }

      return bestellung;
    });
  }

  /**
   * Ändert den Status einer Bestellung.
   * IDOR-Schutz: existierende Bestellung wird zuerst über findOne geprüft
   * (id + lizenznehmerId), erst danach wird das Update ausgeführt (analog
   * ArtikelService.update()).
   *
   * ACHTUNG (siehe Klassenkommentar): bucht noch KEINEN Warenausgang bei
   * Wechsel auf VERSANDT/ABGESCHLOSSEN — das kommt erst mit D11, wenn
   * LagerService.warenausgangBuchen() sauber eingebunden wird (D03,
   * Entscheidung 4). Bis dahin ist ein Statuswechsel rein informativ.
   */
  async updateStatus(lizenznehmerId: string, id: string, dto: UpdateBestellungStatusDto) {
    return this.withTenantContext(async (prisma) => {
      // Prüft Existenz + Zugehörigkeit zum Lizenznehmer, wirft sonst NotFoundException
      await this.findOne(lizenznehmerId, id);

      return prisma.bestellung.update({
        where: { id },
        data: { status: dto.status },
        include: { positionen: true },
      });
    });
  }

  /**
   * IDOR-Schutz (analog ArtikelService.findOne / LagerService.pruefeArtikelGehoertZuTenant,
   * A60): verhindert, dass eine Bestellposition auf einen Artikel eines
   * fremden Lizenznehmers verweist.
   */
  private async pruefeArtikelExistiert(prisma: any, lizenznehmerId: string, artikelId: string) {
    const artikel = await prisma.artikel.findFirst({
      where: { id: artikelId, lizenznehmerId },
    });

    if (!artikel) {
      throw new NotFoundException(`Artikel mit ID "${artikelId}" wurde nicht gefunden.`);
    }
  }
}
