const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "saleem-admin";
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");

const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml"
};

function ensureDataFile() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR);
    }

    if (!fs.existsSync(PROJECTS_FILE)) {
        fs.writeFileSync(PROJECTS_FILE, "[]\n");
    }
}

function readProjects() {
    ensureDataFile();
    return JSON.parse(fs.readFileSync(PROJECTS_FILE, "utf8"));
}

function writeProjects(projects) {
    ensureDataFile();
    fs.writeFileSync(PROJECTS_FILE, `${JSON.stringify(projects, null, 2)}\n`);
}

function sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(payload));
}

function readBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";

        request.on("data", (chunk) => {
            body += chunk;
            if (body.length > 50 * 1024 * 1024) {
                reject(new Error("Request body is too large"));
                request.destroy();
            }
        });

        request.on("end", () => resolve(body));
        request.on("error", reject);
    });
}

function isAuthorized(request) {
    return request.headers["x-admin-password"] === ADMIN_PASSWORD;
}

function cleanProject(project) {
    const cleaned = {
        title: String(project.title || "").trim(),
        description: String(project.description || "").trim(),
        tags: Array.isArray(project.tags) ? project.tags.map(String).filter(Boolean) : [],
        images: Array.isArray(project.images) ? project.images.map(String).filter(Boolean) : [],
        readme: null
    };

    if (project.readme && project.readme.content) {
        cleaned.readme = {
            name: String(project.readme.name || "README.md").trim() || "README.md",
            content: String(project.readme.content).trim()
        };
    }

    return cleaned;
}

async function handleApi(request, response) {
    if (request.url !== "/api/projects") {
        sendJson(response, 404, { error: "Not found" });
        return;
    }

    if (request.method === "GET") {
        sendJson(response, 200, readProjects());
        return;
    }

    if (!isAuthorized(request)) {
        sendJson(response, 401, { error: "Unauthorized" });
        return;
    }

    if (request.method === "POST") {
        const body = await readBody(request);
        const project = cleanProject(JSON.parse(body));

        if (!project.title || !project.description) {
            sendJson(response, 400, { error: "Title and description are required" });
            return;
        }

        const projects = readProjects();
        projects.unshift(project);
        writeProjects(projects);
        sendJson(response, 200, projects);
        return;
    }

    if (request.method === "DELETE") {
        writeProjects([]);
        sendJson(response, 200, []);
        return;
    }

    sendJson(response, 405, { error: "Method not allowed" });
}

function serveStatic(request, response) {
    const requestedPath = decodeURIComponent(request.url.split("?")[0]);
    const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(ROOT, safePath === "/" ? "index.html" : safePath);

    if (!filePath.startsWith(ROOT)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Not found");
            return;
        }

        const type = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
        response.writeHead(200, { "Content-Type": type });
        response.end(content);
    });
}

const server = http.createServer((request, response) => {
    if (request.url.startsWith("/api/")) {
        handleApi(request, response).catch((error) => {
            sendJson(response, 500, { error: error.message });
        });
        return;
    }

    serveStatic(request, response);
});

server.listen(PORT, () => {
    console.log(`Portfolio running at http://localhost:${PORT}`);
    console.log(`Owner dashboard: http://localhost:${PORT}/#owner-dashboard`);
});
