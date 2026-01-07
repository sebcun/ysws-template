async function loadRewards() {
    const carouselTrack = document.querySelector('.carousel-track');
    
    carouselTrack.innerHTML = `
        <div class="d-flex justify-content-center align-items-center w-100 py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading rewards...</span>
            </div>
            <span class="ms-3 text-muted">Loading rewards...</span>
        </div>
    `;
    
    try {
        const response = await fetch('/api/rewards');
        const data = await response.json();
        
        if (data.rewards && data.rewards.length > 0) {
            const timesToDuplicate = Math.max(5, Math.ceil(15 / data.rewards.length));
            const duplicatedRewards = Array(timesToDuplicate).fill(data.rewards).flat();
            
            carouselTrack.innerHTML = duplicatedRewards.map(reward => `
                <div class="carousel-card">
                    <div class="card h-100 shadow border-0 rounded-3">
                        <div class="p-2">
                            <img
                                src="${reward.image_url || 'https://via.placeholder.com/300x200'}"
                                class="card-img-top rounded-top-3"
                                style="height: 160px; object-fit: contain"
                                alt="${reward.name}"
                                onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'"
                            />
                        </div>
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${reward.name}</h5>
                            <p class="card-text text-muted small">${reward.description || ''}</p>
                            <div class="d-flex justify-content-between align-items-center mt-auto">
                                <p class="card-text mb-0 fw-bold">${reward.cost}hr</p>
                                ${reward.link ? `<a href="${reward.link}" target="_blank" class="text-decoration-none text-primary"><i class="bi bi-link fs-5"></i></a>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            carouselTrack.innerHTML = `
                <div class="d-flex justify-content-center align-items-center w-100 py-5">
                    <p class="text-muted">No rewards available yet.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading rewards:', error);
        carouselTrack.innerHTML = `
            <div class="d-flex justify-content-center align-items-center w-100 py-5">
                <p class="text-danger">Failed to load rewards. Please try again later.</p>
            </div>
        `;
    }
}

async function loadFAQs() {
    const faqAccordion = document.getElementById('faqAccordion');
    
    faqAccordion.innerHTML = `
        <div class="d-flex justify-content-center align-items-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading FAQs...</span>
            </div>
            <span class="ms-3 text-muted">Loading FAQs...</span>
        </div>
    `;
    
    try {
        const response = await fetch('/api/faqs');
        const data = await response.json();
        
        if (data.faqs && data.faqs.length > 0) {
            faqAccordion.innerHTML = data.faqs.map((faq, index) => `
                <div class="accordion-item shadow border-0 rounded-3 mb-3 overflow-hidden">
                    <h2 class="accordion-header" id="heading${index}">
                        <button
                            class="accordion-button ${index === 0 ? '' : 'collapsed'} fw-semibold"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#collapse${index}"
                            aria-expanded="${index === 0 ? 'true' : 'false'}"
                            aria-controls="collapse${index}"
                        >
                            ${faq.question}
                        </button>
                    </h2>
                    <div
                        id="collapse${index}"
                        class="accordion-collapse collapse ${index === 0 ? 'show' : ''}"
                        aria-labelledby="heading${index}"
                        data-bs-parent="#faqAccordion"
                    >
                        <div class="accordion-body text-muted">${faq.answer}</div>
                    </div>
                </div>
            `).join('');
        } else {
            faqAccordion.innerHTML = `
                <div class="d-flex justify-content-center align-items-center py-5">
                    <p class="text-muted">No FAQs available yet.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading FAQs:', error);
        faqAccordion.innerHTML = `
            <div class="d-flex justify-content-center align-items-center py-5">
                <p class="text-danger">Failed to load FAQs. Please try again later.</p>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadRewards();
    loadFAQs();
});