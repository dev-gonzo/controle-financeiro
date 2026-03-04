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

// Botão de Reparo (Reset)
const btnResetApp = document.getElementById('btnResetApp');
if (btnResetApp) {
    btnResetApp.addEventListener('click', async () => {
        if (confirm("Isso limpará o cache do app e fará logout. Continuar?")) {
            try {
                showLoadingOverlay(true);
                const cachesKeys = await caches.keys();
                await Promise.all(cachesKeys.map(key => caches.delete(key)));
                
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let reg of registrations) await reg.unregister();
                
                window.location.reload(true);
            } catch (e) {
                console.error("Erro ao resetar:", e);
                alert("Erro ao limpar dados: " + e.message);
                showLoadingOverlay(false);
            }
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
}

async function consultarFluxo() {
    const mesRef = document.getElementById('filtroMes').value; // Formato "YYYY-MM"
    if (!mesRef) return; 

    const tbody = document.getElementById('tabelaCorpo');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center">Carregando...</td></tr>';

    try {
        const response = await fetch(`${URL_API}?acao=consultarFluxoPorMes&mes=${mesRef}`);
        const dados = await response.json();

        dadosGlobais = dados;
        
        preencherFiltroCategoria(dados);
        aplicarFiltros();
    } catch (error) {
        console.error("Erro na consulta:", error);
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erro ao carregar dados.</td></tr>';
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
        let dataFormatada = dataInput;
        if (dataInput) {
            const [ano, mes, dia] = dataInput.split('-');
            dataFormatada = `${dia}/${mes}/${ano}`;
        }

        const valorInput = document.getElementById('valor').value;
        const valorFormatado = valorInput.replace('.', ',');

        const user = getCurrentUser();
        
        const payload = {
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
    const select = document.getElementById('filtroCategoria');
    if (!select) return;

    const valorAtual = select.value;
    const categorias = [...new Set(dados.map(linha => linha[1]))].sort();
    
    select.innerHTML = '<option value="">Todas</option>';
    categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.innerText = cat;
        select.appendChild(option);
    });

    if (categorias.includes(valorAtual)) {
        select.value = valorAtual;
    }
}

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
    const txtRec = document.getElementById('totalReceitas');
    const txtDes = document.getElementById('totalDespesas');
    const txtSal = document.getElementById('saldoFinal');

    if (!tbody) return;

    let html = "";
    let rec = 0;
    let des = 0;

    if (dados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum lançamento encontrado.</td></tr>';
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
        
        if (isReceita) rec += valor; else des += valor;

        html += `
            <tr>
                <td>${new Date(linha[0]).toLocaleDateString('pt-BR')}</td>
                <td>${linha[1]}</td>
                <td>${linha[2]}</td>
                <td><span class="badge ${isReceita ? 'bg-success' : 'bg-danger'}">${linha[3]}</span></td>
                <td class="text-end">R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    if (txtRec) txtRec.innerText = `R$ ${rec.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    if (txtDes) txtDes.innerText = `R$ ${des.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    
    const saldo = rec - des;
    if (txtSal) {
        txtSal.innerText = `R$ ${saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        txtSal.className = `text-end mb-0 mt-1 fw-bold ${saldo >= 0 ? "text-primary" : "text-danger"}`;
    }
}

// --- Expor para o Window (Necessário para onclick no HTML) ---
window.consultarFluxo = consultarFluxo;
window.ordenarTabela = ordenarTabela;
window.aplicarFiltros = aplicarFiltros;
