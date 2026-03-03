const URL_API = 'https://script.google.com/macros/s/AKfycbz19NG0r6qMo3aoch8GmBsjZYlAlnAIEN2NzAi0UfjWWUBoqRolsgAH_w_iuCeRxj19/exec';

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

    const payload = {
        data: dataFormatada,
        categoria: document.getElementById('categoria').value,
        descricao: document.getElementById('descricao').value,
        tipo: document.getElementById('tipo').value,
        valor: valorFormatado,
        pagamento: document.getElementById('pagamento').value
    };

    fetch(URL_API, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(() => {
        // Abre o Modal ao invés de alert
        const successModal = new bootstrap.Modal(document.getElementById('successModal'));
        successModal.show();
        
        // Reseta o formulário
        document.getElementById('formFluxo').reset();
    })
    .catch(err => alert('Erro ao enviar: ' + err))
    .finally(() => {
        btn.disabled = false;
        btn.innerText = "Lançar no Fluxo";
    });
});
