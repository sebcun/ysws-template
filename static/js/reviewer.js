let projects = [];
let currentProject = null;
const projectModal = new bootstrap.Modal(
  document.getElementById("projectModal")
);

const pendingGrid = document.getElementById("pendingGrid");
const shippedGrid = document.getElementById("shippedGrid");
const buildingGrid = document.getElementById("buildingGrid");

const pendingCount = document.getElementById("pendingCount");
const shippedCount = document.getElementById("shippedCount");
const buildingCount = document.getElementById("buildingCount");

const pendingSearchInput = document.getElementById("pendingSearchInput");
const pendingSearchClear = document.getElementById("pendingSearchClear");
const shippedSearchInput = document.getElementById("shippedSearchInput");
const shippedSearchClear = document.getElementById("shippedSearchClear");
const buildingSearchInput = document.getElementById("buildingSearchInput");
const buildingSearchClear = document.getElementById("buildingSearchClear");

const projectModalLabel = document.getElementById("projectModalLabel");
const projectModalBadge = document.getElementById("projectModalBadge");
const projectModalHours = document.getElementById("projectModalHours");
const projectDescText = document.getElementById("projectDescText");
const demoInput = document.getElementById("demoInput");
const githubInput = document.getElementById("githubInput");
const hackatimeInput = document.getElementById("hackatimeInput");
const statusSelect = document.getElementById("statusSelect");
const creatorLink = document.getElementById("creatorLink");
const approveBtn = document.getElementById("approveBtn");
const rejectBtn = document.getElementById("rejectBtn");
const editBtn = document.getElementById("editBtn");
const deleteBtn = document.getElementById("deleteBtn");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");

const paySection = document.getElementById("paySection");
const payInput = document.getElementById("payInput");
const payBtn = document.getElementById("payBtn");
const payHelper = document.getElementById("payHelper");

let _originalValues = {};

function getStatusBadge(status) {
  const statusMap = {
    Building: "bg-warning text-dark",
    "Pending Review": "bg-info text-dark",
    Approved: "bg-success",
    Shipped: "bg-success",
    Rejected: "bg-danger",
  };
  return statusMap[status] || "bg-secondary";
}

function matchesSearch(project, term) {
  if (!term) return true;
  const t = term.toLowerCase();
  const title = (project.title || "").toLowerCase();
  const nickname = (project.nickname || project.email || "").toLowerCase();
  const slackId = (project.slack_id || "").toLowerCase();
  return title.includes(t) || nickname.includes(t) || slackId.includes(t);
}

function formatHours(hours) {
  if (typeof hours === "number") {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0 && m === 0) return "0h 0m";
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
  return "0h 0m";
}

function payoutCap(hours) {
  return Math.floor(Number(hours || 0) * 2) / 2;
}

async function loadProjects() {
  try {
    const response = await fetch("/api/reviewer/projects");
    const data = await response.json();
    projects = data.projects || [];
    renderProjects();
  } catch (error) {
    console.error("Failed to load projects:", error);
  }
}

function renderProjects() {
  const pendingTerm = pendingSearchInput.value.trim();
  const shippedTerm = shippedSearchInput.value.trim();
  const buildingTerm = buildingSearchInput.value.trim();

  const pending = projects.filter(
    (p) => p.status === "Pending Review" && matchesSearch(p, pendingTerm)
  );
  const shipped = projects.filter(
    (p) =>
      (p.status === "Shipped" || p.status === "Approved") &&
      matchesSearch(p, shippedTerm)
  );
  const building = projects.filter(
    (p) => p.status === "Building" && matchesSearch(p, buildingTerm)
  );

  pendingCount.textContent = `${pending.length} Project${
    pending.length !== 1 ? "s" : ""
  }`;
  shippedCount.textContent = `${shipped.length} Project${
    shipped.length !== 1 ? "s" : ""
  }`;
  buildingCount.textContent = `${building.length} Project${
    building.length !== 1 ? "s" : ""
  }`;

  renderGrid(pendingGrid, pending);
  renderGrid(shippedGrid, shipped);
  renderGrid(buildingGrid, building);
}

function renderGrid(grid, projectList) {
  grid.innerHTML = "";

  if (projectList.length === 0) {
    grid.innerHTML =
      '<div class="col-12 text-center py-3"><p class="text-muted">No projects</p></div>';
    return;
  }

  projectList.forEach((project) => {
    const col = document.createElement("div");
    col.className = "col";

    const title = project.title || "Untitled Project";
    const description = project.description || "No description";
    const status = project.status || "Building";
    const hours = project.hours || 0;
    const nickname = project.nickname || project.email || "Unknown";
    const slackId = project.slack_id || "";
    const statusClass = getStatusBadge(status);
    const buttonText =
      status === "Pending Review" ? "REVIEW PROJECT" : "VIEW PROJECT";
    const buttonClass =
      status === "Pending Review" ? "btn-primary" : "btn-outline-primary";

    col.innerHTML = `
      <div class="card h-100 shadow border-0 rounded-3">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h5 class="card-title mb-0 text-truncate">${title}</h5>
            <span class="badge ${statusClass}">${status}</span>
          </div>
          <p class="card-text text-truncate mb-2">${description}</p>
          <p class="text-muted small mb-2">By: <a href="https://hackclub.enterprise.slack.com/team/${slackId}" target="_blank">${nickname}</a></p>
          <div class="d-flex justify-content-between align-items-center mt-auto">
            <h6 class="text-muted mb-0">${formatHours(hours)}</h6>
            <button type="button" class="btn ${buttonClass} btn-sm px-3" data-project-id="${
      project.id
    }">
              ${buttonText}
            </button>
          </div>
        </div>
      </div>
    `;

    col
      .querySelector("button")
      .addEventListener("click", () => openProjectModal(project));
    grid.appendChild(col);
  });
}

function openProjectModal(project) {
  currentProject = project;

  const title = project.title || "Untitled Project";
  const description = project.description || "No description";
  const demoLink = project.demo_link || "";
  const githubLink = project.github_link || "";
  const hackatimeProject = project.hackatime_project || "";
  const status = project.status || "Building";
  const hours = project.hours || 0;
  const nickname = project.nickname || project.email || "Unknown";
  const slackId = project.slack_id || "";

  projectModalLabel.textContent = title;
  projectModalBadge.className = "badge " + getStatusBadge(status);
  projectModalBadge.textContent = status;
  projectModalHours.textContent = formatHours(hours);
  projectDescText.textContent = description;
  demoInput.value = demoLink;
  githubInput.value = githubLink;
  hackatimeInput.value = hackatimeProject;
  if (statusSelect) {
    statusSelect.value = status;
    statusSelect.disabled = true;
  }
  creatorLink.textContent = nickname;
  creatorLink.href = `https://hackclub.enterprise.slack.com/team/${slackId}`;

  if (status === "Pending Review") {
    approveBtn.style.display = "";
    rejectBtn.style.display = "";
  } else {
    approveBtn.style.display = "none";
    rejectBtn.style.display = "none";
  }

  if (editBtn) {
    editBtn.style.display = "";
    deleteBtn.style.display = "";
    saveBtn.style.display = "none";
    cancelBtn.style.display = "none";
    demoInput.readOnly = true;
    githubInput.readOnly = true;
    hackatimeInput.readOnly = true;
  }

  if (paySection) {
    const projectHours = Number(hours || 0);
    const cap = payoutCap(projectHours);
    const paid = Number(project.paid_hours || 0);
    if (status === "Shipped" && paid < cap) {
      const defaultAmount = paid ? paid : cap;
      payInput.value = Number.isInteger(defaultAmount)
        ? defaultAmount.toFixed(0)
        : defaultAmount.toFixed(1);
      payInput.disabled = false;
      if (payBtn) payBtn.disabled = false;
      paySection.style.display = "";
      payHelper.textContent = `Cap: ${cap.toFixed(
        cap % 1 === 0 ? 0 : 1
      )} — step 0.5`;
    } else {
      payInput.value = "";
      payInput.disabled = true;
      if (payBtn) payBtn.disabled = true;
      paySection.style.display = "none";
    }
  }

  projectModal.show();
}

async function handleApprove() {
  if (!currentProject) return;

  approveBtn.disabled = true;
  approveBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2"></span>Approving...';

  try {
    const response = await fetch(
      `/api/reviewer/projects/${currentProject.id}/approve`,
      {
        method: "POST",
      }
    );

    if (response.ok) {
      projectModal.hide();
      await loadProjects();
    } else {
      alert("Failed to approve project");
    }
  } catch (error) {
    console.error("Failed to approve:", error);
    alert("Failed to approve project");
  } finally {
    approveBtn.disabled = false;
    approveBtn.textContent = "Approve";
  }
}

async function handleReject() {
  if (!currentProject) return;

  const reason = prompt("Please provide a reason for rejecting this project:");

  if (reason === null) {
    return;
  }

  if (!reason.trim()) {
    alert("Please provide a reason for rejection");
    return;
  }

  rejectBtn.disabled = true;
  rejectBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2"></span>Rejecting...';

  try {
    const response = await fetch(
      `/api/reviewer/projects/${currentProject.id}/reject`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: reason.trim() }),
      }
    );

    if (response.ok) {
      projectModal.hide();
      await loadProjects();
    } else {
      alert("Failed to reject project");
    }
  } catch (error) {
    console.error("Failed to reject:", error);
    alert("Failed to reject project");
  } finally {
    rejectBtn.disabled = false;
    rejectBtn.textContent = "Reject";
  }
}

function setupSearch(input, clearBtn) {
  input.addEventListener("input", () => {
    clearBtn.style.display = input.value ? "block" : "none";
    renderProjects();
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.style.display = "none";
    renderProjects();
    input.focus();
  });
}

function handleEdit() {
  if (!currentProject) return;
  _originalValues = {
    demo: demoInput.value,
    github: githubInput.value,
    hackatime: hackatimeInput.value,
    status: statusSelect ? statusSelect.value : currentProject.status,
  };
  demoInput.readOnly = false;
  githubInput.readOnly = false;
  hackatimeInput.readOnly = false;
  if (statusSelect) statusSelect.disabled = false;
  editBtn.style.display = "none";
  deleteBtn.style.display = "none";
  saveBtn.style.display = "";
  cancelBtn.style.display = "";
  if (approveBtn) approveBtn.style.display = "none";
  if (rejectBtn) rejectBtn.style.display = "none";
}

function handleCancelEdit() {
  demoInput.value = _originalValues.demo || "";
  githubInput.value = _originalValues.github || "";
  hackatimeInput.value = _originalValues.hackatime || "";
  if (statusSelect) {
    statusSelect.value = _originalValues.status || currentProject.status;
    statusSelect.disabled = true;
  }
  demoInput.readOnly = true;
  githubInput.readOnly = true;
  hackatimeInput.readOnly = true;
  editBtn.style.display = "";
  deleteBtn.style.display = "";
  saveBtn.style.display = "none";
  cancelBtn.style.display = "none";
  if (currentProject && currentProject.status === "Pending Review") {
    approveBtn.style.display = "";
    rejectBtn.style.display = "";
  } else {
    if (approveBtn) approveBtn.style.display = "none";
    if (rejectBtn) rejectBtn.style.display = "none";
  }
}

async function handleSaveEdit() {
  if (!currentProject) return;
  saveBtn.disabled = true;
  saveBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
  try {
    const body = {
      demo_link: demoInput.value.trim(),
      github_link: githubInput.value.trim(),
      hackatime_project: hackatimeInput.value.trim(),
    };
    if (statusSelect) body.status = statusSelect.value;
    const res = await fetch(`/api/projects/${currentProject.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      projectModal.hide();
      await loadProjects();
    } else {
      alert(
        (data && data.error) ||
          "Failed to save changes" +
            (data && data.conflicts
              ? "\nConflicts: " + data.conflicts.join(", ")
              : "")
      );
    }
  } catch (e) {
    console.error("Failed to save:", e);
    alert("Failed to save changes");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
}

async function handleDelete() {
  if (!currentProject) return;
  if (
    !confirm(
      "Are you sure you want to delete this project? This cannot be undone."
    )
  )
    return;
  deleteBtn.disabled = true;
  deleteBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';
  try {
    const res = await fetch(`/api/projects/${currentProject.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (res.ok) {
      projectModal.hide();
      await loadProjects();
    } else {
      alert((data && data.error) || "Failed to delete project");
    }
  } catch (e) {
    console.error("Failed to delete:", e);
    alert("Failed to delete project");
  } finally {
    deleteBtn.disabled = false;
    deleteBtn.textContent = "Delete";
  }
}

async function handlePay() {
  if (!currentProject) return;
  const amt = parseFloat(payInput.value);
  if (isNaN(amt) || amt < 0) {
    alert("Invalid amount");
    return;
  }
  const projectHours = Number(currentProject.hours || 0);
  const cap = payoutCap(projectHours);
  if (amt > cap) {
    alert("Amount cannot exceed payout cap");
    return;
  }
  if (Math.abs(amt * 2 - Math.round(amt * 2)) > 1e-8) {
    alert("Amount must be a multiple of 0.5");
    return;
  }
  payBtn.disabled = true;
  payBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2"></span>Paying...';
  try {
    const res = await fetch(`/api/reviewer/projects/${currentProject.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amt }),
    });
    const data = await res.json();
    if (res.ok) {
      projectModal.hide();
      await loadProjects();
    } else {
      alert((data && data.error) || "Failed to pay hours");
    }
  } catch (e) {
    console.error("Failed to pay:", e);
    alert("Failed to pay hours");
  } finally {
    payBtn.disabled = false;
    payBtn.textContent = "Pay";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  setupSearch(pendingSearchInput, pendingSearchClear);
  setupSearch(shippedSearchInput, shippedSearchClear);
  setupSearch(buildingSearchInput, buildingSearchClear);

  loadProjects();
  if (approveBtn) approveBtn.addEventListener("click", handleApprove);
  if (rejectBtn) rejectBtn.addEventListener("click", handleReject);
  if (editBtn) editBtn.addEventListener("click", handleEdit);
  if (saveBtn) saveBtn.addEventListener("click", handleSaveEdit);
  if (cancelBtn) cancelBtn.addEventListener("click", handleCancelEdit);
  if (deleteBtn) deleteBtn.addEventListener("click", handleDelete);
  if (payBtn) payBtn.addEventListener("click", handlePay);
});
