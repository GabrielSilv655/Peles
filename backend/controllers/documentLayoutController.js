const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const mammoth = require('mammoth');
const DocumentLayout = require('../models/DocumentLayout');
const PDFEnhancer = require('../utils/pdfEnhancer');

// Função para extrair placeholders de um documento DOCX
const extractPlaceholders = (filePath) => {
  try {
    console.log('Extraindo placeholders do arquivo:', filePath);
    
    const content = fs.readFileSync(filePath, 'binary');
    const zip = new PizZip(content);
    
    // Extrair texto diretamente do XML sem usar docxtemplater
    let documentXml = '';
    
    try {
      // Tentar ler document.xml
      documentXml = zip.files['word/document.xml'].asText();
    } catch (xmlError) {
      console.error('Erro ao ler document.xml:', xmlError);
      return [];
    }

    // Extrair placeholders usando regex no XML bruto
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const placeholders = [];
    let match;

    // Limpar o XML de tags para obter texto puro
    const textContent = documentXml
      .replace(/<[^>]*>/g, '') // Remove todas as tags XML
      .replace(/&lt;/g, '<')   // Decodifica entidades HTML
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    console.log('Texto extraído (primeiros 500 chars):', textContent.substring(0, 500));

    while ((match = placeholderRegex.exec(textContent)) !== null) {
      const placeholder = match[1].trim();
      if (placeholder && !placeholders.includes(placeholder)) {
        placeholders.push(placeholder);
      }
    }

    console.log('Placeholders encontrados:', placeholders);
    return placeholders;
  } catch (error) {
    console.error('Erro ao extrair placeholders:', error);
    return [];
  }
};

// Listar todos os layouts
const getAllLayouts = async (req, res) => {
  try {
    console.log('Buscando todos os layouts...');
    
    const layouts = await DocumentLayout.findAll({
      order: [['created_at', 'DESC']]
    });
    
    console.log(`Encontrados ${layouts.length} layouts`);
    
    // Garantir que placeholders seja sempre um array
    const layoutsWithParsedPlaceholders = layouts.map(layout => {
      const layoutData = layout.toJSON();
      
      // Se placeholders já é um array (devido ao getter do modelo), usar diretamente
      // Senão, tentar fazer parse
      let placeholders = [];
      if (Array.isArray(layoutData.placeholders)) {
        placeholders = layoutData.placeholders;
      } else if (typeof layoutData.placeholders === 'string') {
        try {
          placeholders = JSON.parse(layoutData.placeholders);
        } catch (e) {
          console.error('Erro ao fazer parse dos placeholders:', e);
          placeholders = [];
        }
      }
      
      return {
        ...layoutData,
        placeholders: placeholders
      };
    });
    
    res.json(layoutsWithParsedPlaceholders);
  } catch (error) {
    console.error('Erro ao buscar layouts:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Buscar layout por ID
const getLayout = async (req, res) => {
  try {
    const layout = await DocumentLayout.findByPk(req.params.id);
    if (!layout) {
      return res.status(404).json({ message: 'Layout não encontrado' });
    }
    
    const layoutData = layout.toJSON();
    
    // Garantir que placeholders seja sempre um array
    let placeholders = [];
    if (Array.isArray(layoutData.placeholders)) {
      placeholders = layoutData.placeholders;
    } else if (typeof layoutData.placeholders === 'string') {
      try {
        placeholders = JSON.parse(layoutData.placeholders);
      } catch (e) {
        console.error('Erro ao fazer parse dos placeholders:', e);
        placeholders = [];
      }
    }
    
    const responseLayout = {
      ...layoutData,
      placeholders: placeholders
    };
    
    res.json(responseLayout);
  } catch (error) {
    console.error('Erro ao buscar layout:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Criar novo layout
const createLayout = async (req, res) => {
  try {
    console.log('Criando novo layout...');
    console.log('Arquivo recebido:', req.file);
    console.log('Dados do body:', req.body);
    
    if (!req.file) {
      return res.status(400).json({ message: 'Arquivo DOCX é obrigatório' });
    }

    const { name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Nome é obrigatório' });
    }

    // Extrair placeholders do arquivo
    const placeholders = extractPlaceholders(req.file.path);
    console.log('Placeholders extraídos para salvar:', placeholders);

    // Criar registro no banco - usar string JSON diretamente para evitar conflitos com getter/setter
    const layout = await DocumentLayout.create({
      name: name.trim(),
      description: description?.trim() || '',
      file_path: req.file.path,
      original_filename: req.file.originalname,
      placeholders: JSON.stringify(placeholders), // Forçar string JSON
      created_by: req.user?.id || 1
    });

    console.log('Layout criado com ID:', layout.id);

    // Retornar layout com placeholders como array
    const responseLayout = {
      id: layout.id,
      name: layout.name,
      description: layout.description,
      file_path: layout.file_path,
      original_filename: layout.original_filename,
      placeholders: placeholders, // Array direto
      created_by: layout.created_by,
      created_at: layout.created_at,
      updated_at: layout.updated_at
    };

    res.status(201).json(responseLayout);
  } catch (error) {
    console.error('Erro ao criar layout:', error);
    
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

// Deletar layout
const deleteLayout = async (req, res) => {
  try {
    const layout = await DocumentLayout.findByPk(req.params.id);
    
    if (!layout) {
      return res.status(404).json({ message: 'Layout não encontrado' });
    }

    // Remover arquivo do sistema
    if (fs.existsSync(layout.file_path)) {
      fs.unlinkSync(layout.file_path);
    }

    await layout.destroy();
    res.json({ message: 'Layout excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar layout:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Preview do layout (sem dados preenchidos)
const previewLayout = async (req, res) => {
  try {
    console.log('Gerando preview do layout:', req.params.id);
    
    const layout = await DocumentLayout.findByPk(req.params.id);
    if (!layout) {
      return res.status(404).json({ message: 'Layout não encontrado' });
    }

    if (!fs.existsSync(layout.file_path)) {
      return res.status(404).json({ message: 'Arquivo do layout não encontrado' });
    }

    // Converter DOCX para HTML usando mammoth para preview
    const result = await mammoth.convertToHtml({ path: layout.file_path });
    const html = result.value;

    // Retornar HTML para preview
    res.json({
      html: html,
      messages: result.messages
    });
  } catch (error) {
    console.error('Erro ao gerar preview:', error);
    res.status(500).json({ 
      message: 'Erro ao gerar preview',
      error: error.message 
    });
  }
};

// Preview do documento com dados preenchidos
const previewDocument = async (req, res) => {
  try {
    console.log('Gerando preview do documento com dados:', req.params.id);
    console.log('Dados recebidos:', req.body);
    
    const { data } = req.body;
    
    const layout = await DocumentLayout.findByPk(req.params.id);
    if (!layout) {
      return res.status(404).json({ message: 'Layout não encontrado' });
    }

    if (!fs.existsSync(layout.file_path)) {
      return res.status(404).json({ message: 'Arquivo do layout não encontrado' });
    }

    // Ler o arquivo template
    const content = fs.readFileSync(layout.file_path, 'binary');
    const zip = new PizZip(content);
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}'
      }
    });

    // Substituir placeholders usando a nova API
    doc.render(data);

    // Gerar DOCX temporário
    const buf = doc.getZip().generate({ type: 'nodebuffer' });
    
    // Salvar temporariamente
    const tempPath = path.join(__dirname, '../temp', `preview-${Date.now()}.docx`);
    const tempDir = path.dirname(tempPath);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(tempPath, buf);

    try {
      // Converter para HTML para preview
      const result = await mammoth.convertToHtml({ path: tempPath });
      const html = result.value;

      // Limpar arquivo temporário
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }

      // Retornar HTML para preview
      res.json({
        html: html,
        messages: result.messages
      });
    } catch (previewError) {
      // Limpar arquivo temporário em caso de erro
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw previewError;
    }
  } catch (error) {
    console.error('Erro ao gerar preview do documento:', error);
    res.status(500).json({ 
      message: 'Erro ao gerar preview do documento',
      error: error.message 
    });
  }
};

// Gerar documento
const generateDocument = async (req, res) => {
  try {
    console.log('Gerando documento para layout:', req.params.id);
    console.log('Dados recebidos:', req.body);
    
    const { data, format = 'docx' } = req.body;
    
    const layout = await DocumentLayout.findByPk(req.params.id);
    if (!layout) {
      return res.status(404).json({ message: 'Layout não encontrado' });
    }

    if (!fs.existsSync(layout.file_path)) {
      return res.status(404).json({ message: 'Arquivo do layout não encontrado' });
    }

    // Ler o arquivo template
    const content = fs.readFileSync(layout.file_path, 'binary');
    const zip = new PizZip(content);
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}'
      }
    });

    // Substituir placeholders usando a nova API
    doc.render(data);

    if (format === 'docx') {
      // Gerar DOCX
      const buf = doc.getZip().generate({ type: 'nodebuffer' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(layout.name)}.docx"`);
      res.end(buf, 'binary');
    } else if (format === 'pdf') {
      // Gerar PDF usando uma abordagem mais robusta
      await generatePDF(doc, layout, res);
    } else {
      res.status(400).json({ message: 'Formato não suportado. Use "docx" ou "pdf".' });
    }
  } catch (error) {
    console.error('Erro ao gerar documento:', error);
    res.status(500).json({ 
      message: 'Erro ao gerar documento',
      error: error.message 
    });
  }
};

// Função separada para gerar PDF ultra-robusto
const generatePDF = async (doc, layout, res) => {
  let browser = null;
  let tempDocxPath = null;
  
  try {
    console.log('Iniciando geração de PDF ultra-robusto para layout:', layout.name);
    
    // Gerar DOCX temporário
    const buf = doc.getZip().generate({ type: 'nodebuffer' });
    
    tempDocxPath = path.join(__dirname, '../temp', `temp-${Date.now()}.docx`);
    const tempDir = path.dirname(tempDocxPath);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(tempDocxPath, buf);
    console.log('DOCX temporário criado:', tempDocxPath);

    // Converter DOCX para HTML usando configurações ultra-robustas do PDFEnhancer
    console.log('Convertendo DOCX para HTML com configurações ultra-robustas...');
    const result = await mammoth.convertToHtml({ 
      path: tempDocxPath,
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
        <title>${layout.name}</title>
        <style>
          ${PDFEnhancer.getUltraRobustCSS(layout.name)}
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

    console.log('PDF ultra-robusto gerado com sucesso! Tamanho:', pdfBuffer.length, 'bytes');

    // Fechar browser
    await browser.close();
    browser = null;

    // Limpar arquivo temporário
    if (tempDocxPath && fs.existsSync(tempDocxPath)) {
      fs.unlinkSync(tempDocxPath);
    }

    // Verificar se o buffer é válido
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF buffer está vazio');
    }

    // Enviar PDF
    const fileName = `${layout.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer, 'binary');
    
  } catch (pdfError) {
    console.error('Erro detalhado ao gerar PDF ultra-robusto:', pdfError);
    
    // Fechar browser se ainda estiver aberto
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Erro ao fechar browser:', closeError);
      }
    }
    
    // Limpar arquivo temporário
    if (tempDocxPath && fs.existsSync(tempDocxPath)) {
      fs.unlinkSync(tempDocxPath);
    }
    
    res.status(500).json({ 
      message: 'Erro ao gerar PDF ultra-robusto. Tente o formato DOCX.',
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
  getAllLayouts,
  getLayout,
  createLayout,
  deleteLayout,
  previewLayout,
  previewDocument,
  generateDocument
};
