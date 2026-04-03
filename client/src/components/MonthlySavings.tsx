import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { searchMedicines } from '../services/api';
import type { Medicine } from '../data/medicineDb';

interface MedicineEntry {
  medicine: Medicine;
  dosesPerMonth: number;
}

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = display;
    const end = value;
    const duration = 700;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [value]);

  return (
    <span>
      {prefix}
      {display.toLocaleString('en-IN')}
    </span>
  );
}

export default function MonthlySavings() {
  const [entries, setEntries] = useState<MedicineEntry[]>([]);
  const [defaultMeds, setDefaultMeds] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [activeView, setActiveView] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const results = await searchMedicines('', 1, 6);
        const medicines = results.medicines
          .filter((medicine) => medicine.brandedPrice > 0 && medicine.genericPrice > 0)
          .slice(0, 4);

        setDefaultMeds(medicines);

        if (medicines.length >= 2) {
          setEntries([
            { medicine: medicines[0], dosesPerMonth: 30 },
            { medicine: medicines[1], dosesPerMonth: 30 },
          ]);
        }
      } catch (error) {
        setDefaultMeds([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const addMedicine = (medicine: Medicine) => {
    if (entries.some((entry) => entry.medicine.id === medicine.id)) {
      return;
    }

    setEntries((current) => [...current, { medicine, dosesPerMonth: 30 }]);
  };

  const removeMedicine = (id: string) => {
    setEntries((current) => current.filter((entry) => entry.medicine.id !== id));
  };

  const updateDoses = (id: string, delta: number) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.medicine.id === id
          ? {
              ...entry,
              dosesPerMonth: Math.max(1, Math.min(90, entry.dosesPerMonth + delta)),
            }
          : entry
      )
    );
  };

  const totals = useMemo(() => {
    const brandedMonthly = entries.reduce(
      (sum, entry) => sum + entry.medicine.brandedPrice * entry.dosesPerMonth,
      0
    );
    const genericMonthly = entries.reduce(
      (sum, entry) => sum + entry.medicine.genericPrice * entry.dosesPerMonth,
      0
    );
    const savedMonthly = brandedMonthly - genericMonthly;

    return {
      brandedMonthly,
      genericMonthly,
      savedMonthly,
      savedYearly: savedMonthly * 12,
      savingsPct: brandedMonthly > 0 ? Math.round((savedMonthly / brandedMonthly) * 100) : 0,
    };
  }, [entries]);

  const displayedSavings = activeView === 'monthly' ? totals.savedMonthly : totals.savedYearly;

  return (
    <section className="overflow-hidden border-4 border-[var(--text)]">
      <button
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between p-6 transition-colors hover:bg-[var(--text)]/5"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center bg-[var(--text)] text-[var(--bg)]">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">
              Calculator
            </p>
            <h3 className="text-sm font-black uppercase tracking-tight">
              Monthly Savings Comparison
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {totals.savedMonthly > 0 ? (
            <span className="hidden text-[10px] font-black uppercase tracking-[0.2em] text-green-500 sm:block">
              Save {money.format(totals.savedMonthly)}/mo
            </span>
          ) : null}
          {expanded ? (
            <ChevronUp className="h-5 w-5 opacity-40" />
          ) : (
            <ChevronDown className="h-5 w-5 opacity-40" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-6 border-t border-[var(--grid)] p-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="border-2 border-[var(--grid)] p-4">
                  <p className="mb-1 text-[8px] font-black uppercase tracking-[0.3em] opacity-40">
                    Branded / mo
                  </p>
                  <p className="text-lg font-black">{money.format(totals.brandedMonthly)}</p>
                </div>
                <div className="border-2 border-[var(--accent)] p-4">
                  <p className="mb-1 text-[8px] font-black uppercase tracking-[0.3em] opacity-40">
                    Generic / mo
                  </p>
                  <p className="text-lg font-black text-[var(--accent)]">
                    {money.format(totals.genericMonthly)}
                  </p>
                </div>
                <div className="border-2 border-green-500 bg-green-500/5 p-4">
                  <p className="mb-1 text-[8px] font-black uppercase tracking-[0.3em] opacity-40">
                    You save
                  </p>
                  <p className="text-lg font-black text-green-500">
                    <AnimatedNumber value={totals.savedMonthly} prefix="Rs. " />
                  </p>
                </div>
              </div>

              {totals.savedMonthly > 0 ? (
                <div className="border-4 border-green-500 bg-green-500/5 p-5">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-green-500" />
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-green-500">
                        Switching to generics saves you
                      </span>
                    </div>
                    <div className="flex items-center gap-1 border border-green-500/40 p-0.5">
                      {(['monthly', 'yearly'] as const).map((view) => (
                        <button
                          key={view}
                          onClick={() => setActiveView(view)}
                          className={`px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] transition-all ${
                            activeView === view ? 'bg-green-500 text-white' : 'text-green-500'
                          }`}
                        >
                          {view}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-baseline gap-3">
                    <p className="text-4xl font-black text-green-500">
                      <AnimatedNumber value={displayedSavings} prefix="Rs. " />
                    </p>
                    <p className="text-sm font-black text-green-500 opacity-60">
                      {activeView === 'monthly' ? 'per month' : 'per year'} / {totals.savingsPct}%
                      less
                    </p>
                  </div>

                  {activeView === 'yearly' ? (
                    <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.2em] opacity-50">
                      That is {money.format(totals.savedYearly / 12)} every month consistently.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <p className="mb-3 text-[8px] font-black uppercase tracking-[0.4em] opacity-40">
                  Your medicine list ({entries.length})
                </p>

                {entries.length === 0 && !loading ? (
                  <div className="border-2 border-dashed border-[var(--grid)] p-6 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-40">
                      Add medicines below to compare monthly branded vs generic cost.
                    </p>
                  </div>
                ) : null}

                <div className="space-y-2">
                  {entries.map(({ medicine, dosesPerMonth }) => {
                    const saving = (medicine.brandedPrice - medicine.genericPrice) * dosesPerMonth;

                    return (
                      <div key={medicine.id} className="border-2 border-[var(--text)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-sm font-black uppercase tracking-tight">
                              {medicine.brandedName}
                            </h4>
                            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] opacity-40">
                              {medicine.genericName}
                            </p>
                          </div>
                          <button
                            onClick={() => removeMedicine(medicine.id)}
                            className="flex-shrink-0 border border-red-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-500 hover:text-white"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                          <div className="border border-[var(--grid)] p-2">
                            <p className="mb-1 text-[7px] font-black uppercase tracking-widest opacity-40">
                              Doses/mo
                            </p>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateDoses(medicine.id, -5)}
                                className="flex h-5 w-5 items-center justify-center border border-[var(--grid)] text-[8px] transition-all hover:bg-[var(--text)] hover:text-[var(--bg)]"
                              >
                                <Minus className="h-2.5 w-2.5" />
                              </button>
                              <span className="flex-1 text-center text-xs font-black">
                                {dosesPerMonth}
                              </span>
                              <button
                                onClick={() => updateDoses(medicine.id, 5)}
                                className="flex h-5 w-5 items-center justify-center border border-[var(--grid)] text-[8px] transition-all hover:bg-[var(--text)] hover:text-[var(--bg)]"
                              >
                                <Plus className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>

                          <div className="border border-[var(--grid)] p-2">
                            <p className="mb-1 text-[7px] font-black uppercase tracking-widest opacity-40">
                              Branded
                            </p>
                            <p className="text-xs font-black">
                              {money.format(medicine.brandedPrice * dosesPerMonth)}
                            </p>
                          </div>

                          <div className="border border-green-500/40 bg-green-500/5 p-2">
                            <p className="mb-1 text-[7px] font-black uppercase tracking-widest opacity-40">
                              Generic
                            </p>
                            <p className="text-xs font-black text-green-500">
                              {money.format(medicine.genericPrice * dosesPerMonth)}
                            </p>
                          </div>
                        </div>

                        {saving > 0 ? (
                          <p className="mt-2 text-[8px] font-black uppercase tracking-[0.3em] text-green-500">
                            Save {money.format(saving)} / month on this medicine
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-3 text-[8px] font-black uppercase tracking-[0.4em] opacity-40">
                  Add to comparison
                </p>

                {loading ? (
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-30">
                    Loading medicines...
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {defaultMeds
                      .filter(
                        (medicine) => !entries.some((entry) => entry.medicine.id === medicine.id)
                      )
                      .map((medicine) => (
                        <button
                          key={medicine.id}
                          onClick={() => addMedicine(medicine)}
                          className="flex items-center gap-2 border-2 border-[var(--text)]/30 px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all hover:border-[var(--text)]"
                        >
                          <Plus className="h-3 w-3" />
                          {medicine.brandedName}
                        </button>
                      ))}

                    {defaultMeds.length > 0 &&
                    defaultMeds.every((medicine) =>
                      entries.some((entry) => entry.medicine.id === medicine.id)
                    ) ? (
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-30">
                        All suggested medicines added
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              {entries.length > 0 ? (
                <div>
                  <p className="mb-3 flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.4em] opacity-40">
                    <BarChart3 className="h-3 w-3" />
                    Branded vs Generic Monthly Cost
                  </p>
                  <div className="space-y-3">
                    {entries.map(({ medicine, dosesPerMonth }) => {
                      const branded = medicine.brandedPrice * dosesPerMonth;
                      const generic = medicine.genericPrice * dosesPerMonth;
                      const max = Math.max(branded, 1);

                      return (
                        <div key={medicine.id}>
                          <p className="mb-1 text-[8px] font-black uppercase tracking-[0.2em] opacity-60">
                            {medicine.brandedName}
                          </p>
                          <div className="mb-1 flex items-center gap-2">
                            <span className="w-12 text-right text-[7px] font-black uppercase opacity-40">
                              Branded
                            </span>
                            <div className="relative h-4 flex-1 overflow-hidden bg-[var(--grid)]">
                              <motion.div
                                className="absolute left-0 top-0 h-full bg-[var(--text)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${(branded / max) * 100}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                              />
                            </div>
                            <span className="w-16 text-right text-[8px] font-black">
                              {money.format(branded)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-12 text-right text-[7px] font-black uppercase opacity-40">
                              Generic
                            </span>
                            <div className="relative h-4 flex-1 overflow-hidden bg-[var(--grid)]">
                              <motion.div
                                className="absolute left-0 top-0 h-full bg-green-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${(generic / max) * 100}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                              />
                            </div>
                            <span className="w-16 text-right text-[8px] font-black text-green-500">
                              {money.format(generic)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
