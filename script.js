// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Sistema de Log Visual para Mobile
const debugConsole = document.getElementById('debug-console');
function logDebug(msg, isError = false) {
    console.log(msg);
    if (debugConsole) {
        debugConsole.style.display = 'block';
        const line = document.createElement('div');
        line.textContent = `> ${msg}`;
        if (isError) line.style.color = 'red';
        debugConsole.appendChild(line);
        debugConsole.scrollTop = debugConsole.scrollHeight;
    }
}

// Tratamento global de erros
window.onerror = function(msg, url, lineNo, columnNo, error) {
    logDebug(`Global Error: ${msg} (${lineNo}:${columnNo})`, true);
    return false;
};

logDebug("Script iniciado...");

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBb1Tp9duLgxojLxIIzrj_zOEDOQkv_-SI",
    authDomain: "controle-financeiro-a9138.firebaseapp.com",
    projectId: "controle-financeiro-a9138",
    storageBucket: "controle-financeiro-a9138.firebasestorage.app",
    messagingSenderId: "1000821412376",
    appId: "1:1000821412376:web:800ac9f65916069325296d"
};

// Initialize Firebase
let app, auth, provider;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    provider = new GoogleAuthProvider();
    logDebug("Firebase inicializado com sucesso.");
} catch (e) {
    logDebug("Erro fatal ao inicializar Firebase: " + e.message, true);
}

// Elementos da UI
const loginScreen = document.getElementById('login-screen');
const appContent = document.getElementById('app-content');
const btnLoginGoogle = document.getElementById('btnLoginGoogle');
const btnLogout = document.getElementById('btnLogout');
const userEmailSpan = document.getElementById('userEmail');

// Função para exibir Toast de erro
function showErrorToast(message) {
    const toastEl = document.getElementById('errorToast');
    const toastBody = document.getElementById('errorToastBody');
    if (toastEl && toastBody) {
        toastBody.textContent = message;
        logDebug("Toast Erro: " + message, true);
        // @ts-ignore
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    } else {
        logDebug("Toast Error (fallback alert): " + message, true);
        alert(message);
    }
}

// Função para exibir Toast de sucesso
function showSuccessToast(message) {
    const toastEl = document.getElementById('successToast');
    const toastBody = document.getElementById('successToastBody');
    if (toastEl && toastBody) {
        toastBody.textContent = message;
        logDebug("Toast Sucesso: " + message);
        // @ts-ignore
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }
}

// Monitorar estado de autenticação
logDebug("Registrando observer de Auth...");
onAuthStateChanged(auth, (user) => {
    logDebug("onAuthStateChanged disparado. User: " + (user ? user.email : "null"));
    if (user) {
        // Usuário logado
        console.log("Usuário logado:", user.email);
        
        // Atualiza UI
        userEmailSpan.textContent = user.email;
        loginScreen.classList.add('d-none');
        appContent.classList.remove('d-none');
        
        // Forçar display via style caso classList falhe por algum motivo
        loginScreen.style.display = 'none';
        appContent.style.display = 'block';

        // Iniciar app
        inicializarApp();
    } else {
        // Usuário deslogado
        console.log("Usuário deslogado");
        
        // Atualiza UI
        loginScreen.classList.remove('d-none');
        appContent.classList.add('d-none');

        // Forçar display
        loginScreen.style.display = 'flex'; // login-container usa flex
        appContent.style.display = 'none';
    }
});

// Login com Google
btnLoginGoogle.addEventListener('click', () => {
    logDebug("Botão de login clicado.");
    
    // Feedback visual simples
    btnLoginGoogle.textContent = "Carregando...";
    btnLoginGoogle.disabled = true;

    // Em ambiente mobile/PWA, signInWithRedirect costuma ser mais confiável
    // Vamos tentar forçar o redirect se estivermos em mobile (detecção simples)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    logDebug("Ambiente Mobile? " + isMobile);
    
    if (isMobile) {
        logDebug("Iniciando signInWithRedirect...");
        signInWithRedirect(auth, provider)
            .then(() => {
                 logDebug("Redirect iniciado com sucesso (a página deve recarregar).");
            })
            .catch((error) => {
                logDebug("Erro no Redirect: " + error.message, true);
                showErrorToast("Erro ao iniciar login: " + error.message);
                btnLoginGoogle.textContent = "Entrar com Google";
                btnLoginGoogle.disabled = false;
            });
    } else {
        logDebug("Iniciando signInWithPopup...");
        // Desktop: Tenta Popup primeiro
        signInWithPopup(auth, provider)
            .then((result) => {
                console.log("Login via Popup sucesso:", result.user);
                showSuccessToast("Login realizado com sucesso!");
            })
            .catch((error) => {
                console.error("Erro no Popup:", error);
                if (error.code === 'auth/popup-closed-by-user') {
                    showErrorToast("Login cancelado (janela fechada).");
                } else {
                    showErrorToast(`Erro no Popup: ${error.message} (${error.code}). Tentando fallback...`);
                    // Se falhar, tenta redirect
                    console.log("Tentando fallback para Redirect...");
                    signInWithRedirect(auth, provider);
                }
            })
            .finally(() => {
                // Restaura botão em caso de erro no popup que não redirecionou
                 setTimeout(() => {
                    if (!auth.currentUser) {
                        btnLoginGoogle.textContent = "Entrar com Google";
                        btnLoginGoogle.disabled = false;
                    }
                 }, 3000);
            });
    }
});

// Verificar resultado do redirecionamento (caso tenha voltado do login)
logDebug("Verificando getRedirectResult...");
getRedirectResult(auth)
    .then((result) => {
        logDebug("getRedirectResult finalizado. User: " + (result ? result.user.email : "Nenhum resultado de redirect"));
        if (result) {
            // O usuário acabou de logar via redirecionamento
            showSuccessToast("Login via redirect sucesso!");
        }
    })
    .catch((error) => {
        logDebug("Erro no getRedirectResult: " + error.message, true);
        
        let msg = "Erro ao processar login via redirecionamento.";
        if (error.code) msg += ` Código: ${error.code}`;
        if (error.message) msg += ` Detalhes: ${error.message}`;
        
        showErrorToast(msg);
        
        btnLoginGoogle.textContent = "Entrar com Google";
        btnLoginGoogle.disabled = false;
    });

// Logout
btnLogout.addEventListener('click', () => {
    signOut(auth).then(() => {
        console.log("Logout realizado");
        showSuccessToast("Logout realizado com sucesso!");
    }).catch((error) => {
        console.error("Erro no logout:", error);
        showErrorToast("Erro ao sair: " + error.message);
    });
});


const URL_API = 'https://script.google.com/macros/s/AKfycbz19NG0r6qMo3aoch8GmBsjZYlAlnAIEN2NzAi0UfjWWUBoqRolsgAH_w_iuCeRxj19/exec';

let dadosGlobais = [];
let estadoFiltro = {
    colunaOrdenacao: null,
    ordemAsc: true
};

function inicializarApp() {
    // Carrega o mês atual automaticamente se ainda não foi carregado
    const inputMes = document.getElementById('filtroMes');
    if (!inputMes.value) {
        const hoje = new Date();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = hoje.getFullYear();
        inputMes.value = `${ano}-${mes}`;
    }
    
    // Executa a consulta inicial
    consultarFluxo();
}

// Expor funções para o escopo global (window) pois o módulo isola o escopo
window.consultarFluxo = consultarFluxo;
window.ordenarTabela = ordenarTabela;
window.aplicarFiltros = aplicarFiltros;

document.getElementById('formFluxo').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnEnviar');
    btn.disabled = true;
    btn.innerText = "Enviando...";

    // Formatação da Data (aaaa-mm-dd -> dd/mm/aaaa)
    const dataInput = document.getElementById('data').value;
    let dataFormatada = dataInput;
    if (dataInput) {
        const [ano, mes, dia] = dataInput.split('-');
        dataFormatada = `${dia}/${mes}/${ano}`;
    }

    // Formatação do Valor (trocar ponto por vírgula)
    const valorInput = document.getElementById('valor').value;
    const valorFormatado = valorInput.replace('.', ',');

    // Adicionar info do usuário ao payload (opcional, se o backend suportar futuramente)
    const user = auth.currentUser;
    
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
        // Fecha o modal de lançamento
        // @ts-ignore
        const modalLancamento = bootstrap.Modal.getInstance(document.getElementById('modalLancamento'));
        if (modalLancamento) modalLancamento.hide();

        // Abre o Modal de Sucesso
        // @ts-ignore
        const successModal = new bootstrap.Modal(document.getElementById('successModal'));
        successModal.show();
        
        // Reseta o formulário
        document.getElementById('formFluxo').reset();

        // Recarrega a consulta para mostrar o novo lançamento
        consultarFluxo();
    })
    .catch(err => alert('Erro ao enviar: ' + err))
    .finally(() => {
        btn.disabled = false;
        btn.innerText = "Lançar no Fluxo";
    });
});

async function consultarFluxo() {
    const mesRef = document.getElementById('filtroMes').value; // Formato "YYYY-MM"
    if (!mesRef) return; // Não faz nada se não tiver mês selecionado

    const tbody = document.getElementById('tabelaCorpo');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Carregando...</td></tr>';

    try {
        // Chama o doGet passando a acao e o mes
        const response = await fetch(`${URL_API}?acao=consultarFluxoPorMes&mes=${mesRef}`);
        const dados = await response.json();

        dadosGlobais = dados;
        
        // Preenche o filtro de categorias
        preencherFiltroCategoria(dados);
        
        // Aplica filtros e renderiza
        aplicarFiltros();
    } catch (error) {
        console.error("Erro na consulta:", error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erro ao carregar dados.</td></tr>';
    }
}

function preencherFiltroCategoria(dados) {
    const select = document.getElementById('filtroCategoria');
    // Salva a seleção atual caso exista
    const valorAtual = select.value;
    
    // Obtém categorias únicas (coluna index 1)
    const categorias = [...new Set(dados.map(linha => linha[1]))].sort();
    
    // Limpa e recria opções
    select.innerHTML = '<option value="">Todas</option>';
    categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.innerText = cat;
        select.appendChild(option);
    });

    // Restaura seleção se ainda existir na lista
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
            
            // Trata ordenação de números (coluna 4 é valor)
            if (estadoFiltro.colunaOrdenacao === 4) {
                // Remove R$ e converte vírgula para ponto se necessário, mas aqui os dados vêm da API (provavelmente numéricos ou strings formatadas)
                // A API parece retornar arrays de valores. Se vier como string "1.000,00", precisa tratar.
                // No código original, linha 196: parseFloat(linha[4]).
                // Assumindo que linha[4] é string/number conversível.
                valA = parseFloat(valA);
                valB = parseFloat(valB);
            }
            // Trata ordenação de datas (coluna 0)
            else if (estadoFiltro.colunaOrdenacao === 0) {
                valA = new Date(valA);
                valB = new Date(valB);
            }
            // Strings
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

    let html = "";
    let rec = 0;
    let des = 0;

    if (dados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum lançamento encontrado.</td></tr>';
        txtRec.innerText = "R$ 0,00";
        txtDes.innerText = "R$ 0,00";
        txtSal.innerText = "R$ 0,00";
        txtSal.className = "text-end mb-0 mt-1 fw-bold";
        return;
    }

    dados.forEach(linha => {
        // linha[0]=Data, linha[1]=Categoria, linha[2]=Descricao, linha[3]=Tipo, linha[4]=Valor
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
    txtRec.innerText = `R$ ${rec.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    txtDes.innerText = `R$ ${des.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    
    const saldo = rec - des;
    txtSal.innerText = `R$ ${saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    txtSal.className = `text-end mb-0 mt-1 fw-bold ${saldo >= 0 ? "text-primary" : "text-danger"}`;
}
