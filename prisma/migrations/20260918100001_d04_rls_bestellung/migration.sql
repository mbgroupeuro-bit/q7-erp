ALTER TABLE bestellung ENABLE ROW LEVEL SECURITY;
ALTER TABLE bestellung FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON bestellung TO q7erp_app;
CREATE POLICY bestellung_tenant_isolation ON bestellung
  USING ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true))
  WITH CHECK ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true));

ALTER TABLE bestell_position ENABLE ROW LEVEL SECURITY;
ALTER TABLE bestell_position FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON bestell_position TO q7erp_app;
CREATE POLICY bestell_position_tenant_isolation ON bestell_position
  USING ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true))
  WITH CHECK ("lizenznehmerId" = current_setting('app.current_lizenznehmer_id', true));
