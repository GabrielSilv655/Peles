const nodemailer = require('nodemailer');
const { getPasswordResetTemplate, getWelcomeTemplate, getRegistrationNotificationTemplate } = require('./emailTemplates');
require('dotenv').config();

// Configuração do transporter de email
const createTransporter = () => {
  // Verificar se estamos em produção (Railway) e usar Resend
  if (process.env.NODE_ENV === 'production' && process.env.RESEND_API_KEY) {
    console.log('📧 Usando Resend para produção');
    const config = {
      host: 'smtp.resend.com',
      port: 587,
      secure: false,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000
    };

    console.log('📧 Configuração Resend:', {
      host: config.host,
      port: config.port,
      hasApiKey: !!config.auth.pass
    });

    return nodemailer.createTransporter(config);
  }

  // Fallback para Gmail em desenvolvimento ou se Resend não estiver configurado
  const config = {
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000
  };

  console.log('📧 Configuração Gmail:', {
    service: config.service,
    host: config.host,
    port: config.port,
    user: config.auth.user,
    passwordLength: config.auth.pass ? config.auth.pass.length : 0
  });

  return nodemailer.createTransporter(config);
};

// Função para testar a conexão
const testConnection = async () => {
  const transporter = createTransporter();
  try {
    await transporter.verify();
    console.log('✅ Servidor de email conectado com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro na conexão com servidor de email:', error.message);
    return false;
  }
};

// Enviar email de redefinição de senha
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const transporter = createTransporter();
  
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  // Usar email do Resend em produção ou Gmail em desenvolvimento
  const fromEmail = process.env.NODE_ENV === 'production' && process.env.RESEND_FROM_EMAIL 
    ? process.env.RESEND_FROM_EMAIL 
    : process.env.EMAIL_USER;
  
  const mailOptions = {
    from: `"Sistema SISA" <${fromEmail}>`,
    to: email,
    subject: '🔐 Redefinição de Senha - SISA',
    html: getPasswordResetTemplate(userName, resetUrl),
    encoding: 'utf8'
  };

  try {
    console.log(`📧 Enviando email de reset para: ${email}`);
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email de reset enviado com sucesso:', result.messageId);
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao enviar email de reset:', error);
    return { success: false, error: error.message };
  }
};

// Enviar email de primeiro acesso
const sendFirstAccessEmail = async (email, resetToken, userName) => {
  const transporter = createTransporter();
  
  const resetUrl = `${process.env.FRONTEND_URL}/first-access/${resetToken}`;
  
  // Usar email do Resend em produção ou Gmail em desenvolvimento
  const fromEmail = process.env.NODE_ENV === 'production' && process.env.RESEND_FROM_EMAIL 
    ? process.env.RESEND_FROM_EMAIL 
    : process.env.EMAIL_USER;
  
  const mailOptions = {
    from: `"Sistema SISA" <${fromEmail}>`,
    to: email,
    subject: '🎉 Bem-vindo ao SISA - Defina sua senha',
    html: getWelcomeTemplate(userName, resetUrl),
    encoding: 'utf8'
  };

  try {
    console.log(`📧 Enviando email de primeiro acesso para: ${email}`);
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email de primeiro acesso enviado com sucesso:', result.messageId);
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao enviar email de primeiro acesso:', error);
    return { success: false, error: error.message };
  }
};

// Enviar email de notificação de cadastro
const sendRegistrationNotificationEmail = async (email, userName) => {
  const transporter = createTransporter();
  
  // Usar email do Resend em produção ou Gmail em desenvolvimento
  const fromEmail = process.env.NODE_ENV === 'production' && process.env.RESEND_FROM_EMAIL 
    ? process.env.RESEND_FROM_EMAIL 
    : process.env.EMAIL_USER;
  
  const mailOptions = {
    from: `"Sistema SISA" <${fromEmail}>`,
    to: email,
    subject: '✅ Cadastro Realizado com Sucesso - SISA',
    html: getRegistrationNotificationTemplate(userName, email),
    encoding: 'utf8'
  };

  try {
    console.log(`📧 Enviando email de notificação para: ${email}`);
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email de notificação enviado com sucesso:', result.messageId);
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao enviar email de notificação:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendFirstAccessEmail,
  sendRegistrationNotificationEmail,
  testConnection
};