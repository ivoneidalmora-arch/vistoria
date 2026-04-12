window.deleteTransaction = async function (id) {
    if (confirm('Tem certeza que deseja apagar este lançamento?')) {
        const t = transactions.find(x => x.id === id);
        if(!t) return;
        
        if(t.dbType === 'Receitas') {
            await window.supabaseClient.from('Receitas').delete().eq('id', id);
        } else if (t.dbType === 'Despesas') {
            await window.supabaseClient.from('Despesas').delete().eq('id', id);
        }

        transactions = transactions.filter(t => t.id !== id);
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

window.markAsPaid = async function (id) {
    const t = transactions.find(x => x.id === id);
    if (t && t.status === 'Pendente') {
        const btn = event.target;
        btn.textContent = '...';
        btn.disabled = true;

        if(t.dbType === 'Despesas') {
            await window.supabaseClient.from('Despesas').update({ status: 'Pago' }).eq('id', id);
        }
        t.status = 'Pago';
        updateUI();
    }
};

window.addTransaction = async function(data) {
    const session = JSON.parse(localStorage.getItem('alfa_session') || '{}');
    const uId = session.id;

    if (editingTransactionId) {
        const index = transactions.findIndex(t => t.id === editingTransactionId);
        if (index !== -1) {
            const dbType = transactions[index].dbType;
            let payload = { ...data };
            delete payload.type; 
            
            if(dbType === 'Receitas') {
                await window.supabaseClient.from('Receitas').update(payload).eq('id', editingTransactionId);
            } else {
                await window.supabaseClient.from('Despesas').update(payload).eq('id', editingTransactionId);
            }

            transactions[index] = { ...transactions[index], ...data };
            if (data.date) {
                const dateStr = data.date.includes('T') ? data.date.split('T')[0] : data.date;
                localStorage.setItem('last_used_date', dateStr);
            }
            updateUI();
            editingTransactionId = null;
            return;
        }
    }

    // É um registro inteiramente novo
    let payload = { ...data, user_id: uId };
    let tableName = (data.type === 'income') ? 'Receitas' : 'Despesas';
    delete payload.type; 

    const { data: inserted, error } = await window.supabaseClient.from(tableName).insert([payload]).select();

    if(error){
        alert("Erro ao gravar online: " + error.message);
        return;
    }

    if(inserted && inserted.length > 0) {
        const nRecord = inserted[0];
        const localFormat = {
            id: nRecord.id, // ID real gerado pelo Postgres UUID/Bigint
            dbType: tableName,
            type: tableName === 'Receitas' ? 'income' : 'expense',
            ...data
        };
        transactions.push(localFormat);
    }

    if (data.date) {
        const dateStr = data.date.includes('T') ? data.date.split('T')[0] : data.date;
        localStorage.setItem('last_used_date', dateStr);
    }

    updateUI();
};
