import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import ThreeScene from './ThreeScene';
import { useLanguage } from '../context/LanguageContext';

export default function Hero() {
  const { t, language } = useLanguage();
  const isIndic = ['hi', 'ta', 'kn', 'gu', 'bn'].includes(language);

  const renderTitle = () => {
    if (language === 'en') {
      return (
        <div className="flex flex-col">
          <div className="flex items-baseline gap-x-4 md:gap-x-8 flex-wrap">
            <span>THE</span>
            <span className="serif-text italic lowercase opacity-60 text-[0.8em] tracking-normal">future</span>
            <span>OF AFFORDABLE</span>
          </div>
          <span>MEDICINE.</span>
        </div>
      );
    }
    if (language === 'hi') {
      return (
        <div className="flex flex-col">
          <span>किफायती चिकित्सा का</span>
          <span className="serif-text italic opacity-60 text-[0.8em] tracking-normal">भविष्य।</span>
        </div>
      );
    }
    return t('heroTitle');
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-start pt-64 overflow-hidden transition-colors duration-500">
      {/* Background Marquee Text */}
      <div className="absolute top-1/2 left-0 w-full overflow-hidden pointer-events-none z-0 opacity-[0.03] select-none">
        <div className="flex whitespace-nowrap animate-marquee-slow">
          <span className="text-[30vw] font-black uppercase tracking-tighter mr-24">MEDAI-26</span>
          <span className="text-[30vw] font-black uppercase tracking-tighter mr-24">MEDAI-26</span>
          <span className="text-[30vw] font-black uppercase tracking-tighter mr-24">MEDAI-26</span>
        </div>
      </div>

      <ThreeScene />
      
      {/* Fixed Header Info */}
      <div className="absolute top-32 left-6 md:left-12 z-20">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.4em] font-black text-[var(--text)] opacity-30 mb-1">{t('project')}</span>
            <span className="text-xs font-bold text-[var(--text)]">MEDAI-26</span>
          </div>
          <div className="h-[1px] w-24 bg-grid-border border-b border-b-grid"></div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.4em] font-black text-[var(--text)] opacity-30 mb-1">{t('status')}</span>
            <span className="text-xs font-bold text-[var(--accent)]">{t('active')}</span>
          </div>
        </div>
      </div>
      
      <div className="container-fluid px-6 md:px-12 pb-12 relative z-10">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className={`display-text leading-[0.85] mb-12 mix-blend-difference text-[var(--text)] break-words ${
            isIndic ? 'text-[8vw] md:text-[6vw]' : 'text-[12vw] md:text-[10vw]'
          }`}>
            {renderTitle()}
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mt-12 items-end">
            <div className="md:col-span-4">
              <div className="flex items-start gap-4">
                <span className="text-[10px] font-black text-[var(--text)] opacity-20 mt-1">01</span>
                <p className="text-sm text-[var(--text)] opacity-50 leading-relaxed uppercase tracking-widest font-bold">
                  {t('heroSubtitle')}
                </p>
              </div>
            </div>
            
            <div className="md:col-span-8 flex flex-col md:flex-row items-end justify-end gap-12">
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-[0.3em] font-black text-[var(--text)] opacity-20 mb-4">{t('scrollToExplore')}</span>
                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-[1px] h-16 bg-gradient-to-b from-[var(--text)] to-transparent opacity-40"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      <div className="absolute top-1/2 right-0 -translate-y-1/2 hidden lg:block">
        <span className="writing-mode-vertical text-[10px] uppercase tracking-[0.5em] font-black text-[var(--text)] opacity-10 py-12 border-l border-b-grid">
          AVA DIGITAL INSPIRED • MEDAI PLATFORM • 2026
        </span>
      </div>
    </section>
  );
}
