let faqs = [];
let rewards = [];

const faqList = document.getElementById('faqList');
const rewardList = document.getElementById('rewardList');
const saveFaqBtn = document.getElementById('saveFaqBtn');
const saveRewardBtn = document.getElementById('saveRewardBtn');
const addFaqModalEl = document.getElementById('addFaqModal');
const addRewardModalEl = document.getElementById('addRewardModal');
const addFaqModal = new bootstrap.Modal(addFaqModalEl);
const addRewardModal = new bootstrap.Modal(addRewardModalEl);

async function loadFaqs() {
  try {
    const response = await fetch('/api/faqs');
    const data = await response.json();
    faqs = data.faqs || [];
    renderFaqs();
  } catch (error) {
    console.error('Failed to load FAQs:', error);
    faqList.innerHTML = '<div class="col-12 text-center text-danger">Failed to load FAQs</div>';
  }
}

async function loadRewards() {
  try {
    const response = await fetch('/api/rewards');
    const data = await response.json();
    rewards = data.rewards || [];
    renderRewards();
  } catch (error) {
    console.error('Failed to load rewards:', error);
    rewardList.innerHTML = '<div class="col-12 text-center text-danger">Failed to load rewards</div>';
  }
}

function renderFaqs() {
  faqList.innerHTML = '';
  
  if (faqs.length === 0) {
    faqList.innerHTML = '<div class="col-12 text-center text-muted py-4">No FAQs yet. Add your first FAQ!</div>';
    return;
  }
  
  faqs.forEach(faq => {
    const faqEl = document.createElement('div');
    faqEl.className = 'col fade-in';
    faqEl.innerHTML = `
      <div class="card shadow-sm border-0 rounded-3 admin-card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h5 class="card-title fw-bold mb-2">${escapeHtml(faq.question)}</h5>
              <p class="card-text text-muted">${escapeHtml(faq.answer)}</p>
            </div>
            <button class="btn btn-outline-danger btn-sm delete-btn ms-3" onclick="deleteFaq(${faq.id})">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    faqList.appendChild(faqEl);
  });
}

function renderRewards() {
  rewardList.innerHTML = '';
  
  if (rewards.length === 0) {
    rewardList.innerHTML = '<div class="col-12 text-center text-muted py-4">No rewards yet. Add your first reward!</div>';
    return;
  }
  
  rewards.forEach(reward => {
    const rewardEl = document.createElement('div');
    rewardEl.className = 'col fade-in';
    rewardEl.innerHTML = `
      <div class="card h-100 shadow border-0 rounded-3 admin-card">
        <div class="p-2">
          <img
            src="${escapeHtml(reward.image_url)}"
            class="card-img-top rounded-top-3 bg-light"
            alt="${escapeHtml(reward.name)}"
            style="height: 200px; object-fit: contain"
          />
        </div>
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h5 class="card-title mb-0 text-truncate">${escapeHtml(reward.name)}</h5>
            <span class="badge bg-primary">${reward.cost} hour${reward.cost !== 1 ? 's' : ''}</span>
          </div>
          <p class="card-text text-muted small">${escapeHtml(reward.description)}</p>
          <div class="mt-auto pt-3 text-end">
            <button class="btn btn-outline-danger btn-sm delete-btn" onclick="deleteReward(${reward.id})">
              <i class="bi bi-trash me-1"></i>Remove
            </button>
          </div>
        </div>
      </div>
    `;
    rewardList.appendChild(rewardEl);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function createFaq() {
  const question = document.getElementById('faqQuestion').value.trim();
  const answer = document.getElementById('faqAnswer').value.trim();
  
  if (!question || !answer) {
    alert('Please fill in both question and answer');
    return;
  }
  
  saveFaqBtn.disabled = true;
  saveFaqBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';
  
  try {
    const response = await fetch('/api/admin/faqs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer })
    });
    
    if (response.ok) {
      document.getElementById('addFaqForm').reset();
      addFaqModal.hide();
      await loadFaqs();
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to add FAQ');
    }
  } catch (error) {
    console.error('Failed to create FAQ:', error);
    alert('Failed to add FAQ');
  } finally {
    saveFaqBtn.disabled = false;
    saveFaqBtn.textContent = 'Add FAQ';
  }
}

async function deleteFaq(faqId) {
  if (!confirm('Are you sure you want to delete this FAQ?')) return;
  
  try {
    const response = await fetch(`/api/admin/faqs/${faqId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      await loadFaqs();
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to delete FAQ');
    }
  } catch (error) {
    console.error('Failed to delete FAQ:', error);
    alert('Failed to delete FAQ');
  }
}

async function createReward() {
  const name = document.getElementById('rewardName').value.trim();
  const cost = parseFloat(document.getElementById('rewardCost').value);
  const imageUrl = document.getElementById('rewardImage').value.trim();
  const description = document.getElementById('rewardDesc').value.trim();
  
  if (!name || !cost || !imageUrl || !description) {
    alert('Please fill in all fields');
    return;
  }
  
  if (isNaN(cost) || cost <= 0) {
    alert('Cost must be a positive number');
    return;
  }
  
  saveRewardBtn.disabled = true;
  saveRewardBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';
  
  try {
    const response = await fetch('/api/admin/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, cost, image_url: imageUrl, description })
    });
    
    if (response.ok) {
      document.getElementById('addRewardForm').reset();
      addRewardModal.hide();
      await loadRewards();
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to add reward');
    }
  } catch (error) {
    console.error('Failed to create reward:', error);
    alert('Failed to add reward');
  } finally {
    saveRewardBtn.disabled = false;
    saveRewardBtn.textContent = 'Add Reward';
  }
}

async function deleteReward(rewardId) {
  if (!confirm('Are you sure you want to delete this reward?')) return;
  
  try {
    const response = await fetch(`/api/admin/rewards/${rewardId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      await loadRewards();
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to delete reward');
    }
  } catch (error) {
    console.error('Failed to delete reward:', error);
    alert('Failed to delete reward');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadFaqs();
  loadRewards();
  
  saveFaqBtn.addEventListener('click', createFaq);
  saveRewardBtn.addEventListener('click', createReward);
});
