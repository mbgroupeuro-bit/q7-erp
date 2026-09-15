// D:\Projekt2027\ERP System\test-mandantentrennung.js
//
// A33 — Test: Mandantentrennung (Lizenznehmer A darf keine Daten von B sehen)
//
// AUSFÜHREN:
//   node test-mandantentrennung.js
//
// VORAUSSETZUNG: Server läuft lokal (npm run start / start:dev)

const BASE_URL = 'http://localhost:3000';

// ⚠️ Passwörter hier eintragen (aus KeePassXC):
const USER_A = { email: 'admin@test-gmbh.de', passwort: 'Admin2026!' };
const USER_B = { email: 'admin@testfirma-b.de', passwort: 'TestFirmaB2026!' };

let ergebnisse = [];

function log(name, bestanden, detail) {
  ergebnisse.push({ name, bestanden, detail });
  console.log(`${bestanden ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function login(user) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, passwort: user.passwort }),
  });
  if (!res.ok) {
    throw new Error(`Login fehlgeschlagen für ${user.email}: HTTP ${res.status}`);
  }
  const data = await res.json();
  // Annahme: Token liegt in data.accessToken oder data.token — ggf. anpassen
  const token = data.accessToken || data.token || data.access_token;
  if (!token) {
    throw new Error(`Kein Token in Login-Antwort gefunden für ${user.email}. Antwort: ${JSON.stringify(data)}`);
  }
  return token;
}

async function getPartnerListe(token) {
  const res = await fetch(`${BASE_URL}/partner`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status, body: res.ok ? await res.json() : null };
}

async function getPartnerById(token, id) {
  const res = await fetch(`${BASE_URL}/partner/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status, body: res.ok ? await res.json() : null };
}

async function main() {
  console.log('--- A33: Mandantentrennung-Test startet ---\n');

  // 1. Login beider Nutzer
  const tokenA = await login(USER_A);
  const tokenB = await login(USER_B);
  log('Login Lizenznehmer A erfolgreich', true);
  log('Login Lizenznehmer B erfolgreich', true);

  // 2. Szenario 1: Liste — A darf nur eigene Partner sehen
  const listeA = await getPartnerListe(tokenA);
  const enthaeltFremdeDaten = Array.isArray(listeA.body) &&
    listeA.body.some(p => p.name && p.name.toLowerCase().includes('firma b'));
  log(
    'Szenario 1 (Liste): A sieht keine Partner von B',
    listeA.status === 200 && !enthaeltFremdeDaten,
    `Status ${listeA.status}, Anzahl Partner: ${Array.isArray(listeA.body) ? listeA.body.length : 'n/a'}`
  );

  // 3. Szenario 2 (IDOR): B legt zunächst einen Partner an, A versucht per ID darauf zuzugreifen
  const createRes = await fetch(`${BASE_URL}/partner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ name: 'IDOR-Test-Partner-B' }), // ggf. Pflichtfelder aus CreatePartnerDto ergänzen
  });
  if (!createRes.ok) {
    log('Vorbereitung Szenario 2 (Partner für B anlegen)', false, `HTTP ${createRes.status} — Pflichtfelder prüfen`);
  } else {
    const neuerPartnerB = await createRes.json();
    const zugriffVersuch = await getPartnerById(tokenA, neuerPartnerB.id);
    log(
      'Szenario 2 (IDOR): A darf fremden Partner per ID nicht abrufen',
      zugriffVersuch.status === 403 || zugriffVersuch.status === 404,
      `Status ${zugriffVersuch.status} (erwartet: 403 oder 404)`
    );
  }

  // Zusammenfassung
  console.log('\n--- Ergebnis ---');
  const bestanden = ergebnisse.filter(e => e.bestanden).length;
  console.log(`${bestanden}/${ergebnisse.length} Tests bestanden`);
  if (bestanden < ergebnisse.length) {
    console.log('\n⚠️ Mindestens ein Test fehlgeschlagen — Mandantentrennung NICHT bestätigt.');
    process.exit(1);
  } else {
    console.log('\n✅ Alle Tests bestanden.');
  }
}

main().catch(err => {
  console.error('\nFehler beim Testlauf:', err.message);
  process.exit(1);
});
