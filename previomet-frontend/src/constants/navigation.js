// src/constants/navigation.js

export const NAV_FARMER = [
  { key: 'meteo',           label: 'Prévisions météo',    icon: 'fa-solid fa-cloud-sun-rain'    },
  { key: 'recommandations', label: 'Recommandations',     icon: 'fa-solid fa-lightbulb'         },
  { key: 'profil',          label: 'Mon profil',          icon: 'fa-solid fa-user'              },
  { key: 'calendrier',      label: 'Calendrier cultural', icon: 'fa-solid fa-calendar-days'     },
];

export const NAV_LOGISTICS = [
  { key: 'meteo',           label: 'Prévisions météo',    icon: 'fa-solid fa-cloud-sun-rain'    },
  { key: 'recommandations', label: 'Recommandations',     icon: 'fa-solid fa-lightbulb'         },
  { key: 'profil',          label: 'Mon profil',          icon: 'fa-solid fa-user'              },
];

export const NAV_ADMIN = [
  { key: 'modeles',         label: 'Modèles',             icon: 'fa-solid fa-microchip'         },
  { key: 'utilisateurs',    label: 'Utilisateurs',        icon: 'fa-solid fa-users'             },
  { key: 'villes',          label: 'Villes',              icon: 'fa-solid fa-map-pin'           },
  { key: 'historique',      label: 'Historique',          icon: 'fa-solid fa-clock-rotate-left' },
];

export const TAB_TITLES = {
  meteo:           'Prévisions météo',
  recommandations: 'Recommandations',
  profil:          'Mon profil',
  calendrier:      'Calendrier cultural',
  modeles:         'Modèles ML',
  utilisateurs:    'Utilisateurs',
  villes:          'Villes',
  historique:      'Historique',
};

export const DEFAULT_TAB_FARMER    = 'meteo';
export const DEFAULT_TAB_LOGISTICS = 'meteo';
export const DEFAULT_TAB_ADMIN     = 'modeles';