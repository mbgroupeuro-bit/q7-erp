// D:\Projekt2027\ERP System\test\test-a102-konten.js
//
// A102 — Test: Konten End-to-End
// Prüft: Konto anlegen, Liste abrufen, einzelnes Konto abrufen,
// sowie Mandantentrennung (Lizenznehmer B darf Konten von A nicht sehen).
//
// Ausführen mit: node test-a102-konten.js
// Voraussetzung: Backend läuft auf localhost:3000

const BASE_URL = 'http://localhost:3000';

const LIZENZNEHMER_A = { email: 'admin@test-gmbh.de', passwort: 'Admin2026!' };
const LIZENZNEHMER_B = { email: 'admin@testfirma-b.de', passwort: 'TestFirmaB2026!' };

let pass = 0;
let fail = 0;

function log(ok, label, detail = '') {
  if (ok) {
    pass++;
    console.log(`✅ ${label}${detail ? ' — ' + detail : ''}`);
  } else {
    fail++;
    console.log(`❌ ${label}${detail ? ' — ' + detail : ''}`);
  }
}

async function request(method, path, token, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    // kein JSON-Body
  }
  return { status: res.status, data };
}

async function login(creds) {
  const { status, data } = await request('POST', '/auth/login', null, creds);
  if (status !== 201 && status !== 200) {
    throw new Error(`Login fehlgeschlagen (${status}): ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function run() {
  console.log('=== A102 — Konten End-to-End ===\n');

  const tokenA = await login(LIZENZNEHMER_A);
  log(!!tokenA, 'Login Lizenznehmer A');
  const tokenB = await login(LIZENZNEHMER_B);
  log(!!tokenB, 'Login Lizenznehmer B');

  // 1. Konto anlegen (A)
  const kontonummer = 'TEST-' + Date.now();
  const { status: sCreate, data: konto } = await request('POST', '/konto', tokenA, {
    kontonummer,
    bezeichnung: 'Test-Konto A102',
    kontotyp: 'AKTIV_KONTO',
  });
  log(sCreate === 201, 'Konto anlegen', `Status ${sCreate}`);
  const kontoId = konto?.id;

  // 2. Liste abrufen, neues Konto muss enthalten sein
  const { status: sList, data: liste } = await request('GET', '/konto', tokenA);
  const inListe = sList === 200 && Array.isArray(liste) && liste.some((k) => k.id === kontoId);
  log(inListe, 'Neues Konto erscheint in der Liste', `Status ${sList}`);

  // 3. Einzelabruf
  const { status: sOne, data: einzeln } = await request('GET', `/konto/${kontoId}`, tokenA);
  const einzelnKorrekt =
    sOne === 200 && einzeln?.kontonummer === kontonummer && einzeln?.kontotyp === 'AKTIV_KONTO';
  log(einzelnKorrekt, 'Einzelnes Konto korrekt abrufbar', `Status ${sOne}`);

  // 4. Mandantentrennung: B darf A's Konto nicht einzeln sehen
  const { status: sBOne } = await request('GET', `/konto/${kontoId}`, tokenB);
  log(sBOne === 404, 'Mandantentrennung: B sieht A\'s Konto nicht (Einzelabruf)', `Status ${sBOne}`);

  // 5. Mandantentrennung: B's Liste darf A's Konto nicht enthalten
  const { status: sBList, data: listeB } = await request('GET', '/konto', tokenB);
  const bSiehtEsNicht =
    sBList === 200 && Array.isArray(listeB) && !listeB.some((k) => k.id === kontoId);
  log(bSiehtEsNicht, 'Mandantentrennung: B\'s Liste enthält A\'s Konto nicht', `Status ${sBList}`);

  console.log('\n=== Ergebnis ===');
  console.log(`Bestanden: ${pass}`);
  console.log(`Fehlgeschlagen: ${fail}`);
  if (fail === 0) {
    console.log('\n✅ A102 bestanden — Konten-Modul funktioniert End-to-End inkl. Mandantentrennung.');
  } else {
    console.log('\n❌ A102 NICHT bestanden — siehe Fehler oben.');
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error('Unerwarteter Fehler beim Testlauf:', err);
  process.exitCode = 1;
});
