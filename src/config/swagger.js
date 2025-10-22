const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PNCP API Client - Simplificado',
      version: '2.0.0',
      description: 'API simplificada para extração de dados do Portal Nacional de Contratações Públicas (PNCP)',
      contact: {
        name: 'Suporte PNCP',
        url: 'https://www.gov.br/pncp',
        email: 'suporte@pncp.gov.br'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:10000',
        description: 'Servidor de desenvolvimento'
      }
    ],
    tags: [
      {
        name: 'Extração',
        description: 'Endpoints para extração de editais'
      },
      {
        name: 'Scheduler',
        description: 'Endpoints para configuração do agendador automático'
      },
      {
        name: 'Sistema',
        description: 'Endpoints para monitoramento do sistema'
      }
    ],
    components: {
      schemas: {
        RespostaExtracao: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'iniciado'
            },
            mensagem: {
              type: 'string',
              example: 'Extração iniciada em background para 15 dias'
            },
            dias: {
              type: 'number',
              example: 1
            },
            limite: {
              type: 'number',
              example: 5600
            },
            modo: {
              type: 'string',
              example: 'historico',
              enum: ['historico', 'scheduler']
            }
          }
        },
        StatusScheduler: {
          type: 'object',
          properties: {
            ativo: {
              type: 'boolean',
              example: true
            },
            horaExecucao: {
              type: 'string',
              example: '22:30'
            },
            proximaExecucao: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-23T22:30:00Z'
            },
            ultimaExecucao: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-22T22:30:00Z'
            },
            diasRetroativos: {
              type: 'number',
              example: 1
            },
            limiteProcessamento: {
              type: 'number',
              example: 5600
            },
            modalidades: {
              type: 'string',
              example: 'TODAS'
            },
            mensagem: {
              type: 'string',
              example: 'Scheduler configurado para extrair editais do dia anterior automaticamente'
            }
          }
        },
        StatusSistema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-22T21:30:00Z'
            },
            versao: {
              type: 'string',
              example: '2.0.0'
            },
            funcionalidades: {
              type: 'object',
              properties: {
                apiPNCP: {
                  type: 'boolean',
                  example: true
                },
                bancoDados: {
                  type: 'boolean',
                  example: true
                },
                scheduler: {
                  type: 'boolean',
                  example: true
                }
              }
            },
            mensagem: {
              type: 'string',
              example: 'Sistema funcionando corretamente'
            }
          }
        },
        Erro: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'erro'
            },
            mensagem: {
              type: 'string',
              example: 'Descrição do erro'
            }
          }
        }
      }
    }
  },
  apis: ['./src/index.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;
