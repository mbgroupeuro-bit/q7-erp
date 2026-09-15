// D:\Projekt2027\ERP System\tests\test-a99-konfiguration.js
//
// A99 — Test: Konfiguration End-to-End
// Prüft den kompletten Weg: Artikel → istKonfigurierbar → Baustein-Gruppe
// → Baustein-Optionen → Konfigurationsregel (Ausschluss) → Abruf.
// Zusätzlich: Mandantentrennungstest (Lizenznehmer B darf auf Daten von
// Lizenznehmer A nicht zugreifen, siehe Master-Dokument 3.6).
//
// Ausführen mit: node test-a99-konfiguration.js
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
    // kein JSON-Body (z.B. leere Antwort)
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
  console.log('=== A99 — Konfiguration End-to-End ===\n');

  // 1. Login beider Lizenznehmer
  const tokenA = await login(LIZENZNEHMER_A);
  log(!!tokenA, 'Login Lizenznehmer A');
  const tokenB = await login(LIZENZNEHMER_B);
  log(!!tokenB, 'Login Lizenznehmer B');

  // 2. Artikel anlegen (A)
  const artikelnummer = 'ART-KONFIG-' + Date.now();
  const { status: sArtikel, data: artikel } = await request('POST', '/artikel', tokenA, {
    artikelnummer,
    name: 'Test-Konfigurationsartikel',
    grundpreis: 100,
    einheit: 'Stk',
  });
  log(sArtikel === 201, 'Artikel anlegen', `Status ${sArtikel}`);
  const artikelId = artikel?.id;

  // 3. Artikel auf istKonfigurierbar = true patchen
  const { status: sPatch } = await request('PATCH', `/artikel/${artikelId}`, tokenA, {
    istKonfigurierbar: true,
  });
  log(sPatch === 200, 'Artikel auf istKonfigurierbar=true patchen', `Status ${sPatch}`);

  // 4. Baustein-Gruppe anlegen
  const { status: sGruppe, data: gruppe } = await request(
    'POST',
    `/artikel/${artikelId}/baustein-gruppen`,
    tokenA,
    { gruppenName: 'Breite', pflichtfeld: true },
  );
  log(sGruppe === 201, 'Baustein-Gruppe anlegen', `Status ${sGruppe}`);
  const gruppeId = gruppe?.id;

  // 5. Zwei Baustein-Optionen anlegen
  const { status: sOpt1, data: option1 } = await request(
    'POST',
    `/artikel/baustein-gruppen/${gruppeId}/optionen`,
    tokenA,
    { optionsName: '120cm', preisaufschlag: 0 },
  );
  log(sOpt1 === 201, 'Baustein-Option 1 anlegen (120cm)', `Status ${sOpt1}`);
  const option1Id = option1?.id;

  const { status: sOpt2, data: option2 } = await request(
    'POST',
    `/artikel/baustein-gruppen/${gruppeId}/optionen`,
    tokenA,
    { optionsName: '180cm', preisaufschlag: 25 },
  );
  log(sOpt2 === 201, 'Baustein-Option 2 anlegen (180cm)', `Status ${sOpt2}`);
  const option2Id = option2?.id;

  // 6. Konfigurationsregel anlegen: wenn 120cm, dann 180cm ausgeschlossen
  const { status: sRegel, data: regel } = await request(
    'POST',
    `/artikel/baustein-optionen/${option1Id}/regeln`,
    tokenA,
    { dannAusschlussOptionId: option2Id },
  );
  log(sRegel === 201, 'Konfigurationsregel anlegen', `Status ${sRegel}`);

  // 7. Selbstausschluss muss abgelehnt werden (400)
  const { status: sSelbst } = await request(
    'POST',
    `/artikel/baustein-optionen/${option1Id}/regeln`,
    tokenA,
    { dannAusschlussOptionId: option1Id },
  );
  log(sSelbst === 400, 'Selbstausschluss wird abgelehnt', `Status ${sSelbst}`);

  // 8. Regeln abrufen und Inhalt prüfen
  const { status: sGetRegeln, data: regeln } = await request(
    'GET',
    `/artikel/baustein-optionen/${option1Id}/regeln`,
    tokenA,
  );
  const regelGefunden =
    sGetRegeln === 200 &&
    Array.isArray(regeln) &&
    regeln.some((r) => r.dannAusschlussOptionId === option2Id && r.dannAusschlussOptionsName === '180cm');
  log(regelGefunden, 'Regel korrekt abrufbar (inkl. Name der Ausschluss-Option)');

  // 9. Mandantentrennung: Lizenznehmer B darf NICHTS von A sehen/ändern
  const { status: sBArtikel } = await request('GET', `/artikel/${artikelId}`, tokenB);
  log(sBArtikel === 404, 'Mandantentrennung: B sieht A\'s Artikel nicht', `Status ${sBArtikel}`);

  const { status: sBGruppen } = await request(
    'GET',
    `/artikel/${artikelId}/baustein-gruppen`,
    tokenB,
  );
  log(sBGruppen === 404, 'Mandantentrennung: B sieht A\'s Baustein-Gruppen nicht', `Status ${sBGruppen}`);

  const { status: sBOptionen } = await request(
    'GET',
    `/artikel/baustein-gruppen/${gruppeId}/optionen`,
    tokenB,
  );
  log(sBOptionen === 404, 'Mandantentrennung: B sieht A\'s Baustein-Optionen nicht', `Status ${sBOptionen}`);

  const { status: sBRegeln } = await request(
    'GET',
    `/artikel/baustein-optionen/${option1Id}/regeln`,
    tokenB,
  );
  log(sBRegeln === 404, 'Mandantentrennung: B sieht A\'s Konfigurationsregeln nicht', `Status ${sBRegeln}`);

  const { status: sBRegelAnlegen } = await request(
    'POST',
    `/artikel/baustein-optionen/${option1Id}/regeln`,
    tokenB,
    { dannAusschlussOptionId: option2Id },
  );
  log(
    sBRegelAnlegen === 404,
    'Mandantentrennung: B kann für A\'s Option keine Regel anlegen',
    `Status ${sBRegelAnlegen}`,
  );

  // Zusammenfassung
  console.log('\n=== Ergebnis ===');
  console.log(`Bestanden: ${pass}`);
  console.log(`Fehlgeschlagen: ${fail}`);
  if (fail === 0) {
    console.log('\n✅ A99 bestanden — Konfiguration funktioniert End-to-End inkl. Mandantentrennung.');
  } else {
    console.log('\n❌ A99 NICHT bestanden — siehe Fehler oben.');
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error('Unerwarteter Fehler beim Testlauf:', err);
  process.exitCode = 1;
});
