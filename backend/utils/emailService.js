const path = require('path');
const sgMail = require('@sendgrid/mail');
const { getPasswordResetTemplate, getWelcomeTemplate, getRegistrationNotificationTemplate } = require('./emailTemplates');

// Carregar variáveis do .env padrão e do sendgrid.env (se existir)
try { require('dotenv').config(); } catch (_) {}
try { require('dotenv').config({ path: path.resolve(process.cwd(), 'sendgrid.env') }); } catch (_) {}

// Configurar SendGrid API Key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('⚠️ SENDGRID_API_KEY não definido. Configure no ambiente (.env/sendgrid.env/Railway vars).');
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER; // precisa ser remetente verificado no SendGrid

// Função para testar a "conexão" (validação de credenciais) usando sandbox_mode do SendGrid
const testConnection = async () => {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY ausente');
    return false;
  }

  try {
    // Envia um email em modo sandbox (não sai do SendGrid), valida credenciais e payload
    await sgMail.send({
      to: FROM_EMAIL || 'test@example.com',
      from: FROM_EMAIL ? { email: FROM_EMAIL, name: 'Sistema SISA (TEST)' } : 'test@example.com',
      subject: 'Test - SendGrid connection check',
      text: 'Sandbox test',
      mailSettings: { sandboxMode: { enable: true } }
    });

    console.log('✅ SendGrid API está acessível (sandbox test passou)');
    return true;
  } catch (error) {
    console.error('❌ Falha ao validar SendGrid API:', error?.response?.body || error.message || error);
    return false;
  }
};

// Enviar email de redefinição de senha
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY ausente');
    return { success: false, error: 'SENDGRID_API_KEY não configurado' };
  }
  if (!FROM_EMAIL) {
    console.error('❌ Remetente não configurado (SENDGRID_FROM_EMAIL/EMAIL_USER)');
    return { success: false, error: 'Remetente não configurado' };
  }

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const msg = {
    to: email,
    from: { email: FROM_EMAIL, name: 'Sistema SISA' },
    subject: '🔐 Redefinição de Senha - SISA',
    html: getPasswordResetTemplate(userName, resetUrl)
  };

  try {
    console.log(`📧 Enviando email de reset para: ${email}`);
    const [result] = await sgMail.send(msg);
    console.log('✅ Email de reset enviado com sucesso:', result?.headers?.['x-message-id'] || result?.headers?.['x-message-id'] || 'sent');
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao enviar email de reset:', error?.response?.body || error.message || error);
    return { success: false, error: error.message };
  }
};

// Enviar email de primeiro acesso
const sendFirstAccessEmail = async (email, resetToken, userName) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY ausente');
    return { success: false, error: 'SENDGRID_API_KEY não configurado' };
  }
  if (!FROM_EMAIL) {
    console.error('❌ Remetente não configurado (SENDGRID_FROM_EMAIL/EMAIL_USER)');
    return { success: false, error: 'Remetente não configurado' };
  }

  const resetUrl = `${process.env.FRONTEND_URL}/first-access/${resetToken}`;
  const msg = {
    to: email,
    from: { email: FROM_EMAIL, name: 'Sistema SISA' },
    subject: '🎉 Bem-vindo ao SISA - Defina sua senha',
    html: getWelcomeTemplate(userName, resetUrl)
  };

  try {
    console.log(`📧 Enviando email de primeiro acesso para: ${email}`);
    const [result] = await sgMail.send(msg);
    console.log('✅ Email de primeiro acesso enviado com sucesso:', result?.headers?.['x-message-id'] || 'sent');
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao enviar email de primeiro acesso:', error?.response?.body || error.message || error);
    return { success: false, error: error.message };
  }
};

// Enviar email de notificação de cadastro
const sendRegistrationNotificationEmail = async (email, userName) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY ausente');
    return { success: false, error: 'SENDGRID_API_KEY não configurado' };
  }
  if (!FROM_EMAIL) {
    console.error('❌ Remetente não configurado (SENDGRID_FROM_EMAIL/EMAIL_USER)');
    return { success: false, error: 'Remetente não configurado' };
  }

  const msg = {
    to: email,
    from: { email: FROM_EMAIL, name: 'Sistema SISA' },
    subject: '✅ Cadastro Realizado com Sucesso - SISA',
    html: getRegistrationNotificationTemplate(userName, email)
  };

  try {
    console.log(`📧 Enviando email de notificação para: ${email}`);
    const [result] = await sgMail.send(msg);
    console.log('✅ Email de notificação enviado com sucesso:', result?.headers?.['x-message-id'] || 'sent');
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao enviar email de notificação:', error?.response?.body || error.message || error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendFirstAccessEmail,
  sendRegistrationNotificationEmail,
  testConnection
};
