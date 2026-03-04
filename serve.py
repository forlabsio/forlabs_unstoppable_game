#!/usr/bin/env python3
"""개발용 HTTP 서버 — 캐시 비활성화"""
from http.server import SimpleHTTPRequestHandler, HTTPServer

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def log_message(self, format, *args):
        pass  # 로그 억제

if __name__ == "__main__":
    server = HTTPServer(("", 3000), NoCacheHandler)
    print("Serving on http://localhost:3000 (no-cache)")
    server.serve_forever()
