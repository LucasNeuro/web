const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const extrator = require('./extrator');
const processador = require('./processar');
const scheduler = require('./scheduler');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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
 * /:
 *   get:
 *     summary: Informacoes da API
 *     description: Retorna informacoes basicas sobre a API
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Informacoes da API
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Extrator de Editais PNCP',
    versao: '1.0.0',
    documentacao: '/api-docs',
    endpoints: {
      extrair: 'POST /api/extrair - Extrai editais do dia anterior',
      processar: 'POST /api/processar - Processa editais pendentes (scraping completo)',
      processarUrl: 'POST /api/processar-url - Processa uma URL específica',
      status: 'GET /api/processar/status - Status do processamento',
      scheduler: 'POST /api/scheduler/executar - Executa processo completo',
      configurar: 'POST /api/scheduler/configurar - Configura horário e parâmetros',
      schedulerStatus: 'GET /api/scheduler/status - Status do scheduler',
      historico: 'GET /api/scheduler/historico - Histórico de execuções'
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
    const dados = await extrator.extrairEditaisDiaAnterior();
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
    
    // Iniciar processamento (pode demorar muito)
    // Em produção, considere usar worker/background job
    const resultado = await processador.processarEditais(limite);
    
    res.json(resultado);
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
    
    const resultado = await processador.processarUmaURL(url);
    
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
  const status = processador.getStatus();
  res.json(status);
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

app.listen(PORT, async () => {
  console.log(`[SERVER] Servidor rodando na porta ${PORT}`);
  console.log(`[API] URL Base da API PNCP: ${process.env.PNCP_API_BASE_URL}`);
  console.log(`\n[ACESSO] http://localhost:${PORT}`);
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

module.exports = app;

