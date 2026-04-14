// DOM Elements
const DOM = {
    dateDisplay: document.getElementById('dateDisplay'),
    globalBalance: document.getElementById('globalBalance'),
    currentBalance: document.getElementById('currentBalance'),
    monthIncome: document.getElementById('monthIncome'),
    monthExpense: document.getElementById('monthExpense'),
    qtdeLaudos: document.getElementById('qtdeLaudos'),
    ticketMedio: document.getElementById('ticketMedio'),
    transactionList: document.getElementById('transactionList'),

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
