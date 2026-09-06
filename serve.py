#!/usr/bin/env python3
"""
Lightweight HTTP server for USPS Pulse with correct MIME types for ES modules.
Usage: python3 serve.py [port]
"""

import http.server
import socketserver
import os
import sys

DEFAULT_PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class PostalHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and caching headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def guess_type(self, path):
        if path.endswith('.js') or path.endswith('.mjs'):
            return 'text/javascript'
        if path.endswith('.css'):
            return 'text/css'
        if path.endswith('.json'):
            return 'application/json'
        if path.endswith('.csv'):
            return 'text/csv'
        return super().guess_type(path)

def run_server(port=DEFAULT_PORT):
    handler = PostalHTTPRequestHandler
    for p in range(port, port + 10):
        try:
            with socketserver.TCPServer(("", p), handler) as httpd:
                print("=" * 65)
                print("📬 USPS Pulse - National Delivery Health & Disruption Monitor")
                print(f"🚀 Server running locally at: http://localhost:{p}")
                print(f"📁 Serving directory: {DIRECTORY}")
                print("Press Ctrl+C to stop the server.")
                print("=" * 65)
                httpd.serve_forever()
                break
        except OSError as e:
            if "Address already in use" in str(e) or e.errno == 48:
                continue
            else:
                raise e

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    try:
        run_server(port)
    except KeyboardInterrupt:
        print("\nStopping USPS Pulse server. Goodbye!")
