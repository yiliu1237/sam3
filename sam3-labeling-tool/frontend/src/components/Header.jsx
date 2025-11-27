import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Image, FolderOpen } from 'lucide-react';
import useStore from '../store/useStore';

const Header = () => {
  const location = useLocation();
  const { theme, toggleTheme, mode, setMode } = useStore();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S3</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              SAM 3 Labeling Tool
            </h1>
            <span className="px-2 py-1 text-xs font-mono bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded border border-purple-300 dark:border-purple-700">
              v7.2-MULTI
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-1">
            <Link
              to="/single"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isActive('/single')
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Image size={18} />
              <span className="font-medium">Single Mode</span>
            </Link>

            <Link
              to="/batch"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isActive('/batch')
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <FolderOpen size={18} />
              <span className="font-medium">Batch Mode</span>
            </Link>
          </nav>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
