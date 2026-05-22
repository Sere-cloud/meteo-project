// src/constants/theme.js

export const COLORS = {
  // ── Bleu (base commune, logisticien, admin) ───────────────────────────────
  blueDark:     '#0a1a4a',
  blueMid:      '#0e4f7a',
  teal:         '#0e7c8a',
  blueLight:    '#e8f4f8',
  tealLight:    '#e0f5f7',

  // ── Vert (agriculteur) ────────────────────────────────────────────────────
  greenDark:    '#0D3D2B',   // haut du dégradé sidebar
  greenMid:     '#0B6B45',   // milieu
  greenVivid:   '#00B96B',   // bas du dégradé (émeraude vif)
  greenOk:      '#1a7a3a',   // accent texte / bordures
  greenOkLight: '#e8f5ec',   // fond clair accent

  // ── Neutres & sémantiques ─────────────────────────────────────────────────
  pageBg:       '#f0f4f8',
  cardBg:       '#ffffff',
  white:        '#ffffff',
  textPrimary:  '#0a1a4a',
  textMuted:    '#5a7a9a',
  border:       'rgba(14,76,122,0.12)',
  red:          '#c0392b',
  redLight:     '#fdecea',
  amber:        '#b45309',
  amberLight:   '#fef3c7',
};

// ── Dégradés sidebar par rôle ─────────────────────────────────────────────────
export const SIDEBAR_GRADIENTS = {
  farmer:    'linear-gradient(180deg, #0D3D2B 0%, #0B6B45 55%, #00B96B 100%)',
  logistics: 'linear-gradient(180deg, #0a1a4a 0%, #0e4f7a 55%, #0e7c8a 100%)',
  admin:     'linear-gradient(180deg, #0a1a4a 0%, #0e4f7a 55%, #0e7c8a 100%)',
};

// ── Couleur de fond page par rôle ─────────────────────────────────────────────
// Le contenu principal adopte une très légère teinte du rôle
export const PAGE_BG = {
  farmer:    '#f2f8f5',   // blanc légèrement teinté vert
  logistics: '#f0f4f8',   // blanc légèrement teinté bleu (inchangé)
  admin:     '#f0f4f8',
};

// ── Thèmes par rôle ───────────────────────────────────────────────────────────
export const FARMER_THEME = {
  accentColor:      COLORS.greenOk,
  accentLight:      COLORS.greenOkLight,
  sidebarGradient:  SIDEBAR_GRADIENTS.farmer,
  pageBg:           PAGE_BG.farmer,
  // Couleur de l'avatar topbar
  avatarGradient:   'linear-gradient(135deg, #0D3D2B, #00B96B)',
};

export const LOGISTICS_THEME = {
  accentColor:      COLORS.blueDark,
  accentLight:      COLORS.tealLight,
  sidebarGradient:  SIDEBAR_GRADIENTS.logistics,
  pageBg:           PAGE_BG.logistics,
  avatarGradient:   `linear-gradient(135deg, ${COLORS.blueDark}, ${COLORS.teal})`,
};

export const ADMIN_THEME = {
  accentColor:      COLORS.blueDark,
  accentLight:      COLORS.blueLight,
  sidebarGradient:  SIDEBAR_GRADIENTS.admin,
  pageBg:           PAGE_BG.admin,
  avatarGradient:   `linear-gradient(135deg, ${COLORS.blueDark}, ${COLORS.teal})`,
};

export const ROLE_ACCENT = {
  farmer:    { color: COLORS.greenOk,  colorLight: COLORS.greenOkLight, label: 'Agriculteur' },
  logistics: { color: COLORS.teal,     colorLight: COLORS.tealLight,    label: 'Logisticien' },
};

export const HERO_IMAGE = {
  farmer:    '/images/hero_farmer.jpg',
  logistics: '/images/hero_logistics.jpg',
};

export const SIDEBAR  = { widthOpen: 240, widthClosed: 64, transitionMs: 320 };
export const TOPBAR   = { height: 60 };
export const RADIUS   = { card: '14px', sm: '9px', btn: '9px' };
export const SHADOW   = {
  card: '0 4px 20px rgba(10,26,74,0.10)',
  sm:   '0 2px 8px rgba(10,26,74,0.07)',
};
export const FONTS = {
  body:  "'DM Sans', sans-serif",
  title: "'DM Sans', sans-serif",
  mono:  "'DM Mono', monospace",
};