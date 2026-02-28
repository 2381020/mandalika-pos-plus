
-- Step 1: Add customer to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';
