// src/connector/adapters/q7/q7-verbindung-repository.token.ts
//
// KORREKTUR (A74): Q7VerbindungRepository (in q7.adapter.ts definiert) ist
// nur ein TypeScript-Interface — existiert zur Laufzeit nicht. NestJS'
// Dependency Injection kann daraus allein NICHT ableiten, welche konkrete
// Klasse (Q7VerbindungPrismaRepository) eingesetzt werden soll. Ohne dieses
// Token hätte Q7Adapter beim ersten echten Einbinden in ein @Module mit
// "Nest can't resolve dependencies..." abgebrochen — bisher nicht
// aufgefallen, da der Adapter (A67) nie tatsächlich instanziiert wurde.
//
// Standard-NestJS-Muster für genau diesen Fall: expliziter Token +
// @Inject()-Decorator am Konstruktor-Parameter (siehe q7.adapter.ts),
// und Bindung im Modul über { provide: TOKEN, useClass: ... }
// (siehe q7-connector.module.ts).

export const Q7_VERBINDUNG_REPOSITORY = Symbol('Q7_VERBINDUNG_REPOSITORY');
