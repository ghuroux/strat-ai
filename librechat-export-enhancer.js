// ==UserScript==
// @name         LibreChat Export Enhancer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds PDF and DOCX export options to LibreChat
// @author       You
// @match        http://localhost:3001/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const EXPORT_API_URL = 'http://localhost:8081/api/convert';

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .export-enhanced-btn {
            padding: 8px 16px;
            margin: 4px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            font-size: 14px;
            transition: opacity 0.2s;
        }
        .export-enhanced-btn:hover {
            opacity: 0.8;
        }
        .export-pdf-btn {
            background: #e74c3c;
            color: white;
        }
        .export-docx-btn {
            background: #2980b9;
            color: white;
        }
        .export-enhanced-container {
            margin-top: 12px;
            padding: 12px;
            background: #f5f5f5;
            border-radius: 8px;
        }
        .export-enhanced-title {
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
        }
    `;
    document.head.appendChild(style);

    // Function to get conversation markdown
    function getConversationMarkdown() {
        // Try to find the export button and simulate a click to get markdown
        // This is a simplified version - may need adjustment based on LibreChat's actual DOM structure
        const messages = document.querySelectorAll('[data-message-id], .message, [class*="message"]');
        let markdown = '# Conversation Export\n\n';
        markdown += `**Date:** ${new Date().toLocaleDateString()}\n\n`;

        messages.forEach((msg, index) => {
            const text = msg.textContent || msg.innerText;
            if (text && text.trim()) {
                // Try to detect if it's a user or assistant message
                const isUser = msg.classList.contains('user') || msg.parentElement?.classList.contains('user');
                markdown += `## ${isUser ? 'User' : 'Assistant'}\n`;
                markdown += `${text.trim()}\n\n`;
            }
        });

        markdown += `---\n\n*Exported from LibreChat on ${new Date().toISOString()}*\n`;
        return markdown;
    }

    // Function to convert and download
    async function convertAndDownload(format) {
        try {
            const markdown = getConversationMarkdown();

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
                throw new Error(`Conversion failed: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `conversation-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            console.log(`✅ Downloaded ${format.toUpperCase()} successfully!`);
        } catch (error) {
            console.error('Export error:', error);
            alert(`Failed to export as ${format.toUpperCase()}: ${error.message}`);
        }
    }

    // Add export buttons to the page
    function addExportButtons() {
        // Look for existing export UI or add to a suitable location
        const container = document.createElement('div');
        container.className = 'export-enhanced-container';
        container.innerHTML = `
            <div class="export-enhanced-title">📥 Enhanced Exports</div>
            <button class="export-enhanced-btn export-pdf-btn" id="export-pdf-btn">
                📕 Download as PDF
            </button>
            <button class="export-enhanced-btn export-docx-btn" id="export-docx-btn">
                📘 Download as DOCX
            </button>
        `;

        // Try to find a good place to insert the buttons
        const sidebar = document.querySelector('[class*="sidebar"], nav, aside');
        if (sidebar) {
            sidebar.appendChild(container);
        } else {
            // Fallback: add to body
            document.body.insertBefore(container, document.body.firstChild);
        }

        // Attach event listeners
        document.getElementById('export-pdf-btn')?.addEventListener('click', () => convertAndDownload('pdf'));
        document.getElementById('export-docx-btn')?.addEventListener('click', () => convertAndDownload('docx'));

        console.log('✅ LibreChat Export Enhancer loaded! Use the buttons to download conversations.');
    }

    // Wait for page to load and add buttons
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addExportButtons);
    } else {
        // DOM already loaded
        setTimeout(addExportButtons, 1000);
    }

})();
