import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import Logo from '../components/Logo';
import { ShieldCheck, User, Key, Lock, Sparkles } from 'lucide-react';

const MasterSetup: React.FC = () => {
  const [name, setName] = useState('');
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setupMaster } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Por favor, informe o Nome.');
      return;
    }
    if (!matricula.trim()) {
      setError('Por favor, informe a Matrícula / Login.');
      return;
    }
    if (!password) {
      setError('Por favor, crie uma Senha.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem. Verifique o campo "Repetir Senha".');
      return;
    }

    setIsSubmitting(true);
    try {
      await setupMaster({
        name: name.trim(),
        matricula: matricula.trim(),
        password
      });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar o usuário mestre.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] right-[5%] w-[40%] h-[40%] bg-zagfer-500/10 dark:bg-zagfer-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-lg w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 md:p-10 transition-colors duration-300 relative z-10 border border-slate-100 dark:border-slate-700/50">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 transform hover:scale-105 transition-transform duration-500">
            <Logo size="xl" />
          </div>
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2 border border-amber-200 dark:border-amber-800/40">
            <Sparkles size={14} />
            Primeiro Acesso ao Sistema
          </div>

          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight text-center">
            Configurar Usuário Mestre
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium text-center mt-1">
            Cadastre as credenciais do administrador principal da plataforma.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nome */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
              Nome
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-zagfer-500 transition-colors">
                <User size={18} />
              </div>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-base placeholder-slate-400 focus:ring-2 focus:ring-zagfer-500 focus:border-transparent outline-none transition-all shadow-inner"
                placeholder="Ex: Carlos Silva"
                autoFocus
              />
            </div>
          </div>

          {/* Matrícula / Login */}
          <div>
            <label htmlFor="matricula" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
              Matrícula / Login
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-zagfer-500 transition-colors">
                <ShieldCheck size={18} />
              </div>
              <input
                id="matricula"
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-base placeholder-slate-400 focus:ring-2 focus:ring-zagfer-500 focus:border-transparent outline-none transition-all shadow-inner"
                placeholder="Ex: admin ou 1001"
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
              Senha
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-zagfer-500 transition-colors">
                <Key size={18} />
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-base placeholder-slate-400 focus:ring-2 focus:ring-zagfer-500 focus:border-transparent outline-none transition-all shadow-inner"
                placeholder="Digite sua senha mestre..."
              />
            </div>
          </div>

          {/* Repetir Senha */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
              Repetir Senha
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-zagfer-500 transition-colors">
                <Lock size={18} />
              </div>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-base placeholder-slate-400 focus:ring-2 focus:ring-zagfer-500 focus:border-transparent outline-none transition-all shadow-inner"
                placeholder="Repita a senha para confirmar..."
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center justify-center font-medium animate-in fade-in slide-in-from-top-2 border border-red-200 dark:border-red-800/40">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-zagfer-500 to-zagfer-700 hover:from-zagfer-600 hover:to-zagfer-800 text-white font-bold py-4 rounded-2xl transition-all duration-200 shadow-lg shadow-zagfer-500/30 hover:shadow-zagfer-500/50 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            <ShieldCheck size={20} />
            {isSubmitting ? 'Cadastrando Mestre...' : 'Criar Usuário Mestre'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-100 dark:border-slate-700/60 pt-4">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            ZAGFER &bull; As credenciais criadas terão permissão total de Administrador.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MasterSetup;
