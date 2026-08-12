import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { ToolStatus } from '../types';
import { format, addHours } from 'date-fns';
import jsPDF from 'jspdf';
import { Check, Search, FileText, AlertCircle, CalendarClock, Download, X } from 'lucide-react';
import { generateCheckoutPDF } from '../services/pdfService';

const Checkout = () => {
  const { tools, currentUser, updateToolStatus, addHistoryRecord } = useApp();
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Manual Entry States
  const [responsibleName, setResponsibleName] = useState('');
  const [responsibleMatricula, setResponsibleMatricula] = useState('');

  // Deadline State (Default +24h)
  const [deadline, setDeadline] = useState('');

  // Modal Success State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastGeneratedDoc, setLastGeneratedDoc] = useState<{ doc: jsPDF, filename: string } | null>(null);

  // Initialize deadline on mount
  useEffect(() => {
    const tomorrow = addHours(new Date(), 24);
    // Format for datetime-local input: YYYY-MM-DDThh:mm
    setDeadline(format(tomorrow, "yyyy-MM-dd'T'HH:mm"));
  }, []);

  useEffect(() => {
    return () => setSuccessMsg('');
  }, []);

  const availableTools = useMemo(() => {
    return tools
      .filter(t => t.status === ToolStatus.AVAILABLE)
      .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tools, search]);

  const toggleSelection = (id: string) => {
    setSelectedToolIds(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    if (selectedToolIds.length === 0 || !currentUser || !responsibleName || !responsibleMatricula || !deadline) return;

    const selectedTools = tools.filter(t => selectedToolIds.includes(t.id));
    const toolsSummary = selectedTools.map(t => t.name).join(', ');
    const deadlineTimestamp = new Date(deadline).getTime();

    const record = {
      timestamp: Date.now(),
      actionType: 'CHECKOUT' as const,

      // Dispatcher (Logged in)
      dispatcherId: currentUser.id,
      dispatcherName: currentUser.name,
      dispatcherMatricula: currentUser.matricula,

      // Responsible (Manual)
      responsibleName,
      responsibleMatricula,

      toolIds: selectedToolIds,
      toolsSummary,

      expectedReturnDate: deadlineTimestamp
    };

    // Generate PDF in memory (Async now)
    const doc = await generateCheckoutPDF(record, selectedTools);
    const filename = `ZAGFER_Retirada_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;

    // Save doc to state for potential download
    setLastGeneratedDoc({ doc, filename });

    // Update App State
    updateToolStatus(selectedToolIds, ToolStatus.UNAVAILABLE);
    addHistoryRecord(record);

    // Reset UI (keep deadline +24h from now)
    setSelectedToolIds([]);
    setSearch('');
    setResponsibleName('');
    setResponsibleMatricula('');
    setDeadline(format(addHours(new Date(), 24), "yyyy-MM-dd'T'HH:mm"));

    // Show Success Modal instead of auto-downloading
    setShowSuccessModal(true);
  };

  const handleDownloadPdf = () => {
    if (lastGeneratedDoc) {
      lastGeneratedDoc.doc.save(lastGeneratedDoc.filename);
      setShowSuccessModal(false);
      setLastGeneratedDoc(null);
      setSuccessMsg('Download iniciado com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    setLastGeneratedDoc(null);
    setSuccessMsg('Retirada registrada com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Registro de Retirada</h2>
        <p className="text-slate-500 dark:text-slate-400">Selecione as ferramentas e informe o responsável.</p>
      </div>

      {successMsg && (
        <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-4 rounded-xl flex items-center gap-3 border border-green-200 dark:border-green-800 animate-in fade-in">
          <Check className="shrink-0" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Form Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 sticky top-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Dados da Retirada</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">MILITAR</label>
                <input
                  type="text"
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-zagfer-500 text-slate-900 dark:text-white"
                  placeholder="Nome do Militar"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">OM/Seção</label>
                <input
                  type="text"
                  value={responsibleMatricula}
                  onChange={(e) => setResponsibleMatricula(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-zagfer-500 text-slate-900 dark:text-white"
                  placeholder="OM/Seção do militar"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Prazo de Devolução</label>
                <div className="relative">
                  <CalendarClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-zagfer-500 text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Despachante (Você)</label>
                <div className="text-slate-900 dark:text-white font-medium">{currentUser?.name}</div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex justify-between mb-4">
                  <span className="text-sm text-slate-500">Selecionadas:</span>
                  <span className="font-bold text-zagfer-600">{selectedToolIds.length}</span>
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={selectedToolIds.length === 0 || !responsibleName || !responsibleMatricula || !deadline}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold shadow-lg transition-all
                    ${selectedToolIds.length > 0 && responsibleName && responsibleMatricula && deadline
                      ? 'bg-zagfer-600 hover:bg-zagfer-700 text-white shadow-zagfer-500/30'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                >
                  <FileText size={18} />
                  Confirmar Saída
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tool Selection */}
        <div className="md:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Pesquisar ferramenta disponível..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-zagfer-500 outline-none shadow-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="max-h-[60vh] overflow-y-auto">
              {availableTools.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {availableTools.map(tool => (
                    <label
                      key={tool.id}
                      className={`flex items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${selectedToolIds.includes(tool.id) ? 'bg-zagfer-50 dark:bg-zagfer-900/20' : ''}`}
                    >
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedToolIds.includes(tool.id)}
                          onChange={() => toggleSelection(tool.id)}
                          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 dark:border-slate-500 checked:border-zagfer-500 checked:bg-zagfer-500 transition-all"
                        />
                        <Check className="absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-white" size={14} strokeWidth={3} style={{ left: 3, top: 3 }} />
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex justify-between">
                          <span className="font-medium text-slate-800 dark:text-white">{tool.name}</span>
                          <span className="font-medium text-slate-800 dark:text-white">{tool.name}</span>
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {tool.category} • {tool.size || 'N/A'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                  <AlertCircle size={32} className="mb-2 opacity-50" />
                  <p>Nenhuma ferramenta disponível encontrada.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success & Download Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                <Check size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Retirada Confirmada!</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                A cautela foi registrada com sucesso. Deseja baixar o comprovante em PDF agora?
              </p>
            </div>
            <div className="flex p-4 gap-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors font-medium"
              >
                Não, Fechar
              </button>
              <button
                onClick={handleDownloadPdf}
                className="flex-1 px-4 py-2 rounded-lg bg-zagfer-600 hover:bg-zagfer-700 text-white transition-colors font-medium shadow-sm flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Baixar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;