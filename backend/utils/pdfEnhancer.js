const fs = require('fs');
const path = require('path');

/**
 * Utilitário para melhorar a robustez da geração de PDF
 * Especialmente para elementos complexos do Google Docs
 */
class PDFEnhancer {
  
  /**
   * Configurações avançadas do Mammoth para máxima extração de conteúdo
   */
  static getMammothAdvancedOptions() {
    return {
      // Incluir todos os estilos possíveis
      includeDefaultStyleMap: true,
      includeEmbeddedStyleMap: true,
      
      // Configurações avançadas para preservar elementos visuais
      convertImage: require('mammoth').images.imgElement(function(image) {
        return image.read("base64").then(function(imageBuffer) {
          return {
            src: "data:" + image.contentType + ";base64," + imageBuffer
          };
        });
      }),
      
      // Mapeamento de estilos personalizado ultra-robusto
      styleMap: [
        // Preservar formatação de parágrafos
        "p[style-name='Normal'] => p:fresh",
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        
        // Preservar formatação de texto
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em",
        "r[style-name='Underline'] => u",
        
        // Preservar tabelas com bordas
        "table => table.docx-table",
        "tr => tr.docx-row",
        "td => td.docx-cell",
        "th => th.docx-header",
        
        // Preservar listas
        "p[style-name='List Paragraph'] => li:fresh",
        "p[style-name='Bullet List'] => li:fresh",
        "p[style-name='Numbered List'] => li:fresh",
        
        // Preservar elementos de desenho e formas
        "drawing => div.docx-drawing",
        "shape => div.docx-shape",
        "textbox => div.docx-textbox",
        "group => div.docx-group",
        
        // Preservar elementos de fundo
        "background => div.docx-background",
        "watermark => div.docx-watermark",
        
        // Preservar elementos especiais do Google Docs
        "canvas => div.docx-canvas",
        "svg => div.docx-svg"
      ],
      
      // Transformar elementos não reconhecidos
      transformDocument: function(document) {
        // Processar elementos de desenho e formas
        const drawings = document.getElementsByTagName('drawing');
        drawings.forEach(drawing => {
          drawing.setAttribute('class', 'docx-drawing');
          drawing.setAttribute('data-type', 'drawing');
        });
        
        const shapes = document.getElementsByTagName('shape');
        shapes.forEach(shape => {
          shape.setAttribute('class', 'docx-shape');
          shape.setAttribute('data-type', 'shape');
        });
        
        const textboxes = document.getElementsByTagName('textbox');
        textboxes.forEach(textbox => {
          textbox.setAttribute('class', 'docx-textbox');
          textbox.setAttribute('data-type', 'textbox');
        });
        
        const groups = document.getElementsByTagName('group');
        groups.forEach(group => {
          group.setAttribute('class', 'docx-group');
          group.setAttribute('data-type', 'group');
        });
        
        return document;
      }
    };
  }
  
  /**
   * Processar HTML para detectar e marcar elementos visuais complexos
   */
  static processHtmlForComplexElements(html) {
    console.log('Processando HTML para detectar elementos visuais complexos...');
    
    // Detectar e marcar elementos de desenho do Google Docs
    html = html.replace(/<div[^>]*class="[^"]*drawing[^"]*"[^>]*>/gi, '<div class="docx-drawing" data-google-element="drawing">');
    html = html.replace(/<div[^>]*class="[^"]*shape[^"]*"[^>]*>/gi, '<div class="docx-shape" data-google-element="shape">');
    html = html.replace(/<div[^>]*class="[^"]*background[^"]*"[^>]*>/gi, '<div class="docx-background" data-google-element="background">');
    html = html.replace(/<div[^>]*class="[^"]*textbox[^"]*"[^>]*>/gi, '<div class="docx-textbox" data-google-element="textbox">');
    
    // Detectar elementos canvas ou SVG que podem ser desenhos
    html = html.replace(/<canvas[^>]*>/gi, '<div class="docx-drawing" data-original="canvas" data-google-element="canvas">');
    html = html.replace(/<\/canvas>/gi, '</div>');
    html = html.replace(/<svg[^>]*>/gi, '<div class="docx-drawing" data-original="svg" data-google-element="svg">');
    html = html.replace(/<\/svg>/gi, '</div>');
    
    // Detectar elementos com data attributes específicos do Google Docs
    html = html.replace(/data-google-docs-drawing/gi, 'class="docx-drawing" data-google-docs-drawing data-google-element="google-drawing"');
    html = html.replace(/data-drawing/gi, 'class="docx-drawing" data-drawing data-google-element="drawing"');
    html = html.replace(/kix-canvas-tile-content/gi, 'docx-drawing kix-canvas-tile-content data-google-element="kix-canvas"');
    
    // Preservar elementos com background-image
    html = html.replace(/style="([^"]*background-image[^"]*)"/gi, 'style="$1" class="has-background-image" data-google-element="background-image"');
    
    // Detectar elementos de marca d'água
    html = html.replace(/<div[^>]*class="[^"]*watermark[^"]*"[^>]*>/gi, '<div class="docx-watermark" data-google-element="watermark">');
    
    // Detectar elementos de cabeçalho e rodapé
    html = html.replace(/<div[^>]*class="[^"]*header[^"]*"[^>]*>/gi, '<div class="docx-header-element" data-google-element="header">');
    html = html.replace(/<div[^>]*class="[^"]*footer[^"]*"[^>]*>/gi, '<div class="docx-footer-element" data-google-element="footer">');
    
    // Detectar elementos de comentário
    html = html.replace(/<div[^>]*class="[^"]*comment[^"]*"[^>]*>/gi, '<div class="docx-comment" data-google-element="comment">');
    
    console.log('Processamento de elementos visuais complexos concluído');
    return html;
  }
  
  /**
   * Gerar CSS ultra-robusto para preservar todos os elementos visuais
   */
  static getUltraRobustCSS(documentTitle = 'Documento') {
    return `
      @page {
        margin: 2cm;
        size: A4;
      }
      
      * {
        box-sizing: border-box;
      }
      
      body { 
        font-family: 'Times New Roman', serif; 
        line-height: 1.4; 
        margin: 0;
        padding: 0;
        color: #000;
        font-size: 12pt;
        background: white;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* PRESERVAR IMAGENS E ELEMENTOS VISUAIS */
      img { 
        max-width: 100% !important; 
        height: auto !important; 
        display: block !important;
        margin: 10px auto !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* ELEMENTOS DE DESENHO E FORMAS DO GOOGLE DOCS */
      .docx-drawing, .docx-shape, .docx-background, .docx-textbox, .docx-group, .docx-canvas, .docx-svg {
        display: block !important;
        margin: 8px 0 !important;
        padding: 8px !important;
        border: 1px solid #007bff !important;
        background-color: #f8f9fa !important;
        border-radius: 4px !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
        position: relative !important;
      }
      
      .docx-drawing::before {
        content: "🎨 Desenho/Elemento Visual" !important;
        font-size: 10pt !important;
        color: #007bff !important;
        font-weight: bold !important;
        display: block !important;
        margin-bottom: 4px !important;
      }
      
      .docx-shape::before {
        content: "🔷 Forma/Shape" !important;
        font-size: 10pt !important;
        color: #28a745 !important;
        font-weight: bold !important;
        display: block !important;
        margin-bottom: 4px !important;
      }
      
      .docx-background::before {
        content: "🌈 Fundo Personalizado" !important;
        font-size: 10pt !important;
        color: #6f42c1 !important;
        font-weight: bold !important;
        display: block !important;
        margin-bottom: 4px !important;
      }
      
      .docx-textbox::before {
        content: "📝 Caixa de Texto" !important;
        font-size: 10pt !important;
        color: #fd7e14 !important;
        font-weight: bold !important;
        display: block !important;
        margin-bottom: 4px !important;
      }
      
      .docx-group::before {
        content: "📦 Grupo de Elementos" !important;
        font-size: 10pt !important;
        color: #20c997 !important;
        font-weight: bold !important;
        display: block !important;
        margin-bottom: 4px !important;
      }
      
      .docx-canvas::before {
        content: "🖼️ Canvas/Tela" !important;
        font-size: 10pt !important;
        color: #e83e8c !important;
        font-weight: bold !important;
        display: block !important;
        margin-bottom: 4px !important;
      }
      
      .docx-svg::before {
        content: "🎯 Gráfico Vetorial (SVG)" !important;
        font-size: 10pt !important;
        color: #17a2b8 !important;
        font-weight: bold !important;
        display: block !important;
        margin-bottom: 4px !important;
      }
      
      /* ELEMENTOS ESPECIAIS DO GOOGLE DOCS */
      [data-google-docs-drawing], [data-drawing], .kix-canvas-tile-content {
        display: block !important;
        margin: 10px 0 !important;
        padding: 12px !important;
        border: 2px dashed #007bff !important;
        background-color: #e3f2fd !important;
        text-align: center !important;
        border-radius: 6px !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      [data-google-docs-drawing]::before, [data-drawing]::before, .kix-canvas-tile-content::before {
        content: "🎨 Elemento Visual do Google Docs" !important;
        display: block !important;
        font-weight: bold !important;
        color: #1976d2 !important;
        margin-bottom: 8px !important;
        font-size: 11pt !important;
      }
      
      /* MARCA D'ÁGUA E ELEMENTOS DE FUNDO */
      .docx-watermark {
        display: block !important;
        margin: 5px 0 !important;
        padding: 8px !important;
        border: 1px dashed #6c757d !important;
        background-color: #f8f9fa !important;
        text-align: center !important;
        font-style: italic !important;
        color: #6c757d !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .docx-watermark::before {
        content: "💧 Marca d'Água" !important;
        font-weight: bold !important;
        display: block !important;
        margin-bottom: 4px !important;
      }
      
      /* CABEÇALHOS E RODAPÉS */
      .docx-header-element, .docx-footer-element {
        display: block !important;
        margin: 8px 0 !important;
        padding: 8px !important;
        border-top: 2px solid #dee2e6 !important;
        border-bottom: 2px solid #dee2e6 !important;
        background-color: #f8f9fa !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .docx-header-element::before {
        content: "📄 Cabeçalho" !important;
        font-weight: bold !important;
        color: #495057 !important;
        font-size: 10pt !important;
      }
      
      .docx-footer-element::before {
        content: "📄 Rodapé" !important;
        font-weight: bold !important;
        color: #495057 !important;
        font-size: 10pt !important;
      }
      
      /* COMENTÁRIOS */
      .docx-comment {
        display: block !important;
        margin: 5px 0 !important;
        padding: 6px !important;
        border-left: 4px solid #ffc107 !important;
        background-color: #fff3cd !important;
        font-size: 10pt !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .docx-comment::before {
        content: "💬 Comentário" !important;
        font-weight: bold !important;
        color: #856404 !important;
      }
      
      /* PRESERVAR FUNDOS E CORES */
      [style*="background"], [style*="color"], .has-background-image {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* TABELAS ULTRA-ROBUSTAS */
      table, .docx-table { 
        border-collapse: collapse !important; 
        width: 100% !important; 
        margin: 8px 0 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        border: 1px solid #000 !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      table *, .docx-table * {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      td, th, .docx-cell, .docx-header {
        border: 1px solid #000 !important; 
        padding: 8px !important; 
        text-align: left !important;
        vertical-align: top !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      th, .docx-header { 
        background-color: #f8f9fa !important; 
        font-weight: bold !important;
        border: 1px solid #000 !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      tr, .docx-row {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        border: 1px solid #000 !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* CABEÇALHOS E TEXTO */
      p { 
        margin: 6px 0 !important; 
        text-align: justify !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      h1, h2, h3, h4, h5, h6 { 
        margin: 16px 0 10px 0 !important; 
        page-break-after: avoid !important;
        color: #000 !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      h1 { font-size: 20pt !important; font-weight: bold !important; }
      h2 { font-size: 18pt !important; font-weight: bold !important; }
      h3 { font-size: 16pt !important; font-weight: bold !important; }
      h4 { font-size: 14pt !important; font-weight: bold !important; }
      h5 { font-size: 13pt !important; font-weight: bold !important; }
      h6 { font-size: 12pt !important; font-weight: bold !important; }
      
      /* LISTAS */
      ul, ol { 
        margin: 8px 0 !important; 
        padding-left: 30px !important; 
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      li { 
        margin: 3px 0 !important; 
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* FORMATAÇÃO DE TEXTO */
      strong, b { 
        font-weight: bold !important; 
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      em, i { 
        font-style: italic !important; 
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      u {
        text-decoration: underline !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* PRESERVAR QUEBRAS DE PÁGINA */
      .page-break {
        page-break-before: always !important;
      }
      
      /* ELEMENTOS INLINE ESPECIAIS */
      span[style*="background"], span[style*="color"] {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* ELEMENTOS DE DESTAQUE */
      .highlight {
        background-color: #ffeb3b !important;
        padding: 2px 4px !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* BORDAS E DIVISORES */
      hr {
        border: none !important;
        border-top: 2px solid #dee2e6 !important;
        margin: 16px 0 !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    `;
  }
  
  /**
   * Configurações avançadas do Puppeteer para máxima qualidade
   */
  static getPuppeteerAdvancedConfig() {
    return {
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--allow-running-insecure-content',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--enable-features=NetworkService,NetworkServiceLogging',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--use-mock-keychain'
      ]
    };
  }
  
  /**
   * Configurações avançadas para geração de PDF
   */
  static getPDFAdvancedOptions() {
    return {
      format: 'A4',
      margin: {
        top: '2cm',
        right: '2cm',
        bottom: '2cm',
        left: '2cm'
      },
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      timeout: 120000, // 2 minutos
      scale: 1,
      landscape: false,
      omitBackground: false
    };
  }
  
  /**
   * Executar otimizações JavaScript avançadas na página
   */
  static getPageOptimizationScript() {
    return `
      console.log('Executando otimizações ultra-avançadas...');
      
      // 1. Otimizar tabelas
      const tables = document.querySelectorAll('table, .docx-table');
      console.log(\`Encontradas \${tables.length} tabelas para otimizar\`);
      
      tables.forEach((table, index) => {
        console.log(\`Processando tabela \${index + 1}...\`);
        
        // Aplicar estilos de não quebra
        table.style.setProperty('page-break-inside', 'avoid', 'important');
        table.style.setProperty('break-inside', 'avoid', 'important');
        table.style.setProperty('border-collapse', 'collapse', 'important');
        table.style.setProperty('border', '1px solid #000', 'important');
        
        // Processar células
        const cells = table.querySelectorAll('td, th, .docx-cell, .docx-header');
        cells.forEach(cell => {
          cell.style.setProperty('border', '1px solid #000', 'important');
          cell.style.setProperty('padding', '8px', 'important');
          cell.style.setProperty('page-break-inside', 'avoid', 'important');
          cell.style.setProperty('break-inside', 'avoid', 'important');
        });
        
        // Processar linhas
        const rows = table.querySelectorAll('tr, .docx-row');
        rows.forEach(row => {
          row.style.setProperty('page-break-inside', 'avoid', 'important');
          row.style.setProperty('break-inside', 'avoid', 'important');
        });
      });
      
      // 2. Detectar e marcar elementos visuais não capturados
      const allElements = document.querySelectorAll('*');
      allElements.forEach(element => {
        const style = window.getComputedStyle(element);
        
        // Detectar elementos com background especial
        if (style.backgroundImage && style.backgroundImage !== 'none') {
          element.classList.add('has-background-image');
          element.style.setProperty('-webkit-print-color-adjust', 'exact', 'important');
        }
        
        // Detectar elementos com cores especiais
        if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
          element.style.setProperty('-webkit-print-color-adjust', 'exact', 'important');
        }
        
        // Detectar elementos que podem ser desenhos
        if (element.tagName === 'CANVAS' || 
            element.tagName === 'SVG' || 
            element.classList.contains('kix-canvas-tile-content') ||
            element.hasAttribute('data-drawing') ||
            element.hasAttribute('data-google-docs-drawing') ||
            element.hasAttribute('data-google-element')) {
          
          element.style.setProperty('border', '2px dashed #007bff', 'important');
          element.style.setProperty('background-color', '#e3f2fd', 'important');
          element.style.setProperty('padding', '12px', 'important');
          element.style.setProperty('margin', '10px 0', 'important');
          element.style.setProperty('-webkit-print-color-adjust', 'exact', 'important');
          element.style.setProperty('border-radius', '6px', 'important');
          
          if (!element.textContent || element.textContent.trim() === '') {
            const elementType = element.getAttribute('data-google-element') || 'visual';
            element.innerHTML = \`🎨 Elemento Visual (\${elementType})\`;
          }
        }
      });
      
      // 3. Processar imagens para garantir que sejam preservadas
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        img.style.setProperty('max-width', '100%', 'important');
        img.style.setProperty('height', 'auto', 'important');
        img.style.setProperty('display', 'block', 'important');
        img.style.setProperty('margin', '10px auto', 'important');
        img.style.setProperty('-webkit-print-color-adjust', 'exact', 'important');
      });
      
      // 4. Otimizar elementos de texto com formatação especial
      const highlightElements = document.querySelectorAll('[style*="background-color"], [style*="background"]');
      highlightElements.forEach(element => {
        element.classList.add('highlight');
        element.style.setProperty('-webkit-print-color-adjust', 'exact', 'important');
      });
      
      // 5. Garantir que elementos flutuantes sejam preservados
      const floatingElements = document.querySelectorAll('[style*="float"], [style*="position"]');
      floatingElements.forEach(element => {
        element.style.setProperty('position', 'relative', 'important');
        element.style.setProperty('display', 'block', 'important');
      });
      
      console.log('Otimizações ultra-avançadas concluídas');
    `;
  }
}

module.exports = PDFEnhancer;