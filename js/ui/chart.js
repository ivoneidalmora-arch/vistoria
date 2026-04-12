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
