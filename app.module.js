"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const lizenznehmer_module_1 = require("./lizenznehmer/lizenznehmer.module");
const partner_module_1 = require("./partner/partner.module");
const artikel_module_1 = require("./artikel/artikel.module");
const konto_module_1 = require("./konto/konto.module");
const lager_module_1 = require("./lager/lager.module");
const q7_connector_module_1 = require("./connector/adapters/q7/q7-connector.module");
const verbindung_module_1 = require("./verbindung/verbindung.module");
const crm_kontakt_module_1 = require("./crm-kontakt/crm-kontakt.module");
const crm_aktivitaet_module_1 = require("./crm-aktivitaet/crm-aktivitaet.module");
const tenancy_middleware_1 = require("./common/tenancy/tenancy.middleware");
let AppModule = class AppModule {
    configure(consumer) {
        consumer
            .apply(tenancy_middleware_1.TenancyMiddleware)
            .exclude({ path: 'auth/login', method: common_1.RequestMethod.POST }, { path: 'auth/register', method: common_1.RequestMethod.POST }, { path: 'health', method: common_1.RequestMethod.GET }, { path: 'lizenznehmer', method: common_1.RequestMethod.POST }, { path: 'lizenznehmer', method: common_1.RequestMethod.GET }, { path: 'lizenznehmer/:id', method: common_1.RequestMethod.GET }, { path: 'lizenznehmer/:id', method: common_1.RequestMethod.PATCH }, { path: 'connector/q7/*', method: common_1.RequestMethod.ALL })
            .forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            event_emitter_1.EventEmitterModule.forRoot(),
            auth_module_1.AuthModule,
            lizenznehmer_module_1.LizenznehmerModule,
            partner_module_1.PartnerModule,
            artikel_module_1.ArtikelModule,
            konto_module_1.KontoModule,
            lager_module_1.LagerModule,
            q7_connector_module_1.Q7ConnectorModule,
            verbindung_module_1.VerbindungModule,
            crm_kontakt_module_1.CrmKontaktModule,
            crm_aktivitaet_module_1.CrmAktivitaetModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map