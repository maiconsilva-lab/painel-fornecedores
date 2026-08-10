import { mutateTable } from './dataApi';

/* Handlers de produtos, extraídos do app/page.js. Não têm state próprio
   (usam sel/showModal compartilhados que continuam no componente principal
   — o RecordDrawer fecha o modal logo depois de qualquer ação aqui, então
   não precisa sincronizar sel de volta). */
export function useProdutosActions({ user, showToast, askConfirm, logAcao, applyRealtimeChange, sendEmail }) {
  const pegarProduto = async (id) => {
    const { row } = await mutateTable(user.id, 'produtos', 'update', { id, data: { atribuido_para: user.nome, status:'em_analise' }, returning: true });
    if (row) applyRealtimeChange('produtos', { eventType:'UPDATE', new: row });
    logAcao('atribuiu', 'produto', id, { para: user.nome });
  };

  const excluirProduto = (id) => {
    askConfirm('Excluir produto?', 'Esta ação não pode ser desfeita.', async () => {
      try {
        await mutateTable(user.id, 'produtos', 'delete', { id });
      } catch (err) { showToast('Erro ao excluir: ' + err.message); return; }
      applyRealtimeChange('produtos', { eventType:'DELETE', old: { id } });
      showToast('Produto excluído');
      logAcao('excluiu', 'produto', id);
    });
  };

  const concluirProduto = async (produto, codigoProtheus) => {
    if (!codigoProtheus || !codigoProtheus.trim()) {
      showToast('Informe o código Protheus do produto');
      return;
    }
    const upd = {
      status: 'aprovado',
      codigo_protheus: codigoProtheus.trim(),
      finalizado_por: user.nome,
      data_finalizacao: new Date().toISOString(),
    };
    let row;
    try {
      ({ row } = await mutateTable(user.id, 'produtos', 'update', { id: produto.id, data: upd, returning: true }));
    } catch (err) { showToast(`Erro: ${err.message}`); return; }
    applyRealtimeChange('produtos', { eventType:'UPDATE', new: row });

    const r = await sendEmail('produto_aprovado', {
      to_name: produto.nome_solicitante,
      to_email: produto.email_solicitante,
      titulo: 'Produto cadastrado no Protheus ✓',
      saudacao: 'O produto abaixo foi cadastrado com sucesso no Protheus.',
      destaque_label: 'CÓDIGO DO PRODUTO',
      destaque_valor: codigoProtheus.trim(),
      rodape_extra: `Descrição: ${(produto.descricao || '').slice(0,200)}${produto.finalidade ? `<br>Finalidade: ${produto.finalidade.slice(0,200)}` : ''}`,
    });
    if (r.ok) showToast('Produto cadastrado e e-mail enviado!');
    else showToast(`Produto cadastrado, mas e-mail falhou: ${r.error}`);

    logAcao('aprovou', 'produto', produto.id, { codigo_protheus: codigoProtheus.trim(), email_enviado: r.ok });
  };

  /* Conclui vários produtos de uma vez. `itens` = [{ produto, codigo }].
     Agrupa por e-mail do solicitante: cada solicitante recebe UM e-mail
     só, listando todos os produtos+códigos aprovados nesse lote — em vez
     de um e-mail separado por produto. */
  const concluirProdutosEmLote = async (itens) => {
    const validos = itens.filter(({ codigo }) => codigo && codigo.trim());
    if (validos.length === 0) { showToast('Informe o código Protheus de pelo menos um produto'); return { ok:false }; }

    const upds = [];
    for (const { produto, codigo } of validos) {
      const upd = {
        status: 'aprovado',
        codigo_protheus: codigo.trim(),
        finalizado_por: user.nome,
        data_finalizacao: new Date().toISOString(),
      };
      try {
        const { row } = await mutateTable(user.id, 'produtos', 'update', { id: produto.id, data: upd, returning: true });
        applyRealtimeChange('produtos', { eventType:'UPDATE', new: row });
        upds.push({ produto, codigo: codigo.trim(), ok:true });
      } catch (err) {
        upds.push({ produto, codigo: codigo.trim(), ok:false, error: err.message });
      }
    }

    const aprovados = upds.filter(u => u.ok);
    const porSolicitante = new Map();
    for (const item of aprovados) {
      const email = (item.produto.email_solicitante || '').trim();
      if (!email) continue;
      if (!porSolicitante.has(email)) porSolicitante.set(email, { nome: item.produto.nome_solicitante || 'Solicitante', itens: [] });
      porSolicitante.get(email).itens.push(item);
    }

    let emailsOk = 0, emailsFalha = 0;
    for (const [email, grupo] of porSolicitante) {
      const listaTexto = grupo.itens.map(i => `${i.produto.descricao || 'Produto'} — Código: ${i.codigo}`).join('  •  ');
      const r = await sendEmail('produtos_aprovados_lote', {
        to_name: grupo.nome,
        to_email: email,
        titulo: `${grupo.itens.length} produtos cadastrados no Protheus ✓`,
        saudacao: 'Os produtos abaixo foram cadastrados com sucesso no Protheus.',
        destaque_label: 'ITENS CADASTRADOS',
        destaque_valor: listaTexto,
        rodape_extra: '',
      });
      if (r.ok) emailsOk++; else emailsFalha++;
      for (const item of grupo.itens) {
        logAcao('aprovou', 'produto', item.produto.id, { codigo_protheus: item.codigo, email_enviado: r.ok, lote: true });
      }
    }
    // Produtos aprovados sem e-mail do solicitante não entram em nenhum grupo — auditoria mesmo assim:
    for (const item of aprovados) {
      if (!(item.produto.email_solicitante || '').trim()) logAcao('aprovou', 'produto', item.produto.id, { codigo_protheus: item.codigo, email_enviado: false, lote: true, sem_email: true });
    }

    const falhas = upds.filter(u => !u.ok);
    if (falhas.length) showToast(`${aprovados.length} produto(s) aprovado(s), ${falhas.length} falharam`);
    else showToast(`${aprovados.length} produto(s) aprovado(s) — ${emailsOk} e-mail(s) enviado(s)${emailsFalha ? `, ${emailsFalha} falharam` : ''}`);

    return { ok: true, aprovados: aprovados.length, falhas: falhas.length };
  };

  return { pegarProduto, excluirProduto, concluirProduto, concluirProdutosEmLote };
}
