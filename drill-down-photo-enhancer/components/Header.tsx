import React from 'react';
import SparklesIcon from './icons/SparklesIcon';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-900/80 backdrop-blur-sm shadow-lg sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center">
            <div className="flex items-center gap-3">
                <SparklesIcon className="w-8 h-8 text-indigo-400" />
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    Drill Down Photo Enhancer
                </h1>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;