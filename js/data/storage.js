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
                    observacao: r.observacao,
                    createdAt: r.created_at || r.date
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
                    observacao: d.observacao,
                    createdAt: d.created_at || d.date
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

window.importBackup = async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const session = JSON.parse(localStorage.getItem('alfa_session') || '{}');
    const uId = session.id;
    if(!uId) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (!Array.isArray(imported)) {
                alert("Arquivo de backup inválido.");
                return;
            }

            const substituir = confirm(`Deseja restaurar ${imported.length} registros para a nuvem? \n\n[OK] para APAGAR TODO o banco atual e ficar apenas com este arquivo.\n[Cancelar] para MANTER o que já está na nuvem e apenas ACRESCENTAR esses do arquivo ao sistema.`);

            // Prepara separação garantindo ids novos gerados pela nuvem
            const novasReceitas = [];
            const novasDespesas = [];

            imported.forEach(t => {
                let payload = { ...t, user_id: uId };
                // Limpa campos internos para não conflitar com banco online
                delete payload.id; 
                delete payload.dbType;
                delete payload.createdAt;
                delete payload.type;

                // Restaura os fallbacks em caso de json muito cru (legado offline)
                if (t.type === 'income') {
                    if(!payload.amountLiquido) payload.amountLiquido = payload.amountBruto || payload.amount || 0;
                    if(!payload.amountBruto) payload.amountBruto = payload.amount || 0;
                    if(!payload.amount) payload.amount = payload.amountBruto || 0;
                    if(!payload.placa) payload.placa = 'Sem placa'; 
                    if(!payload.category) payload.category = 'Outros'; 
                    if(!payload.date) payload.date = new Date().toISOString().split('T')[0];
                    novasReceitas.push(payload);
                } else if (t.type === 'expense') {
                    if(!payload.status) payload.status = 'Pago';
                    if(!payload.vencimento) payload.vencimento = payload.date || new Date().toISOString().split('T')[0];
                    if(!payload.description) payload.description = 'Registro legado importado';
                    if(!payload.amount) payload.amount = 0;
                    if(!payload.category) payload.category = 'Outros';
                    if(!payload.date) payload.date = new Date().toISOString().split('T')[0];
                    novasDespesas.push(payload);
                }
            });

            // Mostramos um status provisório
            document.body.style.cursor = 'wait';

            // Limpa base existente
            if (substituir) {
                await window.supabaseClient.from('Receitas').delete().eq('user_id', uId);
                await window.supabaseClient.from('Despesas').delete().eq('user_id', uId);
            }

            // Insere blocos massivos
            if(novasReceitas.length > 0) {
                const {error: err1} = await window.supabaseClient.from('Receitas').insert(novasReceitas);
                if(err1) throw err1;
            }
            if(novasDespesas.length > 0) {
                const {error: err2} = await window.supabaseClient.from('Despesas').insert(novasDespesas);
                if(err2) throw err2;
            }

            // Avisa, limpa cache forçado e recarrega tela
            alert("Backup sincronizado e enviado para a nuvem Supabase com sucesso!");
            
            if(window.registrarLog) {
                await window.registrarLog("IMPORTAR_BACKUP", `Restauração Massiva em arquivo: ${imported.length} registros foram importados ao sistema.`);
            }

            await window.loadTransactions();
            window.updateUI();

        } catch (err) {
            alert("Erro fatal durante importação: " + err.message);
            console.error(err);
        } finally {
            document.body.style.cursor = 'default';
            event.target.value = '';
        }
    };
    reader.readAsText(file);
};
