import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function Comparison() {
  const { t, language } = useLanguage();
  const isIndic = ['hi', 'ta', 'kn', 'gu', 'bn'].includes(language);

  return (
    <section id="database" className="min-h-screen border-t border-b-grid bg-[var(--bg)] text-[var(--text)] flex flex-col transition-colors duration-500">
      {/* Header Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-b-grid">
        <div className="md:col-span-4 p-12 border-r border-r-grid">
          <span className="text-[10px] uppercase tracking-[0.4em] font-black text-[var(--text)] opacity-30 block mb-4">03 / {t('databaseLabel')}</span>
          <h2 className={`font-black uppercase tracking-tighter leading-[0.9] break-words ${
            isIndic ? 'text-3xl md:text-4xl' : 'text-5xl'
          }`}>
            {t('accessPortal')}
          </h2>
        </div>
        <div className="md:col-span-8 p-12 flex items-end justify-between">
          <div className="max-w-md">
            <p className="text-xs uppercase tracking-widest font-bold text-[var(--text)] opacity-40 leading-relaxed">
              {t('databaseDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center">
          <div className="flex whitespace-nowrap animate-marquee-slow select-none">
            <span className="display-text text-[30vw] leading-none mr-24 text-[var(--text)]">
              {t('databaseLabel')}
            </span>
            <span className="display-text text-[30vw] leading-none mr-24 text-[var(--text)]">
              {t('databaseLabel')}
            </span>
            <span className="display-text text-[30vw] leading-none mr-24 text-[var(--text)]">
              {t('databaseLabel')}
            </span>
            <span className="display-text text-[30vw] leading-none mr-24 text-[var(--text)]">
              {t('databaseLabel')}
            </span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 text-center"
        >
          <span className="text-[10px] uppercase tracking-[0.5em] font-black text-[var(--text)] opacity-30 mb-8 block">{t('readyForAnalysis')}</span>
          <h3 className={`font-black uppercase tracking-tighter leading-[0.8] mb-12 break-words ${
            isIndic ? 'text-[6vw] md:text-[5vw]' : 'text-[8vw]'
          }`}>
            {t('exploreFullArchive')}
          </h3>
          
          <Link 
            to="/search" 
            className="group relative inline-flex items-center justify-center px-24 py-10 bg-[var(--text)] text-[var(--bg)] font-black uppercase tracking-[0.3em] text-sm overflow-hidden transition-all hover:bg-[var(--bg)] hover:text-[var(--text)] border border-[var(--text)]"
          >
            <span className="relative z-10">{t('enterDatabase')}</span>
            <div className="absolute inset-0 bg-[var(--bg)] translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[0.16, 1, 0.3, 1]"></div>
          </Link>
          
          <div className="mt-16 grid grid-cols-3 gap-12 max-w-2xl mx-auto border-t border-b-grid pt-12">
            <div className="text-center">
              <span className="block text-2xl font-black tracking-tighter">5,000+</span>
              <span className="text-[8px] uppercase tracking-widest font-bold text-[var(--text)] opacity-30">{t('medicines')}</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-black tracking-tighter">100%</span>
              <span className="text-[8px] uppercase tracking-widest font-bold text-[var(--text)] opacity-30">{t('verified')}</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-black tracking-tighter">80%</span>
              <span className="text-[8px] uppercase tracking-widest font-bold text-[var(--text)] opacity-30">{t('avgSavings')}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Rail */}
      <div className="border-t border-b-grid p-6 flex justify-between items-center">
        <span className="text-[8px] uppercase tracking-[0.4em] font-black text-[var(--text)] opacity-20">{t('systemStatusOperational')}</span>
        <span className="text-[8px] uppercase tracking-[0.4em] font-black text-[var(--text)] opacity-20">{t('copyrightMedAI')}</span>
      </div>
    </section>
  );
}
