// a75-connector-test.js
// Q7-ERP — A75: Gesamttest Connector-Lese-Endpunkte für Q7
// Testet /connector/q7/partner (A69) und /connector/q7/artikel (A70)
// end-to-end gegen den laufenden NestJS-Server, inkl. Signaturprüfung
// (erp-tuersteher, siehe signatur-pruefung.service.ts).
//
// Voraussetzung: Server läuft (npm run start:dev), Port 3000.
//
// Ausführen im Projektordner:
//   node a75-connector-test.js

const { createHmac, randomUUID } = require('node:crypto');

const BASE_URL = 'http://localhost:3000';
const LIZENZNEHMER_A_ID = 'ae3f627f-8f51-4ae7-afe0-3a9f0b72d85e';
const KLARTEXT_GEHEIMNIS = 'a75-test-geheimnis-2026';

function berechneSignatur(geheimnis, lizenznehmerId, anfrageId, zeitstempel) {
  // Identische Formel wie SignaturPruefungService.berechneSignatur()
  return createHmac('sha256', geheimnis)
    .update(`${lizenznehmerId}.${anfrageId}.${zeitstempel}`)
    .digest('hex');
}

async function testeEndpunkt(pfad) {
  const anfrageId = randomUUID();
  const zeitstempel = new Date().toISOString();
  const signatur = berechneSignatur(
    KLARTEXT_GEHEIMNIS,
    LIZENZNEHMER_A_ID,
    anfrageId,
    zeitstempel,
  );

  console.log(`\n--- Teste ${pfad} ---`);

  const response = await fetch(`${BASE_URL}${pfad}`, {
    method: 'GET',
    headers: {
      'X-Lizenznehmer-Id': LIZENZNEHMER_A_ID,
      'X-Anfrage-Id': anfrageId,
      'X-Q7ERP-Timestamp': zeitstempel,
      'X-Q7ERP-Signature': signatur,
    },
  });

  console.log('Status:', response.status);
  const body = await response.text();
  try {
    console.log('Antwort:', JSON.stringify(JSON.parse(body), null, 2));
  } catch {
    console.log('Antwort (roh):', body);
  }

  return response.status;
}

async function testeOhneSignatur(pfad) {
  console.log(`\n--- Negativtest: ${pfad} OHNE Header (muss 400 geben) ---`);
  const response = await fetch(`${BASE_URL}${pfad}`, { method: 'GET' });
  console.log('Status:', response.status, response.status === 400 ? '(erwartet ✓)' : '(UNERWARTET ✗)');
}

async function testeFalscheSignatur(pfad) {
  console.log(`\n--- Negativtest: ${pfad} MIT falscher Signatur (muss 403 geben) ---`);
  const anfrageId = randomUUID();
  const zeitstempel = new Date().toISOString();

  const response = await fetch(`${BASE_URL}${pfad}`, {
    method: 'GET',
    headers: {
      'X-Lizenznehmer-Id': LIZENZNEHMER_A_ID,
      'X-Anfrage-Id': anfrageId,
      'X-Q7ERP-Timestamp': zeitstempel,
      'X-Q7ERP-Signature': 'komplett-falsche-signatur',
    },
  });
  console.log('Status:', response.status, response.status === 403 ? '(erwartet ✓)' : '(UNERWARTET ✗)');
}

async function main() {
  await testeEndpunkt('/connector/q7/partner');
  await testeEndpunkt('/connector/q7/artikel');

  await testeOhneSignatur('/connector/q7/partner');
  await testeFalscheSignatur('/connector/q7/partner');

  console.log('\n--- A75-Test abgeschlossen ---');
}

main().catch((e) => {
  console.error('Fehler:', e);
  process.exit(1);
});
