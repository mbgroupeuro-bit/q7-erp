// a76-verbindung-b-anlegen.js
// Q7-ERP — A76: Legt einen NEUEN q7_verbindung-Datensatz für Lizenznehmer B
// an (existierte bisher nicht), mit bekanntem Klartext-Geheimnis, damit
// wir für den Mandantentrennung-Test eine gültige Signatur für B berechnen
// können — analog zu a75-geheimnis-setzen.js für Lizenznehmer A.
//
// webhookUrl wird auf einen Platzhalter gesetzt (nicht genutzt in A76,
// A76 testet nur die Lese-Endpunkte, keinen Webhook-Versand für B).
//
// Ausführen im Projektordner (D:\Projekt2027\ERP System):
//   node a76-verbindung-b-anlegen.js

require('dotenv/config');
const { Client } = require('pg');
const { createCipheriv, randomBytes, randomUUID } = require('node:crypto');

const ALGORITHMUS = 'aes-256-gcm';
const IV_LAENGE_BYTES = 12;

const LIZENZNEHMER_B_ID = '359c31e2-04af-4338-992c-7ee3f7d463fa';
const KLARTEXT_GEHEIMNIS_B = 'a76-test-geheimnis-b-2026';
const PLATZHALTER_WEBHOOK_URL = 'https://webhook.site/nicht-verwendet-a76';

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

  const gespeichertesFormat = verschluesseln(KLARTEXT_GEHEIMNIS_B, encryptionKey);
  const neueId = randomUUID();

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query('BEGIN');

    // RLS-Session-Variable setzen (Master-Dok 3.6) — wie bei A75.
    await client.query(`SELECT set_config('app.current_lizenznehmer_id', $1, true)`, [
      LIZENZNEHMER_B_ID,
    ]);

    const result = await client.query(
      `INSERT INTO q7_verbindung (id, "lizenznehmerId", "geteiltesGeheimnis", "webhookUrl", aktiv, "erstelltAm", "letzteRotation")
       VALUES ($1, $2, $3, $4, true, now(), now())
       ON CONFLICT ("lizenznehmerId") DO UPDATE
         SET "geteiltesGeheimnis" = EXCLUDED."geteiltesGeheimnis",
             "webhookUrl" = EXCLUDED."webhookUrl",
             aktiv = true`,
      [neueId, LIZENZNEHMER_B_ID, gespeichertesFormat, PLATZHALTER_WEBHOOK_URL],
    );

    await client.query('COMMIT');

    if (result.rowCount === 0) {
      console.error('WARNUNG: Kein Datensatz angelegt/aktualisiert.');
    } else {
      console.log('Q7-Verbindung für Lizenznehmer B erfolgreich angelegt.');
      console.log('Klartext-Geheimnis B (für A76-Test merken):', KLARTEXT_GEHEIMNIS_B);
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
