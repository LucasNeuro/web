-- ============================================
-- BANCO COMPLETO - PNCP API
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TABELA: editais_pncp (URLs básicas)
-- ============================================

CREATE TABLE public.editais_pncp (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  cnpj character varying NOT NULL,
  razao_social text NOT NULL,
  ano integer NOT NULL,
  sequencial integer NOT NULL,
  numero_controle_pncp character varying NOT NULL UNIQUE,
  objeto text,
  modalidade character varying,
  situacao character varying,
  valor_estimado numeric,
  data_publicacao timestamp with time zone,
  data_referencia date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT editais_pncp_pkey PRIMARY KEY (id)
);

-- Índices para editais_pncp
CREATE INDEX idx_editais_url ON public.editais_pncp(url);
CREATE INDEX idx_editais_numero_controle ON public.editais_pncp(numero_controle_pncp);
CREATE INDEX idx_editais_data_referencia ON public.editais_pncp(data_referencia);
CREATE INDEX idx_editais_cnpj ON public.editais_pncp(cnpj);
CREATE INDEX idx_editais_ano ON public.editais_pncp(ano);

-- ============================================
-- 2. TABELA: editais_estruturados (Dados completos)
-- ============================================

CREATE TABLE public.editais_estruturados (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_pncp character varying NOT NULL UNIQUE,
  url_edital text NOT NULL,
  cnpj_orgao character varying,
  orgao character varying,
  ano integer,
  numero integer,
  titulo_edital character varying,
  itens jsonb DEFAULT '[]'::jsonb,
  anexos jsonb DEFAULT '[]'::jsonb,
  historico jsonb DEFAULT '[]'::jsonb,
  objeto_completo jsonb DEFAULT '{}'::jsonb,
  dados_financeiros jsonb DEFAULT '{}'::jsonb,
  data_extracao timestamp with time zone DEFAULT now(),
  metodo_extracao character varying DEFAULT 'puppeteer'::character varying,
  tempo_extracao numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT editais_estruturados_pkey PRIMARY KEY (id)
);

-- Índices para editais_estruturados
CREATE INDEX idx_editais_estruturados_id_pncp ON public.editais_estruturados(id_pncp);
CREATE INDEX idx_editais_estruturados_url ON public.editais_estruturados(url_edital);
CREATE INDEX idx_editais_estruturados_cnpj ON public.editais_estruturados(cnpj_orgao);
CREATE INDEX idx_editais_estruturados_ano ON public.editais_estruturados(ano);
CREATE INDEX idx_editais_estruturados_data_extracao ON public.editais_estruturados(data_extracao);

-- Índices GIN para campos JSONB
CREATE INDEX idx_editais_estruturados_itens_gin ON public.editais_estruturados USING gin (itens);
CREATE INDEX idx_editais_estruturados_anexos_gin ON public.editais_estruturados USING gin (anexos);
CREATE INDEX idx_editais_estruturados_historico_gin ON public.editais_estruturados USING gin (historico);
CREATE INDEX idx_editais_estruturados_objeto_gin ON public.editais_estruturados USING gin (objeto_completo);
CREATE INDEX idx_editais_estruturados_financeiros_gin ON public.editais_estruturados USING gin (dados_financeiros);

-- ============================================
-- 3. TABELA: scheduler_horario (Configuração do scheduler)
-- ============================================

CREATE TABLE public.scheduler_horario (
  id integer NOT NULL DEFAULT 1,
  hora_execucao time without time zone NOT NULL DEFAULT '08:00:00'::time without time zone,
  ativo boolean DEFAULT true,
  ultima_execucao timestamp with time zone,
  proxima_execucao timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scheduler_horario_pkey PRIMARY KEY (id)
);

-- ============================================
-- 4. TABELA: scheduler_execucoes (Histórico de execuções)
-- ============================================

-- Criar sequence primeiro
CREATE SEQUENCE IF NOT EXISTS scheduler_execucoes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.scheduler_execucoes (
  id bigint NOT NULL DEFAULT nextval('scheduler_execucoes_id_seq'::regclass),
  scheduler_id integer NOT NULL DEFAULT 1,
  data_inicio timestamp with time zone NOT NULL,
  data_fim timestamp with time zone,
  status character varying NOT NULL DEFAULT 'em_andamento'::character varying,
  total_encontrados integer DEFAULT 0,
  total_novos integer DEFAULT 0,
  total_atualizados integer DEFAULT 0,
  total_ignorados integer DEFAULT 0,
  total_erros integer DEFAULT 0,
  tempo_execucao numeric,
  dias_retroativos integer DEFAULT 1,
  mensagem text,
  detalhes jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scheduler_execucoes_pkey PRIMARY KEY (id),
  CONSTRAINT fk_scheduler FOREIGN KEY (scheduler_id) REFERENCES public.scheduler_horario(id)
);

-- Índices para scheduler_execucoes
CREATE INDEX idx_scheduler_execucoes_data_inicio ON public.scheduler_execucoes(data_inicio);
CREATE INDEX idx_scheduler_execucoes_status ON public.scheduler_execucoes(status);
CREATE INDEX idx_scheduler_execucoes_scheduler_data ON public.scheduler_execucoes(scheduler_id, data_inicio);

-- ============================================
-- 5. FUNÇÃO: update_updated_at_column()
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. TRIGGERS: Para atualizar updated_at automaticamente
-- ============================================

-- Trigger para scheduler_horario
CREATE TRIGGER update_scheduler_horario_updated_at
    BEFORE UPDATE ON public.scheduler_horario
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para editais_estruturados
CREATE TRIGGER update_editais_estruturados_updated_at
    BEFORE UPDATE ON public.editais_estruturados
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. DADOS INICIAIS
-- ============================================

-- Inserir configuração padrão do scheduler
INSERT INTO public.scheduler_horario (
  id,
  hora_execucao,
  ativo
) VALUES (
  1,
  '08:00:00',
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE public.editais_pncp IS 'URLs básicas dos editais extraídos da API PNCP';
COMMENT ON TABLE public.editais_estruturados IS 'Dados completos extraídos via scraping (JSONB)';
COMMENT ON TABLE public.scheduler_horario IS 'Configuração do scheduler de execução automática';
COMMENT ON TABLE public.scheduler_execucoes IS 'Histórico de execuções do scheduler';

-- Comentários nas colunas principais
COMMENT ON COLUMN public.editais_pncp.numero_controle_pncp IS 'Número único de controle no PNCP - evita duplicatas';
COMMENT ON COLUMN public.editais_pncp.url IS 'URL completa do edital no PNCP';

COMMENT ON COLUMN public.editais_estruturados.id_pncp IS 'ID único do PNCP - evita duplicatas';
COMMENT ON COLUMN public.editais_estruturados.itens IS 'Lista de itens do edital em formato JSON';
COMMENT ON COLUMN public.editais_estruturados.anexos IS 'Lista de anexos do edital em formato JSON';
COMMENT ON COLUMN public.editais_estruturados.historico IS 'Histórico de alterações em formato JSON';
COMMENT ON COLUMN public.editais_estruturados.objeto_completo IS 'Objeto completo do edital em formato JSON';
COMMENT ON COLUMN public.editais_estruturados.dados_financeiros IS 'Dados financeiros em formato JSON';

COMMENT ON COLUMN public.scheduler_horario.hora_execucao IS 'Hora diária para execução automática';
COMMENT ON COLUMN public.scheduler_horario.ativo IS 'Se o scheduler está ativo ou não';

COMMENT ON COLUMN public.scheduler_execucoes.total_encontrados IS 'Total de editais encontrados na extração';
COMMENT ON COLUMN public.scheduler_execucoes.total_novos IS 'Total de editais novos salvos';
COMMENT ON COLUMN public.scheduler_execucoes.total_erros IS 'Total de erros durante a execução';
COMMENT ON COLUMN public.scheduler_execucoes.tempo_execucao IS 'Tempo total de execução em segundos';

-- ============================================
-- SCRIPT FINALIZADO!
-- ============================================

-- Verificar se tudo foi criado corretamente
SELECT 
    'editais_pncp' as tabela, 
    COUNT(*) as registros 
FROM public.editais_pncp
UNION ALL
SELECT 
    'editais_estruturados' as tabela, 
    COUNT(*) as registros 
FROM public.editais_estruturados
UNION ALL
SELECT 
    'scheduler_horario' as tabela, 
    COUNT(*) as registros 
FROM public.scheduler_horario
UNION ALL
SELECT 
    'scheduler_execucoes' as tabela, 
    COUNT(*) as registros 
FROM public.scheduler_execucoes;
