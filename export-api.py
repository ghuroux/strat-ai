#!/usr/bin/env python3
"""
Export API for LibreChat - Provides PDF/DOCX conversion endpoints
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import subprocess
import os
import json
import tempfile
import hashlib
import time
from urllib.parse import urlparse

class ExportAPIHandler(BaseHTTPRequestHandler):
    exports_dir = '/exports'

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        """Convert markdown to PDF/DOCX"""
        if self.path == '/api/convert':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                data = json.loads(post_data.decode())
                markdown = data.get('markdown', '')
                format_type = data.get('format', 'pdf')

                if not markdown:
                    self.send_error(400, 'No markdown content provided')
                    return

                # Create unique filename
                timestamp = int(time.time())
                hash_id = hashlib.md5(markdown.encode()).hexdigest()[:8]
                filename = f'conversation-{timestamp}-{hash_id}'

                # Save markdown to temp file
                temp_dir = tempfile.gettempdir()
                temp_md = os.path.join(temp_dir, f'{filename}.md')

                with open(temp_md, 'w') as f:
                    f.write(markdown)

                # Convert using the script
                output_file = os.path.join(temp_dir, f'{filename}.{format_type}')
                script_path = '/app/convert-export.sh'

                result = subprocess.run(
                    [script_path, temp_md, format_type],
                    capture_output=True,
                    text=True,
                    timeout=30
                )

                if result.returncode != 0 or not os.path.exists(output_file):
                    self.send_error(500, f'Conversion failed: {result.stderr}')
                    return

                # Read the converted file
                with open(output_file, 'rb') as f:
                    content = f.read()

                # Send file
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')

                if format_type == 'pdf':
                    self.send_header('Content-Type', 'application/pdf')
                else:
                    self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')

                self.send_header('Content-Disposition', f'attachment; filename="{filename}.{format_type}"')
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)

                # Cleanup
                try:
                    os.unlink(temp_md)
                    os.unlink(output_file)
                except:
                    pass

            except Exception as e:
                self.send_error(500, str(e))
        else:
            self.send_error(404)

    def do_GET(self):
        """Health check"""
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok'}).encode())
        else:
            self.send_error(404)

def run(port=8081):
    server_address = ('0.0.0.0', port)
    httpd = HTTPServer(server_address, ExportAPIHandler)
    print(f'🚀 Export API running on port {port}')
    print(f'📝 Endpoint: http://localhost:{port}/api/convert')
    print(f'✅ Ready to serve conversion requests')
    httpd.serve_forever()

if __name__ == '__main__':
    run()
