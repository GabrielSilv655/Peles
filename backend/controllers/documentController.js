const { Document, DocumentVersion, DocumentTemplate, Subject, User } = require('../models');
const PDFEnhancer = require('../utils/pdfEnhancer');
const mammoth = require('mammoth');

exports.getDocuments = async (req, res) => {
    try {
        const docs = await Document.findAll();
        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar documentos', error: error.message });
    }
};

    // Obter documento específico
exports.getDocument = async (req, res) => {
    try {
        const doc = await Document.findByPk(req.params.id);

        if (!doc) {
            return res.status(404).json({ message: 'Documento não encontrado' });
        }

        res.json(doc);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar documento', error: error.message });
    }
};

exports.createDocument = async (req, res) => {
    try {
        const { 
            title, 
            subject_id, 
            template_id,
            content,
            file_name, 
            file_type, 
            file_data 
        } = req.body;

        const template = await DocumentTemplate.findByPk(template_id);
        if (!template) {
            //return res.status(404).json({ message: 'Template não encontrado' });
        }

        if (!validateContentAgainstTemplate(content, template.structure)) {
            return res.status(400).json({ message: 'Conteúdo não corresponde à estrutura do template' });
        }

        const document = await Document.create({
            title,
            subject_id,
            template_id,
            content,
            file_name,
            file_type,
            file_data: file_data ? Buffer.from(file_data, "base64") : null,
            created_by: req.user.id,
            last_modified_by: req.user.id,
            status: 'draft',
            version: 1
        });

        // Criar primeira versão
        await DocumentVersion.create({
            document_id: document.id,
            version: 1,
            content,
            modified_by: req.user.id,
            change_description: 'Criação inicial do documento'
        });

        res.status(201).json(document);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar documento', error: error.message });
    }
};

// Atualizar documento
exports.updateDocument = async (req, res) => {
    try {
        const document = await Document.findByPk(req.params.id, {
            include: [{ model: DocumentTemplate, as: 'template' }]
        });

        if (!document) {
            return res.status(404).json({ message: 'Documento não encontrado' });
        }

        const { content, status } = req.body;

        // Validar conteúdo contra template
        if (content && !validateContentAgainstTemplate(content, document.template.structure)) {
            return res.status(400).json({ message: 'Conteúdo não corresponde à estrutura do template' });
        }

        // Incrementar versão
        const newVersion = document.version + 1;

        // Atualizar documento
        await document.update({
            content: content || document.content,
            status: status || document.status,
            version: newVersion,
            last_modified_by: req.user.id
        });

        // Criar nova versão
        await DocumentVersion.create({
            document_id: document.id,
            version: newVersion,
            content: content || document.content,
            modified_by: req.user.id,
            change_description: req.body.change_description || 'Atualização do documento'
        });

        res.json(document);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar documento', error: error.message });
    }
};

// Deletar documento
exports.deleteDocument = async (req, res) => {
    try {
        const document = await Document.findByPk(req.params.id);
        
        if (!document) {
            return res.status(404).json({ message: 'Documento não encontrado' });
        }

        await document.destroy();
        res.json({ message: 'Documento excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar documento', error: error.message });
    }
};

// Listar versões de um documento
exports.getDocumentVersions = async (req, res) => {
    try {
        const versions = await DocumentVersion.findAll({
            where: { document_id: req.params.id },
            include: [{
                model: User,
                as: 'modifier',
                attributes: ['id', 'name']
            }],
            order: [['version', 'DESC']]
        });

        res.json(versions);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar versões do documento', error: error.message });
    }
};

// Download do documento
exports.downloadDocument = async (req, res) => {
    try {
        const document = await Document.findByPk(req.params.id, {
            include: [
                { model: DocumentTemplate, as: 'template' },
                { model: Subject, as: 'subject' }
            ]
        });

        if (!document) {
            return res.status(404).json({ message: 'Documento não encontrado' });
        }

        // Gerar arquivo baseado no template e conteúdo
        const fileBuffer = await generateDocumentFile(document);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${document.title}.pdf"`);
        res.send(fileBuffer);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao baixar documento', error: error.message });
    }
};

// Função auxiliar para validar conteúdo contra template
const validateContentAgainstTemplate = (content, templateStructure) => {
    try {
        // Implementar lógica de validação do conteúdo contra a estrutura do template
        // Esta é uma implementação básica que deve ser adaptada às necessidades específicas
        
        if (!content || typeof content !== 'object') {
            return false;
        }

        // Verificar se todos os campos obrigatórios do template estão presentes
        for (const field of Object.keys(templateStructure)) {
            if (templateStructure[field].required && !content.hasOwnProperty(field)) {
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('Erro na validação do template:', error);
        return false;
    }
}

// Função auxiliar para gerar arquivo do documento usando Puppeteer
const generateDocumentFile = async (document) => {
    let browser = null;
    
    try {
        console.log('Gerando PDF robusto do documento:', document.title);
        
        // Criar HTML estruturado do documento
        let html = `
            <div class="document-header">
                <h1>SISA - Sistema Acadêmico</h1>
                <h2>${document.title}</h2>
                ${document.subject ? `<p><strong>Disciplina:</strong> ${document.subject.name}</p>` : ''}
                <hr>
            </div>
            
            <div class="document-content">
                <h3>Conteúdo do Documento:</h3>
        `;
        
        // Adicionar conteúdo baseado no template
        if (document.content && document.template && document.template.structure) {
            Object.entries(document.template.structure).forEach(([fieldName, fieldConfig]) => {
                const value = document.content[fieldName];
                if (value) {
                    html += `
                        <div class="field">
                            <h4>${fieldConfig.label || fieldName}:</h4>
                            <p>${value.toString()}</p>
                        </div>
                    `;
                }
            });
        }
        
        html += `
            </div>
            
            <div class="document-footer">
                <hr>
                <p><strong>Documento gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                <p><strong>Versão:</strong> ${document.version}</p>
                <p><strong>Status:</strong> ${document.status}</p>
            </div>
        `;

        // Criar HTML completo para PDF
        const fullHtml = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${document.title}</title>
                <style>
                    ${PDFEnhancer.getUltraRobustCSS(document.title)}
                    
                    .document-header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    
                    .document-header h1 {
                        color: #2c3e50;
                        margin-bottom: 10px;
                    }
                    
                    .document-header h2 {
                        color: #34495e;
                        margin-bottom: 20px;
                    }
                    
                    .document-content {
                        margin: 20px 0;
                    }
                    
                    .field {
                        margin-bottom: 15px;
                        padding: 10px;
                        border-left: 4px solid #3498db;
                        background-color: #f8f9fa;
                    }
                    
                    .field h4 {
                        margin: 0 0 5px 0;
                        color: #2c3e50;
                    }
                    
                    .field p {
                        margin: 0;
                        color: #34495e;
                    }
                    
                    .document-footer {
                        margin-top: 30px;
                        text-align: center;
                        font-size: 10pt;
                        color: #7f8c8d;
                    }
                    
                    hr {
                        border: none;
                        border-top: 2px solid #bdc3c7;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `;

        // Usar Puppeteer para gerar PDF
        const puppeteer = require('puppeteer');
        browser = await puppeteer.launch(PDFEnhancer.getPuppeteerAdvancedConfig());
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
        
        // Interceptar requests desnecessários
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if(req.resourceType() == 'stylesheet' || req.resourceType() == 'font'){
                req.abort();
            } else {
                req.continue();
            }
        });
        
        await page.setContent(fullHtml, { 
            waitUntil: ['networkidle0', 'domcontentloaded'],
            timeout: 120000
        });
        
        // Aguardar carregamento
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Executar otimizações
        await page.evaluate(PDFEnhancer.getPageOptimizationScript());
        
        // Gerar PDF
        const pdfBuffer = await page.pdf(PDFEnhancer.getPDFAdvancedOptions());
        
        await browser.close();
        browser = null;
        
        console.log('PDF robusto do documento gerado com sucesso! Tamanho:', pdfBuffer.length, 'bytes');
        return pdfBuffer;
        
    } catch (error) {
        console.error('Erro ao gerar PDF robusto do documento:', error);
        
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('Erro ao fechar browser:', closeError);
            }
        }
        
        throw error;
    }
}
