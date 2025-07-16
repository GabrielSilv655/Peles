const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const PDFEnhancer = require('../utils/pdfEnhancer');

class DocumentTemplateProcessor {
    /**
     * Extrai campos de template de um arquivo DOCX
     * @param {Buffer} docxBuffer - Buffer do arquivo DOCX
     * @returns {Array} Array de campos encontrados
     */
    static extractTemplateFields(docxBuffer) {
        try {
            const zip = new PizZip(docxBuffer);
            const doc = new Docxtemplater(zip);
            
            // Extrair campos do template
            const fields = [];
            const regex = /\{\{([^}]+)\}\}/g;
            let match;
            
            // Processar cada parte do documento
            const documentXml = zip.files['word/document.xml'].asText();
            while ((match = regex.exec(documentXml)) !== null) {
                const fieldName = match[1].trim();
                if (!fields.includes(fieldName)) {
                    fields.push(fieldName);
                }
            }
            
            return fields;
        } catch (error) {
            console.error('Erro ao extrair campos do template:', error);
            throw new Error('Erro ao processar arquivo DOCX');
        }
    }

    /**
     * Gera documento DOCX com campos substituídos
     * @param {Buffer} templateBuffer - Buffer do template DOCX
     * @param {Object} fieldValues - Valores para substituir os campos
     * @returns {Buffer} Buffer do documento gerado
     */
    static generateDocx(templateBuffer, fieldValues) {
        try {
            const zip = new PizZip(templateBuffer);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true
            });
            
            // Renderizar template com valores
            doc.render(fieldValues);
            
            // Gerar arquivo final
            const output = doc.getZip().generate({ type: 'nodebuffer' });
            return output;
        } catch (error) {
            console.error('Erro ao gerar DOCX:', error);
            throw new Error('Erro ao gerar documento DOCX');
        }
    }

    /**
     * Método alternativo para gerar DOCX (compatibilidade)
     * @param {Buffer} templateBuffer - Buffer do template DOCX
     * @param {Object} data - Dados para substituir
     * @returns {Buffer} Buffer do documento gerado
     */
    static generateDOCX(templateBuffer, data) {
        return this.generateDocx(templateBuffer, data);
    }

    /**
     * Converte DOCX para PDF usando Puppeteer (preserva elementos visuais)
     * @param {Buffer} docxBuffer - Buffer do arquivo DOCX
     * @returns {Promise<Buffer>} Buffer do PDF gerado
     */
    static async convertDocxToPdf(docxBuffer) {
        let browser = null;
        
        try {
            console.log('Convertendo DOCX para PDF com preservação de elementos visuais...');
            
            // Converter DOCX para HTML usando configurações robustas
            const result = await mammoth.convertToHtml({ 
                buffer: docxBuffer,
                options: PDFEnhancer.getMammothAdvancedOptions()
            });
            
            let html = result.value;
            console.log('HTML gerado, tamanho:', html.length);

            // Processar HTML para detectar elementos visuais
            html = PDFEnhancer.processHtmlForComplexElements(html);

            // Criar HTML completo para PDF
            const fullHtml = `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Documento</title>
                    <style>
                        ${PDFEnhancer.getUltraRobustCSS('Documento')}
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
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Executar otimizações
            await page.evaluate(PDFEnhancer.getPageOptimizationScript());
            
            // Aguardar após otimizações
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Gerar PDF
            const pdfBuffer = await page.pdf(PDFEnhancer.getPDFAdvancedOptions());
            
            await browser.close();
            browser = null;
            
            console.log('PDF gerado com sucesso! Tamanho:', pdfBuffer.length, 'bytes');
            return pdfBuffer;
            
        } catch (error) {
            console.error('Erro ao converter DOCX para PDF:', error);
            
            if (browser) {
                try {
                    await browser.close();
                } catch (closeError) {
                    console.error('Erro ao fechar browser:', closeError);
                }
            }
            
            throw new Error('Erro ao converter documento para PDF');
        }
    }

    /**
     * Gera preview HTML do documento
     * @param {Buffer} templateBuffer - Buffer do template
     * @param {Object} data - Dados para substituir
     * @returns {Promise<string>} HTML do preview
     */
    static async generatePreview(templateBuffer, data) {
        try {
            const docxBuffer = this.generateDocx(templateBuffer, data);
            const { value: html } = await mammoth.convertToHtml({ 
                buffer: docxBuffer,
                options: PDFEnhancer.getMammothAdvancedOptions()
            });
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6 }
                        table { border-collapse: collapse; width: 100% }
                        table, th, td { border: 1px solid #ddd }
                        th, td { padding: 8px; text-align: left }
                        img { max-width: 100%; height: auto; }
                        .docx-drawing, .docx-shape, .docx-background {
                            border: 1px solid #ccc;
                            padding: 5px;
                            margin: 5px 0;
                            background-color: #f9f9f9;
                        }
                    </style>
                </head>
                <body>${html}</body>
                </html>
            `;
        } catch (error) {
            console.error("Erro no preview HTML:", error);
            throw new Error("Falha ao gerar preview");
        }
    }

    /**
     * Gera PDF usando Puppeteer (preserva elementos visuais)
     * @param {Buffer} templateBuffer - Buffer do template
     * @param {Object} data - Dados para substituir
     * @returns {Promise<Buffer>} Buffer do PDF gerado
     */
    static async generatePDF(templateBuffer, data) {
        try {
            const docxBuffer = this.generateDocx(templateBuffer, data);
            return await this.convertDocxToPdf(docxBuffer);
        } catch (error) {
            console.error("Erro na geração PDF:", error);
            throw new Error("Falha ao gerar PDF");
        }
    }

    /**
     * Processa upload de template e extrai campos
     * @param {Object} file - Arquivo enviado
     * @returns {Object} Informações do template processado
     */
    static async processTemplateUpload(file) {
        try {
            if (!file || !file.buffer) {
                throw new Error('Arquivo não fornecido');
            }

            // Verificar se é um arquivo DOCX
            if (!file.mimetype.includes('wordprocessingml.document') && 
                !file.originalname.endsWith('.docx')) {
                throw new Error('Apenas arquivos DOCX são suportados');
            }

            // Extrair campos do template
            const fields = this.extractTemplateFields(file.buffer);
            
            return {
                originalName: file.originalname,
                fields: fields,
                templateBuffer: file.buffer,
                fieldCount: fields.length
            };
        } catch (error) {
            console.error('Erro ao processar template:', error);
            throw error;
        }
    }

    /**
     * Valida se todos os campos obrigatórios estão preenchidos
     * @param {Array} requiredFields - Campos obrigatórios
     * @param {Object} providedValues - Valores fornecidos
     * @returns {Object} Resultado da validação
     */
    static validateFieldValues(requiredFields, providedValues) {
        const missingFields = [];
        const validValues = {};

        for (const field of requiredFields) {
            if (!providedValues[field] || providedValues[field].trim() === '') {
                missingFields.push(field);
            } else {
                validValues[field] = providedValues[field].trim();
            }
        }

        return {
            isValid: missingFields.length === 0,
            missingFields,
            validValues
        };
    }
}

module.exports = DocumentTemplateProcessor;