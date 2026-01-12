let orders = [];
let rewards = {};
let currentOrder = null;

const pendingOrderList = document.getElementById("pendingOrderList");
const fulfilledOrderList = document.getElementById("fulfilledOrderList");

const pendingSearchInput = document.getElementById("pendingSearchInput");
const pendingSearchClear = document.getElementById("pendingSearchClear");
const fulfilledSearchInput = document.getElementById("fulfilledSearchInput");
const fulfilledSearchClear = document.getElementById("fulfilledSearchClear");

const pendingCount = document.getElementById("pendingCount");
const fulfilledCount = document.getElementById("fulfilledCount");

const orderModalEl = document.getElementById("orderModal");
const orderModal = new bootstrap.Modal(orderModalEl);
const orderModalLabel = document.getElementById("orderModalLabel");
const orderModalBadge = document.getElementById("orderModalBadge");
const orderModalTitle = document.getElementById("orderModalTitle");
const orderModalUser = document.getElementById("orderModalUser");
const orderModalId = document.getElementById("orderModalId");
const orderModalCreated = document.getElementById("orderModalCreated");
const orderModalName = document.getElementById("orderModalName");
const orderModalContact = document.getElementById("orderModalContact");
const orderModalItems = document.getElementById("orderModalItems");
const orderModalAddress = document.getElementById("orderModalAddress");
const orderNotes = document.getElementById("orderNotes");
const orderToggleStatusBtn = document.getElementById("orderToggleStatusBtn");
const orderSaveNotesBtn = document.getElementById("orderSaveNotesBtn");

function getStatusBadgeClass(status) {
  if (!status) return "bg-secondary";
  const s = String(status).toLowerCase();
  if (s === "pending") return "bg-warning text-dark";
  if (s === "fulfilled") return "bg-success";
  return "bg-secondary";
}

function matchesSearch(order, term) {
  if (!term) return true;
  const t = term.toLowerCase();
  const nickname = (order.user_nickname || "").toLowerCase();
  const email = (order.user_email || "").toLowerCase();
  const slack = (order.user_slack_id || "").toLowerCase();
  return (
    nickname.includes(t) ||
    email.includes(t) ||
    slack.includes(t) ||
    String(order.id || "").includes(t)
  );
}

function formatDate(dt) {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    return d.toLocaleString();
  } catch (e) {
    return dt;
  }
}

function formatHours(val) {
  const n = Number(val || 0);
  if (Number.isInteger(n)) return `${n}h`;
  return `${parseFloat(n.toFixed(2))}h`;
}

function renderList(container, list) {
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML =
      '<div class="col-12 text-center py-3"><p class="text-muted">No orders</p></div>';
    return;
  }

  list.forEach((o) => {
    const col = document.createElement("div");
    col.className = "col";

    const reward = rewards[String(o.reward_id)] || null;
    const rewardName = reward ? reward.name : `Reward #${o.reward_id}`;
    const titleText = `x${o.quantity} ${rewardName}`;

    const nickname = o.user_nickname || o.user_email || "Unknown";
    const slackId = o.user_slack_id || "";
    const status = o.status || "pending";
    const statusClass = getStatusBadgeClass(status);

    col.innerHTML = `
      <div class="card h-100 shadow border-0 rounded-3">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h5 class="card-title mb-0 text-truncate">${titleText}</h5>
            <span class="badge ${statusClass}">${String(
      status
    ).toUpperCase()}</span>
          </div>
          <p class="text-muted small mb-2">By: <a href="https://hackclub.enterprise.slack.com/team/${slackId}" target="_blank">${nickname}</a></p>
          <div class="d-flex justify-content-between align-items-center mt-auto">
            <p class="text-muted small mb-0">${formatDate(o.created_at)}</p>
            <button type="button" class="btn btn-outline-primary btn-sm" data-order-id="${o.id}">View Order</button>
          </div>
        </div>
      </div>
    `;

    col.querySelector("button").addEventListener("click", () => openOrderModal(o));
    container.appendChild(col);
  });
}

async function loadRewards() {
  if (Object.keys(rewards).length > 0) return;

  try {
    const res = await fetch("/api/rewards");
    const data = await res.json();

    if (res.ok && data.rewards) {
      data.rewards.forEach((r) => {
        rewards[String(r.id)] = r;
      });
    }
  } catch (e) {
    console.error("Failed to load rewards:", e);
  }
}

async function loadOrders() {
  try {
    const res = await fetch("/api/admin/orders");
    const txt = await res.text();
    let data;
    try {
      data = JSON.parse(txt);
    } catch (e) {
      console.error(
        "Server returned non-JSON response for /api/admin/orders:",
        txt
      );
      pendingOrderList.innerHTML = `<div class="col-12 text-center py-3"><p class="text-muted">Server error: ${res.status} ${res.statusText}</p></div>`;
      fulfilledOrderList.innerHTML = `<div class="col-12 text-center py-3"><p class="text-muted">Server error: ${res.status} ${res.statusText}</p></div>`;
      return;
    }
    if (!res.ok) {
      pendingOrderList.innerHTML = `<div class="col-12 text-center py-3"><p class="text-muted">${
        (data && data.error) || "Failed to load orders"
      }</p></div>`;
      fulfilledOrderList.innerHTML = `<div class="col-12 text-center py-3"><p class="text-muted">${
        (data && data.error) || "Failed to load orders"
      }</p></div>`;
      return;
    }
    orders = data.orders || [];
    await loadRewards();
    renderOrders();
  } catch (e) {
    console.error("Failed to load orders:", e);
    pendingOrderList.innerHTML =
      '<div class="col-12 text-center py-3"><p class="text-muted">Failed to load orders</p></div>';
    fulfilledOrderList.innerHTML =
      '<div class="col-12 text-center py-3"><p class="text-muted">Failed to load orders</p></div>';
  }
}

function renderOrders() {
  const pendingTerm = (pendingSearchInput ? pendingSearchInput.value : "").trim();
  const fulfilledTerm = (fulfilledSearchInput ? fulfilledSearchInput.value : "").trim();

  const pending = orders.filter(
    (o) => (String(o.status || "pending").toLowerCase() === "pending") && matchesSearch(o, pendingTerm)
  );
  const fulfilled = orders.filter(
    (o) => (String(o.status || "").toLowerCase() === "fulfilled") && matchesSearch(o, fulfilledTerm)
  );

  pendingCount.textContent = `${pending.length} Order${pending.length !== 1 ? "s" : ""}`;
  fulfilledCount.textContent = `${fulfilled.length} Order${fulfilled.length !== 1 ? "s" : ""}`;

  renderList(pendingOrderList, pending);
  renderList(fulfilledOrderList, fulfilled);
}

function openOrderModal(order) {
  currentOrder = order;
  const reward = rewards[order.reward_id] || null;
  const rewardName = reward && reward.name ? reward.name : `Reward #${order.reward_id}`;

  orderModalLabel.textContent = `x${order.quantity} ${rewardName}`;
  orderModalTitle.textContent = `Order #${order.id}`;
  orderModalBadge.className = "badge " + getStatusBadgeClass(order.status);
  orderModalBadge.textContent = String(order.status || "pending").toUpperCase();

  const nickname = order.user_nickname || order.user_email || "Unknown";
  const slack = order.user_slack_id || "";

  orderModalUser.innerHTML = `By: <a href="https://hackclub.enterprise.slack.com/team/${slack}" target="_blank">${nickname}</a>`;
  orderModalId.textContent = order.id;
  orderModalCreated.textContent = formatDate(order.created_at);
  orderModalName.textContent = `${order.name} (${order.email || ""})`;
  orderModalContact.textContent = `${order.phone || ""}`;
  orderModalItems.textContent = `x${order.quantity} ${rewardName} • ${formatHours(order.total_cost)}`;

  let addr = "";
  try {
    const a = order.address || {};
    if (typeof a === "string") addr = a;
    else {
      const lines = [];
      if (a.address) lines.push(a.address);
      if (a.city) lines.push(a.city);
      if (a.state) lines.push(a.state);
      if (a.postcode) lines.push(a.postcode);
      if (a.country) lines.push(a.country);
      addr = lines.join(", ");
    }
  } catch (e) {
    addr = "";
  }
  orderModalAddress.textContent = addr || "—";

  orderNotes.value = order.notes || "";

  if ((order.status || "").toLowerCase() === "fulfilled") {
    orderToggleStatusBtn.textContent = "Mark Pending";
    orderToggleStatusBtn.className = "btn btn-outline-warning";
  } else {
    orderToggleStatusBtn.textContent = "Mark Fulfilled";
    orderToggleStatusBtn.className = "btn btn-success";
  }

  orderModal.show();
}

async function patchOrderStatus(orderId, status) {
  try {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      await loadOrders();
      const updated = orders.find((o) => o.id === orderId);
      if (updated) openOrderModal(updated);
      return true;
    } else {
      alert((data && data.error) || "Failed to update status");
      return false;
    }
  } catch (e) {
    console.error("Failed to update status:", e);
    alert("Failed to update status");
    return false;
  }
}

async function saveOrderNotes(orderId, notes) {
  try {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      await loadOrders();
      const updated = orders.find((o) => o.id === orderId);
      if (updated) openOrderModal(updated);
      return true;
    } else {
      alert((data && data.error) || "Failed to save notes");
      return false;
    }
  } catch (e) {
    console.error("Failed to save notes:", e);
    alert("Failed to save notes");
    return false;
  }
}

function setupSearch(input, clearBtn) {
  if (!input || !clearBtn) return;
  input.addEventListener("input", () => {
    clearBtn.style.display = input.value ? "block" : "none";
    renderOrders();
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.style.display = "none";
    renderOrders();
    input.focus();
  });
}

document.addEventListener("DOMContentLoaded", function () {
  setupSearch(pendingSearchInput, pendingSearchClear);
  setupSearch(fulfilledSearchInput, fulfilledSearchClear);

  orderToggleStatusBtn.addEventListener("click", async () => {
    if (!currentOrder) return;
    const newStatus =
      (currentOrder.status || "").toLowerCase() === "fulfilled"
        ? "pending"
        : "fulfilled";
    orderToggleStatusBtn.disabled = true;
    orderToggleStatusBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';
    await patchOrderStatus(currentOrder.id, newStatus);
    orderToggleStatusBtn.disabled = false;
    orderToggleStatusBtn.textContent =
      newStatus === "fulfilled" ? "Mark Pending" : "Mark Fulfilled";
  });

  orderSaveNotesBtn.addEventListener("click", async () => {
    if (!currentOrder) return;
    const notes = (orderNotes.value || "").trim();
    orderSaveNotesBtn.disabled = true;
    orderSaveNotesBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
    await saveOrderNotes(currentOrder.id, notes);
    orderSaveNotesBtn.disabled = false;
    orderSaveNotesBtn.textContent = "Save Notes";
  });

  loadOrders();
});