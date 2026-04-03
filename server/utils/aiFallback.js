const OFFLINE_MEDICINES = [
  {
    branded: 'Dolo 650 Tablet',
    generic: 'Paracetamol',
    composition: 'Paracetamol 650mg',
    usage: 'Fever and mild pain relief',
    brandedPrice: 32,
    genericPrice: 11,
    category: 'Analgesic',
    warning: 'Avoid combining with other paracetamol products.',
  },
  {
    branded: 'Crocin Advance Tablet',
    generic: 'Paracetamol',
    composition: 'Paracetamol 500mg',
    usage: 'Headache, body ache, and fever',
    brandedPrice: 22,
    genericPrice: 8,
    category: 'Analgesic',
    warning: 'Use within the labeled daily dose only.',
  },
  {
    branded: 'Combiflam Tablet',
    generic: 'Ibuprofen + Paracetamol',
    composition: 'Ibuprofen 400mg + Paracetamol 325mg',
    usage: 'Pain and inflammation',
    brandedPrice: 42,
    genericPrice: 18,
    category: 'NSAID',
    warning: 'Avoid if you have stomach ulcers or kidney disease without medical advice.',
  },
  {
    branded: 'Cetcip Tablet',
    generic: 'Cetirizine',
    composition: 'Cetirizine 10mg',
    usage: 'Allergy, sneezing, runny nose',
    brandedPrice: 28,
    genericPrice: 9,
    category: 'Antihistamine',
    warning: 'May cause drowsiness in some people.',
  },
  {
    branded: 'Pantocid Tablet',
    generic: 'Pantoprazole',
    composition: 'Pantoprazole 40mg',
    usage: 'Acidity and reflux',
    brandedPrice: 118,
    genericPrice: 33,
    category: 'Antacid',
    warning: 'Persistent acidity should be medically evaluated.',
  },
  {
    branded: 'Benadryl Cough Syrup',
    generic: 'Diphenhydramine + Ammonium Chloride',
    composition: 'Diphenhydramine + Ammonium Chloride syrup',
    usage: 'Dry cough relief',
    brandedPrice: 95,
    genericPrice: 46,
    category: 'Cough Syrup',
    warning: 'Avoid driving if you feel sleepy after taking it.',
  },
  {
    branded: 'Ascoril LS Syrup',
    generic: 'Ambroxol + Levosalbutamol + Guaifenesin',
    composition: 'Ambroxol + Levosalbutamol + Guaifenesin',
    usage: 'Wet cough and chest congestion',
    brandedPrice: 126,
    genericPrice: 49,
    category: 'Expectorant',
    warning: 'Use only if the label or clinician advice matches your symptoms.',
  },
  {
    branded: 'Glycomet Tablet',
    generic: 'Metformin',
    composition: 'Metformin 500mg',
    usage: 'Type 2 diabetes management',
    brandedPrice: 44,
    genericPrice: 16,
    category: 'Antidiabetic',
    warning: 'Blood sugar medicines require clinician supervision.',
  },
];

const INTERACTION_RULES = [
  {
    names: ['ibuprofen', 'warfarin'],
    safe: false,
    severity: 'severe',
    title: 'Higher bleeding risk',
    description:
      'Ibuprofen can raise bleeding risk when combined with blood thinners such as warfarin.',
    recommendation: 'Do not combine these without clinician guidance.',
    symptoms: ['easy bruising', 'bleeding gums', 'black stools'],
  },
  {
    names: ['ibuprofen', 'aspirin'],
    safe: false,
    severity: 'moderate',
    title: 'Added stomach irritation risk',
    description:
      'Using ibuprofen with aspirin can increase stomach irritation and bleeding risk.',
    recommendation: 'Ask a doctor or pharmacist before combining these pain medicines.',
    symptoms: ['stomach pain', 'heartburn', 'nausea'],
  },
  {
    names: ['paracetamol', 'alcohol'],
    safe: false,
    severity: 'moderate',
    title: 'Added liver strain',
    description:
      'Heavy alcohol use together with paracetamol can increase liver injury risk.',
    recommendation: 'Avoid alcohol and keep within labeled doses.',
    symptoms: ['nausea', 'vomiting', 'yellowing of eyes'],
  },
  {
    names: ['metformin', 'alcohol'],
    safe: false,
    severity: 'moderate',
    title: 'Metabolic side effect risk',
    description:
      'Alcohol may worsen some metformin side effects and complicate blood sugar management.',
    recommendation: 'Limit alcohol and monitor symptoms carefully.',
    symptoms: ['weakness', 'breathing discomfort', 'severe nausea'],
  },
];

function extractTextFromContent(content) {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item?.type === 'text') {
          return item.text || '';
        }

        return '';
      })
      .filter(Boolean)
      .join(' ');
  }

  return '';
}

function getLatestUserText(messages = []) {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message?.role === 'user');

  return extractTextFromContent(latestUserMessage?.content).trim();
}

function upper(text) {
  return String(text || '').toUpperCase();
}

function uniqueByBrand(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.branded}|${item.generic}`.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function findOfflineMedicines(text) {
  const lower = String(text || '').toLowerCase();
  return OFFLINE_MEDICINES.filter((medicine) =>
    [medicine.branded, medicine.generic, medicine.composition]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(lower) || lower.includes(field.toLowerCase()))
  );
}

function buildChatFallback(messages = []) {
  const latestText = getLatestUserText(messages);
  const lower = latestText.toLowerCase();
  const medicineMatches = findOfflineMedicines(latestText);

  if (medicineMatches.length > 0) {
    const medicine = medicineMatches[0];
    return upper(
      `${medicine.branded} CAN OFTEN BE COMPARED WITH GENERIC ${medicine.generic}. ` +
        `IN OUR OFFLINE MODE, THE ESTIMATED PRICE CAN DROP FROM INR ${medicine.brandedPrice} TO INR ${medicine.genericPrice}. ` +
        `PLEASE CONFIRM ANY SWITCH WITH A DOCTOR OR PHARMACIST.`
    );
  }

  if (lower.includes('generic') || lower.includes('price') || lower.includes('compare')) {
    return upper(
      'SEARCH THE MEDICINE NAME IN MEDAI TO COMPARE BRANDED AND GENERIC PRICES. ' +
        'I CAN HELP EXPLAIN SAVINGS, ACTIVE INGREDIENTS, AND BASIC SAFETY NOTES. ' +
        'ALWAYS CONFIRM TREATMENT CHANGES WITH A QUALIFIED CLINICIAN.'
    );
  }

  if (lower.includes('symptom') || lower.includes('fever') || lower.includes('cold') || lower.includes('cough')) {
    return upper(
      'DESCRIBE THE MAIN SYMPTOMS, THEIR DURATION, AND ANY FEVER OR BREATHING TROUBLE. ' +
        'I CAN SUGGEST COMMON MEDICINE CATEGORIES, BUT A DOCTOR SHOULD CONFIRM THE RIGHT TREATMENT.'
    );
  }

  return upper(
    'MEDAI IS RUNNING IN OFFLINE ASSIST MODE. I CAN HELP WITH GENERIC MEDICINE COMPARISONS, ' +
      'COMMON SYMPTOM GUIDANCE, AND BASIC SAFETY NOTES. FOR URGENT OR PRESCRIPTION DECISIONS, CONSULT A DOCTOR.'
  );
}

function buildScanFallback(messages = []) {
  const text = messages.map((message) => extractTextFromContent(message?.content)).join(' ');
  const lower = text.toLowerCase();
  const matchedMedicines = uniqueByBrand(
    OFFLINE_MEDICINES.filter((medicine) =>
      [medicine.branded, medicine.generic, medicine.composition]
        .filter(Boolean)
        .some((field) => lower.includes(field.toLowerCase()))
    )
  );

  return matchedMedicines.slice(0, 6);
}

function buildInteractionFallback(medicines = []) {
  const normalized = medicines.map((medicine) => String(medicine || '').trim().toLowerCase());
  const matchedRule = INTERACTION_RULES.find((rule) =>
    rule.names.every((name) => normalized.some((medicine) => medicine.includes(name)))
  );

  if (matchedRule) {
    return matchedRule;
  }

  const uniqueMedicines = new Set(normalized.filter(Boolean));
  if (uniqueMedicines.size !== normalized.filter(Boolean).length) {
    return {
      safe: false,
      severity: 'mild',
      title: 'Duplicate or repeated medicine detected',
      description:
        'The same medicine or ingredient may have been entered more than once, which can increase accidental double dosing risk.',
      recommendation: 'Recheck the list and confirm strength, schedule, and duplicates.',
      symptoms: ['unexpected side effects', 'confusion about dosing'],
    };
  }

  return {
    safe: true,
    severity: 'none',
    title: 'No major offline rule matched',
    description:
      'No high-confidence interaction was found by the offline rules, but this is not a complete clinical check.',
    recommendation: 'Confirm combinations with a pharmacist, especially for chronic conditions.',
    symptoms: [],
  };
}

function buildSymptomsFallback(symptoms = '') {
  const lower = String(symptoms || '').toLowerCase();
  const suggestions = [];

  if (lower.includes('fever') || lower.includes('body pain') || lower.includes('headache')) {
    suggestions.push(OFFLINE_MEDICINES[0], OFFLINE_MEDICINES[1], OFFLINE_MEDICINES[2]);
  }

  if (lower.includes('cough') || lower.includes('cold') || lower.includes('chest congestion')) {
    suggestions.push(OFFLINE_MEDICINES[5], OFFLINE_MEDICINES[6], OFFLINE_MEDICINES[3]);
  }

  if (lower.includes('allergy') || lower.includes('sneez') || lower.includes('runny nose')) {
    suggestions.push(OFFLINE_MEDICINES[3]);
  }

  if (lower.includes('acidity') || lower.includes('reflux') || lower.includes('heartburn')) {
    suggestions.push(OFFLINE_MEDICINES[4]);
  }

  if (lower.includes('diabet')) {
    suggestions.push(OFFLINE_MEDICINES[7]);
  }

  if (suggestions.length === 0) {
    suggestions.push(OFFLINE_MEDICINES[0], OFFLINE_MEDICINES[3], OFFLINE_MEDICINES[4]);
  }

  return uniqueByBrand(suggestions).slice(0, 6);
}

module.exports = {
  buildChatFallback,
  buildInteractionFallback,
  buildScanFallback,
  buildSymptomsFallback,
};
