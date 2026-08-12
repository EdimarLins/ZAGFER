import React, { createContext, useContext, useState, useEffect } from 'react';
import { Tool, User, HistoryRecord, ToolStatus } from '../types';
import { api } from '../services/api';

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currentUser: User | null;
  setupRequired: boolean | null;
  login: (matricula: string, password?: string) => Promise<boolean>;
  logout: () => void;
  setupMaster: (data: { name: string; matricula: string; password: string }) => Promise<void>;

  tools: Tool[];
  users: User[];
  history: HistoryRecord[];
  isLoading: boolean;

  addTool: (tool: Omit<Tool, 'id'>) => Promise<void>;
  bulkAddTools: (tools: Omit<Tool, 'id'>[]) => Promise<void>;
  updateTool: (tool: Tool) => Promise<void>;
  deleteTool: (id: string) => Promise<void>;
  updateToolStatus: (toolIds: string[], status: ToolStatus) => Promise<void>;

  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  addHistoryRecord: (record: Omit<HistoryRecord, 'id'>) => Promise<void>;
  updateHistoryRecord: (id: string, updates: Partial<HistoryRecord>) => Promise<void>;

  firstAccess: (matricula: string, password: string) => Promise<boolean>;
  resetUserPassword: (id: string) => Promise<boolean>;
  clearAllTools: (password: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper para carregar dados do LocalStorage com fallback
const loadFromStorage = <T,>(key: string, fallback: T): T => {
  const storedItem = localStorage.getItem(key);
  if (!storedItem) return fallback;

  try {
    return JSON.parse(storedItem);
  } catch (error) {
    if (typeof fallback === 'string') {
      return storedItem as unknown as T;
    }
    console.error(`Erro ao carregar ${key} do LocalStorage:`, error);
    return fallback;
  }
};

export const AppProvider = ({ children }: { children?: React.ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    loadFromStorage('zagfer_theme', 'light')
  );

  const [currentUser, setCurrentUser] = useState<User | null>(() => loadFromStorage('zagfer_user', null));
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Dados
  const [tools, setTools] = useState<Tool[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  // Inicialização de Dados
  const fetchData = async () => {
    setIsLoading(true);
    try {
      console.log("ZAGFER: Carregando dados do servidor...");
      const setupRes = await api.getSetupStatus().catch(() => ({ setupRequired: false }));
      setSetupRequired(setupRes.setupRequired);

      if (!setupRes.setupRequired) {
        const [toolsData, usersData, historyData] = await Promise.all([
          api.getTools(),
          api.getUsers(),
          api.getHistory()
        ]);

        setTools(toolsData);
        setUsers(usersData);
        setHistory(historyData);
      }
    } catch (error) {
      console.error("Erro ao carregar dados da API:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Efeitos de Persistência LOCAL (Tema e User apenas)
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('zagfer_theme', JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('zagfer_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('zagfer_user');
    }
  }, [currentUser]);

  // --- ACTIONS (API) ---

  const addTool = async (toolData: Omit<Tool, 'id'>) => {
    try {
      const newTool = await api.addTool(toolData);
      setTools(prev => [...prev, newTool]);
    } catch (error) {
      console.error("Erro ao adicionar ferramenta:", error);
    }
  };

  const bulkAddTools = async (newToolsData: Omit<Tool, 'id'>[]) => {
    // Serial execution for now
    for (const tool of newToolsData) {
      await addTool(tool);
    }
  };

  const updateTool = async (updatedTool: Tool) => {
    try {
      const savedTool = await api.updateTool(updatedTool);
      setTools(prev => prev.map(t => t.id === savedTool.id ? savedTool : t));
    } catch (error) {
      console.error("Erro ao atualizar ferramenta:", error);
    }
  };

  const deleteTool = async (id: string) => {
    try {
      await api.deleteTool(id);
      setTools(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error("Erro ao deletar ferramenta:", error);
    }
  };

  const updateToolStatus = async (toolIds: string[], status: ToolStatus) => {
    // Optimistic update
    setTools(prevTools => prevTools.map(t =>
      toolIds.includes(t.id) ? { ...t, status } : t
    ));

    try {
      // Loop updates
      for (const id of toolIds) {
        const tool = tools.find(t => t.id === id);
        if (tool) {
          await api.updateTool({ ...tool, status });
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar status em massa:", error);
      // Revert optimistic update? Leaving simple for now.
      fetchData(); // Reload to sync
    }
  };

  const addUser = async (userData: Omit<User, 'id'>) => {
    try {
      const newUser = await api.addUser(userData);
      setUsers(prev => [...prev, newUser]);
    } catch (error) {
      console.error("Erro ao adicionar usuário:", error);
      throw error;
    }
  };

  const updateUser = async (updatedUser: User) => {
    try {
      const savedUser = await api.updateUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === savedUser.id ? savedUser : u));
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      throw error;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await api.deleteUser(id);
      const remaining = await api.getUsers();
      setUsers(remaining);
      if (remaining.length === 0) {
        // Nenhum usuário restante: voltar para o setup
        setCurrentUser(null);
        setSetupRequired(true);
      }
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      throw error;
    }
  };

  const addHistoryRecord = async (recordData: Omit<HistoryRecord, 'id'>) => {
    try {
      // API generates ID
      const newRecord = await api.addHistory(recordData);
      setHistory(prev => [newRecord, ...prev]);
    } catch (error) {
      console.error("Erro ao adicionar histórico:", error);
    }
  };

  const updateHistoryRecord = async (id: string, updates: Partial<HistoryRecord>) => {
    try {
      const updatedRecord = await api.updateHistory(id, updates);
      setHistory(prev => prev.map(h => h.id === id ? updatedRecord : h));
    } catch (error) {
      console.error("Erro ao atualizar histórico:", error);
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const login = async (matricula: string, password?: string) => {
    try {
      const { user } = await api.login(matricula, password || ''); // Password mandatory in backend now
      if (user) {
        setCurrentUser(user);
        return true;
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
    return false;
  };

  const firstAccess = async (matricula: string, password: string) => {
    try {
      await api.firstAccess(matricula, password);
      return true;
    } catch (error) {
      console.error("First access failed:", error);
      throw error; // Let component handle error
    }
  };

  const resetUserPassword = async (id: string) => {
    try {
      await api.resetUserPassword(id);
      return true;
    } catch (error) {
      console.error("Reset password failed:", error);
      return false;
    }
  };

  const clearAllTools = async (password: string) => {
    if (!currentUser) return;
    try {
      await api.clearTools(currentUser.matricula, password);
      setTools([]); // Limpa o estado local
    } catch (error) {
      console.error("Erro ao apagar ferramentas:", error);
      throw error;
    }
  };

  const setupMaster = async (data: { name: string; matricula: string; password: string }) => {
    try {
      const res = await api.setupMaster(data);
      if (res.user) {
        setCurrentUser(res.user);
        setSetupRequired(false);
        await fetchData();
      }
    } catch (error) {
      console.error("Erro ao configurar usuário mestre:", error);
      throw error;
    }
  };

  const logout = () => setCurrentUser(null);

  return (
    <AppContext.Provider value={{
      theme, toggleTheme,
      currentUser, setupRequired, login, logout, setupMaster,
      tools, users, history, isLoading,
      addTool, bulkAddTools, updateTool, deleteTool, updateToolStatus,
      addUser, updateUser, deleteUser,
      addHistoryRecord, updateHistoryRecord,
      firstAccess, resetUserPassword, clearAllTools
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};