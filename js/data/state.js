// State Variables
let transactions = [];
let financeChartInstance = null;
let editingTransactionId = null;

// Paginação e Busca
let currentPage = 1;
const ITEMS_PER_PAGE = 30;
let searchPlaca = "";
let searchCliente = "";
let searchDespesa = "";
