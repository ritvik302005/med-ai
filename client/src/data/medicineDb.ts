export interface Medicine {
  id: string;
  brandedName: string;
  genericName: string;
  composition: string;
  brandedPrice: number;
  genericPrice: number;
  description: string;
  category: string;
}

export const MEDICINE_DB: Medicine[] = [
  {
    id: "1",
    brandedName: "Panadol",
    genericName: "Paracetamol",
    composition: "Paracetamol 500mg",
    brandedPrice: 45.50,
    genericPrice: 12.00,
    description: "Used for mild to moderate pain relief and fever reduction.",
    category: "Analgesic"
  },
  {
    id: "2",
    brandedName: "Lipitor",
    genericName: "Atorvastatin",
    composition: "Atorvastatin 10mg",
    brandedPrice: 120.00,
    genericPrice: 35.00,
    description: "Used to lower cholesterol and reduce the risk of heart disease.",
    category: "Statin"
  },
  {
    id: "3",
    brandedName: "Zantac",
    genericName: "Ranitidine",
    composition: "Ranitidine 150mg",
    brandedPrice: 65.00,
    genericPrice: 18.50,
    description: "Used to treat and prevent ulcers in the stomach and intestines.",
    category: "Antacid"
  },
  {
    id: "4",
    brandedName: "Augmentin",
    genericName: "Amoxicillin + Clavulanate",
    composition: "Amoxicillin 500mg + Clavulanic Acid 125mg",
    brandedPrice: 210.00,
    genericPrice: 85.00,
    description: "A combination antibiotic used to treat various bacterial infections.",
    category: "Antibiotic"
  },
  {
    id: "5",
    brandedName: "Ventolin",
    genericName: "Salbutamol",
    composition: "Salbutamol 100mcg Inhaler",
    brandedPrice: 150.00,
    genericPrice: 45.00,
    description: "Used to treat or prevent bronchospasm in people with asthma.",
    category: "Bronchodilator"
  },
  {
    id: "6",
    brandedName: "Glucophage",
    genericName: "Metformin",
    composition: "Metformin 500mg",
    brandedPrice: 35.00,
    genericPrice: 8.00,
    description: "Used to improve blood sugar control in people with type 2 diabetes.",
    category: "Antidiabetic"
  },
  {
    id: "7",
    brandedName: "Advil",
    genericName: "Ibuprofen",
    composition: "Ibuprofen 200mg",
    brandedPrice: 55.00,
    genericPrice: 15.00,
    description: "Nonsteroidal anti-inflammatory drug (NSAID) used for pain and inflammation.",
    category: "NSAID"
  }
];
