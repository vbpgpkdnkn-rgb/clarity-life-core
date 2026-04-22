
-- Conciliação bancária: marca transações que já foram batidas com extrato
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS reconciled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bank_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_reconciled ON public.transactions (reconciled, date);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_ref ON public.transactions (bank_ref) WHERE bank_ref IS NOT NULL;

-- Linhas brutas do extrato bancário importado (servem de "lado direito" da conciliação)
CREATE TABLE IF NOT EXISTS public.bank_statement_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entrada','saida')),
  fitid TEXT,
  matched_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','conciliado','ignorado')),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_entries_account_date ON public.bank_statement_entries (account_id, date);
CREATE INDEX IF NOT EXISTS idx_bank_entries_status ON public.bank_statement_entries (status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_entries_fitid ON public.bank_statement_entries (account_id, fitid) WHERE fitid IS NOT NULL;

ALTER TABLE public.bank_statement_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open all" ON public.bank_statement_entries FOR ALL USING (true) WITH CHECK (true);
