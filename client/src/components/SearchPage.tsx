import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ArrowLeft,
  Pill,
  Shield,
  TrendingDown,
  Info,
  Clock,
  X,
  History,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MEDICINE_DB, Medicine } from '../data/medicineDb';
import { searchMedicines } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const HISTORY_KEY = 'medai_search_history';
const MAX_HISTORY = 10;

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: string[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Ignore localStorage failures and keep search usable.
  }
}

function addToHistory(query: string, current: string[]): string[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return current;
  }

  const filtered = current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
  return [trimmed, ...filtered].slice(0, MAX_HISTORY);
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [filteredMedicines, setFilteredMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();
  const isIndic = ['hi', 'ta', 'kn', 'gu', 'bn'].includes(language);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        historyRef.current &&
        !historyRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowHistory(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMedicines([]);
      setSelectedMedicine(null);
      setError('');
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      setShowHistory(false);

      try {
        const data = await searchMedicines(searchQuery, 1, 8);
        const medicines = data.medicines || [];
        setFilteredMedicines(medicines);
        setSelectedMedicine((current) => {
          if (!current) {
            return null;
          }

          return medicines.find((medicine) => medicine.id === current.id) || current;
        });

        if (medicines.length > 0) {
          setSearchHistory((current) => {
            const updated = addToHistory(searchQuery, current);
            saveHistory(updated);
            return updated;
          });
        }
      } catch (err) {
        const normalizedQuery = searchQuery.toLowerCase();
        const fallbackResults = MEDICINE_DB.filter(
          (medicine) =>
            medicine.brandedName.toLowerCase().includes(normalizedQuery) ||
            medicine.genericName.toLowerCase().includes(normalizedQuery)
        ).slice(0, 8);

        setFilteredMedicines(fallbackResults);
        setError(err instanceof Error ? err.message : 'Search is temporarily unavailable.');

        if (fallbackResults.length > 0) {
          setSearchHistory((current) => {
            const updated = addToHistory(searchQuery, current);
            saveHistory(updated);
            return updated;
          });
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  function handleHistoryClick(item: string) {
    setSearchQuery(item);
    setShowHistory(false);
    inputRef.current?.focus();
  }

  function removeHistoryItem(item: string, event: React.MouseEvent) {
    event.stopPropagation();
    const updated = searchHistory.filter((historyItem) => historyItem !== item);
    setSearchHistory(updated);
    saveHistory(updated);
  }

  function clearHistory() {
    setSearchHistory([]);
    saveHistory([]);
    setShowHistory(false);
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-500">
      <nav className="fixed top-0 left-0 w-full z-[100] border-b border-b-grid bg-[var(--bg)]/50 backdrop-blur-md transition-colors duration-500">
        <div className="grid grid-cols-4 md:grid-cols-12 w-full">
          <div className="col-span-2 md:col-span-4 p-6 border-r border-r-grid flex items-center gap-4">
            <Link to="/" className="hover:opacity-50 transition-opacity">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="text-xl font-black tracking-tighter">MEDAI / {t('search')}</span>
          </div>
          <div className="hidden md:flex col-span-4 items-center justify-center border-r border-r-grid">
            <span className="text-[10px] uppercase tracking-[0.3em] font-black text-[var(--text)] opacity-30">
              {loading ? 'Querying live database' : t('analyticalDatabaseVersion')}
            </span>
          </div>
          <div className="col-span-2 md:col-span-4 flex items-center justify-end p-6 gap-6">
            <Link
              to="/signin"
              className="text-[10px] uppercase tracking-[0.2em] font-black hover:opacity-50 transition-opacity"
            >
              {t('signin')}
            </Link>
            <Link
              to="/signup"
              className="text-[10px] uppercase tracking-[0.2em] font-black bg-[var(--text)] text-[var(--bg)] px-6 py-2 hover:bg-transparent hover:text-[var(--text)] border border-[var(--text)] transition-all"
            >
              {t('signup')}
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32">
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[calc(100vh-8rem)]">
          <div className="md:col-span-4 border-r border-r-grid p-8 md:p-12">
            <div className="mb-12">
              <span className="text-[10px] uppercase tracking-[0.4em] font-black text-[var(--text)] opacity-30 block mb-4">
                01 / {t('inputQuery')}
              </span>
              <h1
                className={`font-black uppercase tracking-tighter leading-[0.8] mb-8 break-words ${
                  isIndic ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl lg:text-6xl'
                }`}
              >
                {t('searchEngine')}
              </h1>
            </div>

            <div className="relative group">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text)] opacity-20 group-focus-within:opacity-100 transition-opacity" />
              <input
                ref={inputRef}
                type="text"
                className="w-full bg-transparent border-b border-b-grid py-6 pl-8 pr-10 text-2xl font-light focus:outline-none focus:border-[var(--text)] transition-colors placeholder:text-[var(--text)] placeholder:opacity-10 uppercase tracking-tighter"
                placeholder={t('enterMedicineName')}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={() => {
                  if (searchHistory.length > 0 && !searchQuery) {
                    setShowHistory(true);
                  }
                }}
                autoFocus
              />
              {searchHistory.length > 0 && !searchQuery ? (
                <button
                  onClick={() => setShowHistory((current) => !current)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-[var(--text)] opacity-30 hover:opacity-80 transition-opacity"
                  title="Search history"
                >
                  <History className="w-4 h-4" />
                </button>
              ) : null}

              <AnimatePresence>
                {showHistory && searchHistory.length > 0 ? (
                  <motion.div
                    ref={historyRef}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 z-50 border border-b-grid bg-[var(--bg)] shadow-xl"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-b-grid">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-[var(--text)] opacity-40" />
                        <span className="text-[9px] uppercase tracking-[0.3em] font-black text-[var(--text)] opacity-40">
                          Recent Searches
                        </span>
                      </div>
                      <button
                        onClick={clearHistory}
                        className="text-[9px] uppercase tracking-widest font-black text-[var(--text)] opacity-30 hover:opacity-80 transition-opacity"
                      >
                        Clear All
                      </button>
                    </div>
                    <ul>
                      {searchHistory.map((item, index) => (
                        <li key={`${item}-${index}`}>
                          <button
                            onClick={() => handleHistoryClick(item)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--text)]/5 transition-colors group/item"
                          >
                            <div className="flex items-center gap-3">
                              <Clock className="w-3 h-3 text-[var(--text)] opacity-20 flex-shrink-0" />
                              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text)] opacity-60 group-hover/item:opacity-100 transition-opacity text-left">
                                {item}
                              </span>
                            </div>
                            <span
                              onClick={(event) => removeHistoryItem(item, event)}
                              className="p-1 text-[var(--text)] opacity-0 group-hover/item:opacity-30 hover:!opacity-80 transition-opacity"
                              title="Remove"
                            >
                              <X className="w-3 h-3" />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {error ? (
              <p className="mt-4 text-[10px] uppercase tracking-widest font-black text-amber-600">
                {error}. Showing local fallback results when available.
              </p>
            ) : null}

            <div className="mt-12 space-y-2">
              <AnimatePresence>
                {filteredMedicines.map((medicine, index) => (
                  <motion.button
                    key={medicine.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedMedicine(medicine)}
                    className={`w-full text-left p-6 border border-b-grid hover:opacity-80 transition-all flex items-center justify-between group ${
                      selectedMedicine?.id === medicine.id
                        ? 'bg-[var(--text)] text-[var(--bg)]'
                        : 'hover:bg-[var(--text)]/5'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-tighter">
                        {medicine.brandedName}
                      </span>
                      <span
                        className={`text-[8px] uppercase tracking-widest font-bold mt-1 ${
                          selectedMedicine?.id === medicine.id ? 'opacity-40' : 'opacity-30'
                        }`}
                      >
                        {medicine.category}
                      </span>
                    </div>
                    <span className="text-xl font-black group-hover:translate-x-2 transition-transform">
                      -&gt;
                    </span>
                  </motion.button>
                ))}
              </AnimatePresence>

              {loading ? (
                <p className="text-xs uppercase tracking-widest font-bold text-[var(--text)] opacity-40 p-6 text-center border border-dashed border-b-grid">
                  Searching medicines...
                </p>
              ) : null}

              {searchQuery && !loading && filteredMedicines.length === 0 ? (
                <p className="text-xs uppercase tracking-widest font-bold text-[var(--text)] opacity-20 p-6 text-center border border-dashed border-b-grid">
                  {t('noResultsFound')}
                </p>
              ) : null}

              {!searchQuery && !loading && searchHistory.length > 0 && !showHistory ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                  <p className="text-[9px] uppercase tracking-[0.3em] font-black text-[var(--text)] opacity-20 mb-3 flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Recent
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.slice(0, 5).map((item, index) => (
                      <button
                        key={`${item}-chip-${index}`}
                        onClick={() => handleHistoryClick(item)}
                        className="text-[9px] uppercase tracking-widest font-black px-3 py-2 border border-b-grid text-[var(--text)] opacity-40 hover:opacity-100 hover:bg-[var(--text)]/5 transition-all"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </div>
          </div>

          <div className="md:col-span-8 p-8 md:p-24 flex items-center justify-center bg-[var(--bg)] opacity-95">
            <AnimatePresence mode="wait">
              {selectedMedicine ? (
                <motion.div
                  key={selectedMedicine.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-5xl"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-b-grid border border-b-grid">
                    <div className="bg-[var(--bg)] p-12 flex flex-col justify-between aspect-square lg:aspect-auto overflow-hidden">
                      <div>
                        <div className="flex items-center gap-3 mb-8">
                          <div className="w-8 h-8 border border-b-grid flex items-center justify-center">
                            <span className="text-[10px] font-black">B</span>
                          </div>
                          <span className="text-[10px] uppercase tracking-[0.4em] font-black text-[var(--text)] opacity-30">
                            {t('brandedStandard')}
                          </span>
                        </div>
                        <h2
                          className={`font-black uppercase tracking-tighter leading-none mb-6 break-words ${
                            isIndic ? 'text-4xl md:text-5xl' : 'text-5xl md:text-6xl lg:text-7xl'
                          }`}
                        >
                          {selectedMedicine.brandedName}
                        </h2>
                        <p className="text-[var(--text)] opacity-40 font-serif italic text-2xl mb-12">
                          {selectedMedicine.composition}
                        </p>
                      </div>
                      <div className="flex items-baseline gap-4">
                        <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text)] opacity-20">
                          {t('marketPrice')}
                        </span>
                        <div className="text-8xl font-light tracking-tighter">
                          Rs.{selectedMedicine.brandedPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-[var(--text)] text-[var(--bg)] p-12 flex flex-col justify-between aspect-square lg:aspect-auto overflow-hidden">
                      <div>
                        <div className="flex items-center gap-3 mb-8">
                          <div className="w-8 h-8 border border-[var(--bg)]/20 flex items-center justify-center">
                            <span className="text-[10px] font-black">G</span>
                          </div>
                          <span className="text-[10px] uppercase tracking-[0.4em] font-black opacity-30">
                            {t('genericAlternative')}
                          </span>
                        </div>
                        <h2
                          className={`font-black uppercase tracking-tighter leading-none mb-6 break-words ${
                            isIndic ? 'text-4xl md:text-5xl' : 'text-5xl md:text-6xl lg:text-7xl'
                          }`}
                        >
                          {selectedMedicine.genericName}
                        </h2>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--bg)] text-[var(--text)] text-[8px] uppercase tracking-widest font-black mb-12">
                          <Shield className="w-3 h-3" /> {t('verifiedEquivalent')}
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-4">
                          <span className="text-[10px] uppercase tracking-widest font-black opacity-20">
                            {t('ourPrice')}
                          </span>
                          <div className="text-8xl font-light tracking-tighter">
                            Rs.{selectedMedicine.genericPrice.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] uppercase tracking-widest font-black opacity-40 mb-1">
                            {t('savings')}
                          </span>
                          <span className="text-4xl font-black tracking-tighter">
                            -
                            {selectedMedicine.brandedPrice > 0
                              ? Math.round(
                                  ((selectedMedicine.brandedPrice - selectedMedicine.genericPrice) /
                                    selectedMedicine.brandedPrice) *
                                    100
                                )
                              : 0}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-b-grid border-x border-b border-b-grid">
                    <div className="bg-[var(--bg)] p-8 border-r border-r-grid">
                      <div className="flex items-center gap-2 mb-4">
                        <Info className="w-4 h-4 text-[var(--text)] opacity-30" />
                        <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text)] opacity-30">
                          {t('description')}
                        </span>
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest leading-relaxed text-[var(--text)] opacity-60">
                        {selectedMedicine.description}
                      </p>
                    </div>
                    <div className="bg-[var(--bg)] p-8 border-r border-r-grid">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingDown className="w-4 h-4 text-[var(--text)] opacity-30" />
                        <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text)] opacity-30">
                          {t('costAnalysis')}
                        </span>
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest leading-relaxed text-[var(--text)] opacity-60">
                        {t('switchingTo')} {selectedMedicine.genericName} {t('savesYouApproximately')}{' '}
                        Rs.{(selectedMedicine.brandedPrice - selectedMedicine.genericPrice).toFixed(2)}{' '}
                        {t('perUnit')}
                      </p>
                    </div>
                    <div className="bg-[var(--bg)] p-8">
                      <div className="flex items-center gap-2 mb-4">
                        <Pill className="w-4 h-4 text-[var(--text)] opacity-30" />
                        <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text)] opacity-30">
                          {t('composition')}
                        </span>
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest leading-relaxed text-[var(--text)] opacity-60">
                        {selectedMedicine.composition}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.05 }}
                    className={`display-text leading-none ${isIndic ? 'text-[8vw]' : 'text-[10vw]'}`}
                  >
                    {t('readyForAnalysisSearch')}
                  </motion.div>
                  <p className="text-[10px] uppercase tracking-[0.5em] font-black text-[var(--text)] opacity-20 mt-8">
                    {t('selectMedicineToBegin')}
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
