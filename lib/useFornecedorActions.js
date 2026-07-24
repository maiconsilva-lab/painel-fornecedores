import { useState } from 'react';
import { mutateTable } from './dataApi';
import { CAMPO_LABELS } from '../constants/devolucao';

/* State e handlers específicos de fornecedor: atribuição, conclusão,
   devolução (com geração de token de correção), exclusão, observações.
   `sel`/`setSel` e `setShowModal` continuam no componente principal porque
   são compartilhados com produto/desbloqueio (o mesmo modal de detalhe
   atende os três tipos). `obsRef` também fica fora porque é um ref de DOM
   ligado direto ao textarea no JSX. */
export function useFornecedorActions({ sel, setSel, setShowModal, user, showToast, askConfirm, logAcao, applyRealtimeChange, sendEmail, obsRef }) {
  const [saving, setSav] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const [devMotivoSel, setDevMotivoSel] = useState('');
  const [devMsg, setDevMsg] = useState('');
  const [devCampos, setDevCampos] = useState([]); // campos selecionados para correção
  const [devSending, setDevSending] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showConcluir, setShowConcluir] = useState(false);
  const [concluirData, setConcluirData] = useState({ codigo:'' });
  const [sendingEmail, setSendingEmail] = useState(false);

  const updateStatus = async (id, s) => {
    setSav(true);
    const u = { status: s };
    if (s === 'aprovado') { u.finalizado_por = user.nome; u.data_finalizacao = new Date().toISOString(); }
    try {
      const { row } = await mutateTable(user.id, 'fornecedores', 'update', { id, data: u, returning:true });
      applyRealtimeChange('fornecedores', { eventType:'UPDATE', new:row || { id, ...u } });
      if (sel?.id === id) setSel({ ...sel, ...(row || u) });
      logAcao('mudou_status', 'fornecedor', id, { para: s });
    } catch (error) {
      showToast(error?.message || 'Não foi possível atualizar o status');
    } finally {
      setSav(false);
    }
  };

  /* Gera token único de correção e devolve a URL pública.
     URL: https://formulario-fornecedor-nine.vercel.app/corrigir?token=XYZ
     O token só vale uma vez e expira em 30 dias (validado pelo formulário). */
  const FORM_URL_BASE = process.env.NEXT_PUBLIC_CORRECTION_FORM_URL || 'https://formulario-fornecedor-nine.vercel.app';
  const gerarTokenCorrecao = async (tipoCadastro, cadastroId, motivo, camposACorrigir) => {
    try {
      const res = await fetch('/api/correction-token', {
        method:'POST', credentials:'same-origin',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ tipo_cadastro:tipoCadastro, cadastro_id:cadastroId, motivo, campos_a_corrigir:camposACorrigir }),
      });
      const json = await res.json();
      if (!res.ok || !json.token) throw new Error(json.error || 'Token não gerado');
      return `${FORM_URL_BASE}/corrigir?token=${json.token}`;
    } catch (error) {
      console.error('[gerarTokenCorrecao] erro:', error);
      return null;
    }
  };

  const concluirCadastro = async () => {
    if (!concluirData.codigo.trim()) { showToast('Informe o código do fornecedor'); return; }

    const emailSolic = (sel?.email_solicitante || '').trim();
    const nomeSolic  = (sel?.nome_solicitante || '').trim();

    if (!emailSolic) {
      showToast('Este cadastro não tem e-mail do solicitante (cadastro antigo).');
      return;
    }

    setSendingEmail(true);

    const upd = {
      status: 'aprovado',
      finalizado_por: user.nome,
      data_finalizacao: new Date().toISOString(),
      codigo_fornecedor: concluirData.codigo.trim(),
    };

    let updatedRow;
    try {
      const result = await mutateTable(user.id, 'fornecedores', 'update', { id:sel.id, data:upd, returning:true });
      updatedRow = result?.row;
      applyRealtimeChange('fornecedores', { eventType:'UPDATE', new:updatedRow || { id:sel.id, ...upd } });
    } catch (updErr) {
      console.error('[concluirCadastro] Erro no UPDATE:', updErr);
      showToast(`Erro ao concluir: ${updErr.message}`);
      setSendingEmail(false);
      return;
    }

    // Envia e-mail (não bloqueia o sucesso do cadastro se falhar)
    const r = await sendEmail('aprovado', {
      to_name: nomeSolic || 'Solicitante',
      to_email: emailSolic,
      codigo_fornecedor: concluirData.codigo.trim(),
      fornecedor_nome: sel.razao_social || sel.nome_completo || 'N/A',
    });
    if (r.ok) showToast('Cadastro concluído e e-mail enviado!');
    else showToast(`Cadastro concluído, mas e-mail falhou: ${r.error}`);

    // Auditoria (fire-and-forget)
    logAcao('aprovou', 'fornecedor', sel.id, {
      codigo: concluirData.codigo.trim(),
      email_enviado: r.ok,
    });

    if (sel) setSel({ ...sel, ...(updatedRow || upd) });
    setShowConcluir(false);
    setConcluirData({ codigo:'' });
    setSendingEmail(false);
    // O estado local é atualizado após a mutação; não é necessário recarregar toda a base
  };

  const assignTo = async (id, nome) => {
    setSav(true);
    const { row } = await mutateTable(user.id, 'fornecedores', 'update', { id, data: { atribuido_para: nome, status:'em_analise' }, returning: true });
    if (row) applyRealtimeChange('fornecedores', { eventType:'UPDATE', new: row });
    if (sel?.id === id) setSel({ ...sel, atribuido_para: nome, status:'em_analise' });
    logAcao('atribuiu', 'fornecedor', id, { para: nome });
    setShowAssign(false);
    setSav(false);
  };

  const deleteForn = (id) => {
    askConfirm(
      'Excluir cadastro?',
      'Esta ação não pode ser desfeita. O cadastro do fornecedor será removido permanentemente.',
      async () => {
        try {
          await mutateTable(user.id, 'fornecedores', 'delete', { id });
        } catch (err) { showToast('Erro ao excluir: ' + err.message); console.error('[deleteForn]', err); return; }
        applyRealtimeChange('fornecedores', { eventType:'DELETE', old: { id } });
        showToast('Cadastro excluído');
        logAcao('excluiu', 'fornecedor', id);
        setSel(null);
        setShowModal(false);
      }
    );
  };

  const saveObs = async (id) => {
    if (!obsRef.current) return;
    const { row } = await mutateTable(user.id, 'fornecedores', 'update', { id, data: { observacoes_internas: obsRef.current.value }, returning: true });
    if (row) applyRealtimeChange('fornecedores', { eventType:'UPDATE', new: row });
    showToast('Observação salva');
  };

  /* Devolução com motivo + token de correção + e-mail automático:
     1. Valida que motivo e campos foram informados
     2. Gera token único na tabela tokens_correcao (vincula ao cadastro)
     3. Marca cadastro como 'rejeitado' no banco + grava motivo e campos
     4. Envia e-mail com motivo + link único de correção via EmailJS
     5. Registra na auditoria */
  const sendDevolutiva = async () => {
    if (!sel) return;

    const motivoFinal = (devMotivoSel === 'Outros (descrever no campo abaixo)' || !devMotivoSel)
      ? devMsg.trim()
      : (devMotivoSel + (devMsg.trim() ? `\n\nObservação adicional: ${devMsg.trim()}` : ''));
    if (!motivoFinal) {
      showToast('Selecione um motivo ou descreva o problema');
      return;
    }
    if (devCampos.length === 0 && devMotivoSel !== 'Dados cadastrais incompletos' && devMotivoSel !== 'Outros (descrever no campo abaixo)') {
      showToast('Aviso: nenhum campo foi marcado para correção');
    }

    const emailDest = (sel.email_solicitante || sel.email || '').trim();
    if (!emailDest) {
      showToast('Cadastro sem e-mail do solicitante. Não é possível enviar devolutiva automática.');
      return;
    }

    setDevSending(true);

    const linkCorrecao = await gerarTokenCorrecao('fornecedor', sel.id, motivoFinal, devCampos);
    if (!linkCorrecao) {
      showToast('Erro ao gerar link de correção. Tente novamente.');
      setDevSending(false);
      return;
    }

    const upd = {
      status: 'rejeitado',
      motivo_devolucao: motivoFinal,
      campos_a_corrigir: devCampos,
      devolvido_em: new Date().toISOString(),
      devolvido_por: user.nome,
      finalizado_por: user.nome,
      data_finalizacao: new Date().toISOString(),
    };
    let returnedRow;
    try {
      const result = await mutateTable(user.id, 'fornecedores', 'update', { id:sel.id, data:upd, returning:true });
      returnedRow = result?.row;
      applyRealtimeChange('fornecedores', { eventType:'UPDATE', new:returnedRow || { id:sel.id, ...upd } });
    } catch (updErr) {
      console.error('[sendDevolutiva] Erro update:', updErr);
      showToast(`Erro ao devolver: ${updErr.message}`);
      setDevSending(false);
      return;
    }

    const camposLegiveis = devCampos
      .map(c => CAMPO_LABELS[c] || c)
      .join(', ') || '(nenhum campo específico — revise o cadastro completo)';

    const r = await sendEmail('devolvido', {
      to_name:         (sel.nome_solicitante || 'Solicitante').trim(),
      to_email:        emailDest,
      fornecedor_nome: sel.razao_social || sel.nome_completo || 'Cadastro',
      motivo:          motivoFinal,
      campos_corrigir: camposLegiveis,
      link_correcao:   linkCorrecao,
      analista_nome:   user.nome,
    });
    if (r.ok) showToast('Devolutiva enviada — e-mail despachado ao solicitante');
    else showToast(`Cadastro devolvido, mas e-mail falhou: ${r.error}`);

    logAcao('devolveu', 'fornecedor', sel.id, {
      motivo: motivoFinal,
      campos_a_corrigir: devCampos,
      email_enviado: r.ok,
    });

    setSel({ ...sel, ...(returnedRow || upd) });
    setShowDev(false);
    setDevMotivoSel('');
    setDevMsg('');
    setDevCampos([]);
    setDevSending(false);
  };

  return {
    saving, setSav,
    showDev, setShowDev, devMotivoSel, setDevMotivoSel, devMsg, setDevMsg,
    devCampos, setDevCampos, devSending, setDevSending, showAssign, setShowAssign,
    showConcluir, setShowConcluir, concluirData, setConcluirData, sendingEmail, setSendingEmail,
    updateStatus, concluirCadastro, assignTo, deleteForn, saveObs, sendDevolutiva, gerarTokenCorrecao,
  };
}
