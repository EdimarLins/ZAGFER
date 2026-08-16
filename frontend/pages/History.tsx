import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, Search, ArrowRight, ArrowLeft, Eye, X, FileText, Filter, ChevronLeft, ChevronRight, RefreshCw, ArrowRightCircle, AlertCircle } from 'lucide-react';
import { generateCheckoutPDF } from '../services/pdfService';
import { downloadCSV } from '../services/csvService';
import { HistoryRecord, ToolStatus } from '../types';

const History = () => {
  const navigate = useNavigate();
  const { history, tools, currentUser } = useApp();
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'CHECKOUT' | 'RETURN' | 'RENEWAL'>('ALL');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterText, filterType]);

  const filteredHistory = history.filter(record => {
    const matchesText =
      record.responsibleName.toLowerCase().includes(filterText.toLowerCase()) ||
      record.responsibleMatricula.includes(filterText) ||
      record.toolsSummary.toLowerCase().includes(filterText.toLowerCase()) ||
      record.dispatcherName.toLowerCase().includes(filterText.toLowerCase()) ||
      (record.observations && record.observations.toLowerCase().includes(filterText.toLowerCase()));

    const matchesType = filterType === 'ALL' || record.actionType === filterType;

    return matchesText && matchesType;
  }).sort((a, b) => b.timestamp - a.timestamp);

  // Pagination Logic
  const totalItems = filteredHistory.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredHistory.slice(startIndex, endIndex);

  const getRecordData = (recordId: string) => {
    const record = history.find(h => h.id === recordId);
    if (!record) return null;

    // Reconstruct tool objects
    const recordTools = tools.filter(t => record.toolIds.includes(t.id));

    record.toolIds.forEach(tid => {
      if (!recordTools.find(t => t.id === tid)) {
        recordTools.push({
          id: tid,
          name: 'Ferramenta Removida',
          category: 'N/A',
          sector: 'N/A',
          status: 'UNAVAILABLE' as any
        });
      }
    });

    return { record, recordTools };
  };

  const handleGoToCautela = (record: HistoryRecord) => {
    let targetCheckout = record;
    if (record.actionType === 'RENEWAL' || record.actionType === 'RETURN') {
      const originalCheckout = history.find(h =>
        h.actionType === 'CHECKOUT' &&
        h.timestamp <= record.timestamp &&
        h.toolIds.some(tid => record.toolIds.includes(tid))
      );
      if (originalCheckout) {
        targetCheckout = originalCheckout;
      }
    }

    // Verificar se há ferramentas desta cautela que ainda estão indisponíveis (em aberto)
    const isCautelaActive = targetCheckout.toolIds.some(toolId => {
      const tool = tools.find(t => t.id === toolId);
      if (!tool || tool.status !== ToolStatus.UNAVAILABLE) return false;
      // Verificar se este checkout é o mais recente para esta ferramenta
      const latestCheckout = history.find(h => h.actionType === 'CHECKOUT' && h.toolIds.includes(toolId));
      return latestCheckout?.id === targetCheckout.id;
    });

    if (isCautelaActive) {
      navigate('/return', { state: { checkoutId: targetCheckout.id } });
    } else {
      setInfoMsg('Esta cautela já foi concluída (todas as ferramentas foram devolvidas).');
      setTimeout(() => setInfoMsg(''), 5000);
    }
  };

  const handleDownload = async (recordId: string) => {
    const data = getRecordData(recordId);
    if (!data) return;

    const { record, recordTools } = data;
    let prefix = 'Retirada';
    if (record.actionType === 'RETURN') prefix = 'Devolucao';
    if (record.actionType === 'RENEWAL') prefix = 'Renovacao';

    // Async call
    const doc = await generateCheckoutPDF(record, recordTools);
    doc.save(`ZAGFER_${prefix}_${record.responsibleName}_${format(record.timestamp, 'yyyyMMdd')}.pdf`);
  };

  const handlePreview = async (recordId: string) => {
    const data = getRecordData(recordId);
    if (!data) return;

    const { record, recordTools } = data;
    // Async call
    const doc = await generateCheckoutPDF(record, recordTools);

    // Generate Blob URL for preview using createObjectURL for better browser compatibility
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    // Export filteredHistory (visualized data) or history (all data). Usually export all matches filters.
    // Let's export ALL history to be more useful for reporting, or filtered if preferred.
    // For now, let's export filtered to match what user sees.

    downloadCSV(filteredHistory, [
      { header: 'ID', accessor: (h: HistoryRecord) => h.id },
      { header: 'Data/Hora', accessor: (h: HistoryRecord) => format(h.timestamp, "dd/MM/yyyy HH:mm:ss") },
      {
        header: 'Tipo', accessor: (h: HistoryRecord) => {
          if (h.actionType === 'CHECKOUT') return 'Retirada';
          if (h.actionType === 'RETURN') return 'Devolução';
          return 'Renovação';
        }
      },
      { header: 'Responsável', accessor: (h: HistoryRecord) => h.responsibleName },
      { header: 'Matrícula Resp.', accessor: (h: HistoryRecord) => h.responsibleMatricula },
      { header: 'Despachante', accessor: (h: HistoryRecord) => h.dispatcherName },
      { header: 'Ferramentas', accessor: (h: HistoryRecord) => h.toolsSummary },
      { header: 'Previsão Devolução', accessor: (h: HistoryRecord) => h.expectedReturnDate ? format(h.expectedReturnDate, "dd/MM/yyyy HH:mm") : '' },
      { header: 'Observações', accessor: (h: HistoryRecord) => h.observations || 'Não há.' },
    ], 'ZAGFER_Historico_Cautelas.csv');
  };

  return (
    <div className="space-y-6 relative pb-8">
      {infoMsg && (
        <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 p-4 rounded-xl flex items-center justify-between gap-3 border border-amber-200 dark:border-amber-800 animate-fade-in sticky top-4 z-50 shadow-md">
          <div className="flex items-center gap-3">
            <AlertCircle className="shrink-0 text-amber-500" size={20} />
            <span className="font-medium">{infoMsg}</span>
          </div>
          <button
            onClick={() => setInfoMsg('')}
            className="p-1 hover:bg-amber-100 dark:hover:bg-amber-800/50 rounded-lg text-amber-600 dark:text-amber-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Cautelas</h2>
          <p className="text-slate-500 dark:text-slate-400">Visualize e baixe os comprovantes de retiradas e devoluções.</p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={handleExportCSV}
            className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            <Download size={20} />
            <span>Exportar CSV</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Filtrar por responsável, matrícula ou ferramenta..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-zagfer-500 outline-none text-slate-900 dark:text-white"
          />
        </div>

        {/* Type Dropdown */}
        <div className="relative min-w-[180px]">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="w-full appearance-none pl-4 pr-10 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-zagfer-500 outline-none text-slate-900 dark:text-white cursor-pointer"
          >
            <option value="ALL">Todas Operações</option>
            <option value="CHECKOUT">Retiradas</option>
            <option value="RETURN">Devoluções</option>
            <option value="RENEWAL">Renovações</option>
          </select>
          <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>
      </div>

      {/* Timeline / List */}
      <div className="space-y-4">
        {currentItems.length > 0 ? currentItems.map((record) => (
          <div key={record.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${record.actionType === 'RETURN'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : record.actionType === 'RENEWAL'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                  {record.actionType === 'RETURN' ? <ArrowLeft size={12} /> : record.actionType === 'RENEWAL' ? <RefreshCw size={12} /> : <ArrowRight size={12} />}
                  {record.actionType === 'RETURN' ? 'Devolução' : record.actionType === 'RENEWAL' ? 'Renovação' : 'Retirada'}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {format(record.timestamp, "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>

              <h4 className="text-lg font-semibold text-slate-800 dark:text-white mt-1">
                {record.responsibleName}
                <span className="text-sm font-normal text-slate-500 ml-2">({record.responsibleMatricula})</span>
              </h4>

              <div className="text-xs text-slate-400 mt-0.5 mb-2">
                Despachante: {record.dispatcherName}
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                <span className="font-medium text-slate-500 dark:text-slate-400 block mb-1 text-xs uppercase">Ferramentas:</span>
                {record.toolsSummary}
              </p>

              {record.observations && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                  <span className="font-medium text-slate-500 dark:text-slate-400 block mb-0.5 text-xs uppercase">Observações:</span>
                  {record.observations}
                </p>
              )}
            </div>

            <div className="flex flex-wrap md:flex-nowrap gap-2 items-center">
              <button
                onClick={() => handleGoToCautela(record)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-zagfer-500 hover:bg-zagfer-600 text-white rounded-lg transition-colors font-medium text-sm shadow-sm hover:shadow"
                title="Ir para Cautela"
              >
                <ArrowRightCircle size={18} />
                <span className="hidden md:inline">Ir para Cautela</span>
              </button>

              <button
                onClick={() => handlePreview(record.id)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
                title="Visualizar PDF"
              >
                <Eye size={18} />
                <span className="hidden md:inline">Visualizar</span>
              </button>

              <button
                onClick={() => handleDownload(record.id)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-zagfer-50 dark:bg-zagfer-900/20 text-zagfer-600 dark:text-zagfer-400 border border-zagfer-200 dark:border-zagfer-800 rounded-lg hover:bg-zagfer-100 dark:hover:bg-zagfer-900/40 transition-colors font-medium text-sm"
                title="Baixar PDF"
              >
                <Download size={18} />
                <span className="hidden md:inline">Baixar</span>
              </button>
            </div>
          </div>
        )) : (
          <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
            <p>Nenhuma cautela encontrada.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalItems > 0 && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400">
          <div className="font-medium">
            Mostrando {startIndex + 1} a {Math.min(endIndex, totalItems)} de {totalItems} registros
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span>Itens por página:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-zagfer-500 text-slate-700 dark:text-slate-300"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-400"
              >
                <ChevronLeft size={20} />
              </button>

              <span className="font-medium px-2">
                Página {currentPage} de {totalPages}
              </span>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-400"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText size={20} className="text-zagfer-500" />
                Visualização do Documento
              </h3>
              <button onClick={closePreview} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-300">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-900 relative p-2">
              <object
                data={previewUrl}
                type="application/pdf"
                className="w-full h-full rounded-lg"
              >
                <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                  <p className="mb-2 font-medium">Não foi possível carregar a visualização direta.</p>
                  <a
                    href={previewUrl}
                    download="documento.pdf"
                    className="text-zagfer-600 dark:text-zagfer-400 hover:underline flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-sm"
                  >
                    <Download size={16} />
                    Clique aqui para baixar o arquivo PDF
                  </a>
                </div>
              </object>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;