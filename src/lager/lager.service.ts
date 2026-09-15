import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';
import { WareneingangDto } from './dto/wareneingang.dto';
import { WarenausgangDto } from './dto/warenausgang.dto';
import { BestandskorrekturDto } from './dto/bestandskorrektur.dto';
import { BundleVerkaufDto } from './dto/bundle-verkauf.dto';

@Injectable()
export class LagerService extends PrismaTenantService {
  /**
   * NEU (A103, Option 3): Liefert den Bestand ALLER Artikel des
   * Lizenznehmers, angereichert um Artikelname/-nummer und Lagerort-Name,
   * für die Bestandsübersicht im Dashboard.
   *
   * lagerortId optional: ohne Angabe werden Bestände über alle Lagerorte
   * des Lizenznehmers zusammen zurückgegeben; mit Angabe nur für diesen
   * einen Lagerort (vorbereitet für künftige Mehr-Standort-Nutzung, siehe
   * schema.prisma-Kommentar bei Lagerort).
   *
   * IDOR-Schutz: Filter auf lizenznehmerId direkt in der Abfrage
   * (Master-Dokument 3.6). Kein Fremdschlüssel-Zugriff über eine fremde
   * lagerortId möglich, da lagerortId zusätzlich implizit über den
   * lizenznehmerId-Filter der lagerbestand-Tabelle abgesichert ist.
   */
  async holeAlleBestaende(lizenznehmerId: string, lagerortId?: string) {
    return this.withTenantContext(async (prisma) => {
      const bestaende = await prisma.lagerbestand.findMany({
        where: {
          lizenznehmerId,
          ...(lagerortId ? { lagerortId } : {}),
        },
      });

      if (bestaende.length === 0) {
        return [];
      }

      const artikelIds = [...new Set(bestaende.map((b) => b.artikelId))];
      const lagerortIds = [...new Set(bestaende.map((b) => b.lagerortId))];

      const [artikelListe, lagerortListe] = await Promise.all([
        prisma.artikel.findMany({
          where: { id: { in: artikelIds }, lizenznehmerId },
        }),
        prisma.lagerort.findMany({
          where: { id: { in: lagerortIds }, lizenznehmerId },
        }),
      ]);

      const artikelMap = new Map(artikelListe.map((a) => [a.id, a]));
      const lagerortMap = new Map(lagerortListe.map((l) => [l.id, l]));

      return bestaende.map((b) => ({
        artikelId: b.artikelId,
        artikelnummer: artikelMap.get(b.artikelId)?.artikelnummer ?? null,
        artikelName: artikelMap.get(b.artikelId)?.name ?? null,
        lagerortId: b.lagerortId,
        lagerortName: lagerortMap.get(b.lagerortId)?.name ?? null,
        menge: b.menge,
      }));
    });
  }

  /**
   * Holt den aktuellen Bestand eines Artikels an einem Lagerort.
   * Wird kein lagerortId übergeben, wird automatisch der Standard-Lagerort
   * des Lizenznehmers verwendet (istStandard = true).
   * Existiert noch kein Lagerbestand-Datensatz (z.B. noch nie gebucht),
   * wird Menge 0 zurückgegeben statt eines Fehlers.
   */
  async holeBestand(lizenznehmerId: string, artikelId: string, lagerortId?: string) {
    return this.withTenantContext(async (prisma) => {
      await this.pruefeArtikelGehoertZuTenant(prisma, lizenznehmerId, artikelId);
      const zielLagerortId = await this.ermittleZielLagerort(prisma, lizenznehmerId, lagerortId);

      const bestand = await prisma.lagerbestand.findFirst({
        where: {
          artikelId,
          lagerortId: zielLagerortId,
          lizenznehmerId,
        },
      });

      return {
        artikelId,
        lagerortId: zielLagerortId,
        menge: bestand?.menge ?? 0,
      };
    });
  }

  /**
   * Bucht einen Wareneingang: erhöht den Lagerbestand (upsert) und
   * protokolliert die Buchung in Lagerbewegung — beides innerhalb
   * derselben Tenant-Transaktion (A46/A51).
   */
  async wareneingangBuchen(lizenznehmerId: string, dto: WareneingangDto) {
    return this.withTenantContext(async (prisma) => {
      await this.pruefeArtikelGehoertZuTenant(prisma, lizenznehmerId, dto.artikelId);
      const zielLagerortId = await this.ermittleZielLagerort(prisma, lizenznehmerId, dto.lagerortId);

      const bestand = await prisma.lagerbestand.upsert({
        where: {
          artikelId_lagerortId: {
            artikelId: dto.artikelId,
            lagerortId: zielLagerortId,
          },
        },
        create: {
          artikelId: dto.artikelId,
          lagerortId: zielLagerortId,
          lizenznehmerId,
          menge: dto.menge,
        },
        update: {
          menge: { increment: dto.menge },
        },
      });

      await prisma.lagerbewegung.create({
        data: {
          lizenznehmerId,
          artikelId: dto.artikelId,
          lagerortId: zielLagerortId,
          typ: 'WARENEINGANG',
          menge: dto.menge,
          referenz: dto.referenz,
          bemerkung: dto.bemerkung,
        },
      });

      return bestand;
    });
  }

  /**
   * Bucht einen Warenausgang: verringert den Lagerbestand und
   * protokolliert die Buchung in Lagerbewegung — beides innerhalb
   * derselben Tenant-Transaktion (A53, analog A51).
   *
   * A55: Vor der Abbuchung wird der aktuelle Bestand geprüft — reicht er
   * nicht aus, wird die Buchung abgelehnt (kein negativer Bestand möglich).
   */
  async warenausgangBuchen(lizenznehmerId: string, dto: WarenausgangDto) {
    return this.withTenantContext(async (prisma) => {
      await this.pruefeArtikelGehoertZuTenant(prisma, lizenznehmerId, dto.artikelId);
      const zielLagerortId = await this.ermittleZielLagerort(prisma, lizenznehmerId, dto.lagerortId);

      const aktuellerBestand = await prisma.lagerbestand.findFirst({
        where: {
          artikelId: dto.artikelId,
          lagerortId: zielLagerortId,
          lizenznehmerId,
        },
      });

      const vorhandeneMenge = aktuellerBestand?.menge ?? 0;

      if (Number(vorhandeneMenge) < dto.menge) {
        throw new BadRequestException(
          `Nicht genug Bestand: vorhanden ${vorhandeneMenge}, angefordert ${dto.menge}.`,
        );
      }

      const bestand = await prisma.lagerbestand.update({
        where: {
          artikelId_lagerortId: {
            artikelId: dto.artikelId,
            lagerortId: zielLagerortId,
          },
        },
        data: {
          menge: { decrement: dto.menge },
        },
      });

      await prisma.lagerbewegung.create({
        data: {
          lizenznehmerId,
          artikelId: dto.artikelId,
          lagerortId: zielLagerortId,
          typ: 'WARENAUSGANG',
          menge: dto.menge,
          referenz: dto.referenz,
          bemerkung: dto.bemerkung,
        },
      });

      return bestand;
    });
  }

  /**
   * Bucht eine Bestandskorrektur (z.B. Inventur): Eingabe ist die
   * GEZÄHLTE ZIELMENGE, nicht die Differenz. Die Methode berechnet die
   * Differenz selbst und protokolliert sie mit gerichtetem typ
   * (KORREKTUR_AUFWAERTS / KORREKTUR_ABWAERTS) — "menge" in Lagerbewegung
   * bleibt dadurch überall im System strikt positiv (A56, Grill-Me-Entscheidung
   * 15.08.2026: keine Vorzeichen-Ausnahme, stattdessen zwei Enum-Werte).
   *
   * Ist Ziel- und Ist-Menge identisch, wird keine Lagerbewegung angelegt
   * (keine Differenz = keine Historie nötig).
   * Existiert noch kein Lagerbestand-Datensatz, gilt Ist-Menge = 0.
   */
  async bestandskorrekturBuchen(lizenznehmerId: string, dto: BestandskorrekturDto) {
    return this.withTenantContext(async (prisma) => {
      await this.pruefeArtikelGehoertZuTenant(prisma, lizenznehmerId, dto.artikelId);
      const zielLagerortId = await this.ermittleZielLagerort(prisma, lizenznehmerId, dto.lagerortId);

      const aktuellerBestand = await prisma.lagerbestand.findFirst({
        where: {
          artikelId: dto.artikelId,
          lagerortId: zielLagerortId,
          lizenznehmerId,
        },
      });

      const istMenge = Number(aktuellerBestand?.menge ?? 0);
      const differenz = dto.neueMenge - istMenge;

      const bestand = await prisma.lagerbestand.upsert({
        where: {
          artikelId_lagerortId: {
            artikelId: dto.artikelId,
            lagerortId: zielLagerortId,
          },
        },
        create: {
          artikelId: dto.artikelId,
          lagerortId: zielLagerortId,
          lizenznehmerId,
          menge: dto.neueMenge,
        },
        update: {
          menge: dto.neueMenge,
        },
      });

      if (differenz !== 0) {
        await prisma.lagerbewegung.create({
          data: {
            lizenznehmerId,
            artikelId: dto.artikelId,
            lagerortId: zielLagerortId,
            typ: differenz > 0 ? 'KORREKTUR_AUFWAERTS' : 'KORREKTUR_ABWAERTS',
            menge: Math.abs(differenz),
            referenz: dto.referenz,
            bemerkung: dto.bemerkung,
          },
        });
      }

      return bestand;
    });
  }

  /**
   * A58: Bucht die automatische Bestandsabbuchung beim Verkauf eines
   * Bundle-Artikels (Artikel-Stufe 3, siehe Master-Dokument Abschnitt 4).
   *
   * Ablauf:
   * 1. Bundle-Artikel laden, prüfen dass er existiert und istBundle = true ist.
   * 2. Stückliste (BundlePosition) für dieses Bundle laden.
   * 3. ERST-DURCHLAUF: für ALLE Bestandteile prüfen, ob genug Bestand da ist —
   *    kein Teilerfolg möglich, analog zur Bestandsprüfung bei warenausgangBuchen (A55).
   *    Reicht auch nur EIN Bestandteil nicht aus, wird die GESAMTE Buchung
   *    abgelehnt, bevor irgendetwas abgebucht wurde.
   * 4. ZWEITER DURCHLAUF: jeden Bestandteil abbuchen + Lagerbewegung (typ
   *    BUNDLE_ABBUCHUNG) protokollieren.
   * Beides läuft innerhalb derselben Tenant-Transaktion (withTenantContext),
   * daher ist auch bei einem Fehler mitten im zweiten Durchlauf kein
   * inkonsistenter Zwischenzustand möglich.
   *
   * dto.menge = Anzahl verkaufter BUNDLES. Die tatsächlich abzubuchende
   * Menge je Bestandteil = BundlePosition.menge * dto.menge.
   */
  async bundleVerkaufBuchen(lizenznehmerId: string, dto: BundleVerkaufDto) {
    return this.withTenantContext(async (prisma) => {
      const zielLagerortId = await this.ermittleZielLagerort(prisma, lizenznehmerId, dto.lagerortId);

      const bundleArtikel = await prisma.artikel.findFirst({
        where: { id: dto.artikelId, lizenznehmerId },
      });

      if (!bundleArtikel) {
        throw new NotFoundException('Bundle-Artikel nicht gefunden.');
      }

      if (!bundleArtikel.istBundle) {
        throw new BadRequestException(
          `Artikel ${dto.artikelId} ist kein Bundle (istBundle = false).`,
        );
      }

      const bestandteile = await prisma.bundlePosition.findMany({
        where: { bundleArtikelId: dto.artikelId, lizenznehmerId },
      });

      if (bestandteile.length === 0) {
        throw new NotFoundException(
          `Für Bundle ${dto.artikelId} sind keine Bestandteile (BundlePosition) hinterlegt.`,
        );
      }

      // Erst-Durchlauf: alle Bestandteile prüfen, bevor irgendetwas abgebucht wird.
      const pruefungen = await Promise.all(
        bestandteile.map(async (position) => {
          const benoetigteMenge = Number(position.menge) * dto.menge;

          const aktuellerBestand = await prisma.lagerbestand.findFirst({
            where: {
              artikelId: position.bestandteilArtikelId,
              lagerortId: zielLagerortId,
              lizenznehmerId,
            },
          });

          const vorhandeneMenge = Number(aktuellerBestand?.menge ?? 0);

          return {
            artikelId: position.bestandteilArtikelId,
            benoetigteMenge,
            vorhandeneMenge,
            ausreichend: vorhandeneMenge >= benoetigteMenge,
          };
        }),
      );

      const unzureichend = pruefungen.filter((p) => !p.ausreichend);

      if (unzureichend.length > 0) {
        const details = unzureichend
          .map(
            (p) =>
              `Artikel ${p.artikelId}: vorhanden ${p.vorhandeneMenge}, benötigt ${p.benoetigteMenge}`,
          )
          .join('; ');
        throw new BadRequestException(
          `Nicht genug Bestand für Bundle-Verkauf (${dto.menge}x ${dto.artikelId}). ${details}.`,
        );
      }

      // Zweiter Durchlauf: tatsächlich abbuchen + protokollieren.
      for (const pruefung of pruefungen) {
        await prisma.lagerbestand.update({
          where: {
            artikelId_lagerortId: {
              artikelId: pruefung.artikelId,
              lagerortId: zielLagerortId,
            },
          },
          data: {
            menge: { decrement: pruefung.benoetigteMenge },
          },
        });

        await prisma.lagerbewegung.create({
          data: {
            lizenznehmerId,
            artikelId: pruefung.artikelId,
            lagerortId: zielLagerortId,
            typ: 'BUNDLE_ABBUCHUNG',
            menge: pruefung.benoetigteMenge,
            referenz: dto.referenz,
            bemerkung: dto.bemerkung ?? `Bundle-Verkauf: ${dto.artikelId} (${dto.menge}x)`,
          },
        });
      }

      return {
        bundleArtikelId: dto.artikelId,
        verkaufteMenge: dto.menge,
        abgebuchteBestandteile: pruefungen.map((p) => ({
          artikelId: p.artikelId,
          menge: p.benoetigteMenge,
        })),
      };
    });
  }

  /**
   * SICHERHEITSFIX (A60, 16.08.2026): Prüft, dass der übergebene Artikel
   * tatsächlich zum aufrufenden Lizenznehmer gehört, BEVOR er in einer
   * Lager-Buchung verwendet wird. Ohne diese Prüfung konnte ein Lizenznehmer
   * die artikelId eines fremden Lizenznehmers verwenden — der Filter auf
   * "lagerbestand"/"lagerbewegung" allein reicht nicht, weil die fremde
   * artikelId dort ganz neu (mit der EIGENEN lizenznehmerId) angelegt worden
   * wäre. Siehe Master-Dokument 3.6, Leck-Szenario 1 (vergessener Filter).
   */
  private async pruefeArtikelGehoertZuTenant(
    prisma: any,
    lizenznehmerId: string,
    artikelId: string,
  ) {
    const artikel = await prisma.artikel.findFirst({
      where: { id: artikelId, lizenznehmerId },
    });

    if (!artikel) {
      throw new NotFoundException(`Artikel ${artikelId} nicht gefunden.`);
    }
  }

  /**
   * Ermittelt den Ziel-Lagerort: übergebene lagerortId, sonst Standard-Lagerort.
   */
  private async ermittleZielLagerort(prisma: any, lizenznehmerId: string, lagerortId?: string) {
    if (lagerortId) {
      return lagerortId;
    }

    const standardLagerort = await prisma.lagerort.findFirst({
      where: { lizenznehmerId, istStandard: true },
    });

    if (!standardLagerort) {
      throw new NotFoundException(
        'Kein Standard-Lagerort für diesen Lizenznehmer angelegt.',
      );
    }

    return standardLagerort.id;
  }
}
