const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const multer = require('multer');
const PDFEnhancer = require('../utils/pdfEnhancer');

// Configuração do multer para documentos gerais
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/all-documents/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: function (req, file, cb) {
    console.log('Verificando arquivo:', file.originalname, 'MIME:', file.mimetype);
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos DOCX são permitidos'), false);
    }
  }
});

// Simulação de banco de dados em memória (em produção, usar banco real)
let allDocuments = [];
let nextId = 1;

// Listar todos os documentos
const getAllDocuments = async (req, res) => {
  try {
    console.log('Buscando todos os documentos...');
    
    // Ordenar por data de criação (mais recentes primeiro)
    const sortedDocuments = allDocuments.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    
    console.log(`Encontrados ${sortedDocuments.length} documentos`);
    res.json(sortedDocuments);
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Buscar documento por ID
const getDocument = async (req, res) => {
  try {
    const document = allDocuments.find(doc => doc.id === parseInt(req.params.id));
    
    if (!document) {
      return res.status(404).json({ message: 'Documento não encontrado' });
    }
    
    res.json(document);
  } catch (error) {
    console.error('Erro ao buscar documento:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Criar novo documento
const createDocument = async (req, res) => {
  try {
    console.log('Criando novo documento...');
    console.log('Arquivo recebido:', req.file);
    console.log('Dados do body:', req.body);
    
    if (!req.file) {
      return res.status(400).json({ message: 'Arquivo DOCX é obrigatório' });
    }

    const { name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Nome é obrigatório' });
    }

    // Verificar se o arquivo foi salvo corretamente
    if (!fs.existsSync(req.file.path)) {
      console.error('Arquivo não foi salvo:', req.file.path);
      return res.status(500).json({ message: 'Erro ao salvar arquivo' });
    }

    // Verificar se o arquivo é um DOCX válido
    const buffer = fs.readFileSync(req.file.path);
    if (buffer.length === 0) {
      console.error('Arquivo está vazio');
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Arquivo está vazio' });
    }

    // Verificar assinatura ZIP (DOCX é um arquivo ZIP)
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
      console.error('Arquivo não é um ZIP válido (DOCX)');
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Arquivo não é um DOCX válido' });
    }

    console.log('Arquivo validado com sucesso:', {
      path: req.file.path,
      size: buffer.length,
      signature: buffer.slice(0, 4)
    });

    // Criar registro do documento
    const document = {
      id: nextId++,
      name: name.trim(),
      description: description?.trim() || '',
      file_path: req.file.path,
      original_filename: req.file.originalname,
      file_size: req.file.size,
      created_by: req.user?.id || 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    allDocuments.push(document);

    console.log('Documento criado com ID:', document.id);
    res.status(201).json(document);
  } catch (error) {
    console.error('Erro ao criar documento:', error);
    
    // Remover arquivo se houve erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message 
    });
  }
};

// Deletar documento
const deleteDocument = async (req, res) => {
  try {
    const documentIndex = allDocuments.findIndex(doc => doc.id === parseInt(req.params.id));
    
    if (documentIndex === -1) {
      return res.status(404).json({ message: 'Documento não encontrado' });
    }

    const document = allDocuments[documentIndex];

    // Remover arquivo do sistema
    if (fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }

    // Remover do array
    allDocuments.splice(documentIndex, 1);

    res.json({ message: 'Documento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar documento:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Preview do documento
const previewDocument = async (req, res) => {
  try {
    console.log('Gerando preview do documento:', req.params.id);
    
    const document = allDocuments.find(doc => doc.id === parseInt(req.params.id));
    
    if (!document) {
      return res.status(404).json({ message: 'Documento não encontrado' });
    }

    if (!fs.existsSync(document.file_path)) {
      return res.status(404).json({ message: 'Arquivo do documento não encontrado' });
    }

    console.log('Arquivo encontrado:', document.file_path);
    
    // Ler arquivo como buffer
    const buffer = fs.readFileSync(document.file_path);
    console.log('Tamanho do arquivo:', buffer.length, 'bytes');
    console.log('Primeiros 4 bytes:', buffer.slice(0, 4));
    
    // Verificar se é um ZIP válido (DOCX)
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
      console.error('Arquivo não é um ZIP válido');
      return res.status(400).json({ 
        message: 'Arquivo corrompido ou não é um DOCX válido' 
      });
    }

    // Converter DOCX para HTML usando mammoth com buffer
    console.log('Convertendo DOCX para HTML...');
    const result = await mammoth.convertToHtml({ 
      buffer: buffer,
      options: {
        includeDefaultStyleMap: true,
        includeEmbeddedStyleMap: true
      }
    });
    
    const html = result.value;
    console.log('Preview gerado com sucesso, tamanho HTML:', html.length);

    // Retornar HTML para preview
    res.json({
      html: html,
      messages: result.messages || []
    });
  } catch (error) {
    console.error('Erro detalhado ao gerar preview:', error);
    res.status(500).json({ 
      message: 'Erro ao gerar preview',
      error: error.message 
    });
  }
};

// Download do documento
const downloadDocument = async (req, res) => {
  try {
    console.log('Iniciando download do documento:', req.params.id);
    
    const { format = 'docx' } = req.query; // docx ou pdf
    const document = allDocuments.find(doc => doc.id === parseInt(req.params.id));
    
    if (!document) {
      return res.status(404).json({ message: 'Documento não encontrado' });
    }

    if (!fs.existsSync(document.file_path)) {
      return res.status(404).json({ message: 'Arquivo do documento não encontrado' });
    }

    console.log('Enviando arquivo para download:', document.file_path, 'formato:', format);

    if (format === 'docx') {
      // Download DOCX original
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.original_filename)}"`);
      
      const buffer = fs.readFileSync(document.file_path);
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer, 'binary');
      
      console.log('Download DOCX concluído com sucesso');
    } else if (format === 'pdf') {
      // Gerar PDF usando mammoth + puppeteer
      await generatePDFFromDocument(document, res);
    } else {
      res.status(400).json({ message: 'Formato não suportado. Use "docx" ou "pdf".' });
    }
  } catch (error) {
    console.error('Erro ao fazer download:', error);
    res.status(500).json({ 
      message: 'Erro ao fazer download',
      error: error.message 
    });
  }
};

// Função para gerar PDF do documento com máxima robustez
const generatePDFFromDocument = async (document, res) => {
  let browser = null;
  
  try {
    console.log('Gerando PDF robusto do documento:', document.name);
    
    // Ler arquivo como buffer
    const buffer = fs.readFileSync(document.file_path);
    
    // Verificar se é um ZIP válido (DOCX)
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
      throw new Error('Arquivo não é um DOCX válido');
    }

    // Converter DOCX para HTML usando configurações ultra-robustas do PDFEnhancer
    console.log('Convertendo DOCX para HTML com configurações ultra-robustas...');
    const result = await mammoth.convertToHtml({ 
      buffer: buffer,
      options: PDFEnhancer.getMammothAdvancedOptions()
    });
    
    let html = result.value;
    console.log('HTML gerado, tamanho:', html.length);
    console.log('Mensagens de conversão:', result.messages);

    // Processar HTML para melhorar a detecção de elementos visuais complexos
    html = PDFEnhancer.processHtmlForComplexElements(html);

    // Criar HTML completo para PDF com CSS ultra-robusto
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${document.name}</title>
        <style>
          ${PDFEnhancer.getUltraRobustCSS(document.name)}
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;

    // Usar puppeteer com configurações ultra-avançadas
    console.log('Iniciando Puppeteer com configurações ultra-robustas...');
    const puppeteer = require('puppeteer');
    
    browser = await puppeteer.launch(PDFEnhancer.getPuppeteerAdvancedConfig());
    
    const page = await browser.newPage();
    
    // Configurar página com resolução ultra-alta para máxima qualidade
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
    
    // Interceptar requests para melhorar carregamento de recursos
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if(req.resourceType() == 'stylesheet' || req.resourceType() == 'font'){
        req.abort();
      } else {
        req.continue();
      }
    });
    
    console.log('Carregando HTML na página...');
    await page.setContent(fullHtml, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 120000
    });
    
    // Aguardar carregamento completo
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Executar JavaScript ultra-avançado para otimização
    await page.evaluate(PDFEnhancer.getPageOptimizationScript());
    
    // Aguardar após otimizações
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Gerando PDF com configurações ultra-avançadas...');
    const pdfBuffer = await page.pdf(PDFEnhancer.getPDFAdvancedOptions());

    console.log('PDF robusto gerado com sucesso! Tamanho:', pdfBuffer.length, 'bytes');

    // Fechar browser
    await browser.close();
    browser = null;

    // Verificar se o buffer é válido
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF buffer está vazio');
    }

    // Enviar PDF
    const fileName = `${document.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer, 'binary');
    
    console.log('Download PDF robusto concluído com sucesso');
    
  } catch (pdfError) {
    console.error('Erro detalhado ao gerar PDF robusto:', pdfError);
    
    // Fechar browser se ainda estiver aberto
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Erro ao fechar browser:', closeError);
      }
    }
    
    res.status(500).json({ 
      message: 'Erro ao gerar PDF robusto. Tente o formato DOCX.',
      error: pdfError.message 
    });
  }
};

// Função auxiliar para processar HTML e detectar elementos visuais
const processHtmlForVisualElements = (html) => {
  console.log('Processando HTML para detectar elementos visuais...');
  
  // Detectar e marcar possíveis elementos de desenho do Google Docs
  html = html.replace(/<div[^>]*class="[^"]*drawing[^"]*"[^>]*>/gi, '<div class="docx-drawing">');
  html = html.replace(/<div[^>]*class="[^"]*shape[^"]*"[^>]*>/gi, '<div class="docx-shape">');
  html = html.replace(/<div[^>]*class="[^"]*background[^"]*"[^>]*>/gi, '<div class="docx-background">');
  
  // Detectar elementos canvas ou SVG que podem ser desenhos
  html = html.replace(/<canvas[^>]*>/gi, '<div class="docx-drawing" data-original="canvas">');
  html = html.replace(/<\/canvas>/gi, '</div>');
  html = html.replace(/<svg[^>]*>/gi, '<div class="docx-drawing" data-original="svg">');
  html = html.replace(/<\/svg>/gi, '</div>');
  
  // Detectar elementos com data attributes do Google Docs
  html = html.replace(/data-google-docs-drawing/gi, 'class="docx-drawing" data-google-docs-drawing');
  html = html.replace(/data-drawing/gi, 'class="docx-drawing" data-drawing');
  
  // Preservar elementos com background-image
  html = html.replace(/style="([^"]*background-image[^"]*)"/gi, 'style="$1" class="has-background-image"');
  
  console.log('Processamento de elementos visuais concluído');
  return html;
};

module.exports = {
  getAllDocuments,
  getDocument,
  createDocument,
  deleteDocument,
  previewDocument,
  downloadDocument,
  upload
};