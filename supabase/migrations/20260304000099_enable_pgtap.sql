-- 099: Enable pgTAP extension for database testing
-- =============================================================================

create extension if not exists pgtap with schema extensions;
