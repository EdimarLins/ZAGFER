import React, { useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { ToolStatus, Tool, HistoryRecord } from '../types';
import { format, isAfter, differenceInHours, addDays, isBefore, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, CheckCircle, XCircle, AlertTriangle, FileText, AlertCircle, Clock } from 'lucide-react';

const Dashboard = () => {
  const { tools, history } = useApp();

  // 1. Availability Stats
  const availableCount = tools.filter(t => t.status === ToolStatus.AVAILABLE).length;
  const unavailableCount = tools.filter(t => t.status === ToolStatus.UNAVAILABLE).length;
  const totalTools = tools.length;
  const availablePercentage = totalTools > 0 ? (availableCount / totalTools) * 100 : 0;

  // 2. Active Cautelas (Checkouts that have unavailable tools linked to them)
  const activeCautelasCount = useMemo(() => {
    const unavailableToolIds = tools.filter(t => t.status === ToolStatus.UNAVAILABLE).map(t => t.id);
    const activeCheckoutIds = new Set<string>();

    unavailableToolIds.forEach(toolId => {
      // Find the LATEST checkout for this tool
      const lastCheckout = history.find(h => h.actionType === 'CHECKOUT' && h.toolIds.includes(toolId));
      if (lastCheckout) {
        activeCheckoutIds.add(lastCheckout.id);
      }
    });

    return activeCheckoutIds.size;
  }, [tools, history]);

  // 3. Overdue Logic (Alertas de Atraso)
  const overdueItems = useMemo(() => {
    const now = Date.now();
    const unavailableTools = tools.filter(t => t.status === ToolStatus.UNAVAILABLE);

    const alerts = unavailableTools.map(tool => {
      const lastCheckout = history.find(h =>
        h.actionType === 'CHECKOUT' && h.toolIds.includes(tool.id)
      );

      if (!lastCheckout) return null;

      const deadline = lastCheckout.expectedReturnDate || (lastCheckout.timestamp + 24 * 60 * 60 * 1000);

      if (isAfter(now, deadline)) {
        const hoursLate = differenceInHours(now, deadline);
        return {
          tool,
          record: lastCheckout,
          hoursLate: hoursLate === 0 ? 1 : hoursLate,
          deadline
        };
      }
      return null;
    }).filter((item): item is { tool: Tool, record: HistoryRecord, hoursLate: number, deadline: number } => item !== null);

    return alerts.sort((a, b) => b.hoursLate - a.hoursLate);
  }, [tools, history]);

  // 3.5 Expiring Soon Logic (Próximos 2 dias)
  const expiringSoonItems = useMemo(() => {
    const now = Date.now();
    const twoDaysFromNow = addDays(now, 2).getTime();
    const unavailableTools = tools.filter(t => t.status === ToolStatus.UNAVAILABLE);

    const alerts = unavailableTools.map(tool => {
      const lastCheckout = history.find(h =>
        h.actionType === 'CHECKOUT' && h.toolIds.includes(tool.id)
      );

      if (!lastCheckout) return null;

      const deadline = lastCheckout.expectedReturnDate || (lastCheckout.timestamp + 24 * 60 * 60 * 1000);

      // Criteria: Deadline is in the future ( > now) AND Deadline is before 2 days from now
      if (isAfter(deadline, now) && isBefore(deadline, twoDaysFromNow)) {
        const hoursLeft = differenceInHours(deadline, now);
        return {
          tool,
          record: lastCheckout,
          hoursLeft, // Hours until deadline
          deadline
        };
      }
      return null;
    }).filter((item): item is { tool: Tool, record: HistoryRecord, hoursLeft: number, deadline: number } => item !== null);

    return alerts.sort((a, b) => a.hoursLeft - b.hoursLeft); // Most urgent first
  }, [tools, history]);


  // 4. Most Borrowed (Last 30 days)
  const topTools = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentCheckouts = history.filter(h =>
      h.actionType === 'CHECKOUT' && isAfter(h.timestamp, thirtyDaysAgo)
    );

    const toolCounts: Record<string, number> = {};
    recentCheckouts.forEach(record => {
      record.toolIds.forEach(id => {
        toolCounts[id] = (toolCounts[id] || 0) + 1;
      });
    });

    return Object.entries(toolCounts)
      .map(([id, count]) => {
        const tool = tools.find(t => t.id === id);
        return { name: tool ? tool.name : 'Desconhecida', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [history, tools]);


  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard Gerencial</h2>
        <p className="text-slate-500 dark:text-slate-400">Visão geral do inventário e movimentações.</p>
      </div>

      {/* ALERTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Alerta de Atrasos */}
        {overdueItems.length > 0 ? (
          <div className="col-span-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
              <h3 className="text-lg font-bold text-red-800 dark:text-red-300">
                Atrasadas ({overdueItems.length})
              </h3>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {overdueItems.map((item) => (
                <div key={`${item.tool.id}-${item.record.id}`} className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border-l-4 border-red-500">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-800 dark:text-white truncate text-sm" title={item.tool.name}>{item.tool.name}</span>
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 whitespace-nowrap">+{item.hoursLate}h</span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    {item.record.responsibleName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Alerta: Vencendo em Breve (Próximos 2 dias) */}
        {expiringSoonItems.length > 0 ? (
          <div className={`col-span-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 ${overdueItems.length === 0 ? 'lg:col-span-2' : ''}`}>
            <div className="flex items-center gap-3 mb-4">
              {/* Ícone de Alerta/Relógio como solicitado */}
              <AlertCircle className="text-amber-600 dark:text-amber-400" size={24} />
              <h3 className="text-lg font-bold text-amber-800 dark:text-amber-300">
                Vencendo em Breve ({expiringSoonItems.length})
              </h3>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {expiringSoonItems.map((item) => (
                <div key={`${item.tool.id}-${item.record.id}`} className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border-l-4 border-amber-500">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-800 dark:text-white truncate text-sm" title={item.tool.name}>{item.tool.name}</span>
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      <Clock size={12} />
                      {item.hoursLeft < 1 ? '< 1h' : `${item.hoursLeft}h`}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 flex justify-between">
                    <span>{item.record.responsibleName}</span>
                    <span className="text-slate-400">{format(item.deadline, "dd/MM HH:mm")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

      </div>

      {/* Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Cautelas (Em Aberto)</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{activeCautelasCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Ferramentas Disponíveis</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{availableCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Em Uso (Indisponíveis)</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{unavailableCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Availability Bar Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Disponibilidade Atual</h3>
          <div className="flex flex-col gap-6">
            {/* Visual Bar */}
            <div className="h-12 w-full bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden flex relative">
              <div
                className="h-full bg-green-500 transition-all duration-1000"
                style={{ width: `${availablePercentage}%` }}
              />
              <div
                className="h-full bg-red-500 transition-all duration-1000"
                style={{ width: `${100 - availablePercentage}%` }}
              />
            </div>

            {/* Legend */}
            <div className="flex justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-slate-600 dark:text-slate-300 font-medium">Disponível ({Math.round(availablePercentage)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-slate-600 dark:text-slate-300 font-medium">Em Uso ({Math.round(100 - availablePercentage)}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Most Borrowed Tools */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-zagfer-500" />
            Mais Populares (30 dias)
          </h3>
          <div className="space-y-4">
            {topTools.length > 0 ? topTools.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-bold text-xs">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-slate-800 dark:text-white">{item.name}</span>
                    <span className="text-xs text-slate-500">{item.count} usos</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zagfer-500 rounded-full"
                      style={{ width: `${(item.count / (topTools[0].count || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-slate-400 text-sm">Sem dados recentes de uso.</div>
            )}
          </div>
        </div>


      </div>
    </div>
  );
};

export default Dashboard;