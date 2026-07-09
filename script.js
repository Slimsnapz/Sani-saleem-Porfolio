const ADMIN_PASSWORD = "Shadow8844.";
const STORAGE_KEY = "saleemPortfolioProjects";

const titles = ["Data Scientist.", "AI Developer.", "Data Analyst.", "Data Engineer."];
const baseProjects = [
    {
        title: "Custom Data Cleaning Library",
        description: "Developed a reusable Python library for automated wrangling, anomaly detection, and preprocessing across large enterprise datasets.",
        tags: ["Python", "ETL"],
        images: []
    },
    {
        title: "Institutional RAG Assistant",
        description: "Engineered a localized AI assistant capable of querying organizational SOPs with retrieval workflows and document-aware responses.",
        tags: ["AI/ML", "LangChain"],
        images: []
    },
    {
        title: "Executive Performance Dashboards",
        description: "Designed dynamic group-wide dashboards and manual trade registries for tracking active mandates, execution, and key metrics.",
        tags: ["Power BI", "Excel"],
        images: []
    }
];

let typingCount = 0;
let typingIndex = 0;
let isDeleting = false;
let slideshowTimers = [];

function typeTitle() {
    const target = document.querySelector(".typing-text");

    if (!target) {
        return;
    }

    const currentTitle = titles[typingCount % titles.length];
    const text = isDeleting
        ? currentTitle.slice(0, --typingIndex)
        : currentTitle.slice(0, ++typingIndex);

    target.textContent = text;

    let speed = isDeleting ? 48 : 95;

    if (!isDeleting && text.length === currentTitle.length) {
        speed = 1700;
        isDeleting = true;
    } else if (isDeleting && text.length === 0) {
        isDeleting = false;
        typingCount += 1;
        speed = 420;
    }

    window.setTimeout(typeTitle, speed);
}

function getLocalProjects() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveLocalProjects(projects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function createProjectCard(project, index) {
    const card = document.createElement("article");
    card.className = "project-card";

    const media = document.createElement("div");
    media.className = "project-media";
    const slides = getProjectSlides(project);

    if (slides.length) {
        slides.forEach((slide, slideIndex) => {
            const slideElement = document.createElement("div");
            slideElement.className = "project-slide";
            if (slideIndex === 0) {
                slideElement.classList.add("active");
            }

            if (slide.type === "image") {
                const img = document.createElement("img");
                img.src = slide.content;
                img.alt = `${project.title} project image ${slideIndex + 1}`;
                slideElement.appendChild(img);
            } else {
                const readme = document.createElement("div");
                readme.className = "readme-slide";
                readme.innerHTML = `
                    <span class="readme-label">README</span>
                    <h4>${escapeHtml(slide.name || `${project.title} README`)}</h4>
                    <pre>${escapeHtml(trimReadme(slide.content))}</pre>
                `;
                slideElement.appendChild(readme);
            }

            media.appendChild(slideElement);
        });

        if (slides.length > 1) {
            const dots = document.createElement("div");
            dots.className = "slide-dots";
            slides.forEach((_, dotIndex) => {
                const dot = document.createElement("span");
                if (dotIndex === 0) {
                    dot.classList.add("active");
                }
                dots.appendChild(dot);
            });
            media.appendChild(dots);
        }
    } else {
        const placeholder = document.createElement("div");
        placeholder.className = "project-placeholder";
        placeholder.textContent = `Project ${index + 1}`;
        media.appendChild(placeholder);
    }

    const info = document.createElement("div");
    info.className = "project-info";
    info.innerHTML = `
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.description)}</p>
        <div class="project-tags">
            ${project.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
    `;

    card.append(media, info);
    return card;
}

function getProjectSlides(project) {
    const imageSlides = (project.images || []).map((image) => ({
        type: "image",
        content: image
    }));

    const readmeSlide = project.readme && project.readme.content
        ? [{
            type: "readme",
            name: project.readme.name,
            content: project.readme.content
        }]
        : [];

    return [...imageSlides, ...readmeSlide];
}

function renderProjects() {
    const grid = document.querySelector("#projectsGrid");

    if (!grid) {
        return;
    }

    const projects = [...baseProjects, ...getLocalProjects()];
    grid.replaceChildren(...projects.map(createProjectCard));
    startSlideshows();
}

async function loadServerProjects() {
    try {
        // THIS IS THE FIX: Fetch the static JSON directly with a Cache-Buster timestamp
        const cacheBuster = new Date().getTime();
        const response = await fetch("data/projects.json?v=" + cacheBuster);

        if (!response.ok) {
            return;
        }

        const projects = await response.json();
        saveLocalProjects(projects);
        renderProjects();
    } catch {
        renderProjects();
    }
}

function startSlideshows() {
    slideshowTimers.forEach((timer) => window.clearInterval(timer));
    slideshowTimers = [];

    document.querySelectorAll(".project-media").forEach((media, mediaIndex) => {
        const slides = [...media.querySelectorAll(".project-slide")];
        const dots = [...media.querySelectorAll(".slide-dots span")];

        if (slides.length < 2) {
            return;
        }

        let active = 0;
        const timer = window.setInterval(() => {
            slides[active].classList.remove("active");
            if (dots[active]) {
                dots[active].classList.remove("active");
            }

            active = (active + 1) % slides.length;

            slides[active].classList.add("active");
            if (dots[active]) {
                dots[active].classList.add("active");
            }
        }, 3600 + mediaIndex * 260);

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

function fileToText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function trimReadme(content) {
    const text = String(content || "").trim();

    if (text.length <= 900) {
        return text;
    }

    return `${text.slice(0, 900).trim()}...`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function setAdminMode() {
    const isAdminRoute = window.location.hash === "#owner-dashboard";
    document.body.classList.toggle("admin-mode", isAdminRoute);
}

function initNavigation() {
    const toggle = document.querySelector(".menu-toggle");
    const links = document.querySelector(".nav-links");
    const logo = document.querySelector(".logo");

    if (!toggle || !links) {
        return;
    }

    toggle.addEventListener("click", () => {
        const isOpen = links.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(isOpen));
    });

    links.addEventListener("click", () => {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
    });

    if (logo) {
        logo.addEventListener("dblclick", (event) => {
            event.preventDefault();
            window.location.hash = "owner-dashboard";
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "u") {
            window.location.hash = "owner-dashboard";
        }
    });
}

function initAdmin() {
    const loginForm = document.querySelector("#loginForm");
    const loginMessage = document.querySelector("#loginMessage");
    const workspace = document.querySelector("#adminWorkspace");
    const projectForm = document.querySelector("#projectForm");
    const projectMessage = document.querySelector("#projectMessage");
    const clearProjects = document.querySelector("#clearProjects");

    if (!loginForm || !workspace || !projectForm) {
        return;
    }

    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const password = document.querySelector("#adminPassword").value;

        if (password === ADMIN_PASSWORD) {
            loginForm.hidden = true;
            workspace.hidden = false;
            loginMessage.textContent = "";
        } else {
            loginMessage.textContent = "Incorrect password.";
        }
    });

    projectForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        projectMessage.textContent = "";
        const formData = new FormData(projectForm);
        const imageFiles = formData.getAll("images").filter((file) => file && file.size);
        const readmeFile = formData.get("readme");
        const images = await Promise.all(imageFiles.map(fileToDataUrl));
        const readme = readmeFile && readmeFile.size
            ? {
                name: readmeFile.name,
                content: await fileToText(readmeFile)
            }
            : null;
        const tags = String(formData.get("tags"))
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);

        const project = {
            title: String(formData.get("title")).trim(),
            description: String(formData.get("description")).trim(),
            tags,
            images,
            readme
        };

        const projects = getLocalProjects();
        projects.unshift(project);
        saveLocalProjects(projects);

        try {
            const response = await fetch("/api/projects", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-admin-password": ADMIN_PASSWORD
                },
                body: JSON.stringify(project)
            });

            if (response.ok) {
                const serverProjects = await response.json();
                saveLocalProjects(serverProjects);
            }
        } catch {
            projectMessage.textContent = "Project saved in this browser. Run the Python server to publish it for every visitor.";
        }

        renderProjects();
        projectForm.reset();
        if (!projectMessage.textContent) {
            projectMessage.textContent = "Project published to the portfolio.";
        }
    });

    clearProjects.addEventListener("click", () => {
        saveLocalProjects([]);
        fetch("/api/projects", {
            method: "DELETE",
            headers: {
                "x-admin-password": ADMIN_PASSWORD
            }
        }).catch(() => {});
        renderProjects();
        projectMessage.textContent = "Uploaded projects have been cleared.";
    });
}

document.addEventListener("DOMContentLoaded", () => {
    typeTitle();
    loadServerProjects();
    initNavigation();
    initAdmin();
    setAdminMode();
});

window.addEventListener("hashchange", setAdminMode);