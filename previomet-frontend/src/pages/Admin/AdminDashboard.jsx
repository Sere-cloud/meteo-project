// src/pages/Admin/AdminDashboard.jsx
// Dashboard Administrateur — PrevioMet
// Sidebar rétractable + 4 onglets : Modèles · Utilisateurs · Villes · Historique
// Conforme à l'aperçu de référence (previomet_apercu.html)
// Déconnexion → redirection directe vers /login

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ModelsTab   from "./tabs/ModelsTab";
import UsersTab    from "./tabs/UsersTab";
import CitiesTab   from "./tabs/CitiesTab";
import HistoryTab  from "./tabs/HistoryTab";

// ─── Configuration des onglets ────────────────────────────────────────────────
const TABS = [
  {
    key: "modeles",
    label: "Modèles",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    key: "utilisateurs",
    label: "Utilisateurs",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 17c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: "villes",
    label: "Villes",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2C6.2 2 4 4.2 4 7c0 4.5 5 9 5 9s5-4.5 5-9c0-2.8-2.2-5-5-5z"
          stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <circle cx="9" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
  },
  {
    key: "historique",
    label: "Historique",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 5v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

// Titres de la topbar selon l'onglet actif
const TOPBAR_TITRES = {
  modeles:       "Modèles ML",
  utilisateurs:  "Utilisateurs",
  villes:        "Villes",
  historique:    "Historique",
};

// ─── Composant Sidebar ────────────────────────────────────────────────────────
function Sidebar({ ongletActif, setOngletActif, sidebarOuverte, setSidebarOuverte, onDeconnexion }) {
  return (
    <aside style={{
      ...styles.sidebar,
      width: sidebarOuverte ? "240px" : "64px",
      minWidth: sidebarOuverte ? "240px" : "64px",
    }}>

      {/* En-tête : hamburger + logo */}
      <div style={styles.sbHeader}>
        <button
          style={styles.hamburger}
          onClick={() => setSidebarOuverte(!sidebarOuverte)}
          title={sidebarOuverte ? "Réduire" : "Ouvrir"}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 4h14M2 9h14M2 14h14" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
        {sidebarOuverte && (
          <div style={styles.logoWrap}>
            {/* Icône SVG nuage + signal */}
            <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
              <path d="M21.5 19H7.5a5.5 5.5 0 0 1-1.1-10.9A7 7 0 0 1 20 10.5a4.5 4.5 0 0 1 1.5 8.5z"
                fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth="1.3"/>
              <path d="M11 8c1-1.5 3-1.5 4 0" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M9 5.5c2-3 7-3 9 0" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <span style={styles.logoText}>PrevioMet</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={styles.sbNav}>
        {TABS.map((tab) => {
          const actif = ongletActif === tab.key;
          return (
            <button
              key={tab.key}
              style={{
                ...styles.navItem,
                ...(actif ? styles.navItemActif : {}),
              }}
              onClick={() => setOngletActif(tab.key)}
              title={!sidebarOuverte ? tab.label : undefined}
            >
              <span style={{ ...styles.navIcon, color: actif ? "white" : "rgba(255,255,255,0.7)" }}>
                {tab.icon}
              </span>
              {sidebarOuverte && (
                <span style={{ ...styles.navLabel, color: actif ? "white" : "rgba(255,255,255,0.75)" }}>
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Pied : déconnexion */}
      <div style={styles.sbFooter}>
        <button
          style={styles.deconnexionBtn}
          onClick={onDeconnexion}
          title="Déconnexion"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 9H3m4-3l-4 3 4 3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 4H14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H7" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {sidebarOuverte && (
            <span style={{ ...styles.navLabel, color: "rgba(255,255,255,0.65)" }}>
              Déconnexion
            </span>
          )}
        </button>
      </div>

    </aside>
  );
}

// ─── Composant Topbar ─────────────────────────────────────────────────────────
function Topbar({ ongletActif, username }) {
  const [heure, setHeure] = useState(() => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;
  });

  // Mise à jour de l'heure chaque minute
  useState(() => {
    const id = setInterval(() => {
      const n = new Date();
      setHeure(`${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`);
    }, 60000);
    return () => clearInterval(id);
  });

  return (
    <div style={styles.topbar}>
      <div style={styles.topbarTitle}>{TOPBAR_TITRES[ongletActif]}</div>
      <div style={styles.topbarRight}>
        <span style={styles.topbarBadge}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="5" r="2.5" stroke="#5a7a9a" strokeWidth="1.3"/>
            <path d="M1.5 12c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="#5a7a9a" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {username || "Admin"}
        </span>
        <span style={styles.topbarSep}>|</span>
        <span style={styles.topbarHeure}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="5.5" stroke="#5a7a9a" strokeWidth="1.3"/>
            <path d="M6.5 3.5V7l2 1.5" stroke="#5a7a9a" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {heure}
        </span>
      </div>
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout, username } = useAuth();

  const [ongletActif, setOngletActif]       = useState("modeles");
  const [sidebarOuverte, setSidebarOuverte] = useState(true);

  function handleDeconnexion() {
    logout();
    navigate("/login", { replace: true });
  }

  // Rendu de l'onglet actif
  function renderOnglet() {
    switch (ongletActif) {
      case "modeles":      return <ModelsTab />;
      case "utilisateurs": return <UsersTab />;
      case "villes":       return <CitiesTab />;
      case "historique":   return <HistoryTab />;
      default:             return <ModelsTab />;
    }
  }

  return (
    <div style={styles.app}>

      {/* Sidebar */}
      <Sidebar
        ongletActif={ongletActif}
        setOngletActif={setOngletActif}
        sidebarOuverte={sidebarOuverte}
        setSidebarOuverte={setSidebarOuverte}
        onDeconnexion={handleDeconnexion}
      />

      {/* Zone principale */}
      <div style={styles.main}>
        <Topbar ongletActif={ongletActif} username={username} />
        <div style={styles.content}>
          {renderOnglet()}
        </div>
      </div>

    </div>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const styles = {
  app: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
    fontFamily: "'Nunito', sans-serif",
    background: "#f0f4f8",
  },

  // Sidebar
  sidebar: {
    background: "linear-gradient(180deg, #0a1a4a 0%, #0e4f7a 55%, #0e7c8a 100%)",
    display: "flex",
    flexDirection: "column",
    transition: "width 0.32s cubic-bezier(0.4,0,0.2,1), min-width 0.32s",
    overflow: "hidden",
    position: "relative",
    zIndex: 20,
    flexShrink: 0,
  },
  sbHeader: {
    padding: "18px 12px",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    minHeight: "70px",
    flexShrink: 0,
  },
  hamburger: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.18)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "background 0.2s",
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    whiteSpace: "nowrap",
    overflow: "hidden",
  },
  logoText: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: "800",
    fontSize: "19px",
    color: "white",
    letterSpacing: "-0.3px",
  },
  sbNav: {
    flex: 1,
    padding: "12px 8px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    overflowY: "auto",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "10px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.2s",
    width: "100%",
    whiteSpace: "nowrap",
  },
  navItemActif: {
    background: "rgba(255,255,255,0.18)",
  },
  navIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  navLabel: {
    fontSize: "14px",
    fontWeight: "600",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  sbFooter: {
    padding: "12px 8px",
    borderTop: "1px solid rgba(255,255,255,0.1)",
    flexShrink: 0,
  },
  deconnexionBtn: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "10px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    width: "100%",
    transition: "background 0.2s",
    whiteSpace: "nowrap",
  },

  // Zone principale
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  topbar: {
    height: "58px",
    background: "white",
    borderBottom: "1px solid rgba(14,76,122,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    flexShrink: 0,
    boxShadow: "0 2px 8px rgba(10,26,74,0.05)",
  },
  topbarTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: "17px",
    fontWeight: "700",
    color: "#0a1a4a",
  },
  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "13px",
    color: "#5a7a9a",
  },
  topbarBadge: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontWeight: "600",
  },
  topbarSep: {
    color: "rgba(14,76,122,0.2)",
  },
  topbarHeure: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  content: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
};
