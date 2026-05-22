// src/data.js
// Source unique de vérité pour les villes, catégories et spécificités.

// ── VILLES (miroir de ml/villes.py) ─────────────────────────────
export const VILLES = [
  'Douala', 'Yaoundé', 'Bafoussam', 'Garoua', 'Bamenda',
  'Ngaoundéré', 'Bertoua', 'Ebolowa', 'Buea', 'Maroua',
];

// ── CATÉGORIES PAR RÔLE ──────────────────────────────────────────
export const CATEGORIES = {

  agriculteur: [
    { id: 'cultures_rente',      label: "Cultures d'exportation (rente)", icon: '☕' },
    { id: 'cereales_tubercules', label: 'Céréales et tubercules vivriers', icon: '🌽' },
    { id: 'fruits_tropicaux',    label: 'Fruits tropicaux',                icon: '🍌' },
    { id: 'maraichage',          label: 'Maraîchage (légumes)',             icon: '🥬' },
    { id: 'legumineuses',        label: 'Légumineuses et oléagineux',       icon: '🫘' },
    { id: 'saison_froide',       label: 'Cultures de saison froide',        icon: '🌿' },
    { id: 'perennes',            label: 'Cultures pérennes forestières',    icon: '🌳' },
  ],

  logisticien: [
    { id: 'perissables',      label: 'Transport produits périssables',   icon: '🍅' },
    { id: 'sanitaire',        label: 'Transport sanitaire & pharma',     icon: '💊' },
    { id: 'agricoles_bruts',  label: 'Transport produits agricoles',     icon: '🌾' },
    { id: 'construction',     label: 'Transport matériaux construction', icon: '🏗'  },
    { id: 'carburant',        label: 'Distribution carburant & énergie', icon: '⛽' },
    { id: 'ecommerce',        label: 'Livraison e-commerce & colis',     icon: '📦' },
    { id: 'betail',           label: 'Transport de bétail vivant',       icon: '🐄' },
    { id: 'industriel',       label: 'Approvisionnement industriel',     icon: '🏭' },
  ],
};

// ── SPÉCIFICITÉS PAR CATÉGORIE AGRICOLE ─────────────────────────
export const SPECIFICITES = {

  cultures_rente: [
    'Cacao', 'Café robusta', 'Café arabica',
    'Hévéa (caoutchouc)', 'Coton', 'Palmier à huile', 'Thé',
  ],

  cereales_tubercules: [
    'Maïs', 'Sorgho', 'Mil', 'Riz',
    'Manioc', 'Macabo', 'Taro', 'Igname', 'Patate douce',
  ],

  fruits_tropicaux: [
    'Banane plantain', 'Banane douce', 'Ananas', 'Mangue',
    'Papaye', 'Avocat', 'Goyave', 'Agrumes (citron, orange, mandarine, pamplemousse...)',
  ],

  maraichage: [
    'Tomate', 'Poivron', 'Piment', 'Oignon', 'Ail',
    'Chou', 'Laitue', 'Concombre', 'Haricot vert', 'Gombo', 'Aubergine',
  ],

  legumineuses: [
    'Arachide', 'Soja', 'Niébé (haricot)', 'Voandzou', 'Tournesol',
  ],

  saison_froide: [
    'Carotte', 'Pomme de terre', 'Poireau',
    'Céleri', 'Persil', 'Épinard',
  ],

  perennes: [
    'Palmier à huile', 'Hévéa', 'Kolatier',
    'Safoutier', 'Moringa', 'Bananiers',
  ],
};