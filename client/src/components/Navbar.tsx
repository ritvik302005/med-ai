import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ThemeSwitcher from './ThemeSwitcher';
import { useAuth } from '../context/AuthContext';
import { useLanguage, LanguageType } from '../context/LanguageContext';
import { LogOut, User as UserIcon, Globe, ChevronDown, ArrowLeft } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLangs, setShowLangs] = useState(false);

  const languages: { code: LanguageType; name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'ta', name: 'தமிழ்' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
    { code: 'gu', name: 'ગુજરાતી' },
    { code: 'bn', name: 'বাংলা' },
  ];

  const isHomePage = location.pathname === '/';

  return (
    <nav className="fixed top-0 left-0 w-full z-[100] border-b border-b-grid bg-[var(--bg)]/50 backdrop-blur-md transition-colors duration-500">
      <div className="grid grid-cols-4 md:grid-cols-12 w-full">
        <div className="col-span-2 md:col-span-3 p-6 border-r border-r-grid flex items-center gap-4">
          {!isHomePage && (
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-[var(--text)]/10 transition-colors rounded-full"
              title="Go Back"
            >
              <ArrowLeft size={18} className="text-[var(--text)]" />
            </button>
          )}
          <Link to="/" className="text-xl font-black tracking-tighter text-[var(--text)]">MEDAI©</Link>
        </div>
        <div className="hidden md:flex col-span-5 items-center justify-center border-r border-r-grid gap-8">
          {[
            { name: t('home'), path: '/' },
            { name: t('search'), path: '/search' },
            ...(user
              ? [
                  { name: t('dashboard'), path: '/dashboard' },
                  { name: 'AI', path: '/ai-chat' },
                  { name: 'Pharmacy', path: '/pharmacy-map' },
                  { name: 'Order', path: '/order-medicines' },
                ]
              : [])
          ].map((item) => (
            <Link 
              key={item.name} 
              to={item.path} 
              className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text)] opacity-70 hover:opacity-100 transition-all"
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div className="col-span-2 md:col-span-4 flex items-center justify-end p-6 gap-4 sm:gap-6">
          {/* Language Selector */}
          <div className="relative">
            <button 
              onClick={() => setShowLangs(!showLangs)}
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-black text-[var(--text)] hover:opacity-50 transition-all"
            >
              <Globe size={14} />
              <span className="hidden lg:inline">{languages.find(l => l.code === language)?.name}</span>
              <ChevronDown size={12} />
            </button>
            {showLangs && (
              <div className="absolute top-full right-0 mt-2 bg-[var(--bg)] border border-grid shadow-[4px_4px_0px_0px_var(--text)] min-w-[120px] z-[110]">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowLangs(false);
                    }}
                    className="w-full text-left px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-black text-[var(--text)] hover:bg-[var(--text)] hover:text-[var(--bg)] transition-all"
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ThemeSwitcher />
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-black text-[var(--text)]">
                <UserIcon size={12} />
                <span className="max-w-[100px] truncate">{user.displayName || 'User'}</span>
              </div>
              <button 
                onClick={logout}
                className="text-[10px] uppercase tracking-[0.2em] font-black bg-[var(--text)] text-[var(--bg)] px-4 py-2 hover:bg-transparent hover:text-[var(--text)] border border-[var(--text)] transition-all flex items-center gap-2"
              >
                <LogOut size={12} />
                <span className="hidden sm:inline">{t('logout')}</span>
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={() => navigate('/signin')}
                className="hidden sm:block text-[10px] uppercase tracking-[0.2em] font-black text-[var(--text)] hover:opacity-50 transition-all"
              >
                {t('signin')}
              </button>
              <button 
                onClick={() => navigate('/signup')}
                className="text-[10px] uppercase tracking-[0.2em] font-black bg-[var(--text)] text-[var(--bg)] px-4 sm:px-6 py-2 hover:bg-transparent hover:text-[var(--text)] border border-[var(--text)] transition-all"
              >
                {t('signup')}
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
