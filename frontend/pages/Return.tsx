import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { ToolStatus, HistoryRecord, Tool } from '../types';
import { format, addHours } from 'date-fns';
import jsPDF from 'jspdf';
import { ptBR } from 'date-fns/locale';
import { Check, Search, AlertCircle, ArrowLeftRight, ArrowLeft, ChevronRight, RefreshCw, CalendarClock, X, Download } from 'lucide-react';
import { generateCheckoutPDF } from '../services/pdfService';

// Interface para agrupar a cautela
interface ActiveCheckout {
  id: string; // Usamos o ID do registro original
  record: HistoryRecord;
  pendingTools: Tool[];
}

const Return = () => {
  const { tools, history, currentUser, updateToolStatus, addHistoryRecord, updateHistoryRecord } = useApp();
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // State para controlar qual cautela estamos visualizando detalhes
  const [selectedCheckout, setSelectedCheckout] = useState<ActiveCheckout | null>(null);

  // State para selecionar ferramentas dentro da cautela para devolver
  const [toolsToReturnIds, setToolsToReturnIds] = useState<string[]>([]);

  // Estados para Renovação
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [newDeadline, setNewDeadline] = useState('');

  // Estados para Modal de Sucesso/Download
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastGeneratedDoc, setLastGeneratedDoc] = useState<{ doc: jsPDF, filename: string } | null>(null);

  useEffect(() => {
    return () => setSuccessMsg('');
  }, []);

  // Calcular as Cautelas Ativas
  const activeCheckouts = useMemo(() => {
    const unavailableToolIds = tools.filter(t => t.status === ToolStatus.UNAVAILABLE).map(t => t.id);
    const checkoutsMap: Record<string, ActiveCheckout> = {};

    // Precisamos varrer todas as ferramentas indisponíveis e encontrar onde elas estão
    unavailableToolIds.forEach(toolId => {
      // Encontrar o checkout mais recente que contém esta ferramenta
      // Filtrar apenas checkouts
      const lastCheckout = history.find(h =>
        h.actionType === 'CHECKOUT' && h.toolIds.includes(toolId)
      );

      if (lastCheckout) {
        // Se ainda não adicionamos esta cautela ao mapa, adiciona
        if (!checkoutsMap[lastCheckout.id]) {
          checkoutsMap[lastCheckout.id] = {
            id: lastCheckout.id,
            record: lastCheckout,
            pendingTools: []
          };
        }

        // Adicionar a ferramenta atual à lista de pendentes desta cautela
        // (Apenas se ela ainda não estiver na lista, para evitar duplicatas caso o histórico tenha inconsistências)
        if (!checkoutsMap[lastCheckout.id].pendingTools.find(t => t.id === toolId)) {
          const toolObj = tools.find(t => t.id === toolId);
          if (toolObj) {
            checkoutsMap[lastCheckout.id].pendingTools.push(toolObj);
          }
        }
      }
    });

    // Transformar mapa em array, filtrar pela busca e ordenar por data (mais recente primeiro)
    return Object.values(checkoutsMap)
      .filter(checkout =>
        checkout.record.responsibleName.toLowerCase().includes(search.toLowerCase()) ||
        checkout.record.responsibleMatricula.includes(search) ||
        checkout.pendingTools.some(t => t.name.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => b.record.timestamp - a.record.timestamp);
  }, [tools, history, search]);

  // Atualiza o selectedCheckout quando o history muda (para refletir a renovação imediatamente)
  useEffect(() => {
    if (selectedCheckout) {
      const updatedCheckout = activeCheckouts.find(c => c.id === selectedCheckout.id);
      if (updatedCheckout) {
        setSelectedCheckout(updatedCheckout);
      }
    }
  }, [history, activeCheckouts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers para seleção dentro da cautela
  const toggleToolSelection = (toolId: string) => {
    setToolsToReturnIds(prev =>
      prev.includes(toolId) ? prev.filter(id => id !== toolId) : [...prev, toolId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCheckout) {
      if (toolsToReturnIds.length === selectedCheckout.pendingTools.length) {
        setToolsToReturnIds([]);
      } else {
        setToolsToReturnIds(selectedCheckout.pendingTools.map(t => t.id));
      }
    }
  };

  // Processar Devolução
  const handleConfirmReturn = async () => {
    if (!selectedCheckout || !currentUser || toolsToReturnIds.length === 0) return;

    const toolsBeingReturned = tools.filter(t => toolsToReturnIds.includes(t.id));
    const toolsSummary = toolsBeingReturned.map(t => t.name).join(', ');

    // Criar registro de devolução
    const returnRecord = {
      timestamp: Date.now(),
      actionType: 'RETURN' as const,

      dispatcherId: currentUser.id,
      dispatcherName: currentUser.name,
      dispatcherMatricula: currentUser.matricula,

      // Mantém os dados do responsável original
      responsibleName: selectedCheckout.record.responsibleName,
      responsibleMatricula: selectedCheckout.record.responsibleMatricula,

      toolIds: toolsToReturnIds,
      toolsSummary
    };

    // Gerar PDF (agora Async)
    const doc = await generateCheckoutPDF(returnRecord, toolsBeingReturned);
    const filename = `ZAGFER_Devolucao_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;

    // Armazenar para download opcional
    setLastGeneratedDoc({ doc, filename });

    // Atualizar Estado (Ferramentas ficam Disponíveis)
    updateToolStatus(toolsToReturnIds, ToolStatus.AVAILABLE);
    addHistoryRecord(returnRecord);

    // Resetar UI
    setSelectedCheckout(null);
    setToolsToReturnIds([]);

    // Mostrar modal de sucesso
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
    const isRenewal = lastGeneratedDoc?.filename.includes('Renovacao');
    setShowSuccessModal(false);
    setLastGeneratedDoc(null);
    setSuccessMsg(isRenewal ? 'Renovação registrada com sucesso!' : 'Devolução registrada com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Abrir modal de renovação
  const openRenewModal = () => {
    if (selectedCheckout) {
      // Preenche com data atual + 24h ou data atual do registro se existir
      const currentDeadline = selectedCheckout.record.expectedReturnDate;
      const defaultDate = currentDeadline ? new Date(currentDeadline) : addHours(new Date(), 24);
      setNewDeadline(format(defaultDate, "yyyy-MM-dd'T'HH:mm"));
      setIsRenewModalOpen(true);
    }
  };

  // Confirmar renovação
  const handleRenewConfirm = async () => {
    if (!selectedCheckout || !newDeadline) return;

    const newTimestamp = new Date(newDeadline).getTime();

    // 1. Atualizar registro no histórico (DB/Estado)
    updateHistoryRecord(selectedCheckout.id, {
      expectedReturnDate: newTimestamp
    });

    // 2. Criar novo registro de histórico para a Renovação
    const renewalRecord = {
      timestamp: Date.now(),
      actionType: 'RENEWAL' as const,

      dispatcherId: currentUser.id,
      dispatcherName: currentUser.name,
      dispatcherMatricula: currentUser.matricula,

      // Mantém os dados do responsável original
      responsibleName: selectedCheckout.record.responsibleName,
      responsibleMatricula: selectedCheckout.record.responsibleMatricula,

      toolIds: selectedCheckout.pendingTools.map(t => t.id),
      toolsSummary: selectedCheckout.pendingTools.map(t => t.name).join(', '),
      expectedReturnDate: newTimestamp
    };

    addHistoryRecord(renewalRecord);

    // 3. Gerar PDF de Renovação
    const doc = await generateCheckoutPDF(renewalRecord, selectedCheckout.pendingTools);
    const filename = `ZAGFER_Renovacao_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;

    // Armazenar para download opcional (abre o modal de pergunta)
    setLastGeneratedDoc({ doc, filename });
    setShowSuccessModal(true);

    setIsRenewModalOpen(false);
  };

  // Renderização Principal
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {successMsg && (
        <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-4 rounded-xl flex items-center gap-3 border border-green-200 dark:border-green-800 animate-fade-in sticky top-4 z-50">
          <Check className="shrink-0" />
          {successMsg}
        </div>
      )}

      {/* VIEW 1: Lista de Cautelas (Se nenhuma estiver selecionada) */}
      {!selectedCheckout && (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Cautelas em Aberto</h2>
            <p className="text-slate-500 dark:text-slate-400">Selecione uma cautela para realizar a devolução total ou parcial.</p>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por militar, OM/Seção ou ferramenta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-zagfer-500 outline-none shadow-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCheckouts.length > 0 ? (
              activeCheckouts.map(checkout => (
                <button
                  key={checkout.id}
                  onClick={() => {
                    setSelectedCheckout(checkout);
                    setToolsToReturnIds([]); // Reset selection when opening
                  }}
                  className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-zagfer-300 dark:hover:border-zagfer-700 transition-all text-left group flex flex-col justify-between min-h-[160px]"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                        Cautela Ativa
                      </div>
                      <span className="text-xs text-slate-400">
                        {format(checkout.record.timestamp, "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-800 dark:text-white text-lg truncate" title={checkout.record.responsibleName}>
                      {checkout.record.responsibleName}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                      OM/Seção: {checkout.record.responsibleMatricula}
                    </p>
                  </div>

                  <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {checkout.pendingTools.length} {checkout.pendingTools.length === 1 ? 'item pendente' : 'itens pendentes'}
                    </span>
                    <ChevronRight className="text-slate-300 group-hover:text-zagfer-500 transition-colors" size={20} />
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
                <AlertCircle className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Nenhuma cautela encontrada</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Não há ferramentas emprestadas no momento com esses critérios.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* VIEW 2: Detalhes da Cautela (Seleção para devolução) */}
      {selectedCheckout && (
        <div className="animate-in slide-in-from-right-4 duration-300">
          <button
            onClick={() => setSelectedCheckout(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Voltar para lista
          </button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Coluna Esquerda: Resumo */}
            <div className="md:col-span-1 space-y-4">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 sticky top-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Dados da Cautela</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Responsável</label>
                    <div className="text-slate-900 dark:text-white font-medium text-lg">{selectedCheckout.record.responsibleName}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">OM/Seção</label>
                    <div className="text-slate-900 dark:text-white font-mono">{selectedCheckout.record.responsibleMatricula}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Data da Retirada</label>
                    <div className="text-slate-700 dark:text-slate-300">
                      {format(selectedCheckout.record.timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Previsão de Devolução</label>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <CalendarClock size={16} className="text-zagfer-500" />
                      {selectedCheckout.record.expectedReturnDate
                        ? format(selectedCheckout.record.expectedReturnDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : 'Não definida'}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-3">

                    {/* Botão Renovar */}
                    <button
                      onClick={openRenewModal}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border border-blue-200 dark:border-blue-800/50"
                    >
                      <RefreshCw size={18} />
                      Renovar Cautela
                    </button>

                    <div className="flex justify-between items-center mt-2 mb-1">
                      <span className="text-sm text-slate-500">A devolver:</span>
                      <span className={`font-bold text-xl ${toolsToReturnIds.length > 0 ? 'text-green-600' : 'text-slate-300'}`}>
                        {toolsToReturnIds.length} <span className="text-sm font-normal text-slate-400">/ {selectedCheckout.pendingTools.length}</span>
                      </span>
                    </div>

                    <button
                      onClick={handleConfirmReturn}
                      disabled={toolsToReturnIds.length === 0}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold shadow-lg transition-all
                          ${toolsToReturnIds.length > 0
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/30 transform hover:scale-[1.02]'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                    >
                      <ArrowLeftRight size={18} />
                      {toolsToReturnIds.length === selectedCheckout.pendingTools.length ? 'Devolver Tudo' : 'Devolver Parcial'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Lista de Ferramentas */}
            <div className="md:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-300">Ferramentas Pendentes</h3>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-zagfer-600 dark:text-zagfer-400 hover:underline font-medium"
                  >
                    {toolsToReturnIds.length === selectedCheckout.pendingTools.length ? 'Desmarcar todas' : 'Marcar todas'}
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[60vh] overflow-y-auto">
                  {selectedCheckout.pendingTools.map(tool => (
                    <label
                      key={tool.id}
                      className={`flex items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors select-none ${toolsToReturnIds.includes(tool.id) ? 'bg-green-50 dark:bg-green-900/10' : ''}`}
                    >
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={toolsToReturnIds.includes(tool.id)}
                          onChange={() => toggleToolSelection(tool.id)}
                          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 dark:border-slate-500 checked:border-green-500 checked:bg-green-500 transition-all"
                        />
                        <Check className="absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-white" size={14} strokeWidth={3} style={{ left: 3, top: 3 }} />
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex justify-between">
                          <span className={`font-medium ${toolsToReturnIds.includes(tool.id) ? 'text-green-700 dark:text-green-400' : 'text-slate-800 dark:text-white'}`}>
                            {tool.name}
                          </span>

                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 flex gap-3 mt-0.5">
                          <span>{tool.category}</span>
                          {tool.size && <span>• Tam: {tool.size}</span>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Renovação */}
      {isRenewModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <RefreshCw size={20} className="text-blue-500" />
                Renovar Cautela
              </h3>
              <button onClick={() => setIsRenewModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Selecione o novo prazo de devolução para esta cautela.
              </p>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Novo Prazo</label>
                <div className="relative">
                  <CalendarClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="datetime-local"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex p-4 gap-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setIsRenewModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleRenewConfirm}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors font-medium shadow-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sucesso e Download */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                <Check size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                {lastGeneratedDoc?.filename.includes('Renovacao') ? 'Renovação Confirmada!' : 'Devolução Confirmada!'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                {lastGeneratedDoc?.filename.includes('Renovacao')
                  ? 'A renovação foi registrada com sucesso. Deseja baixar o comprovante em PDF agora?'
                  : 'A devolução foi registrada com sucesso. Deseja baixar o comprovante em PDF agora?'}
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

export default Return;