"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcrypt = __importStar(require("bcrypt"));
async function main() {
    const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
    const prisma = new client_1.PrismaClient({ adapter });
    const lizenznehmer = await prisma.lizenznehmer.create({
        data: {
            name: 'Test GmbH',
            rechtsform: 'GmbH',
            lizenzstufe: 'SMALL',
            status: 'AKTIV',
            sicherheitsEmail: 'sicherheit@test-gmbh.de',
        },
    });
    console.log('Lizenznehmer angelegt:', lizenznehmer.id, lizenznehmer.name);
    const klartextPasswort = 'Test1234!';
    const passwortHash = await bcrypt.hash(klartextPasswort, 10);
    const benutzer = await prisma.benutzer.create({
        data: {
            lizenznehmerId: lizenznehmer.id,
            email: 'admin@test-gmbh.de',
            passwortHash,
            status: 'AKTIV',
        },
    });
    console.log('Benutzer angelegt:', benutzer.id, benutzer.email);
    console.log('\n--- Login-Testdaten ---');
    console.log('E-Mail:    admin@test-gmbh.de');
    console.log('Passwort:  Test1234!');
    console.log('LizenznehmerId:', lizenznehmer.id);
    await prisma.$disconnect();
}
main().catch(async (e) => {
    console.error('Fehler beim Seeden:', e);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map