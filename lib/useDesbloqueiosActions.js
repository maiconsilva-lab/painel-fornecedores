import { mutateTable } from './dataApi';

/* Handlers de desbloqueios, extraídos do app/page.js. Mesmo padrão do
   useProdutosActions — sem state próprio. */
export function useDesbloqueiosActions({ user, showToast, askConfirm, logAcao, applyRealtimeChange, sendEmail }) {
  const pegarDesbloqueio = async (id) => {
    const { row } = await mutateTable(user.id, 'desbloqueios', 'update', { id, data: { atribuido_para: user.nome, status:'em_analise' }, returning: true });
    if (row) applyRealtimeChange('desbloqueios', { eventType:'UPDATE', new: row });
    logAcao('atribuiu', 'desbloqueio', id, { para: user.nome });
  };

  const excluirDesbloqueio = (id) => {
    askConfirm('Excluir pedido?', 'Esta ação não pode ser desfeita.', async () => {
      try {
        await mutateTable(user.id, 'desbloqueios', 'delete', { id });
      } catch (err) { showToast('Erro ao excluir: ' + err.message); return; }
      applyRealtimeChange('desbloqueios', { eventType:'DELETE', old: { id } });
      showToast('Pedido excluído');
      logAcao('excluiu', 'desbloqueio', id);
    });
  };

  const concluirDesbloqueio = async (d) => {
    const upd = {
      status: 'desbloqueado',
      finalizado_por: user.nome,
      data_finalizacao: new Date().toISOString(),
    };
    let row;
    try {
      ({ row } = await mutateTable(user.id, 'desbloqueios', 'update', { id: d.id, data: upd, returning: true }));
    } catch (err) { showToast(`Erro: ${err.message}`); return; }
    applyRealtimeChange('desbloqueios', { eventType:'UPDATE', new: row });

    const r = await sendEmail('desbloqueio', {
      to_name: d.nome_solicitante,
      to_email: d.email_solicitante,
      codigo_produto: d.codigo_produto,
      nome_produto: d.nome_produto,
    });
    if (r.ok) showToast('Produto desbloqueado e e-mail enviado!');
    else showToast(`Desbloqueado, mas e-mail falhou: ${r.error}`);

    logAcao('desbloqueou', 'desbloqueio', d.id, {
      codigo: d.codigo_produto,
      email_enviado: r.ok,
    });
  };

  const rejeitarDesbloqueio = async (d, motivo) => {
    if (!motivo || !motivo.trim()) { showToast('Informe o motivo da rejeição'); return; }
    const upd = {
      status: 'rejeitado',
      motivo_rejeicao: motivo.trim(),
      finalizado_por: user.nome,
      data_finalizacao: new Date().toISOString(),
    };
    let row;
    try {
      ({ row } = await mutateTable(user.id, 'desbloqueios', 'update', { id: d.id, data: upd, returning: true }));
    } catch (err) { showToast(`Erro: ${err.message}`); return; }
    applyRealtimeChange('desbloqueios', { eventType:'UPDATE', new: row });
    showToast('Desbloqueio rejeitado');
    logAcao('rejeitou', 'desbloqueio', d.id, { motivo: motivo.trim() });
  };

  return { pegarDesbloqueio, excluirDesbloqueio, concluirDesbloqueio, rejeitarDesbloqueio };
}
