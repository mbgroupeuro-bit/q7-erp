// EINMALIGES ADMIN-SKRIPT — nach Nutzung löschen.
// Legt eine q7_verbindung für Lizenznehmer A an: generiert ein zufälliges
// Geheimnis, verschlüsselt es 1:1 wie verschluesselung.service.ts
// (AES-256-GCM, Format "iv:authTag:ciphertext"), fügt die Zeile ein.
//
// Verbindet bewusst als Superuser (nur für diesen einmaligen Insert),
// da RLS für q7erp_app sonst zusätzliche WITH-CHECK-Policies auf INSERT
// erfordern würde, die aktuell nicht bestätigt sind.
//
// Nutzung: In Projekt-Root speichern (D:\Projekt2027\ERP System\), dann:
//   node debug-q7verbindung-anlegen.js

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { randomUUID, randomBytes, createCipheriv } = require('node:crypto');

const LIZENZNEHMER_ID = 'ae3f627f-8f51-4ae7-afe0-3a9f0b72d85e'; // Lizenznehmer A

// Superuser-Verbindung — nur für diesen einmaligen Insert nötig, unabhängig
// vom aktuellen Stand der DATABASE_URL in .env.
const SUPERUSER_CONNECTION = 'postgresql://postgres:Q7ErpSuperuser2026%21@localhost:5432/q7erp';

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in werte)) werte[key] = value; // erstes Vorkommen gewinnt (wie dotenv)
  }
  return werte;
}

// --- Verschlüsselung — 1:1 identisch zu verschluesselung.service.ts ---
function verschluesseln(klartext, hexSchluessel) {
  const schluessel = Buffer.from(hexSchluessel, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', schluessel, iv);
  const verschluesselt = Buffer.concat([cipher.update(klartext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), verschluesselt.toString('hex')].join(':');
}

async function main() {
  const envPfad = path.join(__dirname, '.env');
  const env = ladeEnv(envPfad);

  if (!env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY nicht in .env gefunden.');
  }

  // Zufälliges Test-Geheimnis generieren (64 Hex-Zeichen = 32 Byte)
  const klartextGeheimnis = randomBytes(32).toString('hex');
  const verschluesseltesGeheimnis = verschluesseln(klartextGeheimnis, env.ENCRYPTION_KEY);

  const client = new Client({ connectionString: SUPERUSER_CONNECTION });
  await client.connect();

  try {
    const id = randomUUID();
    await client.query(
      `INSERT INTO q7_verbindung (id, "lizenznehmerId", "geteiltesGeheimnis", aktiv, "erstelltAm", "letzteRotation")
       VALUES ($1, $2, $3, true, NOW(), NOW())`,
      [id, LIZENZNEHMER_ID, verschluesseltesGeheimnis],
    );

    console.log('\n=== Q7-Verbindung angelegt (Lizenznehmer A) ===');
    console.log('Klartext-Geheimnis (für A71-Test verwenden):');
    console.log(klartextGeheimnis);
    console.log('================================================\n');
    console.log('WICHTIG: Dieses Skript danach löschen.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Fehler:', err.message);
  process.exit(1);
});
