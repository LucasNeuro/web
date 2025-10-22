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

// Servir arquivos estáticos do frontend
app.use(express.static('public'));

// Rota para o frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Rota da API Info
app.get('/api', (req, res) => {
  res.json({
    mensagem: 'PNCP API Client',
    versao: '2.0.0',
    endpoints: {
      sistema: {
        extrair: 'POST /api/extrair - Extrair editais',
        scheduler: 'GET /api/scheduler - Status do scheduler',
        health: 'GET /api/health - Health check',
        docs: 'GET /api-docs - Documentação Swagger'
      },
      frontend: {
        listar: 'GET /api/editais - Listar editais com filtros',
        detalhes: 'GET /api/editais/:numeroControle - Detalhes do edital',
        itens: 'GET /api/editais/:numeroControle/itens - Itens do edital',
        documentos: 'GET /api/editais/:numeroControle/documentos - Documentos',
        historico: 'GET /api/editais/:numeroControle/historico - Histórico',
        estatisticas: 'GET /api/estatisticas - Estatísticas gerais'
      }
    },
    documentacao: 'http://localhost:10000/api-docs',
    frontend: 'http://localhost:10000/'
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

// ============================================================
// ROTAS PARA FRONTEND - DADOS ESTRUTURADOS
// ============================================================

/**
 * @swagger
 * /api/editais:
 *   get:
 *     summary: Listar editais com filtros
 *     description: Retorna editais filtrados e paginados para o frontend
 *     tags: [Frontend]
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: uf
 *         schema:
 *           type: string
 *       - in: query
 *         name: municipio
 *         schema:
 *           type: string
 *       - in: query
 *         name: modalidade
 *         schema:
 *           type: string
 *       - in: query
 *         name: situacao
 *         schema:
 *           type: string
 *       - in: query
 *         name: dataInicio
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dataFim
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: valorMin
 *         schema:
 *           type: number
 *       - in: query
 *         name: valorMax
 *         schema:
 *           type: number
 *       - in: query
 *         name: busca
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de editais
 */
app.get('/api/editais', async (req, res) => {
  try {
    const {
      pagina = 1,
      limite = 50,
      uf,
      municipio,
      modalidade,
      situacao,
      dataInicio,
      dataFim,
      valorMin,
      valorMax,
      busca
    } = req.query;

    // Calcular offset para paginação
    const offset = (parseInt(pagina) - 1) * parseInt(limite);

    // Construir query base
    let query = supabase
      .from('view_editais_dashboard')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (uf) {
      query = query.eq('uf', uf.toUpperCase());
    }

    if (municipio) {
      query = query.ilike('municipio', `%${municipio}%`);
    }

    if (modalidade) {
      query = query.eq('modalidade', modalidade);
    }

    if (situacao) {
      query = query.eq('situacao', situacao);
    }

    if (dataInicio) {
      query = query.gte('data_publicacao', dataInicio);
    }

    if (dataFim) {
      query = query.lte('data_publicacao', dataFim);
    }

    if (valorMin) {
      query = query.gte('valor_estimado', parseFloat(valorMin));
    }

    if (valorMax) {
      query = query.lte('valor_estimado', parseFloat(valorMax));
    }

    if (busca) {
      query = query.or(`objeto.ilike.%${busca}%,razao_social.ilike.%${busca}%,processo.ilike.%${busca}%`);
    }

    // Aplicar ordenação e paginação
    query = query
      .order('data_publicacao', { ascending: false })
      .range(offset, offset + parseInt(limite) - 1);

    // Executar query
    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    res.json({
      sucesso: true,
      dados: data,
      paginacao: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total: count,
        totalPaginas: Math.ceil(count / parseInt(limite))
      }
    });

  } catch (error) {
    console.error('[API] Erro ao buscar editais:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao buscar editais: ' + error.message
    });
  }
});

/**
 * @swagger
 * /api/editais/{numeroControle}:
 *   get:
 *     summary: Detalhes de um edital específico
 *     description: Retorna todos os dados de um edital incluindo itens, documentos e histórico
 *     tags: [Frontend]
 *     parameters:
 *       - in: path
 *         name: numeroControle
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalhes do edital
 */
app.get('/api/editais/:numeroControle', async (req, res) => {
  try {
    const { numeroControle } = req.params;

    // Buscar dados completos do edital
    const { data: edital, error: errorEdital } = await supabase
      .from('editais_completos')
      .select('*')
      .eq('numero_controle_pncp', numeroControle)
      .single();

    if (errorEdital) {
      throw errorEdital;
    }

    if (!edital) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Edital não encontrado'
      });
    }

    res.json({
      sucesso: true,
      dados: {
        ...edital,
        // Estatísticas
        estatisticas: {
          totalItens: edital.itens?.length || 0,
          totalDocumentos: edital.documentos?.length || 0,
          totalEventos: edital.historico?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('[API] Erro ao buscar detalhes do edital:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao buscar detalhes do edital: ' + error.message
    });
  }
});

/**
 * @swagger
 * /api/editais/{numeroControle}/itens:
 *   get:
 *     summary: Itens de um edital
 *     description: Retorna todos os itens desestruturados de um edital
 *     tags: [Frontend]
 *     parameters:
 *       - in: path
 *         name: numeroControle
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de itens
 */
app.get('/api/editais/:numeroControle/itens', async (req, res) => {
  try {
    const { numeroControle } = req.params;

    // Buscar itens da view
    const { data, error } = await supabase
      .from('view_editais_itens')
      .select('*')
      .eq('numero_controle_pncp', numeroControle)
      .order('numero_item', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({
      sucesso: true,
      dados: data,
      total: data.length
    });

  } catch (error) {
    console.error('[API] Erro ao buscar itens:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao buscar itens: ' + error.message
    });
  }
});

/**
 * @swagger
 * /api/editais/{numeroControle}/documentos:
 *   get:
 *     summary: Documentos de um edital
 *     description: Retorna todos os documentos desestruturados de um edital
 *     tags: [Frontend]
 *     parameters:
 *       - in: path
 *         name: numeroControle
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de documentos
 */
app.get('/api/editais/:numeroControle/documentos', async (req, res) => {
  try {
    const { numeroControle } = req.params;

    // Buscar documentos da view
    const { data, error } = await supabase
      .from('view_editais_documentos')
      .select('*')
      .eq('numero_controle_pncp', numeroControle)
      .order('sequencial_documento', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({
      sucesso: true,
      dados: data,
      total: data.length
    });

  } catch (error) {
    console.error('[API] Erro ao buscar documentos:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao buscar documentos: ' + error.message
    });
  }
});

/**
 * @swagger
 * /api/editais/{numeroControle}/historico:
 *   get:
 *     summary: Histórico de um edital
 *     description: Retorna todo o histórico desestruturado de um edital
 *     tags: [Frontend]
 *     parameters:
 *       - in: path
 *         name: numeroControle
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de eventos do histórico
 */
app.get('/api/editais/:numeroControle/historico', async (req, res) => {
  try {
    const { numeroControle } = req.params;

    // Buscar histórico da view
    const { data, error } = await supabase
      .from('view_editais_historico')
      .select('*')
      .eq('numero_controle_pncp', numeroControle)
      .order('data_evento', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      sucesso: true,
      dados: data,
      total: data.length
    });

  } catch (error) {
    console.error('[API] Erro ao buscar histórico:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao buscar histórico: ' + error.message
    });
  }
});

/**
 * @swagger
 * /api/estatisticas:
 *   get:
 *     summary: Estatísticas gerais
 *     description: Retorna estatísticas agregadas dos editais
 *     tags: [Frontend]
 *     responses:
 *       200:
 *         description: Estatísticas gerais
 */
app.get('/api/estatisticas', async (req, res) => {
  try {
    // Total de editais
    const { count: totalEditais } = await supabase
      .from('editais_completos')
      .select('*', { count: 'exact', head: true });

    // Editais por modalidade
    const { data: porModalidade } = await supabase
      .from('editais_completos')
      .select('modalidade')
      .not('modalidade', 'is', null);

    // Editais por UF
    const { data: porUF } = await supabase
      .from('editais_completos')
      .select('uf')
      .not('uf', 'is', null);

    // Valor total estimado
    const { data: valores } = await supabase
      .from('editais_completos')
      .select('valor_estimado');

    const valorTotal = valores?.reduce((acc, item) => acc + (parseFloat(item.valor_estimado) || 0), 0) || 0;

    // Agrupar por modalidade
    const modalidadeCount = {};
    porModalidade?.forEach(item => {
      modalidadeCount[item.modalidade] = (modalidadeCount[item.modalidade] || 0) + 1;
    });

    // Agrupar por UF
    const ufCount = {};
    porUF?.forEach(item => {
      ufCount[item.uf] = (ufCount[item.uf] || 0) + 1;
    });

    res.json({
      sucesso: true,
      estatisticas: {
        totalEditais,
        valorTotalEstimado: valorTotal,
        porModalidade: modalidadeCount,
        porUF: ufCount
      }
    });

  } catch (error) {
    console.error('[API] Erro ao buscar estatísticas:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao buscar estatísticas: ' + error.message
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
