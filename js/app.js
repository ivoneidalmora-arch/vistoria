async function init() {
    updateDate();
    setupEventListeners();
    await loadTransactions();
    updateUI();
}

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
            // totalPages exists scoped in render transactions but we just increment and updateUI clamps it
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

    if (DOM.vValorBruto) {
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
    }

    // Form Submits
    if (DOM.formVistoria) {
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
    }

    if (DOM.formDespesa) {
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
    }

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

// Inicializa quando o arquivo carregar
document.addEventListener('DOMContentLoaded', init);
