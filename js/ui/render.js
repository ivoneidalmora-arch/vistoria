// --- UI FORMATTERS ---
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (dateString, isIso = false) => {
    const d = new Date(dateString);
    if (!dateString.includes('T')) {
        // Correção de timezone para datas YYYY-MM-DD do input date
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('pt-BR', options);
    DOM.dateDisplay.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
}

// --- UI UPDATES ---
function updateUI() {
    populateMonthSelector();
    renderTransactions();
    const stats = calculateStats();
    renderChart(stats);
    updateLembretes();
}

function populateMonthSelector() {
    const monthSelector = document.getElementById('monthSelector');
    if (!monthSelector) return;

    let currentVal = monthSelector.value;

    // Pegar todos os meses das transações
    const monthsSet = new Set();
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentMonthStr);

    transactions.forEach(t => {
        let tDateObj = new Date(t.date);
        if (!t.date.includes('T')) {
            tDateObj.setMinutes(tDateObj.getMinutes() + tDateObj.getTimezoneOffset());
        }
        monthsSet.add(`${tDateObj.getFullYear()}-${String(tDateObj.getMonth() + 1).padStart(2, '0')}`);
    });

    const sortedMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));

    const optionsHTML = sortedMonths.map(m => {
        const [y, mo] = m.split('-');
        const d = new Date(y, parseInt(mo) - 1, 1);
        let name = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        name = name.charAt(0).toUpperCase() + name.slice(1);
        return `<option value="${m}">${name}</option>`;
    }).join('');

    if (monthSelector.innerHTML !== optionsHTML) {
        monthSelector.innerHTML = optionsHTML;
        if (currentVal && sortedMonths.includes(currentVal)) {
            monthSelector.value = currentVal;
        } else {
            monthSelector.value = currentMonthStr;
        }
    }
}

function calculateStats() {
    const now = new Date();
    const monthSel = document.getElementById('monthSelector');
    const targetMonth = (monthSel && monthSel.value) ? monthSel.value : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [tYearStr, tMonthStr] = targetMonth.split('-');
    const tYear = parseInt(tYearStr, 10);
    const tMonth = parseInt(tMonthStr, 10);

    const isCurrentMonth = targetMonth === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const daysInMonth = isCurrentMonth ? now.getDate() : new Date(tYear, tMonth, 0).getDate();

    let totalBalance = 0;
    let monthIncomeNet = 0;
    let monthIncomeGross = 0;
    let monthExpense = 0;

    // Charts data for selected month grouped by date
    const monthlyData = {
        days: [],
        incomes: [],
        expenses: []
    };

    // Armazenar faturamento por cliente no mês
    const clientRevenue = {};

    // Preencher dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
        monthlyData.days.push(i.toString());
        monthlyData.incomes.push(0);
        monthlyData.expenses.push(0);
    }

    transactions.forEach(t => {
        const incNet = t.type === 'income' ? (t.amountLiquido || t.amount) : 0;
        const incGross = t.type === 'income' ? (t.amountBruto || t.amount) : 0;

        // Balanço Geral de toda a vida
        if (t.type === 'income') totalBalance += incNet;
        else if (t.status !== 'Pendente') totalBalance -= t.amount;

        // Análise do Mês Selecionado
        let tDateObj = new Date(t.date);
        if (!t.date.includes('T')) {
            tDateObj.setMinutes(tDateObj.getMinutes() + tDateObj.getTimezoneOffset());
        }

        const transactionMonthStr = `${tDateObj.getFullYear()}-${String(tDateObj.getMonth() + 1).padStart(2, '0')}`;

        if (transactionMonthStr === targetMonth) {
            if (t.type === 'income') {
                monthIncomeGross += incGross;
                monthIncomeNet += incNet;
                const d = tDateObj.getDate();
                if (d <= daysInMonth) monthlyData.incomes[d - 1] += incNet;

                // Mapear faturamento por cliente
                if (t.cliente && t.cliente.trim() !== '') {
                    const cName = t.cliente.trim().toUpperCase();
                    if (!clientRevenue[cName]) {
                        clientRevenue[cName] = { bruto: 0, liquido: 0 };
                    }
                    clientRevenue[cName].bruto += incGross;
                    clientRevenue[cName].liquido += incNet;
                }
            } else if (t.status !== 'Pendente') {
                monthExpense += t.amount;
                const d = tDateObj.getDate();
                if (d <= daysInMonth) monthlyData.expenses[d - 1] += t.amount;
            }
        }
    });

    // Atualiza DOM com os dados do mês selecionado
    const monthBalance = monthIncomeNet - monthExpense;
    DOM.currentBalance.textContent = formatCurrency(monthBalance);
    DOM.currentBalance.style.color = monthBalance < 0 ? 'var(--danger)' : 'var(--text-main)';

    const balanceDetails = document.getElementById('balanceDetails');
    if (balanceDetails) {
        if (monthIncomeGross > 0) {
            const valDiferenca = monthIncomeGross - monthIncomeNet;
            const percDiferenca = ((valDiferenca / monthIncomeGross) * 100).toFixed(1);

            balanceDetails.innerHTML = `
                <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.4rem; margin-top: 0.4rem;">
                    <span>Bruto (100%):</span> <strong style="color: var(--text-main);">${formatCurrency(monthIncomeGross)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 0.2rem;">
                    <span>Líquido (-${percDiferenca}%):</span> <strong style="color: var(--success);">${formatCurrency(monthIncomeNet)}</strong>
                </div>
            `;
            balanceDetails.style.display = 'block';
        } else {
            balanceDetails.style.display = 'none';
        }
    }

    DOM.monthIncome.textContent = formatCurrency(monthIncomeNet);
    DOM.monthExpense.textContent = formatCurrency(monthExpense);

    const labelTitle = document.getElementById('spanMesAtual');
    if (labelTitle) {
        labelTitle.textContent = `${tMonthStr}/${tYearStr}`;
    }

    // Atualiza Painel de Ranking de Clientes
    const topClientsList = document.getElementById('topClientsList');
    if (topClientsList) {
        const sortedClients = Object.entries(clientRevenue)
            .filter(([name, data]) => data.liquido > 0)
            .sort((a, b) => b[1].liquido - a[1].liquido) // Descending amount liquido
            .slice(0, 10); // top 10

        if (sortedClients.length === 0) {
            topClientsList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem 0; font-size: 0.9rem;">
                Nenhum cliente registrado neste mês.
            </div>`;
        } else {
            topClientsList.innerHTML = sortedClients.map((client, index) => {
                const [cName, cData] = client;
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
                const isMedal = index < 3;

                return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.8rem; border-bottom: 1px dashed rgba(255,255,255,0.05);">
                    <div style="display: flex; align-items: center; gap: 0.8rem; min-width: 0;">
                        <div style="min-width: 24px; text-align: center; font-size: ${isMedal ? '1.2rem' : '0.9rem'}; color: var(--text-muted); font-weight: bold;">
                            ${medal}
                        </div>
                        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.95rem; line-height: 1.2;" title="${cName}">
                            ${cName}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600; color: var(--text-main); font-size: 0.8rem;">
                            Bruto: ${formatCurrency(cData.bruto)}
                        </div>
                        <div style="font-weight: 600; color: var(--success); font-size: 0.95rem;">
                            Líq: ${formatCurrency(cData.liquido)}
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        }
    }

    return monthlyData;
}

function renderTransactions() {
    DOM.transactionList.innerHTML = '';

    let filtered = [...transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Filtrar por Busca
    if (searchPlaca) {
        filtered = filtered.filter(t => t.placa && t.placa.includes(searchPlaca));
    }
    if (searchCliente) {
        filtered = filtered.filter(t => t.cliente && t.cliente.toUpperCase().includes(searchCliente));
    }
    if (searchDespesa) {
        filtered = filtered.filter(t => t.description && t.description.toUpperCase().includes(searchDespesa));
    }

    // Lógica de Paginação
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginated = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    // Atualizar UI de Controle de Página
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');
    const pageInfo = document.getElementById('pageInfo');

    if (btnPrev && btnNext && pageInfo) {
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;

        btnPrev.disabled = currentPage === 1;
        btnPrev.style.opacity = currentPage === 1 ? '0.3' : '1';
        btnPrev.style.cursor = currentPage === 1 ? 'not-allowed' : 'pointer';

        btnNext.disabled = currentPage === totalPages;
        btnNext.style.opacity = currentPage === totalPages ? '0.3' : '1';
        btnNext.style.cursor = currentPage === totalPages ? 'not-allowed' : 'pointer';
    }

    if (paginated.length === 0) {
        DOM.transactionList.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 3rem;">Nenhuma movimentação encontrada.</td></tr>`;
        return;
    }

    paginated.forEach(t => {
        const tr = document.createElement('tr');
        const isIncome = t.type === 'income';

        let details = '';
        if (isIncome) {
            if (t.placa) details += `<span class="detail-text">Placa: <strong>${t.placa}</strong></span>`;
            if (t.cliente) details += `<span class="detail-text">Cliente: <strong>${t.cliente}</strong></span>`;
            if (t.nf) details += `<span class="detail-text">NF: <strong>${t.nf}</strong></span>`;
            details += `<span class="detail-text">Via: ${t.pagamento}</span>`;
            if (t.observacao) details += `<span class="detail-text">Obs: <em>${t.observacao}</em></span>`;
        } else {
            details += `<span class="detail-text">${t.description}</span>`;
            if (t.observacao) details += `<span class="detail-text">Obs: <em>${t.observacao}</em></span>`;
        }

        let amtDisplay = '';
        if (isIncome && t.amountBruto && t.amountLiquido) {
            amtDisplay = `<div style="text-align:right;">
                <span style="font-size:0.75rem; color:var(--text-muted); display:block;">Bruto: ${formatCurrency(t.amountBruto)}</span>
                <span class="amt income">Líq: ${formatCurrency(t.amountLiquido)}</span>
            </div>`;
        } else {
            amtDisplay = `<span class="amt ${t.type}">${isIncome ? '+' : '-'} ${formatCurrency(t.amount)}</span>`;
        }

        tr.innerHTML = `
            <td>${formatDate(t.date, isIncome)}</td>
            <td>
                <span class="main-cat">${t.category}</span>
                <span class="badge ${t.type}" style="margin-top:0.3rem; font-size: 0.65rem;">${isIncome ? 'RECEITA' : (t.status === 'Pendente' ? 'PENDENTE' : 'SAÍDA')}</span>
            </td>
            <td>${details}</td>
            <td style="text-align:right;">${amtDisplay}</td>
            <td style="width: 110px; text-align:right; white-space: nowrap;">
                ${!isIncome && t.status === 'Pendente' ? `<button class="btn-edit" style="color:var(--success);" onclick="window.markAsPaid('${t.id}')" title="Marcar como Pago">✔</button>` : ''}
                <button class="btn-edit" onclick="window.editTransaction('${t.id}')" title="Editar">✏️</button>
                <button class="btn-delete" onclick="window.deleteTransaction('${t.id}')" title="Excluir">×</button>
            </td>
        `;
        DOM.transactionList.appendChild(tr);
    });
}

function updateLembretes() {
    const container = document.getElementById('lembretesContainer');
    if (!container) return;

    const pendentes = transactions.filter(t => t.type === 'expense' && t.status === 'Pendente');
    pendentes.sort((a, b) => new Date(a.vencimento || a.date) - new Date(b.vencimento || b.date));

    if (pendentes.length === 0) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    container.style.display = 'flex';
    container.innerHTML = pendentes.map(t => {
        let targetDateStr = t.vencimento || t.date;
        let tDateObj = new Date(targetDateStr);
        if (!targetDateStr.includes('T')) {
            tDateObj.setMinutes(tDateObj.getMinutes() + tDateObj.getTimezoneOffset());
        }
        tDateObj.setHours(0, 0, 0, 0);

        let isLate = tDateObj < today;
        let isToday = tDateObj.getTime() === today.getTime();

        let colorTheme = isLate ? 'danger' : (isToday ? 'primary' : 'text-muted');
        let icon = isLate ? '⚠️' : (isToday ? '🔔' : '📅');
        let stateStr = isLate ? 'VENCIDA' : (isToday ? 'VENCE HOJE' : 'A VENCER');

        return `
        <div class="lembrete-item" style="border-left: 4px solid var(--${colorTheme});">
            <div class="lembrete-info">
                <div class="lembrete-icon" style="color: var(--${colorTheme});">${icon}</div>
                <div>
                    <div class="lembrete-title">${t.category} - ${t.description}</div>
                    <div class="lembrete-desc">Vencimento: <strong>${formatDate(t.vencimento || t.date)}</strong> &middot; Valor: <strong>${formatCurrency(t.amount)}</strong> &middot; <span style="color: var(--${colorTheme}); font-weight: 600;">${stateStr}</span></div>
                </div>
            </div>
            <div class="lembrete-actions">
                <button class="btn btn-primary btn-sm" onclick="window.markAsPaid('${t.id}')">Marcar Pago</button>
            </div>
        </div>
        `;
    }).join('');
}
