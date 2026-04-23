-- =========================================================
-- LOCKDOWN: exigir autenticação em TODAS as tabelas públicas
-- Modelo single-user: qualquer usuário logado tem acesso total,
-- mas anônimos (chave pública) ficam totalmente bloqueados.
-- =========================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    -- Garante RLS habilitado
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', r.schemaname, r.tablename);

    -- Remove TODAS as policies existentes da tabela
    DECLARE
      p RECORD;
    BEGIN
      FOR p IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = r.schemaname AND tablename = r.tablename
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', p.policyname, r.schemaname, r.tablename);
      END LOOP;
    END;

    -- Cria policy única exigindo autenticação para qualquer operação
    EXECUTE format($f$
      CREATE POLICY "authenticated_full_access" ON %I.%I
      FOR ALL
      TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
    $f$, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- =========================================================
-- STORAGE: bloquear bucket agenda-imports para autenticados
-- =========================================================

-- Garante que o bucket é privado
UPDATE storage.buckets SET public = false WHERE id = 'agenda-imports';

-- Remove policies antigas do bucket (se houver)
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname ILIKE '%agenda-imports%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', p.policyname);
  END LOOP;
END $$;

-- Acesso apenas para usuários autenticados
CREATE POLICY "agenda-imports authenticated read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'agenda-imports' AND auth.uid() IS NOT NULL);

CREATE POLICY "agenda-imports authenticated insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'agenda-imports' AND auth.uid() IS NOT NULL);

CREATE POLICY "agenda-imports authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'agenda-imports' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'agenda-imports' AND auth.uid() IS NOT NULL);

CREATE POLICY "agenda-imports authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'agenda-imports' AND auth.uid() IS NOT NULL);