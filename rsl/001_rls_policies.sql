-- Q7-ERP: Row-Level Security für alle Tabellen mit lizenznehmer_id
-- Session-Variable wird pro Request von common/tenancy-Middleware gesetzt:
--   SET LOCAL app.current_lizenznehmer_id = '<uuid>';
-- lizenznehmer selbst braucht keine Policy (Wurzeltabelle).

-- Hinweis: Spalte heißt im Prisma-Schema "lizenznehmerId" (camelCase, ohne @map),
-- daher in Postgres case-sensitiv mit doppelten Anführungszeichen zu referenzieren.

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'partner',
    'artikel',
    'artikel_merkmal',
    'bundle_position',
    'baustein_gruppe',
    'baustein_option',
    'konfigurationsregel',
    'konten'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);

    -- alte Policy entfernen, falls Skript erneut läuft
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', tbl);

    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING ("lizenznehmerId" = current_setting(''app.current_lizenznehmer_id'', true)::uuid)
         WITH CHECK ("lizenznehmerId" = current_setting(''app.current_lizenznehmer_id'', true)::uuid);',
      tbl
    );
  END LOOP;
END $$;

-- WICHTIG: Der Datenbank-User, mit dem die App sich verbindet, darf NICHT
-- Superuser oder Tabellenbesitzer sein (die umgehen RLS grundsätzlich,
-- auch mit FORCE ROW LEVEL SECURITY). Ggf. eigenen App-User anlegen:
--
-- CREATE ROLE q7erp_app LOGIN PASSWORD '...';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO q7erp_app;
-- ALTER DATABASE q7erp OWNER TO postgres; -- App-User NICHT als Owner
