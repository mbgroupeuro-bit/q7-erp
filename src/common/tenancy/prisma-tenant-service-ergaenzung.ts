// ERGÄNZUNG zu src/common/tenancy/prisma-tenant.service.ts
// Grund: withTenantContext() liest lizenznehmerId aus dem Request-Kontext
// (getCurrentLizenznehmerId(), z.B. per AsyncLocalStorage aus JWT-Middleware).
// Der Connector-Export (Q7Adapter, A68) läuft aber NICHT im Rahmen eines
// eingehenden HTTP-Requests, sondern hintergrundgesteuert (Domain Event, A73)
// mit bereits bekannter lizenznehmerId aus dem Envelope selbst.
//
// Diese Methode ergänzt die Klasse (nicht ersetzt withTenantContext()) um
// einen Weg, denselben zwei-Schloss-Mechanismus (RLS-Session-Variable +
// explizite Übergabe) auch für Hintergrund-Kontexte zu nutzen, OHNE den
// Request-Kontext zu missbrauchen oder zu faken.
//
// STATUS: Vorschlag, ungetestet (kein DB-Zugriff in dieser Session).
// Bitte in prisma-tenant.service.ts als zusätzliche Methode einfügen.

/*
  async withExplicitTenantContext<T>(
    lizenznehmerId: string,
    callback: (tx: Prisma.TransactionClient, lizenznehmerId: string) => Promise<T>,
  ): Promise<T> {
    if (!lizenznehmerId) {
      throw new InternalServerErrorException(
        'withExplicitTenantContext() ohne lizenznehmerId aufgerufen — sicherheitshalber blockiert.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_lizenznehmer_id', ${lizenznehmerId}, true)`;
      return callback(tx, lizenznehmerId);
    });
  }
*/
