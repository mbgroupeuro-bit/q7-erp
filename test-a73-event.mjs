// test-a73-event.mjs
// Q7-ERP — A73-Laufzeittest: Login + Partner anlegen, um zu prüfen,
// ob PartnerService.create() tatsächlich ein Domain-Event auslöst.
//
// Nutzung: node test-a73-event.mjs
// Erwartung: Im Server-Log (npm run start) sollte danach eine Zeile
// erscheinen wie:
//   [A73-TEST-LISTENER] ✅ EVENT EMPFANGEN: partner.angelegt — {...}

const BASE_URL = 'http://localhost:3000';

const LOGIN_EMAIL = 'admin@test-gmbh.de';
const LOGIN_PASSWORT = 'Admin2026!';

async function main() {
  console.log('--- Schritt 1: Login ---');
  const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: LOGIN_EMAIL,
      passwort: LOGIN_PASSWORT,
    }),
  });

  const loginBody = await loginResponse.json();
  console.log('Login-Status:', loginResponse.status);

  if (!loginResponse.ok || !loginBody.access_token) {
    console.error('Login fehlgeschlagen:', loginBody);
    process.exit(1);
  }

  const token = loginBody.access_token;
  console.log('Login erfolgreich, Token erhalten.\n');

  console.log('--- Schritt 2: Partner anlegen ---');
  const partnerName = `A73-Test-Partner ${new Date().toISOString()}`;

  const createResponse = await fetch(`${BASE_URL}/partner`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: partnerName,
    }),
  });

  const createBody = await createResponse.json();

  console.log('Anlage-Status:', createResponse.status);
  console.log('Antwort-Body:', JSON.stringify(createBody, null, 2));

  if (createResponse.ok) {
    console.log(
      '\n✅ Partner erfolgreich angelegt. Jetzt im Server-Log-Fenster nach',
      '"[A73-TEST-LISTENER] ✅ EVENT EMPFANGEN: partner.angelegt" suchen.',
    );
  } else {
    console.error('\n❌ Partner-Anlage fehlgeschlagen.');
  }
}

main().catch((err) => {
  console.error('Unerwarteter Fehler:', err);
  process.exit(1);
});
