# ✅ Checklist de Deploy - PNCP API

## 📋 Antes do Deploy

### Supabase
- [ ] Conta criada no Supabase
- [ ] Projeto criado
- [ ] Tabelas criadas (editais_pncp, editais_estruturados, scheduler_horario, scheduler_execucoes)
- [ ] SUPABASE_URL copiada
- [ ] SUPABASE_ANON_KEY copiada

### GitHub/GitLab
- [ ] Repositório criado
- [ ] Código commitado
- [ ] Push realizado
- [ ] Repositório público ou privado conectado ao Render

### Render
- [ ] Conta criada no Render
- [ ] Cartão de crédito adicionado (opcional, mas recomendado)

---

## 🚀 Durante o Deploy

### Configuração do Service
- [ ] Web Service criado
- [ ] Repositório conectado
- [ ] Branch selecionada (main)
- [ ] Environment: Node
- [ ] Build Command: `npm install`
- [ ] Start Command: `npm start`
- [ ] Region: Oregon (free)
- [ ] Plan selecionado (Free ou Starter)

### Variáveis de Ambiente
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `10000`
- [ ] `PNCP_API_BASE_URL` = `https://pncp.gov.br/api`
- [ ] `SUPABASE_URL` = (sua URL)
- [ ] `SUPABASE_ANON_KEY` = (sua key)
- [ ] `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` = `true`
- [ ] `PUPPETEER_EXECUTABLE_PATH` = `/usr/bin/google-chrome-stable`

### Deploy
- [ ] "Create Web Service" clicado
- [ ] Build iniciado
- [ ] Build finalizado com sucesso
- [ ] Service rodando (status verde)

---

## ✅ Após o Deploy

### Testes Básicos
- [ ] API responde em `https://sua-api.onrender.com`
- [ ] Swagger acessível em `/api-docs`
- [ ] Endpoint `/api/scheduler/status` responde

### Testes Funcionais
- [ ] POST `/api/extrair` funciona
- [ ] POST `/api/scheduler/executar` funciona
- [ ] POST `/api/scheduler/configurar` funciona
- [ ] GET `/api/scheduler/historico` retorna dados

### Verificação Banco
- [ ] Dados salvos em `editais_pncp`
- [ ] Dados salvos em `editais_estruturados`
- [ ] Registros em `scheduler_execucoes`
- [ ] Configuração em `scheduler_horario`

### Scheduler
- [ ] Horário configurado (padrão 08:00)
- [ ] Status `ativo: true`
- [ ] Próxima execução agendada
- [ ] Logs mostram inicialização correta

---

## 🔧 Configurações Adicionais

### Plano Free
- [ ] Aceito que terá sleep após 15min
- [ ] Configurado ping externo (cron-job.org) - opcional
- [ ] Documentado cold start de 30-60s

### Plano Pago
- [ ] Upgrade realizado para Starter ($7/mês)
- [ ] 24/7 sem sleep
- [ ] Scheduler executando regularmente

### Monitoramento
- [ ] Logs do Render configurados
- [ ] Alertas configurados (opcional)
- [ ] Dashboard do Supabase monitorado

### Ping Externo (se plano free)
- [ ] Conta criada em cron-job.org ou uptimerobot.com
- [ ] Job criado para `https://sua-api.onrender.com/api/scheduler/status`
- [ ] Frequência: 14 minutos
- [ ] Job ativo

---

## 📊 Validação Final

### API Funcional
- [ ] ✅ Status 200 em todas as rotas
- [ ] ✅ Swagger UI carrega
- [ ] ✅ Extração funciona
- [ ] ✅ Processamento funciona
- [ ] ✅ Scheduler configurado

### Banco de Dados
- [ ] ✅ Conexão estabelecida
- [ ] ✅ Dados sendo salvos
- [ ] ✅ Duplicatas evitadas
- [ ] ✅ Índices funcionando

### Automação
- [ ] ✅ Scheduler inicializa
- [ ] ✅ Próxima execução agendada
- [ ] ✅ Histórico sendo registrado
- [ ] ✅ Processo completo funciona

---

## 🎉 Deploy Completo!

Se todos os itens estão marcados, seu deploy está **100% funcional**!

### URLs Importantes
- **API**: `https://sua-api.onrender.com`
- **Swagger**: `https://sua-api.onrender.com/api-docs`
- **Dashboard Render**: `https://dashboard.render.com`
- **Dashboard Supabase**: `https://app.supabase.com`

### Próximos Passos
1. Configure o horário do scheduler
2. Monitore a primeira execução automática
3. Verifique os dados no Supabase
4. Ajuste parâmetros conforme necessário

**Sistema em produção!** 🚀

