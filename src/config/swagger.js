const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PNCP API Client',
      version: '1.0.0',
      description: 'API para consulta de dados do Portal Nacional de Contratacoes Publicas (PNCP)',
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
        url: process.env.NODE_ENV === 'production' 
          ? 'https://web-kpbm.onrender.com'
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' 
          ? 'Servidor de Produção (Render)'
          : 'Servidor de Desenvolvimento'
      }
    ],
    tags: [
      {
        name: 'Sistema',
        description: 'Informacoes do sistema'
      },
      {
        name: 'Extrator',
        description: 'Extracao de editais do PNCP'
      },
      {
        name: 'Scraper',
        description: 'Scraping completo de editais (navegacao, itens, anexos, historico)'
      },
      {
        name: 'Scheduler',
        description: 'Automatizacao e agendamento de execucoes'
      }
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensagem de erro'
            }
          }
        },
        Orgao: {
          type: 'object',
          properties: {
            cnpj: {
              type: 'string',
              description: 'CNPJ do orgao'
            },
            razaoSocial: {
              type: 'string',
              description: 'Razao social do orgao'
            },
            esfera: {
              type: 'string',
              description: 'Esfera do orgao (Federal, Estadual, Municipal)'
            }
          }
        },
        Contratacao: {
          type: 'object',
          properties: {
            numeroControlePNCP: {
              type: 'string',
              description: 'Numero de controle no PNCP'
            },
            sequencialContratacao: {
              type: 'integer',
              description: 'Numero sequencial da contratacao'
            },
            objeto: {
              type: 'string',
              description: 'Objeto da contratacao'
            },
            modalidade: {
              type: 'string',
              description: 'Modalidade de contratacao'
            },
            situacao: {
              type: 'string',
              description: 'Situacao atual da contratacao'
            },
            valorEstimado: {
              type: 'number',
              format: 'double',
              description: 'Valor estimado da contratacao'
            },
            dataPublicacao: {
              type: 'string',
              format: 'date',
              description: 'Data de publicacao'
            }
          }
        },
        Contrato: {
          type: 'object',
          properties: {
            numeroContrato: {
              type: 'string',
              description: 'Numero do contrato'
            },
            objeto: {
              type: 'string',
              description: 'Objeto do contrato'
            },
            valor: {
              type: 'number',
              format: 'double',
              description: 'Valor do contrato'
            },
            dataAssinatura: {
              type: 'string',
              format: 'date',
              description: 'Data de assinatura'
            },
            dataVigenciaInicio: {
              type: 'string',
              format: 'date',
              description: 'Data de inicio da vigencia'
            },
            dataVigenciaFim: {
              type: 'string',
              format: 'date',
              description: 'Data de fim da vigencia'
            }
          }
        }
      },
      parameters: {
        cnpjParam: {
          name: 'cnpj',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            pattern: '^[0-9]{14}$'
          },
          description: 'CNPJ do orgao (14 digitos)',
          example: '00394460005887'
        },
        anoParam: {
          name: 'ano',
          in: 'path',
          required: true,
          schema: {
            type: 'integer',
            minimum: 2000,
            maximum: 2100
          },
          description: 'Ano da consulta',
          example: 2024
        },
        paginaQuery: {
          name: 'pagina',
          in: 'query',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          },
          description: 'Numero da pagina'
        },
        tamanhoPaginaQuery: {
          name: 'tamanhoPagina',
          in: 'query',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 500,
            default: 10
          },
          description: 'Quantidade de registros por pagina'
        }
      }
    }
  },
  apis: ['./src/index.js', './src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

