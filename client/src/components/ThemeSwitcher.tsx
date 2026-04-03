import React from 'react';
import { useTheme, ThemeType } from '../context/ThemeContext';
import { Palette, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const themes: { id: ThemeType; name: string; colors: string[] }[] = [
  { id: 'default', name: 'Default', colors: ['#000000', '#ffffff', '#3b82f6'] },
  { id: 'medical', name: 'Medical', colors: ['#ffffff', '#0f172a', '#2563eb'] },
  { id: 'emergency', name: 'Emergency', colors: ['#dc2626', '#ffffff', '#991b1b'] },
  { id: 'luxury', name: 'Luxury', colors: ['#0a0a0a', '#fef3c7', '#d97706'] },
  { id: 'cyber', name: 'Cyber', colors: ['#020617', '#22d3ee', '#d946ef'] },
  { id: 'forest', name: 'Forest', colors: ['#064e3b', '#ecfdf5', '#34d399'] },
  { id: 'midnight', name: 'Midnight', colors: ['#020617', '#f8fafc', '#38bdf8'] },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-current hover:bg-current hover:text-[var(--bg)] transition-all duration-300 text-xs font-bold uppercase tracking-widest text-[var(--text)]"
      >
        <Palette size={14} />
        <span className="hidden sm:inline">Theme</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-48 rounded-xl border border-current bg-[var(--bg)] p-2 z-50 shadow-2xl"
            >
              <div className="grid gap-1">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-left transition-colors hover:bg-current hover:text-[var(--bg)] ${
                      theme === t.id ? 'bg-current text-[var(--bg)]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        {t.colors.map((c, i) => (
                          <div
                            key={i}
                            className="w-3 h-3 rounded-full border border-white/20"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold uppercase tracking-tight">{t.name}</span>
                    </div>
                    {theme === t.id && <Check size={12} />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
