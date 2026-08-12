
import React, { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { User } from '../types';
import { UserPlus, Edit2, UserX, CheckCircle, Trash2, X, AlertTriangle, AlertCircle, Download, KeyRound } from 'lucide-react';
import { downloadCSV } from '../services/csvService';

const Users = () => {
  const { users, addUser, updateUser, deleteUser, currentUser, resetUserPassword } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Notification State
  const [notification, setNotification] = useState<{ msg: string, type: 'error' | 'success' } | null>(null);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({ name: '', matricula: '', role: 'user' });

  // Helper para notificação temporária
  const showNotification = (msg: string, type: 'error' | 'success' = 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const resetForm = () => {
    setFormData({ name: '', matricula: '', role: 'user' });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    const trimmedMatricula = formData.matricula.trim();

    if (!trimmedName || !trimmedMatricula) {
      showNotification("Por favor, preencha todos os campos obrigatórios.", "error");
      return;
    }

    if (editingId) {
      // Lógica de Edição
      // Verificar se a matrícula / login já pertence a outro usuário
      const duplicateMatricula = users.find(
        u => u.id !== editingId && u.matricula.trim().toLowerCase() === trimmedMatricula.toLowerCase()
      );
      if (duplicateMatricula) {
        showNotification("Não é possível atualizar: a matrícula / login já está em uso por outro usuário.", "error");
        return;
      }

      // Verificar se o nome já pertence a outro usuário
      const duplicateName = users.find(
        u => u.id !== editingId && u.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicateName) {
        showNotification("Não é possível atualizar: o nome já está em uso por outro usuário.", "error");
        return;
      }

      const existingUser = users.find(u => u.id === editingId);
      if (existingUser) {
        const updatedUser: User = {
          ...existingUser,
          name: trimmedName,
          matricula: trimmedMatricula,
          role: formData.role as 'admin' | 'user',
        };
        try {
          await updateUser(updatedUser);
          showNotification("Usuário atualizado com sucesso.", "success");
          resetForm();
        } catch (err: any) {
          showNotification(err.message || "Erro ao atualizar usuário.", "error");
        }
      }
    } else {
      // Lógica de Criação
      // Verificar se a matrícula / login já está em uso
      const duplicateMatricula = users.find(
        u => u.matricula.trim().toLowerCase() === trimmedMatricula.toLowerCase()
      );
      if (duplicateMatricula) {
        showNotification("Não é possível criar: a matrícula / login já está em uso por outro usuário.", "error");
        return;
      }

      // Verificar se o nome já está em uso
      const duplicateName = users.find(
        u => u.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicateName) {
        showNotification("Não é possível criar: o nome já está em uso por outro usuário.", "error");
        return;
      }

      try {
        await addUser({
          name: trimmedName,
          matricula: trimmedMatricula,
          active: true,
          role: formData.role as 'admin' | 'user',
        });
        showNotification("Usuário criado com sucesso.", "success");
        resetForm();
      } catch (err: any) {
        showNotification(err.message || "Erro ao criar usuário.", "error");
      }
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      name: user.name,
      matricula: user.matricula,
      role: user.role
    });
  };

  // Abre o modal de exclusão
  const requestDelete = (id: string) => {
    const isSelf = id === currentUser?.id;
    const isLastUser = users.length === 1;

    if (isSelf && !isLastUser) {
      showNotification(
        "Você não pode excluir sua própria conta enquanto existem outros usuários no sistema.",
        "error"
      );
      return;
    }
    setUserToDelete(id);
    setDeleteModalOpen(true);
  };

  // Confirma a exclusão
  const confirmDelete = async () => {
    if (!userToDelete) return;
    const idToDelete = userToDelete;
    setDeleteModalOpen(false);
    setUserToDelete(null);

    try {
      if (editingId === idToDelete) {
        resetForm();
      }
      await deleteUser(idToDelete);
      // Se deleteUser não lançou e ainda estamos aqui, é porque ainda há usuários
      showNotification("Usuário excluído com sucesso.", "success");
    } catch (err: any) {
      showNotification(err.message || "Erro ao excluir usuário.", "error");
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const handleToggleStatus = (user: User) => {
    if (user.id === currentUser?.id) {
      showNotification("Você não pode desativar seu próprio usuário.", "error");
      return;
    }
    updateUser({ ...user, active: !user.active });
  };

  const handleReset = async (user: User) => {
    if (confirm(`Tem certeza que deseja resetar a senha de ${user.name}? O usuário terá que cadastrar uma nova senha no próximo acesso.`)) {
      const success = await resetUserPassword(user.id);
      if (success) {
        showNotification("Senha resetada com sucesso. O usuário deve realizar o Primeiro Acesso.", "success");
      } else {
        showNotification("Erro ao resetar senha.", "error");
      }
    }
  };

  // Export Users to CSV
  const handleExportCSV = () => {
    downloadCSV(users, [
      { header: 'ID', accessor: (u: User) => u.id },
      { header: 'Nome', accessor: (u: User) => u.name },
      { header: 'Matrícula', accessor: (u: User) => u.matricula },
      { header: 'Status', accessor: (u: User) => u.active ? 'Ativo' : 'Inativo' },
      { header: 'Permissão', accessor: (u: User) => u.role === 'admin' ? 'Administrador' : 'Usuário' },
    ], 'ZAGFER_Usuarios.csv');
  };

  return (
    <div className="space-y-8 relative">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[70] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right duration-300 ${notification.type === 'error'
          ? 'bg-red-50 dark:bg-red-900/90 border-red-200 dark:border-red-800 text-red-800 dark:text-red-100'
          : 'bg-green-50 dark:bg-green-900/90 border-green-200 dark:border-green-800 text-green-800 dark:text-green-100'
          }`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span className="font-medium text-sm">{notification.msg}</span>
          <button onClick={() => setNotification(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gerenciamento de Usuários</h2>
          <p className="text-slate-500 dark:text-slate-400">Cadastre e gerencie o acesso dos militares.</p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={handleExportCSV}
            className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            <Download size={20} />
            <span>Exportar Usuários</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form (Create or Edit) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 sticky top-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                {editingId ? (
                  <>
                    <Edit2 size={20} className="text-zagfer-500" />
                    Editar Usuário
                  </>
                ) : (
                  <>
                    <UserPlus size={20} className="text-zagfer-500" />
                    Novo Usuário
                  </>
                )}
              </h3>
              {editingId && (
                <button
                  onClick={resetForm}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Cancelar edição"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-zagfer-500 text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Matrícula</label>
                <input
                  type="text"
                  value={formData.matricula}
                  onChange={e => setFormData({ ...formData, matricula: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-zagfer-500 text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Permissão</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-zagfer-500 text-slate-900 dark:text-white"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  className={`flex-1 font-medium py-2 rounded-lg transition-colors ${editingId
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-zagfer-600 hover:bg-zagfer-700 text-white'
                    }`}
                >
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* User List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Nome</th>
                    <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Matrícula</th>
                    <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                    <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 text-slate-800 dark:text-white font-medium">{user.name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono">{user.matricula}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                          {user.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`p-1.5 rounded-md transition-colors ${user.active
                              ? 'text-slate-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20'
                              : 'text-slate-500 hover:bg-green-50 hover:text-green-500 dark:hover:bg-green-900/20'
                              }`}
                            title={user.active ? "Desativar" : "Ativar"}
                          >
                            {user.active ? <UserX size={16} /> : <CheckCircle size={16} />}
                          </button>

                          <button
                            onClick={() => handleEdit(user)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>

                          <button
                            onClick={() => handleReset(user)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20 transition-colors"
                            title="Resetar Senha"
                          >
                            <KeyRound size={16} />
                          </button>

                          <button
                            onClick={() => requestDelete(user.id)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Delete Confirmation */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Confirmar Exclusão</h3>
              {userToDelete === currentUser?.id && users.length === 1 ? (
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Você está excluindo sua <strong className="text-red-600 dark:text-red-400">própria conta</strong>, que é o <strong>único usuário</strong> do sistema. O sistema será reiniciado e abrirá a tela de configuração do usuário mestre.
                </p>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.
                </p>
              )}
            </div>
            <div className="flex p-4 gap-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors font-medium shadow-sm"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
