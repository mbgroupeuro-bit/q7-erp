// test-a71-connector.mjs
// Q7-ERP — A71: Test "Q7-Adapter mit Signaturprüfung end-to-end"
//
// Simuliert eine eingehende Q7-Anfrage an /connector/q7/artikel, genau
// nach dem Contract aus q7-connector-tuersteher.middleware.ts:
//   Header: X-Lizenznehmer-Id, X-Anfrage-Id, X-Q7ERP-Timestamp, X-Q7ERP-Signature
//   Signatur = HMAC-SHA256(geheimnis, `${lizenznehmerId}.${anfrageId}.${zeitstempel}`)
//
// Ausführen mit: node test-a71-connector.mjs
// Voraussetzung: Node.js 18+ (wegen global fetch), Server muss laufen.

import { createHmac, randomUUID } from 'node:crypto';

// ---- Konfiguration ----------------------------------------------------

// ANNAHME: Standard-NestJS-Port. Falls dein Server woanders läuft,
// hier anpassen (z.B. http://localhost:4000).
const BASE_URL = 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/connector/q7/artikel`;

// Test-Lizenznehmer A (aus deinen bekannten Test-Daten)
const LIZENZNEHMER_ID = 'ae3f627f-8f51-4ae7-afe0-3a9f0b72d85e';

// Klartext-Geheimnis, das per Debug-Skript entschlüsselt und in
// q7_verbindung für diesen Lizenznehmer eingetragen wurde.
const GEHEIMNIS_KLARTEXT = 'c14791b651e2f30060547c549ab7d7929f1be44469a81fbbca29b1317913f607';

// ---- Anfrage zusammenbauen ---------------------------------------------

const anfrageId = randomUUID();
const zeitstempel = new Date().toISOString();

function berechneSignatur(geheimnis, lizenznehmerId, anfrageId, zeitstempel) {
  return createHmac('sha256', geheimnis)
    .update(`${lizenznehmerId}.${anfrageId}.${zeitstempel}`)
    .digest('hex');
}

const signatur = berechneSignatur(GEHEIMNIS_KLARTEXT, LIZENZNEHMER_ID, anfrageId, zeitstempel);

console.log('--- Angefragte Werte ---');
console.log('lizenznehmerId:', LIZENZNEHMER_ID);
console.log('anfrageId:     ', anfrageId);
console.log('zeitstempel:   ', zeitstempel);
console.log('signatur:      ', signatur);
console.log('------------------------\n');

// ---- Anfrage senden ------------------------------------------------------

async function main() {
  const response = await fetch(ENDPOINT, {
    method: 'GET',
    headers: {
      'X-Lizenznehmer-Id': LIZENZNEHMER_ID,
      'X-Anfrage-Id': anfrageId,
      'X-Q7ERP-Timestamp': zeitstempel,
      'X-Q7ERP-Signature': signatur,
    },
  });

  console.log('Status:', response.status, response.statusText);

  let body;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }
  console.log('Antwort-Body:', body);

  if (response.status === 403) {
    console.log(
      '\n→ 403: Türsteher hat abgelehnt. Mögliche Ursachen:\n' +
      '  - Geheimnis in DB stimmt nicht mit GEHEIMNIS_KLARTEXT hier überein\n' +
      '  - Q7Verbindung.aktiv = false\n' +
      '  - Zeitstempel-Fenster überschritten (Server-/Client-Uhr-Differenz?)',
    );
  } else if (response.status === 400) {
    console.log('\n→ 400: Header fehlen oder Route erwartet andere Parameter (Body statt Query?).');
  } else if (response.status === 404) {
    console.log(
      '\n→ 404: Endpunkt existiert unter diesem Pfad/Port nicht.\n' +
      '  Prüfe BASE_URL im Skript und ob der Controller für /connector/q7/artikel bereits existiert.',
    );
  }
}

main().catch((err) => {
  console.error('Fehler beim Ausführen des Tests:', err);
  process.exit(1);
});
