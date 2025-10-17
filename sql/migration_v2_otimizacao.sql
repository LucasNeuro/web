-- ============================================
-- MIGRATION V2 - OTIMIZACOES DO SISTEMA
-- Execute este SQL no Supabase SQL Editor
-- Data: 2025-10-17
-- ============================================

-- ============================================
-- PARTE 1: ADICIONAR CONTROLE DE PROCESSAMENTO
-- ============================================

-- Adicionar colunas de controle em editais_pncp
ALTER TABLE public.editais_pncp 
ADD COLUMN IF NOT EXISTS processado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS data_processamento TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tentativas_processamento INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultimo_erro TEXT,
ADD COLUMN IF NOT EXISTS status_processamento VARCHAR(50) DEFAULT 'pendente';

-- Criar indice parcial para buscar apenas nao processados (MUITO EFICIENTE)
CREATE INDEX IF NOT EXISTS idx_editais_pncp_nao_processados 
ON public.editais_pncp(created_at) 
WHERE processado = FALSE;

-- Indice para editais com erro (retry)
CREATE INDEX IF NOT EXISTS idx_editais_pncp_com_erro 
ON public.editais_pncp(tentativas_processamento, created_at) 
WHERE processado = FALSE AND tentativas_processamento > 0;

-- Indice para status
CREATE INDEX IF NOT EXISTS idx_editais_pncp_status 
ON public.editais_pncp(status_processamento);

-- ============================================
-- PARTE 2: VIEWS DE MONITORAMENTO
-- ============================================

-- View: Status geral do sistema
CREATE OR REPLACE VIEW v_status_sistema AS
SELECT
  (SELECT COUNT(*) FROM editais_pncp) as total_urls_extraidas,
  (SELECT COUNT(*) FROM editais_pncp WHERE processado = true) as total_processados,
  (SELECT COUNT(*) FROM editais_pncp WHERE processado = false) as total_pendentes,
  (SELECT COUNT(*) FROM editais_pncp WHERE tentativas_processamento >= 3) as total_falhados,
  (SELECT COUNT(*) FROM editais_estruturados) as total_estruturados,
  ROUND(
    (SELECT COUNT(*)::numeric FROM editais_pncp WHERE processado = true) / 
    NULLIF((SELECT COUNT(*) FROM editais_pncp), 0) * 100, 
    2
  ) as percentual_cobertura,
  (SELECT MAX(data_referencia) FROM editais_pncp) as ultima_extracao,
  (SELECT MAX(data_processamento) FROM editais_pncp WHERE processado = true) as ultimo_processamento;

-- View: Editais pendentes priorizados
CREATE OR REPLACE VIEW v_editais_pendentes AS
SELECT DISTINCT ON (numero_controle_pncp)
  id,
  url,
  cnpj,
  razao_social,
  data_referencia,
  tentativas_processamento,
  ultimo_erro,
  status_processamento,
  created_at,
  numero_controle_pncp,
  CASE 
    WHEN tentativas_processamento = 0 THEN 'NOVO'
    WHEN tentativas_processamento < 3 THEN 'RETRY'
    ELSE 'FALHADO'
  END as prioridade,
  AGE(NOW(), created_at) as tempo_esperando
FROM editais_pncp
WHERE processado = false
ORDER BY 
  numero_controle_pncp,
  tentativas_processamento ASC, 
  created_at ASC;

-- View: Performance de scraping por dia
CREATE OR REPLACE VIEW v_performance_scraping AS
SELECT 
  DATE(data_extracao) as data,
  COUNT(*) as total_processados,
  ROUND(AVG(tempo_extracao), 2) as tempo_medio_segundos,
  ROUND(MIN(tempo_extracao), 2) as tempo_minimo,
  ROUND(MAX(tempo_extracao), 2) as tempo_maximo,
  ROUND(STDDEV(tempo_extracao), 2) as desvio_padrao,
  COUNT(*) FILTER (WHERE tempo_extracao > 30) as editais_lentos,
  COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(itens, '[]'::jsonb)) > 0) as com_itens,
  COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(anexos, '[]'::jsonb)) > 0) as com_anexos
FROM editais_estruturados
GROUP BY DATE(data_extracao)
ORDER BY data DESC;

-- View: Editais com problemas
CREATE OR REPLACE VIEW v_editais_problematicos AS
SELECT 
  ep.id,
  ep.url,
  ep.cnpj,
  ep.razao_social,
  ep.tentativas_processamento,
  ep.ultimo_erro,
  ep.data_referencia,
  ep.created_at,
  ee.tempo_extracao,
  jsonb_array_length(COALESCE(ee.itens, '[]'::jsonb)) as qtd_itens,
  jsonb_array_length(COALESCE(ee.anexos, '[]'::jsonb)) as qtd_anexos,
  jsonb_array_length(COALESCE(ee.historico, '[]'::jsonb)) as qtd_historico,
  CASE 
    WHEN ep.tentativas_processamento >= 3 THEN 'FALHA_MULTIPLA'
    WHEN ee.tempo_extracao > 30 THEN 'LENTO'
    WHEN ee.id IS NOT NULL AND jsonb_array_length(COALESCE(ee.itens, '[]'::jsonb)) = 0 THEN 'SEM_ITENS'
    ELSE 'OUTRO'
  END as tipo_problema
FROM editais_pncp ep
LEFT JOIN editais_estruturados ee ON ep.url = ee.url_edital
WHERE 
  ep.tentativas_processamento > 0 
  OR (ee.tempo_extracao IS NOT NULL AND ee.tempo_extracao > 30)
  OR (ee.id IS NOT NULL AND jsonb_array_length(COALESCE(ee.itens, '[]'::jsonb)) = 0)
ORDER BY ep.tentativas_processamento DESC, ep.created_at DESC;

-- View: Resumo por data de referencia
CREATE OR REPLACE VIEW v_resumo_por_data AS
SELECT 
  data_referencia,
  COUNT(*) as total_extraidos,
  COUNT(*) FILTER (WHERE processado = true) as total_processados,
  COUNT(*) FILTER (WHERE processado = false) as total_pendentes,
  COUNT(*) FILTER (WHERE tentativas_processamento > 0) as total_com_erro,
  ROUND(
    COUNT(*) FILTER (WHERE processado = true)::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as percentual_processado
FROM editais_pncp
GROUP BY data_referencia
ORDER BY data_referencia DESC;

-- ============================================
-- PARTE 3: FUNCOES UTILITARIAS
-- ============================================

-- Funcao: Resetar status de editais com muitos erros (para retry manual)
CREATE OR REPLACE FUNCTION reset_editais_falhados()
RETURNS TABLE (total_resetados BIGINT) AS $$
BEGIN
  WITH resetados AS (
    UPDATE editais_pncp
    SET 
      tentativas_processamento = 0,
      ultimo_erro = NULL,
      status_processamento = 'pendente'
    WHERE tentativas_processamento >= 3
    RETURNING id
  )
  SELECT COUNT(*) INTO total_resetados FROM resetados;
  
  RETURN QUERY SELECT total_resetados;
END;
$$ LANGUAGE plpgsql;

-- Funcao: Marcar edital como processado (para uso no codigo)
CREATE OR REPLACE FUNCTION marcar_edital_processado(
  p_id UUID,
  p_sucesso BOOLEAN,
  p_erro TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF p_sucesso THEN
    UPDATE editais_pncp
    SET 
      processado = TRUE,
      data_processamento = NOW(),
      status_processamento = 'sucesso',
      ultimo_erro = NULL
    WHERE id = p_id;
  ELSE
    UPDATE editais_pncp
    SET 
      tentativas_processamento = tentativas_processamento + 1,
      ultimo_erro = p_erro,
      status_processamento = CASE 
        WHEN tentativas_processamento + 1 >= 3 THEN 'falhado'
        ELSE 'erro'
      END
    WHERE id = p_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTE 4: COMENTARIOS E DOCUMENTACAO
-- ============================================

COMMENT ON COLUMN public.editais_pncp.processado IS 'Indica se o edital ja foi processado com scraping';
COMMENT ON COLUMN public.editais_pncp.data_processamento IS 'Data e hora do ultimo processamento bem-sucedido';
COMMENT ON COLUMN public.editais_pncp.tentativas_processamento IS 'Numero de tentativas de processamento (max 3)';
COMMENT ON COLUMN public.editais_pncp.ultimo_erro IS 'Mensagem do ultimo erro ocorrido no processamento';
COMMENT ON COLUMN public.editais_pncp.status_processamento IS 'Status atual: pendente, sucesso, erro, falhado';

COMMENT ON VIEW v_status_sistema IS 'Dashboard geral do sistema com metricas principais';
COMMENT ON VIEW v_editais_pendentes IS 'Lista de editais pendentes de processamento, priorizados';
COMMENT ON VIEW v_performance_scraping IS 'Metricas de performance do scraping por dia';
COMMENT ON VIEW v_editais_problematicos IS 'Editais com problemas ou anomalias';
COMMENT ON VIEW v_resumo_por_data IS 'Resumo de processamento agrupado por data de referencia';

-- ============================================
-- PARTE 5: QUERIES PARA VALIDACAO
-- ============================================

-- Verificar estrutura das colunas adicionadas
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'editais_pncp' 
  AND column_name IN ('processado', 'data_processamento', 'tentativas_processamento', 'ultimo_erro', 'status_processamento')
ORDER BY ordinal_position;

-- Verificar indices criados
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'editais_pncp'
  AND indexname LIKE '%processado%'
ORDER BY indexname;

-- Verificar views criadas
SELECT 
  table_name, 
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE 'v_%'
ORDER BY table_name;

-- Verificar funcoes criadas
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('reset_editais_falhados', 'marcar_edital_processado')
ORDER BY routine_name;

-- ============================================
-- PARTE 6: TESTE DAS VIEWS
-- ============================================

-- Testar view de status geral
SELECT * FROM v_status_sistema;

-- Testar view de editais pendentes (top 10)
SELECT * FROM v_editais_pendentes LIMIT 10;

-- Testar view de performance (ultimos 7 dias)
SELECT * FROM v_performance_scraping LIMIT 7;

-- Testar view de resumo por data (ultimos 10 dias)
SELECT * FROM v_resumo_por_data LIMIT 10;

-- ============================================
-- SCRIPT FINALIZADO!
-- ============================================

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION V2 EXECUTADA COM SUCESSO!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Colunas adicionadas: 5';
  RAISE NOTICE 'Indices criados: 3';
  RAISE NOTICE 'Views criadas: 5';
  RAISE NOTICE 'Funcoes criadas: 2';
  RAISE NOTICE '============================================';
END $$;

