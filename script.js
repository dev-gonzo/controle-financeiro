import { 
    initFirebase, 
    loginWithGoogle, 
    logout, 
    subscribeToAuthChanges, 
    getCurrentUser 
} from './auth.js';

import { 
    logDebug, 
    showToast, 
    toggleLoginState, 
    setLoadingButton,
    showLoadingOverlay
} from './ui.js';

// --- Configuração e Estado Global ---
const URL_API = 'https://script.google.com/macros/s/AKfycbz19NG0r6qMo3aoch8GmBsjZYlAlnAIEN2NzAi0UfjWWUBoqRolsgAH_w_iuCeRxj19/exec';

let dadosGlobais = [];
let estadoFiltro = {
    colunaOrdenacao: null,
    ordemAsc: true
};

// --- Inicialização ---

window.addEventListener('DOMContentLoaded', () => {
    logDebug("DOM pronto. Iniciando Auth...");
    
    // Mostra loading inicial para evitar flash de conteúdo
    showLoadingOverlay(true);

    // Inicializa Firebase
    initFirebase();

    // 2. Escuta mudanças de estado (Login/Logout/Persistência)
    subscribeToAuthChanges(
        (user) => {
            logDebug("Usuário autenticado: " + user.email);
            toggleLoginState(true, user);
            inicializarApp();
            showLoadingOverlay(false);
        },
        () => {
            logDebug("Usuário não autenticado.");
            toggleLoginState(false);
            showLoadingOverlay(false);
        }
    );

    // Timeout de segurança para o Loading (caso o Firebase demore muito ou falhe silenciosamente)
    setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay && overlay.style.display !== 'none') {
            logDebug("Timeout de carregamento. Forçando liberação da UI.");
            showLoadingOverlay(false);
        }
    }, 8000); // 8 segundos
});

// --- Event Listeners de Auth ---

const btnLoginGoogle = document.getElementById('btnLoginGoogle');
if (btnLoginGoogle) {
    btnLoginGoogle.addEventListener('click', () => {
        setLoadingButton('btnLoginGoogle', true);
        // showLoadingOverlay(true); // Opcional com popup, mas bom para feedback visual
        loginWithGoogle()
            .then((user) => {
                logDebug("Login popup sucesso: " + user.email);
                showToast("Login realizado com sucesso!");
                // O subscribeToAuthChanges vai lidar com a atualização da UI
            })
            .catch(err => {
                setLoadingButton('btnLoginGoogle', false);
                showLoadingOverlay(false);
                showToast("Erro ao iniciar login: " + err.message, 'error');
            });
    });
}

const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        if (confirm("Deseja realmente sair?")) {
            showLoadingOverlay(true);
            logout().then(() => {
                showToast("Logout realizado com sucesso!");
                // O onAuthStateChanged cuidará da UI e do loading
            }).catch(err => {
                showLoadingOverlay(false);
                showToast("Erro ao sair: " + err.message, 'error');
            });
        }
    });
}

// --- Lógica da Aplicação ---

function inicializarApp() {
    // Carrega o mês atual automaticamente se ainda não foi carregado
    const inputMes = document.getElementById('filtroMes');
    if (inputMes && !inputMes.value) {
        const hoje = new Date();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = hoje.getFullYear();
        inputMes.value = `${ano}-${mes}`;
    }
    
    // Executa a consulta inicial
    consultarFluxo();
    carregarOpcoesPagamento();

    // Configura data padrão no modal de lançamento
    const modalLancamentoEl = document.getElementById('modalLancamento');
    if (modalLancamentoEl) {
        modalLancamentoEl.addEventListener('show.bs.modal', () => {
            const inputData = document.getElementById('data');
            if (inputData) {
                const hoje = new Date();
                const ano = hoje.getFullYear();
                const mes = String(hoje.getMonth() + 1).padStart(2, '0');
                const dia = String(hoje.getDate()).padStart(2, '0');
                inputData.value = `${ano}-${mes}-${dia}`;
            }
        });
    }
}

async function consultarFluxo() {
    const mesRef = document.getElementById('filtroMes').value; // Formato "YYYY-MM"
    if (!mesRef) return; 

    const tbody = document.getElementById('tabelaCorpo');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center">Carregando...</td></tr>';

    try {
        const response = await fetch(`${URL_API}?acao=consultarFluxoPorMes&mes=${mesRef}`);
        
        if (!response.ok) throw new Error("Erro na rede: " + response.status);
        
        const dados = await response.json();

        if (dados.error) throw new Error(dados.error);

        dadosGlobais = dados;
        
        preencherFiltroCategoria(dados);
        aplicarFiltros();
    } catch (error) {
        console.error("Erro na consulta:", error);
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar dados: ${error.message}</td></tr>`;
    }
}

// Form Submission
const formFluxo = document.getElementById('formFluxo');
if (formFluxo) {
    formFluxo.addEventListener('submit', function(e) {
        e.preventDefault();
        const btn = document.getElementById('btnEnviar');
        
        // UI Loading
        if (btn) {
            btn.disabled = true;
            btn.innerText = "Enviando...";
        }

        // Formatação
        const dataInput = document.getElementById('data').value;
        // Envia a data no formato YYYY-MM-DD (ISO) para facilitar filtros no Sheets
        const dataFormatada = dataInput; 

        const valorInput = document.getElementById('valor').value;
        const valorFormatado = valorInput.replace('.', ',');

        const user = getCurrentUser();
        
        const payload = {
            acao: "cadastrarFluxo",
            data: dataFormatada,
            categoria: document.getElementById('categoria').value,
            descricao: document.getElementById('descricao').value,
            tipo: document.getElementById('tipo').value,
            valor: valorFormatado,
            pagamento: document.getElementById('pagamento').value,
            user_email: user ? user.email : 'anonymous'
        };

        fetch(URL_API, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(() => {
            // @ts-ignore
            const modalLancamento = bootstrap.Modal.getInstance(document.getElementById('modalLancamento'));
            if (modalLancamento) modalLancamento.hide();

            // @ts-ignore
            const successModal = new bootstrap.Modal(document.getElementById('successModal'));
            successModal.show();
            
            formFluxo.reset();
            consultarFluxo();
        })
        .catch(err => {
            alert('Erro ao enviar: ' + err);
        })
        .finally(() => {
            if (btn) {
                btn.disabled = false;
                btn.innerText = "Lançar no Fluxo";
            }
        });
    });
}

// --- Funções Auxiliares de Tabela (Mantidas do original) ---

function preencherFiltroCategoria(dados) {
    const selectDesktop = document.getElementById('filtroCategoria');
    const selectMobile = document.getElementById('filtroCategoriaMobile');
    
    if (!selectDesktop) return;

    const valorAtual = selectDesktop.value;
    const categorias = [...new Set(dados.map(linha => linha[1]))].sort();
    
    // Popula Desktop
    selectDesktop.innerHTML = '<option value="">Todas</option>';
    categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.innerText = cat;
        selectDesktop.appendChild(option);
    });

    if (categorias.includes(valorAtual)) {
        selectDesktop.value = valorAtual;
    }

    // Popula Mobile (se existir)
    if (selectMobile) {
        selectMobile.innerHTML = '<option value="">Todas</option>';
        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.innerText = cat;
            selectMobile.appendChild(option);
        });
        selectMobile.value = selectDesktop.value;
    }
}

function sincronizarFiltros(origem, valor) {
    // Sincroniza filtros entre Desktop e Mobile
    const filtroCatDesktop = document.getElementById('filtroCategoria');
    const filtroCatMobile = document.getElementById('filtroCategoriaMobile');
    const filtroTipoDesktop = document.getElementById('filtroTipo');
    const filtroTipoMobile = document.getElementById('filtroTipoMobile');

    if (origem === 'categoria') {
        if (filtroCatDesktop) filtroCatDesktop.value = valor;
        if (filtroCatMobile) filtroCatMobile.value = valor;
    } else if (origem === 'tipo') {
        if (filtroTipoDesktop) filtroTipoDesktop.value = valor;
        if (filtroTipoMobile) filtroTipoMobile.value = valor;
    }

    aplicarFiltros();
}

// Expor para o HTML
window.sincronizarFiltros = sincronizarFiltros;
window.ordenarTabela = ordenarTabela;
window.aplicarFiltros = aplicarFiltros;
window.consultarFluxo = consultarFluxo;

function aplicarFiltros() {
    const catFiltro = document.getElementById('filtroCategoria').value;
    const tipoFiltro = document.getElementById('filtroTipo').value;

    let dadosFiltrados = dadosGlobais.filter(linha => {
        const catMatch = catFiltro === "" || linha[1] === catFiltro;
        const tipoMatch = tipoFiltro === "" || linha[3] === tipoFiltro;
        return catMatch && tipoMatch;
    });

    if (estadoFiltro.colunaOrdenacao !== null) {
        dadosFiltrados.sort((a, b) => {
            let valA = a[estadoFiltro.colunaOrdenacao];
            let valB = b[estadoFiltro.colunaOrdenacao];
            
            if (estadoFiltro.colunaOrdenacao === 4) {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
            }
            else if (estadoFiltro.colunaOrdenacao === 0) {
                valA = new Date(valA);
                valB = new Date(valB);
            }
            else {
                valA = valA.toString().toLowerCase();
                valB = valB.toString().toLowerCase();
            }

            if (valA < valB) return estadoFiltro.ordemAsc ? -1 : 1;
            if (valA > valB) return estadoFiltro.ordemAsc ? 1 : -1;
            return 0;
        });
    }

    renderizarTabela(dadosFiltrados);
}

function ordenarTabela(colunaIndex) {
    if (estadoFiltro.colunaOrdenacao === colunaIndex) {
        estadoFiltro.ordemAsc = !estadoFiltro.ordemAsc;
    } else {
        estadoFiltro.colunaOrdenacao = colunaIndex;
        estadoFiltro.ordemAsc = true;
    }
    aplicarFiltros();
}

function renderizarTabela(dados) {
    const tbody = document.getElementById('tabelaCorpo');
    const listaMobile = document.getElementById('lista-mobile'); // Container Mobile
    const txtRec = document.getElementById('totalReceitas');
    const txtDes = document.getElementById('totalDespesas');
    const txtSal = document.getElementById('saldoFinal');

    if (!tbody) return;

    let htmlDesktop = "";
    let htmlMobile = "";
    let rec = 0;
    let des = 0;

    if (dados.length === 0) {
        const emptyMsg = 'Nenhum lançamento encontrado.';
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">${emptyMsg}</td></tr>`;
        if (listaMobile) listaMobile.innerHTML = `<div class="text-center text-muted py-4">${emptyMsg}</div>`;
        
        if (txtRec) txtRec.innerText = "R$ 0,00";
        if (txtDes) txtDes.innerText = "R$ 0,00";
        if (txtSal) {
            txtSal.innerText = "R$ 0,00";
            txtSal.className = "text-end mb-0 mt-1 fw-bold";
        }
        return;
    }

    dados.forEach(linha => {
        const valor = parseFloat(linha[4]);
        const isReceita = linha[3] === "Receita";
        const valorFormatado = valor.toLocaleString('pt-BR', {minimumFractionDigits: 2});
        const dataFormatada = new Date(linha[0]).toLocaleDateString('pt-BR');
        
        if (isReceita) rec += valor; else des += valor;

        // Desktop Row
        htmlDesktop += `
            <tr>
                <td>${dataFormatada}</td>
                <td>${linha[1]}</td>
                <td>${linha[2]}</td>
                <td><span class="badge ${isReceita ? 'bg-success' : 'bg-danger'}">${linha[3]}</span></td>
                <td class="text-end">R$ ${valorFormatado}</td>
            </tr>
        `;

        // Mobile Card
        htmlMobile += `
            <div class="card mb-3 shadow-sm border-0">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge ${isReceita ? 'bg-success' : 'bg-danger'}">${linha[3]}</span>
                        <span class="fw-bold ${isReceita ? 'text-success' : 'text-danger'}">R$ ${valorFormatado}</span>
                    </div>
                    <div class="mb-1">
                        <strong class="text-dark">${linha[1]}</strong>
                        <span class="text-muted small ms-1">• ${dataFormatada}</span>
                    </div>
                    <p class="card-text text-secondary mb-0 text-truncate" style="max-width: 100%;">
                        ${linha[2]}
                    </p>
                </div>
            </div>
        `;
    });

    tbody.innerHTML = htmlDesktop;
    if (listaMobile) listaMobile.innerHTML = htmlMobile;

    if (txtRec) txtRec.innerText = `R$ ${rec.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    if (txtDes) txtDes.innerText = `R$ ${des.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    
    const saldo = rec - des;
    if (txtSal) {
        txtSal.innerText = `R$ ${saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        txtSal.className = `text-end mb-0 mt-1 fw-bold ${saldo >= 0 ? "text-primary" : "text-danger"}`;
    }
}

// --- Funções de Navegação ---
function navegarPara(tela) {
    const fluxoView = document.getElementById('fluxo-view');
    const pagamentosView = document.getElementById('pagamentos-view');
    const menuFluxo = document.getElementById('menuFluxo');
    const menuPagamentos = document.getElementById('menuPagamentos');
    const offcanvasEl = document.getElementById('offcanvasMenu');

    // Esconde todas
    if (fluxoView) fluxoView.classList.add('d-none');
    if (pagamentosView) pagamentosView.classList.add('d-none');
    
    // Tira active dos menus
    if (menuFluxo) menuFluxo.classList.remove('active');
    if (menuPagamentos) menuPagamentos.classList.remove('active');

    if (tela === 'fluxo') {
        if (fluxoView) fluxoView.classList.remove('d-none');
        if (menuFluxo) menuFluxo.classList.add('active');
    } else if (tela === 'pagamentos') {
        if (pagamentosView) pagamentosView.classList.remove('d-none');
        if (menuPagamentos) menuPagamentos.classList.add('active');
        listarPagamentos();
    }

    // Fecha o menu lateral (mobile)
    // @ts-ignore
    const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
    if (offcanvas) offcanvas.hide();
}

window.navegarPara = navegarPara;

// --- Funcionalidades de Pagamento ---

const CACHE_PAGAMENTOS_KEY = 'financas_pagamentos_v1';

function salvarPagamentosLocal(dados) {
    try {
        localStorage.setItem(CACHE_PAGAMENTOS_KEY, JSON.stringify(dados));
    } catch (e) {
        console.error("Erro ao salvar cache pagamentos:", e);
    }
}

function lerPagamentosLocal() {
    try {
        const dados = localStorage.getItem(CACHE_PAGAMENTOS_KEY);
        return dados ? JSON.parse(dados) : null;
    } catch (e) {
        console.error("Erro ao ler cache pagamentos:", e);
        return null;
    }
}

// Função genérica para buscar pagamentos da API
async function buscarDadosPagamentos() {
    try {
        const response = await fetch(`${URL_API}?acao=listarPagamentos`);
        if (!response.ok) throw new Error("Erro na rede: " + response.status);
        
        const dados = await response.json();
        if (dados.error) throw new Error(dados.error);
        
        return dados;
    } catch (error) {
        throw error;
    }
}

// Popula o select de formas de pagamento no modal de lançamento
async function carregarOpcoesPagamento() {
    const select = document.getElementById('pagamento');
    if (!select) return;

    const renderizar = (dados) => {
        select.innerHTML = '<option value="" selected disabled>Selecione...</option>';
        if (dados && dados.length > 0) {
            dados.forEach(linha => {
                const [tipo, banco, descricao, status] = linha;
                if (status === 'Ativo') {
                    const option = document.createElement('option');
                    const textoDisplay = descricao ? `${tipo} - ${banco} (${descricao})` : `${tipo} - ${banco}`;
                    option.value = textoDisplay;
                    option.textContent = textoDisplay;
                    select.appendChild(option);
                }
            });
        }
        
        if (select.options.length === 1) { 
             const option = document.createElement('option');
             option.text = "Nenhuma forma ativa encontrada";
             option.disabled = true;
             select.appendChild(option);
        }
    };

    // 1. Tenta carregar do cache
    const dadosCache = lerPagamentosLocal();
    if (dadosCache) {
        renderizar(dadosCache);
    } else {
        select.innerHTML = '<option selected disabled>Carregando...</option>';
    }

    // 2. Busca da rede e atualiza
    try {
        const dados = await buscarDadosPagamentos();
        salvarPagamentosLocal(dados);
        renderizar(dados);
    } catch (error) {
        console.error("Erro ao carregar opções de pagamento:", error);
        if (!dadosCache) {
            select.innerHTML = '<option selected disabled>Erro ao carregar</option>';
        }
    }
}

async function listarPagamentos() {
    const tbody = document.getElementById('tabelaPagamentosBody');
    if (!tbody) return;
    
    const renderizar = (dados) => {
        let html = "";
        if (dados && dados.length > 0) {
            dados.forEach(linha => {
                html += `
                    <tr>
                        <td>${linha[0] || '-'}</td>
                        <td>${linha[1] || '-'}</td>
                        <td>${linha[2] || '-'}</td>
                        <td><span class="badge ${linha[3] === 'Ativo' ? 'bg-success' : 'bg-danger'}">${linha[3] || 'Inativo'}</span></td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        } else {
             tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhuma forma de pagamento cadastrada.</td></tr>';
        }
    };

    // 1. Cache
    const dadosCache = lerPagamentosLocal();
    if (dadosCache) {
        renderizar(dadosCache);
    } else {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Carregando...</td></tr>';
    }

    // 2. Rede
    try {
        const dados = await buscarDadosPagamentos();
        salvarPagamentosLocal(dados);
        renderizar(dados);
    } catch (error) {
        logDebug("Erro Pagamentos: " + error.message);
        if (!dadosCache) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Erro: ${error.message}</td></tr>`;
        }
    }
}

const formCadastroPagamento = document.getElementById('formCadastroPagamento');
if (formCadastroPagamento) {
    formCadastroPagamento.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const btn = e.target.querySelector('button[type="submit"]');
        if (btn) {
            btn.disabled = true;
            btn.innerText = "Salvando...";
        }

        const payload = {
            acao: "cadastrarPagamento",
            tipo: document.getElementById('pag_tipo').value,
            banco: document.getElementById('pag_banco').value,
            descricao: document.getElementById('pag_descricao').value,
            status: document.getElementById('pag_status').value
        };

        try {
            await fetch(URL_API, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            showToast("Forma de pagamento cadastrada!");
            this.reset();
            
            // Fecha o modal
            // @ts-ignore
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalPagamento'));
            if (modal) modal.hide();

            // Atualiza a lista
            listarPagamentos();
            carregarOpcoesPagamento();
            
        } catch (error) {
            showToast("Erro ao salvar: " + error, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerText = "Salvar Forma de Pagamento";
            }
        }
    });
}

// --- Expor para o Window (Necessário para onclick no HTML) ---
window.consultarFluxo = consultarFluxo;
window.ordenarTabela = ordenarTabela;
window.aplicarFiltros = aplicarFiltros;
