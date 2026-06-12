let ACTIVE_PASSWORD = ""; 
const STORAGE_KEY = "saleemPortfolioProjects";

const titles = ["Data Scientist.", "AI Developer.", "Data Analyst.", "Data Engineer."];
const baseProjects = [
    { id: "base-1", title: "Custom Data Cleaning Library", description: "Developed a reusable Python library for automated wrangling, anomaly detection, and preprocessing across large enterprise datasets.", tags: ["Python", "ETL"], liveLink: "", images: [], report: null },
    { id: "base-2", title: "Institutional RAG Assistant", description: "Engineered a localized AI assistant capable of querying organizational SOPs with retrieval workflows and document-aware responses.", tags: ["AI/ML", "LangChain"], liveLink: "", images: [], report: null },
    { id: "base-3", title: "Executive Performance Dashboards", description: "Designed dynamic group-wide dashboards and manual trade registries for tracking active mandates, execution, and key metrics.", tags: ["Power BI", "Excel"], liveLink: "", images: [], report: null }
];

let typingCount = 0;
let typingIndex = 0;
let isDeleting = false;
let slideshowTimers = [];
let editingProjectImages = [];
let clearedReport = false; 
let activeProjectForPdf = null;
let modalSlideshowTimer = null;

function generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function typeTitle() {
    const target = document.querySelector(".typing-text");
    if (!target) return;
    const currentTitle = titles[typingCount % titles.length];
    const text = isDeleting ? currentTitle.slice(0, --typingIndex) : currentTitle.slice(0, ++typingIndex);
    target.textContent = text;
    let speed = isDeleting ? 48 : 95;
    if (!isDeleting && text.length === currentTitle.length) { speed = 1700; isDeleting = true; } 
    else if (isDeleting && text.length === 0) { isDeleting = false; typingCount += 1; speed = 420; }
    window.setTimeout(typeTitle, speed);
}

function getLocalProjects() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}

function saveLocalProjects(projects) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); } catch (e) {}
}

function getAllProjects() {
    const local = getLocalProjects();
    const merged = [...local];
    baseProjects.forEach(bp => {
        if (!merged.find(p => p.id === bp.id)) merged.push(bp);
    });
    return merged;
}

function escapeHtml(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function getSnippet(text, length = 110) {
    if (!text) return "";
    return text.length > length ? text.substring(0, length) + "..." : text;
}

function createProjectCard(project) {
    const card = document.createElement("article");
    card.className = "project-card interactive-card";
    
    card.addEventListener("click", () => openProjectModal(project));

    const media = document.createElement("div");
    media.className = "project-media";
    const slides = project.images || [];

    if (slides.length) {
        slides.forEach((image, slideIndex) => {
            const slideElement = document.createElement("div");
            slideElement.className = "project-slide";
            if (slideIndex === 0) slideElement.classList.add("active");
            
            const img = document.createElement("img");
            img.src = image;
            slideElement.appendChild(img);
            media.appendChild(slideElement);
        });
        if (slides.length > 1) {
            const dots = document.createElement("div");
            dots.className = "slide-dots";
            slides.forEach((_, dotIndex) => {
                const dot = document.createElement("span");
                if (dotIndex === 0) dot.classList.add("active");
                dots.appendChild(dot);
            });
            media.appendChild(dots);
        }
    } else {
        const placeholder = document.createElement("div");
        placeholder.className = "project-placeholder";
        placeholder.innerHTML = `<span style="font-size: 2rem; color: var(--brand);">[ ]</span>`;
        media.appendChild(placeholder);
    }

    const overlay = document.createElement("div");
    overlay.className = "project-hover-overlay";
    overlay.innerHTML = `<p>${escapeHtml(getSnippet(project.description))}</p><span class="view-prompt">Click to view project</span>`;
    media.appendChild(overlay);

    const info = document.createElement("div");
    info.className = "project-info";
    
    const liveIndicator = project.liveLink ? `<span style="color: var(--accent); font-size: 0.8rem; margin-left: 10px;" title="Live Project Available">🌐 Live</span>` : "";

    info.innerHTML = `
        <h3 class="card-title">${escapeHtml(project.title)} ${liveIndicator} <span class="click-arrow">↗</span></h3>
        <div class="project-tags">
            ${project.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
    `;
    card.append(media, info);
    return card;
}

function openProjectModal(project) {
    const modal = document.querySelector("#projectModal");
    const visuals = document.querySelector("#modalVisuals");
    
    document.querySelector("#modalTitle").textContent = project.title;
    document.querySelector("#modalDesc").innerHTML = `<p>${escapeHtml(project.description).replace(/\n/g, '<br>')}</p>`;
    
    const tagsContainer = document.querySelector("#modalTags");
    tagsContainer.innerHTML = project.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");

    visuals.innerHTML = "";
    if (modalSlideshowTimer) clearInterval(modalSlideshowTimer);

    if (project.images && project.images.length > 0) {
        project.images.forEach((imgSrc, index) => {
            const img = document.createElement("img");
            img.src = imgSrc;
            if (index === 0) img.classList.add("active");
            visuals.appendChild(img);
        });

        if (project.images.length > 1) {
            let activeIdx = 0;
            const images = visuals.querySelectorAll("img");
            modalSlideshowTimer = setInterval(() => {
                images[activeIdx].classList.remove("active");
                activeIdx = (activeIdx + 1) % images.length;
                images[activeIdx].classList.add("active");
            }, 3000);
        }
    } else {
        visuals.innerHTML = `<div class="project-placeholder" style="height: 100%; border-radius: 12px; background: var(--panel-soft);">No images available</div>`;
    }

    const reportBtn = document.querySelector("#downloadPdfBtn");
    if (project.report && project.report.content) {
        activeProjectForPdf = project;
        reportBtn.style.display = "inline-flex";
    } else {
        activeProjectForPdf = null;
        reportBtn.style.display = "none";
    }

    const liveLinkBtn = document.querySelector("#modalLiveLinkBtn");
    if (project.liveLink && project.liveLink.trim() !== "") {
        liveLinkBtn.href = project.liveLink;
        liveLinkBtn.style.display = "inline-flex";
    } else {
        liveLinkBtn.style.display = "none";
        liveLinkBtn.href = "#";
    }

    document.body.style.overflow = "hidden";
    modal.showModal();
}

function closeProjectModal() {
    const modal = document.querySelector("#projectModal");
    if (modalSlideshowTimer) clearInterval(modalSlideshowTimer);
    document.body.style.overflow = "auto";
    modal.close();
}

function handlePdfDownload() {
    if (!activeProjectForPdf || !activeProjectForPdf.report) return;
    const link = document.createElement("a");
    link.href = activeProjectForPdf.report.content; 
    link.download = activeProjectForPdf.report.name;
    link.target = "_blank"; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function renderProjects() {
    const grid = document.querySelector("#projectsGrid");
    if (grid) {
        grid.replaceChildren(...getAllProjects().map(createProjectCard));
        startSlideshows();
    }
    renderAdminProjects();
}

function renderAdminProjects() {
    const adminGrid = document.querySelector("#adminProjectsList");
    if (!adminGrid) return;
    
    adminGrid.innerHTML = "";
    const allProjects = getAllProjects();

    allProjects.forEach(project => {
        const card = document.createElement("article");
        card.className = "project-card";
        card.style.padding = "15px";
        card.style.cursor = "default";
        
        let slideCountText = [];
        if (project.images && project.images.length) slideCountText.push(`${project.images.length} images`);
        if (project.report) slideCountText.push(`1 PDF`);
        if (project.liveLink) slideCountText.push(`Linked`);
        let slideString = slideCountText.length ? slideCountText.join(" | ") : "No files/links";

        card.innerHTML = `
            <h4 style="color: var(--text); margin-bottom: 5px;">${escapeHtml(project.title)}</h4>
            <p style="color: var(--muted); font-size: 0.85rem; margin-bottom: 10px;">${slideString}</p>
            <div style="display: flex; gap: 8px;">
                <button class="btn secondary edit-btn" style="min-height: 30px; padding: 0 10px; font-size: 0.8rem;" data-id="${project.id}">Edit</button>
                <button class="btn primary delete-btn" style="min-height: 30px; padding: 0 10px; font-size: 0.8rem; background: #8a2a2a; border-color: #8a2a2a;" data-id="${project.id}">Delete</button>
            </div>
        `;
        adminGrid.appendChild(card);
    });

    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", (e) => loadProjectIntoForm(e.target.dataset.id));
    });
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            if(confirm("Are you sure you want to delete this project?")) {
                await deleteProject(e.target.dataset.id);
            }
        });
    });
}

function loadProjectIntoForm(id) {
    const project = getAllProjects().find(p => p.id === id);
    if (!project) return;

    document.querySelector("#projectId").value = project.id;
    document.querySelector("#projectTitle").value = project.title;
    document.querySelector("#projectTags").value = project.tags.join(", ");
    document.querySelector("#projectDesc").value = project.description;
    document.querySelector("#projectLiveLink").value = project.liveLink || "";
    
    editingProjectImages = project.images || [];
    clearedReport = false;
    
    document.querySelector("#formTitle").textContent = "Edit Project";
    document.querySelector("#submitBtn").textContent = "Save Changes";
    document.querySelector("#cancelEditBtn").hidden = false;
    
    document.querySelector("#clearImageBtn").hidden = (editingProjectImages.length === 0);
    document.querySelector("#clearReportBtn").hidden = (!project.report);
    
    document.querySelector("#projectForm").scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
    document.querySelector("#projectForm").reset();
    document.querySelector("#projectId").value = "";
    document.querySelector("#formTitle").textContent = "Publish New Project";
    document.querySelector("#submitBtn").textContent = "Publish Project";
    document.querySelector("#cancelEditBtn").hidden = true;
    document.querySelector("#clearImageBtn").hidden = true;
    document.querySelector("#clearReportBtn").hidden = true;
    
    document.querySelector("#imageHelpText").textContent = "Upload multiple files to create a slide. New uploads add to existing slides unless cleared.";
    document.querySelector("#reportHelpText").textContent = "Upload a native PDF report. Visitors can download this directly.";
    
    editingProjectImages = [];
    clearedReport = false;
}

async function deleteProject(id) {
    let projects = getLocalProjects().filter(p => p.id !== id);
    saveLocalProjects(projects);
    renderProjects();

    try {
        await fetch(`/api/projects/${id}`, { method: "DELETE", headers: { "x-admin-password": ACTIVE_PASSWORD } });
        loadServerProjects(); 
    } catch (e) {}
}

async function loadServerProjects() {
    try {
        // THIS IS THE CRITICAL CHANGE FOR GITHUB PAGES!
        // We now fetch directly from the static JSON file instead of the API.
        const response = await fetch("data/projects.json");
        if (response.ok) {
            const projects = await response.json();
            saveLocalProjects(projects);
        }
    } catch (e) {
        console.log("Could not load server projects. Running on local data.");
    }
    renderProjects();
}

function startSlideshows() {
    slideshowTimers.forEach(t => window.clearInterval(t));
    slideshowTimers = [];
    document.querySelectorAll(".project-media").forEach((media, i) => {
        const slides = [...media.querySelectorAll(".project-slide")];
        const dots = [...media.querySelectorAll(".slide-dots span")];
        if (slides.length < 2) return;
        let active = 0;
        const timer = window.setInterval(() => {
            slides[active].classList.remove("active");
            if (dots[active]) dots[active].classList.remove("active");
            active = (active + 1) % slides.length;
            slides[active].classList.add("active");
            if (dots[active]) dots[active].classList.add("active");
        }, 3600 + i * 260);
        slideshowTimers.push(timer);
    });
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function initAdmin() {
    const loginForm = document.querySelector("#loginForm");
    const workspace = document.querySelector("#adminWorkspace");
    const projectForm = document.querySelector("#projectForm");
    const cancelBtn = document.querySelector("#cancelEditBtn");
    const clearImgBtn = document.querySelector("#clearImageBtn");
    const clearReportBtn = document.querySelector("#clearReportBtn");

    const secretTrigger = document.querySelector("#secretAdminTrigger");
    const exitBtn = document.querySelector("#exitAdminBtn");

    if (secretTrigger) {
        secretTrigger.addEventListener("dblclick", () => {
            document.body.classList.add("admin-mode");
            window.scrollTo(0, 0);
        });
    }

    if (exitBtn) {
        exitBtn.addEventListener("click", () => {
            document.body.classList.remove("admin-mode");
            window.scrollTo(0, 0);
        });
    }

    if (!loginForm || !workspace || !projectForm) return;

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const pwd = document.querySelector("#adminPassword").value;
        const messageEl = document.querySelector("#loginMessage");
        
        try {
            const check = await fetch("/api/verify", { headers: { "x-admin-password": pwd } });
            if (check.ok) {
                ACTIVE_PASSWORD = pwd;
                messageEl.style.color = "var(--accent)";
                messageEl.textContent = "Login successful! Unlocking dashboard...";
                setTimeout(() => {
                    loginForm.hidden = true;
                    workspace.hidden = false;
                    messageEl.textContent = "";
                    messageEl.style.color = "var(--muted)";
                    renderAdminProjects();
                }, 800);
            } else {
                messageEl.style.color = "#c65042";
                messageEl.textContent = "Incorrect password.";
            }
        } catch {
            messageEl.style.color = "#c65042";
            messageEl.textContent = "Cannot connect to local server. Are you running server.py?";
        }
    });

    cancelBtn.addEventListener("click", resetForm);
    
    clearImgBtn.addEventListener("click", () => {
        editingProjectImages = [];
        clearImgBtn.hidden = true;
        document.querySelector("#imageHelpText").textContent = "Existing images staged for removal.";
    });

    clearReportBtn.addEventListener("click", () => {
        clearedReport = true;
        clearReportBtn.hidden = true;
        document.querySelector("#reportHelpText").textContent = "Existing PDF staged for removal.";
    });

    projectForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const msgEl = document.querySelector("#projectMessage");
        msgEl.textContent = "Uploading project and files, please wait...";
        msgEl.style.color = "var(--gold)";

        const formData = new FormData(projectForm);
        const existingId = formData.get("projectId");
        
        const imageFiles = formData.getAll("images").filter(f => f && f.size);
        const newImages = await Promise.all(imageFiles.map(fileToDataUrl));
        const combinedImages = [...editingProjectImages, ...newImages];
        
        const reportFile = formData.get("report");
        let finalReport = null;
        
        if (reportFile && reportFile.size) {
            finalReport = { name: reportFile.name, content: await fileToDataUrl(reportFile) };
        } else if (existingId && !clearedReport) {
            const existingProject = getAllProjects().find(p => p.id === existingId);
            if (existingProject && existingProject.report) finalReport = existingProject.report;
        }
        
        const tags = String(formData.get("tags")).split(",").map(t => t.trim()).filter(Boolean);
        const liveLink = String(formData.get("liveLink")).trim();
        
        const project = {
            id: existingId || generateId(),
            title: String(formData.get("title")).trim(),
            description: String(formData.get("description")).trim(),
            tags,
            liveLink,
            images: combinedImages,
            report: finalReport
        };

        try {
            const method = existingId ? "PUT" : "POST";
            const url = existingId ? `/api/projects/${existingId}` : "/api/projects";
            const response = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json", "x-admin-password": ACTIVE_PASSWORD },
                body: JSON.stringify(project)
            });

            if (response.ok) {
                loadServerProjects();
                resetForm();
                msgEl.style.color = "var(--accent)";
                msgEl.textContent = "Project successfully saved! Remember to push changes to GitHub.";
                setTimeout(() => msgEl.textContent = "", 4000);
            } else {
                throw new Error("Server rejected the save process.");
            }
        } catch (err) {
            console.error(err);
            msgEl.style.color = "#c65042";
            msgEl.textContent = "Error saving. You can only save projects while running the local server.py.";
        }
    });

    const toggle = document.querySelector(".menu-toggle");
    const links = document.querySelector(".nav-links");
    if (toggle && links) {
        toggle.addEventListener("click", () => {
            const isOpen = links.classList.toggle("open");
            toggle.setAttribute("aria-expanded", String(isOpen));
        });
        links.addEventListener("click", () => {
            links.classList.remove("open");
            toggle.setAttribute("aria-expanded", "false");
        });
    }

    const closeBtn = document.querySelector(".modal-close");
    const modal = document.querySelector("#projectModal");
    if(closeBtn) closeBtn.addEventListener("click", closeProjectModal);
    if(modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeProjectModal();
        });
    }
    const pdfBtn = document.querySelector("#downloadPdfBtn");
    if(pdfBtn) pdfBtn.addEventListener("click", handlePdfDownload);
}

document.addEventListener("DOMContentLoaded", () => {
    typeTitle();
    loadServerProjects();
    initAdmin();
});