// a76-mandantentrennung-test.js
// Q7-ERP — A76: Mandantentrennung im Connector testen
// Prüft: Lizenznehmer A sieht NIEMALS Daten von B (und umgekehrt),
// sowohl bei korrekt signierten eigenen Anfragen als auch bei einem
// IDOR-artigen Versuch (fremde lizenznehmerId + eigene Signatur).
//
// Voraussetzung: Server läuft (npm run start:dev), Port 3000.
// Voraussetzung: q7_verbindung existiert für A (a75-geheimnis-setzen.js)
// und für B (a76-verbindung-b-anlegen.js).
//
// Ausführen im Projektordner:
//   node a76-mandantentrennung-test.js

const { createHmac, randomUUID } = require('node:crypto');

const BASE_URL = 'http://localhost:3000';

const LIZENZNEHMER_A_ID = 'ae3f627f-8f51-4ae7-afe0-3a9f0b72d85e';
const GEHEIMNIS_A = 'a75-test-geheimnis-2026';

const LIZENZNEHMER_B_ID = '359c31e2-04af-4338-992c-7ee3f7d463fa';
const GEHEIMNIS_B = 'a76-test-geheimnis-b-2026';

function berechneSignatur(geheimnis, lizenznehmerId, anfrageId, zeitstempel) {
  return createHmac('sha256', geheimnis)
    .update(`${lizenznehmerId}.${anfrageId}.${zeitstempel}`)
    .digest('hex');
}

async function anfrage(pfad, headerLizenznehmerId, signaturGeheimnis, signaturLizenznehmerId) {
  const anfrageId = randomUUID();
  const zeitstempel = new Date().toISOString();
  // signaturLizenznehmerId erlaubt bewusst eine ABWEICHENDE ID als die im
  // Header gesendete — für den IDOR-Test (Signatur für A, Header sagt B).
  const signatur = berechneSignatur(
    signaturGeheimnis,
    signaturLizenznehmerId ?? headerLizenznehmerId,
    anfrageId,
    zeitstempel,
  );

  const response = await fetch(`${BASE_URL}${pfad}`, {
    method: 'GET',
    headers: {
      'X-Lizenznehmer-Id': headerLizenznehmerId,
      'X-Anfrage-Id': anfrageId,
      'X-Q7ERP-Timestamp': zeitstempel,
      'X-Q7ERP-Signature': signatur,
    },
  });

  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

function pruefeNurEigeneDaten(bezeichnung, payload, erlaubteLizenznehmerId) {
  if (!Array.isArray(payload)) {
    console.log(`  ${bezeichnung}: KEINE LISTE — kann nicht geprüft werden ✗`);
    return false;
  }
  const fremde = payload.filter((eintrag) => eintrag.lizenznehmerId !== erlaubteLizenznehmerId);
  if (fremde.length > 0) {
    console.log(`  ${bezeichnung}: LECK ENTDECKT — ${fremde.length} fremde Datensätze! ✗✗✗`);
    return false;
  }
  console.log(`  ${bezeichnung}: nur eigene Daten (${payload.length} Einträge) ✓`);
  return true;
}

async function main() {
  let alleTestsOk = true;

  console.log('\n=== Test 1: A fragt mit eigener gültiger Signatur — darf NUR A-Daten sehen ===');
  const aPartner = await anfrage('/connector/q7/partner', LIZENZNEHMER_A_ID, GEHEIMNIS_A);
  console.log('Status:', aPartner.status);
  if (aPartner.status === 200) {
    alleTestsOk = pruefeNurEigeneDaten('Partner', aPartner.body.payload, LIZENZNEHMER_A_ID) && alleTestsOk;
  } else {
    console.log('  UNERWARTET: erwarteter Status 200 ✗');
    alleTestsOk = false;
  }

  console.log('\n=== Test 2: B fragt mit eigener gültiger Signatur — darf NUR B-Daten sehen ===');
  const bPartner = await anfrage('/connector/q7/partner', LIZENZNEHMER_B_ID, GEHEIMNIS_B);
  console.log('Status:', bPartner.status);
  if (bPartner.status === 200) {
    alleTestsOk = pruefeNurEigeneDaten('Partner', bPartner.body.payload, LIZENZNEHMER_B_ID) && alleTestsOk;
  } else {
    console.log('  UNERWARTET: erwarteter Status 200 ✗');
    alleTestsOk = false;
  }

  console.log('\n=== Test 3: IDOR-Versuch — Header sagt B, aber signiert mit A-Geheimnis (muss 403 geben) ===');
  const idorVersuch = await anfrage('/connector/q7/partner', LIZENZNEHMER_B_ID, GEHEIMNIS_A, LIZENZNEHMER_B_ID);
  console.log('Status:', idorVersuch.status);
  if (idorVersuch.status === 403) {
    console.log('  Erwartet — Signatur mit A-Geheimnis für B-ID korrekt abgelehnt ✓');
  } else {
    console.log('  UNERWARTET — IDOR-Versuch wurde NICHT abgelehnt! ✗✗✗');
    alleTestsOk = false;
  }

  console.log('\n=== Test 4: Artikel-Endpunkt — A und B jeweils nur eigene Daten ===');
  const aArtikel = await anfrage('/connector/q7/artikel', LIZENZNEHMER_A_ID, GEHEIMNIS_A);
  const bArtikel = await anfrage('/connector/q7/artikel', LIZENZNEHMER_B_ID, GEHEIMNIS_B);
  if (aArtikel.status === 200) {
    alleTestsOk = pruefeNurEigeneDaten('Artikel (A)', aArtikel.body.payload, LIZENZNEHMER_A_ID) && alleTestsOk;
  } else {
    console.log('  A-Artikel: UNERWARTET Status', aArtikel.status, '✗');
    alleTestsOk = false;
  }
  if (bArtikel.status === 200) {
    alleTestsOk = pruefeNurEigeneDaten('Artikel (B)', bArtikel.body.payload, LIZENZNEHMER_B_ID) && alleTestsOk;
  } else {
    console.log('  B-Artikel: UNERWARTET Status', bArtikel.status, '✗');
    alleTestsOk = false;
  }

  console.log('\n=== A76-Test abgeschlossen:', alleTestsOk ? 'ALLE PRÜFUNGEN BESTANDEN ✓' : 'MINDESTENS EIN PROBLEM GEFUNDEN ✗', '===');
}

main().catch((e) => {
  console.error('Fehler:', e);
  process.exit(1);
});
