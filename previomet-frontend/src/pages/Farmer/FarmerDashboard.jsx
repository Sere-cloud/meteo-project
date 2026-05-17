// ============================================================
// FarmerDashboard.jsx  —  Fichier 10/12
// Dashboard principal de l'agriculteur.
//
// Rôle : orchestrateur léger.
//   - Définit les 4 onglets agriculteur (depuis navigation.js)
//   - Monte DashboardLayout avec la Sidebar et la topbar
//   - Rend l'onglet actif en passant les bonnes props
//   - Passe accentColor/accentLight agriculteur à tous les onglets
//   - Gère le toggle mode sombre (état remonté ici, propagé via CSS vars)
//   - Gère la déconnexion (logout AuthContext → /login, sans modal)
//
// Architecture :
//   FarmerDashboard
//     └── DashboardLayout  (sidebar + topbar + zone contenu)
//           ├── Sidebar    (reçoit navItems = NAV_FARMER)
//           └── [onglet actif selon activeTab]
//                 ├── WeatherTab         (Shared)
//                 ├── RecommendationsTab (Shared)
//                 ├── ProfileTab         (Shared)
//                 └── CalendarTab        (Farmer exclusif)
//
// Aucun hardcode : toutes les données viennent du backend
// ou de AuthContext. Les labels/icônes viennent de navigation.js.
// ============================================================

import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate }       from 'react-router-dom';
import { AuthContext }       from '../../context/AuthContext';
import { NAV_FARMER }        from '../../constants/navigation';
import { FARMER_THEME }      from '../../constants/theme';

// Composants partagés
import DashboardLayout       from '../Shared/DashboardLayout';

// Onglets communs
import WeatherTab            from '../Shared/tabs/WeatherTab';
import RecommendationsTab    from '../Shared/tabs/RecommendationsTab';
import ProfileTab            from '../Shared/tabs/ProfileTab';

// Onglet exclusif agriculteur
import CalendarTab           from './tabs/CalendarTab';

// ── Couleurs spécifiques agriculteur ─────────────────────────
const ACCENT       = FARMER_THEME?.accentColor  ?? '#1a7a3a';
const ACCENT_LIGHT = FARMER_THEME?.accentLight  ?? '#e8f5ec';

// ── Image hero WeatherTab agriculteur ────────────────────────
// Importer l'image réelle dans le projet : import heroAgri from '../../assets/agri_hero.jpg'
// On utilise une URL de fallback si l'import n'est pas encore en place.
let HERO_IMAGE;
try {
  // En production remplacer par : import heroAgri from '../../assets/agri_hero.jpg'
  // eslint-disable-next-line
  HERO_IMAGE = new URL('../../assets/agri_hero.jpg', import.meta.url).href;
} catch {
  HERO_IMAGE = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80';
}

// ── Composant principal ───────────────────────────────────────
export default function FarmerDashboard() {
  const navigate          = useNavigate();
  const { user, logout }  = useContext(AuthContext);

  // ── Onglet actif ────────────────────────────────────────────
  // Clé initiale = première entrée de NAV_FARMER
  const [activeTab, setActiveTab] = useState(NAV_FARMER[0]?.key ?? 'meteo');

  // ── Mode sombre ─────────────────────────────────────────────
  // Persisté en localStorage, propagé via CSS variables sur le conteneur racine
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('pm_dark') === '1'; }
    catch { return false; }
  });

  // Ref sur le div racine pour injecter les CSS variables --pm-*
  const rootRef = useRef(null);

  // Injecte les variables CSS du thème à chaque changement de mode
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (isDark) {
      el.style.setProperty('--pm-bg',      '#0e1422');
      el.style.setProperty('--pm-card',    '#1a2235');
      el.style.setProperty('--pm-text',    '#e8edf8');
      el.style.setProperty('--pm-muted',   '#7a94b8');
      el.style.setProperty('--pm-surface', '#222d42');
      el.style.setProperty('--pm-border',  'rgba(255,255,255,0.08)');
    } else {
      el.style.setProperty('--pm-bg',      '#f0f4f8');
      el.style.setProperty('--pm-card',    '#ffffff');
      el.style.setProperty('--pm-text',    '#0a1a4a');
      el.style.setProperty('--pm-muted',   '#5a7a9a');
      el.style.setProperty('--pm-surface', '#f8fafc');
      el.style.setProperty('--pm-border',  'rgba(14,76,122,0.12)');
    }
  }, [isDark]);

  // Persist dark mode
  function handleToggleDark() {
    const next = !isDark;
    setIsDark(next);
    try { localStorage.setItem('pm_dark', next ? '1' : '0'); } catch {}
  }

  // ── Déconnexion ─────────────────────────────────────────────
  // Vide le localStorage via AuthContext.logout → redirige /login sans modal
  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  // ── Rendu de l'onglet actif ─────────────────────────────────
  function renderTab() {
    switch (activeTab) {
      case 'meteo':
        return (
          <WeatherTab
            heroImage    ={HERO_IMAGE}
            accentColor  ={ACCENT}
            accentLight  ={ACCENT_LIGHT}
          />
        );

      case 'recommandations':
        return (
          <RecommendationsTab
            accentColor  ={ACCENT}
            accentLight  ={ACCENT_LIGHT}
          />
        );

      case 'profil':
        return (
          <ProfileTab
            accentColor  ={ACCENT}
            accentLight  ={ACCENT_LIGHT}
            showSpecs    ={true}   // agriculteur = catégories + spécificités
          />
        );

      case 'calendrier':
        return (
          <CalendarTab
            accentColor  ={ACCENT}
            accentLight  ={ACCENT_LIGHT}
          />
        );

      default:
        return null;
    }
  }

  // ── Titre de l'onglet actif pour la topbar ──────────────────
  const activeLabel = NAV_FARMER.find((n) => n.key === activeTab)?.label ?? '';

  // ── Rendu ──────────────────────────────────────────────────
  return (
    <div ref={rootRef} style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DashboardLayout
        /* Navigation */
        navItems      ={NAV_FARMER}
        activeTab     ={activeTab}
        onTabChange   ={setActiveTab}

        /* Topbar */
        pageTitle     ={activeLabel}

        /* Mode sombre */
        isDark        ={isDark}
        onToggleDark  ={handleToggleDark}

        /* Déconnexion */
        onLogout      ={handleLogout}

        /* Identité utilisateur (topbar droite) */
        username      ={user?.username ?? ''}
        role          ="Agriculteur"
      >
        {/* Zone contenu : onglet actif */}
        {renderTab()}
      </DashboardLayout>
    </div>
  );
}
