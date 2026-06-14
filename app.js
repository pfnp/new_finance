// Финансы PWA - app.js
(function () {
    'use strict';

    // ========== УТИЛИТЫ ==========
    const $ = (sel, ctx) => (ctx || document).querySelector(sel);
    const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

    const formatMoney = (amount) => {
        const num = Math.round(amount);
        const sign = num < 0 ? '− ' : '';
        const abs = Math.abs(num);
        const parts = abs.toString().split(/(?=(?:\d{3})+(?:\.|$))/g);
        return sign + parts.join(' ') + ' ₽';
    };

    const getPage = () => {
        const path = window.location.pathname;
        if (path.includes('analytics')) return 'analytics';
        if (path.includes('payments')) return 'payments';
        return 'home';
    };

    // ========== ХРАНИЛИЩЕ ==========
    const STORAGE_KEYS = {
        wallets: 'finapp_wallets',
        operations: 'finapp_operations',
        categories: 'finapp_categories',
        payments: 'finapp_payments',
        theme: 'finapp_theme',
        nextId: 'finapp_nextId'
    };

    function load(key) {
        try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
    }
    function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

    function getNextId() {
        let id = load(STORAGE_KEYS.nextId) || 0;
        id++;
        save(STORAGE_KEYS.nextId, id);
        return id;
    }

    // Дефолтные категории
    const defaultIncomeCategories = ['Зарплата', 'Фриланс', 'Подарки', 'Другое'];
    const defaultExpenseCategories = ['Продукты', 'Транспорт', 'Кафе', 'Развлечения', 'Здоровье', 'Одежда', 'Дом', 'Другое'];

    function initCategories() {
        let cats = load(STORAGE_KEYS.categories);
        if (!cats) {
            cats = { income: [...defaultIncomeCategories], expense: [...defaultExpenseCategories] };
            save(STORAGE_KEYS.categories, cats);
        }
        return cats;
    }

    function getCategories() {
        return load(STORAGE_KEYS.categories) || initCategories();
    }

    function saveCategories(cats) {
        save(STORAGE_KEYS.categories, cats);
    }

    // Кошельки
    function getWallets() {
        return load(STORAGE_KEYS.wallets) || [];
    }
    function saveWallets(wallets) {
        save(STORAGE_KEYS.wallets, wallets);
    }

    // Операции
    function getOperations(walletId) {
        const all = load(STORAGE_KEYS.operations) || {};
        return all[walletId] || [];
    }
    function saveOperations(walletId, ops) {
        const all = load(STORAGE_KEYS.operations) || {};
        all[walletId] = ops;
        save(STORAGE_KEYS.operations, all);
    }

    function addOperation(walletId, op) {
        const ops = getOperations(walletId);
        op.id = getNextId();
        op.createdAt = new Date().toISOString();
        ops.push(op);
        saveOperations(walletId, ops);
        return op;
    }

    function updateOperation(walletId, opId, data) {
        const ops = getOperations(walletId);
        const idx = ops.findIndex(o => o.id === opId);
        if (idx !== -1) {
            ops[idx] = { ...ops[idx], ...data };
            saveOperations(walletId, ops);
        }
    }

    function deleteOperation(walletId, opId) {
        let ops = getOperations(walletId);
        ops = ops.filter(o => o.id !== opId);
        saveOperations(walletId, ops);
    }

    // Платежи
    function getPayments() {
        return load(STORAGE_KEYS.payments) || [];
    }
    function savePayments(payments) {
        save(STORAGE_KEYS.payments, payments);
    }

    // ========== ЗВУКИ ==========
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioCtx;

    function initAudio() {
        if (!audioCtx) audioCtx = new AudioContext();
    }

    function playSound(type) {
        try {
            initAudio();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            gain.gain.value = 0.05;
            const now = audioCtx.currentTime;
            switch (type) {
                case 'add':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, now);
                    osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                    osc.start(now); osc.stop(now + 0.12);
                    break;
                case 'delete':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    osc.start(now); osc.stop(now + 0.2);
                    break;
                case 'create':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(500, now);
                    osc.frequency.exponentialRampToValueAtTime(700, now + 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    osc.start(now); osc.stop(now + 0.15);
                    break;
                case 'tab':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                    osc.start(now); osc.stop(now + 0.05);
                    break;
            }
        } catch (e) { }
    }

    // ========== ТЕМА ==========
    function applyTheme(dark) {
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        const toggleBtn = $('#themeToggle');
        if (toggleBtn) toggleBtn.textContent = dark ? '☀️' : '🌙';
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') === 'dark';
        const newDark = !current;
        save(STORAGE_KEYS.theme, newDark ? 'dark' : 'light');
        applyTheme(newDark);
    }

    function initTheme() {
        const saved = load(STORAGE_KEYS.theme);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const dark = saved ? saved === 'dark' : prefersDark;
        applyTheme(dark);
    }

    // ========== МОДАЛЬНЫЕ ОКНА ==========
    function createModal(content, onClose) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        modal.innerHTML = content;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const close = () => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 250);
            if (onClose) onClose();
        };

        modal.querySelector('.modal-close')?.addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        // Свайп вниз для закрытия на мобильных
        let startY = 0;
        modal.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        }, { passive: true });
        modal.addEventListener('touchmove', (e) => {
            const delta = e.touches[0].clientY - startY;
            if (delta > 80 && modal.scrollTop <= 0) {
                close();
            }
        });

        return { overlay, close };
    }

    // ========== ГЛАВНАЯ СТРАНИЦА ==========
    function renderHome() {
        const wallets = getWallets();
        const container = $('#walletsContainer');
        if (!container) return;
        container.innerHTML = '';

        if (wallets.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">💳</div><div>Нет кошельков</div><div class="empty-hint">Нажмите +, чтобы добавить</div></div>`;
        } else {
            wallets.forEach(w => {
                const card = document.createElement('div');
                card.className = `wallet-card ${w.type}`;
                if (w.type === 'debt' && w.balance < 0) card.classList.add('negative');
                card.innerHTML = `
          <div class="wallet-header">
            <span class="wallet-icon">${w.icon || typeIcon(w.type)}</span>
            <span class="wallet-name">${w.name}</span>
          </div>
          <div class="wallet-balance">${formatMoney(w.balance)}</div>
          ${w.type === 'invest' ? `<div class="wallet-detail">Доход/мес: ${formatMoney(w.monthlyIncome || 0)}</div>` : ''}
        `;
                card.addEventListener('click', () => openWallet(w));
                container.appendChild(card);
            });
        }
        updateTotalBalance();
    }

    function typeIcon(type) {
        const icons = { invest: '📈', cash: '💵', card: '💳', debt: '📋' };
        return icons[type] || '💰';
    }

    function updateTotalBalance() {
        const wallets = getWallets();
        const total = wallets.reduce((sum, w) => sum + w.balance, 0);
        const totalEl = $('#totalBalanceAmount');
        if (totalEl) totalEl.textContent = formatMoney(total);

        // Сводка доходов/расходов за месяц
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        let monthIncome = 0, monthExpense = 0;
        const allOps = load(STORAGE_KEYS.operations) || {};
        Object.values(allOps).forEach(ops => {
            ops.forEach(op => {
                const opDate = new Date(op.createdAt);
                if (opDate >= monthStart) {
                    if (op.type === 'income') monthIncome += op.amount;
                    else monthExpense += op.amount;
                }
            });
        });
        const summaryEl = $('#monthSummary');
        if (summaryEl) {
            summaryEl.innerHTML = `<span style="color:var(--accent-green)">+${formatMoney(monthIncome)}</span> <span style="color:var(--accent-red)">−${formatMoney(monthExpense)}</span>`;
        }
    }

    // Открытие кошелька
    function openWallet(wallet) {
        const ops = getOperations(wallet.id);
        const grouped = groupOperationsByDate(ops);
        let historyHtml = '';
        if (Object.keys(grouped).length === 0) {
            historyHtml = '<div class="empty-state"><div>Нет операций</div></div>';
        } else {
            for (const [label, items] of Object.entries(grouped)) {
                historyHtml += `<div class="operation-date-header">${label}</div>`;
                items.forEach(op => {
                    const sign = op.type === 'income' ? '+' : '−';
                    const cls = op.type;
                    historyHtml += `
            <div class="operation-item" data-opid="${op.id}">
              <span class="operation-icon">${op.categoryIcon || (op.type === 'income' ? '💰' : '💸')}</span>
              <div class="operation-details">
                <div class="operation-comment">${op.comment || op.category}</div>
                <div class="operation-meta">
                  <span>${op.category}</span>
                  <span>${formatTime(op.createdAt)}</span>
                </div>
              </div>
              <div class="operation-amount ${cls}">${sign}${formatMoney(op.amount)}</div>
            </div>`;
                });
            }
        }

        const content = `
      <div class="modal-header">
        <h2 class="modal-title">${wallet.icon || typeIcon(wallet.type)} ${wallet.name}</h2>
        <button class="modal-close">✕</button>
      </div>
      <div style="text-align:center; margin-bottom:20px;">
        <div style="font-size:28px; font-weight:700;">${formatMoney(wallet.balance)}</div>
        <div style="color:var(--text-secondary); font-size:13px;">Баланс</div>
      </div>
      <button class="btn-primary" id="addOpBtn" style="margin-bottom:16px;">+ Добавить операцию</button>
      <div id="walletHistory">${historyHtml}</div>
    `;

        const { overlay, close } = createModal(content, () => {
            renderHome();
        });

        // Обработчики операций
        overlay.querySelector('#addOpBtn')?.addEventListener('click', () => {
            openAddOperationModal(wallet, () => {
                // Обновим историю
                const newOps = getOperations(wallet.id);
                const newGrouped = groupOperationsByDate(newOps);
                const historyDiv = overlay.querySelector('#walletHistory');
                if (historyDiv) {
                    historyDiv.innerHTML = '';
                    if (Object.keys(newGrouped).length === 0) {
                        historyDiv.innerHTML = '<div class="empty-state"><div>Нет операций</div></div>';
                    } else {
                        for (const [label, items] of Object.entries(newGrouped)) {
                            const dateHeader = document.createElement('div');
                            dateHeader.className = 'operation-date-header';
                            dateHeader.textContent = label;
                            historyDiv.appendChild(dateHeader);
                            items.forEach(op => {
                                const sign = op.type === 'income' ? '+' : '−';
                                const cls = op.type;
                                const item = document.createElement('div');
                                item.className = 'operation-item';
                                item.dataset.opid = op.id;
                                item.innerHTML = `
                  <span class="operation-icon">${op.categoryIcon || (op.type === 'income' ? '💰' : '💸')}</span>
                  <div class="operation-details">
                    <div class="operation-comment">${op.comment || op.category}</div>
                    <div class="operation-meta">
                      <span>${op.category}</span>
                      <span>${formatTime(op.createdAt)}</span>
                    </div>
                  </div>
                  <div class="operation-amount ${cls}">${sign}${formatMoney(op.amount)}</div>`;
                                item.addEventListener('click', () => openEditOperationModal(wallet, op, () => {
                                    // Обновить историю снова
                                }));
                                historyDiv.appendChild(item);
                            });
                        }
                    }
                }
                updateTotalBalance();
                // Обновим баланс кошелька в шапке модалки
                const updatedWallet = getWallets().find(w => w.id === wallet.id);
                if (updatedWallet) {
                    overlay.querySelector('.modal-title').textContent = `${updatedWallet.icon || typeIcon(updatedWallet.type)} ${updatedWallet.name}`;
                    overlay.querySelector('.modal-title + div > div').textContent = formatMoney(updatedWallet.balance);
                }
            });
        });

        // Клик по операции - редактирование
        overlay.querySelectorAll('.operation-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const opId = parseInt(item.dataset.opid);
                const op = getOperations(wallet.id).find(o => o.id === opId);
                if (op) {
                    openEditOperationModal(wallet, op, () => {
                        // Обновить историю
                        const updatedOps = getOperations(wallet.id);
                        const newGrouped = groupOperationsByDate(updatedOps);
                        const historyDiv = overlay.querySelector('#walletHistory');
                        if (historyDiv) {
                            historyDiv.innerHTML = '';
                            if (Object.keys(newGrouped).length === 0) {
                                historyDiv.innerHTML = '<div class="empty-state"><div>Нет операций</div></div>';
                            } else {
                                for (const [label, items] of Object.entries(newGrouped)) {
                                    const dateHeader = document.createElement('div');
                                    dateHeader.className = 'operation-date-header';
                                    dateHeader.textContent = label;
                                    historyDiv.appendChild(dateHeader);
                                    items.forEach(op => {
                                        const sign = op.type === 'income' ? '+' : '−';
                                        const cls = op.type;
                                        const item = document.createElement('div');
                                        item.className = 'operation-item';
                                        item.dataset.opid = op.id;
                                        item.innerHTML = `
                      <span class="operation-icon">${op.categoryIcon || (op.type === 'income' ? '💰' : '💸')}</span>
                      <div class="operation-details">
                        <div class="operation-comment">${op.comment || op.category}</div>
                        <div class="operation-meta">
                          <span>${op.category}</span>
                          <span>${formatTime(op.createdAt)}</span>
                        </div>
                      </div>
                      <div class="operation-amount ${cls}">${sign}${formatMoney(op.amount)}</div>`;
                                        item.addEventListener('click', (e) => {
                                            e.stopPropagation();
                                            openEditOperationModal(wallet, op, () => {
                                                // рекурсивное обновление (можно просто закрыть)
                                            });
                                        });
                                        historyDiv.appendChild(item);
                                    });
                                }
                            }
                        }
                        updateTotalBalance();
                        const updatedWallet = getWallets().find(w => w.id === wallet.id);
                        if (updatedWallet) {
                            overlay.querySelector('.modal-title').textContent = `${updatedWallet.icon || typeIcon(updatedWallet.type)} ${updatedWallet.name}`;
                            overlay.querySelector('.modal-title + div > div').textContent = formatMoney(updatedWallet.balance);
                        }
                    });
                }
            });
        });
    }

    function groupOperationsByDate(ops) {
        const sorted = [...ops].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const groups = {};
        sorted.forEach(op => {
            const date = new Date(op.createdAt);
            date.setHours(0, 0, 0, 0);
            let label;
            if (date.getTime() === today.getTime()) label = 'Сегодня';
            else if (date.getTime() === yesterday.getTime()) label = 'Вчера';
            else label = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
            if (!groups[label]) groups[label] = [];
            groups[label].push(op);
        });
        return groups;
    }

    function formatTime(isoString) {
        const d = new Date(isoString);
        return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    // Добавление кошелька
    function openAddWalletModal() {
        const content = `
      <div class="modal-header">
        <h2 class="modal-title">Новый кошелёк</h2>
        <button class="modal-close">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">Тип</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="type-btn wallet-type" data-type="invest">📈 Инвестиции</button>
          <button class="type-btn wallet-type" data-type="cash">💵 Наличные</button>
          <button class="type-btn wallet-type" data-type="card">💳 Карта</button>
          <button class="type-btn wallet-type" data-type="debt">📋 Долг</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Название</label>
        <input class="form-input" id="walletName" placeholder="Название кошелька">
      </div>
      <div class="form-group">
        <label class="form-label">Сумма</label>
        <input class="form-input" id="walletAmount" type="number" placeholder="0" inputmode="decimal">
      </div>
      <div class="form-group" id="investIncomeGroup" style="display:none;">
        <label class="form-label">Доход/мес</label>
        <input class="form-input" id="walletIncome" type="number" placeholder="0" inputmode="decimal">
      </div>
      <button class="btn-primary" id="saveWalletBtn">Создать</button>
    `;

        const { overlay, close } = createModal(content);

        let selectedType = 'cash';
        const typeBtns = overlay.querySelectorAll('.wallet-type');
        typeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                typeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedType = btn.dataset.type;
                overlay.querySelector('#investIncomeGroup').style.display = selectedType === 'invest' ? 'block' : 'none';
            });
        });

        overlay.querySelector('#saveWalletBtn').addEventListener('click', () => {
            const name = overlay.querySelector('#walletName').value.trim();
            const amount = parseFloat(overlay.querySelector('#walletAmount').value) || 0;
            const income = selectedType === 'invest' ? (parseFloat(overlay.querySelector('#walletIncome').value) || 0) : 0;
            if (!name) return;

            const wallet = {
                id: getNextId(),
                type: selectedType,
                name: name,
                balance: selectedType === 'debt' ? amount : amount, // долг может быть отрицательным
                icon: typeIcon(selectedType),
                monthlyIncome: income
            };
            const wallets = getWallets();
            wallets.push(wallet);
            saveWallets(wallets);
            playSound('create');
            close();
            renderHome();
        });

        // Активируем первый тип по умолчанию
        typeBtns[0].click();
    }

    // Добавление операции
    function openAddOperationModal(wallet, onSave) {
        const categories = getCategories();
        let opType = 'expense';
        let selectedCat = null;

        function renderCats() {
            const grid = overlay.querySelector('.categories-grid');
            const list = opType === 'income' ? categories.income : categories.expense;
            grid.innerHTML = '';
            list.forEach(cat => {
                const chip = document.createElement('span');
                chip.className = 'category-chip' + (selectedCat === cat ? ' selected' : '');
                chip.textContent = cat;
                chip.addEventListener('click', () => {
                    selectedCat = cat;
                    renderCats();
                });
                const delBtn = document.createElement('button');
                delBtn.className = 'category-delete';
                delBtn.textContent = '✕';
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`Удалить категорию "${cat}"?`)) {
                        const idx = list.indexOf(cat);
                        if (idx > -1) {
                            list.splice(idx, 1);
                            saveCategories(categories);
                            if (selectedCat === cat) selectedCat = null;
                            renderCats();
                        }
                    }
                });
                chip.appendChild(delBtn);
                grid.appendChild(chip);
            });
            const addBtn = document.createElement('button');
            addBtn.className = 'add-category-btn';
            addBtn.textContent = '+';
            addBtn.addEventListener('click', () => {
                const newCat = prompt('Название категории:');
                if (newCat && newCat.trim()) {
                    list.push(newCat.trim());
                    saveCategories(categories);
                    renderCats();
                }
            });
            grid.appendChild(addBtn);
        }

        const content = `
      <div class="modal-header">
        <h2 class="modal-title">Новая операция</h2>
        <button class="modal-close">✕</button>
      </div>
      <div class="type-toggle">
        <button class="type-btn income" id="typeIncome">Доход</button>
        <button class="type-btn expense active" id="typeExpense">Расход</button>
      </div>
      <div class="form-group">
        <label class="form-label">Сумма</label>
        <input class="form-input" id="opAmount" type="number" placeholder="0" inputmode="decimal">
      </div>
      <div class="form-group">
        <label class="form-label">Комментарий</label>
        <input class="form-input" id="opComment" placeholder="Описание">
      </div>
      <div class="form-group">
        <label class="form-label">Категория</label>
        <div class="categories-grid"></div>
      </div>
      <button class="btn-primary" id="saveOpBtn">Добавить</button>
    `;

        const { overlay, close } = createModal(content, onSave);
        renderCats();

        const typeIncomeBtn = overlay.querySelector('#typeIncome');
        const typeExpenseBtn = overlay.querySelector('#typeExpense');
        typeIncomeBtn.addEventListener('click', () => {
            opType = 'income';
            typeIncomeBtn.classList.add('active');
            typeExpenseBtn.classList.remove('active');
            selectedCat = null;
            renderCats();
        });
        typeExpenseBtn.addEventListener('click', () => {
            opType = 'expense';
            typeExpenseBtn.classList.add('active');
            typeIncomeBtn.classList.remove('active');
            selectedCat = null;
            renderCats();
        });

        overlay.querySelector('#saveOpBtn').addEventListener('click', () => {
            const amount = parseFloat(overlay.querySelector('#opAmount').value) || 0;
            const comment = overlay.querySelector('#opComment').value.trim();
            if (!amount || !selectedCat) return;

            const op = {
                type: opType,
                amount: amount,
                category: selectedCat,
                comment: comment || selectedCat,
                categoryIcon: opType === 'income' ? '💰' : '💸'
            };
            addOperation(wallet.id, op);
            // Обновить баланс кошелька
            const wallets = getWallets();
            const w = wallets.find(w => w.id === wallet.id);
            if (w) {
                const delta = opType === 'income' ? amount : -amount;
                w.balance += delta;
                saveWallets(wallets);
            }
            playSound('add');
            close();
            if (onSave) onSave();
        });
    }

    // Редактирование операции
    function openEditOperationModal(wallet, op, onUpdate) {
        const categories = getCategories();
        let editType = op.type;
        let selectedCat = op.category;
        const content = `
      <div class="modal-header">
        <h2 class="modal-title">Редактирование</h2>
        <button class="modal-close">✕</button>
      </div>
      <div class="type-toggle">
        <button class="type-btn income ${editType === 'income' ? 'active' : ''}" id="editIncome">Доход</button>
        <button class="type-btn expense ${editType === 'expense' ? 'active' : ''}" id="editExpense">Расход</button>
      </div>
      <div class="form-group">
        <label class="form-label">Сумма</label>
        <input class="form-input" id="editAmount" type="number" value="${op.amount}" inputmode="decimal">
      </div>
      <div class="form-group">
        <label class="form-label">Комментарий</label>
        <input class="form-input" id="editComment" value="${op.comment || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Категория</label>
        <div class="categories-grid" id="editCats"></div>
      </div>
      <button class="btn-primary" id="saveEditBtn">Сохранить</button>
      <button class="btn-primary btn-danger" id="deleteOpBtn" style="margin-top:8px;">Удалить операцию</button>
    `;

        const { overlay, close } = createModal(content, onUpdate);

        function renderEditCats() {
            const grid = overlay.querySelector('#editCats');
            const list = editType === 'income' ? categories.income : categories.expense;
            grid.innerHTML = '';
            list.forEach(cat => {
                const chip = document.createElement('span');
                chip.className = 'category-chip' + (selectedCat === cat ? ' selected' : '');
                chip.textContent = cat;
                chip.addEventListener('click', () => {
                    selectedCat = cat;
                    renderEditCats();
                });
                grid.appendChild(chip);
            });
        }
        renderEditCats();

        overlay.querySelector('#editIncome').addEventListener('click', () => {
            editType = 'income';
            overlay.querySelector('#editIncome').classList.add('active');
            overlay.querySelector('#editExpense').classList.remove('active');
            selectedCat = null;
            renderEditCats();
        });
        overlay.querySelector('#editExpense').addEventListener('click', () => {
            editType = 'expense';
            overlay.querySelector('#editExpense').classList.add('active');
            overlay.querySelector('#editIncome').classList.remove('active');
            selectedCat = null;
            renderEditCats();
        });

        overlay.querySelector('#saveEditBtn').addEventListener('click', () => {
            const newAmount = parseFloat(overlay.querySelector('#editAmount').value) || 0;
            const newComment = overlay.querySelector('#editComment').value.trim();
            if (!newAmount || !selectedCat) return;

            const oldDelta = op.type === 'income' ? -op.amount : op.amount; // откат старого
            const newDelta = editType === 'income' ? newAmount : -newAmount;
            const wallets = getWallets();
            const w = wallets.find(w => w.id === wallet.id);
            if (w) {
                w.balance += oldDelta + newDelta;
                saveWallets(wallets);
            }
            updateOperation(wallet.id, op.id, {
                type: editType,
                amount: newAmount,
                category: selectedCat,
                comment: newComment || selectedCat
            });
            playSound('add');
            close();
            if (onUpdate) onUpdate();
        });

        overlay.querySelector('#deleteOpBtn').addEventListener('click', () => {
            if (confirm('Удалить операцию?')) {
                const oldDelta = op.type === 'income' ? -op.amount : op.amount;
                const wallets = getWallets();
                const w = wallets.find(w => w.id === wallet.id);
                if (w) {
                    w.balance += oldDelta;
                    saveWallets(wallets);
                }
                deleteOperation(wallet.id, op.id);
                playSound('delete');
                close();
                if (onUpdate) onUpdate();
            }
        });
    }

    // ========== АНАЛИТИКА ==========
    function renderAnalytics() {
        const toggleContainer = $('#analyticsToggle');
        if (!toggleContainer) return;
        const chartCanvas = $('#chartCanvas');
        const categoryList = $('#categoryList');

        let mode = 'expense'; // 'expense' или 'income'

        function update() {
            // Собрать операции со всех кошельков
            const allOps = load(STORAGE_KEYS.operations) || {};
            const all = [];
            Object.values(allOps).forEach(ops => all.push(...ops));
            const filtered = all.filter(op => op.type === mode);
            const agg = {};
            filtered.forEach(op => {
                agg[op.category] = (agg[op.category] || 0) + op.amount;
            });
            const entries = Object.entries(agg).sort((a, b) => b[1] - a[1]);
            const total = entries.reduce((sum, e) => sum + e[1], 0);

            // Рисуем круговую диаграмму на Canvas
            if (chartCanvas) {
                const ctx = chartCanvas.getContext('2d');
                const width = chartCanvas.width = 200;
                const height = chartCanvas.height = 200;
                ctx.clearRect(0, 0, width, height);
                const centerX = width / 2, centerY = height / 2, radius = 80;
                let startAngle = -Math.PI / 2;
                if (entries.length === 0) {
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                    ctx.fillStyle = '#e0e0e0';
                    ctx.fill();
                } else {
                    const colors = ['#007aff', '#34c759', '#ff9500', '#af52de', '#ff3b30', '#ffcc00', '#8e8e93', '#5856d6'];
                    entries.forEach((entry, i) => {
                        const sliceAngle = (entry[1] / total) * 2 * Math.PI;
                        ctx.beginPath();
                        ctx.moveTo(centerX, centerY);
                        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
                        ctx.closePath();
                        ctx.fillStyle = colors[i % colors.length];
                        ctx.fill();
                        startAngle += sliceAngle;
                    });
                }
                // Внутренний круг
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-primary');
                ctx.fill();
            }

            // Список категорий
            if (categoryList) {
                categoryList.innerHTML = '';
                if (entries.length === 0) {
                    categoryList.innerHTML = '<div class="empty-state">Нет данных</div>';
                } else {
                    entries.forEach(entry => {
                        const [cat, amount] = entry;
                        const percent = ((amount / total) * 100).toFixed(1);
                        const item = document.createElement('div');
                        item.className = 'category-list-item';
                        item.innerHTML = `
              <div class="category-color" style="background:var(--accent-blue);"></div>
              <div class="category-info">
                <div class="category-name">${cat}</div>
                <div class="category-percent">${percent}%</div>
              </div>
              <div class="category-amount">${formatMoney(amount)}</div>
            `;
                        categoryList.appendChild(item);
                    });
                }
            }
        }

        // Переключение
        $('#toggleExpense')?.addEventListener('click', () => {
            mode = 'expense';
            $('#toggleExpense').classList.add('active');
            $('#toggleIncome').classList.remove('active');
            update();
        });
        $('#toggleIncome')?.addEventListener('click', () => {
            mode = 'income';
            $('#toggleIncome').classList.add('active');
            $('#toggleExpense').classList.remove('active');
            update();
        });

        update();
    }

    // ========== ПЛАТЕЖИ ==========
    function renderPayments() {
        const container = $('#paymentsList');
        if (!container) return;
        const payments = getPayments();
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const today = now.getTime();
        const tomorrow = new Date(today + 86400000).getTime();

        // Сортируем по дате
        payments.sort((a, b) => new Date(a.date) - new Date(b.date));

        let totalUpcoming = 0;
        container.innerHTML = '';
        if (payments.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">💸</div><div>Нет платежей</div></div>';
        } else {
            payments.forEach(p => {
                const paymentDate = new Date(p.date);
                paymentDate.setHours(0, 0, 0, 0);
                const paymentTime = paymentDate.getTime();
                let status = '';
                let statusClass = '';
                if (paymentTime < today) {
                    status = 'Просрочено';
                    statusClass = 'overdue';
                } else if (paymentTime === today) {
                    status = 'Сегодня';
                    statusClass = 'today';
                } else if (paymentTime === tomorrow) {
                    status = 'Завтра';
                    statusClass = 'tomorrow';
                } else {
                    const diffDays = Math.ceil((paymentTime - today) / 86400000);
                    status = `Через ${diffDays} дн.`;
                    statusClass = 'upcoming';
                }
                if (paymentTime >= today) totalUpcoming += p.amount;

                const card = document.createElement('div');
                card.className = 'payment-card';
                card.innerHTML = `
          <span>💳</span>
          <div style="flex:1;">
            <div style="font-weight:500;">${p.name}</div>
            <div style="font-size:12px;color:var(--text-secondary);">${new Date(p.date).toLocaleDateString('ru-RU')}</div>
          </div>
          <span style="font-weight:600;margin-right:8px;">${formatMoney(p.amount)}</span>
          <span class="payment-status ${statusClass}">${status}</span>
        `;
                card.addEventListener('click', () => openEditPaymentModal(p, () => renderPayments()));
                container.appendChild(card);
            });
        }
        const totalEl = $('#totalPayments');
        if (totalEl) totalEl.textContent = formatMoney(totalUpcoming);
    }

    function openAddPaymentModal() {
        const content = `
      <div class="modal-header">
        <h2 class="modal-title">Новый платёж</h2>
        <button class="modal-close">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">Название</label>
        <input class="form-input" id="paymentName" placeholder="Название">
      </div>
      <div class="form-group">
        <label class="form-label">Сумма</label>
        <input class="form-input" id="paymentAmount" type="number" placeholder="0" inputmode="decimal">
      </div>
      <div class="form-group">
        <label class="form-label">Дата</label>
        <input class="form-input" id="paymentDate" type="date">
      </div>
      <button class="btn-primary" id="savePaymentBtn">Добавить</button>
    `;
        const { overlay, close } = createModal(content);
        overlay.querySelector('#savePaymentBtn').addEventListener('click', () => {
            const name = overlay.querySelector('#paymentName').value.trim();
            const amount = parseFloat(overlay.querySelector('#paymentAmount').value) || 0;
            const date = overlay.querySelector('#paymentDate').value;
            if (!name || !amount || !date) return;
            const payments = getPayments();
            payments.push({ id: getNextId(), name, amount, date });
            savePayments(payments);
            playSound('add');
            close();
            renderPayments();
        });
    }

    function openEditPaymentModal(payment, onUpdate) {
        const content = `
      <div class="modal-header">
        <h2 class="modal-title">Редактировать</h2>
        <button class="modal-close">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">Название</label>
        <input class="form-input" id="editPaymentName" value="${payment.name}">
      </div>
      <div class="form-group">
        <label class="form-label">Сумма</label>
        <input class="form-input" id="editPaymentAmount" type="number" value="${payment.amount}" inputmode="decimal">
      </div>
      <div class="form-group">
        <label class="form-label">Дата</label>
        <input class="form-input" id="editPaymentDate" type="date" value="${payment.date}">
      </div>
      <button class="btn-primary" id="saveEditPayment">Сохранить</button>
      <button class="btn-primary btn-danger" id="deletePaymentBtn" style="margin-top:8px;">Удалить</button>
    `;
        const { overlay, close } = createModal(content, onUpdate);
        overlay.querySelector('#saveEditPayment').addEventListener('click', () => {
            const name = overlay.querySelector('#editPaymentName').value.trim();
            const amount = parseFloat(overlay.querySelector('#editPaymentAmount').value) || 0;
            const date = overlay.querySelector('#editPaymentDate').value;
            if (!name || !amount || !date) return;
            const payments = getPayments();
            const idx = payments.findIndex(p => p.id === payment.id);
            if (idx !== -1) {
                payments[idx] = { ...payment, name, amount, date };
                savePayments(payments);
                playSound('add');
            }
            close();
            if (onUpdate) onUpdate();
        });
        overlay.querySelector('#deletePaymentBtn').addEventListener('click', () => {
            if (confirm('Удалить платёж?')) {
                let payments = getPayments();
                payments = payments.filter(p => p.id !== payment.id);
                savePayments(payments);
                playSound('delete');
                close();
                if (onUpdate) onUpdate();
            }
        });
    }

    // ========== ИНИЦИАЛИЗАЦИЯ ==========
    function initApp() {
        initTheme();
        initCategories();

        const page = getPage();

        // Глобальные обработчики
        $('#themeToggle')?.addEventListener('click', toggleTheme);
        $('#addWalletBtn')?.addEventListener('click', openAddWalletModal);

        // Навигация (подсветка активной вкладки)
        const tabs = $$('.tab-item');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                playSound('tab');
                // Активный класс уберется после перехода, но можно добавить эффект
            });
        });

        if (page === 'home') {
            renderHome();
        } else if (page === 'analytics') {
            renderAnalytics();
        } else if (page === 'payments') {
            renderPayments();
            $('#addPaymentBtn')?.addEventListener('click', openAddPaymentModal);
        }

        // Регистрация Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js');
            });
        }
    }

    // Запуск после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
})();