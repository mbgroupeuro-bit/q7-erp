// prisma/seed.ts
// Legt den ersten Lizenznehmer + ersten Benutzer an (Aufgabe 23).
// Aufruf: npx ts-node prisma/seed.ts
// (oder als npm-Skript einrichten, siehe Hinweis unten)

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  // --- 1. Test-Lizenznehmer anlegen ---
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

  // --- 2. Ersten Benutzer anlegen ---
  const klartextPasswort = 'Test1234!'; // NUR für lokalen Test — danach ändern
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
