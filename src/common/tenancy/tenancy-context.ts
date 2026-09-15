// common/tenancy/tenancy-context.ts
//
// Hält die lizenznehmerId für die Dauer eines einzelnen Requests bereit,
// ohne sie durch jede Funktionssignatur durchreichen zu müssen.
// Wird von tenancy.middleware.ts gesetzt und von PrismaTenantService gelesen.

import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenancyStore {
  lizenznehmerId: string;
}

export const tenancyStorage = new AsyncLocalStorage<TenancyStore>();

/**
 * Liefert die aktuelle lizenznehmerId des Requests.
 * Wirft, wenn außerhalb eines Request-Kontexts aufgerufen —
 * bewusst kein "undefined"-Fallback, damit ein fehlender Tenant-Kontext
 * nicht still zu einer ungefilterten Abfrage führen kann (siehe 3.6).
 */
export function getCurrentLizenznehmerId(): string {
  const store = tenancyStorage.getStore();
  if (!store) {
    throw new Error(
      'Kein Tenancy-Kontext vorhanden. getCurrentLizenznehmerId() darf nur ' +
        'innerhalb eines Requests aufgerufen werden, der die TenancyMiddleware durchlaufen hat.',
    );
  }
  return store.lizenznehmerId;
}
