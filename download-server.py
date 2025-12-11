#!/usr/bin/env python3
"""
Simple download server for LibreChat exports
Converts markdown to PDF/DOCX via web interface
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import subprocess
import os
import json
import tempfile
from urllib.parse import parse_qs

class DownloadHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()

            html = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>LibreChat Export Converter</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        max-width: 800px;
                        margin: 50px auto;
                        padding: 20px;
                        background: #f5f5f5;
                    }
                    .container {
                        background: white;
                        padding: 30px;
                        border-radius: 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    h1 { color: #333; }
                    textarea {
                        width: 100%;
                        min-height: 200px;
                        padding: 10px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        font-family: monospace;
                        font-size: 14px;
                    }
                    .buttons {
                        margin-top: 20px;
                        display: flex;
                        gap: 10px;
                    }
                    button {
                        padding: 12px 24px;
                        font-size: 16px;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: 500;
                    }
                    .pdf-btn {
                        background: #e74c3c;
                        color: white;
                    }
                    .docx-btn {
                        background: #2980b9;
                        color: white;
                    }
                    button:hover {
                        opacity: 0.9;
                    }
                    .instructions {
                        background: #e8f4f8;
                        padding: 15px;
                        border-radius: 5px;
                        margin-bottom: 20px;
                    }
                    .instructions ol {
                        margin: 10px 0;
                        padding-left: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>📄 LibreChat Export Converter</h1>

                    <div class="instructions">
                        <strong>Instructions:</strong>
                        <ol>
                            <li>In LibreChat, click Export → Markdown</li>
                            <li>Copy all the markdown text (Cmd+A, Cmd+C)</li>
                            <li>Paste it in the box below</li>
                            <li>Click PDF or DOCX to download</li>
                        </ol>
                    </div>

                    <textarea id="markdown" placeholder="Paste your LibreChat markdown export here..."></textarea>

                    <div class="buttons">
                        <button class="pdf-btn" onclick="convert('pdf')">📕 Download as PDF</button>
                        <button class="docx-btn" onclick="convert('docx')">📘 Download as DOCX</button>
                    </div>
                </div>

                <script>
                    async function convert(format) {
                        const markdown = document.getElementById('markdown').value;
                        if (!markdown.trim()) {
                            alert('Please paste some markdown content first!');
                            return;
                        }

                        const response = await fetch('/convert', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({markdown, format})
                        });

                        if (response.ok) {
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'conversation-' + new Date().toISOString().slice(0,19).replace(/:/g,'-') + '.' + format;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                        } else {
                            const error = await response.text();
                            alert('Conversion failed: ' + error);
                        }
                    }
                </script>
            </body>
            </html>
            """
            self.wfile.write(html.encode())
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == '/convert':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            markdown = data.get('markdown', '')
            format_type = data.get('format', 'pdf')

            if not markdown:
                self.send_error(400, 'No markdown content provided')
                return

            try:
                # Save markdown to temp file
                with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
                    f.write(markdown)
                    temp_md = f.name

                # Convert using the script
                script_dir = os.path.dirname(os.path.abspath(__file__))
                output_file = temp_md.replace('.md', f'.{format_type}')

                result = subprocess.run(
                    [f'{script_dir}/convert-export.sh', temp_md, format_type],
                    capture_output=True,
                    text=True
                )

                if result.returncode != 0:
                    self.send_error(500, f'Conversion failed: {result.stderr}')
                    return

                # Read the converted file
                with open(output_file, 'rb') as f:
                    content = f.read()

                # Send file
                self.send_response(200)
                if format_type == 'pdf':
                    self.send_header('Content-type', 'application/pdf')
                else:
                    self.send_header('Content-type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
                self.send_header('Content-Disposition', f'attachment; filename="conversation.{format_type}"')
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)

                # Cleanup
                os.unlink(temp_md)
                os.unlink(output_file)

            except Exception as e:
                self.send_error(500, str(e))
        else:
            self.send_error(404)

def run(port=8080):
    server_address = ('', port)
    httpd = HTTPServer(server_address, DownloadHandler)
    print(f'🚀 LibreChat Export Server running at http://localhost:{port}')
    print(f'📝 Open this URL in your browser to convert exports')
    print(f'Press Ctrl+C to stop')
    httpd.serve_forever()

if __name__ == '__main__':
    run()
