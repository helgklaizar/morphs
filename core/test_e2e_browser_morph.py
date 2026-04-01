import pytest
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
import time
from core.browser_morph import BrowserMorph

HTML_CLEAN = b"""
<html><body>
    <button onclick="console.log('Button clicked')">Click Me</button>
</body></html>
"""

HTML_CRASH = b"""
<html><body>
    <button onclick="thisFunctionDoesNotExist()">Crash Me</button>
</body></html>
"""

class BrowserTestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass # silent

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        if self.path == "/clean":
            self.wfile.write(HTML_CLEAN)
        else:
            self.wfile.write(HTML_CRASH)

@pytest.fixture(scope="module")
def local_test_server():
    server = HTTPServer(('localhost', 18081), BrowserTestHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield "http://localhost:18081"
    server.shutdown()
    thread.join(timeout=2)

def test_browser_morph_clean_live(local_test_server):
    import asyncio
    async def run():
        bm = BrowserMorph(f"{local_test_server}/clean")
        res = await bm.simulate_user_journey("chaos")
        # Clean page has no JS errors or console errors
        assert res["status"] == "success"
        assert len(res["errors"]) == 0
    asyncio.run(run())

def test_browser_morph_crash_live(local_test_server):
    import asyncio
    async def run():
        bm = BrowserMorph(f"{local_test_server}/crash")
        res = await bm.simulate_user_journey("chaos")
        # Clicking the button throws ReferenceError
        assert res["status"] == "failed"
        assert len(res["errors"]) > 0
        error_types = [e.get("type", "") for e in res["errors"]]
        assert "pageerror" in error_types
        # Check if the error text contains our missing function
        assert any("thisfunctiondoesnotexist" in str(e).lower() for e in res["errors"])
    asyncio.run(run())
