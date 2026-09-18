import http.server
import socket
import socketserver
import webbrowser
import os
import sys
import mimetypes

# Set stdout to UTF-8 to prevent Windows charmap issues
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8080
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "www")

# Ensure proper MIME types for WebAssembly and ES modules
mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('application/javascript', '.js')

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == '__main__':
    local_ip = get_local_ip()
    print("=" * 60)
    print("  [RUST + WASM] Monty Hall Simulation Server")
    print("=" * 60)
    print(f"  Local URL (this PC):        http://localhost:{PORT}")
    print(f"  Network URL (phone/tablet): http://{local_ip}:{PORT}")
    print("=" * 60)
    print("  Serving www/ directory. Press Ctrl+C to stop.")
    print("=" * 60)

    # Open local browser
    try:
        webbrowser.open(f"http://localhost:{PORT}")
    except Exception:
        pass

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
