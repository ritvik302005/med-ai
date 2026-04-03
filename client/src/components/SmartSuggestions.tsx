import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Tag,
  Pill,
  TrendingUp,
  X,
} from 'lucide-react';
import { searchMedicines } from '../services/api';
import type { Medicine } from '../data/medicineDb';

interface SuggestionGroup {
  label: string;
  reason: string;
  medicines: Medicine[];
  icon: typeof Sparkles;
  color: string;
}

interface SmartSuggestionsProps {
  selectedMedicine?: Medicine | null;
  onSelect?: (medicine: Medicine) => void;
}

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function getCategoryKeywords(medicine: Medicine): string[] {
  const words: string[] = [];
  const category = (medicine.category || '').toLowerCase();
  const composition = (medicine.composition || '').toLowerCase();
  const generic = (medicine.genericName || '').toLowerCase();

  if (category.includes('analgesic') || composition.includes('paracetamol') || composition.includes('ibuprofen')) {
    words.push('pain', 'fever');
  }
  if (category.includes('antibiotic') || composition.includes('amoxicillin') || composition.includes('azithromycin')) {
    words.push('antibiotic', 'infection');
  }
  if (category.includes('antidiabetic') || composition.includes('metformin') || composition.includes('glipizide')) {
    words.push('diabetes', 'metformin');
  }
  if (category.includes('statin') || composition.includes('atorvastatin') || composition.includes('rosuvastatin')) {
    words.push('cholesterol', 'statin');
  }
  if (category.includes('antacid') || composition.includes('omeprazole') || composition.includes('pantoprazole')) {
    words.push('acidity', 'omeprazole');
  }
  if (category.includes('bronchodilator') || composition.includes('salbutamol') || composition.includes('montelukast')) {
    words.push('asthma', 'respiratory');
  }
  if (category.includes('antihypertensive') || composition.includes('amlodipine') || composition.includes('atenolol')) {
    words.push('blood pressure', 'hypertension');
  }

  if (words.length === 0) {
    const firstWord = generic.split(' ')[0];
    if (firstWord && firstWord.length > 3) {
      words.push(firstWord);
    }
  }

  return [...new Set(words)];
}

export default function SmartSuggestions({
  selectedMedicine,
  onSelect,
}: SmartSuggestionsProps) {
  const [groups, setGroups] = useState<SuggestionGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [activeGroup, setActiveGroup] = useState(0);
  const lastMedicineId = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedMedicine) {
      lastMedicineId.current = null;
      void loadDefault();
      return;
    }

    if (selectedMedicine.id === lastMedicineId.current) {
      return;
    }

    lastMedicineId.current = selectedMedicine.id;
    void loadRelated(selectedMedicine);
  }, [selectedMedicine]);

  const loadDefault = async () => {
    setLoading(true);

    try {
      const [common, diabetes, bloodPressure] = await Promise.all([
        searchMedicines('paracetamol', 1, 4),
        searchMedicines('metformin', 1, 4),
        searchMedicines('amlodipine', 1, 4),
      ]);

      const nextGroups: SuggestionGroup[] = [];

      if (common.medicines.length > 0) {
        nextGroups.push({
          label: 'Most Searched',
          reason: 'Popular medicines people search for',
          medicines: common.medicines.slice(0, 3),
          icon: TrendingUp,
          color: 'text-[var(--accent)]',
        });
      }

      if (diabetes.medicines.length > 0) {
        nextGroups.push({
          label: 'Diabetes Care',
          reason: 'Common antidiabetic medicines',
          medicines: diabetes.medicines.slice(0, 3),
          icon: Pill,
          color: 'text-amber-500',
        });
      }

      if (bloodPressure.medicines.length > 0) {
        nextGroups.push({
          label: 'Heart And BP',
          reason: 'Cardiovascular medicines',
          medicines: bloodPressure.medicines.slice(0, 3),
          icon: Tag,
          color: 'text-rose-500',
        });
      }

      setGroups(nextGroups);
      setActiveGroup(0);
    } catch (error) {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRelated = async (medicine: Medicine) => {
    setLoading(true);
    const keywords = getCategoryKeywords(medicine);
    const nextGroups: SuggestionGroup[] = [];

    try {
      const similarResponse = await searchMedicines(keywords[0] || medicine.genericName, 1, 6);
      const similarMedicines = similarResponse.medicines
        .filter((candidate) => candidate.id !== medicine.id && !dismissed.has(candidate.id))
        .slice(0, 3);

      if (similarMedicines.length > 0) {
        nextGroups.push({
          label: 'Similar Medicines',
          reason: `Other ${medicine.category || 'related'} medicines`,
          medicines: similarMedicines,
          icon: Tag,
          color: 'text-[var(--accent)]',
        });
      }

      const genericSearchTerm = medicine.genericName.split(' ')[0];
      const genericResponse = await searchMedicines(genericSearchTerm, 1, 6);
      const genericAlternatives = genericResponse.medicines
        .filter(
          (candidate) =>
            candidate.id !== medicine.id &&
            candidate.genericName !== medicine.genericName &&
            !dismissed.has(candidate.id)
        )
        .slice(0, 3);

      if (genericAlternatives.length > 0) {
        nextGroups.push({
          label: 'Generic Alternatives',
          reason: 'Cheaper substitutes with related active ingredients',
          medicines: genericAlternatives,
          icon: Sparkles,
          color: 'text-green-500',
        });
      }

      if (keywords.length > 1) {
        const comboResponse = await searchMedicines(keywords[1], 1, 4);
        const comboMedicines = comboResponse.medicines
          .filter((candidate) => candidate.id !== medicine.id && !dismissed.has(candidate.id))
          .slice(0, 3);

        if (comboMedicines.length > 0) {
          nextGroups.push({
            label: 'Often Used Together',
            reason: 'Medicines commonly co-prescribed',
            medicines: comboMedicines,
            icon: TrendingUp,
            color: 'text-amber-500',
          });
        }
      }

      setGroups(nextGroups);
      setActiveGroup(0);
    } catch (error) {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (selectedMedicine) {
      lastMedicineId.current = null;
      void loadRelated(selectedMedicine);
      return;
    }

    void loadDefault();
  };

  const handleDismiss = (id: string) => {
    setDismissed((current) => new Set([...current, id]));
    setGroups((current) =>
      current
        .map((group) => ({
          ...group,
          medicines: group.medicines.filter((medicine) => medicine.id !== id),
        }))
        .filter((group) => group.medicines.length > 0)
    );
    setActiveGroup(0);
  };

  const currentGroup = groups[activeGroup];

  if (!loading && groups.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden border-4 border-[var(--text)]">
      <div className="flex items-center justify-between border-b border-[var(--grid)] p-5">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5" />
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">
              AI-Powered
            </p>
            <h3 className="text-sm font-black uppercase tracking-tight">
              {selectedMedicine
                ? `Suggestions for ${selectedMedicine.brandedName}`
                : 'Smart Suggestions'}
            </h3>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 transition-colors hover:bg-[var(--text)]/10"
          title="Refresh suggestions"
        >
          <RefreshCw className={`h-4 w-4 opacity-40 hover:opacity-100 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {groups.length > 1 ? (
        <div className="flex overflow-x-auto border-b border-[var(--grid)]">
          {groups.map((group, index) => (
            <button
              key={group.label}
              onClick={() => setActiveGroup(index)}
              className={`whitespace-nowrap border-r border-[var(--grid)] px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                activeGroup === index
                  ? 'bg-[var(--text)] text-[var(--bg)]'
                  : 'hover:bg-[var(--text)]/5'
              } flex items-center gap-2`}
            >
              <group.icon className="h-3 w-3" />
              {group.label}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 p-8">
          <div className="flex gap-1">
            {[0, 0.15, 0.3].map((delay) => (
              <motion.div
                key={delay}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ repeat: Infinity, duration: 1, delay }}
                className="h-1.5 w-1.5 bg-[var(--text)]"
              />
            ))}
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">
            Finding suggestions...
          </span>
        </div>
      ) : null}

      {!loading && currentGroup ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeGroup}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4">
              <p className={`mb-3 text-[8px] font-bold uppercase tracking-[0.3em] ${currentGroup.color}`}>
                <currentGroup.icon className="mr-1 inline h-3 w-3" />
                {currentGroup.reason}
              </p>

              <div className="space-y-2">
                {currentGroup.medicines.map((medicine) => {
                  const saving = medicine.brandedPrice - medicine.genericPrice;
                  const percent =
                    medicine.brandedPrice > 0
                      ? Math.round((saving / medicine.brandedPrice) * 100)
                      : 0;

                  return (
                    <motion.div
                      key={medicine.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group relative border-2 border-[var(--text)]/20 transition-all hover:border-[var(--text)]"
                    >
                      <button
                        onClick={() => handleDismiss(medicine.id)}
                        className="absolute right-2 top-2 p-1 opacity-0 transition-opacity group-hover:opacity-40 hover:!opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>

                      <button onClick={() => onSelect?.(medicine)} className="w-full p-4 pr-8 text-left">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-sm font-black uppercase tracking-tight">
                              {medicine.brandedName}
                            </h4>
                            <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.2em] opacity-40">
                              {medicine.genericName}
                            </p>
                            <p className="mt-1 line-clamp-1 text-[8px] font-bold uppercase tracking-[0.1em] opacity-30">
                              {medicine.composition}
                            </p>
                          </div>

                          <div className="flex-shrink-0 text-right">
                            <p className="text-[10px] font-black">{money.format(medicine.genericPrice)}</p>
                            <p className="text-[8px] opacity-30 line-through">
                              {money.format(medicine.brandedPrice)}
                            </p>
                            {percent > 0 ? (
                              <span className="mt-1 inline-block bg-green-500 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-white">
                                -{percent}%
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">
                            View details
                          </span>
                          <ChevronRight className="h-3 w-3 opacity-60" />
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--grid)] px-4 py-3">
              <p className="text-[7px] font-black uppercase tracking-[0.3em] opacity-30">
                {currentGroup.medicines.length} suggestions / based on your selection
              </p>
              {onSelect && currentGroup.medicines[0] ? (
                <button
                  onClick={() => onSelect(currentGroup.medicines[0])}
                  className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.2em] opacity-40 transition-opacity hover:opacity-100"
                >
                  View first <ArrowRight className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          </motion.div>
        </AnimatePresence>
      ) : null}
    </section>
  );
}
