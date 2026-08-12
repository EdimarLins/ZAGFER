
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../store/AppContext';
import { Search, Filter, Plus, Edit2, Trash2, X, AlertTriangle, Upload, Download } from 'lucide-react';
import { Tool, ToolStatus } from '../types';
import { downloadCSV } from '../services/csvService';

const Tools = () => {
  const { tools, addTool, bulkAddTools, updateTool, deleteTool, currentUser, clearAllTools } = useApp();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | ToolStatus>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Modal State (Create/Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Tool>>({
    name: '', category: '', size: '', bmp: '', sector: '', status: ToolStatus.AVAILABLE
  });

  // Delete Confirmation State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toolToDelete, setToolToDelete] = useState<string | null>(null);

  // Clear All Confirmation State
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // File Input Ref for CSV Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() =>
    Array.from(new Set(tools.map(t => t.category))).sort(),
    [tools]);

  const filteredTools = useMemo(() => {
    return tools
      .filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.id.includes(search) ||
        t.sector.toLowerCase().includes(search.toLowerCase()) ||
        (t.bmp && t.bmp.toLowerCase().includes(search.toLowerCase()))
      )
      .filter(t => filterStatus === 'ALL' || t.status === filterStatus)
      .filter(t => filterCategory === 'ALL' || t.category === filterCategory)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tools, search, filterStatus, filterCategory]);

  // Handlers for Create/Edit
  const openModal = (e?: React.MouseEvent, tool?: Tool) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (tool) {
      setEditingId(tool.id);
      setFormData(tool);
    } else {
      setEditingId(null);
      setFormData({ name: '', category: '', size: '', bmp: '', sector: '', status: ToolStatus.AVAILABLE });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.sector) return;

    if (editingId) {
      updateTool({ ...formData, id: editingId } as Tool);
    } else {
      addTool({
        ...formData,
        id: Math.random().toString(36).substr(2, 6).toUpperCase(), // Simple ID generation
        status: ToolStatus.AVAILABLE
      } as Tool);
    }
    closeModal();
  };

  // Handlers for Deletion
  const requestDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation(); // Crucial: stop click from bubbling
    setToolToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (toolToDelete) {
      deleteTool(toolToDelete);
      setDeleteModalOpen(false);
      setToolToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setToolToDelete(null);
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    downloadCSV(tools, [

      { header: 'Nome', accessor: (t: Tool) => t.name },
      { header: 'Categoria', accessor: (t: Tool) => t.category },
      { header: 'Tamanho', accessor: (t: Tool) => t.size },
      { header: 'Setor', accessor: (t: Tool) => t.sector },
      { header: 'BMP', accessor: (t: Tool) => t.bmp },
      { header: 'Status', accessor: (t: Tool) => t.status === ToolStatus.AVAILABLE ? 'Disponível' : 'Indisponível' },
    ], 'ZAGFER_Ferramentas_Backup.csv');
  };

  // Clear All Handler
  const handleClearAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) return;

    setIsDeleting(true);
    try {
      // 1. Download CSV Backup
      handleExportCSV();
      
      // 2. Call delete all Tools
      await clearAllTools(adminPassword);
      
      setClearAllModalOpen(false);
      setAdminPassword('');
      alert('Todas as ferramentas foram apagadas com sucesso e um backup foi baixado.');
    } catch (error: any) {
      alert(error.message || 'Erro ao apagar ferramentas. Verifique a senha.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openClearAllModal = () => {
    setAdminPassword('');
    setClearAllModalOpen(true);
  };

  // CSV Import Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Parse CSV (Basic implementation)
      // Expecting: Name, Category, Size, Sector, BMP (optional)
      const lines = text.split('\n');
      const newTools: Tool[] = [];

      // Skip header if exists (heuristic: checks if first line contains "nome" or "name")
      const startIndex = lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('nome') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle both comma and semicolon
        const parts = line.includes(';') ? line.split(';') : line.split(',');

        if (parts.length >= 3) { // Require at least Name, Category, Sector
          const name = parts[0]?.trim();
          const category = parts[1]?.trim();
          const size = parts[2]?.trim();
          const sector = parts[3]?.trim();
          const bmp = parts[4]?.trim();

          if (name && category) {
            newTools.push({
              id: Math.random().toString(36).substr(2, 6).toUpperCase(),
              name,
              category,
              size: size || '',
              sector: sector || 'Geral',
              bmp: bmp || '',
              status: ToolStatus.AVAILABLE
            });
          }
        }
      }

      if (newTools.length > 0) {
        bulkAddTools(newTools);
        alert(`${newTools.length} ferramentas importadas com sucesso!`);
      } else {
        alert('Nenhuma ferramenta válida encontrada no arquivo CSV.');
      }

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gerenciamento de Ferramentas</h2>
          <p className="text-slate-500 dark:text-slate-400">Consulte, cadastre e gerencie o inventário.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            title="Formato CSV: Nome, Categoria, Tamanho, Setor, BMP"
          >
            <Upload size={20} />
            <span className="hidden sm:inline">Importar CSV</span>
          </button>

          {currentUser?.role === 'admin' && (
            <>
              <button
                onClick={handleExportCSV}
                className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                title="Exportar lista completa para CSV"
              >
                <Download size={20} />
                <span className="hidden sm:inline">Exportar CSV</span>
              </button>
              
              <button
                onClick={openClearAllModal}
                className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                title="Apagar todas as ferramentas (Requer senha)"
              >
                <Trash2 size={20} />
                <span className="hidden sm:inline">Apagar Tudo</span>
              </button>
            </>
          )}

          <button
            onClick={(e) => openModal(e)}
            className="bg-zagfer-600 hover:bg-zagfer-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Nova Ferramenta</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome, BMP ou setor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-zagfer-500 outline-none transition-all text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex gap-4">
          <div className="relative min-w-[140px]">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full appearance-none pl-4 pr-10 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-zagfer-500 outline-none transition-all text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="ALL">Status: Todos</option>
              <option value={ToolStatus.AVAILABLE}>Disponíveis</option>
              <option value={ToolStatus.UNAVAILABLE}>Indisponíveis</option>
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>

          <div className="relative min-w-[140px]">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full appearance-none pl-4 pr-10 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-zagfer-500 outline-none transition-all text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="ALL">Categoria: Todas</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* Tool Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTools.map(tool => (
          <div
            key={tool.id}
            className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between group relative"
          >
            {/* Action Buttons */}
            <div className="absolute top-4 right-4 flex gap-2 z-20">
              <button
                type="button"
                onClick={(e) => openModal(e, tool)}
                className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300 hover:text-zagfer-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                title="Editar"
              >
                <Edit2 size={16} />
              </button>
              <button
                type="button"
                onClick={(e) => requestDelete(e, tool.id)}
                className="p-1.5 bg-red-50 dark:bg-red-900/30 rounded-md text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
                title="Excluir"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div>
              <div className="flex justify-between items-start mb-2 pr-16">
                <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                  {tool.category}
                </span>
                <div className={`w-3 h-3 rounded-full ${tool.status === ToolStatus.AVAILABLE ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} title={tool.status === ToolStatus.AVAILABLE ? 'Disponível' : 'Indisponível'} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 truncate" title={tool.name}>{tool.name}</h3>
              <div className="flex flex-col gap-0.5">
                {tool.size && <p className="text-sm text-slate-500 dark:text-slate-400">Tam: {tool.size}</p>}
                {tool.bmp && <p className="text-sm text-slate-500 dark:text-slate-400">BMP: {tool.bmp}</p>}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-end">
              <div className="text-xs text-slate-400">

                <p>Setor: {tool.sector}</p>
              </div>
              <span className={`text-xs font-semibold ${tool.status === ToolStatus.AVAILABLE ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {tool.status === ToolStatus.AVAILABLE ? 'Disponível' : 'Em Uso'}
              </span>
            </div>
          </div>
        ))}

        {filteredTools.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            Nenhuma ferramenta encontrada.
          </div>
        )}
      </div>

      {/* Modal Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingId ? 'Editar Ferramenta' : 'Nova Ferramenta'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Ferramenta *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-zagfer-500 text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria *</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-zagfer-500 text-slate-900 dark:text-white"
                    required
                    placeholder="Ex: Elétrica"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tamanho</label>
                  <input
                    type="text"
                    value={formData.size || ''}
                    onChange={e => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-zagfer-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Setor *</label>
                  <input
                    type="text"
                    value={formData.sector}
                    onChange={e => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-zagfer-500 text-slate-900 dark:text-white"
                    required
                    placeholder="Ex: Manutenção"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">BMP</label>
                  <input
                    type="text"
                    value={formData.bmp || ''}
                    onChange={e => setFormData({ ...formData, bmp: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-zagfer-500 text-slate-900 dark:text-white"
                    placeholder="Cód. Patrimônio"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-zagfer-600 text-white hover:bg-zagfer-700 shadow-md">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Delete Confirmation */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Confirmar Exclusão</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Tem certeza que deseja remover esta ferramenta? Esta ação não pode ser desfeita.
              </p>
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

      {/* Modal Clear All Confirmation (Admin) */}
      {clearAllModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Apagar Todas as Ferramentas</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                Esta ação irá excluir permanentemente **todas as ferramentas** do sistema. 
                Um backup em CSV será baixado automaticamente.
              </p>
              
              <form onSubmit={handleClearAll} className="w-full space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Senha do Administrador
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Digite sua senha para confirmar"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
                    required
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setClearAllModalOpen(false)}
                    className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors font-medium"
                    disabled={isDeleting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors font-medium shadow-md flex items-center justify-center gap-2"
                    disabled={isDeleting || !adminPassword}
                  >
                    {isDeleting ? 'Apagando...' : 'Confirmar e Baixar Backup'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tools;
