window.loadTransactions = async function () {
    const sessionStr = localStorage.getItem('alfa_session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);
    const uId = session.id;

    try {
        const [{ data: recData, error: recErr }, { data: despData, error: despErr }] = await Promise.all([
            window.supabaseClient.from('Receitas').select('*').eq('user_id', uId),
            window.supabaseClient.from('Despesas').select('*').eq('user_id', uId)
        ]);

        if (recErr) console.error("Erro lendo Receitas:", recErr);
        if (despErr) console.error("Erro lendo Despesas:", despErr);

        let tempTransactions = [];

        if (recData) {
            recData.forEach(r => {
                tempTransactions.push({
                    id: r.id, // Supabase ID
                    dbType: 'Receitas',
                    type: 'income',
                    category: r.category,
                    placa: r.placa,
                    cliente: r.cliente,
                    nf: r.nf,
                    pagamento: r.pagamento,
                    amountBruto: parseFloat(r.amountBruto),
                    amountLiquido: parseFloat(r.amountLiquido),
                    amount: parseFloat(r.amount),
                    date: r.date,
                    observacao: r.observacao
                });
            });
        }

        if (despData) {
            despData.forEach(d => {
                tempTransactions.push({
                    id: d.id, // Supabase ID
                    dbType: 'Despesas',
                    type: 'expense',
                    category: d.category,
                    description: d.description,
                    amount: parseFloat(d.amount),
                    vencimento: d.vencimento,
                    status: d.status,
                    date: d.date,
                    observacao: d.observacao
                });
            });
        }

        transactions = tempTransactions;
        
        // Mantem um backup offline basico
        localStorage.setItem('vistoria_ecv_es_cache', JSON.stringify(transactions));

    } catch (e) {
        console.error("Falha ao puxar supabase, tentando cache fallback", e);
        const saved = localStorage.getItem('vistoria_ecv_es_cache');
        if (saved) {
            try { transactions = JSON.parse(saved); } catch (err) {}
        }
    }
}

// Removemos ou isolamos old functions porque agora tudo é nuvem sincronizado
window.saveTransactions = function () {
    // A logica agora é tratada diretamente no handlers.js p/ banco de dados online
    // Mantemos esse wrapper para nao quebrar UI functions que possam chamar.
};

window.clearData = async function () {
    if (confirm('Tem certeza que deseja apagar TODO o histórico ONLINE e LOCAL? Esta ação não pode ser desfeita.')) {
        const session = JSON.parse(localStorage.getItem('alfa_session') || '{}');
        
        await window.supabaseClient.from('Receitas').delete().eq('user_id', session.id);
        await window.supabaseClient.from('Despesas').delete().eq('user_id', session.id);
        
        transactions = [];
        localStorage.removeItem('vistoria_ecv_es_cache');
        updateUI();
    }
};

window.exportBackup = async function () {
    if (transactions.length === 0) {
        alert("Não há dados para fazer backup.");
        return;
    }
    const dataStr = JSON.stringify(transactions, null, 2);
    const fileName = `backup_nuvem_alfa_${new Date().toISOString().split('T')[0]}.json`;
    try {
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = fileName; link.click();
    } catch (err) {}
};

window.importBackup = function (event) {
    alert("Como conectamos o banco na nuvem Supabase, contate o administrador para fazer envios diretos (Mass Insert) se precisar resgatar backups antigos.");
};
