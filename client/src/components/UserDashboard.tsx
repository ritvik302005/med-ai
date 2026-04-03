import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Bot,
  Info,
  LocateFixed,
  LogOut,
  MapPin,
  Navigation,
  Phone,
  ScanLine,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Upload,
  User as UserIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import type { Medicine } from '../data/medicineDb';
import {
  clearMedicineSearchHistory,
  getApiHealth,
  getMedicineSearchHistory,
  getNearbyPharmaciesDetailed,
  scanPrescription,
  saveMedicineSearchHistory,
  searchMedicines,
  type ApiHealth,
  type MedicineHistoryItem,
  type PharmacyStore,
  type PrescriptionScanItem,
} from '../services/api';
import Chatbot from './Chatbot';
import MonthlySavings from './MonthlySavings';
import SmartSuggestions from './SmartSuggestions';
import VoiceAssistant from './VoiceAssistant';

type Tab = 'search' | 'details' | 'scanner' | 'pharmacy';

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const historyTime = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

function readBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      resolve(value.includes(',') ? value.split(',')[1] : value);
    };
    reader.onerror = () => reject(new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });
}

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Medicine[]>([]);
  const [searchHistory, setSearchHistory] = useState<MedicineHistoryItem[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [scanText, setScanText] = useState('');
  const [scanResults, setScanResults] = useState<PrescriptionScanItem[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const [stores, setStores] = useState<PharmacyStore[]>([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState('');
  const [locationNote, setLocationNote] = useState('Location not requested yet');
  const [pharmacyQuery, setPharmacyQuery] = useState('Jan Aushadhi pharmacy');
  const [pharmacyRadius, setPharmacyRadius] = useState(5000);
  const [storeSource, setStoreSource] = useState('');

  const tabs = useMemo(
    () => [
      { id: 'search' as const, label: t('search'), icon: Search },
      { id: 'details' as const, label: t('details'), icon: Info },
      { id: 'scanner' as const, label: 'Rx Scanner', icon: ScanLine },
      { id: 'pharmacy' as const, label: t('pharmacy'), icon: MapPin },
    ],
    [t]
  );

  useEffect(() => {
    const loadInitialData = async () => {
      setSearchLoading(true);
      try {
        const [healthData, medicineData] = await Promise.all([
          getApiHealth(),
          searchMedicines('', 1, 8),
        ]);
        setHealth(healthData);
        setResults(medicineData.medicines);
      } catch (error) {
        setSearchError(error instanceof Error ? error.message : 'Unable to load dashboard.');
      } finally {
        setSearchLoading(false);
      }
    };

    void loadInitialData();
  }, []);

  useEffect(() => {
    if (!user?.token) {
      setSearchHistory([]);
      return;
    }

    let cancelled = false;

    const loadSearchHistory = async () => {
      setHistoryLoading(true);
      setHistoryError('');

      try {
        const history = await getMedicineSearchHistory(user.token);
        if (!cancelled) {
          setSearchHistory(history);
        }
      } catch (error) {
        if (!cancelled) {
          setHistoryError(error instanceof Error ? error.message : 'Unable to load history.');
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    void loadSearchHistory();

    return () => {
      cancelled = true;
    };
  }, [user?.token]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError('');

      try {
        const response = await searchMedicines(query, 1, 8);
        setResults(response.medicines);
      } catch (error) {
        setSearchError(error instanceof Error ? error.message : 'Search is unavailable.');
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (activeTab === 'pharmacy' && stores.length === 0 && !storeLoading) {
      void handleFindStores();
    }
  }, [activeTab]);

  const savings = selectedMedicine
    ? Math.max(selectedMedicine.brandedPrice - selectedMedicine.genericPrice, 0)
    : 0;

  const savingsPercent = selectedMedicine?.brandedPrice
    ? Math.round((savings / selectedMedicine.brandedPrice) * 100)
    : 0;

  const saveHistoryItem = async (medicine: Medicine) => {
    if (!user?.token) {
      return;
    }

    try {
      const updatedHistory = await saveMedicineSearchHistory(user.token, medicine);
      setSearchHistory(updatedHistory);
      setHistoryError('');
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Unable to save history.');
    }
  };

  const handleSelectMedicine = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setActiveTab('details');
    void saveHistoryItem(medicine);
  };

  const handleClearHistory = async () => {
    if (!user?.token) {
      return;
    }

    setHistoryLoading(true);
    setHistoryError('');

    try {
      const clearedHistory = await clearMedicineSearchHistory(user.token);
      setSearchHistory(clearedHistory);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Unable to clear history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleHistorySelect = (medicine: MedicineHistoryItem) => {
    setQuery(medicine.brandedName);
    handleSelectMedicine(medicine);
  };

  const handleTextScan = async () => {
    if (!scanText.trim()) {
      setScanError('Enter prescription text first.');
      return;
    }

    setScanLoading(true);
    setScanError('');

    try {
      setScanResults(await scanPrescription(undefined, scanText));
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Scan failed.');
    } finally {
      setScanLoading(false);
    }
  };

  const handleFileScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setScanLoading(true);
    setScanError('');

    try {
      const base64 = await readBase64(file);
      setScanResults(await scanPrescription(base64));
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Image scan failed.');
    } finally {
      setScanLoading(false);
      event.target.value = '';
    }
  };

  const handleFindStores = async () => {
    setStoreLoading(true);
    setStoreError('');

    try {
      let lat = 28.6139;
      let lon = 77.209;
      let note = 'Using New Delhi fallback';

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            });
          });
          lat = position.coords.latitude;
          lon = position.coords.longitude;
          note = 'Using your current location';
        } catch (error) {
          note = 'Location blocked, using New Delhi fallback';
        }
      }

      setLocationNote(note);
      const response = await getNearbyPharmaciesDetailed(lat, lon, {
        limit: 6,
        query: pharmacyQuery.trim() || 'pharmacy',
        radiusMeters: pharmacyRadius,
      });
      setStores(response.stores);
      setStoreSource(response.source);
    } catch (error) {
      setStoreError(error instanceof Error ? error.message : 'Unable to load stores.');
    } finally {
      setStoreLoading(false);
    }
  };

  const nearestStore = stores[0] || null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col md:flex-row transition-colors duration-500 pt-20">
      <aside className="w-full md:w-72 border-r border-grid bg-[var(--bg)] flex flex-col md:sticky md:top-20 md:h-[calc(100vh-5rem)]">
        <div className="p-8 border-b border-grid">
          <Link to="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] hover:opacity-60 transition-opacity mb-8">
            <ArrowLeft className="w-4 h-4" />
            {t('backToHome')}
          </Link>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 border-2 border-[var(--text)] flex items-center justify-center bg-[var(--text)] text-[var(--bg)]">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest leading-none mb-1">
                {user?.displayName?.split(' ')[0] || 'User'}
              </h2>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">
                {health?.dataSource || 'Checking backend'}
              </span>
            </div>
          </div>

          <div className="grid gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-4 p-4 text-[10px] font-black uppercase tracking-[0.2em] border-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-[var(--text)] text-[var(--bg)] border-[var(--text)]'
                    : 'border-transparent hover:border-[var(--text)]/20'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-grid p-4 space-y-2">
          <p className="mb-3 px-2 text-[7px] font-black uppercase tracking-[0.4em] opacity-30">
            Quick Access
          </p>
          <Link
            to="/order-medicines"
            className="flex w-full items-center gap-3 border-2 border-[var(--accent)] p-3 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-white"
          >
            <ShoppingCart className="h-4 w-4 flex-shrink-0" />
            Order Medicine
          </Link>
          <Link
            to="/pharmacy-map"
            state={{ initialQuery: pharmacyQuery, autostart: true }}
            className="flex w-full items-center gap-3 border-2 border-[var(--text)]/30 p-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all hover:border-[var(--text)]"
          >
            <Navigation className="h-4 w-4 flex-shrink-0" />
            Nearby Pharmacies
          </Link>
          <Link
            to="/ai-chat"
            className="flex w-full items-center gap-3 border-2 border-[var(--text)]/30 p-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all hover:border-[var(--text)]"
          >
            <Sparkles className="h-4 w-4 flex-shrink-0" />
            AI Medicine Chat
          </Link>
        </div>

        <div className="mt-auto p-8 space-y-4">
          <div className="border-2 border-[var(--text)]/15 p-4">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-50 mb-2">API Status</p>
            <p className="text-xs font-black uppercase tracking-widest">{health?.status || 'checking'}</p>
          </div>
          <button
            onClick={() => void logout()}
            className="w-full p-4 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3"
          >
            <LogOut className="w-4 h-4" />
            {t('logout')}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="space-y-8"
          >
            {activeTab === 'search' && (
              <>
                <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Link
                    to="/order-medicines"
                    className="group block border-4 border-[var(--accent)] p-6 transition-all hover:bg-[var(--accent)] hover:text-white"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <ShoppingCart className="h-6 w-6" />
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-50 transition-opacity group-hover:opacity-100">
                        New
                      </span>
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight">Order Medicine</h3>
                    <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.2em] opacity-50 transition-opacity group-hover:opacity-80">
                      Browse and order generic or branded medicines with a clean checkout flow.
                    </p>
                  </Link>

                  <Link
                    to="/pharmacy-map"
                    state={{ initialQuery: pharmacyQuery, autostart: true }}
                    className="group block border-4 border-[var(--text)] p-6 transition-all hover:bg-[var(--text)] hover:text-[var(--bg)]"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <Navigation className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight">Nearby Pharmacies</h3>
                    <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.2em] opacity-50 transition-opacity group-hover:opacity-80">
                      Find Jan Aushadhi Kendras and nearby pharmacies using the full locator page.
                    </p>
                  </Link>

                  <Link
                    to="/ai-chat"
                    className="group block border-4 border-[var(--text)] p-6 transition-all hover:bg-[var(--text)] hover:text-[var(--bg)]"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight">AI Medicine Chat</h3>
                    <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.2em] opacity-50 transition-opacity group-hover:opacity-80">
                      Ask about interactions, side effects, generics, and clinical guidance.
                    </p>
                  </Link>
                </section>

                <section className="border-4 border-[var(--text)] p-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-4">
                    Live medicine search
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={t('searchPlaceholder')}
                      className="w-full bg-transparent border-4 border-[var(--text)] p-6 pr-20 text-lg md:text-2xl font-black uppercase tracking-tighter focus:outline-none"
                    />
                    <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-7 h-7" />
                  </div>
                  {searchError && (
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">
                      {searchError}
                    </p>
                  )}
                  <div className="mt-6 flex flex-wrap gap-4">
                    <Link
                      to="/order-medicines"
                      className="inline-flex items-center gap-3 bg-[var(--text)] px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--bg)] transition-opacity hover:opacity-80"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Open Order Flow
                    </Link>
                    {selectedMedicine ? (
                      <Link
                        to="/order-medicines"
                        state={{ preselectedMedicine: selectedMedicine, variant: 'generic' }}
                        className="inline-flex items-center gap-3 border-2 border-[var(--text)] px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:bg-[var(--text)] hover:text-[var(--bg)]"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Order Selected Medicine
                      </Link>
                    ) : null}
                  </div>
                </section>

                <section className="border-2 border-[var(--text)]/20 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
                        Recent medicine history
                      </p>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
                        Medicines you opened from search appear here for quick access.
                      </p>
                    </div>
                    {searchHistory.length > 0 ? (
                      <button
                        onClick={() => void handleClearHistory()}
                        disabled={historyLoading}
                        className="border-2 border-[var(--text)] px-4 py-3 text-[9px] font-black uppercase tracking-[0.3em] transition-all hover:bg-[var(--text)] hover:text-[var(--bg)] disabled:opacity-50"
                      >
                        Clear history
                      </button>
                    ) : null}
                  </div>

                  {historyError ? (
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">
                      {historyError}
                    </p>
                  ) : null}

                  {historyLoading ? (
                    <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-50">
                      Loading history...
                    </p>
                  ) : searchHistory.length > 0 ? (
                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                      {searchHistory.map((medicine) => (
                        <button
                          key={`history-${medicine.id}`}
                          onClick={() => handleHistorySelect(medicine)}
                          className="border-2 border-[var(--text)]/20 p-5 text-left transition-all hover:border-[var(--text)] hover:bg-[var(--text)] hover:text-[var(--bg)]"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-base font-black uppercase tracking-tight">
                                {medicine.brandedName}
                              </h3>
                              <p className="mt-2 text-[9px] font-black uppercase tracking-[0.3em] opacity-50">
                                {medicine.genericName}
                              </p>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">
                              {medicine.searchedAt ? historyTime.format(new Date(medicine.searchedAt)) : 'Recently'}
                            </span>
                          </div>
                          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] opacity-75">
                            {medicine.composition || medicine.category}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-50">
                      Search and open a medicine to start building history.
                    </p>
                  )}
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.map((medicine) => (
                    <button
                      key={medicine.id}
                      onClick={() => handleSelectMedicine(medicine)}
                      className="border-2 border-[var(--text)] p-6 text-left hover:bg-[var(--text)] hover:text-[var(--bg)] transition-all"
                    >
                      <h3 className="font-black uppercase tracking-tight text-lg">{medicine.brandedName}</h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mt-2">
                        {medicine.genericName}
                      </p>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-75 mt-4">
                        {medicine.composition}
                      </p>
                    </button>
                  ))}
                </section>

                {!searchLoading && results.length === 0 && (
                  <section className="border-2 border-dashed border-[var(--text)]/20 p-10 text-center">
                    <p className="text-sm font-black uppercase tracking-[0.3em] opacity-50">
                      No medicines found.
                    </p>
                  </section>
                )}

                <SmartSuggestions
                  selectedMedicine={selectedMedicine}
                  onSelect={handleSelectMedicine}
                />

                <MonthlySavings />
              </>
            )}

            {activeTab === 'details' && (
              <>
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="border-4 border-[var(--text)] p-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-4">
                      Selected medicine
                    </p>
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                      {selectedMedicine?.brandedName || 'No selection'}
                    </h1>
                    <p className="text-sm font-bold uppercase tracking-[0.2em] opacity-70 mt-6">
                      {selectedMedicine?.composition || 'Choose a medicine from search to view details.'}
                    </p>
                  </div>
                  <div className="border-4 border-[var(--text)] p-8 bg-[var(--text)] text-[var(--bg)]">
                    <div className="flex items-center gap-3 mb-6">
                      <Bot className="w-6 h-6" />
                      <h2 className="text-xl font-black uppercase tracking-tight">Generic comparison</h2>
                    </div>
                    <p className="text-3xl font-black uppercase tracking-tight">
                      {selectedMedicine?.genericName || 'Waiting for selection'}
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-8">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Branded</p>
                        <p className="text-2xl font-black">{money.format(selectedMedicine?.brandedPrice || 0)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Generic</p>
                        <p className="text-2xl font-black">{money.format(selectedMedicine?.genericPrice || 0)}</p>
                      </div>
                    </div>
                    <div className="mt-8">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Estimated savings</p>
                      <p className="text-3xl font-black">
                        {money.format(savings)} / {savingsPercent}%
                      </p>
                    </div>
                    <div className="mt-8 flex flex-wrap gap-3">
                      {selectedMedicine ? (
                        <>
                          <Link
                            to="/order-medicines"
                            state={{ preselectedMedicine: selectedMedicine, variant: 'generic' }}
                            className="inline-flex items-center gap-3 bg-[var(--bg)] px-5 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text)] transition-opacity hover:opacity-80"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Order Generic
                          </Link>
                          <Link
                            to="/order-medicines"
                            state={{ preselectedMedicine: selectedMedicine, variant: 'branded' }}
                            className="inline-flex items-center gap-3 border-2 border-[var(--bg)] px-5 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:bg-[var(--bg)] hover:text-[var(--text)]"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Order Branded
                          </Link>
                        </>
                      ) : (
                        <Link
                          to="/order-medicines"
                          className="inline-flex items-center gap-3 border-2 border-[var(--bg)] px-5 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:bg-[var(--bg)] hover:text-[var(--text)]"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Browse Order Catalog
                        </Link>
                      )}
                    </div>
                  </div>
                </section>

                <SmartSuggestions
                  selectedMedicine={selectedMedicine}
                  onSelect={handleSelectMedicine}
                />
              </>
            )}

            {activeTab === 'scanner' && (
              <>
                <section className="border-4 border-[var(--text)] p-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-4">
                    Prescription scanner
                  </p>
                  <textarea
                    value={scanText}
                    onChange={(event) => setScanText(event.target.value)}
                    placeholder="Paste prescription text or upload an image."
                    className="w-full min-h-40 bg-transparent border-4 border-[var(--text)] p-6 text-sm font-black uppercase tracking-[0.2em] focus:outline-none resize-y"
                  />
                  <div className="flex flex-wrap gap-4 mt-6">
                    <button
                      onClick={() => void handleTextScan()}
                      disabled={scanLoading}
                      className="px-8 py-4 bg-[var(--text)] text-[var(--bg)] font-black uppercase tracking-[0.3em] text-[10px] disabled:opacity-50"
                    >
                      {scanLoading ? 'Scanning...' : 'Scan Text'}
                    </button>
                    <label className="px-8 py-4 border-4 border-[var(--text)] font-black uppercase tracking-[0.3em] text-[10px] cursor-pointer inline-flex items-center gap-3">
                      <Upload className="w-4 h-4" />
                      Upload Image
                      <input type="file" accept="image/*" onChange={handleFileScan} className="hidden" />
                    </label>
                  </div>
                  {scanError && (
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-red-600">
                      {scanError}
                    </p>
                  )}
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scanResults.map((medicine, index) => (
                    <div key={`${medicine.branded}-${index}`} className="border-2 border-[var(--text)] p-6">
                      <h3 className="font-black uppercase tracking-tight text-lg">{medicine.branded}</h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mt-2">
                        {medicine.generic}
                      </p>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-75 mt-4">
                        {medicine.composition}
                      </p>
                    </div>
                  ))}
                </section>
              </>
            )}

            {activeTab === 'pharmacy' && (
              <>
                <section className="border-4 border-[var(--text)] p-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-4">
                    Nearby stores
                  </p>
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-3">
                        Search Type
                      </label>
                      <input
                        type="text"
                        value={pharmacyQuery}
                        onChange={(event) => setPharmacyQuery(event.target.value)}
                        placeholder="Jan Aushadhi pharmacy"
                        className="w-full bg-transparent border-4 border-[var(--text)] p-4 text-sm font-black uppercase tracking-[0.2em] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-3">
                        Radius
                      </label>
                      <select
                        value={pharmacyRadius}
                        onChange={(event) => setPharmacyRadius(Number(event.target.value))}
                        className="w-full bg-transparent border-4 border-[var(--text)] p-4 text-sm font-black uppercase tracking-[0.2em] focus:outline-none"
                      >
                        <option value={1000}>1 km</option>
                        <option value={2000}>2 km</option>
                        <option value={5000}>5 km</option>
                        <option value={10000}>10 km</option>
                        <option value={20000}>20 km</option>
                      </select>
                    </div>
                    <button
                      onClick={() => void handleFindStores()}
                      disabled={storeLoading}
                      className="px-8 py-4 bg-[var(--text)] text-[var(--bg)] font-black uppercase tracking-[0.3em] text-[10px] inline-flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      <LocateFixed className="w-4 h-4" />
                      {storeLoading ? 'Finding Stores...' : 'Find Nearby Pharmacies'}
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      to="/pharmacy-map"
                      state={{ initialQuery: pharmacyQuery, autostart: true }}
                      className="inline-flex items-center gap-3 border-2 border-[var(--text)] px-6 py-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:bg-[var(--text)] hover:text-[var(--bg)]"
                    >
                      <Navigation className="w-4 h-4" />
                      Open Full Pharmacy Map
                    </Link>
                    {storeSource ? (
                      <span
                        className={`inline-flex items-center gap-2 border-2 px-4 py-3 text-[10px] font-black uppercase tracking-[0.3em] ${
                          storeSource === 'tomtom'
                            ? 'border-green-600 text-green-700'
                            : 'border-amber-600 text-amber-700'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            storeSource === 'tomtom' ? 'bg-green-600' : 'bg-amber-600'
                          }`}
                        />
                        {storeSource === 'tomtom' ? 'Live TomTom Data' : 'Offline Fallback'}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] opacity-50">
                    {locationNote}
                  </p>
                  {storeError && (
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-red-600">
                      {storeError}
                    </p>
                  )}
                </section>

                {nearestStore && (
                  <section className="border-4 border-[var(--text)] p-8 bg-[var(--text)] text-[var(--bg)]">
                    <div className="flex flex-wrap items-start justify-between gap-6">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50 mb-3">
                          Nearest pharmacy
                        </p>
                        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
                          {nearestStore.name}
                        </h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-3">
                          {nearestStore.city || 'Nearby area'} /{' '}
                          {nearestStore.distanceKm ? `${nearestStore.distanceKm} km away` : 'distance pending'}
                        </p>
                        <p className="text-sm font-bold uppercase tracking-[0.2em] opacity-80 mt-5">
                          {nearestStore.address}
                        </p>
                      </div>
                      <div className="space-y-3 min-w-[220px]">
                        <div className="border-2 border-[var(--bg)]/20 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-2">
                            Phone
                          </p>
                          <p className="text-lg font-black tracking-tight">
                            {nearestStore.phone || 'Number unavailable'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {nearestStore.phone ? (
                            <a
                              href={`tel:${nearestStore.phone}`}
                              className="px-5 py-3 bg-[var(--bg)] text-[var(--text)] font-black uppercase tracking-[0.3em] text-[10px] inline-flex items-center gap-2"
                            >
                              <Phone className="w-4 h-4" />
                              Call Now
                            </a>
                          ) : null}
                          {nearestStore.mapUrl ? (
                            <a
                              href={nearestStore.mapUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-5 py-3 border-2 border-[var(--bg)] font-black uppercase tracking-[0.3em] text-[10px] inline-flex items-center gap-2"
                            >
                              <Navigation className="w-4 h-4" />
                              Open Map
                            </a>
                          ) : null}
                          <Link
                            to="/pharmacy-map"
                            state={{ initialQuery: pharmacyQuery, autostart: true }}
                            className="px-5 py-3 border-2 border-[var(--bg)] font-black uppercase tracking-[0.3em] text-[10px] inline-flex items-center gap-2"
                          >
                            <MapPin className="w-4 h-4" />
                            Full Locator
                          </Link>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stores.map((store) => (
                    <div
                      key={store.id}
                      className="border-2 border-[var(--text)] p-6 hover:bg-[var(--text)] hover:text-[var(--bg)] transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-black uppercase tracking-tight text-lg">{store.name}</h3>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mt-2">
                            {store.city || 'Nearby area'}
                          </p>
                        </div>
                        <Store className="w-5 h-5 flex-shrink-0" />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-75 mt-4">
                        {store.address}
                      </p>
                      <div className="mt-4 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">
                          {store.distanceKm ? `${store.distanceKm} km away` : 'Distance unavailable'}
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">
                          {store.phone || 'Phone number unavailable'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-5">
                        {store.phone ? (
                          <a
                            href={`tel:${store.phone}`}
                            className="px-4 py-3 bg-[var(--text)] text-[var(--bg)] font-black uppercase tracking-[0.3em] text-[10px] inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            <Phone className="w-4 h-4" />
                            Call
                          </a>
                        ) : null}
                        {store.mapUrl ? (
                          <a
                            href={store.mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-3 border-2 border-current font-black uppercase tracking-[0.3em] text-[10px] inline-flex items-center gap-2"
                          >
                            <MapPin className="w-4 h-4" />
                            Directions
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </section>

                {!storeLoading && stores.length === 0 && (
                  <section className="border-2 border-dashed border-[var(--text)]/20 p-10 text-center">
                    <p className="text-sm font-black uppercase tracking-[0.3em] opacity-50">
                      No nearby pharmacies found yet. Try a wider search like pharmacy or medical store.
                    </p>
                  </section>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-0 left-0 w-full bg-[var(--bg)] border-t border-grid px-8 py-4 hidden md:block">
        <div className="flex justify-between items-center">
          <div className="flex gap-12">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-black tracking-tighter">{results.length}</span>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">results</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-black tracking-tighter">{stores.length}</span>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">stores</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-80">
              {health?.status === 'ok' ? 'API online' : 'Checking API'}
            </span>
          </div>
        </div>
      </footer>

      <Chatbot />
      <VoiceAssistant />
    </div>
  );
}
