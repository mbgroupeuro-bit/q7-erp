import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';
import { CreateArtikelDto } from './dto/create-artikel.dto';
import { UpdateArtikelDto } from './dto/update-artikel.dto';
import { CreateBundlePositionDto } from './dto/create-bundle-position.dto';
import { CreateBausteinGruppeDto } from './dto/create-baustein-gruppe.dto';
import { CreateBausteinOptionDto } from './dto/create-baustein-option.dto';
import { CreateKonfigurationsregelDto } from './dto/create-konfigurationsregel.dto';
import { CreateArtikelLieferantDto } from './dto/create-artikel-lieferant.dto';

@Injectable()
export class ArtikelService extends PrismaTenantService {
  /**
   * Legt einen neuen Artikel (Stufe 1, optional Stufe 3 via istBundle) für
   * den aktuellen Lizenznehmer an.
   */
  async create(lizenznehmerId: string, dto: CreateArtikelDto) {
    return this.withTenantContext(async (prisma) => {
      return prisma.artikel.create({
        data: {
          artikelnummer: dto.artikelnummer,
          name: dto.name,
          beschreibung: dto.beschreibung,
          grundpreis: dto.grundpreis,
          einheit: dto.einheit,
          elternArtikelId: dto.elternArtikelId,
          istBundle: dto.istBundle, // NEU (A62b) — bei undefined greift Prisma-Default (false)
          mindestbestand: dto.mindestbestand, // NEU (A148)
          lagerrelevant: dto.lagerrelevant, // NEU (A148) — bei undefined greift Prisma-Default (true)
          lizenznehmerId,
        },
      });
    });
  }

  /**
   * Holt alle Artikel des aktuellen Lizenznehmers.
   */
  async findAll(lizenznehmerId: string) {
    return this.withTenantContext(async (prisma) => {
      return prisma.artikel.findMany({
        where: {
          lizenznehmerId,
        },
      });
    });
  }

  /**
   * Holt einen einzelnen Artikel anhand seiner ID.
   * IDOR-Schutz: Filter auf id + lizenznehmerId (siehe Master-Dokument 3.6).
   */
  async findOne(lizenznehmerId: string, id: string) {
    return this.withTenantContext(async (prisma) => {
      const artikel = await prisma.artikel.findFirst({
        where: {
          id,
          lizenznehmerId,
        },
      });

      if (!artikel) {
        throw new NotFoundException(`Artikel mit ID "${id}" wurde nicht gefunden.`);
      }

      return artikel;
    });
  }

  /**
   * Aktualisiert einen bestehenden Artikel.
   * IDOR-Schutz: existierender Artikel wird zuerst über findOne geprüft
   * (id + lizenznehmerId), erst danach wird das Update ausgeführt.
   */
  async update(lizenznehmerId: string, id: string, dto: UpdateArtikelDto) {
    return this.withTenantContext(async (prisma) => {
      // Prüft Existenz + Zugehörigkeit zum Lizenznehmer, wirft sonst NotFoundException
      await this.findOne(lizenznehmerId, id);

      return prisma.artikel.update({
        where: { id },
        data: {
          artikelnummer: dto.artikelnummer,
          name: dto.name,
          beschreibung: dto.beschreibung,
          grundpreis: dto.grundpreis,
          einheit: dto.einheit,
          elternArtikelId: dto.elternArtikelId,
          istBundle: dto.istBundle, // NEU (A62b)
          istKonfigurierbar: dto.istKonfigurierbar, // NEU (A97-Bugfix, 19.08.2026): fehlte bisher,
                                                     // dadurch ging der Wert bei PATCH verloren
          mindestbestand: dto.mindestbestand, // NEU (A148)
          lagerrelevant: dto.lagerrelevant, // NEU (A148)
        },
      });
    });
  }

  /**
   * Soft-Delete: setzt status auf INAKTIV statt den Datensatz zu löschen.
   * Grund (Admin-Entscheidung, siehe A40): reversibel, keine
   * Fremdschlüssel-Konflikte mit Varianten/Bundles/Merkmalen.
   */
  async remove(lizenznehmerId: string, id: string) {
    return this.withTenantContext(async (prisma) => {
      // Prüft Existenz + Zugehörigkeit zum Lizenznehmer, wirft sonst NotFoundException
      await this.findOne(lizenznehmerId, id);

      return prisma.artikel.update({
        where: { id },
        data: {
          status: 'INAKTIV',
        },
      });
    });
  }

  /**
   * NEU (A62b, 16.08.2026): Fügt einem Bundle-Artikel (Stufe 3) eine
   * Stücklisten-Position (BundlePosition) hinzu.
   *
   * IDOR-Schutz: sowohl der Bundle-Artikel als auch der Bestandteil-Artikel
   * werden über findOne (id + lizenznehmerId) geprüft, bevor irgendetwas
   * angelegt wird (Master-Dokument 3.6).
   *
   * Fachliche Prüfung: der Ziel-Artikel muss bereits istBundle = true haben
   * (über update() mit { istBundle: true } vorher setzen) — sonst Ablehnung.
   */
  async addBundlePosition(
    lizenznehmerId: string,
    bundleArtikelId: string,
    dto: CreateBundlePositionDto,
  ) {
    return this.withTenantContext(async (prisma) => {
      const bundleArtikel = await this.findOne(lizenznehmerId, bundleArtikelId);

      if (!bundleArtikel.istBundle) {
        throw new BadRequestException(
          `Artikel ${bundleArtikelId} ist kein Bundle (istBundle = false). ` +
            `Erst über PATCH /artikel/${bundleArtikelId} mit { "istBundle": true } markieren.`,
        );
      }

      // Prüft Existenz + Zugehörigkeit zum Lizenznehmer, wirft sonst NotFoundException
      await this.findOne(lizenznehmerId, dto.bestandteilArtikelId);

      return prisma.bundlePosition.create({
        data: {
          lizenznehmerId,
          bundleArtikelId,
          bestandteilArtikelId: dto.bestandteilArtikelId,
          menge: dto.menge,
        },
      });
    });
  }

  /**
   * NEU (A93, 19.08.2026): Holt die Stücklisten-Positionen eines
   * Bundle-Artikels, angereichert um Name/Artikelnummer des jeweiligen
   * Bestandteil-Artikels (für die Anzeige im Dashboard).
   *
   * IDOR-Schutz: Bundle-Artikel wird über findOne (id + lizenznehmerId)
   * geprüft, bevor die Positionen geladen werden. Die Positionen selbst
   * werden zusätzlich mit lizenznehmerId gefiltert (zweites Schloss,
   * Master-Dokument 3.6).
   */
  async findBundlePositionen(lizenznehmerId: string, bundleArtikelId: string) {
    return this.withTenantContext(async (prisma) => {
      // Prüft Existenz + Zugehörigkeit zum Lizenznehmer, wirft sonst NotFoundException
      await this.findOne(lizenznehmerId, bundleArtikelId);

      const positionen = await prisma.bundlePosition.findMany({
        where: {
          bundleArtikelId,
          lizenznehmerId,
        },
      });

      if (positionen.length === 0) {
        return [];
      }

      const bestandteilIds = positionen.map((p) => p.bestandteilArtikelId);

      const bestandteile = await prisma.artikel.findMany({
        where: {
          id: { in: bestandteilIds },
          lizenznehmerId,
        },
      });

      const bestandteilMap = new Map(bestandteile.map((a) => [a.id, a]));

      return positionen.map((p) => ({
        id: p.id,
        bestandteilArtikelId: p.bestandteilArtikelId,
        menge: p.menge,
        bestandteilArtikelnummer: bestandteilMap.get(p.bestandteilArtikelId)?.artikelnummer ?? null,
        bestandteilName: bestandteilMap.get(p.bestandteilArtikelId)?.name ?? null,
      }));
    });
  }

  /**
   * NEU (A119, 23.08.2026): Entfernt eine einzelne Stücklisten-Position
   * aus einem Bundle-Artikel.
   *
   * IDOR-Schutz: Bundle-Artikel wird über findOne (id + lizenznehmerId)
   * geprüft. Die Position selbst wird zusätzlich mit bundleArtikelId +
   * lizenznehmerId gefiltert gesucht, bevor sie gelöscht wird (zweites
   * Schloss, Master-Dokument 3.6) — verhindert, dass über eine fremde
   * positionId eine Position eines anderen Bundles/Lizenznehmers
   * gelöscht werden kann.
   */
  async removeBundlePosition(
    lizenznehmerId: string,
    bundleArtikelId: string,
    positionId: string,
  ) {
    return this.withTenantContext(async (prisma) => {
      // Prüft Existenz + Zugehörigkeit des Bundle-Artikels, wirft sonst NotFoundException
      await this.findOne(lizenznehmerId, bundleArtikelId);

      const position = await prisma.bundlePosition.findFirst({
        where: {
          id: positionId,
          bundleArtikelId,
          lizenznehmerId,
        },
      });

      if (!position) {
        throw new NotFoundException(
          `Bundle-Position mit ID "${positionId}" wurde für diesen Artikel nicht gefunden.`,
        );
      }

      return prisma.bundlePosition.delete({
        where: { id: positionId },
      });
    });
  }

  /**
   * NEU (A96a): Fügt einem konfigurierbaren Artikel (Stufe 4) eine
   * Baustein-Gruppe hinzu.
   *
   * IDOR-Schutz: Artikel wird über findOne (id + lizenznehmerId) geprüft,
   * bevor irgendetwas angelegt wird (Master-Dokument 3.6).
   *
   * Fachliche Prüfung: der Artikel muss bereits istKonfigurierbar = true
   * haben (über update() mit { istKonfigurierbar: true } vorher setzen) —
   * sonst Ablehnung. Analog zur istBundle-Prüfung bei Bundle-Positionen.
   */
  async addBausteinGruppe(
    lizenznehmerId: string,
    artikelId: string,
    dto: CreateBausteinGruppeDto,
  ) {
    return this.withTenantContext(async (prisma) => {
      const artikel = await this.findOne(lizenznehmerId, artikelId);

      if (!artikel.istKonfigurierbar) {
        throw new BadRequestException(
          `Artikel ${artikelId} ist nicht konfigurierbar (istKonfigurierbar = false). ` +
            `Erst über PATCH /artikel/${artikelId} mit { "istKonfigurierbar": true } markieren.`,
        );
      }

      return prisma.bausteinGruppe.create({
        data: {
          lizenznehmerId,
          artikelId,
          gruppenName: dto.gruppenName,
          pflichtfeld: dto.pflichtfeld,
        },
      });
    });
  }

  /**
   * NEU (A96a): Holt die Baustein-Gruppen eines konfigurierbaren Artikels
   * für die Anzeige im Dashboard.
   *
   * IDOR-Schutz: Artikel wird über findOne (id + lizenznehmerId) geprüft,
   * bevor die Gruppen geladen werden. Die Gruppen selbst werden zusätzlich
   * mit lizenznehmerId gefiltert (zweites Schloss, Master-Dokument 3.6).
   */
  async findBausteinGruppen(lizenznehmerId: string, artikelId: string) {
    return this.withTenantContext(async (prisma) => {
      await this.findOne(lizenznehmerId, artikelId);

      return prisma.bausteinGruppe.findMany({
        where: {
          artikelId,
          lizenznehmerId,
        },
      });
    });
  }

  /**
   * Interner Hilfsmethode (A97): Prüft Existenz + Zugehörigkeit einer
   * Baustein-Gruppe zum aktuellen Lizenznehmer (IDOR-Schutz, analog
   * findOne bei Artikel). Nicht öffentlich über den Controller erreichbar.
   */
  private async findBausteinGruppeOderWirf(
    prisma: any,
    lizenznehmerId: string,
    gruppeId: string,
  ) {
    const gruppe = await prisma.bausteinGruppe.findFirst({
      where: {
        id: gruppeId,
        lizenznehmerId,
      },
    });

    if (!gruppe) {
      throw new NotFoundException(`Baustein-Gruppe mit ID "${gruppeId}" wurde nicht gefunden.`);
    }

    return gruppe;
  }

  /**
   * NEU (A97): Fügt einer Baustein-Gruppe (Stufe 4) eine Baustein-Option
   * hinzu (z.B. Gruppe "Breite" → Option "120cm").
   *
   * IDOR-Schutz: Baustein-Gruppe wird über findBausteinGruppeOderWirf
   * (id + lizenznehmerId) geprüft, bevor die Option angelegt wird
   * (Master-Dokument 3.6).
   */
  async addBausteinOption(
    lizenznehmerId: string,
    gruppeId: string,
    dto: CreateBausteinOptionDto,
  ) {
    return this.withTenantContext(async (prisma) => {
      await this.findBausteinGruppeOderWirf(prisma, lizenznehmerId, gruppeId);

      return prisma.bausteinOption.create({
        data: {
          lizenznehmerId,
          gruppeId,
          optionsName: dto.optionsName,
          preisaufschlag: dto.preisaufschlag,
        },
      });
    });
  }

  /**
   * NEU (A97): Holt die Baustein-Optionen einer Baustein-Gruppe für die
   * Anzeige im Dashboard.
   *
   * IDOR-Schutz: Baustein-Gruppe wird über findBausteinGruppeOderWirf
   * (id + lizenznehmerId) geprüft, bevor die Optionen geladen werden. Die
   * Optionen selbst werden zusätzlich mit lizenznehmerId gefiltert
   * (zweites Schloss, Master-Dokument 3.6).
   */
  async findBausteinOptionen(lizenznehmerId: string, gruppeId: string) {
    return this.withTenantContext(async (prisma) => {
      await this.findBausteinGruppeOderWirf(prisma, lizenznehmerId, gruppeId);

      return prisma.bausteinOption.findMany({
        where: {
          gruppeId,
          lizenznehmerId,
        },
      });
    });
  }

  /**
   * Interne Hilfsmethode (A98): Prüft Existenz + Zugehörigkeit einer
   * Baustein-Option zum aktuellen Lizenznehmer (IDOR-Schutz, analog
   * findBausteinGruppeOderWirf). Nicht öffentlich über den Controller
   * erreichbar.
   */
  private async findBausteinOptionOderWirf(
    prisma: any,
    lizenznehmerId: string,
    optionId: string,
  ) {
    const option = await prisma.bausteinOption.findFirst({
      where: {
        id: optionId,
        lizenznehmerId,
      },
    });

    if (!option) {
      throw new NotFoundException(`Baustein-Option mit ID "${optionId}" wurde nicht gefunden.`);
    }

    return option;
  }

  /**
   * NEU (A98): Legt eine Konfigurationsregel an — "wenn wennOptionId
   * gewählt wird, ist dannAusschlussOptionId ausgeschlossen".
   *
   * IDOR-Schutz: sowohl wenn-Option als auch Ausschluss-Option werden über
   * findBausteinOptionOderWirf (id + lizenznehmerId) geprüft, bevor die
   * Regel angelegt wird (Master-Dokument 3.6).
   *
   * Fachliche Prüfung: eine Option darf sich nicht selbst ausschließen.
   */
  async addKonfigurationsregel(
    lizenznehmerId: string,
    wennOptionId: string,
    dto: CreateKonfigurationsregelDto,
  ) {
    return this.withTenantContext(async (prisma) => {
      await this.findBausteinOptionOderWirf(prisma, lizenznehmerId, wennOptionId);
      await this.findBausteinOptionOderWirf(prisma, lizenznehmerId, dto.dannAusschlussOptionId);

      if (wennOptionId === dto.dannAusschlussOptionId) {
        throw new BadRequestException(
          'Eine Baustein-Option kann sich nicht selbst ausschließen (wennOptionId === dannAusschlussOptionId).',
        );
      }

      return prisma.konfigurationsregel.create({
        data: {
          lizenznehmerId,
          wennOptionId,
          dannAusschlussOptionId: dto.dannAusschlussOptionId,
        },
      });
    });
  }

  /**
   * NEU (A98): Holt die Konfigurationsregeln zu einer wenn-Option,
   * angereichert um den Namen der jeweiligen Ausschluss-Option (für die
   * Anzeige im Dashboard).
   *
   * IDOR-Schutz: wenn-Option wird über findBausteinOptionOderWirf
   * (id + lizenznehmerId) geprüft, bevor die Regeln geladen werden. Die
   * Regeln selbst werden zusätzlich mit lizenznehmerId gefiltert (zweites
   * Schloss, Master-Dokument 3.6).
   */
  async findKonfigurationsregeln(lizenznehmerId: string, wennOptionId: string) {
    return this.withTenantContext(async (prisma) => {
      await this.findBausteinOptionOderWirf(prisma, lizenznehmerId, wennOptionId);

      const regeln = await prisma.konfigurationsregel.findMany({
        where: {
          wennOptionId,
          lizenznehmerId,
        },
      });

      if (regeln.length === 0) {
        return [];
      }

      const ausschlussIds = regeln.map((r) => r.dannAusschlussOptionId);

      const ausschlussOptionen = await prisma.bausteinOption.findMany({
        where: {
          id: { in: ausschlussIds },
          lizenznehmerId,
        },
      });

      const optionMap = new Map(ausschlussOptionen.map((o) => [o.id, o]));

      return regeln.map((r) => ({
        id: r.id,
        dannAusschlussOptionId: r.dannAusschlussOptionId,
        dannAusschlussOptionsName: optionMap.get(r.dannAusschlussOptionId)?.optionsName ?? null,
      }));
    });
  }

  /**
   * NEU (A148, 29.08.2026): Ordnet einem Artikel eine Bezugsquelle
   * (Lieferant) mit Priorität, Einkaufspreis und freien Konditionen-Notizen
   * zu. Ein Artikel kann mehrere Lieferanten haben (prioritaet 1 = Haupt-
   * lieferant, 2 = zweite Bezugsquelle usw.) — Grundlage für den späteren
   * Bestellvorschlag (Einkauf-Modul) und Preisvergleich.
   *
   * IDOR-Schutz: Artikel wird über findOne (id + lizenznehmerId) geprüft.
   * Lieferant (Partner) wird ebenfalls über findFirst mit lizenznehmerId
   * geprüft (Master-Dokument 3.6) — verhindert Zuordnung eines fremden
   * Partners.
   *
   * Fachliche Prüfung: der zugeordnete Partner muss typ LIEFERANT oder
   * BEIDES haben — ein reiner KUNDE kann nicht als Bezugsquelle dienen.
   */
  async addArtikelLieferant(
    lizenznehmerId: string,
    artikelId: string,
    dto: CreateArtikelLieferantDto,
  ) {
    return this.withTenantContext(async (prisma) => {
      // Prüft Existenz + Zugehörigkeit des Artikels, wirft sonst NotFoundException
      await this.findOne(lizenznehmerId, artikelId);

      const lieferant = await prisma.partner.findFirst({
        where: { id: dto.lieferantId, lizenznehmerId },
      });

      if (!lieferant) {
        throw new NotFoundException(`Partner mit ID "${dto.lieferantId}" wurde nicht gefunden.`);
      }

      if (lieferant.typ !== 'LIEFERANT' && lieferant.typ !== 'BEIDES') {
        throw new BadRequestException(
          `Partner "${lieferant.name}" hat typ "${lieferant.typ}" — nur LIEFERANT oder BEIDES ` +
            `können als Bezugsquelle zugeordnet werden.`,
        );
      }

      return prisma.artikelLieferant.create({
        data: {
          lizenznehmerId,
          artikelId,
          lieferantId: dto.lieferantId,
          prioritaet: dto.prioritaet,
          einkaufspreis: dto.einkaufspreis,
          mindestbestellmenge: dto.mindestbestellmenge,
          bemerkung: dto.bemerkung,
        },
      });
    });
  }

  /**
   * NEU (A148): Holt alle Bezugsquellen eines Artikels, sortiert nach
   * Priorität (1 = Hauptlieferant zuerst), angereichert um den Namen des
   * jeweiligen Lieferanten (für die Anzeige im Dashboard).
   *
   * IDOR-Schutz: Artikel wird über findOne (id + lizenznehmerId) geprüft,
   * bevor die Zuordnungen geladen werden. Die Zuordnungen selbst werden
   * zusätzlich mit lizenznehmerId gefiltert (zweites Schloss, 3.6).
   */
  async findArtikelLieferanten(lizenznehmerId: string, artikelId: string) {
    return this.withTenantContext(async (prisma) => {
      await this.findOne(lizenznehmerId, artikelId);

      const zuordnungen = await prisma.artikelLieferant.findMany({
        where: { artikelId, lizenznehmerId },
        orderBy: { prioritaet: 'asc' },
      });

      if (zuordnungen.length === 0) {
        return [];
      }

      const lieferantIds = [...new Set(zuordnungen.map((z) => z.lieferantId))];
      const lieferanten = await prisma.partner.findMany({
        where: { id: { in: lieferantIds }, lizenznehmerId },
      });
      const lieferantMap = new Map(lieferanten.map((l) => [l.id, l]));

      return zuordnungen.map((z) => ({
        id: z.id,
        lieferantId: z.lieferantId,
        lieferantName: lieferantMap.get(z.lieferantId)?.name ?? null,
        prioritaet: z.prioritaet,
        einkaufspreis: z.einkaufspreis,
        mindestbestellmenge: z.mindestbestellmenge,
        bemerkung: z.bemerkung,
      }));
    });
  }

  /**
   * NEU (A148): Entfernt eine einzelne Lieferanten-Zuordnung von einem
   * Artikel. IDOR-Schutz analog removeBundlePosition: Artikel wird über
   * findOne geprüft, die Zuordnung selbst zusätzlich mit artikelId +
   * lizenznehmerId gefiltert gesucht (3.6).
   */
  async removeArtikelLieferant(lizenznehmerId: string, artikelId: string, eintragId: string) {
    return this.withTenantContext(async (prisma) => {
      await this.findOne(lizenznehmerId, artikelId);

      const eintrag = await prisma.artikelLieferant.findFirst({
        where: { id: eintragId, artikelId, lizenznehmerId },
      });

      if (!eintrag) {
        throw new NotFoundException(
          `Lieferanten-Zuordnung mit ID "${eintragId}" wurde für diesen Artikel nicht gefunden.`,
        );
      }

      return prisma.artikelLieferant.delete({ where: { id: eintragId } });
    });
  }
}
