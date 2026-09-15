-- 003_login_function_update.sql
-- Erweitert login_benutzer_by_email() um istSystemAdmin (Aufgabe 26)
-- Geprüft gegen Original 002_login_function.sql — Struktur übernommen:
-- status-Typ "Status" (Enum, nicht TEXT), SET search_path, LIMIT 1.

CREATE OR REPLACE FUNCTION login_benutzer_by_email(p_email TEXT)
RETURNS TABLE (
  id               TEXT,
  "lizenznehmerId" TEXT,
  email            TEXT,
  "passwortHash"   TEXT,
  status           "Status",
  "istSystemAdmin" BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, "lizenznehmerId", email, "passwortHash", status, "istSystemAdmin"
  FROM "benutzer"
  WHERE email = p_email
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION login_benutzer_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION login_benutzer_by_email(TEXT) TO q7erp_app;
