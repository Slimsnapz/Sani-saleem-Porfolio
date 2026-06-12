from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import base64
import time
from pathlib import Path

PORT = int(os.environ.get("PORT", "3000"))
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "saleem-admin")
ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
PROJECTS_FILE = DATA_DIR / "projects.json"

def ensure_data_file():
    DATA_DIR.mkdir(exist_ok=True)
    UPLOADS_DIR.mkdir(exist_ok=True)
    if not PROJECTS_FILE.exists():
        PROJECTS_FILE.write_text("[]\n", encoding="utf-8")

def read_projects():
    ensure_data_file()
    try:
        return json.loads(PROJECTS_FILE.read_text(encoding="utf-8"))
    except:
        return []

def write_projects(projects):
    ensure_data_file()
    PROJECTS_FILE.write_text(json.dumps(projects, indent=2) + "\n", encoding="utf-8")

def save_base64_file(b64_string, prefix):
    if not b64_string.startswith("data:"):
        return b64_string

    try:
        header, encoded = b64_string.split(",", 1)
        ext = ".bin"
        if "image/jpeg" in header: ext = ".jpg"
        elif "image/png" in header: ext = ".png"
        elif "image/gif" in header: ext = ".gif"
        elif "image/webp" in header: ext = ".webp"
        elif "application/pdf" in header: ext = ".pdf"

        file_data = base64.b64decode(encoded)
        filename = f"{prefix}_{int(time.time() * 1000)}{ext}"
        filepath = UPLOADS_DIR / filename

        with open(filepath, "wb") as f:
            f.write(file_data)

        return f"data/uploads/{filename}"
    except Exception as e:
        print("Error saving file locally:", e)
        return ""

def clean_project(project, existing_id=None):
    import uuid
    p_id = existing_id if existing_id else str(project.get("id", uuid.uuid4().hex))

    cleaned = {
        "id": p_id,
        "title": str(project.get("title", "")).strip(),
        "description": str(project.get("description", "")).strip(),
        "tags": [str(tag).strip() for tag in project.get("tags", []) if str(tag).strip()],
        "liveLink": str(project.get("liveLink", "")).strip(),
        "images": [],
        "report": None,
    }

    for idx, img in enumerate(project.get("images", [])):
        if img:
            path = save_base64_file(str(img), f"img_{p_id}_{idx}")
            if path:
                cleaned["images"].append(path)

    report = project.get("report")
    if isinstance(report, dict) and str(report.get("content", "")).strip():
        content = str(report.get("content", "")).strip()
        path = save_base64_file(content, f"report_{p_id}")
        if path:
            cleaned["report"] = {
                "name": str(report.get("name", "Report.pdf")).strip() or "Report.pdf",
                "content": path,
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
        path = self.path.split("?")[0]
        if path == "/api/verify":
            if self.authorized():
                self.send_json(200, {"status": "ok"})
            else:
                self.send_json(401, {"error": "Unauthorized"})
            return
            
        if path == "/api/projects":
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
        if length > 100 * 1024 * 1024:
            self.send_json(413, {"error": "Request body is too large. Max 100MB."})
            return

        payload = json.loads(self.rfile.read(length).decode("utf-8"))
        project = clean_project(payload)

        if not project["title"]:
            self.send_json(400, {"error": "Title required"})
            return

        projects = read_projects()
        projects.insert(0, project)
        write_projects(projects)
        self.send_json(200, projects)

    def do_PUT(self):
        path_parts = self.path.split("?")[0].strip("/").split("/")
        if len(path_parts) != 3 or path_parts[0] != "api" or path_parts[1] != "projects":
            self.send_json(404, {"error": "Not found"})
            return

        if not self.authorized():
            self.send_json(401, {"error": "Unauthorized"})
            return

        project_id = path_parts[2]
        length = int(self.headers.get("content-length", "0"))
        if length > 100 * 1024 * 1024:
            self.send_json(413, {"error": "Request body is too large. Max 100MB."})
            return

        payload = json.loads(self.rfile.read(length).decode("utf-8"))
        updated_project = clean_project(payload, project_id)

        projects = read_projects()
        for i, p in enumerate(projects):
            if p.get("id") == project_id:
                projects[i] = updated_project
                write_projects(projects)
                self.send_json(200, updated_project)
                return
        
        projects.insert(0, updated_project)
        write_projects(projects)
        self.send_json(200, updated_project)

    def do_DELETE(self):
        path_parts = self.path.split("?")[0].strip("/").split("/")
        if not self.authorized():
            self.send_json(401, {"error": "Unauthorized"})
            return

        if len(path_parts) == 2 and path_parts[1] == "projects":
            write_projects([])
            self.send_json(200, [])
            return
            
        if len(path_parts) == 3 and path_parts[1] == "projects":
            project_id = path_parts[2]
            projects = read_projects()
            projects = [p for p in projects if p.get("id") != project_id]
            write_projects(projects)
            self.send_json(200, {"status": "deleted"})
            return
            
        self.send_json(404, {"error": "Not found"})

if __name__ == "__main__":
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("localhost", PORT), PortfolioHandler)
    print(f"Portfolio running at http://localhost:{PORT}")
    print("Secret Admin Dashboard is hidden. Double-click the 'Saleem.' logo to access it.")
    server.serve_forever()