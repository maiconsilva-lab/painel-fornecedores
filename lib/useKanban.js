import { useState } from 'react';
import { mutateTable } from './dataApi';
import { sanitize } from './sanitize';

/* Todo o state e os handlers da aba "Gestão de Tarefas" (kanban), extraídos
   do app/page.js. Recebe como parâmetro só o que precisa vir de fora
   (o array kanban em si continua vivendo no fetchAll principal, porque é
   buscado junto com fornecedores/produtos/desbloqueios no mesmo Promise.all
   — separar isso também é um passo futuro, mais arriscado). */
export function useKanban({ kanban, setKanban, user, fetchAll, showToast, askConfirm, logAcao, applyRealtimeChange }) {
  const [kanView, setKanView] = useState('todos');
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ titulo:'',descricao:'',atribuido_para:'',prioridade:'media',prazo:'',status:'backlog' });
  const [editTask, setEditTask] = useState(null);
  const [newChkItem, setNewChkItem] = useState('');
  const [dragTaskId, setDragTaskId] = useState(null);
  const [kanLayout, setKanLayout] = useState('board');
  const [newTaskComment, setNewTaskComment] = useState('');

  const addKanTask = async (e) => {
    e.preventDefault();
    if (!newTask.titulo.trim()) { showToast('Informe o título da tarefa'); return; }
    if (!newTask.atribuido_para) { showToast('Atribua a tarefa a alguém'); return; }
    const dt = { ...newTask, criado_por: user.nome, checklist: [], comentarios: [] };
    if (!dt.prazo) delete dt.prazo;
    let error, created;
    try { created = await mutateTable(user.id, 'kanban_tarefas', 'insert', { data: dt, returning:true }); }
    catch (err) { error = err; }
    if (error) { showToast('Erro ao criar: ' + error.message); return; }
    logAcao('criou', 'tarefa', created?.row?.id || 'novo', { titulo:dt.titulo, atribuido_para:dt.atribuido_para, prioridade:dt.prioridade });
    showToast('Tarefa criada!');
    setShowNewTask(false);
    setNewTask({ titulo:'',descricao:'',atribuido_para:'',prioridade:'media',prazo:'',status:'backlog' });
    await fetchAll();
  };

  const moveKanTask = async (id, newStatus) => {
    const previous = kanban.find((task) => task.id === id);
    if (!previous || previous.status === newStatus) return;
    setKanban((rows) => rows.map((task) => task.id === id ? { ...task, status:newStatus, updated_at:new Date().toISOString() } : task));
    try {
      const { row } = await mutateTable(user.id, 'kanban_tarefas', 'update', { id, data: { status: newStatus, updated_at: new Date().toISOString() }, returning:true });
      if (row) applyRealtimeChange('kanban_tarefas', { eventType:'UPDATE', new:row });
      logAcao('moveu', 'tarefa', id, { de:previous.status, para:newStatus });
      showToast('Tarefa movida');
    } catch (err) {
      setKanban((rows) => rows.map((task) => task.id === id ? previous : task));
      showToast('Não foi possível mover a tarefa');
    }
  };

  const dropKanTask = async (newStatus) => {
    const id = dragTaskId;
    setDragTaskId(null);
    if (id) await moveKanTask(id, newStatus);
  };

  const deleteKanTask = (id) => {
    askConfirm('Excluir tarefa?', 'Esta tarefa será removida permanentemente.', async () => {
      try { await mutateTable(user.id, 'kanban_tarefas', 'delete', { id }); }
      catch (err) { showToast('Erro ao excluir: ' + err.message); return; }
      logAcao('excluiu', 'tarefa', id);
      showToast('Tarefa excluída');
      if (editTask?.id === id) setEditTask(null);
      await fetchAll();
    });
  };

  const updateKanTask = async (id, data) => {
    const { row } = await mutateTable(user.id, 'kanban_tarefas', 'update', { id, data: { ...data, updated_at: new Date().toISOString() }, returning: true });
    if (editTask?.id === id && row) setEditTask(row);
    setKanban(current => current.map(task => task.id === id ? { ...task, ...(row || data) } : task));
    if (!('comentarios' in data) && !('checklist' in data)) logAcao(data.status === 'concluido' ? 'concluiu' : 'editou', 'tarefa', id, data);
  };

  const addChkItem = async () => {
    if (!newChkItem.trim() || !editTask) return;
    const newList = [...(editTask.checklist || []), { id: Date.now(), texto: sanitize(newChkItem), feito: false }];
    await updateKanTask(editTask.id, { checklist: newList });
    setNewChkItem('');
  };

  const toggleChkItem = async (itemId) => {
    if (!editTask) return;
    const newList = (editTask.checklist || []).map(i => i.id === itemId ? { ...i, feito: !i.feito } : i);
    await updateKanTask(editTask.id, { checklist: newList });
  };

  const removeChkItem = async (itemId) => {
    if (!editTask) return;
    const newList = (editTask.checklist || []).filter(i => i.id !== itemId);
    await updateKanTask(editTask.id, { checklist: newList });
  };

  const addTaskComment = async () => {
    if (!editTask || !newTaskComment.trim()) return;
    const comments = [...(editTask.comentarios || []), {
      id: Date.now(), texto: sanitize(newTaskComment.trim()), autor: user.nome, criado_em: new Date().toISOString(),
    }];
    await updateKanTask(editTask.id, { comentarios: comments });
    setNewTaskComment('');
    logAcao('comentou', 'tarefa', editTask.id, { comentario: newTaskComment.trim().slice(0, 180) });
  };

  return {
    kanView, setKanView, showNewTask, setShowNewTask, newTask, setNewTask,
    editTask, setEditTask, newChkItem, setNewChkItem, dragTaskId, setDragTaskId,
    kanLayout, setKanLayout, newTaskComment, setNewTaskComment,
    addKanTask, moveKanTask, dropKanTask, deleteKanTask, updateKanTask,
    addChkItem, toggleChkItem, removeChkItem, addTaskComment,
  };
}
