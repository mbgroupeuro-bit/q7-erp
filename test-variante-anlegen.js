// Testskript für A90: Legt eine Test-Variante zum Elternartikel ART-001 an.
// Ausführen mit: node test-variante-anlegen.js
// Voraussetzung: Backend läuft auf http://localhost:3000

const BASE_URL = "http://localhost:3000";
const ELTERN_ARTIKEL_ID = "6fadd3bb-4964-4194-8987-7e3dbf9bcdcc"; // ART-001, Lizenznehmer A

async function main() {
  // 1. Login (Lizenznehmer A)
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@test-gmbh.de",
      passwort: "Admin2026!",
    }),
  });

  if (!loginRes.ok) {
    console.error("Login fehlgeschlagen:", loginRes.status, await loginRes.text());
    return;
  }

  const loginData = await loginRes.json();
  const token = loginData.access_token || loginData.token || loginData.accessToken;

  if (!token) {
    console.error("Kein Token in der Login-Antwort gefunden. Antwort war:", loginData);
    return;
  }

  console.log("Login erfolgreich, Token erhalten.");

  // 2. Variante anlegen (Kind-Artikel mit elternArtikelId)
  const variantenPayload = {
    artikelnummer: "ART-001-VAR-ROT",
    name: "Test Artikel — Variante Rot",
    grundpreis: 19.99,
    einheit: "Stk",
    elternArtikelId: ELTERN_ARTIKEL_ID,
  };

  const createRes = await fetch(`${BASE_URL}/artikel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(variantenPayload),
  });

  const createBody = await createRes.text();

  if (!createRes.ok) {
    console.error("Variante anlegen fehlgeschlagen:", createRes.status, createBody);
    console.error(
      "\nHinweis: Falls der Fehler auf ein unbekanntes Feld hinweist, bitte das genaue CreateArtikelDto prüfen — Feldnamen könnten abweichen (z.B. 'preis' statt 'grundpreis')."
    );
    return;
  }

  console.log("Variante erfolgreich angelegt:");
  console.log(createBody);
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err);
});
