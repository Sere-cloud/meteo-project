// src/constants/theme.js

export const COLORS = {
  blueDark:     '#0a1a4a',
  blueMid:      '#0e4f7a',
  teal:         '#0e7c8a',
  blueLight:    '#e8f4f8',
  tealLight:    '#e0f5f7',
  sidebarBg:    'linear-gradient(180deg, #0a1a4a 0%, #0e4f7a 55%, #0e7c8a 100%)',
  pageBg:       '#f0f4f8',
  cardBg:       '#ffffff',
  white:        '#ffffff',
  textPrimary:  '#0a1a4a',
  textMuted:    '#5a7a9a',
  border:       'rgba(14,76,122,0.12)',
  red:          '#c0392b',
  redLight:     '#fdecea',
  greenOk:      '#1a7a3a',
  greenOkLight: '#e8f5ec',
  amber:        '#b45309',
  amberLight:   '#fef3c7',
};

export const ROLE_ACCENT = {
  farmer:    { color: COLORS.greenOk,  colorLight: COLORS.greenOkLight, label: 'Agriculteur' },
  logistics: { color: COLORS.teal,     colorLight: COLORS.tealLight,    label: 'Logisticien' },
};

// Aliases directs — utilisés par FarmerDashboard et LogisticsDashboard
export const FARMER_THEME    = { accentColor: COLORS.greenOk,  accentLight: COLORS.greenOkLight };
export const LOGISTICS_THEME = { accentColor: COLORS.teal,     accentLight: COLORS.tealLight    };
export const ADMIN_THEME     = { accentColor: COLORS.blueDark,  accentLight: COLORS.blueLight    };

export const HERO_IMAGE = {
  farmer:    '/images/hero_farmer.jpg',
  logistics: '/images/hero_logistics.jpg',
};

export const SIDEBAR = { widthOpen: 240, widthClosed: 64, transitionMs: 320 };
export const TOPBAR  = { height: 60 };
export const RADIUS  = { card: '14px', sm: '9px', btn: '9px' };
export const SHADOW  = { card: '0 4px 20px rgba(10,26,74,0.10)', sm: '0 2px 8px rgba(10,26,74,0.07)' };
export const FONTS = { body: "'Inter', sans-serif", title: "'Syne', sans-serif" };