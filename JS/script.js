const CATEGORIES = [
    { id: 'food', name: 'Ăn uống', icon: '🍜', color: '#ff6b6b', bg: 'rgba(255,107,107,0.15)' },
    { id: 'transport', name: 'Di chuyển', icon: '🚗', color: '#f0a500', bg: 'rgba(240,165,0,0.15)' },
    { id: 'shop', name: 'Mua sắm', icon: '🛍️', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
    { id: 'health', name: 'Sức khỏe', icon: '💊', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
    { id: 'entertain', name: 'Giải trí', icon: '🎮', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
    { id: 'bill', name: 'Hóa đơn', icon: '📋', color: '#fb923c', bg: 'rgba(251,146,60,0.15)' },
    { id: 'edu', name: 'Học tập', icon: '📚', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
    { id: 'work', name: 'Công việc', icon: '💼', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
    { id: 'other', name: 'Khác', icon: '💰', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
];

const INCOME_CATEGORIES = [
    { id: 'salary', name: 'Lương', icon: '💼', color: '#00c4b4', bg: 'rgba(0,196,180,0.15)' },
    { id: 'freelance', name: 'Freelance', icon: '💻', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
    { id: 'bonus', name: 'Thưởng', icon: '🎁', color: '#f0a500', bg: 'rgba(240,165,0,0.15)' },
    { id: 'invest', name: 'Đầu tư', icon: '📈', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
    { id: 'transfer', name: 'Chuyển khoản', icon: '🏦', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
    { id: 'other_in', name: 'Khác', icon: '💰', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
];

let expenses = JSON.parse(localStorage.getItem('expenses_v2') || '[]');
let incomes  = JSON.parse(localStorage.getItem('incomes_v1') || '[]');
let openingBalance = parseFloat(localStorage.getItem('opening_balance') || '12195689');
let editId = null;
let editType = 'expense'; // 'expense' | 'income'
let currentEntryType = 'expense';
let statPeriod = 'month';
let donutChart, barChart, monthlyChart, statDonutChart;

function save() {
    localStorage.setItem('expenses_v2', JSON.stringify(expenses));
    localStorage.setItem('incomes_v1', JSON.stringify(incomes));
    localStorage.setItem('opening_balance', String(openingBalance));
}
function getCat(id) { return CATEGORIES.find(c => c.id === id) || CATEGORIES[7]; }
function getIncomeCat(id) { return INCOME_CATEGORIES.find(c => c.id === id) || INCOME_CATEGORIES[5]; }
function fmtMoney(n) {
    return n.toLocaleString('en-US').replace(/\./g, ',') + 'đ';
}
function today() { return new Date().toISOString().split('T')[0]; }

function getFilteredByPeriod(period, list) {
    const src = list || expenses;
    const now = new Date();
    return src.filter(e => {
        const d = new Date(e.date);
        if (period === 'today') return e.date === today();
        if (period === 'week') { const s = new Date(now); s.setDate(now.getDate() - 6); return d >= s; }
        if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (period === 'lastmonth') { const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); }
        if (period === 'year') return d.getFullYear() === now.getFullYear();
        return true;
    });
}

// ── Entry type toggle ──
function setEntryType(type) {
    currentEntryType = type;
    const btnExp = document.getElementById('type-expense');
    const btnInc = document.getElementById('type-income');
    const catWrap = document.getElementById('form-cat-wrap');
    const incomeCatWrap = document.getElementById('form-income-cat-wrap');
    const saveText = document.getElementById('save-btn-text');
    const modalTitle = document.getElementById('modal-title');

    if (type === 'expense') {
        btnExp.className = 'type-btn type-btn-active';
        btnInc.className = 'type-btn';
        catWrap.style.display = '';
        incomeCatWrap.style.display = 'none';
        if (!editId) {
            saveText.textContent = 'Lưu khoản chi';
            modalTitle.textContent = 'Thêm khoản chi';
        }
    } else {
        btnExp.className = 'type-btn';
        btnInc.className = 'type-btn type-btn-income-active';
        catWrap.style.display = 'none';
        incomeCatWrap.style.display = '';
        if (!editId) {
            saveText.textContent = 'Lưu thu nhập';
            modalTitle.textContent = 'Thêm thu nhập';
        }
    }
}

// ── Navigation ──
function navigate(page, btn, isMobile = false) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    if (btn) { document.querySelectorAll('.nav-link-custom').forEach(n => n.classList.remove('active')); btn.classList.add('active'); }
    document.querySelectorAll('.mob-nav-btn').forEach(b => b.classList.remove('active'));
    const mob = document.getElementById('mob-' + page);
    if (mob) mob.classList.add('active');
    if (page === 'overview') { updateOverview(); renderSidebarCats('expense'); }
    if (page === 'expenses') { populateCatFilter(); renderExpenses(); renderSidebarCats('expense'); }
    if (page === 'income')   { populateIncomeCatFilter(); renderIncome(); renderSidebarCats('income'); }
    if (page === 'stats') { updateStats(); renderSidebarCats('expense'); }
}

// ── Modal ──
function openModal(id = null, type = 'expense') {
    editId = id;
    editType = type;
    currentEntryType = type;

    // Populate category selects
    const catSel = document.getElementById('form-cat');
    catSel.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
    const incomeCatSel = document.getElementById('form-income-cat');
    incomeCatSel.innerHTML = INCOME_CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');

    if (id) {
        const list = type === 'income' ? incomes : expenses;
        const e = list.find(x => x.id === id);
        document.getElementById('modal-title').textContent = type === 'income' ? 'Chỉnh sửa thu nhập' : 'Chỉnh sửa khoản chi';
        document.getElementById('save-btn-text').textContent = 'Cập nhật';
        document.getElementById('form-desc').value = e.desc;
        document.getElementById('form-amount').value = e.amount;
        document.getElementById('form-date').value = e.date;
        document.getElementById('form-note').value = e.note || '';
        if (type === 'income') {
            incomeCatSel.value = e.cat;
        } else {
            catSel.value = e.cat;
        }
    } else {
        document.getElementById('form-desc').value = '';
        document.getElementById('form-amount').value = '';
        document.getElementById('form-date').value = today();
        document.getElementById('form-note').value = '';
        catSel.value = 'food';
        incomeCatSel.value = 'salary';
    }

    // Disable type toggle when editing
    document.getElementById('type-expense').disabled = !!id;
    document.getElementById('type-income').disabled = !!id;

    setEntryType(type);
    document.getElementById('add-modal').classList.add('show');
    setTimeout(() => document.getElementById('form-desc').focus(), 100);
}

function closeModal() {
    document.getElementById('add-modal').classList.remove('show');
    editId = null;
    document.getElementById('type-expense').disabled = false;
    document.getElementById('type-income').disabled = false;
}
document.getElementById('add-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

function saveEntry() {
    const desc = document.getElementById('form-desc').value.trim();
    const amount = parseFloat(document.getElementById('form-amount').value);
    const date = document.getElementById('form-date').value;
    const note = document.getElementById('form-note').value.trim();
    const isIncome = currentEntryType === 'income';
    const cat = isIncome
        ? document.getElementById('form-income-cat').value
        : document.getElementById('form-cat').value;

    if (!desc || !amount || !date) { showToast('Vui lòng điền đầy đủ thông tin', 'warning'); return; }

    if (editId) {
        const list = editType === 'income' ? incomes : expenses;
        const idx = list.findIndex(x => x.id === editId);
        list[idx] = { ...list[idx], desc, amount, date, cat, note };
    } else {
        const entry = { id: Date.now().toString(), desc, amount, date, cat, note, createdAt: new Date().toISOString() };
        if (isIncome) {
            incomes.unshift(entry);
        } else {
            expenses.unshift(entry);
        }
    }
    const isEdit = !!editId;
    save();
    closeModal();
    refreshAll();
    if (isEdit) {
        showToast(editType === 'income' ? 'Đã cập nhật thu nhập' : 'Đã cập nhật khoản chi', 'success');
    } else {
        showToast(isIncome ? 'Đã thêm thu nhập mới' : 'Đã thêm khoản chi mới', 'success');
    }
}

// Keep old saveExpense alias for compatibility
function saveExpense() { saveEntry(); }

// ── Opening balance ──
function editOpeningBalance() {
    document.getElementById('confirm-modal')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'confirm-modal';
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = `
        <div class="confirm-box" style="text-align:left">
            <div class="confirm-icon confirm-icon-warning" style="margin:0 auto 18px">
                <i class="fa-solid fa-wallet"></i>
            </div>
            <div class="confirm-title" style="text-align:center">Số dư ban đầu</div>
            <div class="confirm-message" style="text-align:center">Nhập số tiền bạn đang có trước khi dùng ứng dụng</div>
            <div style="margin-bottom:20px">
                <label class="form-label">Số tiền (đ)</label>
                <input type="number" class="form-control-dark" id="opening-balance-input"
                    value="${openingBalance}" min="0" style="font-size:16px;font-weight:600">
            </div>
            <div class="confirm-actions">
                <button class="btn-ghost confirm-cancel" onclick="document.getElementById('confirm-modal').remove()">Huỷ</button>
                <button class="btn-confirm btn-confirm-warning" id="confirm-ok">Lưu</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    const input = document.getElementById('opening-balance-input');
    setTimeout(() => { input.focus(); input.select(); }, 50);
    document.getElementById('confirm-ok').addEventListener('click', () => {
        const val = parseFloat(input.value);
        if (isNaN(val) || val < 0) { showToast('Số tiền không hợp lệ', 'warning'); return; }
        openingBalance = val;
        save();
        overlay.remove();
        updateOverview();
        showToast('Đã cập nhật số dư ban đầu', 'success');
    });
}

function deleteExpense(id) {
    const e = expenses.find(x => x.id === id);
    if (!e) return;
    showConfirm({
        title: 'Xoá khoản chi?',
        message: `Bạn chắc chắn muốn xoá <strong>"${e.desc}"</strong> — <span style="color:#e03c3c;font-weight:600">${fmtMoney(e.amount)}</span>?`,
        confirmText: 'Xoá',
        confirmType: 'danger',
        onConfirm: () => {
            expenses = expenses.filter(x => x.id !== id);
            refreshAll();
            showToast('Đã xoá khoản chi', 'error');
        }
    });
}

function deleteIncome(id) {
    const e = incomes.find(x => x.id === id);
    if (!e) return;
    showConfirm({
        title: 'Xoá thu nhập?',
        message: `Bạn chắc chắn muốn xoá <strong>"${e.desc}"</strong> — <span style="color:var(--teal-400);font-weight:600">${fmtMoney(e.amount)}</span>?`,
        confirmText: 'Xoá',
        confirmType: 'danger',
        onConfirm: () => {
            incomes = incomes.filter(x => x.id !== id);
            refreshAll();
            showToast('Đã xoá thu nhập', 'error');
        }
    });
}

// ── Overview ──
function updateOverview() {
    const period = document.getElementById('overview-period')?.value || 'month';
    const labels = { month: 'Tháng này', lastmonth: 'Tháng trước', year: 'Năm nay', all: 'Tất cả' };
    document.getElementById('period-label').textContent = labels[period] || '';

    const data = getFilteredByPeriod(period, expenses);
    const incomeData = getFilteredByPeriod(period, incomes);

    const total = data.reduce((s, e) => s + e.amount, 0);
    const totalIncome = incomeData.reduce((s, e) => s + e.amount, 0);

    // Số dư thực tế = số dư ban đầu + tổng thu (toàn bộ) - tổng chi (toàn bộ)
    const allIncome  = incomes.reduce((s, e) => s + e.amount, 0);
    const allExpense = expenses.reduce((s, e) => s + e.amount, 0);
    const realBalance = openingBalance + allIncome - allExpense;

    const now = new Date();
    let days = period === 'month' ? now.getDate() : period === 'year' ? Math.ceil((now - new Date(now.getFullYear(), 0, 1)) / 86400000) : period === 'lastmonth' ? new Date(now.getFullYear(), now.getMonth(), 0).getDate() : data.length || 1;

    document.getElementById('stat-income').textContent = fmtMoney(totalIncome);
    document.getElementById('stat-income-count').textContent = incomeData.length + ' khoản';
    document.getElementById('stat-total').textContent = fmtMoney(total);
    document.getElementById('stat-count').textContent = data.length + ' khoản';

    const balEl = document.getElementById('stat-balance');
    balEl.textContent = fmtMoney(Math.abs(realBalance));
    balEl.style.color = realBalance >= 0 ? 'var(--teal-400)' : '#ff6b6b';

    document.getElementById('stat-avg').textContent = fmtMoney(Math.round(total / Math.max(days, 1)));

    renderDonutChart(data);
    renderBarChart();
    renderRecent(data);
}

function renderRecent(data) {
    const wrap = document.getElementById('recent-list');
    const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    if (!sorted.length) { wrap.innerHTML = '<div class="empty-state"><div class="ei" style="font-size:40px;opacity:0.25;margin-bottom:10px"><i class="fa-solid fa-coins"></i></div><p>Chưa có khoản chi nào trong kỳ này</p></div>'; return; }

    const table = `<table class="expense-table"><tbody>${sorted.map(e => {
        const c = getCat(e.cat); return `<tr>
    <td><span style="font-size:13px;color:var(--text-muted)">${formatDate(e.date)}</span></td>
    <td><span style="font-weight:500">${e.desc}</span>${e.note ? `<br><span style="font-size:12px;color:var(--text-muted)">${e.note}</span>` : ''}</td>
    <td><span class="cat-badge" style="background:${c.bg};color:${c.color}">${c.icon} ${c.name}</span></td>
    <td><span class="amount-neg">${fmtMoney(e.amount)}</span></td>
  </tr>`;
    }).join('')}</tbody></table>`;

    const cards = `<div class="expense-card">${sorted.map(e => {
        const c = getCat(e.cat); return `
    <div class="exp-card-item">
      <div class="exp-card-icon" style="background:${c.bg}">${c.icon}</div>
      <div class="exp-card-body">
        <div class="exp-card-desc">${e.desc}</div>
        <div class="exp-card-meta">
          <span class="exp-card-date"><i class="fa-regular fa-calendar" style="font-size:10px;margin-right:3px"></i>${formatDate(e.date)}</span>
          <span class="cat-badge" style="background:${c.bg};color:${c.color};padding:2px 8px;font-size:11px">${c.name}</span>
          ${e.note ? `<span class="exp-card-note">${e.note}</span>` : ''}
        </div>
      </div>
      <div class="exp-card-right">
        <span class="exp-card-amount">${fmtMoney(e.amount)}</span>
      </div>
    </div>`;
    }).join('')}</div>`;

    wrap.innerHTML = table + cards;
}

function renderDonutChart(data) {
    const catTotals = {};
    data.forEach(e => catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount);
    const cats = CATEGORIES.filter(c => catTotals[c.id]);
    const total = data.reduce((s, e) => s + e.amount, 0) || 1;
    const canvas = document.getElementById('donut-chart');
    if (!canvas) return;
    const legendEl = document.getElementById('donut-legend');

    const wrap = canvas.parentElement;
    let overlay = wrap.querySelector('.donut-empty-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'donut-empty-overlay';
        overlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px;pointer-events:none';
        overlay.textContent = 'Chưa có dữ liệu';
        wrap.appendChild(overlay);
    }

    if (!cats.length) {
        canvas.style.opacity = '0';
        overlay.style.display = 'flex';
        if (donutChart) { donutChart.destroy(); donutChart = null; }
        if (legendEl) legendEl.innerHTML = '';
        return;
    }

    canvas.style.opacity = '1';
    overlay.style.display = 'none';

    if (donutChart) {
        donutChart.data.labels = cats.map(c => c.name);
        donutChart.data.datasets[0].data = cats.map(c => catTotals[c.id]);
        donutChart.data.datasets[0].backgroundColor = cats.map(c => c.color);
        donutChart.update('active');
    } else {
        donutChart = new Chart(canvas, {
            type: 'doughnut',
            data: { labels: cats.map(c => c.name), datasets: [{ data: cats.map(c => catTotals[c.id]), backgroundColor: cats.map(c => c.color), borderWidth: 0, hoverOffset: 6 }] },
            options: { responsive: true, maintainAspectRatio: true, cutout: '68%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + fmtMoney(ctx.raw) + ' (' + Math.round(ctx.raw / total * 100) + '%)' } } } }
        });
    }
    if (legendEl) {
        legendEl.innerHTML = cats.map(c => `<div class="legend-item"><div class="legend-dot" style="background:${c.color}"></div><span>${c.icon} ${c.name}</span><span style="margin-left:auto;font-weight:500;color:var(--text-primary)">${fmtMoney(catTotals[c.id])}</span></div>`).join('');
    }
}

function renderBarChart() {
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toISOString().split('T')[0]); }
    const totals = days.map(d => expenses.filter(e => e.date === d).reduce((s, e) => s + e.amount, 0));
    const labels = days.map(d => { const dt = new Date(d); return (dt.getDate() + '/' + (dt.getMonth() + 1)); });
    const canvas = document.getElementById('bar-chart');
    if (!canvas) return;
    if (barChart) {
        barChart.data.datasets[0].data = totals;
        barChart.update('active');
    } else {
        barChart = new Chart(canvas, { type: 'bar', data: { labels, datasets: [{ data: totals, backgroundColor: 'rgba(0,196,180,0.35)', borderColor: 'rgba(0,196,180,0.8)', borderWidth: 1.5, borderRadius: 6, borderSkipped: false }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + fmtMoney(ctx.raw) } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4d7a76', font: { size: 11 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4d7a76', font: { size: 11 }, callback: v => v >= 1e6 ? (v / 1e6).toFixed(0) + 'tr' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : v } } } } });
    }
}

// ── Expenses ──
function populateCatFilter() {
    const sel = document.getElementById('filter-cat');
    sel.innerHTML = '<option value="all">Tất cả danh mục</option>' + CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}

document.getElementById('filter-type').addEventListener('change', function () {
    document.getElementById('custom-date-range').style.display = this.value === 'custom' ? 'flex' : 'none';
    renderExpenses();
});

function renderExpenses() {
    const ft = document.getElementById('filter-type').value;
    const fc = document.getElementById('filter-cat').value;
    const search = document.getElementById('search-input').value.toLowerCase();
    const df = document.getElementById('date-from').value;
    const dt = document.getElementById('date-to').value;
    let data = expenses.filter(e => {
        if (ft === 'today' && e.date !== today()) return false;
        if (ft === 'week') { const s = new Date(); s.setDate(s.getDate() - 6); if (new Date(e.date) < s) return false; }
        if (ft === 'month') { const n = new Date(); if (new Date(e.date).getMonth() !== n.getMonth() || new Date(e.date).getFullYear() !== n.getFullYear()) return false; }
        if (ft === 'lastmonth') { const n = new Date(); const lm = new Date(n.getFullYear(), n.getMonth() - 1, 1); if (new Date(e.date).getMonth() !== lm.getMonth() || new Date(e.date).getFullYear() !== lm.getFullYear()) return false; }
        if (ft === 'year' && new Date(e.date).getFullYear() !== new Date().getFullYear()) return false;
        if (ft === 'custom') { if (df && e.date < df) return false; if (dt && e.date > dt) return false; }
        if (fc !== 'all' && e.cat !== fc) return false;
        if (search && !e.desc.toLowerCase().includes(search) && !(e.note || '').toLowerCase().includes(search)) return false;
        return true;
    });
    data.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    const wrap = document.getElementById('expense-list');
    if (!data.length) { wrap.innerHTML = '<div class="empty-state"><div class="ei" style="font-size:40px;opacity:0.3;margin-bottom:10px"><i class="fa-solid fa-magnifying-glass"></i></div><p>Không tìm thấy khoản chi nào</p></div>'; return; }

    const table = `<table class="expense-table">
    <thead><tr><th>Ngày</th><th>Mô tả</th><th>Danh mục</th><th>Số tiền</th><th></th></tr></thead>
    <tbody>${data.map(e => {
        const c = getCat(e.cat); return `<tr>
      <td><span style="font-size:13px;color:var(--text-muted)">${formatDate(e.date)}</span></td>
      <td><span style="font-weight:500">${e.desc}</span>${e.note ? `<br><span style="font-size:12px;color:var(--text-muted)">${e.note}</span>` : ''}</td>
      <td><span class="cat-badge" style="background:${c.bg};color:${c.color}">${c.icon} ${c.name}</span></td>
      <td><span class="amount-neg">${fmtMoney(e.amount)}</span></td>
      <td><div style="display:flex;gap:6px;justify-content:flex-end">
        <button class="btn-icon" onclick="openModal('${e.id}','expense')" title="Sửa"><i class="fa-regular fa-pen-to-square"></i></button>
        <button class="btn-icon danger" onclick="deleteExpense('${e.id}')" title="Xoá"><i class="fa-regular fa-trash-can"></i></button>
      </div></td>
    </tr>`;
    }).join('')}</tbody>
  </table>`;

    const cards = `<div class="expense-card">${data.map(e => {
        const c = getCat(e.cat); return `
    <div class="exp-card-item">
      <div class="exp-card-icon" style="background:${c.bg}">${c.icon}</div>
      <div class="exp-card-body">
        <div class="exp-card-desc">${e.desc}</div>
        <div class="exp-card-meta">
          <span class="exp-card-date"><i class="fa-regular fa-calendar" style="font-size:10px;margin-right:3px"></i>${formatDate(e.date)}</span>
          <span class="cat-badge" style="background:${c.bg};color:${c.color};padding:2px 8px;font-size:11px">${c.name}</span>
          ${e.note ? `<span class="exp-card-note">${e.note}</span>` : ''}
        </div>
      </div>
      <div class="exp-card-right">
        <span class="exp-card-amount">${fmtMoney(e.amount)}</span>
        <div class="exp-card-actions">
          <button class="btn-icon" onclick="openModal('${e.id}','expense')" title="Sửa"><i class="fa-regular fa-pen-to-square"></i></button>
          <button class="btn-icon danger" onclick="deleteExpense('${e.id}')" title="Xoá"><i class="fa-regular fa-trash-can"></i></button>
        </div>
      </div>
    </div>`;
    }).join('')}</div>`;

    wrap.innerHTML = table + cards;
}

// ── Income ──
function populateIncomeCatFilter() {
    const sel = document.getElementById('income-filter-cat');
    sel.innerHTML = '<option value="all">Tất cả nguồn thu</option>' + INCOME_CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}

document.getElementById('income-filter-type').addEventListener('change', function () {
    document.getElementById('income-custom-date-range').style.display = this.value === 'custom' ? 'flex' : 'none';
    renderIncome();
});

function renderIncome() {
    const ft = document.getElementById('income-filter-type').value;
    const fc = document.getElementById('income-filter-cat').value;
    const search = (document.getElementById('income-search-input').value || '').toLowerCase();
    const df = document.getElementById('income-date-from').value;
    const dt = document.getElementById('income-date-to').value;

    let data = incomes.filter(e => {
        if (ft === 'today' && e.date !== today()) return false;
        if (ft === 'week') { const s = new Date(); s.setDate(s.getDate() - 6); if (new Date(e.date) < s) return false; }
        if (ft === 'month') { const n = new Date(); if (new Date(e.date).getMonth() !== n.getMonth() || new Date(e.date).getFullYear() !== n.getFullYear()) return false; }
        if (ft === 'lastmonth') { const n = new Date(); const lm = new Date(n.getFullYear(), n.getMonth() - 1, 1); if (new Date(e.date).getMonth() !== lm.getMonth() || new Date(e.date).getFullYear() !== lm.getFullYear()) return false; }
        if (ft === 'year' && new Date(e.date).getFullYear() !== new Date().getFullYear()) return false;
        if (ft === 'custom') { if (df && e.date < df) return false; if (dt && e.date > dt) return false; }
        if (fc !== 'all' && e.cat !== fc) return false;
        if (search && !e.desc.toLowerCase().includes(search) && !(e.note || '').toLowerCase().includes(search)) return false;
        return true;
    });
    data.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

    const wrap = document.getElementById('income-list');
    if (!data.length) { wrap.innerHTML = '<div class="empty-state"><div class="ei" style="font-size:40px;opacity:0.3;margin-bottom:10px"><i class="fa-solid fa-magnifying-glass"></i></div><p>Không tìm thấy khoản thu nào</p></div>'; return; }

    const table = `<table class="expense-table">
    <thead><tr><th>Ngày</th><th>Mô tả</th><th>Nguồn thu</th><th>Số tiền</th><th></th></tr></thead>
    <tbody>${data.map(e => {
        const c = getIncomeCat(e.cat); return `<tr>
      <td><span style="font-size:13px;color:var(--text-muted)">${formatDate(e.date)}</span></td>
      <td><span style="font-weight:500">${e.desc}</span>${e.note ? `<br><span style="font-size:12px;color:var(--text-muted)">${e.note}</span>` : ''}</td>
      <td><span class="cat-badge" style="background:${c.bg};color:${c.color}">${c.icon} ${c.name}</span></td>
      <td><span class="amount-pos">${fmtMoney(e.amount)}</span></td>
      <td><div style="display:flex;gap:6px;justify-content:flex-end">
        <button class="btn-icon" onclick="openModal('${e.id}','income')" title="Sửa"><i class="fa-regular fa-pen-to-square"></i></button>
        <button class="btn-icon danger" onclick="deleteIncome('${e.id}')" title="Xoá"><i class="fa-regular fa-trash-can"></i></button>
      </div></td>
    </tr>`;
    }).join('')}</tbody>
  </table>`;

    const cards = `<div class="expense-card">${data.map(e => {
        const c = getIncomeCat(e.cat); return `
    <div class="exp-card-item">
      <div class="exp-card-icon" style="background:${c.bg}">${c.icon}</div>
      <div class="exp-card-body">
        <div class="exp-card-desc">${e.desc}</div>
        <div class="exp-card-meta">
          <span class="exp-card-date"><i class="fa-regular fa-calendar" style="font-size:10px;margin-right:3px"></i>${formatDate(e.date)}</span>
          <span class="cat-badge" style="background:${c.bg};color:${c.color};padding:2px 8px;font-size:11px">${c.name}</span>
          ${e.note ? `<span class="exp-card-note">${e.note}</span>` : ''}
        </div>
      </div>
      <div class="exp-card-right">
        <span class="exp-card-amount income">${fmtMoney(e.amount)}</span>
        <div class="exp-card-actions">
          <button class="btn-icon" onclick="openModal('${e.id}','income')" title="Sửa"><i class="fa-regular fa-pen-to-square"></i></button>
          <button class="btn-icon danger" onclick="deleteIncome('${e.id}')" title="Xoá"><i class="fa-regular fa-trash-can"></i></button>
        </div>
      </div>
    </div>`;
    }).join('')}</div>`;

    wrap.innerHTML = table + cards;
}

function refreshAll() {
    save();
    renderSidebarCats(); // auto-detects active page
    updateOverview();
    renderExpenses();
    renderIncome();
    updateStats();
}

// ── Stats ──
function setStatPeriod(p, btn) {
    statPeriod = p;
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateStats();
}

function updateStats() {
    const data = getFilteredByPeriod(statPeriod, expenses);
    renderMonthlyChart();
    renderStatDonut(data);
    renderTopCats(data);
}

function renderMonthlyChart() {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ y: d.getFullYear(), m: d.getMonth(), label: (d.getMonth() + 1) + '/' + d.getFullYear().toString().slice(2) }); }
    const totals = months.map(({ y, m }) => expenses.filter(e => { const d = new Date(e.date); return d.getFullYear() === y && d.getMonth() === m; }).reduce((s, e) => s + e.amount, 0));
    const canvas = document.getElementById('monthly-chart');
    if (!canvas) return;
    if (monthlyChart) {
        monthlyChart.data.datasets[0].data = totals;
        monthlyChart.update('active');
    } else {
        monthlyChart = new Chart(canvas, { type: 'line', data: { labels: months.map(m => m.label), datasets: [{ data: totals, fill: true, backgroundColor: 'rgba(0,196,180,0.1)', borderColor: 'rgba(0,196,180,0.8)', borderWidth: 2, pointBackgroundColor: 'rgba(0,196,180,1)', pointRadius: 4, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + fmtMoney(ctx.raw) } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4d7a76', font: { size: 10 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4d7a76', font: { size: 10 }, callback: v => v >= 1e6 ? (v / 1e6).toFixed(0) + 'tr' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : v } } } } });
    }
}

function renderStatDonut(data) {
    const catTotals = {};
    data.forEach(e => catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount);
    const cats = CATEGORIES.filter(c => catTotals[c.id]);
    const total = data.reduce((s, e) => s + e.amount, 0);
    const legendEl = document.getElementById('stat-legend');
    const canvas = document.getElementById('stat-donut-chart');
    if (!canvas) return;

    const wrap = canvas.closest('.stats-donut-wrap');
    let overlay = wrap ? wrap.querySelector('.donut-empty-overlay') : null;
    if (!overlay && wrap) {
        overlay = document.createElement('div');
        overlay.className = 'donut-empty-overlay';
        overlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px;pointer-events:none';
        overlay.textContent = 'Không có dữ liệu';
        wrap.appendChild(overlay);
    }

    if (!cats.length) {
        canvas.style.opacity = '0';
        if (overlay) overlay.style.display = 'flex';
        if (statDonutChart) { statDonutChart.destroy(); statDonutChart = null; }
        if (legendEl) legendEl.innerHTML = '';
        return;
    }

    canvas.style.opacity = '1';
    if (overlay) overlay.style.display = 'none';

    if (statDonutChart) {
        statDonutChart.data.labels = cats.map(c => c.name);
        statDonutChart.data.datasets[0].data = cats.map(c => catTotals[c.id]);
        statDonutChart.data.datasets[0].backgroundColor = cats.map(c => c.color);
        statDonutChart.update('active');
    } else {
        statDonutChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: cats.map(c => c.name),
                datasets: [{ data: cats.map(c => catTotals[c.id]), backgroundColor: cats.map(c => c.color), borderWidth: 0, hoverOffset: 8 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => ' ' + fmtMoney(ctx.raw) + ' (' + Math.round(ctx.raw / total * 100) + '%)' } }
                }
            }
        });
    }
    if (legendEl) {
        legendEl.innerHTML = cats.map(c => `<div class="legend-item">
            <div class="legend-dot" style="background:${c.color}"></div>
            <span>${c.icon} ${c.name}</span>
            <span style="margin-left:auto;font-weight:600;color:var(--text-primary);font-family:'Space Grotesk',sans-serif">${Math.round(catTotals[c.id] / total * 100)}%</span>
        </div>`).join('');
    }
}

function renderTopCats(data) {
    const catTotals = {};
    data.forEach(e => catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount);
    const total = data.reduce((s, e) => s + e.amount, 0) || 1;
    const sorted = CATEGORIES.filter(c => catTotals[c.id]).sort((a, b) => catTotals[b.id] - catTotals[a.id]);
    document.getElementById('top-cats').innerHTML = sorted.length ? sorted.map(c => {
        const pct = Math.round(catTotals[c.id] / total * 100);
        return `<div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:13px;color:var(--text-secondary)">${c.icon} ${c.name}</span>
        <span style="font-size:13px;font-weight:500;color:${c.color}">${fmtMoney(catTotals[c.id])}</span>
      </div>
      <div style="height:6px;border-radius:3px;background:var(--dark-600);overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${c.color};border-radius:3px;transition:width 0.6s ease"></div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${pct}%</div>
    </div>`;
    }).join('') : '<div class="empty-state" style="padding:20px"><p>Không có dữ liệu</p></div>';
}

function renderSidebarCats(type) {
    // Detect current active page if type not provided
    if (!type) {
        const activePage = document.querySelector('.page.active');
        type = activePage && activePage.id === 'page-income' ? 'income' : 'expense';
    }

    if (type === 'income') {
        const catTotals = {};
        incomes.forEach(e => catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount);
        document.getElementById('sidebar-cats').innerHTML = INCOME_CATEGORIES.map(c => `<div class="nav-item">
    <button class="nav-link-custom" onclick="filterByIncomeCat('${c.id}')" style="justify-content:space-between">
      <span>${c.icon} ${c.name}</span>
      <span style="font-size:11px;color:var(--text-muted)">${catTotals[c.id] ? fmtMoney(catTotals[c.id]) : ''}</span>
    </button>
  </div>`).join('');
    } else {
        const catTotals = {};
        expenses.forEach(e => catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount);
        document.getElementById('sidebar-cats').innerHTML = CATEGORIES.map(c => `<div class="nav-item">
    <button class="nav-link-custom" onclick="filterByCat('${c.id}')" style="justify-content:space-between">
      <span>${c.icon} ${c.name}</span>
      <span style="font-size:11px;color:var(--text-muted)">${catTotals[c.id] ? fmtMoney(catTotals[c.id]) : ''}</span>
    </button>
  </div>`).join('');
    }
}

function filterByCat(catId) {
    navigate('expenses', null);
    document.getElementById('filter-cat').value = catId;
    populateCatFilter();
    document.getElementById('filter-cat').value = catId;
    renderExpenses();
}

function filterByIncomeCat(catId) {
    navigate('income', null);
    document.getElementById('income-filter-cat').value = catId;
    populateIncomeCatFilter();
    document.getElementById('income-filter-cat').value = catId;
    renderIncome();
}

function formatDate(d) {
    const dt = new Date(d + 'T00:00:00');
    return dt.getDate() + '/' + (dt.getMonth() + 1) + '/' + dt.getFullYear();
}

// ── Toast ──
const TOAST_ICONS = {
    success: { icon: 'fa-circle-check',         color: '#00c4b4', bg: 'rgba(0,196,180,0.15)',  glow: 'rgba(0,196,180,0.25)' },
    error:   { icon: 'fa-circle-xmark',         color: '#ff6b6b', bg: 'rgba(255,107,107,0.15)', glow: 'rgba(255,107,107,0.25)' },
    warning: { icon: 'fa-triangle-exclamation', color: '#f0a500', bg: 'rgba(240,165,0,0.15)',  glow: 'rgba(240,165,0,0.2)'  },
    info:    { icon: 'fa-circle-info',          color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', glow: 'rgba(96,165,250,0.2)' },
};

// Inject keyframes once
if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = `
        @keyframes toastIn {
            0%   { opacity:0; transform:translateX(110%) scale(0.88); }
            60%  { opacity:1; transform:translateX(-6px) scale(1.02); }
            100% { opacity:1; transform:translateX(0)    scale(1);    }
        }
        @keyframes toastOut {
            0%   { opacity:1; transform:translateX(0)    scale(1);   max-height:80px; margin-bottom:10px; }
            100% { opacity:0; transform:translateX(110%) scale(0.88); max-height:0;   margin-bottom:0;    }
        }
        @keyframes toastBar {
            from { transform: scaleX(1); }
            to   { transform: scaleX(0); }
        }
    `;
    document.head.appendChild(s);
}

function getToastContainer() {
    let c = document.getElementById('__toast_stack__');
    if (!c) {
        c = document.createElement('div');
        c.id = '__toast_stack__';
        c.style.cssText = `
            position:fixed; bottom:28px; right:24px; z-index:999999;
            display:flex; flex-direction:column-reverse; gap:10px;
            pointer-events:none; max-width:340px; width:calc(100vw - 48px);
        `;
        document.body.appendChild(c);
    }
    return c;
}

const TOAST_DURATION = 3200;

function showToast(msg, type = 'success') {
    const cfg = TOAST_ICONS[type] || TOAST_ICONS.success;
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const bgCard  = isDark ? '#1a2b28' : '#ffffff';
    const textCol = isDark ? '#e8f5f4' : '#0d2e2b';
    const subCol  = isDark ? '#8ab8b4' : '#2a706a';
    const borderC = isDark ? 'rgba(0,196,180,0.2)' : 'rgba(0,160,148,0.2)';

    const t = document.createElement('div');
    t.style.cssText = `
        pointer-events:all;
        position:relative; overflow:hidden;
        display:flex; align-items:center; gap:12px;
        padding:14px 16px 18px;
        border-radius:14px;
        font-family:'Be Vietnam Pro',sans-serif;
        background:${bgCard};
        border:1px solid ${borderC};
        box-shadow:0 8px 28px rgba(0,0,0,0.3), 0 0 0 1px ${cfg.glow};
        animation:toastIn 0.45s cubic-bezier(0.22,1,0.36,1) both;
        cursor:pointer;
    `;

    t.innerHTML = `
        <div style="
            width:38px; height:38px; border-radius:10px; flex-shrink:0;
            background:${cfg.bg}; display:flex; align-items:center; justify-content:center;
        ">
            <i class="fa-solid ${cfg.icon}" style="color:${cfg.color};font-size:18px"></i>
        </div>
        <div style="flex:1; min-width:0;">
            <div style="font-size:14px;font-weight:600;color:${textCol};line-height:1.3">${msg}</div>
        </div>
        <div style="
            position:absolute; bottom:0; left:0; right:0; height:3px;
            background:${cfg.color}; opacity:0.7; transform-origin:left;
            animation:toastBar ${TOAST_DURATION}ms linear both;
            border-radius:0 0 14px 14px;
        "></div>
    `;

    t.addEventListener('click', () => dismissToast(t));

    const container = getToastContainer();
    container.appendChild(t);

    const timer = setTimeout(() => dismissToast(t), TOAST_DURATION);
    t.dataset.timer = timer;
}

function dismissToast(t) {
    if (!t || t.dataset.dismissed) return;
    t.dataset.dismissed = '1';
    clearTimeout(Number(t.dataset.timer));
    t.style.animation = 'toastOut 0.4s cubic-bezier(0.4,0,1,1) both';
    setTimeout(() => t.remove(), 400);
}

// ── Confirm modal ──
function showConfirm({ title, message, confirmText = 'Xác nhận', confirmType = 'danger', onConfirm }) {
    document.getElementById('confirm-modal')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'confirm-modal';
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = `
        <div class="confirm-box">
            <div class="confirm-icon confirm-icon-${confirmType}">
                <i class="fa-solid ${confirmType === 'danger' ? 'fa-trash-can' : 'fa-circle-question'}"></i>
            </div>
            <div class="confirm-title">${title}</div>
            <div class="confirm-message">${message}</div>
            <div class="confirm-actions">
                <button class="btn-ghost confirm-cancel" onclick="document.getElementById('confirm-modal').remove()">Huỷ</button>
                <button class="btn-confirm btn-confirm-${confirmType}" id="confirm-ok">${confirmText}</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.getElementById('confirm-ok').addEventListener('click', () => {
        overlay.remove();
        onConfirm();
    });
    setTimeout(() => overlay.querySelector('.confirm-cancel')?.focus(), 50);
}

function exportData() {
    const headers = 'Loại,Ngày,Mô tả,Số tiền,Danh mục,Ghi chú';
    const expRows = expenses.map(e => `Chi,${e.date},"${e.desc}",${e.amount},${getCat(e.cat).name},"${e.note || ''}"`);
    const incRows = incomes.map(e => `Thu,${e.date},"${e.desc}",${e.amount},${getIncomeCat(e.cat).name},"${e.note || ''}"`);
    const csv = [headers, ...expRows, ...incRows].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
    a.download = 'tf-wallet-' + (new Date().toISOString().split('T')[0]) + '.csv';
    a.click();
    showToast('Đã xuất file CSV', 'info');
}

// ── Theme toggle ──
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
    const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,100,90,0.07)';
    const tickColor = theme === 'dark' ? '#4d7a76' : '#5a9e98';
    [monthlyChart, barChart].forEach(chart => {
        if (!chart) return;
        ['x', 'y'].forEach(axis => {
            if (chart.options.scales?.[axis]) {
                chart.options.scales[axis].grid.color = gridColor;
                chart.options.scales[axis].ticks.color = tickColor;
            }
        });
        chart.update('none');
    });
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ── Clock ──
const DAYS_VI = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

function updateClock() {
    const el = document.getElementById('topbar-clock');
    if (!el) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const day = DAYS_VI[now.getDay()];
    const date = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
    el.innerHTML = `<span class="clock-time">${h}:${m}:${s}</span><span class="clock-date">${day}, ${date}</span>`;
}
updateClock();
setInterval(updateClock, 1000);

// ── Init ──
renderSidebarCats('expense');
updateOverview();
populateCatFilter();
populateIncomeCatFilter();
// Khôi phục theme đã lưu (mặc định dark)
applyTheme(localStorage.getItem('theme') || 'dark');
if (window.lucide) lucide.createIcons();