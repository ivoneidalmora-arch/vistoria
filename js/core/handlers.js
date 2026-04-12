// Função Utilitária Oculta para Registro de Ações (Auditoria)
window.registrarLog = async function(acao, mensagem) {
    try {
        const session = JSON.parse(localStorage.getItem('alfa_session') || '{}');
        const uId = session.id;
        if (!uId || !window.supabaseClient) return;

        await window.supabaseClient.from('LogsAuditoria').insert([{
            user_id: uId,
            acao: acao,
            mensagem: mensagem
        }]);
    } catch (err) {
        console.error("Falha silenciosa ao registrar log:", err);
    }
};

window.deleteTransaction = async function (id) {
    if (confirm('Tem certeza que deseja apagar este lançamento?')) {
        const t = transactions.find(x => x.id === id);
        if(!t) return;
        
        const labelItem = t.type === 'income' ? `Vistoria (${t.category} - ${t.placa||'Sem placa'})` : `Despesa (${t.category} - R$${t.amount})`;

        if(t.dbType === 'Receitas') {
            await window.supabaseClient.from('Receitas').delete().eq('id', id);
        } else if (t.dbType === 'Despesas') {
            await window.supabaseClient.from('Despesas').delete().eq('id', id);
        }

        await registrarLog("DELETAR", `O usuário apagou o registro de ${labelItem}`);

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

        await registrarLog("PAGAMENTO_BAIXADO", `A despesa "${t.category}" no valor de R$${t.amount} foi formalizada como PAGA.`);

        updateUI();
    }
};

window.addTransaction = async function(data) {
    const session = JSON.parse(localStorage.getItem('alfa_session') || '{}');
    const uId = session.id;

    // FLUXO DE ATUALIZAÇAO (EDIÇÃO)
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

            const labelItem = data.type === 'income' ? `Vistoria (${data.category} - ${data.placa||'s/placa'})` : `Despesa (${data.category})`;
            await registrarLog("ATUALIZAR", `Valores/Dados atualizados para o registro: ${labelItem}`);

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

    // FLUXO DE CRIAÇÃO (NOVO REGISTRO)
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

        const labelItem = data.type === 'income' ? `Vistoria (${data.category} - ${data.placa||'Sem placa'}) no valor R$${data.amountBruto}` : `Despesa (${data.category}) no valor R$${data.amount}`;
        await registrarLog("CRIAR", `Novo Lançamento cadastrado: ${labelItem}`);
    }

    if (data.date) {
        const dateStr = data.date.includes('T') ? data.date.split('T')[0] : data.date;
        localStorage.setItem('last_used_date', dateStr);
    }

    updateUI();
};
