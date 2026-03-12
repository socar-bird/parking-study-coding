#!/usr/bin/env python3
"""주차 스터디 모각코 트래커 서버 (의존성 없음)"""
import json, os, shutil
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.json')
PORT = 8080

DEFAULT_DATA = {
    "members": [],
    "sessions": [],
    "settings": {
        "groupName": "주차 스터디",
        "meetingDays": [2, 4],
        "meetingTime": "19:00"
    }
}

def load_data():
    if not os.path.exists(DATA_FILE):
        return dict(DEFAULT_DATA)
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(data):
    # 백업
    if os.path.exists(DATA_FILE):
        shutil.copy2(DATA_FILE, DATA_FILE + '.bak')
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)

    def do_GET(self):
        if self.path == '/api/data':
            data = load_data()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/data':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                save_data(data)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"[{timestamp}] {args[0]}")

if __name__ == '__main__':
    print(f"🚀 주차 스터디 서버 시작 → http://localhost:{PORT}")
    HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
