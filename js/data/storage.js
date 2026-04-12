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

window.exportBackup = async function () {
    if (transactions.length === 0) {
        alert("Não há dados para fazer backup.");
        return;
    }

    const dataStr = JSON.stringify(transactions, null, 2);
    const fileName = `backup_financeiro_alfa_${new Date().toISOString().split('T')[0]}.json`;

    try {
        if ('showSaveFilePicker' in window) {
            // Modern File System Access API
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
        } else {
            // Fallback
            alert("Seu navegador não suporta a escolha de pasta e fará o download direto.");
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
