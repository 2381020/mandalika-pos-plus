-- Allow owner/admin to delete transactions
CREATE POLICY "Owner can delete transactions"
ON public.transactions FOR DELETE
USING (
  has_role(auth.uid(), 'owner') OR
  has_role(auth.uid(), 'admin')
);

-- Allow owner/admin to delete transaction items (for manual cleanup if needed)
-- Note: transaction_items are cascaded when transaction is deleted
CREATE POLICY "Owner can delete transaction items"
ON public.transaction_items FOR DELETE
USING (
  has_role(auth.uid(), 'owner') OR
  has_role(auth.uid(), 'admin')
);
