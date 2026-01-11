const setTrackNoScroll = (track, on) => {
  if (!track) return;
  if (on) {
    track.style.animation = "none";
    track.style.transform = "none";
    track.style.width = "100%";
    track.style.justifyContent = "center";
    track.style.alignItems = "center";
    track.style.minHeight = "160px";
  } else {
    track.style.removeProperty("animation");
    track.style.removeProperty("transform");
    track.style.removeProperty("width");
    track.style.removeProperty("justify-content");
    track.style.removeProperty("align-items");
    track.style.removeProperty("min-height");
  }
};

function escapeHtmlRaw(str) {
  const d = document.createElement('div')
  d.textContent = str;
  return d.innerHTML
}


function sanitizeUrl(url) {
  url = (url || '').trim();
  if (!/^(https?:\/\/|mailto:)/i.test(url)) return null;
  try {
    return encodeURI(url).replace(/"/g, '&quot;');
  } catch (e) {
    return null;
  }
}

function renderSimpleMarkdown(text) {
  if (!text) return '';
  let out = '';
  let lastIndex = 0;
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_|~(.+?)~/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    out += escapeHtmlRaw(text.slice(lastIndex, match.index)).replace(/\n/g, '<br>');
    if (match[1] && match[2]) {
      const label = match[1];
      const url = match[2];
      const safeUrl = sanitizeUrl(url);
      if (safeUrl) {
        out += `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${escapeHtmlRaw(label)}</a>`;
      } else {
        out += escapeHtmlRaw(match[0]);
      }
    } else if (match[3]) {
      out += `<strong>${escapeHtmlRaw(match[3])}</strong>`;
    } else if (match[4]) {
      out += `<em>${escapeHtmlRaw(match[4])}</em>`;
    } else if (match[5]) {
      out += `<u>${escapeHtmlRaw(match[5])}</u>`;
    } else if (match[6]) {
      out += `<del>${escapeHtmlRaw(match[6])}</del>`;
    }
    lastIndex = match.index + match[0].length;
  }
  out += escapeHtmlRaw(text.slice(lastIndex)).replace(/\n/g, '<br>');
  return out;
}


async function loadRewards() {
  const carouselTrack = document.getElementById("rewardsCarousel");

  setTrackNoScroll(carouselTrack, true);
  carouselTrack.innerHTML = `
        <div class="d-flex justify-content-center align-items-center w-100 py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading rewards...</span>
            </div>
            <span class="ms-3 text-muted">Loading rewards...</span>
        </div>
    `;

  try {
    const response = await fetch("/api/rewards");
    const data = await response.json();

    if (data.rewards && data.rewards.length > 0) {
      setTrackNoScroll(carouselTrack, false);
      const timesToDuplicate = Math.max(5, Math.ceil(15 / data.rewards.length));
      const duplicatedRewards = Array(timesToDuplicate)
        .fill(data.rewards)
        .flat();

      carouselTrack.innerHTML = duplicatedRewards
        .map(
          (reward) => `
                <div class="carousel-card">
                    <div class="card h-100 shadow border-0 rounded-3">
                        <div class="p-2">
                            <img
                                src="${
                                  reward.image_url ||
                                  "https://via.placeholder.com/300x200"
                                }"
                                class="card-img-top rounded-top-3"
                                style="height: 160px; object-fit: contain"
                                alt="${reward.name}"
                                onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'"
                            />
                        </div>
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${reward.name}</h5>
                            <p class="card-text text-muted small">${
                              reward.description || ""
                            }</p>
                            <div class="d-flex justify-content-between align-items-center mt-auto">
                                <p class="card-text mb-0 fw-bold">${
                                  reward.cost
                                }hr</p>
                                ${
                                  reward.link
                                    ? `<a href="${reward.link}" target="_blank" class="text-decoration-none text-primary"><i class="bi bi-link fs-5"></i></a>`
                                    : ""
                                }
                            </div>
                        </div>
                    </div>
                </div>
            `
        )
        .join("");
    } else {
      carouselTrack.innerHTML = `
                <div class="d-flex justify-content-center align-items-center w-100 py-5">
                    <p class="text-muted">No rewards available yet.</p>
                </div>
            `;
      setTrackNoScroll(carouselTrack, true);
    }
  } catch (error) {
    console.error("Error loading rewards:", error);
    carouselTrack.innerHTML = `
            <div class="d-flex justify-content-center align-items-center w-100 py-5">
                <p class="text-danger">Failed to load rewards. Please try again later.</p>
            </div>
        `;
    setTrackNoScroll(carouselTrack, true);
  }
}

async function loadFAQs() {
  const faqAccordion = document.getElementById("faqAccordion");

  faqAccordion.innerHTML = `
        <div class="d-flex justify-content-center align-items-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading FAQs...</span>
            </div>
            <span class="ms-3 text-muted">Loading FAQs...</span>
        </div>
    `;

  try {
    const response = await fetch("/api/faqs");
    const data = await response.json();

    if (data.faqs && data.faqs.length > 0) {
      faqAccordion.innerHTML = data.faqs
        .map(
          (faq, index) => `
                <div class="accordion-item shadow border-0 rounded-3 mb-3 overflow-hidden">
                    <h2 class="accordion-header" id="heading${index}">
                        <button
                            class="accordion-button ${
                              index === 0 ? "" : "collapsed"
                            } fw-semibold"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#collapse${index}"
                            aria-expanded="${index === 0 ? "true" : "false"}"
                            aria-controls="collapse${index}"
                        >
                            ${faq.question}
                        </button>
                    </h2>
                    <div
                        id="collapse${index}"
                        class="accordion-collapse collapse ${
                          index === 0 ? "show" : ""
                        }"
                        aria-labelledby="heading${index}"
                        data-bs-parent="#faqAccordion"
                    >
                        <div class="accordion-body text-muted">${renderSimpleMarkdown(faq.answer)}</div>
                    </div>
                </div>
            `
        )
        .join("");
    } else {
      faqAccordion.innerHTML = `
                <div class="d-flex justify-content-center align-items-center py-5">
                    <p class="text-muted">No FAQs available yet.</p>
                </div>
            `;
    }
  } catch (error) {
    console.error("Error loading FAQs:", error);
    faqAccordion.innerHTML = `
            <div class="d-flex justify-content-center align-items-center py-5">
                <p class="text-danger">Failed to load FAQs. Please try again later.</p>
            </div>
        `;
  }
}

async function loadShipped() {
  const carouselTrack = document.getElementById("shippedCarousel");

  setTrackNoScroll(carouselTrack, true);
  carouselTrack.innerHTML = `
        <div class="d-flex justify-content-center align-items-center w-100 py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading shipped projects...</span>
            </div>
            <span class="ms-3 text-muted">Loading shipped projects...</span>
        </div>
    `;

  try {
    const response = await fetch("/api/projects?status=shipped");
    const data = await response.json();
    console.log(data);

    if (data.projects && data.projects.length > 0) {
      setTrackNoScroll(carouselTrack, false);
      const timesToDuplicate = Math.max(
        5,
        Math.ceil(15 / data.projects.length)
      );
      const duplicatedProjects = Array(timesToDuplicate)
        .fill(data.projects)
        .flat();

      carouselTrack.innerHTML = duplicatedProjects
        .map(
          (project) => `
                <div class="carousel-card">
                <div class="card h-100 shadow border-0 rounded-3">
                    <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${project.title}</h5>
                    <p
                        class="card-text text-muted small"
                        style="
                        display: -webkit-box;
                        -webkit-line-clamp: 3;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        "
                    >
                        ${project.description}
                    </p>

                    <div class="d-flex justify-content-center gap-2 mt-auto">
                        <a
                        href="${project.github_link}"
                        target="_blank"
                        class="btn btn-outline-secondary btn-sm square-btn"
                        >
                        <i class="bi bi-github"></i>
                        </a>
                        <a
                        href="${project.demo_link}"
                        target="_blank"
                        class="btn btn-outline-secondary btn-sm square-btn"
                        >
                        <i class="bi bi-link"></i>
                        </a>
                    </div>
                    </div>
                </div>
                </div>
            `
        )
        .join("");
    } else {
      carouselTrack.innerHTML = `
                <div class="d-flex justify-content-center align-items-center w-100 py-5">
                    <p class="text-muted">No projects have been shipped yet. Will yours be the first?</p>
                </div>
            `;
      setTrackNoScroll(carouselTrack, true);
    }
  } catch (error) {
    console.error("Error loading shipped projects:", error);
    carouselTrack.innerHTML = `
            <div class="d-flex justify-content-center align-items-center w-100 py-5">
                <p class="text-danger">Failed to load shipped projects. Please try again later.</p>
            </div>
        `;
    setTrackNoScroll(carouselTrack, true);
  }
}


document.addEventListener("DOMContentLoaded", () => {
  loadRewards();
  loadFAQs();
  loadShipped();
});
