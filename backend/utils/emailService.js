const { getPasswordResetTemplate, getWelcomeTemplate, getRegistrationNotificationTemplate } = require('./emailTemplates');
require('dotenv').config();

// Função para enviar email usando Resend API
const sendEmailWithResend = async (to, subject, html) => {
  try {
    // Usar fetch nativo do Node.js (disponível a partir do Node 18)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: to,
        subject: subject,
        html: html
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log('✅ Email enviado via Resend:', result.id);
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('❌ Erro Resend API:', error);
    throw error;
  }
};

// Fallback para Gmail (desenvolvimento)
const sendEmailWithGmail = async (to, subject, html) => {
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransporter({
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
    }
  });

  const mailOptions = {
    from: `"Sistema SISA" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    html: html,
    encoding: 'utf8'
  };

  const result = await transporter.sendMail(mailOptions);
  return { success: true, messageId: result.messageId };
};

// Função principal para enviar email
const sendEmail = async (to, subject, html) => {
  console.log(`📧 Enviando email para: ${to}`);
  console.log(`📧 Assunto: ${subject}`);
  
  try {
    // Usar Resend em produção se a API key estiver configurada
    if (process.env.NODE_ENV === 'production' && process.env.RESEND_API_KEY) {
      console.log('📧 Usando Resend API');
      return await sendEmailWithResend(to, subject, html);
    } else {
      console.log('📧 Usando Gmail SMTP (desenvolvimento)');
      return await sendEmailWithGmail(to, subject, html);
    }
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return { success: false, error: error.message };
  }
};

// Função para testar a conexão
const testConnection = async () => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.RESEND_API_KEY) {
      // Testar Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: 'test@example.com',
          subject: 'Test Connection',
          html: '<p>Test</p>'
        })
      });
      
      // Mesmo que dê erro de email inválido, se a API key estiver correta, o status será diferente de 401
      if (response.status === 401) {
        throw new Error('API Key inválida');
      }
      
      console.log('✅ Resend API conectada com sucesso!');
      return true;
    } else {
      // Testar Gmail
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      
      await transporter.verify();
      console.log('✅ Gmail SMTP conectado com sucesso!');
      return true;
    }
  } catch (error) {
    console.error('❌ Erro na conexão com servidor de email:', error.message);
    return false;
  }
};

// Enviar email de redefinição de senha
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const html = getPasswordResetTemplate(userName, resetUrl);
  
  return await sendEmail(email, '🔐 Redefinição de Senha - SISA', html);
};

// Enviar email de primeiro acesso
const sendFirstAccessEmail = async (email, resetToken, userName) => {
  const resetUrl = `${process.env.FRONTEND_URL}/first-access/${resetToken}`;
  const html = getWelcomeTemplate(userName, resetUrl);
  
  return await sendEmail(email, '🎉 Bem-vindo ao SISA - Defina sua senha', html);
};

// Enviar email de notificação de cadastro
const sendRegistrationNotificationEmail = async (email, userName) => {
  const html = getRegistrationNotificationTemplate(userName, email);
  
  return await sendEmail(email, '✅ Cadastro Realizado com Sucesso - SISA', html);
};

module.exports = {
  sendPasswordResetEmail,
  sendFirstAccessEmail,
  sendRegistrationNotificationEmail,
  testConnection
};