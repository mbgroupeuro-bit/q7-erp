import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter'; // NEU (A73)
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { LizenznehmerModule } from './lizenznehmer/lizenznehmer.module';
import { PartnerModule } from './partner/partner.module';
import { ArtikelModule } from './artikel/artikel.module';
import { KontoModule } from './konto/konto.module';
import { LagerModule } from './lager/lager.module';
import { Q7ConnectorModule } from './connector/adapters/q7/q7-connector.module'; // NEU (A74)
import { VerbindungModule } from './verbindung/verbindung.module'; // NEU (A109)
import { CrmKontaktModule } from './crm-kontakt/crm-kontakt.module'; // NEU (A121)
import { CrmAktivitaetModule } from './crm-aktivitaet/crm-aktivitaet.module'; // NEU (A125)
import { CrmWiedervorlageModule } from './crm-wiedervorlage/crm-wiedervorlage.module'; // NEU (A126)
import { CrmAngebotModule } from './crm-angebot/crm-angebot.module'; // NEU (A128)
import { MitarbeiterModule } from './mitarbeiter/mitarbeiter.module'; // NEU (A134)
import { ZeiterfassungModule } from './zeiterfassung/zeiterfassung.module'; // NEU (A138)
import { VorschussModule } from './vorschuss/vorschuss.module'; // NEU (A140)
import { EinkaufModule } from './einkauf/einkauf.module'; // NEU (A148)
import { TenancyMiddleware } from './common/tenancy/tenancy.middleware';

@Module({
  imports: [
    // NEU (A73): EventEmitterModule.forRoot() registriert das Modul global
    // (intern @Global()) — EventEmitter2 ist danach in JEDEM Service per
    // Dependency Injection nutzbar, ohne dass einzelne Fach-Module
    // (PartnerModule, ArtikelModule, ...) EventEmitterModule selbst
    // importieren müssen.
    EventEmitterModule.forRoot(),
    AuthModule,
    LizenznehmerModule,
    PartnerModule,
    ArtikelModule,
    KontoModule,
    LagerModule,
    // NEU (A74): verdrahtet Q7Adapter + PartnerWebhookListener, siehe
    // q7-connector.module.ts für Details.
    Q7ConnectorModule,
    // NEU (A109): Verbindungsstatus-Endpunkt für Q7-Verbindung — läuft
    // normal durch TenancyMiddleware (Standard-Tenant-Pattern wie
    // KontoModule/LagerModule), kein Exclude-Eintrag nötig.
    VerbindungModule,
    // NEU (A121): CrmKontakt-Endpunkte — läuft normal durch TenancyMiddleware
    // (Standard-Tenant-Pattern wie KontoModule/LagerModule), kein Exclude nötig.
    CrmKontaktModule,
    // NEU (A125): CrmAktivitaet-Endpunkte — läuft normal durch TenancyMiddleware.
    CrmAktivitaetModule,
    // NEU (A126): CrmWiedervorlage-Endpunkte — läuft normal durch TenancyMiddleware.
    CrmWiedervorlageModule,
    // NEU (A128): CrmAngebot-Endpunkte — läuft normal durch TenancyMiddleware.
    CrmAngebotModule,
    // NEU (A134): Mitarbeiter-Stammdaten-Endpunkte — läuft normal durch
    // TenancyMiddleware (Standard-Tenant-Pattern wie KontoModule/CRM-Module),
    // kein Exclude-Eintrag nötig.
    MitarbeiterModule,
    // NEU (A138): Zeiterfassung-Endpunkte (Arbeitstage) — läuft normal
    // durch TenancyMiddleware, kein Exclude-Eintrag nötig.
    ZeiterfassungModule,
    // NEU (A140): Vorschuss-Endpunkte — läuft normal durch TenancyMiddleware,
    // kein Exclude-Eintrag nötig.
    VorschussModule,
    // NEU (A148): Einkauf-Endpunkte (Bestellvorschlag) — läuft normal durch
    // TenancyMiddleware, kein Exclude-Eintrag nötig.
    EinkaufModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenancyMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'health', method: RequestMethod.GET },
        { path: 'lizenznehmer', method: RequestMethod.POST },
        { path: 'lizenznehmer', method: RequestMethod.GET },
        { path: 'lizenznehmer/:id', method: RequestMethod.GET },
        { path: 'lizenznehmer/:id', method: RequestMethod.PATCH },
        // NEU (A71) – Q7-Connector-Endpunkte laufen NICHT durch TenancyMiddleware
        // (die JWT verlangt), sondern durch Q7ConnectorTuersteherMiddleware
        // (modul-lokal in artikel.module.ts / partner.module.ts), die per
        // Signatur-Header prüft und lizenznehmerId selbst in den Tenancy-
        // Kontext schreibt. Wildcard deckt automatisch alle künftigen
        // Q7-Connector-Routen ab (A73 ff.), ohne dass hier bei jedem neuen
        // Endpunkt eine Zeile ergänzt werden muss.
        // Getestet gegen @nestjs/common@11.1.28 / Express 5 (path-to-regexp):
        // '*'-Syntax funktioniert weiterhin, Modul-Init wirft keinen Fehler.
        { path: 'connector/q7/*', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
