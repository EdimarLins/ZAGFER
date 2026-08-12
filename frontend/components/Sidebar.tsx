import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import Logo from './Logo';
import { 
  Wrench, 
  ClipboardList, 
  Users, 
  History, 
  LogOut, 
  Moon, 
  Sun,
  LayoutDashboard,
  ArrowLeftRight
} from 'lucide-react';

const Sidebar = () => {
  const { theme, toggleTheme, logout, currentUser } = useApp();

  const navClasses = ({ isActive }: { isActive: boolean }) => 
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
      isActive 
        ? 'bg-zagfer-500 text-white shadow-md' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  return (
    <aside className="w-20 md:w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col justify-between h-full transition-all duration-300 z-20">
      <div>
        {/* Brand */}
        <div className="h-24 flex items-center justify-center md:justify-start px-6 border-b border-slate-100 dark:border-slate-700">
          <Logo size="md" />
          <div className="hidden md:flex flex-col ml-3">
            <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white leading-none">
              ZAGFER
            </span>
            <span className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase mt-1">
              Ferramentaria
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
          <NavLink to="/" className={navClasses}>
            <LayoutDashboard size={20} />
            <span className="hidden md:block font-medium">Dashboard</span>
          </NavLink>

          <NavLink to="/tools" className={navClasses}>
            <Wrench size={20} />
            <span className="hidden md:block font-medium">Ferramentas</span>
          </NavLink>
          
          <NavLink to="/checkout" className={navClasses}>
            <ClipboardList size={20} />
            <span className="hidden md:block font-medium">Retirada</span>
          </NavLink>

          <NavLink to="/return" className={navClasses}>
            <ArrowLeftRight size={20} />
            <span className="hidden md:block font-medium">Devolução</span>
          </NavLink>
          
          {currentUser?.role === 'admin' && (
            <NavLink to="/users" className={navClasses}>
              <Users size={20} />
              <span className="hidden md:block font-medium">Usuários</span>
            </NavLink>
          )}
          
          <NavLink to="/history" className={navClasses}>
            <History size={20} />
            <span className="hidden md:block font-medium">Cautelas</span>
          </NavLink>
        </nav>
      </div>

      {/* Footer / User Info */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-700">
        <div className="flex flex-col gap-2">
          <div className="hidden md:flex flex-col mb-4 px-2">
            <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">{currentUser?.name}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Mat: {currentUser?.matricula}</span>
          </div>
          
          <button 
            onClick={toggleTheme}
            className="flex items-center justify-center md:justify-start gap-3 px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span className="hidden md:block text-sm font-medium">
              {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            </span>
          </button>

          <button 
            onClick={logout}
            className="flex items-center justify-center md:justify-start gap-3 px-4 py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={20} />
            <span className="hidden md:block text-sm font-medium">Sair</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;