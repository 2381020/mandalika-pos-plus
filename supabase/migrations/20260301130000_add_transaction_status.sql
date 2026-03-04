-- Add status column to transactions: 'pending' (menunggu pembayaran) | 'completed' (selesai)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';

-- Kasir can update own transactions (untuk Transaksi Selesai), owner can update all
CREATE POLICY "Kasir can update own transactions"
ON public.transactions FOR UPDATE
USING (cashier_id = auth.uid() OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (true);
