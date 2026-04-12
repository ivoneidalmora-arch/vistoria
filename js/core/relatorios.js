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
