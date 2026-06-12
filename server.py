from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path


PORT = int(os.environ.get("PORT", "3000"))
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "saleem-admin")
ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
PROJECTS_FILE = DATA_DIR / "projects.json"


def ensure_data_file():
    DATA_DIR.mkdir(exist_ok=True)
    if not PROJECTS_FILE.exists():
        PROJECTS_FILE.write_text("[]\n", encoding="utf-8")


def read_projects():
    ensure_data_file()
    return json.loads(PROJECTS_FILE.read_text(encoding="utf-8"))


def write_projects(projects):
    ensure_data_file()
    PROJECTS_FILE.write_text(json.dumps(projects, indent=2) + "\n", encoding="utf-8")


def clean_project(project):
    cleaned = {
        "title": str(project.get("title", "")).strip(),
        "description": str(project.get("description", "")).strip(),
        "tags": [str(tag).strip() for tag in project.get("tags", []) if str(tag).strip()],
        "images": [str(image) for image in project.get("images", []) if str(image)],
        "readme": None,
    }

    readme = project.get("readme")
    if isinstance(readme, dict) and str(readme.get("content", "")).strip():
        cleaned["readme"] = {
            "name": str(readme.get("name", "README.md")).strip() or "README.md",
            "content": str(readme.get("content", "")).strip(),
        }

    return cleaned


class PortfolioHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def authorized(self):
        return self.headers.get("x-admin-password") == ADMIN_PASSWORD

    def do_GET(self):
        if self.path.split("?")[0] == "/api/projects":
            self.send_json(200, read_projects())
            return

        super().do_GET()

    def do_POST(self):
        if self.path.split("?")[0] != "/api/projects":
            self.send_json(404, {"error": "Not found"})
            return

        if not self.authorized():
            self.send_json(401, {"error": "Unauthorized"})
            return

        length = int(self.headers.get("content-length", "0"))
        if length > 50 * 1024 * 1024:
            self.send_json(413, {"error": "Request body is too large"})
            return

        payload = json.loads(self.rfile.read(length).decode("utf-8"))
        project = clean_project(payload)

        if not project["title"] or not project["description"]:
            self.send_json(400, {"error": "Title and description are required"})
            return

        projects = read_projects()
        projects.insert(0, project)
        write_projects(projects)
        self.send_json(200, projects)

    def do_DELETE(self):
        if self.path.split("?")[0] != "/api/projects":
            self.send_json(404, {"error": "Not found"})
            return

        if not self.authorized():
            self.send_json(401, {"error": "Unauthorized"})
            return

        write_projects([])
        self.send_json(200, [])


if __name__ == "__main__":
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("localhost", PORT), PortfolioHandler)
    print(f"Portfolio running at http://localhost:{PORT}")
    print(f"Owner dashboard: http://localhost:{PORT}/#owner-dashboard")
    server.serve_forever()
