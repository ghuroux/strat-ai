// Enhanced Document Export Skill for AnythingLLM
// Place this file in ./custom-skills/document-export.js

const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const PDFDocument = require('pdfkit');
const MarkdownPdf = require('markdown-pdf');

class DocumentExportSkill {
  constructor() {
    this.name = 'document-export';
    this.description = 'Export conversation or generated content to DOCX, PDF, or Markdown formats';
    this.version = '1.0.0';
    this.author = 'AnythingLLM Custom';
  }

  /**
   * Export content to DOCX format
   * @param {Object} params - Export parameters
   * @param {string} params.content - Content to export
   * @param {string} params.title - Document title
   * @param {string} params.filename - Output filename
   * @returns {Object} Export result
   */
  async exportToDocx({ content, title, filename }) {
    try {
      const outputDir = '/app/server/storage/exports';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Parse content and create document structure
      const sections = this.parseContent(content);
      const children = [];

      // Add title
      if (title) {
        children.push(
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
            spacing: { after: 400 }
          })
        );
      }

      // Add content sections
      sections.forEach(section => {
        if (section.type === 'heading') {
          children.push(
            new Paragraph({
              text: section.text,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 }
            })
          );
        } else if (section.type === 'code') {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: section.text,
                  font: 'Courier New',
                  size: 20,
                  color: '2E3440'
                })
              ],
              spacing: { before: 120, after: 120 }
            })
          );
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: section.text,
                  size: 24
                })
              ],
              spacing: { after: 120 }
            })
          );
        }
      });

      // Create document
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440,
                right: 1440,
                bottom: 1440,
                left: 1440
              }
            }
          },
          children: children
        }],
        creator: 'AnythingLLM',
        title: title || 'Exported Document',
        description: 'Document exported from AnythingLLM'
      });

      // Generate buffer and save
      const buffer = await Packer.toBuffer(doc);
      const outputPath = path.join(outputDir, filename || 'export.docx');
      fs.writeFileSync(outputPath, buffer);

      return {
        success: true,
        path: outputPath,
        size: buffer.length,
        message: `Document exported successfully to ${outputPath}`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to export document to DOCX format'
      };
    }
  }

  /**
   * Export content to PDF format
   * @param {Object} params - Export parameters
   * @param {string} params.content - Content to export
   * @param {string} params.title - Document title
   * @param {string} params.filename - Output filename
   * @returns {Object} Export result
   */
  async exportToPdf({ content, title, filename }) {
    try {
      const outputDir = '/app/server/storage/exports';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, filename || 'export.pdf');
      
      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72
        },
        info: {
          Title: title || 'Exported Document',
          Author: 'AnythingLLM',
          Creator: 'AnythingLLM Document Export'
        }
      });

      // Pipe to file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Add title
      if (title) {
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .text(title, { align: 'center' })
           .moveDown(2);
      }

      // Parse and add content
      const sections = this.parseContent(content);
      
      sections.forEach(section => {
        if (section.type === 'heading') {
          doc.fontSize(16)
             .font('Helvetica-Bold')
             .text(section.text)
             .moveDown(0.5);
        } else if (section.type === 'code') {
          doc.fontSize(10)
             .font('Courier')
             .fillColor('#2E3440')
             .text(section.text, {
               indent: 20,
               lineGap: 2
             })
             .fillColor('black')
             .moveDown(0.5);
        } else {
          doc.fontSize(11)
             .font('Helvetica')
             .text(section.text, {
               align: 'justify',
               lineGap: 2
             })
             .moveDown(0.5);
        }
      });

      // Finalize PDF
      doc.end();

      return new Promise((resolve) => {
        stream.on('finish', () => {
          resolve({
            success: true,
            path: outputPath,
            size: fs.statSync(outputPath).size,
            message: `PDF exported successfully to ${outputPath}`
          });
        });
      });

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to export document to PDF format'
      };
    }
  }

  /**
   * Export content to Markdown format
   * @param {Object} params - Export parameters
   * @param {string} params.content - Content to export
   * @param {string} params.title - Document title
   * @param {string} params.filename - Output filename
   * @returns {Object} Export result
   */
  async exportToMarkdown({ content, title, filename }) {
    try {
      const outputDir = '/app/server/storage/exports';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      let markdownContent = '';
      
      // Add title
      if (title) {
        markdownContent += `# ${title}\n\n`;
      }

      // Add metadata
      markdownContent += `---\n`;
      markdownContent += `Generated: ${new Date().toISOString()}\n`;
      markdownContent += `Source: AnythingLLM\n`;
      markdownContent += `---\n\n`;

      // Add content (assuming it might already have markdown formatting)
      markdownContent += content;

      const outputPath = path.join(outputDir, filename || 'export.md');
      fs.writeFileSync(outputPath, markdownContent);

      return {
        success: true,
        path: outputPath,
        size: markdownContent.length,
        message: `Markdown exported successfully to ${outputPath}`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to export document to Markdown format'
      };
    }
  }

  /**
   * Parse content into structured sections
   * @param {string} content - Raw content to parse
   * @returns {Array} Parsed sections
   */
  parseContent(content) {
    const lines = content.split('\n');
    const sections = [];
    let currentSection = { type: 'paragraph', text: '' };

    lines.forEach(line => {
      // Detect headings (lines starting with #)
      if (line.startsWith('#')) {
        if (currentSection.text) {
          sections.push(currentSection);
        }
        currentSection = {
          type: 'heading',
          text: line.replace(/^#+\s*/, '')
        };
        sections.push(currentSection);
        currentSection = { type: 'paragraph', text: '' };
      }
      // Detect code blocks (lines starting with ``` or indented with 4 spaces)
      else if (line.startsWith('```') || line.startsWith('    ')) {
        if (currentSection.text) {
          sections.push(currentSection);
        }
        currentSection = {
          type: 'code',
          text: line.replace(/^```|^    /, '')
        };
      }
      // Regular text
      else {
        if (currentSection.type === 'code' && !line.startsWith('    ')) {
          sections.push(currentSection);
          currentSection = { type: 'paragraph', text: line };
        } else {
          currentSection.text += (currentSection.text ? '\n' : '') + line;
        }
      }
    });

    // Add last section
    if (currentSection.text) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Main execution function
   * @param {Object} params - Skill parameters
   * @returns {Object} Execution result
   */
  async execute(params) {
    const { format = 'docx', content, title, filename } = params;

    if (!content) {
      return {
        success: false,
        message: 'No content provided for export'
      };
    }

    switch (format.toLowerCase()) {
      case 'docx':
      case 'word':
        return await this.exportToDocx({ content, title, filename });
      
      case 'pdf':
        return await this.exportToPdf({ content, title, filename });
      
      case 'md':
      case 'markdown':
        return await this.exportToMarkdown({ content, title, filename });
      
      default:
        return {
          success: false,
          message: `Unsupported format: ${format}. Supported formats are: docx, pdf, markdown`
        };
    }
  }
}

module.exports = DocumentExportSkill;
