// EINMALIGES DEBUG-SKRIPT — nach Nutzung löschen.
// Liest q7_verbindung.geteiltesGeheimnis für Lizenznehmer A und entschlüsselt
// es mit derselben Logik wie verschluesselung.service.ts (AES-256-GCM,
// Format "iv:authTag:ciphertext").
//
// Nutzung: In Projekt-Root speichern (D:\Projekt2027\ERP System\), dann:
//   node debug-geheimnis-entschluesseln.js
//
// Voraussetzung: .env liegt im selben Ordner, enthält DATABASE_URL und
// ENCRYPTION_KEY (dieselben Werte, die die App zur Laufzeit nutzt).

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { createDecipheriv } = require('node:crypto');

const LIZENZNEHMER_ID = 'ae3f627f-8f51-4ae7-afe0-3a9f0b72d85e'; // Lizenznehmer A

// --- .env minimal selbst parsen (keine Zusatz-Abhängigkeit nötig) ---
function ladeEnv(envPfad) {
  const inhalt = fs.readFileSync(envPfad, 'utf8');
  const werte = {};
  for (const zeile of inhalt.split('\n')) {
    const getrimmt = zeile.trim();
    if (!getrimmt || getrimmt.startsWith('#')) continue;
    const gleichheitIndex = getrimmt.indexOf('=');
    if (gleichheitIndex === -1) continue;
    const key = getrimmt.slice(0, gleichheitIndex).trim();
    let value = getrimmt.slice(gleichheitIndex + 1).trim();
    // Anführungszeichen entfernen, falls vorhanden
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    werte[key] = value;
  }
  return werte;
}

// --- Entschlüsselung — 1:1 identisch zu verschluesselung.service.ts ---
function entschluesseln(gespeichertesFormat, hexSchluessel) {
  const schluessel = Buffer.from(hexSchluessel, 'hex');
  const teile = gespeichertesFormat.split(':');
  if (teile.length !== 3) {
    throw new Error('Unerwartetes Format — nicht mit diesem Verfahren verschlüsselt?');
  }
  const [ivHex, authTagHex, ciphertextHex] = teile;

  const decipher = createDecipheriv('aes-256-gcm', schluessel, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  const entschluesselt = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final(),
  ]);

  return entschluesselt.toString('utf8');
}

async function main() {
  const envPfad = path.join(__dirname, '.env');
  const env = ladeEnv(envPfad);

  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL nicht in .env gefunden.');
  }
  if (!env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY nicht in .env gefunden.');
  }

  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  try {
    // Session-Variable setzen, damit RLS diese Zeile für q7erp_app durchlässt
    // (siehe Master-Dok 3.6 / Übergabeprotokoll: app.current_lizenznehmer_id)
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_lizenznehmer_id = '${LIZENZNEHMER_ID}'`);

    const ergebnis = await client.query(
      'SELECT "geteiltesGeheimnis" FROM q7_verbindung WHERE "lizenznehmerId" = $1',
      [LIZENZNEHMER_ID],
    );

    await client.query('COMMIT');

    if (ergebnis.rows.length === 0) {
      console.log('Keine q7_verbindung für diesen Lizenznehmer gefunden.');
      console.log('Mögliche Ursachen: Verbindung existiert nicht, oder RLS blockiert weiterhin (Session-Variable falsch benannt?).');
      return;
    }

    const verschluesseltesGeheimnis = ergebnis.rows[0].geteiltesGeheimnis;
    const klartext = entschluesseln(verschluesseltesGeheimnis, env.ENCRYPTION_KEY);

    console.log('\n=== Entschlüsseltes Geheimnis (Lizenznehmer A) ===');
    console.log(klartext);
    console.log('===================================================\n');
    console.log('WICHTIG: Dieses Skript danach löschen (enthält keine Geheimnisse im Code selbst, aber Zweck ist einmalig).');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Fehler:', err.message);
  process.exit(1);
});
