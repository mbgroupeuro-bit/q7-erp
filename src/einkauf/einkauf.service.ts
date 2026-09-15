import { Injectable } from '@nestjs/common';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';

@Injectable()
export class EinkaufService extends PrismaTenantService {
  /**
   * A148: Deterministischer Schwellenwert-Check — liefert alle Artikel, bei
   * denen der aktuelle Gesamtbestand (über alle Lagerorte summiert) unter
   * dem hinterlegten mindestbestand liegt.
   *
   * Kein KI-Agent, keine Heuristik — reiner Zahlenvergleich (Admin-Prinzip,
   * siehe Master-Dokument 3.6-Analogie "deterministisches Prüfwerkzeug statt
   * KI-Überwachung", hier übertragen auf Einkauf: A150 baut später die
   * Agent-gestützte Bestellliste/Freigabe-Dialog DARAUF auf, dieser
   * Check selbst bleibt deterministisch).
   *
   * Nur Artikel mit gesetztem mindestbestand UND lagerrelevant = true
   * werden betrachtet — Artikel ohne Schwellenwert (mindestbestand = null)
   * werden bewusst nicht im Bestellvorschlag berücksichtigt (kein
   * automatisches Ableiten eines Schwellenwerts, keine Rateversuche).
   *
   * IDOR-Schutz: alle Abfragen laufen über lizenznehmerId-gefilterte
   * Tenant-Transaktion (Master-Dokument 3.6). Kein neues Leck-Szenario,
   * da nur gelesen wird (kein Schreibzugriff auf fremde Module-Tabellen,
   * konsistent mit bestehendem Muster in ArtikelService/LagerService, die
   * ebenfalls artikelübergreifend lesen).
   */
  async berechneBestellvorschlag(lizenznehmerId: string) {
    return this.withTenantContext(async (prisma) => {
      const relevanteArtikel = await prisma.artikel.findMany({
        where: {
          lizenznehmerId,
          lagerrelevant: true,
          mindestbestand: { not: null },
          status: 'AKTIV',
        },
      });

      if (relevanteArtikel.length === 0) {
        return [];
      }

      const artikelIds = relevanteArtikel.map((a) => a.id);

      // Bestand über ALLE Lagerorte hinweg summieren (aktuell i.d.R. nur
      // ein Standard-Lagerort pro Lizenznehmer, siehe schema.prisma-Kommentar
      // bei Lagerort — Aggregation macht die Logik trotzdem robust für
      // künftige Mehr-Standort-Nutzung, ohne dass diese Methode dann
      // erneut angefasst werden müsste).
      const bestaende = await prisma.lagerbestand.groupBy({
        by: ['artikelId'],
        where: { lizenznehmerId, artikelId: { in: artikelIds } },
        _sum: { menge: true },
      });
      const bestandMap = new Map(
        bestaende.map((b) => [b.artikelId, Number(b._sum.menge ?? 0)]),
      );

      // Hauptlieferant (prioritaet = 1) je betroffenem Artikel mitladen,
      // falls vorhanden — rein informativ für diesen ersten Vorschlag,
      // keine automatische Bestellauslösung (das ist A150).
      const hauptlieferanten = await prisma.artikelLieferant.findMany({
        where: { lizenznehmerId, artikelId: { in: artikelIds }, prioritaet: 1 },
      });
      const lieferantIds = [...new Set(hauptlieferanten.map((h) => h.lieferantId))];
      const lieferantPartner =
        lieferantIds.length > 0
          ? await prisma.partner.findMany({
              where: { id: { in: lieferantIds }, lizenznehmerId },
            })
          : [];
      const partnerMap = new Map(lieferantPartner.map((p) => [p.id, p]));
      const hauptlieferantMap = new Map(
        hauptlieferanten.map((h) => [h.artikelId, h]),
      );

      const vorschlaege = relevanteArtikel
        .map((artikel) => {
          const vorhandeneMenge = bestandMap.get(artikel.id) ?? 0;
          const schwelle = Number(artikel.mindestbestand);
          const fehlendeMenge = schwelle - vorhandeneMenge;

          if (fehlendeMenge <= 0) {
            return null;
          }

          const hauptlieferant = hauptlieferantMap.get(artikel.id);

          return {
            artikelId: artikel.id,
            artikelnummer: artikel.artikelnummer,
            artikelName: artikel.name,
            vorhandeneMenge,
            mindestbestand: schwelle,
            fehlendeMenge,
            einheit: artikel.einheit,
            hauptlieferantId: hauptlieferant?.lieferantId ?? null,
            hauptlieferantName: hauptlieferant
              ? (partnerMap.get(hauptlieferant.lieferantId)?.name ?? null)
              : null,
            einkaufspreis: hauptlieferant?.einkaufspreis ?? null,
            mindestbestellmenge: hauptlieferant?.mindestbestellmenge ?? null,
          };
        })
        .filter((v) => v !== null);

      return vorschlaege;
    });
  }
}
