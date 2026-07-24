import { useState } from 'react';

/* State e handlers da tela "Equipe" (admin de usuários), extraídos do
   app/page.js. O array `usuarios` em si continua vindo do fetchUsuarios
   principal (carregado junto no fetchAll), igual ao kanban. */
export function useUsersAdmin({ user, fetchAll, showToast, askConfirm }) {
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({ nome:'',email:'',cargo:'Analista',role:'user',telefone:'' });
  const [editUser, setEditUser] = useState(null);

  const addUser = async (e) => {
    e.preventDefault();
    if (!newUser.nome.trim()) { showToast('Informe o nome do usuário'); return; }
    if (!newUser.email.trim()) { showToast('Informe o e-mail'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newUser.email.trim())) { showToast('E-mail inválido'); return; }
    const res = await fetch('/api/auth/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: newUser.nome, email: newUser.email, cargo: newUser.cargo, role: newUser.role, telefone: newUser.telefone }),
    });
    const json = await res.json();
    if (!res.ok) { showToast('Erro ao criar: ' + (json.error || '')); return; }
    setShowNewUser(false);
    setNewUser({ nome:'',email:'',cargo:'Analista',role:'user',telefone:'' });
    await fetchAll();
    askConfirm(
      'Usuário criado!',
      `Senha temporária de ${newUser.nome}: ${json.tempPassword} — copie agora e repasse com segurança, ela não será exibida de novo.`,
      () => {}, false
    );
  };

  const updateUser = async (id, data) => {
    const res = await fetch(`/api/auth/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actingUserId: user.id, ...data }),
    });
    const json = await res.json();
    if (!res.ok) { showToast('Erro ao atualizar: ' + (json.error || '')); return; }
    showToast('Usuário atualizado');
    setEditUser(null); await fetchAll();
  };

  const deleteUser = (id, nome) => {
    askConfirm('Excluir usuário?', `${nome} perderá acesso ao painel. Esta ação não pode ser desfeita.`, async () => {
      const res = await fetch(`/api/auth/users/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actingUserId: user.id }),
      });
      const json = await res.json();
      if (!res.ok) { showToast('Erro ao excluir: ' + (json.error || '')); return; }
      showToast('Usuário excluído');
      await fetchAll();
    });
  };

  const toggleUserActive = async (u) => {
    await fetch('/api/auth/users/toggle-active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actingUserId: user.id, userId: u.id }),
    });
    await fetchAll();
  };

  const resetUserPw = (id, nome) => {
    askConfirm('Resetar senha?', `Uma nova senha temporária será gerada para ${nome} e ele precisará alterá-la no próximo login.`, async () => {
      const res = await fetch('/api/auth/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actingUserId: user.id, userId: id }),
      });
      const json = await res.json();
      if (!res.ok) { showToast('Erro: ' + (json.error || '')); return; }
      await fetchAll();
      askConfirm(
        'Senha resetada!',
        `Nova senha temporária de ${nome}: ${json.tempPassword} — copie agora e repasse com segurança, ela não será exibida de novo.`,
        () => {}, false
      );
    }, false);
  };

  return {
    showNewUser, setShowNewUser, newUser, setNewUser, editUser, setEditUser,
    addUser, updateUser, deleteUser, toggleUserActive, resetUserPw,
  };
}
