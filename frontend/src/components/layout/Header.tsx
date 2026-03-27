import React from 'react';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-10">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="flex items-center space-x-4">
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {currentDate}
        </div>
      </div>
    </header>
  );
};

export default Header;
