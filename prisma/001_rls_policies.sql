-- 001_rls_policies.sql
-- Row-Level-Security-Policies für Q7-ERP (Master-Dok Abschnitt 3.6)
-- Session-Variable: app.current_lizenznehmer_id (gesetzt via PrismaTenantService, SET LOCAL)
-- Betrifft alle Tabellen mit lizenznehmerId AUSSER der Wurzel-Tabelle "lizenznehmer" selbst
-- (die läuft über den separaten, ungefilterten PrismaService).

-- ============================================================
-- benutzer
-- ============================================================
ALTER TABLE "benutzer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "benutzer" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_benutzer ON "benutzer"
  USING ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true))
  WITH CHECK ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true));

-- ============================================================
-- partner
-- ============================================================
ALTER TABLE "partner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partner" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_partner ON "partner"
  USING ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true))
  WITH CHECK ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true));

-- ============================================================
-- artikel
-- ============================================================
ALTER TABLE "artikel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "artikel" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_artikel ON "artikel"
  USING ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true))
  WITH CHECK ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true));

-- ============================================================
-- artikel_merkmal
-- ============================================================
ALTER TABLE "artikel_merkmal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "artikel_merkmal" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_artikel_merkmal ON "artikel_merkmal"
  USING ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true))
  WITH CHECK ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true));

-- ============================================================
-- bundle_position
-- ============================================================
ALTER TABLE "bundle_position" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bundle_position" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_bundle_position ON "bundle_position"
  USING ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true))
  WITH CHECK ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true));

-- ============================================================
-- baustein_gruppe
-- ============================================================
ALTER TABLE "baustein_gruppe" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "baustein_gruppe" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_baustein_gruppe ON "baustein_gruppe"
  USING ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true))
  WITH CHECK ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true));

-- ============================================================
-- baustein_option
-- ============================================================
ALTER TABLE "baustein_option" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "baustein_option" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_baustein_option ON "baustein_option"
  USING ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true))
  WITH CHECK ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true));

-- ============================================================
-- konfigurationsregel
-- ============================================================
ALTER TABLE "konfigurationsregel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "konfigurationsregel" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_konfigurationsregel ON "konfigurationsregel"
  USING ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true))
  WITH CHECK ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true));

-- ============================================================
-- konten
-- ============================================================
ALTER TABLE "konten" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "konten" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_konten ON "konten"
  USING ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true))
  WITH CHECK ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true));

-- ============================================================
-- zugriffshistorie
-- ============================================================
ALTER TABLE "zugriffshistorie" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "zugriffshistorie" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_zugriffshistorie ON "zugriffshistorie"
  USING ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true))
  WITH CHECK ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true));

-- ============================================================
-- q7_verbindung
-- ============================================================
ALTER TABLE "q7_verbindung" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "q7_verbindung" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_q7_verbindung ON "q7_verbindung"
  USING ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true))
  WITH CHECK ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true));

-- ============================================================
-- Hinweis: "lizenznehmer" (Wurzel-Tabelle) bewusst OHNE RLS —
-- läuft über separaten, ungefilterten PrismaService (kein lizenznehmerId-Feld).
-- ============================================================
