// src/constants/navigation.js

import meteoIcon      from '../assets/meteorologie.png';
import adviceIcon     from '../assets/advice.png';
import userIcon       from '../assets/user.png';
import calendarIcon   from '../assets/calendar.png';
import dashboardIcon  from '../assets/dashboard.png';
import modelingIcon   from '../assets/modeling.png';

export const NAV_FARMER = [
  { key: 'meteo',           label: 'Prévisions météo',    icon: 'fa-solid fa-cloud-sun-rain', iconImg: meteoIcon    },
  { key: 'recommandations', label: 'Recommandations',     icon: 'fa-solid fa-lightbulb',      iconImg: adviceIcon   },
  { key: 'profil',          label: 'Mon profil',          icon: 'fa-solid fa-user',           iconImg: userIcon     },
  { key: 'calendrier',      label: 'Calendrier cultural', icon: 'fa-solid fa-calendar-days',  iconImg: calendarIcon },
];

export const NAV_LOGISTICS = [
  { key: 'meteo',           label: 'Prévisions météo',    icon: 'fa-solid fa-cloud-sun-rain', iconImg: meteoIcon  },
  { key: 'recommandations', label: 'Recommandations',     icon: 'fa-solid fa-lightbulb',      iconImg: adviceIcon },
  { key: 'profil',          label: 'Mon profil',          icon: 'fa-solid fa-user',           iconImg: userIcon   },
];

export const NAV_ADMIN = [
  { key: 'tableau_de_bord', label: 'Tableau de bord',  icon: 'fa-solid fa-gauge-high',     iconImg: dashboardIcon },
  { key: 'meteo',           label: 'Prévisions météo', icon: 'fa-solid fa-cloud-sun-rain', iconImg: meteoIcon     },
  { key: 'modeles',         label: 'Modèles',          icon: 'fa-solid fa-microchip',      iconImg: modelingIcon  },
  { key: 'utilisateurs',    label: 'Utilisateurs',     icon: 'fa-solid fa-users',          iconImg: userIcon      },
];

export const TAB_TITLES = {
  tableau_de_bord: 'Tableau de bord',
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
export const DEFAULT_TAB_ADMIN     = 'tableau_de_bord';