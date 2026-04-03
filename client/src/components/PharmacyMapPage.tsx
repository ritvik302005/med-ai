import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronLeft,
  ExternalLink,
  List,
  Loader2,
  LocateFixed,
  Map,
  MapPin,
  Navigation,
  Phone,
  Search,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getNearbyPharmacies, type PharmacyStore } from '../services/api';

type ViewMode = 'list' | 'map';

interface RouteState {
  autostart?: boolean;
  initialQuery?: string;
}

interface PharmacyFilter {
  label: string;
  query: string;
}

const PHARMACY_FILTERS: PharmacyFilter[] = [
  { label: 'All', query: 'pharmacy' },
  { label: 'Jan Aushadhi', query: 'Jan Aushadhi pharmacy' },
  { label: 'Apollo', query: 'Apollo Pharmacy' },
  { label: 'MedPlus', query: 'MedPlus pharmacy' },
  { label: 'Netmeds', query: 'Netmeds pharmacy' },
];

function MapGrid({
  stores,
  userLat,
  userLon,
}: {
  stores: PharmacyStore[];
  userLat: number;
  userLon: number;
}) {
  const size = 340;
  const padding = 30;

  if (stores.length === 0) {
    return null;
  }

  const lats = [userLat, ...stores.map((store) => store.position?.lat ?? userLat)];
  const lons = [userLon, ...stores.map((store) => store.position?.lon ?? userLon)];
  const minLat = Math.min(...lats) - 0.05;
  const maxLat = Math.max(...lats) + 0.05;
  const minLon = Math.min(...lons) - 0.05;
  const maxLon = Math.max(...lons) + 0.05;

  const toX = (lon: number) =>
    padding + ((lon - minLon) / (maxLon - minLon || 1)) * (size - padding * 2);
  const toY = (lat: number) =>
    padding + ((maxLat - lat) / (maxLat - minLat || 1)) * (size - padding * 2);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-sm">
      {Array.from({ length: 6 }).map((_, index) => (
        <React.Fragment key={index}>
          <line
            x1={padding + (index * (size - padding * 2)) / 5}
            y1={padding}
            x2={padding + (index * (size - padding * 2)) / 5}
            y2={size - padding}
            stroke="var(--grid)"
            strokeWidth="1"
          />
          <line
            x1={padding}
            y1={padding + (index * (size - padding * 2)) / 5}
            x2={size - padding}
            y2={padding + (index * (size - padding * 2)) / 5}
            stroke="var(--grid)"
            strokeWidth="1"
          />
        </React.Fragment>
      ))}

      {stores.slice(0, 6).map((store) => (
        <line
          key={`line-${store.id}`}
          x1={toX(userLon)}
          y1={toY(userLat)}
          x2={toX(store.position?.lon ?? userLon)}
          y2={toY(store.position?.lat ?? userLat)}
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.4"
        />
      ))}

      {stores.slice(0, 6).map((store, index) => (
        <g key={store.id}>
          <circle
            cx={toX(store.position?.lon ?? userLon)}
            cy={toY(store.position?.lat ?? userLat)}
            r="6"
            fill="var(--text)"
          />
          <text
            x={toX(store.position?.lon ?? userLon) + 9}
            y={toY(store.position?.lat ?? userLat) + 4}
            fill="var(--text)"
            fontSize="7"
            fontWeight="900"
            fontFamily="monospace"
            opacity="0.6"
          >
            {index + 1}
          </text>
        </g>
      ))}

      <circle cx={toX(userLon)} cy={toY(userLat)} r="10" fill="var(--accent)" opacity="0.25" />
      <circle cx={toX(userLon)} cy={toY(userLat)} r="5" fill="var(--accent)" />
      <text
        x={toX(userLon)}
        y={toY(userLat) - 14}
        fill="var(--accent)"
        fontSize="7"
        fontWeight="900"
        textAnchor="middle"
      >
        YOU
      </text>
    </svg>
  );
}

export default function PharmacyMapPage() {
  const location = useLocation();
  const routeState = (location.state as RouteState | null) || null;
  const [stores, setStores] = useState<PharmacyStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationNote, setLocationNote] = useState('');
  const [error, setError] = useState('');
  const [userLat, setUserLat] = useState(28.6139);
  const [userLon, setUserLon] = useState(77.209);
  const [view, setView] = useState<ViewMode>('list');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selected, setSelected] = useState<PharmacyStore | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [query, setQuery] = useState(routeState?.initialQuery || 'Jan Aushadhi pharmacy');
  const [resolvedQuery, setResolvedQuery] = useState('');

  const activeFilterQuery = useMemo(() => {
    return PHARMACY_FILTERS.find((filter) => filter.label === activeFilter)?.query || 'pharmacy';
  }, [activeFilter]);

  const visibleStores = useMemo(() => {
    if (activeFilter === 'All') {
      return stores;
    }

    const filtered = stores.filter((store) =>
      store.name.toLowerCase().includes(activeFilter.toLowerCase())
    );

    return filtered.length > 0 ? filtered : stores;
  }, [activeFilter, stores]);

  const handleFind = async (nextQuery?: string) => {
    setLoading(true);
    setError('');
    setHasSearched(true);

    let lat = 28.6139;
    let lon = 77.209;
    let note = 'Showing results near New Delhi (location blocked or unavailable)';

    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        lat = position.coords.latitude;
        lon = position.coords.longitude;
        note = 'Showing results near your current location';
      } catch (lookupError) {
        note = 'Location blocked, showing results near New Delhi';
      }
    }

    const effectiveQuery = (nextQuery || query || activeFilterQuery).trim() || 'pharmacy';

    setUserLat(lat);
    setUserLon(lon);
    setLocationNote(note);
    setResolvedQuery(effectiveQuery);

    try {
      const response = await getNearbyPharmacies(lat, lon, 10, effectiveQuery);
      setStores(response);
      setSelected(response[0] || null);
    } catch (requestError) {
      setStores([]);
      setSelected(null);
      setError(requestError instanceof Error ? requestError.message : 'Failed to load pharmacies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!routeState?.autostart) {
      return;
    }

    void handleFind(routeState.initialQuery || query);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-20 text-[var(--text)] transition-colors duration-500">
      <header className="sticky top-20 z-40 border-b border-[var(--grid)] bg-[var(--bg)]/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-4 md:px-12">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="p-2 transition-colors hover:bg-[var(--text)]/10">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Feature</p>
              <h1 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em]">
                <MapPin className="h-4 w-4" />
                Nearby Pharmacies
              </h1>
            </div>
          </div>

          {hasSearched ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('list')}
                className={`border-2 p-2 transition-all ${
                  view === 'list'
                    ? 'border-[var(--text)] bg-[var(--text)] text-[var(--bg)]'
                    : 'border-[var(--grid)]'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('map')}
                className={`border-2 p-2 transition-all ${
                  view === 'map'
                    ? 'border-[var(--text)] bg-[var(--text)] text-[var(--bg)]'
                    : 'border-[var(--grid)]'
                }`}
              >
                <Map className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10 md:px-12">
        {!hasSearched ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-20 text-center">
            <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center border-4 border-[var(--text)]">
              <MapPin className="h-12 w-12" />
              <div className="absolute inset-0 animate-ping border-4 border-[var(--accent)] opacity-20" />
            </div>
            <h2 className="mb-4 text-5xl font-black uppercase tracking-tight">Find Pharmacies</h2>
            <p className="mx-auto mb-10 max-w-md text-[10px] font-bold uppercase tracking-[0.4em] opacity-50">
              Locate Jan Aushadhi Kendras and nearby pharmacies for affordable generic medicines.
            </p>

            <div className="mx-auto mb-6 max-w-3xl border-4 border-[var(--text)] p-6 text-left">
              <p className="mb-3 text-[8px] font-black uppercase tracking-[0.4em] opacity-40">
                Search pharmacies
              </p>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Jan Aushadhi pharmacy"
                  className="w-full border-2 border-[var(--text)] bg-transparent p-4 pr-14 text-sm font-black uppercase tracking-[0.2em] focus:outline-none"
                />
                <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 opacity-40" />
              </div>
            </div>

            <div className="mb-8 flex flex-wrap justify-center gap-2">
              {PHARMACY_FILTERS.map((filter) => (
                <button
                  key={filter.label}
                  onClick={() => {
                    setActiveFilter(filter.label);
                    setQuery(filter.query);
                  }}
                  className={`px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                    activeFilter === filter.label
                      ? 'border-2 border-[var(--text)] bg-[var(--text)] text-[var(--bg)]'
                      : 'border-2 border-[var(--grid)]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => void handleFind()}
              disabled={loading}
              className="inline-flex items-center gap-3 bg-[var(--text)] px-12 py-5 font-black uppercase tracking-[0.3em] text-[var(--bg)] transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Locating...
                </>
              ) : (
                <>
                  <LocateFixed className="h-5 w-5" />
                  Use My Location
                </>
              )}
            </button>
            <p className="mt-4 text-[8px] font-bold uppercase tracking-[0.3em] opacity-40">
              Falls back to New Delhi if location is blocked
            </p>
          </motion.div>
        ) : null}

        {loading && hasSearched ? (
          <div className="py-20 text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin opacity-40" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
              Scanning your area...
            </p>
          </div>
        ) : null}

        {hasSearched && !loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <section className="mb-6 border-4 border-[var(--text)] p-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <p className="mb-3 text-[8px] font-black uppercase tracking-[0.4em] opacity-40">
                    Search pharmacies
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Jan Aushadhi pharmacy"
                      className="w-full border-2 border-[var(--text)] bg-transparent p-4 pr-14 text-sm font-black uppercase tracking-[0.2em] focus:outline-none"
                    />
                    <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 opacity-40" />
                  </div>
                </div>
                <button
                  onClick={() => void handleFind()}
                  className="inline-flex items-center justify-center gap-3 bg-[var(--text)] px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--bg)] transition-opacity hover:opacity-80"
                >
                  <LocateFixed className="h-4 w-4" />
                  Refresh Search
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {PHARMACY_FILTERS.map((filter) => (
                  <button
                    key={filter.label}
                    onClick={() => {
                      setActiveFilter(filter.label);
                      setQuery(filter.query);
                      void handleFind(filter.query);
                    }}
                    className={`px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                      activeFilter === filter.label
                        ? 'border-2 border-[var(--text)] bg-[var(--text)] text-[var(--bg)]'
                        : 'border-2 border-[var(--grid)]'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </section>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">{locationNote}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] opacity-60">
                  {visibleStores.length} pharmacies found
                </p>
                <p className="mt-2 text-[8px] font-black uppercase tracking-[0.3em] opacity-40">
                  Query used: {resolvedQuery || query}
                </p>
              </div>
            </div>

            {error ? (
              <div className="mb-6 border-2 border-red-500 p-4 text-[10px] font-black uppercase tracking-[0.3em] text-red-500">
                {error}
              </div>
            ) : null}

            {view === 'map' ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="border-4 border-[var(--text)] p-6">
                  <p className="mb-4 text-[8px] font-black uppercase tracking-[0.4em] opacity-40">
                    Area overview
                  </p>
                  <MapGrid stores={visibleStores} userLat={userLat} userLon={userLon} />
                  <p className="mt-4 text-center text-[8px] font-black uppercase tracking-[0.3em] opacity-30">
                    Schematic representation. Open maps for live navigation.
                  </p>
                </div>

                <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                  {visibleStores.map((store, index) => (
                    <button
                      key={store.id}
                      onClick={() => setSelected(store)}
                      className={`w-full border-2 p-4 text-left transition-all ${
                        selected?.id === store.id
                          ? 'border-[var(--text)] bg-[var(--text)] text-[var(--bg)]'
                          : 'border-[var(--grid)] hover:border-[var(--text)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 w-5 text-xs font-black opacity-50">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-black uppercase tracking-tight">{store.name}</h4>
                          <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.2em] opacity-50">
                            {store.address}
                          </p>
                          {store.distanceKm ? (
                            <p className="mt-1 text-[9px] font-black uppercase tracking-widest opacity-60">
                              {store.distanceKm} km
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {visibleStores.map((store, index) => (
                  <motion.a
                    key={store.id}
                    href={store.mapUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group block border-2 border-[var(--text)] p-6 transition-all hover:bg-[var(--text)] hover:text-[var(--bg)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-40">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                        </div>
                        <h3 className="text-base font-black uppercase tracking-tight">{store.name}</h3>
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">
                          {store.city || 'Nearby area'}
                        </p>
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.15em] opacity-40">
                          {store.address}
                        </p>
                      </div>
                      <ExternalLink className="mt-1 h-4 w-4 flex-shrink-0 opacity-40 transition-opacity group-hover:opacity-100" />
                    </div>

                    <div className="mt-5 flex items-center gap-4 border-t border-[var(--text)]/15 pt-4 group-hover:border-[var(--bg)]/20">
                      {store.distanceKm ? (
                        <div className="flex items-center gap-2">
                          <Navigation className="h-3 w-3 opacity-60" />
                          <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                            {store.distanceKm} km
                          </span>
                        </div>
                      ) : null}
                      {store.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 opacity-60" />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                            {store.phone}
                          </span>
                        </div>
                      ) : null}
                      <div className="ml-auto">
                        <span className="border border-current px-2 py-1 text-[8px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100">
                          Open Maps
                        </span>
                      </div>
                    </div>
                  </motion.a>
                ))}

                {visibleStores.length === 0 ? (
                  <div className="col-span-2 border-2 border-dashed border-[var(--grid)] p-16 text-center">
                    <MapPin className="mx-auto mb-4 h-10 w-10 opacity-20" />
                    <p className="text-sm font-black uppercase tracking-[0.3em] opacity-40">
                      No pharmacies found
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            <AnimatePresence>
              {selected && view === 'map' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="fixed bottom-0 left-0 right-0 z-50 border-t-4 border-[var(--text)] bg-[var(--bg)] p-6 md:bottom-8 md:left-1/2 md:max-w-lg md:-translate-x-1/2 md:border-4"
                >
                  <button
                    onClick={() => setSelected(null)}
                    className="absolute right-4 top-4 p-2 transition-colors hover:bg-[var(--text)]/10"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <h3 className="pr-8 text-lg font-black uppercase tracking-tight">{selected.name}</h3>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">
                    {selected.address}
                  </p>
                  {selected.distanceKm ? (
                    <p className="mt-2 text-sm font-black">{selected.distanceKm} km away</p>
                  ) : null}
                  {selected.phone ? (
                    <a
                      href={`tel:${selected.phone}`}
                      className="mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] opacity-70"
                    >
                      <Phone className="h-3 w-3" />
                      {selected.phone}
                    </a>
                  ) : null}
                  <a
                    href={selected.mapUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex w-full items-center justify-center gap-3 bg-[var(--text)] py-3 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--bg)] transition-opacity hover:opacity-80"
                  >
                    <Navigation className="h-4 w-4" />
                    Get Directions
                  </a>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
