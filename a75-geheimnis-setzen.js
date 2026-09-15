// a75-geheimnis-setzen.js
// Setzt ein NEUES, BEKANNTES Klartext-Geheimnis für die Q7-Verbindung von
// Lizenznehmer A, verschlüsselt exakt wie VerschluesselungService
// (AES-256-GCM, Format "iv:authTag:ciphertext", alle hex).
//
// Zweck: Für A75 (Gesamttest Connector) muss das Klartext-Geheimnis
// bekannt sein, um damit im Testskript eine gültige Signatur zu berechnen.
//
// Ausführen im Projektordner (D:\Projekt2027\ERP System):
//   node a75-geheimnis-setzen.js
//
// Voraussetzung: DATABASE_URL in .env zeigt auf die echte DB (normaler
// q7erp_app-Nutzer reicht, kein Superuser nötig — reines UPDATE, keine
// Schema-Änderung).

require('dotenv/config');
const { Client } = require('pg');
const { createCipheriv, randomBytes } = require('node:crypto');

const ALGORITHMUS = 'aes-256-gcm';
const IV_LAENGE_BYTES = 12;

const LIZENZNEHMER_A_ID = 'ae3f627f-8f51-4ae7-afe0-3a9f0b72d85e';

// Das neue Klartext-Geheimnis — für A75 einfach zu merken.
const KLARTEXT_GEHEIMNIS = 'a75-test-geheimnis-2026';

function verschluesseln(klartext, schluesselHex) {
  const schluessel = Buffer.from(schluesselHex, 'hex');
  const iv = randomBytes(IV_LAENGE_BYTES);
  const cipher = createCipheriv(ALGORITHMUS, schluessel, iv);

  const verschluesselt = Buffer.concat([
    cipher.update(klartext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('hex'), authTag.toString('hex'), verschluesselt.toString('hex')].join(':');
}

async function main() {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length !== 64) {
    throw new Error('ENCRYPTION_KEY fehlt oder hat nicht 64 Hex-Zeichen.');
  }

  const gespeichertesFormat = verschluesseln(KLARTEXT_GEHEIMNIS, encryptionKey);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Explizite Transaktion, da set_config(..., local=true) nur innerhalb
    // einer Transaktion gilt — ohne BEGIN würde die Session-Variable nach
    // der ersten Query wieder verschwinden.
    await client.query('BEGIN');

    // RLS-Session-Variable setzen (Master-Dok 3.6) — ohne diese lässt die
    // Policy tenant_isolation_q7_verbindung das UPDATE lautlos ins Leere
    // laufen (0 betroffene Zeilen, kein Fehler).
    await client.query(`SELECT set_config('app.current_lizenznehmer_id', $1, true)`, [
      LIZENZNEHMER_A_ID,
    ]);

    const result = await client.query(
      `UPDATE q7_verbindung SET "geteiltesGeheimnis" = $1 WHERE "lizenznehmerId" = $2`,
      [gespeichertesFormat, LIZENZNEHMER_A_ID],
    );

    await client.query('COMMIT');

    if (result.rowCount === 0) {
      console.error('WARNUNG: Kein Datensatz aktualisiert — existiert q7_verbindung für Lizenznehmer A?');
    } else {
      console.log('Geheimnis erfolgreich gesetzt.');
      console.log('Klartext-Geheimnis (für A75-Test merken):', KLARTEXT_GEHEIMNIS);
    }
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Fehler:', e);
  process.exit(1);
});
