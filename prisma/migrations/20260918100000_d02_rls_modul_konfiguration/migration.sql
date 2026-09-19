ALTER TABLE lizenznehmer_modul ENABLE ROW LEVEL SECURITY;
ALTER TABLE lizenznehmer_modul FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON lizenznehmer_modul TO q7erp_app;
CREATE POLICY lizenznehmer_modul_tenant_isolation ON lizenznehmer_modul
  USING ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true))
  WITH CHECK ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true));

ALTER TABLE zahlung_konfiguration ENABLE ROW LEVEL SECURITY;
ALTER TABLE zahlung_konfiguration FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON zahlung_konfiguration TO q7erp_app;
CREATE POLICY zahlung_konfiguration_tenant_isolation ON zahlung_konfiguration
  USING ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true))
  WITH CHECK ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true));

ALTER TABLE logistik_konfiguration ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistik_konfiguration FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON logistik_konfiguration TO q7erp_app;
CREATE POLICY logistik_konfiguration_tenant_isolation ON logistik_konfiguration
  USING ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true))
  WITH CHECK ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true));

ALTER TABLE shop_konfiguration ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_konfiguration FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_konfiguration TO q7erp_app;
CREATE POLICY shop_konfiguration_tenant_isolation ON shop_konfiguration
  USING ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true))
  WITH CHECK ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true));
