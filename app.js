// State Variables
let transactions = [];
let financeChartInstance = null;
let editingTransactionId = null;

// Paginação e Busca
let currentPage = 1;
const ITEMS_PER_PAGE = 30;
let searchPlaca = "";
let searchCliente = "";
let searchDespesa = "";

// DOM Elements
const DOM = {
    dateDisplay: document.getElementById('dateDisplay'),
    currentBalance: document.getElementById('currentBalance'),
    monthIncome: document.getElementById('monthIncome'),
    monthExpense: document.getElementById('monthExpense'),
    transactionList: document.getElementById('transactionList'),

    // VRTE
    // VRTE / Values
    vrteInput: document.getElementById('vrteInput'),
    vrteHintDisplay: document.getElementById('vrteHintDisplay'),
    vValorBruto: document.getElementById('vValorBruto'),
    vValorLiquido: document.getElementById('vValorLiquido'),

    // Forms
    formVistoria: document.getElementById('formVistoria'),
    formDespesa: document.getElementById('formDespesa'),

    // Observação
    vObservacao: document.getElementById('vObservacao'),
    dObservacao: document.getElementById('dObservacao')
};

function init() {
    updateDate();
    loadTransactions();
    setupEventListeners();
    updateUI();
}

function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('pt-BR', options);
    DOM.dateDisplay.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
}

// Global functions for inline HTML calls
window.openModal = function (id) {
    const modal = document.getElementById(id);

    modal.style.display = 'flex';

    // Garantir que a janela volte para o topo (precisa ser feito APÓS o display flex)
    const modalContent = modal.querySelector('.modal');
    if (modalContent) {
        modalContent.scrollTop = 0;
    }

    // Small delay to allow CSS transition
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);

    // Auto-preencher datas com a ultima salva ou a de hoje
    let targetStr = localStorage.getItem('last_used_date');
    if (!targetStr) {
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        targetStr = today.toISOString().split('T')[0];
    }

    if (id === 'vistoriaModal') {
        const d = document.getElementById('vData');
        if (d && !d.value) d.value = targetStr;
    }
    if (id === 'despesaModal') {
        const d = document.getElementById('dData');
        const v = document.getElementById('dVencimento');
        if (d && !d.value) d.value = targetStr;
        if (v && !v.value) v.value = targetStr;
    }
};

window.closeModal = function (id) {
    const modal = document.getElementById(id);
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';

        // Reset forms when closed
        if (id === 'vistoriaModal') {
            DOM.formVistoria.reset();
            const submitBtn = document.querySelector('#formVistoria button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Salvar Receita';
        }
        if (id === 'despesaModal') {
            DOM.formDespesa.reset();
            const submitBtn = document.querySelector('#formDespesa button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Registrar Saída';
        }
        editingTransactionId = null;
    }, 300);
};

// --- DATA LOGIC ---
function loadTransactions() {
    const saved = localStorage.getItem('vistoria_ecv_es');
    if (saved) {
        try { transactions = JSON.parse(saved); }
        catch (e) { transactions = []; }
    }
}

function saveTransactions() {
    localStorage.setItem('vistoria_ecv_es', JSON.stringify(transactions));
}

window.clearData = function () {
    if (confirm('Tem certeza que deseja apagar TODO o histórico? Esta ação não pode ser desfeita.')) {
        transactions = [];
        saveTransactions();
        updateUI();
    }
};

window.deleteTransaction = function (id) {
    if (confirm('Tem certeza que deseja apagar este lançamento?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveTransactions();
        updateUI();
    }
};

window.editTransaction = function (id) {
    const t = transactions.find(x => x.id === id);
    if (!t) return;

    editingTransactionId = id;

    if (t.type === 'income') {
        document.getElementById('vTipo').value = t.category;
        document.getElementById('vPlaca').value = t.placa || '';
        document.getElementById('vCliente').value = t.cliente || '';
        document.getElementById('vNF').value = t.nf || '';
        document.getElementById('vPagamento').value = t.pagamento || 'Pix';
        document.getElementById('vValorBruto').value = t.amountBruto || t.amount;
        document.getElementById('vValorLiquido').value = t.amountLiquido || t.amount;

        const dateStr = t.date.includes('T') ? t.date.split('T')[0] : t.date;
        document.getElementById('vData').value = dateStr;
        document.getElementById('vObservacao').value = t.observacao || '';

        document.querySelector('#formVistoria button[type="submit"]').textContent = 'Salvar Alterações';
        window.openModal('vistoriaModal');
    } else {
        document.getElementById('dTipo').value = t.category;
        document.getElementById('dDescricao').value = t.description || '';
        document.getElementById('dValor').value = t.amount;

        const dateStr = t.date.includes('T') ? t.date.split('T')[0] : t.date;
        document.getElementById('dData').value = dateStr;
        document.getElementById('dVencimento').value = t.vencimento ? (t.vencimento.includes('T') ? t.vencimento.split('T')[0] : t.vencimento) : dateStr;
        document.getElementById('dStatus').value = t.status || 'Pago';
        document.getElementById('dObservacao').value = t.observacao || '';

        document.querySelector('#formDespesa button[type="submit"]').textContent = 'Salvar Alterações';
        window.openModal('despesaModal');
    }
};

window.markAsPaid = function (id) {
    const t = transactions.find(x => x.id === id);
    if (t && t.status === 'Pendente') {
        t.status = 'Pago';
        saveTransactions();
        updateUI();
    }
};

window.exportReportCSV = function () {
    if (!window.currentReportData || window.currentReportData.length === 0) {
        alert("Não há dados para exportar. Gere um relatório primeiro.");
        return;
    }

    let csvContent = "\uFEFF"; // BOM para compatibilidade com Excel
    csvContent += "Data;Tipo;Categoria;Cliente/Descricao;Placa;NF;Forma de Pagto;Status;Valor Bruto;Valor Liquido;Valor;Observacao\n";

    window.currentReportData.forEach(t => {
        const isInc = t.type === 'income';
        const dateStr = formatDate(t.date, isInc);
        const tipo = isInc ? 'Receita' : 'Despesa';
        const cat = t.category || '';
        const clDesc = (isInc ? t.cliente : t.description) || '';
        const placa = t.placa || '';
        const nf = t.nf || '';
        const pgto = t.pagamento || '';
        const status = isInc ? 'Recebido' : (t.status || 'Pago');
        const vBruto = isInc && t.amountBruto ? t.amountBruto.toFixed(2).replace('.', ',') : '';
        const vLiq = isInc && t.amountLiquido ? t.amountLiquido.toFixed(2).replace('.', ',') : '';
        const val = t.amount ? t.amount.toFixed(2).replace('.', ',') : '0,00';
        const obs = t.observacao || '';

        const escapeCSV = (str) => {
            let s = String(str).replace(/\n/g, " ");
            if (s.includes(';') || s.includes('"')) {
                s = '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
        };

        const row = [dateStr, tipo, cat, clDesc, placa, nf, pgto, status, vBruto, vLiq, val, obs].map(escapeCSV).join(';');
        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_financeiro_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.exportBackup = async function () {
    if (transactions.length === 0) {
        alert("Não há dados para fazer backup.");
        return;
    }

    const dataStr = JSON.stringify(transactions, null, 2);
    const fileName = `backup_financeiro_alfa_${new Date().toISOString().split('T')[0]}.json`;

    try {
        if ('showSaveFilePicker' in window) {
            // Modern File System Access API (Abre o "Salvar como...")
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: 'Arquivo de Backup JSON',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(dataStr);
            await writable.close();
            // Arquivo salvo com sucesso
        } else {
            // Fallback para navegadores antigos (vai baixar direto)
            alert("Seu navegador não suporta a escolha de pasta e fará o download direto. (Dica: no Chrome/Edge, você pode ativar 'Perguntar onde salvar cada arquivo' nas configurações)");

            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    } catch (err) {
        // Usuário cancelou a janela de salvar, ignoramos o AbortError em silêncio
        if (err.name !== 'AbortError') {
            alert("Erro ao salvar o arquivo: " + err.message);
        }
    }
};

window.importBackup = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                if (confirm(`Deseja restaurar ${imported.length} registros? \n\n[OK] para SUBSTITUIR todos os dados atuais pelo backup.\n[Cancelar] para MANTER os dados atuais e adicionar apenas os que faltam.`)) {
                    transactions = imported;
                } else {
                    const existingIds = new Set(transactions.map(t => t.id));
                    imported.forEach(t => {
                        if (!existingIds.has(t.id)) transactions.push(t);
                    });
                }
                saveTransactions();
                updateUI();
                alert("Backup importado com sucesso!");
            } else {
                alert("Arquivo de backup inválido.");
            }
        } catch (err) {
            alert("Erro ao ler arquivo de backup: " + err.message);
        }
        event.target.value = '';
    };
    reader.readAsText(file);
};

function addTransaction(data) {
    if (editingTransactionId) {
        const index = transactions.findIndex(t => t.id === editingTransactionId);
        if (index !== -1) {
            transactions[index] = { ...transactions[index], ...data };
            if (data.date) {
                const dateStr = data.date.includes('T') ? data.date.split('T')[0] : data.date;
                localStorage.setItem('last_used_date', dateStr);
            }
            saveTransactions();
            updateUI();
            editingTransactionId = null;
            return;
        }
    }

    const transaction = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
        ...data,
        createdAt: new Date().toISOString()
    };
    transactions.push(transaction);
    saveTransactions();

    // Salvar ultima data para facilitar lançamento
    if (data.date) {
        const dateStr = data.date.includes('T') ? data.date.split('T')[0] : data.date;
        localStorage.setItem('last_used_date', dateStr);
    }

    updateUI();
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Inputs de Pesquisa
    const inputPlaca = document.getElementById('searchPlaca');
    if (inputPlaca) {
        inputPlaca.addEventListener('input', (e) => {
            searchPlaca = e.target.value.toUpperCase();
            currentPage = 1;
            updateUI();
        });
    }
    const inputCliente = document.getElementById('searchCliente');
    if (inputCliente) {
        inputCliente.addEventListener('input', (e) => {
            searchCliente = e.target.value.toUpperCase();
            currentPage = 1;
            updateUI();
        });
    }
    const inputDespesa = document.getElementById('searchDespesa');
    if (inputDespesa) {
        inputDespesa.addEventListener('input', (e) => {
            searchDespesa = e.target.value.toUpperCase();
            currentPage = 1;
            updateUI();
        });
    }

    // Botões de Paginação
    const btnPrev = document.getElementById('btnPrevPage');
    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updateUI();
            }
        });
    }

    const btnNext = document.getElementById('btnNextPage');
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            currentPage++;
            updateUI();
        });
    }

    // Selector de Mês do Dashboard
    const monthSelector = document.getElementById('monthSelector');
    if (monthSelector) {
        monthSelector.addEventListener('change', updateUI);
    }

    // Escrever sempre em caixa alta para inputs de texto e textareas
    document.addEventListener('input', function (e) {
        if ((e.target.tagName === 'INPUT' && e.target.type === 'text') || e.target.tagName === 'TEXTAREA') {
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            e.target.value = e.target.value.toUpperCase();
            e.target.setSelectionRange(start, end);
        }
    });

    // VRTE Engine
    const updateVrteHint = () => {
        if (!DOM.vrteInput || !DOM.vrteHintDisplay) return;
        const vrteVal = parseFloat(DOM.vrteInput.value) || 0;
        DOM.vrteHintDisplay.textContent = (vrteVal * 30).toFixed(2).replace('.', ',');
    };
    if (DOM.vrteInput) DOM.vrteInput.addEventListener('input', updateVrteHint);
    updateVrteHint(); // Inicializa

    // Tabela de conversão de Bruto -> Líquido 2025
    const conversao2025 = {
        198.13: 147.41,
        169.83: 127.08,
        141.52: 105.86,
        108.50: 75.96,
        94.35: 63.49
    };

    DOM.vValorBruto.addEventListener('input', (e) => {
        const valBruto = parseFloat(e.target.value);
        if (!isNaN(valBruto)) {
            // Find an exact match handling tiny float differences
            const matchedKey = Object.keys(conversao2025).find(k => Math.abs(parseFloat(k) - valBruto) < 0.001);
            if (matchedKey) {
                DOM.vValorLiquido.value = conversao2025[matchedKey].toFixed(2);
            }
        }
    });

    // Form Submits
    DOM.formVistoria.addEventListener('submit', (e) => {
        e.preventDefault();

        const vTipo = document.getElementById('vTipo').value;
        const vPlaca = document.getElementById('vPlaca').value.toUpperCase();
        const vData = document.getElementById('vData').value;
        const dataComparacao = vData.includes('T') ? vData.split('T')[0] : vData;

        if (vPlaca) {
            const dataCompMonth = dataComparacao.substring(0, 7); // Pegar YYYY-MM
            const hasDuplicate = transactions.some(t => {
                if (t.type !== 'income' || t.id === editingTransactionId) return false;
                const tDate = t.date.includes('T') ? t.date.split('T')[0] : t.date;
                const tMonth = tDate.substring(0, 7);
                return t.placa === vPlaca && t.category === vTipo && tMonth === dataCompMonth;
            });

            if (hasDuplicate) {
                const proceed = confirm(`⚠️ ALERTA DE DUPLICIDADE\n\nJá existe um lançamento de "${vTipo}" para a placa "${vPlaca}" neste mesmo mês!\n\nDeseja salvar este lançamento mesmo assim?`);
                if (!proceed) return;
            }
        }

        addTransaction({
            type: 'income',
            category: vTipo,
            placa: vPlaca,
            cliente: document.getElementById('vCliente').value,
            nf: document.getElementById('vNF').value,
            pagamento: document.getElementById('vPagamento').value,
            amountBruto: parseFloat(document.getElementById('vValorBruto').value),
            amountLiquido: parseFloat(document.getElementById('vValorLiquido').value),
            amount: parseFloat(document.getElementById('vValorBruto').value), // Para stats mantemos bruto como amount
            date: vData,
            observacao: document.getElementById('vObservacao').value
        });

        window.closeModal('vistoriaModal');
    });

    DOM.formDespesa.addEventListener('submit', (e) => {
        e.preventDefault();

        addTransaction({
            type: 'expense',
            category: document.getElementById('dTipo').value,
            description: document.getElementById('dDescricao').value,
            amount: parseFloat(document.getElementById('dValor').value),
            vencimento: document.getElementById('dVencimento').value,
            date: document.getElementById('dData').value, // YYYY-MM-DD
            status: document.getElementById('dStatus').value,
            observacao: document.getElementById('dObservacao').value
        });

        window.closeModal('despesaModal');
    });

    const formRelatorio = document.getElementById('formRelatorio');
    if (formRelatorio) {
        formRelatorio.addEventListener('submit', (e) => {
            e.preventDefault();

            const rDataInicio = document.getElementById('rDataInicio').value;
            const rDataFim = document.getElementById('rDataFim').value;
            const rCliente = document.getElementById('rCliente').value.toLowerCase();
            const rTipo = document.getElementById('rTipo').value;

            let filtered = transactions.filter(t => {
                let pass = true;

                if (rTipo === 'receitas' && t.type !== 'income') pass = false;
                if (rTipo === 'despesas' && t.type !== 'expense') pass = false;

                if (rDataInicio || rDataFim) {
                    const tDateStr = t.type === 'expense' ? t.date : t.date.split('T')[0];
                    if (rDataInicio && tDateStr < rDataInicio) pass = false;
                    if (rDataFim && tDateStr > rDataFim) pass = false;
                }
                if (rCliente) {
                    if (t.type !== 'income' || !t.cliente || !t.cliente.toLowerCase().includes(rCliente)) {
                        pass = false;
                    }
                }
                return pass;
            });

            window.currentReportData = filtered;

            let sumInc = 0;
            let sumExp = 0;
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

            const tbody = document.getElementById('rTabelaResultados');
            tbody.innerHTML = '';

            filtered.forEach(t => {
                const isInc = t.type === 'income';
                const incNet = isInc ? (t.amountLiquido || t.amount) : 0;

                if (isInc) sumInc += incNet;
                else if (t.status !== 'Pendente') sumExp += t.amount;

                let clientDetails = isInc ? (t.cliente || '-') : t.description;
                if (t.observacao) {
                    clientDetails += `<br><span style="font-size: 0.75rem; color: var(--text-muted);">Obs: ${t.observacao}</span>`;
                }
                let statusInfo = isInc ? 'Recebido' : (t.status || 'Pago');

                let amtDisplay = '';
                if (isInc && t.amountBruto && t.amountLiquido) {
                    amtDisplay = `<div style="text-align:right;">
                        <span style="font-size:0.75rem; color:var(--text-muted); display:block;">Bruto: ${formatCurrency(t.amountBruto)}</span>
                        <span style="color:var(--success); font-weight:600;">Líq: ${formatCurrency(t.amountLiquido)}</span>
                    </div>`;
                } else {
                    amtDisplay = `<span class="amt ${t.type}">${formatCurrency(t.amount)}</span>`;
                }

                tbody.innerHTML += `
                    <tr>
                        <td style="white-space:nowrap;">${formatDate(t.date, isInc)}</td>
                        <td>${t.category}</td>
                        <td>${clientDetails}</td>
                        <td><span class="badge ${isInc ? 'income' : 'expense'}" style="font-size:0.65rem;">${statusInfo}</span></td>
                        <td style="text-align: right; white-space:nowrap;">${amtDisplay}</td>
                    </tr>
                `;
            });

            document.getElementById('rTotalReceitas').textContent = formatCurrency(sumInc);
            document.getElementById('rTotalDespesas').textContent = formatCurrency(sumExp);
            const saldoL = sumInc - sumExp;
            const h2Saldo = document.getElementById('rSaldoLiquido');
            h2Saldo.textContent = formatCurrency(saldoL);
            h2Saldo.style.color = saldoL < 0 ? 'var(--danger)' : 'var(--text-main)';

            document.getElementById('relatorioResultados').style.display = 'block';
        });
    }
}

// --- UI UPDATES ---
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

function renderChart(data) {
    const ctx = document.getElementById('financeChart').getContext('2d');

    // Custom ChartJS defaults config for dark theme
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Outfit', sans-serif";

    if (financeChartInstance) {
        financeChartInstance.destroy();
    }

    financeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.days,
            datasets: [
                {
                    label: 'Receitas (R$)',
                    data: data.incomes,
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Despesas (R$)',
                    data: data.expenses,
                    backgroundColor: 'rgba(239, 68, 68, 0.6)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        boxWidth: 12,
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(24, 24, 27, 0.9)',
                    titleFont: { size: 14, family: "'Outfit', sans-serif" },
                    bodyFont: { size: 13, family: "'Outfit', sans-serif" },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function (value) {
                            if (value >= 1000) {
                                return 'R$ ' + (value / 1000).toFixed(1) + 'k';
                            }
                            return 'R$ ' + value;
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    }
                }
            }
        }
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

// --- Integração com SUPABASE ---
const supabaseUrl = 'https://zlvvkltsefsytzqjorsn.supabase.co'; // SUA URL DO SUPABASE AQUI
const supabaseKey = 'sb_publishable_dCNKa32V358Zsfpmo1Bj_A_gnfBpsVz'; // SUA CHAVE DO SUPABASE AQUI

let supabase = null;
if (window.supabase) {
    try {
        supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    } catch (e) {
        console.warn("Supabase auth bypass/error: ", e);
    }
}

let isRegistering = false;
let appInitialized = false;

async function checkSession() {
    if (!supabase || supabaseUrl === 'COLOQUE_SUA_URL_AQUI') {
        const err = document.getElementById('authErrorMsg');
        if (err) {
            err.textContent = "⚠️ Sistema não conectado ao Supabase. Adicione suas chaves no app.js.";
            err.style.display = 'block';
        }
        showAuthScreen();
        return;
    }

    const { data: { session }, error } = await supabase.auth.getSession();
    if (session) {
        showApp();
    } else {
        showAuthScreen();
    }
}

function showAuthScreen() {
    document.getElementById('authWrapper').style.display = 'flex';
    document.getElementById('appWrapper').style.display = 'none';
}

function showApp() {
    document.getElementById('authWrapper').style.display = 'none';
    document.getElementById('appWrapper').style.display = 'block';

    if (!appInitialized) {
        init();
        appInitialized = true;
    }
}

// Listener de Login/Logout
if (supabase) {
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            showApp();
        } else if (event === 'SIGNED_OUT') {
            showAuthScreen();
        }
    });
}

// Global scope para o botão HTML
window.logout = async function () {
    if (supabase && supabaseUrl !== 'COLOQUE_SUA_URL_AQUI') {
        await supabase.auth.signOut();
    }
    showAuthScreen();
};

document.addEventListener('DOMContentLoaded', () => {
    checkSession();

    // Lógica do Formulário de Auth
    const authForm = document.getElementById('authForm');
    const authErrorMsg = document.getElementById('authErrorMsg');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');

    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => {
            isRegistering = !isRegistering;
            authSubmitBtn.textContent = isRegistering ? 'Criar Conta' : 'Entrar';
            showRegisterBtn.textContent = isRegistering ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastrar';
            authErrorMsg.style.display = 'none';
        });
    }

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!supabase || supabaseUrl === 'COLOQUE_SUA_URL_AQUI') {
                authErrorMsg.textContent = "Supabase não configurado. Adicione URL e Chave no arquivo app.js.";
                authErrorMsg.style.display = 'block';
                return;
            }

            const email = document.getElementById('authEmail').value;
            const password = document.getElementById('authPassword').value;

            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = 'Aguarde...';
            authErrorMsg.style.display = 'none';
            authErrorMsg.style.color = "var(--danger)";

            let result;
            if (isRegistering) {
                result = await supabase.auth.signUp({ email, password });
            } else {
                result = await supabase.auth.signInWithPassword({ email, password });
            }

            const { data, error } = result;

            if (error) {
                // Traduções básicas de erros comuns (opcional)
                let msg = error.message;
                if (msg === "Invalid login credentials") msg = "E-mail ou senha incorretos!";
                if (msg.includes("User already registered")) msg = "Este e-mail já está em uso.";
                if (msg.includes("weak")) msg = "A senha deve ter pelo menos 6 caracteres.";

                authErrorMsg.textContent = msg;
                authErrorMsg.style.display = 'block';
                authSubmitBtn.disabled = false;
                authSubmitBtn.textContent = isRegistering ? 'Criar Conta' : 'Entrar';
            } else {
                if (isRegistering && !data.session) {
                    authErrorMsg.textContent = "Verifique seu e-mail para validar a conta!";
                    authErrorMsg.style.display = 'block';
                    authErrorMsg.style.color = "var(--success)";
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Criar Conta';
                } else {
                    // onAuthStateChange lidará com as telas de sucesso
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = isRegistering ? 'Criar Conta' : 'Entrar';
                    authForm.reset();
                }
            }
        });
    }
});
