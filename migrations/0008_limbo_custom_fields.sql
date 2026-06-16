ALTER TABLE "crm_contact_limbo" ADD COLUMN IF NOT EXISTS "custom_fields" jsonb DEFAULT '{}'::jsonb;
