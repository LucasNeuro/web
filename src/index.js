const express = require('express');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const extrator = require('./extrator');
const processador = require('./processar');
const scheduler = require('./scheduler');
const supabase = require('./config/supabase');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Servir arquivos estaticos do dashboard
app.use(express.static(path.join(__dirname, '..', 'public')));

// Rota principal - Dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'PNCP API Client - Documentacao'
}));

// Swagger JSON
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * @swagger
 * /api/info:
 *   get:
 *     summary: Informacoes da API
 *     description: Retorna informacoes basicas sobre a API
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Informacoes da API
 */
app.get('/api/info', (req, res) => {
  res.json({
    message: 'Extrator de Editais PNCP',
    versao: '2.0.0',
    documentacao: '/api-docs',
    dashboard: '/',
    endpoints: {
      extrair: 'POST /api/extrair - Extrai editais do dia anterior',
      processar: 'POST /api/processar - Processa editais pendentes (scraping completo)',
      processarUrl: 'POST /api/processar-url - Processa uma URL específica',
      status: 'GET /api/processar/status - Status do processamento',
      testeCompleto: 'POST /api/teste-completo - Teste completo do sistema (extração + scraping)',
      scheduler: 'POST /api/scheduler/executar - Executa processo completo',
      configurar: 'POST /api/scheduler/configurar - Configura horário e parâmetros',
      schedulerStatus: 'GET /api/scheduler/status - Status do scheduler',
      historico: 'GET /api/scheduler/historico - Histórico de execuções',
      statusSistema: 'GET /api/status-sistema - Status geral do sistema',
      pendentes: 'GET /api/pendentes - Lista editais pendentes'
    }
  });
});

/**
 * @swagger
 * /api/extrair:
 *   post:
 *     summary: Extrair editais do dia anterior
 *     description: Busca e salva editais publicados no dia anterior (limite 4700)
 *     tags: [Extrator]
 *     responses:
 *       200:
 *         description: Extracao realizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                 totalEditais:
 *                   type: integer
 *                 dataReferencia:
 *                   type: string
 *                 arquivo:
 *                   type: string
 *       500:
 *         description: Erro ao extrair editais
 */
app.post('/api/extrair', async (req, res) => {
  try {
    const dados = await extrator.extrairEditaisCompleto();
    const resultado = await extrator.salvarSupabase(dados);
    
    res.json({
      sucesso: resultado.sucesso,
      totalEditais: dados.totalEditais,
      totalSalvos: resultado.totalSalvos,
      totalErros: resultado.totalErros,
      dataReferencia: dados.dataReferencia
    });
  } catch (error) {
    res.status(500).json({ 
      sucesso: false,
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/processar:
 *   post:
 *     summary: Processar editais pendentes (scraping completo)
 *     description: Busca URLs da tabela editais_pncp e extrai dados completos de cada edital
 *     tags: [Scraper]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               limite:
 *                 type: integer
 *                 default: 100
 *                 description: Quantidade máxima de editais a processar
 *     responses:
 *       200:
 *         description: Processamento iniciado/concluído
 *       500:
 *         description: Erro ao processar
 */
app.post('/api/processar', async (req, res) => {
  try {
    const limite = req.body.limite || 100;
    
    // Verificar se já está processando
    const status = processador.getStatusRefinado();
    if (status.isProcessing) {
      return res.status(409).json({ 
        erro: 'Processamento já está em andamento',
        status: status
      });
    }
    
    // Responder imediatamente e executar processamento em background
    res.json({ 
      sucesso: true, 
      mensagem: 'Processamento iniciado em background',
      limite: limite
    });
    
    // Executar processamento em background (não aguardar)
    processador.processarEditaisRefinado(limite)
      .then(resultado => {
        console.log('[API] Processamento concluído:', resultado);
      })
      .catch(error => {
        console.error('[API] Erro no processamento:', error);
      });
      
  } catch (error) {
    res.status(500).json({ 
      erro: error.message 
    });
  }
});

/**
 * @swagger
 * /api/processar-url:
 *   post:
 *     summary: Processar uma URL específica (teste)
 *     description: Extrai dados completos de um edital específico
 *     tags: [Scraper]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL completa do edital no PNCP
 *     responses:
 *       200:
 *         description: Edital processado com sucesso
 *       500:
 *         description: Erro ao processar
 */
app.post('/api/processar-url', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        erro: 'URL é obrigatória' 
      });
    }
    
    const resultado = await processador.processarUmaURLRefinada(url);
    
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ 
      erro: error.message 
    });
  }
});

/**
 * @swagger
 * /api/processar/status:
 *   get:
 *     summary: Status do processamento
 *     description: Retorna o status atual do processamento de editais
 *     tags: [Scraper]
 *     responses:
 *       200:
 *         description: Status do processamento
 */
app.get('/api/processar/status', (req, res) => {
  const status = processador.getStatusRefinado();
  res.json(status);
});

// Endpoint para listar editais estruturados com paginação
app.get('/api/editais-estruturados', async (req, res) => {
  try {
    const { 
      pagina = 1, 
      limite = 20, 
      ordenacao = 'data_extracao', 
      direcao = 'desc'
    } = req.query;

    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    
    // Aplicar ordenação
    const camposValidos = ['titulo_edital', 'orgao', 'cnpj_orgao', 'ano', 'data_extracao', 'created_at'];
    const campoOrdenacao = camposValidos.includes(ordenacao) ? ordenacao : 'data_extracao';
    const direcaoOrdenacao = direcao === 'asc';

    // Buscar dados
    const { data, error } = await supabase
      .from('editais_estruturados')
      .select('*')
      .order(campoOrdenacao, { ascending: direcaoOrdenacao })
      .range(offset, offset + parseInt(limite) - 1);

    if (error) {
      throw error;
    }

    // Contar total de registros
    const { count } = await supabase
      .from('editais_estruturados')
      .select('*', { count: 'exact', head: true });

    const total = count || 0;

    res.json({
      sucesso: true,
      dados: data || [],
      total: parseInt(total),
      pagina: parseInt(pagina),
      limite: parseInt(limite),
      totalPaginas: Math.ceil(total / parseInt(limite))
    });

  } catch (error) {
    console.error('Erro ao buscar editais estruturados:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

// Endpoint para popular tabela final estruturada
app.post('/api/popular-tabela-final', async (req, res) => {
  try {
    console.log('[API] Estrutura simplificada - dados já disponíveis na view');
    
    // Com a nova estrutura, os dados já estão disponíveis na view
    // Não precisamos mais popular uma tabela separada
    
    res.json({
      sucesso: true,
      mensagem: `Dados já disponíveis na estrutura simplificada`,
      total_registros: 'N/A - Dados em tempo real'
    });

  } catch (error) {
    console.error('Erro ao acessar dados:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

// Endpoint para listar dados da tabela final
app.get('/api/editais-final', async (req, res) => {
  try {
    const { 
      pagina = 1, 
      limite = 100, 
      ordenacao = 'data_extracao', 
      direcao = 'desc',
      formato = 'json' // json ou csv
    } = req.query;

    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    
    // Aplicar ordenação
    const camposValidos = ['titulo_edital', 'orgao', 'cnpj_orgao', 'ano', 'data_extracao', 'item_numero'];
    const campoOrdenacao = camposValidos.includes(ordenacao) ? ordenacao : 'data_extracao';
    const direcaoOrdenacao = direcao === 'asc';

    // Buscar dados da view simplificada
    const { data, error } = await supabase
      .from('v_editais_final_export')
      .select('*')
      .order(campoOrdenacao, { ascending: direcaoOrdenacao })
      .range(offset, offset + parseInt(limite) - 1);

    if (error) {
      throw error;
    }

    // Contar total de registros
    const { count } = await supabase
      .from('v_editais_final_export')
      .select('*', { count: 'exact', head: true });

    const total = count || 0;

    if (formato === 'csv') {
      // Para CSV, buscar dados completos da tabela editais_estruturados
      const { data: dadosCompletos, error: errorCompletos } = await supabase
        .from('editais_estruturados')
        .select('*')
        .order('data_extracao', { ascending: false });

      if (errorCompletos) {
        throw errorCompletos;
      }

      // Gerar CSV com dados estruturados
      const csvHeaders = [
        'ID PNCP', 'URL Edital', 'CNPJ Órgão', 'Órgão',
        'Ano', 'Número', 'Título Edital', 'Modalidade', 'Situação',
        'Valor Estimado', 'Valor Homologado', 'Data Publicação', 'Data Extração',
        'Objeto', 'Total Itens', 'Total Anexos', 'Total Histórico',
        'Link Documento 1', 'Link Documento 2', 'Link Documento 3', 'Link Documento 4', 'Link Documento 5',
        'Link Documento 6', 'Link Documento 7', 'Link Documento 8', 'Link Documento 9', 'Link Documento 10',
        'Nome Documento 1', 'Nome Documento 2', 'Nome Documento 3', 'Nome Documento 4', 'Nome Documento 5',
        'Nome Documento 6', 'Nome Documento 7', 'Nome Documento 8', 'Nome Documento 9', 'Nome Documento 10',
        'Bloco Itens', 'Bloco Histórico',
        'Todos Itens (JSON)', 'Todos Anexos (JSON)', 'Todo Histórico (JSON)',
        'Objeto Completo (JSON)', 'Dados Financeiros (JSON)'
      ];

      const csvRows = dadosCompletos.map(row => {
        // Extrair links de documentos (até 10)
        const links = [];
        const nomes = [];
        for (let i = 0; i < 10; i++) {
          links.push(row.anexos?.[i]?.url || '');
          nomes.push(row.anexos?.[i]?.nome || '');
        }
        
        // Criar bloco de itens
        const blocoItens = row.itens?.map((item, index) => 
          `ITEM ${item.numero || index + 1}: ${item.descricao || 'N/A'} | QTD: ${item.quantidade || '0'} | VALOR: R$ ${item.valor_total || '0,00'}`
        ).join('\n') || '';
        
        // Criar bloco de histórico
        const blocoHistorico = row.historico?.map(evento => 
          `EVENTO: ${evento.evento || 'N/A'} | DATA: ${evento.data || 'N/A'} | DESC: ${evento.descricao || 'N/A'}`
        ).join('\n') || '';
        
        return [
          row.id_pncp || '',
          row.url_edital || '',
          row.cnpj_orgao || '',
          row.orgao || '',
          row.ano || '',
          row.numero || '',
          (row.titulo_edital || '').replace(/"/g, '""'),
          (row.objeto_completo?.modalidade || '').replace(/"/g, '""'),
          (row.objeto_completo?.situacao || '').replace(/"/g, '""'),
          row.dados_financeiros?.valor_estimado || '',
          row.dados_financeiros?.valor_homologado || '',
          row.objeto_completo?.data_publicacao || '',
          row.data_extracao || '',
          (row.objeto_completo?.objeto || '').replace(/"/g, '""'),
          row.itens ? row.itens.length : 0,
          row.anexos ? row.anexos.length : 0,
          row.historico ? row.historico.length : 0,
          // Links de documentos (10 colunas)
          ...links,
          // Nomes de documentos (10 colunas)
          ...nomes,
          // Blocos de texto
          blocoItens.replace(/"/g, '""'),
          blocoHistorico.replace(/"/g, '""'),
          // JSONs completos
          JSON.stringify(row.itens || []).replace(/"/g, '""'),
          JSON.stringify(row.anexos || []).replace(/"/g, '""'),
          JSON.stringify(row.historico || []).replace(/"/g, '""'),
          JSON.stringify(row.objeto_completo || {}).replace(/"/g, '""'),
          JSON.stringify(row.dados_financeiros || {}).replace(/"/g, '""')
        ];
      });

      const csvContent = [
        csvHeaders.map(h => `"${h}"`).join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="editais_final_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\uFEFF' + csvContent); // BOM para UTF-8
      return;
    }

    res.json({
      sucesso: true,
      dados: data || [],
      total: parseInt(total),
      pagina: parseInt(pagina),
      limite: parseInt(limite),
      totalPaginas: Math.ceil(total / parseInt(limite))
    });

  } catch (error) {
    console.error('Erro ao buscar editais final:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

// Endpoint para resumo da tabela final
app.get('/api/editais-final/resumo', async (req, res) => {
  try {
    // Buscar resumo diretamente da view
    const { data, error } = await supabase
      .from('v_editais_final_export')
      .select('*');

    if (error) {
      throw error;
    }

    // Calcular resumo dos dados
    const resumo = {
      total_registros: data.length,
      editais_unicos: new Set(data.map(item => item.id_pncp)).size,
      orgaos: new Set(data.map(item => item.orgao).filter(Boolean)).size,
      total_itens: data.reduce((sum, item) => sum + (item.item_numero || 0), 0)
    };

    res.json({
      sucesso: true,
      resumo: resumo
    });

  } catch (error) {
    console.error('Erro ao buscar resumo da tabela final:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

// Endpoint para listar editais problemáticos
app.get('/api/editais-problematicos', async (req, res) => {
  try {
    const { 
      pagina = 1, 
      limite = 20, 
      tipo = 'todos' // todos, falha_multipla, lento, sem_itens, outro
    } = req.query;

    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    
    let query = supabase
      .from('v_editais_problematicos')
      .select('*')
      .order('tentativas_processamento', { ascending: false })
      .order('created_at', { ascending: false });

    // Aplicar filtro por tipo de problema
    if (tipo !== 'todos') {
      query = query.eq('tipo_problema', tipo.toUpperCase());
    }

    const { data, error } = await query.range(offset, offset + parseInt(limite) - 1);

    if (error) {
      throw error;
    }

    // Contar total de registros
    let countQuery = supabase
      .from('v_editais_problematicos')
      .select('*', { count: 'exact', head: true });

    if (tipo !== 'todos') {
      countQuery = countQuery.eq('tipo_problema', tipo.toUpperCase());
    }

    const { count } = await countQuery;
    const total = count || 0;

    res.json({
      sucesso: true,
      dados: data || [],
      total: parseInt(total),
      pagina: parseInt(pagina),
      limite: parseInt(limite),
      totalPaginas: Math.ceil(total / parseInt(limite))
    });

  } catch (error) {
    console.error('Erro ao buscar editais problemáticos:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

// Endpoint para resetar editais falhados
app.post('/api/reset-editais-falhados', async (req, res) => {
  try {
    console.log('[API] Resetando editais falhados...');
    
    const { data, error } = await supabase.rpc('reset_editais_falhados');
    
    if (error) {
      throw error;
    }

    const totalResetados = data?.[0]?.total_resetados || 0;
    
    console.log(`[API] ${totalResetados} editais resetados com sucesso`);
    
    res.json({
      sucesso: true,
      mensagem: `${totalResetados} editais falhados foram resetados`,
      total_resetados: totalResetados
    });

  } catch (error) {
    console.error('Erro ao resetar editais falhados:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

// Endpoint para reprocessar edital específico
app.post('/api/reprocessar-edital', async (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({
        sucesso: false,
        erro: 'ID do edital é obrigatório'
      });
    }

    console.log(`[API] Reprocessando edital: ${id}`);
    
    // Resetar tentativas do edital
    const { error: resetError } = await supabase
      .from('editais_pncp')
      .update({
        tentativas_processamento: 0,
        ultimo_erro: null,
        status_processamento: 'pendente',
        processado: false
      })
      .eq('id', id);

    if (resetError) {
      throw resetError;
    }
    
    res.json({
      sucesso: true,
      mensagem: 'Edital marcado para reprocessamento'
    });

  } catch (error) {
    console.error('Erro ao reprocessar edital:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

/**
 * @swagger
 * /api/scheduler/progresso:
 *   get:
 *     summary: Progresso do scheduler em tempo real
 *     description: Retorna o progresso atual da execução do scheduler
 *     tags: [Scheduler]
 *     responses:
 *       200:
 *         description: Progresso atual
 */
app.get('/api/scheduler/progresso', (req, res) => {
  const status = scheduler.getStatus();
  const processadorStatus = processador.getStatusRefinado();
  
  res.json({
    scheduler: status,
    processador: processadorStatus,
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/scheduler/executar:
 *   post:
 *     summary: Executar processo completo manualmente
 *     description: Executa extração + processamento completo (extrai URLs do dia anterior e processa editais)
 *     tags: [Scheduler]
 *     responses:
 *       200:
 *         description: Processo executado com sucesso
 *       500:
 *         description: Erro ao executar processo
 */
app.post('/api/scheduler/executar', async (req, res) => {
  try {
    const resultado = await scheduler.executarProcessoCompleto();
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ 
      erro: error.message 
    });
  }
});

/**
 * @swagger
 * /api/teste-completo:
 *   post:
 *     summary: Teste completo do sistema
 *     description: Executa todo o processo (extração + scraping) para testar se está funcionando
 *     tags: [Sistema]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               limite:
 *                 type: integer
 *                 default: 5
 *                 description: Quantidade de editais para processar no teste
 *               forcarExtracao:
 *                 type: boolean
 *                 default: true
 *                 description: Forçar extração mesmo se já existirem dados do dia
 *     responses:
 *       200:
 *         description: Teste executado com sucesso
 *       500:
 *         description: Erro durante o teste
 */
app.post('/api/teste-completo', async (req, res) => {
  try {
    const limite = req.body.limite || 5;
    const forcarExtracao = req.body.forcarExtracao !== false;
    
    console.log(`[TESTE] Iniciando teste completo com limite: ${limite}`);
    
    // 1. Extrair URLs do dia anterior
    console.log('[TESTE] Passo 1: Extraindo URLs...');
    const dadosExtracao = await extrator.extrairEditaisCompleto();
    
    // Se não forçar e já tiver dados, usar os existentes
    if (!forcarExtracao) {
      console.log('[TESTE] Verificando se já existem dados do dia...');
      const hoje = new Date().toISOString().split('T')[0];
      const { data: editaisExistentes } = await require('./config/supabase')
        .from('editais_pncp')
        .select('*')
        .eq('data_referencia', hoje);
      
      if (editaisExistentes && editaisExistentes.length > 0) {
        console.log(`[TESTE] Encontrados ${editaisExistentes.length} editais existentes, usando-os`);
        dadosExtracao.editais = editaisExistentes;
        dadosExtracao.totalEditais = editaisExistentes.length;
      }
    }
    
    const resultadoExtracao = await extrator.salvarSupabase(dadosExtracao);
    
    // 2. Processar editais (scraping)
    console.log(`[TESTE] Passo 2: Processando ${limite} editais...`);
    const resultadoProcessamento = await processador.processarEditaisRefinado(limite);
    
    // 3. Resultado final
    const resultado = {
      sucesso: true,
      timestamp: new Date().toISOString(),
      teste: true,
      extração: {
        totalEncontrados: dadosExtracao.totalEditais,
        totalSalvos: resultadoExtracao.totalSalvos,
        totalErros: resultadoExtracao.totalErros,
        dataReferencia: dadosExtracao.dataReferencia
      },
      processamento: {
        limite: limite,
        totalProcessados: resultadoProcessamento.totalProcessados || 0,
        totalSalvos: resultadoProcessamento.totalSalvos || 0,
        totalErros: resultadoProcessamento.totalErros || 0,
        tempoMedio: resultadoProcessamento.tempoMedio || 0
      },
      resumo: {
        editaisExtraidos: resultadoExtracao.totalSalvos,
        editaisProcessados: resultadoProcessamento.totalSalvos || 0,
        sucessoTotal: resultadoExtracao.totalSalvos + (resultadoProcessamento.totalSalvos || 0),
        errosTotal: resultadoExtracao.totalErros + (resultadoProcessamento.totalErros || 0)
      }
    };
    
    console.log('[TESTE] Teste completo finalizado com sucesso!');
    res.json(resultado);
    
  } catch (error) {
    console.error('[TESTE] Erro no teste completo:', error.message);
    res.status(500).json({ 
      sucesso: false,
      erro: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/scheduler/configurar:
 *   post:
 *     summary: Configurar scheduler
 *     description: Configura horário de execução, quantidade de processamento e outros parâmetros
 *     tags: [Scheduler]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               horaExecucao:
 *                 type: string
 *                 format: time
 *                 example: "08:00"
 *                 description: Hora de execução diária (formato HH:MM)
 *               ativo:
 *                 type: boolean
 *                 default: true
 *                 description: Se o scheduler está ativo
 *               limiteProcessamento:
 *                 type: integer
 *                 default: 100
 *                 description: Quantidade máxima de editais a processar por execução
 *               diasRetroativos:
 *                 type: integer
 *                 default: 1
 *                 description: Quantos dias retroativos para extrair (1 = dia anterior)
 *     responses:
 *       200:
 *         description: Scheduler configurado com sucesso
 *       500:
 *         description: Erro ao configurar scheduler
 */
app.post('/api/scheduler/configurar', async (req, res) => {
  try {
    const resultado = await scheduler.configurarScheduler(req.body);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ 
      erro: error.message 
    });
  }
});

/**
 * @swagger
 * /api/scheduler/status:
 *   get:
 *     summary: Status do scheduler
 *     description: Retorna o status atual do scheduler e configurações
 *     tags: [Scheduler]
 *     responses:
 *       200:
 *         description: Status do scheduler
 */
app.get('/api/scheduler/status', (req, res) => {
  const status = scheduler.getStatus();
  res.json(status);
});

/**
 * @swagger
 * /api/scheduler/historico:
 *   get:
 *     summary: Histórico de execuções
 *     description: Retorna o histórico das últimas execuções do scheduler
 *     tags: [Scheduler]
 *     parameters:
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Quantidade de execuções a retornar
 *     responses:
 *       200:
 *         description: Histórico de execuções
 */
app.get('/api/scheduler/historico', async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 10;
    const resultado = await scheduler.getHistoricoExecucoes(limite);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ 
      erro: error.message 
    });
  }
});

/**
 * @swagger
 * /api/status-sistema:
 *   get:
 *     summary: Status geral do sistema
 *     description: Retorna metricas gerais de processamento
 *     tags: [Monitoramento]
 *     responses:
 *       200:
 *         description: Status retornado
 */
app.get('/api/status-sistema', async (req, res) => {
  try {
    const { data, error } = await require('./config/supabase')
      .from('v_status_sistema')
      .select('*')
      .single();

    if (error) throw error;

    res.json({
      sucesso: true,
      timestamp: new Date().toISOString(),
      data: data
    });
  } catch (error) {
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

/**
 * @swagger
 * /api/pendentes:
 *   get:
 *     summary: Lista editais pendentes
 *     description: Retorna editais que ainda nao foram processados
 *     tags: [Monitoramento]
 *     parameters:
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Lista retornada
 */
app.get('/api/pendentes', async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 50;
    const supabase = require('./config/supabase');

    const { data, error, count } = await supabase
      .from('v_editais_pendentes')
      .select('*', { count: 'exact' })
      .limit(limite);

    if (error) throw error;

    res.json({
      sucesso: true,
      total: count,
      limite: limite,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

app.listen(PORT, async () => {
  console.log(`[SERVER] Servidor rodando na porta ${PORT}`);
  console.log(`[API] URL Base da API PNCP: ${process.env.PNCP_API_BASE_URL}`);
  console.log(`\n[DASHBOARD] http://localhost:${PORT}`);
  console.log(`[API INFO] http://localhost:${PORT}/api/info`);
  console.log(`[SWAGGER] http://localhost:${PORT}/api-docs`);
  console.log(`[SWAGGER JSON] http://localhost:${PORT}/swagger.json\n`);
  
  // Inicializar scheduler
  try {
    await scheduler.inicializar();
    console.log('[SCHEDULER] ✅ Scheduler inicializado com sucesso');
  } catch (error) {
    console.error('[SCHEDULER] ❌ Erro ao inicializar scheduler:', error.message);
  }
});

// Endpoint para buscar edital específico com dados completos
app.get('/api/edital/:idPncp', async (req, res) => {
  try {
    const { idPncp } = req.params;
    
    const { data, error } = await supabase
      .from('editais_estruturados')
      .select('*')
      .eq('id_pncp', idPncp)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          sucesso: false,
          erro: 'Edital não encontrado'
        });
      }
      throw error;
    }

    res.json({
      sucesso: true,
      data: data
    });
  } catch (error) {
    console.error('Erro ao buscar edital:', error);
    res.status(500).json({ 
      erro: 'Erro ao buscar edital',
      detalhes: error.message 
    });
  }
});

module.exports = app;

