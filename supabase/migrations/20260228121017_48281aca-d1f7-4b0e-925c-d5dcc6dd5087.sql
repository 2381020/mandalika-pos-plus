
-- Auto-assign customer role on new user signup
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_role();

-- Allow customers to insert transactions
DROP POLICY IF EXISTS "Kasir can insert transactions" ON public.transactions;
CREATE POLICY "Authenticated can insert transactions"
ON public.transactions FOR INSERT
WITH CHECK (
  auth.uid() = cashier_id AND (
    has_role(auth.uid(), 'kasir') OR
    has_role(auth.uid(), 'owner') OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'customer')
  )
);

-- Allow customers to insert transaction items
DROP POLICY IF EXISTS "Insert transaction items" ON public.transaction_items;
CREATE POLICY "Authenticated can insert transaction items"
ON public.transaction_items FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'kasir') OR
  has_role(auth.uid(), 'owner') OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'customer')
);

-- Allow customers to read their own transactions
DROP POLICY IF EXISTS "Read transactions" ON public.transactions;
CREATE POLICY "Read own or admin transactions"
ON public.transactions FOR SELECT
USING (
  cashier_id = auth.uid() OR
  has_role(auth.uid(), 'owner') OR
  has_role(auth.uid(), 'admin')
);

-- Allow customers to read their own transaction items
DROP POLICY IF EXISTS "Read transaction items" ON public.transaction_items;
CREATE POLICY "Read transaction items"
ON public.transaction_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transaction_items.transaction_id
    AND (t.cashier_id = auth.uid() OR has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'))
  )
);
