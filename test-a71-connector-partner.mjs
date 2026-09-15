// test-a71-connector-partner.mjs
// Q7-ERP — A71: Test für /connector/q7/partner (Ergänzung zu test-a71-connector.mjs)
// Ausführen mit: node test-a71-connector-partner.mjs

import { createHmac, randomUUID } from 'node:crypto';

const BASE_URL = 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/connector/q7/partner`;

const LIZENZNEHMER_ID = 'ae3f627f-8f51-4ae7-afe0-3a9f0b72d85e'; // Lizenznehmer A
const GEHEIMNIS_KLARTEXT = 'c14791b651e2f30060547c549ab7d7929f1be44469a81fbbca29b1317913f607';

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
}

main().catch((err) => {
  console.error('Fehler beim Ausführen des Tests:', err);
  process.exit(1);
});
