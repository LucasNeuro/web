# 🚀 Deploy Rápido - 5 Minutos

## ✅ PASSO 1: Supabase (2 minutos)

1. Acesse [app.supabase.com](https://app.supabase.com)
2. Crie projeto
3. Execute SQL: `sql/scheduler_tables.sql`
4. Copie: **URL** e **ANON KEY**

## ✅ PASSO 2: GitHub (1 minuto)

```bash
git init
git add .
git commit -m "Deploy PNCP API"
git remote add origin https://github.com/SEU_USUARIO/pncp-api.git
git push -u origin main
```

## ✅ PASSO 3: Render (2 minutos)

1. Acesse [render.com](https://render.com)
2. **New +** → **Web Service**
3. Conecte repositório
4. Configure:
   - Build: `npm install`
   - Start: `npm start`
5. Adicione variáveis:
   - `SUPABASE_URL` = sua_url
   - `SUPABASE_ANON_KEY` = sua_key
   - `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` = `true`
   - `PUPPETEER_EXECUTABLE_PATH` = `/usr/bin/google-chrome-stable`
6. **Create Web Service**

## 🎉 PRONTO!

Acesse: `https://sua-api.onrender.com/api-docs`

---

## ⚠️ IMPORTANTE: Plano Free

O Render **FREE** tem limitações:
- ✅ API funciona perfeitamente
- ⚠️ **Sleep após 15min** de inatividade
- ⚠️ **Cold start** de 30-60s no primeiro request
- ⚠️ **Scheduler pode não executar** se em sleep

### Soluções:

#### Opção 1: Aceitar Sleep (FREE)
- API responde após cold start
- Ideal para uso esporádico

#### Opção 2: Ping Automático (FREE)
Configure em [cron-job.org](https://cron-job.org):
- URL: `https://sua-api.onrender.com/api/scheduler/status`
- Frequência: A cada 14 minutos
- Mantém API sempre ativa!

#### Opção 3: Upgrade (US$ 7/mês)
- ✅ 24/7 sem sleep
- ✅ Scheduler roda sempre
- ✅ 1GB RAM
- ✅ Mais rápido

---

## 🎯 Teste Rápido

```bash
# Status
curl https://sua-api.onrender.com/api/scheduler/status

# Executar agora
curl -X POST https://sua-api.onrender.com/api/scheduler/executar

# Configurar horário
curl -X POST https://sua-api.onrender.com/api/scheduler/configurar \
  -H "Content-Type: application/json" \
  -d '{"horaExecucao": "08:00", "ativo": true}'
```

**Documentação completa**: `DEPLOY.md`

