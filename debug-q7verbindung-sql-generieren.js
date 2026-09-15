// EINMALIGES SKRIPT — keine DB-Verbindung nötig, nur Verschlüsselung.
// Gibt eine fertige INSERT-Anweisung aus, die du in deine bereits offene
// psql-Sitzung (q7erp=#) einfügst.
//
// Nutzung: node debug-q7verbindung-sql-generieren.js

const fs = require('fs');
const path = require('path');
const { randomUUID, randomBytes, createCipheriv } = require('node:crypto');

const LIZENZNEHMER_ID = 'ae3f627f-8f51-4ae7-afe0-3a9f0b72d85e'; // Lizenznehmer A

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
    if (!(key in werte)) werte[key] = value;
  }
  return werte;
}

function verschluesseln(klartext, hexSchluessel) {
  const schluessel = Buffer.from(hexSchluessel, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', schluessel, iv);
  const verschluesselt = Buffer.concat([cipher.update(klartext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), verschluesselt.toString('hex')].join(':');
}

const env = ladeEnv(path.join(__dirname, '.env'));
if (!env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY nicht in .env gefunden.');

const klartextGeheimnis = randomBytes(32).toString('hex');
const verschluesseltesGeheimnis = verschluesseln(klartextGeheimnis, env.ENCRYPTION_KEY);
const id = randomUUID();

console.log('\n=== Klartext-Geheimnis (für A71-Test aufheben) ===');
console.log(klartextGeheimnis);
console.log('====================================================\n');

console.log('=== SQL — in die offene psql-Sitzung (q7erp=#) einfügen ===\n');
console.log(
  `INSERT INTO q7_verbindung (id, "lizenznehmerId", "geteiltesGeheimnis", aktiv, "erstelltAm", "letzteRotation")\n` +
  `VALUES ('${id}', '${LIZENZNEHMER_ID}', '${verschluesseltesGeheimnis}', true, NOW(), NOW());`
);
console.log('\n=============================================================\n');
