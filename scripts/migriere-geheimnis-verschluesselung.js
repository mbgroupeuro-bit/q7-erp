// scripts/migriere-geheimnis-verschluesselung.js
// EINMALIG AUSFÜHREN (Aufgabe 25) — verschlüsselt alle bestehenden,
// noch im Klartext gespeicherten Werte in q7_verbindung.geteiltesGeheimnis.
//
// Ausführung: node scripts/migriere-geheimnis-verschluesselung.js
// Voraussetzung: .env mit DATABASE_URL und ENCRYPTION_KEY muss existieren.
//
// Sicherheitshinweis: Läuft direkt gegen die DB, verändert Daten.
// Nur einmal ausführen — wenn ein Wert bereits verschlüsselt ist (enthält
// zwei ':'-Zeichen im erwarteten Format), wird er übersprungen, damit ein
// versehentliches zweites Ausführen nichts kaputt macht.

require('dotenv/config');
const { Client } = require('pg');
const { createCipheriv, randomBytes } = require('node:crypto');

const ALGORITHMUS = 'aes-256-gcm';
const IV_LAENGE_BYTES = 12;

function verschluesseln(klartext, schluesselHex) {
  const schluessel = Buffer.from(schluesselHex, 'hex');
  const iv = randomBytes(IV_LAENGE_BYTES);
  const cipher = createCipheriv(ALGORITHMUS, schluessel, iv);
  const verschluesselt = Buffer.concat([cipher.update(klartext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), verschluesselt.toString('hex')].join(':');
}

function siehtSchonVerschluesseltAus(wert) {
  const teile = wert.split(':');
  return (
    teile.length === 3 &&
    /^[0-9a-f]{24}$/i.test(teile[0]) && // IV: 12 Byte = 24 Hex-Zeichen
    /^[0-9a-f]{32}$/i.test(teile[1])    // AuthTag: 16 Byte = 32 Hex-Zeichen
  );
}

async function main() {
  const schluessel = process.env.ENCRYPTION_KEY;
  if (!schluessel || schluessel.length !== 64) {
    console.error('FEHLER: ENCRYPTION_KEY fehlt in .env oder hat nicht 64 Hex-Zeichen.');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const { rows } = await client.query('SELECT id, "geteiltesGeheimnis" FROM q7_verbindung');

  console.log(`Gefunden: ${rows.length} Datensatz/Datensätze.`);

  let migriert = 0;
  let uebersprungen = 0;

  for (const row of rows) {
    if (siehtSchonVerschluesseltAus(row.geteiltesGeheimnis)) {
      console.log(`  - ${row.id}: sieht bereits verschlüsselt aus, übersprungen.`);
      uebersprungen++;
      continue;
    }

    const neuerWert = verschluesseln(row.geteiltesGeheimnis, schluessel);
    await client.query('UPDATE q7_verbindung SET "geteiltesGeheimnis" = $1 WHERE id = $2', [
      neuerWert,
      row.id,
    ]);
    console.log(`  - ${row.id}: verschlüsselt und gespeichert.`);
    migriert++;
  }

  await client.end();

  console.log(`\nFertig. Migriert: ${migriert}, übersprungen (bereits verschlüsselt): ${uebersprungen}.`);
}

main().catch((error) => {
  console.error('Migration fehlgeschlagen:', error);
  process.exit(1);
});
