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

    const r = await sendEmail('aprovado', {
      to_name: produto.nome_solicitante,
      to_email: produto.email_solicitante,
      codigo_fornecedor: codigoProtheus.trim(),   // reaproveita o mesmo template
      fornecedor_nome: (produto.descricao || '').slice(0,80),
    });
    if (r.ok) showToast('Produto cadastrado e e-mail enviado!');
    else showToast(`Produto cadastrado, mas e-mail falhou: ${r.error}`);

    logAcao('aprovou', 'produto', produto.id, { codigo_protheus: codigoProtheus.trim(), email_enviado: r.ok });
  };

  return { pegarProduto, excluirProduto, concluirProduto };
}
