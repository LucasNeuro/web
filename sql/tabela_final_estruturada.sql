-- =====================================================
-- TABELA FINAL ESTRUTURADA PARA DOWNLOAD
-- =====================================================
-- Esta tabela será populada automaticamente ao final do processamento
-- e conterá todos os dados estruturados prontos para download

-- Criar tabela final estruturada
CREATE TABLE IF NOT EXISTS public.editais_final_estruturados (
    -- Identificação
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    id_pncp VARCHAR(100) NOT NULL,
    url_edital TEXT NOT NULL,
    
    -- Dados do órgão
    cnpj_orgao VARCHAR(14),
    orgao VARCHAR(255),
    
    -- Dados do edital
    ano INTEGER,
    numero INTEGER,
    titulo_edital VARCHAR(500),
    numero_controle_pncp VARCHAR(50),
    
    -- Modalidade e situação
    modalidade VARCHAR(100),
    situacao VARCHAR(100),
    
    -- Valores
    valor_estimado NUMERIC(15,2),
    valor_homologado NUMERIC(15,2),
    
    -- Datas
    data_publicacao TIMESTAMP WITH TIME ZONE,
    data_extracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_referencia DATE,
    
    -- Objeto da compra
    objeto TEXT,
    objeto_completo TEXT,
    
    -- Dados estruturados (desnormalizados para facilitar exportação)
    total_itens INTEGER DEFAULT 0,
    total_anexos INTEGER DEFAULT 0,
    total_historico INTEGER DEFAULT 0,
    
    -- Itens (um registro por item)
    item_numero INTEGER,
    item_descricao TEXT,
    item_quantidade NUMERIC(15,2),
    item_unidade VARCHAR(50),
    item_valor_unitario NUMERIC(15,2),
    item_valor_total NUMERIC(15,2),
    
    -- Anexos (um registro por anexo)
    anexo_nome VARCHAR(255),
    anexo_url TEXT,
    anexo_tipo VARCHAR(50),
    
    -- Histórico (um registro por entrada)
    historico_data TIMESTAMP WITH TIME ZONE,
    historico_evento VARCHAR(255),
    historico_descricao TEXT,
    
    -- Metadados
    metodo_extracao VARCHAR(50) DEFAULT 'puppeteer',
    tempo_extracao NUMERIC(10,2),
    tentativas_processamento INTEGER DEFAULT 0,
    status_processamento VARCHAR(50) DEFAULT 'processado',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT editais_final_estruturados_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_editais_final_id_pncp 
ON public.editais_final_estruturados USING btree (id_pncp);

CREATE INDEX IF NOT EXISTS idx_editais_final_cnpj 
ON public.editais_final_estruturados USING btree (cnpj_orgao);

CREATE INDEX IF NOT EXISTS idx_editais_final_ano 
ON public.editais_final_estruturados USING btree (ano);

CREATE INDEX IF NOT EXISTS idx_editais_final_data_extracao 
ON public.editais_final_estruturados USING btree (data_extracao);

CREATE INDEX IF NOT EXISTS idx_editais_final_orgao 
ON public.editais_final_estruturados USING btree (orgao);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_editais_final_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_editais_final_estruturados_updated_at 
BEFORE UPDATE ON editais_final_estruturados 
FOR EACH ROW EXECUTE FUNCTION update_editais_final_updated_at();

-- =====================================================
-- FUNÇÃO PARA POPULAR TABELA FINAL
-- =====================================================
-- Esta função será chamada ao final do processamento
-- para desnormalizar os dados JSONB em registros separados

CREATE OR REPLACE FUNCTION popular_tabela_final_estruturados()
RETURNS INTEGER AS $$
DECLARE
    total_registros INTEGER := 0;
    edital_record RECORD;
    item_record RECORD;
    anexo_record RECORD;
    historico_record RECORD;
BEGIN
    -- Limpar tabela final antes de popular
    TRUNCATE TABLE editais_final_estruturados;
    
    -- Iterar sobre todos os editais estruturados
    FOR edital_record IN 
        SELECT * FROM editais_estruturados 
        WHERE itens IS NOT NULL OR anexos IS NOT NULL OR historico IS NOT NULL
    LOOP
        -- Se não tem itens, anexos ou histórico, criar um registro básico
        IF (edital_record.itens IS NULL OR jsonb_array_length(edital_record.itens) = 0) 
           AND (edital_record.anexos IS NULL OR jsonb_array_length(edital_record.anexos) = 0)
           AND (edital_record.historico IS NULL OR jsonb_array_length(edital_record.historico) = 0) THEN
            
            INSERT INTO editais_final_estruturados (
                id_pncp, url_edital, cnpj_orgao, orgao,
                ano, numero, titulo_edital, numero_controle_pncp,
                modalidade, situacao, valor_estimado, valor_homologado,
                data_publicacao, data_extracao, data_referencia,
                objeto, objeto_completo, total_itens, total_anexos, total_historico,
                metodo_extracao, tempo_extracao, tentativas_processamento, status_processamento
            ) VALUES (
                edital_record.id_pncp, edital_record.url_edital, edital_record.cnpj_orgao, 
                edital_record.orgao, edital_record.ano, 
                edital_record.numero, edital_record.titulo_edital, 
                COALESCE((edital_record.objeto_completo->>'numero_controle_pncp'), ''),
                COALESCE((edital_record.objeto_completo->>'modalidade'), ''),
                COALESCE((edital_record.objeto_completo->>'situacao'), ''),
                COALESCE((edital_record.dados_financeiros->>'valor_estimado')::NUMERIC, 0),
                COALESCE((edital_record.dados_financeiros->>'valor_homologado')::NUMERIC, 0),
                COALESCE((edital_record.objeto_completo->>'data_publicacao')::TIMESTAMP, edital_record.data_extracao),
                edital_record.data_extracao,
                edital_record.data_extracao::DATE,
                COALESCE((edital_record.objeto_completo->>'objeto'), ''),
                COALESCE(edital_record.objeto_completo::TEXT, '{}'),
                0, 0, 0,
                edital_record.metodo_extracao, edital_record.tempo_extracao, 0, 'processado'
            );
            total_registros := total_registros + 1;
        ELSE
            -- Processar itens
            IF edital_record.itens IS NOT NULL AND jsonb_array_length(edital_record.itens) > 0 THEN
                FOR item_record IN 
                    SELECT * FROM jsonb_array_elements(edital_record.itens) WITH ORDINALITY AS t(item, idx)
                LOOP
                    INSERT INTO editais_final_estruturados (
                        id_pncp, url_edital, cnpj_orgao, orgao,
                        ano, numero, titulo_edital, numero_controle_pncp,
                        modalidade, situacao, valor_estimado, valor_homologado,
                        data_publicacao, data_extracao, data_referencia,
                        objeto, objeto_completo, total_itens, total_anexos, total_historico,
                        item_numero, item_descricao, item_quantidade, item_unidade,
                        item_valor_unitario, item_valor_total,
                        metodo_extracao, tempo_extracao, tentativas_processamento, status_processamento
                    ) VALUES (
                        edital_record.id_pncp, edital_record.url_edital, edital_record.cnpj_orgao, 
                        edital_record.orgao, edital_record.ano, 
                        edital_record.numero, edital_record.titulo_edital, 
                        COALESCE((edital_record.objeto_completo->>'numero_controle_pncp'), ''),
                        COALESCE((edital_record.objeto_completo->>'modalidade'), ''),
                        COALESCE((edital_record.objeto_completo->>'situacao'), ''),
                        COALESCE((edital_record.dados_financeiros->>'valor_estimado')::NUMERIC, 0),
                        COALESCE((edital_record.dados_financeiros->>'valor_homologado')::NUMERIC, 0),
                        COALESCE((edital_record.objeto_completo->>'data_publicacao')::TIMESTAMP, edital_record.data_extracao),
                        edital_record.data_extracao,
                        edital_record.data_extracao::DATE,
                        COALESCE((edital_record.objeto_completo->>'objeto'), ''),
                        COALESCE(edital_record.objeto_completo::TEXT, '{}'),
                        jsonb_array_length(edital_record.itens),
                        COALESCE(jsonb_array_length(edital_record.anexos), 0),
                        COALESCE(jsonb_array_length(edital_record.historico), 0),
                        COALESCE((item_record.item->>'numero')::INTEGER, item_record.idx),
                        COALESCE(item_record.item->>'descricao', ''),
                        COALESCE((item_record.item->>'quantidade')::NUMERIC, 0),
                        COALESCE(item_record.item->>'unidade', ''),
                        COALESCE((item_record.item->>'valor_unitario')::NUMERIC, 0),
                        COALESCE((item_record.item->>'valor_total')::NUMERIC, 0),
                        edital_record.metodo_extracao, edital_record.tempo_extracao, 0, 'processado'
                    );
                    total_registros := total_registros + 1;
                END LOOP;
            END IF;
            
            -- Processar anexos (se não tem itens)
            IF (edital_record.itens IS NULL OR jsonb_array_length(edital_record.itens) = 0) 
               AND edital_record.anexos IS NOT NULL AND jsonb_array_length(edital_record.anexos) > 0 THEN
                FOR anexo_record IN 
                    SELECT * FROM jsonb_array_elements(edital_record.anexos) WITH ORDINALITY AS t(anexo, idx)
                LOOP
                    INSERT INTO editais_final_estruturados (
                        id_pncp, url_edital, cnpj_orgao, orgao,
                        ano, numero, titulo_edital, numero_controle_pncp,
                        modalidade, situacao, valor_estimado, valor_homologado,
                        data_publicacao, data_extracao, data_referencia,
                        objeto, objeto_completo, total_itens, total_anexos, total_historico,
                        anexo_nome, anexo_url, anexo_tipo,
                        metodo_extracao, tempo_extracao, tentativas_processamento, status_processamento
                    ) VALUES (
                        edital_record.id_pncp, edital_record.url_edital, edital_record.cnpj_orgao, 
                        edital_record.orgao, edital_record.ano, 
                        edital_record.numero, edital_record.titulo_edital, 
                        COALESCE((edital_record.objeto_completo->>'numero_controle_pncp'), ''),
                        COALESCE((edital_record.objeto_completo->>'modalidade'), ''),
                        COALESCE((edital_record.objeto_completo->>'situacao'), ''),
                        COALESCE((edital_record.dados_financeiros->>'valor_estimado')::NUMERIC, 0),
                        COALESCE((edital_record.dados_financeiros->>'valor_homologado')::NUMERIC, 0),
                        COALESCE((edital_record.objeto_completo->>'data_publicacao')::TIMESTAMP, edital_record.data_extracao),
                        edital_record.data_extracao,
                        edital_record.data_extracao::DATE,
                        COALESCE((edital_record.objeto_completo->>'objeto'), ''),
                        COALESCE(edital_record.objeto_completo::TEXT, '{}'),
                        0,
                        jsonb_array_length(edital_record.anexos),
                        COALESCE(jsonb_array_length(edital_record.historico), 0),
                        COALESCE(anexo_record.anexo->>'nome', anexo_record.anexo->>'titulo', 'Documento ' || anexo_record.idx),
                        COALESCE(anexo_record.anexo->>'url', anexo_record.anexo->>'link', ''),
                        COALESCE(anexo_record.anexo->>'tipo', 'documento'),
                        edital_record.metodo_extracao, edital_record.tempo_extracao, 0, 'processado'
                    );
                    total_registros := total_registros + 1;
                END LOOP;
            END IF;
            
            -- Processar histórico (se não tem itens nem anexos)
            IF (edital_record.itens IS NULL OR jsonb_array_length(edital_record.itens) = 0) 
               AND (edital_record.anexos IS NULL OR jsonb_array_length(edital_record.anexos) = 0)
               AND edital_record.historico IS NOT NULL AND jsonb_array_length(edital_record.historico) > 0 THEN
                FOR historico_record IN 
                    SELECT * FROM jsonb_array_elements(edital_record.historico) WITH ORDINALITY AS t(historico, idx)
                LOOP
                    INSERT INTO editais_final_estruturados (
                        id_pncp, url_edital, cnpj_orgao, orgao,
                        ano, numero, titulo_edital, numero_controle_pncp,
                        modalidade, situacao, valor_estimado, valor_homologado,
                        data_publicacao, data_extracao, data_referencia,
                        objeto, objeto_completo, total_itens, total_anexos, total_historico,
                        historico_data, historico_evento, historico_descricao,
                        metodo_extracao, tempo_extracao, tentativas_processamento, status_processamento
                    ) VALUES (
                        edital_record.id_pncp, edital_record.url_edital, edital_record.cnpj_orgao, 
                        edital_record.orgao, edital_record.ano, 
                        edital_record.numero, edital_record.titulo_edital, 
                        COALESCE((edital_record.objeto_completo->>'numero_controle_pncp'), ''),
                        COALESCE((edital_record.objeto_completo->>'modalidade'), ''),
                        COALESCE((edital_record.objeto_completo->>'situacao'), ''),
                        COALESCE((edital_record.dados_financeiros->>'valor_estimado')::NUMERIC, 0),
                        COALESCE((edital_record.dados_financeiros->>'valor_homologado')::NUMERIC, 0),
                        COALESCE((edital_record.objeto_completo->>'data_publicacao')::TIMESTAMP, edital_record.data_extracao),
                        edital_record.data_extracao,
                        edital_record.data_extracao::DATE,
                        COALESCE((edital_record.objeto_completo->>'objeto'), ''),
                        COALESCE(edital_record.objeto_completo::TEXT, '{}'),
                        0, 0,
                        jsonb_array_length(edital_record.historico),
                        COALESCE((historico_record.historico->>'data')::TIMESTAMP, (historico_record.historico->>'timestamp')::TIMESTAMP),
                        COALESCE(historico_record.historico->>'evento', historico_record.historico->>'tipo', 'Evento ' || historico_record.idx),
                        COALESCE(historico_record.historico->>'descricao', historico_record.historico::TEXT),
                        edital_record.metodo_extracao, edital_record.tempo_extracao, 0, 'processado'
                    );
                    total_registros := total_registros + 1;
                END LOOP;
            END IF;
        END IF;
    END LOOP;
    
    RETURN total_registros;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEW PARA MONITORAMENTO
-- =====================================================
CREATE OR REPLACE VIEW v_editais_final_resumo AS
SELECT 
    COUNT(*) as total_registros,
    COUNT(DISTINCT id_pncp) as total_editais_unicos,
    COUNT(DISTINCT cnpj_orgao) as total_orgaos,
    COUNT(DISTINCT ano) as total_anos,
    SUM(total_itens) as total_itens_geral,
    SUM(total_anexos) as total_anexos_geral,
    SUM(total_historico) as total_historico_geral,
    AVG(tempo_extracao) as tempo_medio_extracao,
    MIN(data_extracao) as primeira_extracao,
    MAX(data_extracao) as ultima_extracao
FROM editais_final_estruturados;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE editais_final_estruturados IS 'Tabela final estruturada com dados desnormalizados para facilitar exportação e análise';
COMMENT ON FUNCTION popular_tabela_final_estruturados() IS 'Função para popular a tabela final com dados desnormalizados dos editais estruturados';
COMMENT ON VIEW v_editais_final_resumo IS 'View com resumo estatístico da tabela final estruturada';
