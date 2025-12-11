// LibreChat Export Enhancer - Auto-loaded version
// Adds PDF and DOCX export buttons to LibreChat

(function() {
    'use strict';

    const EXPORT_API_URL = '/api/convert';

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .export-enhanced-floating {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            background: white;
            padding: 16px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .export-enhanced-btn {
            padding: 10px 18px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
        }
        .export-enhanced-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .export-pdf-btn {
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
        }
        .export-docx-btn {
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            color: white;
        }
        .export-enhanced-title {
            font-weight: 700;
            margin-bottom: 4px;
            color: #333;
            font-size: 13px;
            text-align: center;
        }
        .export-btn-icon {
            font-size: 16px;
        }
    `;
    document.head.appendChild(style);

    // Function to get conversation content
    function getConversationMarkdown() {
        const messages = document.querySelectorAll('[data-testid*="message"], .message, [class*="Message"]');

        let markdown = '# Conversation Export\n\n';
        markdown += `**Date:** ${new Date().toLocaleString()}\n\n`;
        markdown += '---\n\n';

        if (messages.length === 0) {
            // Fallback: try to get any visible text content
            const mainContent = document.querySelector('main, [role="main"], .conversation, #root');
            if (mainContent) {
                const text = mainContent.innerText || mainContent.textContent;
                markdown += text.trim() + '\n\n';
            }
        } else {
            messages.forEach((msg, index) => {
                const text = (msg.innerText || msg.textContent || '').trim();
                if (text) {
                    // Try to detect if it's a user or assistant message
                    const isUser = msg.className?.includes('user') ||
                                   msg.parentElement?.className?.includes('user') ||
                                   index % 2 === 0;

                    markdown += `## ${isUser ? 'User' : 'Assistant'}\n`;
                    markdown += `${text}\n\n`;
                }
            });
        }

        markdown += '---\n\n';
        markdown += `*Exported from LibreChat on ${new Date().toISOString()}*\n`;

        return markdown;
    }

    // Function to convert and download
    async function convertAndDownload(format) {
        const btn = event.target.closest('.export-enhanced-btn');
        const originalText = btn.innerHTML;

        try {
            btn.disabled = true;
            btn.innerHTML = `<span class="export-btn-icon">⏳</span> Converting...`;

            const markdown = getConversationMarkdown();

            if (!markdown || markdown.length < 50) {
                throw new Error('No conversation content found. Please make sure you have messages in the conversation.');
            }

            const response = await fetch(EXPORT_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    markdown: markdown,
                    format: format
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().slice(0,19).replace(/:/g,'-');
            a.download = `conversation-${timestamp}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Show success
            btn.innerHTML = `<span class="export-btn-icon">✅</span> Downloaded!`;
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Export error:', error);
            btn.innerHTML = `<span class="export-btn-icon">❌</span> Failed`;
            alert(`Export failed: ${error.message}`);
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 3000);
        }
    }

    // Add export buttons
    function addExportButtons() {
        // Check if already added
        if (document.getElementById('export-enhanced-widget')) {
            return;
        }

        const container = document.createElement('div');
        container.id = 'export-enhanced-widget';
        container.className = 'export-enhanced-floating';
        container.innerHTML = `
            <div class="export-enhanced-title">📥 Export</div>
            <button class="export-enhanced-btn export-pdf-btn" id="export-pdf-btn">
                <span class="export-btn-icon">📕</span> Download PDF
            </button>
            <button class="export-enhanced-btn export-docx-btn" id="export-docx-btn">
                <span class="export-btn-icon">📘</span> Download DOCX
            </button>
        `;

        document.body.appendChild(container);

        // Attach event listeners
        document.getElementById('export-pdf-btn').addEventListener('click', (e) => {
            window.event = e;
            convertAndDownload('pdf');
        });
        document.getElementById('export-docx-btn').addEventListener('click', (e) => {
            window.event = e;
            convertAndDownload('docx');
        });

        console.log('✅ LibreChat Export Enhancer loaded! Export buttons added to bottom-right corner.');
    }

    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(addExportButtons, 1000);
        });
    } else {
        setTimeout(addExportButtons, 1000);
    }

    // Also watch for navigation changes (for SPAs)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(addExportButtons, 1000);
        }
    }).observe(document, {subtree: true, childList: true});

})();
