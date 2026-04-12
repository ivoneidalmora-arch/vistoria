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
