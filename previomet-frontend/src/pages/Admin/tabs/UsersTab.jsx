// src/pages/Admin/tabs/UsersTab.jsx
// Onglet Utilisateurs — Dashboard Admin
// Données 100% dynamiques depuis GET /admin/users et GET /admin/stats
// 3 états : chargement | données | erreur
// Recherche polyvalente : nom, domaine, catégorie, ville, date

import { useState, useEffect, useMemo } from "react";
import { getUsers, getStats } from "../../../api/admin";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
    .map((a) => {
      const spec = a.specificite ? ` (${a.specificite})` : "";
      return a.grande_categorie + spec;
    })
    .join(", ");
}

// ─── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={styles.spinnerWrap}>
      <div style={styles.spinner} />
      <p style={styles.spinnerTxt}>Chargement des utilisateurs...</p>
    </div>
  );
}

// ─── Erreur ────────────────────────────────────────────────────────────────────
function ErreurBloc({ message, onRetry }) {
  return (
    <div style={styles.erreurBloc}>
      <span style={{ fontSize: 32 }}>⚠️</span>
      <p style={styles.erreurTxt}>{message}</p>
      <button style={styles.retryBtn} onClick={onRetry}>Réessayer</button>
    </div>
  );
}

// ─── Ligne utilisateur ─────────────────────────────────────────────────────────
function UserRow({ user }) {
  const isAgri = user.role === "agriculteur";
  return (
    <tr>
      <td style={styles.td}>
        <div style={styles.uCell}>
          <div style={styles.uAvatar}>{getInitiales(user.username)}</div>
          <span style={styles.uName}>{user.username}</span>
        </div>
      </td>
      <td style={styles.td}>
        <span style={{ ...styles.domainPill, ...(isAgri ? styles.domainAgri : styles.domainLogi) }}>
          {isAgri ? "Agriculture" : "Logistique"}
        </span>
      </td>
      <td style={{ ...styles.td, ...styles.tdCategories }}>
        {formatCategories(user.activities)}
      </td>
      <td style={styles.td}>
        <span style={styles.villeVal}>{user.ville || "—"}</span>
      </td>
      <td style={{ ...styles.td, ...styles.tdDate }}>
        {formatDate(user.created_at)}
      </td>
    </tr>
  );
}

// ─── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────
export default function UsersTab() {
  const [etat, setEtat]           = useState("chargement");
  const [users, setUsers]         = useState([]);
  const [stats, setStats]         = useState(null);
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
    return users.filter((u) => {
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
  if (etat === "erreur") return <div style={styles.pad}><ErreurBloc message={erreurMsg} onRetry={chargerDonnees} /></div>;

  const totalUsers = stats?.total_users  ?? users.length;
  const nbAgri     = stats?.agriculteurs ?? users.filter((u) => u.role === "agriculteur").length;
  const nbLogi     = stats?.logisticiens ?? users.filter((u) => u.role === "logisticien").length;

  return (
    <div style={styles.pad}>

      {/* ── 3 Cartes stats ── */}
      <div style={styles.statsGrid}>
        {[
          { num: totalUsers, lbl: "Nombre total d'utilisateurs" },
          { num: nbAgri,     lbl: "Agriculteurs" },
          { num: nbLogi,     lbl: "Logisticiens" },
        ].map(({ num, lbl }) => (
          <div key={lbl} style={styles.statCard}>
            <div style={styles.statNum}>{num}</div>
            <div style={styles.statLbl}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Tableau ── */}
      <div style={styles.tableWrap}>
        <div style={styles.topbar}>
          <div style={styles.topbarTitle}>Liste des utilisateurs</div>
          <div style={styles.searchWrap}>
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="#5a7a9a" strokeWidth="1.5"/>
              <path d="M10.5 10.5l3 3" stroke="#5a7a9a" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Rechercher par nom, domaine, ville, date..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              style={styles.searchInput}
            />
            {recherche && (
              <button style={styles.clearBtn} onClick={() => setRecherche("")}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="#5a7a9a" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div style={styles.scrollTable}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                {["Utilisateur","Domaine","Catégories","Ville","Inscription"].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usersFiltres.length === 0 ? (
                <tr>
                  <td colSpan={5} style={styles.tdVide}>
                    {recherche ? `Aucun résultat pour « ${recherche} »` : "Aucun utilisateur enregistré."}
                  </td>
                </tr>
              ) : (
                usersFiltres.map((u) => <UserRow key={u.id} user={u} />)
              )}
            </tbody>
          </table>
        </div>

        {recherche && usersFiltres.length > 0 && (
          <div style={styles.resultCount}>
            {usersFiltres.length} résultat{usersFiltres.length > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const styles = {
  pad: { padding: "24px", flex: 1, overflowY: "auto", background: "#f0f4f8", minHeight: "100%" },

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "22px" },
  statCard:  { background: "#fff", borderRadius: "14px", border: "1px solid rgba(14,76,122,0.12)", padding: "18px", boxShadow: "0 2px 8px rgba(10,26,74,0.07)" },
  statNum:   { fontFamily: "'Syne',sans-serif", fontSize: "28px", fontWeight: "800", color: "#0a1a4a" },
  statLbl:   { fontSize: "12.5px", color: "#5a7a9a", marginTop: "4px", fontWeight: "600" },

  tableWrap:   { background: "#fff", borderRadius: "14px", border: "1px solid rgba(14,76,122,0.12)", boxShadow: "0 2px 8px rgba(10,26,74,0.07)", overflow: "hidden" },
  topbar:      { padding: "16px 20px", borderBottom: "1px solid rgba(14,76,122,0.10)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" },
  topbarTitle: { fontSize: "14px", fontWeight: "700", color: "#0a1a4a" },
  searchWrap:  { display: "flex", alignItems: "center", gap: "9px", padding: "9px 14px", borderRadius: "9px", border: "1.5px solid rgba(14,76,122,0.14)", background: "#f0f4f8", flex: 1, maxWidth: "340px" },
  searchInput: { border: "none", background: "none", fontSize: "13.5px", fontFamily: "'Nunito',sans-serif", outline: "none", color: "#0a1a4a", width: "100%" },
  clearBtn:    { background: "none", border: "none", cursor: "pointer", padding: "0", display: "flex", alignItems: "center", flexShrink: 0 },

  scrollTable: { maxHeight: "340px", overflowY: "auto" },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: "13.5px" },
  theadRow:    { background: "#f8fafd", position: "sticky", top: 0, zIndex: 1 },
  th:          { padding: "10px 16px", textAlign: "left", fontSize: "11.5px", fontWeight: "800", color: "#5a7a9a", textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "1px solid rgba(14,76,122,0.10)" },
  td:          { padding: "13px 16px", borderTop: "1px solid rgba(14,76,122,0.07)", verticalAlign: "middle" },
  tdCategories:{ fontSize: "12.5px", color: "#5a7a9a", maxWidth: "200px" },
  tdDate:      { fontSize: "12.5px", color: "#5a7a9a", whiteSpace: "nowrap" },

  uCell:   { display: "flex", alignItems: "center", gap: "10px" },
  uAvatar: { width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#0a1a4a,#0e7c8a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11.5px", fontWeight: "800", color: "white", flexShrink: 0 },
  uName:   { fontWeight: "700", color: "#0a1a4a", fontSize: "13.5px" },

  domainPill: { fontSize: "11.5px", fontWeight: "700", padding: "4px 11px", borderRadius: "20px", display: "inline-block" },
  domainAgri: { background: "#e8f5ec", color: "#1a7a3a" },
  domainLogi: { background: "#e8f4f8", color: "#0e4f7a" },
  villeVal:   { color: "#0a1a4a", fontWeight: "600", fontSize: "13px" },

  tdVide:      { textAlign: "center", padding: "40px", color: "#5a7a9a", fontSize: "14px", fontStyle: "italic" },
  resultCount: { padding: "10px 20px", fontSize: "12px", color: "#5a7a9a", borderTop: "1px solid rgba(14,76,122,0.08)", fontStyle: "italic" },

  spinnerWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", gap: "16px" },
  spinner:     { width: "40px", height: "40px", border: "4px solid #e8f0f8", borderTop: "4px solid #0e7c8a", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  spinnerTxt:  { color: "#5a7a9a", fontSize: "14px", fontWeight: "600" },

  erreurBloc: { display: "flex", flexDirection: "column", alignItems: "center", padding: "48px", background: "#fff", borderRadius: "14px", border: "1px solid #fdecea", gap: "12px", textAlign: "center" },
  erreurTxt:  { color: "#c0392b", fontSize: "14px", maxWidth: "400px", fontWeight: "600" },
  retryBtn:   { background: "#0a1a4a", color: "white", border: "none", borderRadius: "8px", padding: "10px 22px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "'Nunito',sans-serif", marginTop: "8px" },
};
