// src/pages/Admin/tabs/UsersTab.jsx

import { useState, useEffect, useMemo } from "react";
import { getUsers, getStats } from "../../../api/admin";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatDerniereConnexion(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  const diffMs  = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);
  const diffJ   = Math.floor(diffMs / 86400000);
  if (diffMin < 1)   return "À l'instant";
  if (diffMin < 60)  return `Il y a ${diffMin} min`;
  if (diffH   < 24)  return `Il y a ${diffH}h`;
  if (diffJ   === 1) return "Hier";
  if (diffJ   < 7)   return `Il y a ${diffJ} jours`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function getStatutConnexion(lastLoginStr) {
  if (!lastLoginStr) return { label: "Jamais connecté", bg: "#f1f5f9", color: "#64748b" };
  const diffJ = Math.floor((Date.now() - new Date(lastLoginStr).getTime()) / 86400000);
  if (diffJ <= 1) return { label: "Actif",   bg: "#e8f5ec", color: "#1a7a3a" };
  if (diffJ <= 7) return { label: "Inactif", bg: "#fef3c7", color: "#b45309" };
  return              { label: "Dormant",    bg: "#fdecea", color: "#c0392b" };
}

function getInitiales(username) {
  if (!username) return "?";
  const parts = username.replace(/_/g, " ").split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.slice(0, 2).toUpperCase();
}

function formatCategories(activities) {
  if (!activities || activities.length === 0) return "—";
  return activities
    .map(a => a.grande_categorie + (a.specificite ? ` (${a.specificite})` : ""))
    .join(", ");
}

// ─── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={S.spinnerWrap}>
      <div style={S.spinner} />
      <p style={S.spinnerTxt}>Chargement des utilisateurs...</p>
    </div>
  );
}

// ─── Erreur ────────────────────────────────────────────────────────────────────
function ErreurBloc({ message, onRetry }) {
  return (
    <div style={S.erreurBloc}>
      <span style={{ fontSize: 32 }}>⚠️</span>
      <p style={S.erreurTxt}>{message}</p>
      <button style={S.retryBtn} onClick={onRetry}>Réessayer</button>
    </div>
  );
}

// ─── Ligne utilisateur ─────────────────────────────────────────────────────────
function UserRow({ user }) {
  const isAgri = user.role === "agriculteur";
  const statut = getStatutConnexion(user.last_login);

  return (
    <tr>
      {/* Utilisateur */}
      <td style={S.td}>
        <div style={S.uCell}>
          <div style={S.uAvatar}>{getInitiales(user.username)}</div>
          <span style={S.uName}>{user.username}</span>
        </div>
      </td>

      {/* Domaine */}
      <td style={S.td}>
        <span style={{ ...S.domainPill, ...(isAgri ? S.domainAgri : S.domainLogi) }}>
          {isAgri ? "Agriculture" : "Logistique"}
        </span>
      </td>

      {/* Catégories */}
      <td style={{ ...S.td, ...S.tdCategories }}>
        {formatCategories(user.activities)}
      </td>

      {/* Ville */}
      <td style={S.td}>
        <span style={S.villeVal}>{user.ville || "—"}</span>
      </td>

      {/* Inscription */}
      <td style={{ ...S.td, ...S.tdDate }}>
        {formatDate(user.created_at)}
      </td>

      {/* ✅ Dernière connexion */}
      <td style={{ ...S.td, ...S.tdDate }}>
        {formatDerniereConnexion(user.last_login)}
      </td>

      {/* ✅ Statut */}
      <td style={S.td}>
        <span style={{
          ...S.statutPill,
          background: statut.bg,
          color:      statut.color,
        }}>
          {statut.label}
        </span>
      </td>
    </tr>
  );
}

// ─── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────
export default function UsersTab() {
  const [etat,      setEtat]      = useState("chargement");
  const [users,     setUsers]     = useState([]);
  const [stats,     setStats]     = useState(null);
  const [erreurMsg, setErreurMsg] = useState("");
  const [recherche, setRecherche] = useState("");

  useEffect(() => { chargerDonnees(); }, []);

  async function chargerDonnees() {
    setEtat("chargement");
    setErreurMsg("");
    try {
      const [resUsers, resStats] = await Promise.all([getUsers(), getStats()]);
      setUsers(resUsers.data);
      setStats(resStats.data);
      setEtat("donnees");
    } catch (err) {
      setErreurMsg(
        err?.response?.data?.detail ||
        "Impossible de charger les utilisateurs. Vérifiez que le backend est démarré."
      );
      setEtat("erreur");
    }
  }

  const usersFiltres = useMemo(() => {
    if (!recherche.trim()) return users;
    const q = recherche.trim().toLowerCase();
    return users.filter(u => {
      const domStr = u.role === "agriculteur" ? "agriculture" : "logistique";
      const catStr = formatCategories(u.activities).toLowerCase();
      return (
        u.username?.toLowerCase().includes(q) ||
        domStr.includes(q) ||
        u.ville?.toLowerCase().includes(q) ||
        formatDate(u.created_at).toLowerCase().includes(q) ||
        catStr.includes(q)
      );
    });
  }, [users, recherche]);

  if (etat === "chargement") return <Spinner />;
  if (etat === "erreur") return (
    <div style={S.pad}>
      <ErreurBloc message={erreurMsg} onRetry={chargerDonnees} />
    </div>
  );

  const totalUsers = stats?.total_users  ?? users.length;
  const nbAgri     = stats?.agriculteurs ?? users.filter(u => u.role === "agriculteur").length;
  const nbLogi     = stats?.logisticiens ?? users.filter(u => u.role === "logisticien").length;

  return (
    <div style={S.pad}>

      {/* ── 3 cartes stats avec remarques ── */}
      <div style={S.statsGrid}>
        {[
          {
            num:     totalUsers,
            lbl:     "Nombre total d'utilisateurs",
            remarque: `${nbAgri} agriculteurs · ${nbLogi} logisticiens`,
          },
          {
            num:     nbAgri,
            lbl:     "Agriculteurs",
            remarque: totalUsers > 0
              ? `${Math.round((nbAgri / totalUsers) * 100)}% des utilisateurs`
              : "—",
          },
          {
            num:     nbLogi,
            lbl:     "Logisticiens",
            remarque: totalUsers > 0
              ? `${Math.round((nbLogi / totalUsers) * 100)}% des utilisateurs`
              : "—",
          },
        ].map(({ num, lbl, remarque }) => (
          <div key={lbl} style={S.statCard}>
            <div style={S.statNum}>{num}</div>
            <div style={S.statLbl}>{lbl}</div>
            <div style={S.statRemarque}>{remarque}</div>
          </div>
        ))}
      </div>

      {/* ── Tableau ── */}
      <div style={S.tableWrap}>
        <div style={S.topbar}>
          <div style={S.topbarTitle}>Liste des utilisateurs</div>
          <div style={S.searchWrap}>
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="#5a7a9a" strokeWidth="1.5"/>
              <path d="M10.5 10.5l3 3" stroke="#5a7a9a" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Rechercher par nom, domaine, ville..."
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              style={S.searchInput}
            />
            {recherche && (
              <button style={S.clearBtn} onClick={() => setRecherche("")}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="#5a7a9a" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div style={S.scrollTable}>
          <table style={S.table}>
            <thead>
              <tr style={S.theadRow}>
                {[
                  "Utilisateur",
                  "Domaine",
                  "Catégories",
                  "Ville",
                  "Inscription",
                  "Dernière connexion",
                  "Statut",
                ].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usersFiltres.length === 0 ? (
                <tr>
                  <td colSpan={7} style={S.tdVide}>
                    {recherche
                      ? `Aucun résultat pour « ${recherche} »`
                      : "Aucun utilisateur enregistré."}
                  </td>
                </tr>
              ) : (
                usersFiltres.map(u => <UserRow key={u.id} user={u} />)
              )}
            </tbody>
          </table>
        </div>

        {recherche && usersFiltres.length > 0 && (
          <div style={S.resultCount}>
            {usersFiltres.length} résultat{usersFiltres.length > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const S = {
  pad: {
    padding: "24px", flex: 1, overflowY: "auto",
    background: "#f0f4f8", minHeight: "100%",
  },

  statsGrid: {
    display: "grid", gridTemplateColumns: "repeat(3,1fr)",
    gap: "14px", marginBottom: "22px",
  },
  statCard: {
    background: "#fff", borderRadius: "14px",
    border: "1px solid rgba(14,76,122,0.12)",
    padding: "20px 22px",
    boxShadow: "0 2px 8px rgba(10,26,74,0.07)",
  },
  statNum: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "36px", fontWeight: "700", color: "#0a1a4a",
  },
  statLbl: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "13px", color: "#0a1a4a",
    marginTop: "4px", fontWeight: "500",
  },
  statRemarque: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "12px", color: "#5a7a9a",
    marginTop: "6px", fontWeight: "400",
  },

  tableWrap: {
    background: "#fff", borderRadius: "14px",
    border: "1px solid rgba(14,76,122,0.12)",
    boxShadow: "0 2px 8px rgba(10,26,74,0.07)",
    overflow: "hidden",
  },
  topbar: {
    padding: "16px 20px",
    borderBottom: "1px solid rgba(14,76,122,0.10)",
    display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: "16px",
  },
  topbarTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "14px", fontWeight: "600", color: "#0a1a4a",
  },
  searchWrap: {
    display: "flex", alignItems: "center", gap: "9px",
    padding: "9px 14px", borderRadius: "9px",
    border: "1.5px solid rgba(14,76,122,0.14)",
    background: "#f0f4f8", flex: 1, maxWidth: "340px",
  },
  searchInput: {
    border: "none", background: "none",
    fontSize: "13px", fontFamily: "'DM Sans', sans-serif",
    outline: "none", color: "#0a1a4a", width: "100%",
  },
  clearBtn: {
    background: "none", border: "none", cursor: "pointer",
    padding: 0, display: "flex", alignItems: "center", flexShrink: 0,
  },

  // Table — scroll horizontal activé pour les 7 colonnes
  scrollTable: { overflowX: "auto", overflowY: "auto", maxHeight: "420px" },
  table: {
    width: "100%", borderCollapse: "collapse",
    fontSize: "13px", minWidth: "900px",
  },
  theadRow: {
    background: "#f8fafd", position: "sticky", top: 0, zIndex: 1,
  },
  th: {
    padding: "10px 14px", textAlign: "left",
    fontSize: "11px", fontWeight: "600", color: "#5a7a9a",
    textTransform: "uppercase", letterSpacing: "0.4px",
    borderBottom: "1px solid rgba(14,76,122,0.10)",
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px 14px",
    borderTop: "1px solid rgba(14,76,122,0.07)",
    verticalAlign: "middle",
  },
  tdCategories: {
    fontSize: "12px", color: "#5a7a9a", maxWidth: "180px",
  },
  tdDate: {
    fontSize: "12px", color: "#5a7a9a", whiteSpace: "nowrap",
  },
  tdVide: {
    textAlign: "center", padding: "40px",
    color: "#5a7a9a", fontSize: "14px", fontStyle: "italic",
  },

  uCell:   { display: "flex", alignItems: "center", gap: "10px" },
  uAvatar: {
    width: "32px", height: "32px", borderRadius: "50%",
    background: "linear-gradient(135deg,#0a1a4a,#0e7c8a)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "11.5px", fontWeight: "700", color: "white", flexShrink: 0,
    fontFamily: "'DM Sans', sans-serif",
  },
  uName: {
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: "600", color: "#0a1a4a", fontSize: "13px",
  },

  domainPill: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "11.5px", fontWeight: "600",
    padding: "4px 11px", borderRadius: "20px", display: "inline-block",
  },
  domainAgri: { background: "#e8f5ec", color: "#1a7a3a" },
  domainLogi: { background: "#e8f4f8", color: "#0e4f7a" },

  villeVal: {
    fontFamily: "'DM Sans', sans-serif",
    color: "#0a1a4a", fontWeight: "500", fontSize: "13px",
  },

  // ✅ Badge statut
  statutPill: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "11.5px", fontWeight: "600",
    padding: "4px 11px", borderRadius: "20px",
    display: "inline-block", whiteSpace: "nowrap",
  },

  resultCount: {
    padding: "10px 20px", fontSize: "12px", color: "#5a7a9a",
    borderTop: "1px solid rgba(14,76,122,0.08)", fontStyle: "italic",
    fontFamily: "'DM Sans', sans-serif",
  },

  spinnerWrap: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    height: "300px", gap: "16px",
  },
  spinner: {
    width: "40px", height: "40px",
    border: "4px solid #e8f0f8", borderTop: "4px solid #0e7c8a",
    borderRadius: "50%", animation: "spin 0.8s linear infinite",
  },
  spinnerTxt: {
    fontFamily: "'DM Sans', sans-serif",
    color: "#5a7a9a", fontSize: "14px", fontWeight: "500",
  },

  erreurBloc: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "48px", background: "#fff", borderRadius: "14px",
    border: "1px solid #fdecea", gap: "12px", textAlign: "center",
  },
  erreurTxt: {
    color: "#c0392b", fontSize: "14px", maxWidth: "400px",
    fontFamily: "'DM Sans', sans-serif",
  },
  retryBtn: {
    background: "#0a1a4a", color: "white", border: "none",
    borderRadius: "8px", padding: "10px 22px",
    fontSize: "13px", fontWeight: "600", cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", marginTop: "8px",
  },
};