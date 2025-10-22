const express = require('express');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const ExtratorAPI = require('./extrator-api');
const extratorAPI = new ExtratorAPI();
const scheduler = require('./scheduler');
const supabase = require('./config/supabase');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

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

// Rota principal - API Info
app.get('/', (req, res) => {
  res.json({
    mensagem: 'PNCP API Client - Sistema Simplificado',
    versao: '2.0.0',
    endpoints: {
      extrair: 'POST /api/extrair - Extrair editais dos últimos 7 dias',
      scheduler: 'GET /api/scheduler - Configurar e verificar scheduler',
      health: 'GET /api/health - Status do sistema',
      docs: 'GET /api-docs - Documentação Swagger'
    },
    documentacao: 'http://localhost:10000/api-docs'
  });
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
 * /api/extrair:
 *   post:
 *     summary: Extrair editais dos últimos 7 dias
 *     description: Extrai até 7500 editais dos últimos 7 dias com deduplicação automática
 *     tags: [Extração]
 *     responses:
 *       200:
 *         description: Extração iniciada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "iniciado"
 *                 mensagem:
 *                   type: string
 *                   example: "Extração iniciada - processando editais dos últimos 7 dias"
 *                 limite:
 *                   type: number
 *                   example: 7500
 *                 dias:
 *                   type: number
 *                   example: 7
 */
app.post('/api/extrair', async (req, res) => {
  try {
    const { dias = 1, limite = 5600 } = req.body;
    
    console.log(`[API] Iniciando extração de ${dias} dias com limite de ${limite} editais...`);
    
    // Executar extração em background
    extratorAPI.extrairEditaisCompleto({
      diasRetroativos: dias,
      limite: limite
    }).then(resultado => {
      console.log('[API] Extração concluída:', resultado);
    }).catch(erro => {
      console.error('[API] Erro na extração:', erro);
    });
    
    res.json({
      status: 'iniciado',
      mensagem: `Extração iniciada em background para ${dias} dias`,
      dias: dias,
      limite: limite,
      modo: dias === 1 ? 'scheduler' : 'historico'
    });
    
  } catch (error) {
    console.error('[API] Erro ao iniciar extração:', error);
    res.status(500).json({
      status: 'erro',
      mensagem: 'Erro ao iniciar extração: ' + error.message
    });
  }
});

/**
 * @swagger
 * /api/scheduler:
 *   get:
 *     summary: Status e configuração do scheduler
 *     description: Retorna o status atual do scheduler e permite configurar horário
 *     tags: [Scheduler]
 *     parameters:
 *       - in: query
 *         name: hora
 *         schema:
 *           type: string
 *           example: "22:30"
 *         description: Nova hora para execução (formato HH:MM)
 *     responses:
 *       200:
 *         description: Status do scheduler
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ativo:
 *                   type: boolean
 *                   example: true
 *                 horaExecucao:
 *                   type: string
 *                   example: "22:30"
 *                 proximaExecucao:
 *                   type: string
 *                   example: "2025-10-23T22:30:00Z"
 *                 ultimaExecucao:
 *                   type: string
 *                   example: "2025-10-22T22:30:00Z"
 *                 diasRetroativos:
 *                   type: number
 *                   example: 1
 *                 limiteProcessamento:
 *                   type: number
 *                   example: 6500
 */
app.get('/api/scheduler', async (req, res) => {
  try {
    const { hora } = req.query;
    
    // Se foi fornecida uma nova hora, atualizar
    if (hora) {
      await scheduler.configurarHorario(hora);
      console.log(`[API] Scheduler configurado para ${hora}`);
    }
    
    // Obter status atual
    const status = await scheduler.obterStatus();
    
    res.json({
      ativo: status.ativo,
      horaExecucao: status.horaExecucao,
      proximaExecucao: status.proximaExecucao,
      ultimaExecucao: status.ultimaExecucao,
      diasRetroativos: status.diasRetroativos,
      limiteProcessamento: status.limiteProcessamento,
      mensagem: 'Scheduler configurado para extrair editais do dia anterior automaticamente'
    });
    
  } catch (error) {
    console.error('[API] Erro ao obter status do scheduler:', error);
    res.status(500).json({
      status: 'erro',
      mensagem: 'Erro ao obter status do scheduler: ' + error.message
    });
  }
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Status de saúde do sistema
 *     description: Verifica se o sistema está funcionando corretamente
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Sistema funcionando
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 timestamp:
 *                   type: string
 *                   example: "2025-10-22T21:30:00Z"
 *                 versao:
 *                   type: string
 *                   example: "2.0.0"
 *                 funcionalidades:
 *                   type: object
 *                   properties:
 *                     apiPNCP:
 *                       type: boolean
 *                       example: true
 *                     bancoDados:
 *                       type: boolean
 *                       example: true
 *                     scheduler:
 *                       type: boolean
 *                       example: true
 */
app.get('/api/health', async (req, res) => {
  try {
    // Verificar conexão com banco
    const { data, error } = await supabase
      .from('editais_completos')
      .select('count')
      .limit(1);
    
    const bancoOk = !error;
    
    // Verificar scheduler
    const statusScheduler = await scheduler.obterStatus();
    const schedulerOk = statusScheduler.ativo;
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      versao: '2.0.0',
      funcionalidades: {
        apiPNCP: true,
        bancoDados: bancoOk,
        scheduler: schedulerOk
      },
      mensagem: 'Sistema funcionando corretamente'
    });
    
  } catch (error) {
    console.error('[API] Erro no health check:', error);
    res.status(500).json({
      status: 'erro',
      timestamp: new Date().toISOString(),
      mensagem: 'Erro no sistema: ' + error.message
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`[SERVER] Servidor rodando na porta ${PORT}`);
  console.log(`[API] URL Base da API PNCP: https://pncp.gov.br/api`);
  console.log(`[API INFO] http://localhost:${PORT}/api/health`);
  console.log(`[API DOCS] http://localhost:${PORT}/api-docs`);
  console.log(`[API JSON] http://localhost:${PORT}/swagger.json`);
  console.log(`[ENDPOINTS]`);
  console.log(`  POST /api/extrair - Extrair editais dos últimos 7 dias`);
  console.log(`  GET  /api/scheduler - Configurar scheduler`);
  console.log(`  GET  /api/health - Status do sistema\n`);
  
  // Inicializar scheduler
  scheduler.inicializar();
});
