import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Logo = ({ size = 'md', className = '' }: LogoProps) => {
  // Mapeamento de tamanhos para classes Tailwind
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-32 h-32', // Tamanho maior para a tela de login
  };

  return (
    <img
      src="/logo.png"
      alt="ZAGFER Logo"
      className={`
        ${sizes[size]}
        object-contain
        drop-shadow-lg
        transition-transform duration-300 hover:scale-105
        ${className}
      `}
      onError={(e) => {
        // Fallback visual caso a imagem não seja encontrada
        e.currentTarget.style.display = 'none';
        const parent = e.currentTarget.parentElement;
        if (parent) {
            const fallback = document.createElement('div');
            fallback.innerText = 'LOGO';
            fallback.className = 'font-bold text-slate-800 bg-slate-200 flex items-center justify-center rounded-lg ' + sizes[size];
            parent.appendChild(fallback);
        }
      }}
    />
  );
};

export default Logo;