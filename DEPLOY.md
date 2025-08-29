# 🚀 Guia de Deploy - FS Trophy Hub

## 📋 Pré-requisitos

- Conta no [Vercel](https://vercel.com)
- Projeto no GitHub/GitLab
- NPSSO Token válido da PlayStation Network

## ⚠️ IMPORTANTE: Deploy Manual

**NÃO use deploy automático!** O projeto está configurado para deploy manual para evitar conflitos.

## 🔧 Configuração para Deploy

### 1. Preparar o Projeto

1. **Subir para GitHub:**
   ```bash
   git add .
   git commit -m "Preparando para deploy no Vercel"
   git push origin main
   ```

2. **Verificar arquivos:**
   - ✅ `api/psn-proxy.js` - Vercel Function
   - ✅ `vercel.json` - Configuração do Vercel (corrigida)
   - ✅ `.vercelignore` - Arquivos ignorados
   - ✅ `package.json` - Scripts de build

### 2. Deploy Manual no Vercel

1. **Conectar ao Vercel:**
   - Acesse [vercel.com](https://vercel.com)
   - Faça login com GitHub
   - Clique em "New Project"

2. **Importar repositório:**
   - Selecione o repositório `fs-trophy-hub`
   - Clique em "Import"

3. **Configurar projeto:**
   - **Framework Preset:** Create React App
   - **Root Directory:** `./` (padrão)
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
   - **Install Command:** `npm install`

4. **IMPORTANTE - Desabilitar Deploy Automático:**
   - Na configuração do projeto, vá em "Settings"
   - Encontre "Git" ou "Deployments"
   - **Desabilite "Auto Deploy"** ou "Deploy on Push"
   - Salve as configurações

5. **Variáveis de Ambiente (Opcional):**
   - `NODE_ENV=production`
   - `NPSSO_TOKEN=sua_token_aqui` (se quiser usar env)

6. **Deploy Manual:**
   - Clique em "Deploy" (não será automático)
   - Aguarde o build completar

### 3. Configurar URL da API

Após o deploy, você receberá uma URL como:
`https://fs-trophy-hub-abc123.vercel.app`

**Atualizar o PSNService:**
```typescript
// Em src/services/psnService.ts
const BASE_URL = isProduction 
  ? 'https://fs-trophy-hub-abc123.vercel.app/api/psn-proxy' 
  : 'http://localhost:3001/api';
```

## 🔍 Verificar Funcionamento

1. **Acesse a URL do deploy**
2. **Verifique os logs:**
   - Vercel Dashboard → Functions → Logs
3. **Teste as funcionalidades:**
   - Lista de jogos
   - Visualização de troféus
   - Perfil do usuário

## 🚫 Solução de Problemas

### Erro de Configuração:
Se aparecer erro sobre `functions` e `builds`:
- ✅ **Já corrigido** no `vercel.json`
- Usa apenas `builds` com configuração para React e Node.js

### Se o deploy automático estiver ativo:

1. **No Vercel Dashboard:**
   - Vá em "Settings" do projeto
   - "Git" → "Deployments"
   - Desabilite "Auto Deploy"

2. **Ou via arquivo:**
   - O `vercel.json` já tem `"deploymentEnabled": { "main": false }`
   - Isso deve desabilitar automaticamente

3. **Se ainda não funcionar:**
   - Delete o projeto no Vercel
   - Recrie com deploy manual

## ⚠️ Limitações do Vercel

### ✅ **Funciona:**
- Frontend React
- Vercel Functions (API routes)
- CORS automático
- HTTPS automático
- CDN global

### ⚠️ **Limitações:**
- **Cold starts** nas functions
- **Timeout** de 30s por request (configurado)
- **Cache** limitado (usar Redis para produção)
- **NPSSO Token** expira (renovar manualmente)

## 🔄 Manutenção

### Renovar NPSSO Token:
1. Acesse [PlayStation Network](https://ca.account.sony.com/api/authz/v3/oauth/authorize)
2. Copie o novo token
3. Atualize em `api/psn-proxy.js`

### Deploy Manual:
- Sempre use "Deploy" manual no Vercel Dashboard
- Não confie em deploy automático

### Monitoramento:
- Vercel Dashboard → Analytics
- Functions → Logs
- Performance → Core Web Vitals

## 🚀 Próximos Passos

### Para Produção:
1. **Domínio customizado**
2. **Redis** para cache de tokens
3. **Monitoramento** avançado
4. **CDN** para assets

### Melhorias:
1. **Cache** inteligente
2. **Rate limiting**
3. **Error tracking**
4. **Analytics**

## 📞 Suporte

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **PSN API:** [github.com/andshrew/psn-api](https://github.com/andshrew/psn-api)
- **Issues:** GitHub do projeto

---

**🎮 FS Trophy Hub - Deployado com sucesso no Vercel (Manual)!**
