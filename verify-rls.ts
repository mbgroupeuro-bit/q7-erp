// verify-rls.ts
// Prüft NACH Ausführung von 001_rls_policies.sql, ob die Mandantentrennung wirklich greift.
// Läuft unabhängig vom NestJS-Server, direkt gegen die DB, mit dem eingeschränkten App-User.
// Aufruf: npx ts-node verify-rls.ts

import 'dotenv/config';
import { Client } from 'pg';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('Verbunden mit DB als App-User (kein Superuser).\n');

  // --- 1. Zwei Test-Lizenznehmer + je einen Benutzer anlegen ---
  const lizA = await client.query(
    `INSERT INTO "lizenznehmer" (id, name, "erstelltAm", "aktualisiertAm")
     VALUES (gen_random_uuid(), 'RLS-Test A', now(), now()) RETURNING id`,
  );
  const lizB = await client.query(
    `INSERT INTO "lizenznehmer" (id, name, "erstelltAm", "aktualisiertAm")
     VALUES (gen_random_uuid(), 'RLS-Test B', now(), now()) RETURNING id`,
  );
  const lizAId = lizA.rows[0].id;
  const lizBId = lizB.rows[0].id;
  console.log('Lizenznehmer A:', lizAId);
  console.log('Lizenznehmer B:', lizBId);

  // Benutzer für A anlegen — dabei Session-Variable auf A setzen (WITH CHECK erlaubt es)
  await client.query(`SELECT set_config('app.current_lizenznehmer_id', $1, false)`, [lizAId]);
  await client.query(
    `INSERT INTO "benutzer" (id, "lizenznehmerId", email, "passwortHash", "erstelltAm")
     VALUES (gen_random_uuid(), $1, 'rlstest-a@test.de', 'x', now())`,
    [lizAId],
  );

  // Benutzer für B anlegen — Session-Variable auf B umschalten
  await client.query(`SELECT set_config('app.current_lizenznehmer_id', $1, false)`, [lizBId]);
  await client.query(
    `INSERT INTO "benutzer" (id, "lizenznehmerId", email, "passwortHash", "erstelltAm")
     VALUES (gen_random_uuid(), $1, 'rlstest-b@test.de', 'x', now())`,
    [lizBId],
  );

  console.log('\nTest-Benutzer für A und B angelegt.\n');

  // --- 2. Kernfrage: Session auf A stellen, versuchen B-Daten zu sehen ---
  await client.query(`SELECT set_config('app.current_lizenznehmer_id', $1, false)`, [lizAId]);
  const sichtbarAlsA = await client.query(`SELECT email, "lizenznehmerId" FROM "benutzer"`);

  console.log('Sichtbare Benutzer, während Session-Variable auf A steht:');
  console.table(sichtbarAlsA.rows);

  const siehtFremdeDaten = sichtbarAlsA.rows.some((r) => r.lizenznehmerId === lizBId);

  if (siehtFremdeDaten) {
    console.error('\n❌ FEHLGESCHLAGEN: Lizenznehmer A sieht Daten von B! RLS greift NICHT.');
  } else if (sichtbarAlsA.rows.length === 0) {
    console.error('\n⚠️  Kein Ergebnis — evtl. Session-Variable falsch gesetzt oder Policy zu streng geprüft.');
  } else {
    console.log('\n✅ ERFOLGREICH: Lizenznehmer A sieht ausschließlich eigene Daten. RLS greift.');
  }

  // --- 3. Aufräumen ---
  await client.query(`SELECT set_config('app.current_lizenznehmer_id', $1, false)`, [lizAId]);
  await client.query(`DELETE FROM "benutzer" WHERE "lizenznehmerId" = $1`, [lizAId]);
  await client.query(`SELECT set_config('app.current_lizenznehmer_id', $1, false)`, [lizBId]);
  await client.query(`DELETE FROM "benutzer" WHERE "lizenznehmerId" = $1`, [lizBId]);
  await client.query(`DELETE FROM "lizenznehmer" WHERE id IN ($1, $2)`, [lizAId, lizBId]);

  console.log('\nTestdaten aufgeräumt.');

  await client.end();
}

main().catch((e) => {
  console.error('Fehler beim RLS-Verifikationstest:', e);
  process.exit(1);
});
