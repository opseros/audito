-- Audit log is append-only: no UPDATE, DELETE or TRUNCATE, even for the app role.
CREATE OR REPLACE FUNCTION audit_log_block_changes() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION audit_log_block_changes();
--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_log_no_truncate ON audit_log;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON audit_log
FOR EACH STATEMENT EXECUTE FUNCTION audit_log_block_changes();
--> statement-breakpoint
-- Reference data: framework catalog and platform settings.
INSERT INTO frameworks (code, name, short_name, version, requirements, published) VALUES
  ('SOC2', 'SOC 2 (TSC 2017, rev. points of focus)', 'SOC 2', 'v2026.2', '61 criteria', true),
  ('SOC1', 'SOC 1 (SSAE 18)', 'SOC 1', 'v2026.1', 'Control objectives', true),
  ('ISO27001', 'ISO/IEC 27001:2022', 'ISO 27001', 'v2026.1', '93 Annex A controls', true),
  ('PCI', 'PCI DSS 4.0.1', 'PCI DSS 4.0', 'v2026.3', '64 requirements mapped', false),
  ('FEDRAMP', 'FedRAMP 20x (CR26) Low', 'FedRAMP 20x', 'v2026.2', 'KSI set', false),
  ('HIPAA', 'HIPAA Security Rule', 'HIPAA', 'v2026.1', 'Safeguards library', true),
  ('DPDP', 'India DPDP Act + Rules', 'DPDP (India)', 'v2026.1', 'Obligations library', true),
  ('GDPR', 'EU GDPR', 'GDPR', 'v2026.1', 'Articles library', true),
  ('ISO42001', 'ISO/IEC 42001 (AI management)', 'ISO 42001', 'v0.9', 'Annex A controls', false)
ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint
INSERT INTO platform_settings (key, enabled) VALUES
  ('support_consent', true),
  ('independence_check', true),
  ('require_mfa', false),
  ('data_residency', false),
  ('ai_drafts', false),
  ('open_signup', true)
ON CONFLICT (key) DO NOTHING;
