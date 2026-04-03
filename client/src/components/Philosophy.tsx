import React from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

export default function Philosophy() {
  const { t, language } = useLanguage();
  const isIndic = ['hi', 'ta', 'kn', 'gu', 'bn'].includes(language);

  return (
    <section id="philosophy" className="py-32 border-t border-b-grid transition-colors duration-500">
      <div className="container-fluid px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-4">
            <span className="text-[10px] uppercase tracking-[0.4em] font-black text-[var(--text)] opacity-30 block mb-4">02 / {t('philosophyLabel')}</span>
          </div>
          <div className="md:col-span-8">
            <motion.h2 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className={`serif-text leading-[1.1] font-light text-[var(--text)] opacity-80 mb-16 break-words ${
                isIndic ? 'text-[5vw] md:text-[4vw]' : 'text-[6vw] md:text-[5vw]'
              }`}
            >
              {t('philosophyTitle')}
            </motion.h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-b-grid pt-12">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-[var(--text)]">{t('realWorldExp')}</h3>
                <p className="text-sm text-[var(--text)] opacity-40 leading-relaxed uppercase tracking-widest">
                  {t('realWorldDesc')}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-[var(--text)]">{t('profMentorship')}</h3>
                <p className="text-sm text-[var(--text)] opacity-40 leading-relaxed uppercase tracking-widest">
                  {t('profDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
