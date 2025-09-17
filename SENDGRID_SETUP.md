# Configuração SendGrid para Railway

O Railway bloqueia conexões SMTP externas, então precisamos usar SendGrid para envio de emails em produção.

## Passos para configurar:

### 1. Criar conta SendGrid (GRATUITO)
- Acesse: https://sendgrid.com/
- Crie uma conta gratuita (10.000 emails/mês grátis)
- Verifique seu email

### 2. Criar API Key
- No dashboard SendGrid, vá em **Settings > API Keys**
- Clique em **Create API Key**
- Nome: `SISA-Railway`
- Permissões: **Full Access** (ou **Mail Send** apenas)
- Copie a API Key gerada (só aparece uma vez!)

### 3. Verificar domínio de envio
- Vá em **Settings > Sender Authentication**
- Clique em **Verify a Single Sender**
- Use o email: `sisaproject2@gmail.com` (ou outro que você controla)
- Preencha os dados e verifique o email

### 4. Configurar variáveis no Railway
No painel do Railway, adicione estas variáveis de ambiente:

```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=sisaproject2@gmail.com
NODE_ENV=production
```

### 5. Testar
Após configurar, faça um novo deploy e teste criando um usuário.

## Alternativa rápida (se SendGrid der problema):

### Usar Resend (mais simples)
1. Acesse: https://resend.com/
2. Crie conta gratuita (3.000 emails/mês)
3. Crie API Key
4. No Railway, adicione:
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=sisaproject2@gmail.com
NODE_ENV=production
```

## Status atual:
- ✅ Código atualizado para usar SendGrid em produção
- ✅ Fallback para Gmail em desenvolvimento
- ✅ Timeouts aumentados para conexões lentas
- ⏳ Aguardando configuração das variáveis no Railway

## Teste local:
Para testar localmente, mantenha as variáveis Gmail no .env:
```
EMAIL_USER=sisaproject2@gmail.com
EMAIL_PASS=sua_senha_de_app_gmail
NODE_ENV=development
```