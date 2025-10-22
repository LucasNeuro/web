-- ==================================================
-- VIEW ESTRUTURADA PARA FRONTEND
-- Desestrutura dados JSONB e prepara dados para consumo
-- ==================================================

-- 1. VIEW PRINCIPAL COM DADOS BÁSICOS + ESTATÍSTICAS
CREATE OR REPLACE VIEW public.view_editais_dashboard AS
SELECT 
  -- Dados básicos do edital
  e.id,
  e.numero_controle_pncp,
  e.cnpj_orgao,
  e.razao_social,
  e.municipio,
  e.uf,
  e.ano,
  e.sequencial,
  e.numero_compra,
  e.processo,
  e.objeto,
  e.modalidade,
  e.situacao,
  
  -- Valores
  e.valor_estimado,
  e.valor_homologado,
  
  -- Datas
  e.data_publicacao,
  e.data_abertura,
  e.data_encerramento,
  e.data_extracao,
  
  -- Estatísticas dos itens (extraídas do JSONB)
  COALESCE(jsonb_array_length(e.itens), 0) as total_itens,
  
  -- Valor total dos itens (soma de todos os valores dos itens)
  (
    SELECT COALESCE(SUM((item->>'valorTotal')::numeric), 0)
    FROM jsonb_array_elements(e.itens) AS item
  ) as valor_total_itens,
  
  -- Estatísticas dos documentos
  COALESCE(jsonb_array_length(e.documentos), 0) as total_documentos,
  
  -- Estatísticas do histórico
  COALESCE(jsonb_array_length(e.historico), 0) as total_eventos_historico,
  
  -- Última atualização do histórico
  (
    SELECT MAX((evento->>'dataPublicacao')::timestamp)
    FROM jsonb_array_elements(e.historico) AS evento
  ) as ultima_atualizacao_historico,
  
  -- Metadata
  e.fonte,
  e.tempo_extracao,
  e.processado,
  e.created_at,
  e.updated_at

FROM public.editais_completos e
WHERE e.processado = true
ORDER BY e.data_publicacao DESC;

-- ==================================================
-- 2. VIEW DETALHADA DE ITENS (1 linha por item)
-- ==================================================
CREATE OR REPLACE VIEW public.view_editais_itens AS
SELECT 
  e.id as edital_id,
  e.numero_controle_pncp,
  e.cnpj_orgao,
  e.razao_social,
  e.modalidade,
  
  -- Dados do item (desestruturados do JSONB)
  (item->>'numeroItem')::integer as numero_item,
  item->>'descricao' as item_descricao,
  item->>'tipoBeneficio' as tipo_beneficio,
  item->>'incentivoProdutivoBasico' as incentivo_produtivo_basico,
  (item->>'quantidade')::numeric as quantidade,
  item->>'unidadeMedida' as unidade_medida,
  (item->>'valorUnitario')::numeric as valor_unitario,
  (item->>'valorTotal')::numeric as valor_total,
  item->>'situacao' as situacao_item,
  (item->>'criterioJulgamento')::integer as criterio_julgamento,
  
  -- Datas do edital
  e.data_publicacao,
  e.data_abertura,
  e.data_encerramento

FROM public.editais_completos e
CROSS JOIN LATERAL jsonb_array_elements(e.itens) AS item
WHERE e.processado = true;

-- ==================================================
-- 3. VIEW DETALHADA DE DOCUMENTOS (1 linha por documento)
-- ==================================================
CREATE OR REPLACE VIEW public.view_editais_documentos AS
SELECT 
  e.id as edital_id,
  e.numero_controle_pncp,
  e.cnpj_orgao,
  e.razao_social,
  e.modalidade,
  
  -- Dados do documento (desestruturados do JSONB)
  (doc->>'sequencial')::integer as sequencial_documento,
  doc->>'titulo' as titulo_documento,
  doc->>'tipoDocumentoNome' as tipo_documento,
  (doc->>'dataPublicacao')::timestamp as data_publicacao_documento,
  doc->>'url' as url_documento,
  
  -- Datas do edital
  e.data_publicacao,
  e.data_abertura

FROM public.editais_completos e
CROSS JOIN LATERAL jsonb_array_elements(e.documentos) AS doc
WHERE e.processado = true;

-- ==================================================
-- 4. VIEW DETALHADA DE HISTÓRICO (1 linha por evento)
-- ==================================================
CREATE OR REPLACE VIEW public.view_editais_historico AS
SELECT 
  e.id as edital_id,
  e.numero_controle_pncp,
  e.cnpj_orgao,
  e.razao_social,
  e.modalidade,
  
  -- Dados do evento (desestruturados do JSONB)
  (evento->>'sequencial')::integer as sequencial_evento,
  evento->>'titulo' as titulo_evento,
  evento->>'descricao' as descricao_evento,
  (evento->>'dataPublicacao')::timestamp as data_evento,
  
  -- Datas do edital
  e.data_publicacao,
  e.data_abertura

FROM public.editais_completos e
CROSS JOIN LATERAL jsonb_array_elements(e.historico) AS evento
WHERE e.processado = true;

-- ==================================================
-- 5. VIEW RESUMIDA PARA LISTAGEM (otimizada para performance)
-- ==================================================
CREATE OR REPLACE VIEW public.view_editais_lista AS
SELECT 
  e.numero_controle_pncp,
  e.razao_social,
  e.municipio,
  e.uf,
  e.processo,
  e.objeto,
  e.modalidade,
  e.situacao,
  e.valor_estimado,
  e.data_publicacao,
  e.data_abertura,
  COALESCE(jsonb_array_length(e.itens), 0) as total_itens,
  COALESCE(jsonb_array_length(e.documentos), 0) as total_documentos
  
FROM public.editais_completos e
WHERE e.processado = true
ORDER BY e.data_publicacao DESC;

-- ==================================================
-- 6. ÍNDICES JSONB PARA OTIMIZAR QUERIES
-- ==================================================

-- Índice GIN para busca em itens
CREATE INDEX IF NOT EXISTS idx_editais_itens_gin 
ON public.editais_completos USING gin(itens);

-- Índice GIN para busca em documentos
CREATE INDEX IF NOT EXISTS idx_editais_documentos_gin 
ON public.editais_completos USING gin(documentos);

-- Índice GIN para busca em histórico
CREATE INDEX IF NOT EXISTS idx_editais_historico_gin 
ON public.editais_completos USING gin(historico);

-- Índice para buscas por texto no objeto
CREATE INDEX IF NOT EXISTS idx_editais_objeto_texto 
ON public.editais_completos USING gin(to_tsvector('portuguese', objeto));

-- Índice para buscas por modalidade e situação
CREATE INDEX IF NOT EXISTS idx_editais_modalidade_situacao 
ON public.editais_completos(modalidade, situacao);

-- Índice para buscas por UF e município
CREATE INDEX IF NOT EXISTS idx_editais_localizacao 
ON public.editais_completos(uf, municipio);

-- ==================================================
-- COMENTÁRIOS NAS VIEWS
-- ==================================================

COMMENT ON VIEW public.view_editais_dashboard IS 
'View principal com dados agregados e estatísticas dos editais';

COMMENT ON VIEW public.view_editais_itens IS 
'View com itens desestruturados - uma linha por item de cada edital';

COMMENT ON VIEW public.view_editais_documentos IS 
'View com documentos desestruturados - uma linha por documento de cada edital';

COMMENT ON VIEW public.view_editais_historico IS 
'View com histórico desestruturado - uma linha por evento de cada edital';

COMMENT ON VIEW public.view_editais_lista IS 
'View otimizada para listagem rápida de editais com informações resumidas';
