function showErrorState(type, message, details = '') {
    const form = document.getElementById('payment-form-container');
    const loader = document.getElementById('loader-container');
    const result = document.getElementById('payment-result');
    let errorEl = document.getElementById('payment-error-state');

    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.id = 'payment-error-state';
        document.querySelector('.payment-card')?.appendChild(errorEl);
    }

    const labels = {
        developer: { title: 'Developer Error', icon: '🔧' },
        paystack: { title: 'Payment Service Error', icon: '⚡' },
        user: { title: 'Connection Issue', icon: '🌐' }
    };

    const { title, icon } = labels[type] || { title: 'Error', icon: '⚠️' };

    const retryBtn = type === 'user'
        ? `<button onclick="retryPayment()" class="btn btn-retry">Retry</button>`
        : '';

    errorEl.className = `error-state ${type}`;
    errorEl.innerHTML = `
        <div class="error-content">
            <div class="error-icon">${icon}</div>
            <h3>${title}</h3>
            <p class="error-message">${escapeHtml(message)}</p>
            ${details ? `<p class="error-details"><small>${escapeHtml(details)}</small></p>` : ''}
            ${retryBtn}
        </div>
    `;

    [form, loader, result].forEach(el => el && (el.style.display = 'none'));
}

function hideErrorState() {
    const el = document.getElementById('payment-error-state');
    if (el) el.remove();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}