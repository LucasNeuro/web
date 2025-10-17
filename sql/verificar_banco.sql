-- ============================================
-- SCRIPT PARA VERIFICAR E CORRIGIR O BANCO
-- Execute este SQL no Supabase para diagnosticar
-- ============================================

-- 1. Verificar se as tabelas existem
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('scheduler_horario', 'scheduler_execucoes', 'editais_pncp', 'editais_estruturados')
ORDER BY table_name;

-- 2. Verificar dados na tabela scheduler_horario
SELECT * FROM public.scheduler_horario;

-- 3. Verificar estrutura da tabela scheduler_horario
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'scheduler_horario'
ORDER BY ordinal_position;

-- 4. Verificar se existe registro na scheduler_horario
SELECT COUNT(*) as total_registros FROM public.scheduler_horario;

-- 5. Se não existir registro, inserir configuração padrão
INSERT INTO public.scheduler_horario (
  id,
  hora_execucao,
  ativo,
  created_at,
  updated_at
) VALUES (
  1,
  '08:00:00',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  hora_execucao = EXCLUDED.hora_execucao,
  ativo = EXCLUDED.ativo,
  updated_at = NOW();

-- 6. Verificar se foi inserido corretamente
SELECT * FROM public.scheduler_horario WHERE id = 1;

-- 7. Testar update da configuração
UPDATE public.scheduler_horario 
SET 
  hora_execucao = '10:30:00',
  ativo = true,
  updated_at = NOW()
WHERE id = 1;

-- 8. Verificar se o update funcionou
SELECT * FROM public.scheduler_horario WHERE id = 1;
