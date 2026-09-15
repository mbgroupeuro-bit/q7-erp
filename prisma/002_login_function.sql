-- 002_login_function.sql
-- Löst das RLS-Henne-Ei-Problem beim Login: die lizenznehmerId ist erst NACH
-- dem Login bekannt, RLS braucht sie aber VOR jeder Abfrage auf "benutzer".
--
-- Lösung: eine eng begrenzte SECURITY DEFINER-Funktion, die NUR "Benutzer per
-- E-Mail finden" kann. Läuft mit den Rechten des Funktions-Eigentümers (hier:
-- als Superuser "postgres" angelegt), umgeht RLS also gezielt NUR für diesen
-- einen, klar abgegrenzten Zweck. Der normale App-User (q7erp_app) bekommt
-- lediglich das Recht, diese eine Funktion auszuführen — keinen direkten,
-- ungefilterten Zugriff auf die Tabelle.

CREATE OR REPLACE FUNCTION login_benutzer_by_email(p_email TEXT)
RETURNS TABLE (
  id TEXT,
  "lizenznehmerId" TEXT,
  email TEXT,
  "passwortHash" TEXT,
  status "Status"
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, "lizenznehmerId", email, "passwortHash", status
  FROM "benutzer"
  WHERE email = p_email
  LIMIT 1;
$$;

-- Ausführung standardmäßig für niemanden erlauben, dann gezielt freigeben
REVOKE ALL ON FUNCTION login_benutzer_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION login_benutzer_by_email(TEXT) TO q7erp_app;
