import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-b-grid py-24 bg-[var(--bg)] text-[var(--text)] transition-colors duration-500">
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-6">
            <h2 className="display-text text-6xl md:text-8xl mb-8">MEDAI©</h2>
            <p className="text-[var(--text)] opacity-40 max-w-sm">
              {t('footerDesc')}
            </p>
          </div>
          <div className="md:col-span-3">
            <span className="block text-[10px] uppercase tracking-[0.3em] font-bold text-[var(--text)] opacity-40 mb-6">{t('navigation')}</span>
            <ul className="space-y-4">
              {[t('home'), t('philosophy'), t('database'), t('search')].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm uppercase tracking-widest font-bold hover:opacity-60 transition-opacity">{item}</a>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-3">
            <span className="block text-[10px] uppercase tracking-[0.3em] font-bold text-[var(--text)] opacity-40 mb-6">{t('socials')}</span>
            <ul className="space-y-4">
              {['Instagram', 'Twitter', 'LinkedIn', 'Github'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm uppercase tracking-widest font-bold hover:opacity-60 transition-opacity">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="mt-24 pt-12 border-t border-b-grid flex flex-col md:flex-row items-center justify-between gap-6">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text)] opacity-20">© 2026 MEDAI PLATFORM</span>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text)] opacity-40">{t('madeWith')}</span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--accent)]">{t('madeByIndians')}</span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text)] opacity-20">{t('madeInAugust')}</span>
        </div>
      </div>
    </footer>
  );
}
