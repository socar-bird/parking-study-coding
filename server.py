#!/usr/bin/env python3
"""주차 스터디 모각코 트래커 서버 (의존성 없음)"""
import json, os, shutil
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.json')
PORT = 3333

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
        data = dict(DEFAULT_DATA)
        data['_version'] = 1
        return data
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if '_version' not in data:
        data['_version'] = 1
    return data

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
                incoming = json.loads(body)
                current = load_data()
                incoming_version = incoming.get('_version', 0)
                current_version = current.get('_version', 1)

                if incoming_version != current_version:
                    # 버전 충돌 → 409 Conflict + 최신 데이터 반환
                    self.send_response(409)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps(current, ensure_ascii=False).encode('utf-8'))
                    return

                incoming['_version'] = current_version + 1
                save_data(incoming)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "_version": incoming['_version']}).encode('utf-8'))
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
