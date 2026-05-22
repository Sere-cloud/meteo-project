// src/pages/Admin/tabs/OverviewTab.jsx
// Tableau de bord — Vue d'ensemble pour l'administrateur
// Données depuis GET /admin/stats, GET /admin/users, GET /admin/models

import { useState, useEffect } from "react";
import { getStats, getUsers, getModels } from "../../../api/admin";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function getInitiales(username) {
  if (!username) return "?";
  const parts = username.replace(/_/g, " ").split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.slice(0, 2).toUpperCase();
}

// Durée lisible depuis une date d'entraînement (ex: "24 jours")
function dureeDepuis(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  const jours = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (jours === 0) return "Aujourd'hui";
  if (jours === 1) return "Hier";
  return `${jours} jours`;
}

// Nombre total de modèles depuis metrics.json
const HORIZONS  = ["H3", "H6", "H12", "H24", "J2", "J3", "J4", "J5"];
const VARIABLES = ["temperature", "vent", "precipitation", "humidite"];
function compterModeles(metriques) {
  if (!metriques) return 0;
  let count = 0;
  HORIZONS.forEach(h => {
    if (!metriques[h]) return;
    VARIABLES.forEach(v => { if (metriques[h][v]) count++; });
  });
  return count;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={S.spinnerWrap}>
      <div style={S.spinner} />
      <p style={S.spinnerTxt}>Chargement du tableau de bord...</p>
    </div>
  );
}

// ─── Composant KPI card ───────────────────────────────────────────────────────
function KpiCard({ valeur, label, remarque, remarqueType }) {
  const couleurRemarque = {
    positif: "#1a7a3a",
    neutre:  "#5a7a9a",
    negatif: "#c0392b",
  }[remarqueType || "neutre"];

  return (
    <div style={S.kpiCard}>
      <div style={S.kpiVal}>{valeur}</div>
      <div style={S.kpiLabel}>{label}</div>
      {remarque && (
        <div style={{ ...S.kpiRemarque, color: couleurRemarque }}>
          {remarque}
        </div>
      )}
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────
export default function OverviewTab() {
  const [etat,      setEtat]      = useState("chargement");
  const [stats,     setStats]     = useState(null);
  const [users,     setUsers]     = useState([]);
  const [metriques, setMetriques] = useState(null);
  const [erreurMsg, setErreurMsg] = useState("");

  useEffect(() => { charger(); }, []);

  async function charger() {
    setEtat("chargement");
    setErreurMsg("");
    try {
      const [resStats, resUsers, resMod] = await Promise.all([
        getStats(),
        getUsers(),
        getModels(),
      ]);
      setStats(resStats.data);
      setUsers(resUsers.data);
      setMetriques(resMod.data);
      setEtat("donnees");
    } catch (err) {
      setErreurMsg(
        err?.response?.data?.detail ||
        "Impossible de charger le tableau de bord."
      );
      setEtat("erreur");
    }
  }

  if (etat === "chargement") return <Spinner />;
  if (etat === "erreur") return (
    <div style={S.pad}>
      <div style={S.erreurBloc}>
        <span style={{ fontSize: 32 }}>⚠️</span>
        <p style={S.erreurTxt}>{erreurMsg}</p>
        <button style={S.retryBtn} onClick={charger}>Réessayer</button>
      </div>
    </div>
  );

  // ── Dérivations ─────────────────────────────────────────────
  const totalUsers   = stats?.total_users  ?? users.length;
  const nbAgri       = stats?.agriculteurs ?? 0;
  const nbLogi       = stats?.logisticiens ?? 0;
  const nbVilles     = stats?.nb_villes    ?? 0;
  const nbModeles    = compterModeles(metriques);
  const dateEntr     = metriques?.date_entrainement ?? null;
  const duree        = dureeDepuis(dateEntr);

  // 5 derniers inscrits (déjà triés desc par le backend)
  const derniersInscrits = users.slice(0, 5);

  return (
    <div style={S.pad}>

      {/* ── 4 grandes cartes KPI ── */}
      <div style={S.kpiGrid}>
        <KpiCard
          valeur={totalUsers}
          label="Utilisateurs inscrits"
          remarque={`${nbAgri} agriculteurs · ${nbLogi} logisticiens`}
          remarqueType="neutre"
        />
        <KpiCard
          valeur={nbModeles}
          label="Modèles actifs"
          remarque="XGBoost · 4 variables · 8 horizons"
          remarqueType="neutre"
        />
        <KpiCard
          valeur={nbVilles}
          label="Villes couvertes"
          remarque="Villes distinctes des utilisateurs"
          remarqueType="neutre"
        />
        <KpiCard
          valeur={duree}
          label="Depuis dernier entraînement"
          remarque={dateEntr ? `Effectué le ${dateEntr}` : "Aucun entraînement enregistré"}
          remarqueType={duree === "—" ? "negatif" : "neutre"}
        />
      </div>

      {/* ── Tableau derniers inscrits ── */}
      <div style={S.tableWrap}>
        <div style={S.tableHeader}>
          <span style={S.tableTitre}>Derniers utilisateurs inscrits</span>
        </div>

        <div style={S.scrollTable}>
          <table style={S.table}>
            <thead>
              <tr style={S.theadRow}>
                {["Utilisateur", "Domaine", "Ville", "Inscription"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {derniersInscrits.length === 0 ? (
                <tr>
                  <td colSpan={4} style={S.tdVide}>Aucun utilisateur enregistré.</td>
                </tr>
              ) : derniersInscrits.map(u => {
                const isAgri = u.role === "agriculteur";
                return (
                  <tr key={u.id}>
                    <td style={S.td}>
                      <div style={S.uCell}>
                        <div style={S.uAvatar}>{getInitiales(u.username)}</div>
                        <span style={S.uName}>{u.username}</span>
                      </div>
                    </td>
                    <td style={S.td}>
                      <span style={{
                        ...S.domainPill,
                        ...(isAgri ? S.domainAgri : S.domainLogi),
                      }}>
                        {isAgri ? "Agriculture" : "Logistique"}
                      </span>
                    </td>
                    <td style={{ ...S.td, ...S.tdMuted }}>
                      {u.ville || "—"}
                    </td>
                    <td style={{ ...S.td, ...S.tdMuted }}>
                      {formatDate(u.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  pad: {
    padding: "28px",
    flex: 1,
    overflowY: "auto",
    background: "#f0f4f8",
    minHeight: "100%",
  },

  // KPI grid — 4 grandes cartes
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "28px",
  },
  kpiCard: {
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid rgba(14,76,122,0.12)",
    padding: "28px 24px",
    boxShadow: "0 2px 10px rgba(10,26,74,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  // Grande valeur bien visible
  kpiVal: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "48px",
    fontWeight: "700",
    color: "#0a1a4a",
    lineHeight: 1,
  },
  kpiLabel: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "14px",
    fontWeight: "500",
    color: "#0a1a4a",
    marginTop: "4px",
  },
  kpiRemarque: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "12px",
    fontWeight: "400",
    marginTop: "6px",
  },

  // Tableau
  tableWrap: {
    background: "#fff",
    borderRadius: "14px",
    border: "1px solid rgba(14,76,122,0.12)",
    boxShadow: "0 2px 8px rgba(10,26,74,0.07)",
    overflow: "hidden",
  },
  tableHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid rgba(14,76,122,0.10)",
  },
  tableTitre: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "14px",
    fontWeight: "600",
    color: "#0a1a4a",
  },
  scrollTable: { overflowY: "auto" },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: "13.5px" },
  theadRow:    { background: "#f8fafd" },
  th: {
    padding: "10px 16px",
    textAlign: "left",
    fontSize: "11.5px",
    fontWeight: "600",
    color: "#5a7a9a",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    borderBottom: "1px solid rgba(14,76,122,0.10)",
    fontFamily: "'DM Sans', sans-serif",
  },
  td: {
    padding: "13px 16px",
    borderTop: "1px solid rgba(14,76,122,0.07)",
    verticalAlign: "middle",
  },
  tdMuted: { fontSize: "12.5px", color: "#5a7a9a" },
  tdVide:  { textAlign: "center", padding: "40px", color: "#5a7a9a", fontSize: "14px" },

  uCell:   { display: "flex", alignItems: "center", gap: "10px" },
  uAvatar: {
    width: "32px", height: "32px", borderRadius: "50%",
    background: "linear-gradient(135deg,#0a1a4a,#0e7c8a)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "11.5px", fontWeight: "700", color: "white", flexShrink: 0,
    fontFamily: "'DM Sans', sans-serif",
  },
  uName: {
    fontWeight: "600", color: "#0a1a4a", fontSize: "13.5px",
    fontFamily: "'DM Sans', sans-serif",
  },
  domainPill: {
    fontSize: "11.5px", fontWeight: "600", padding: "4px 11px",
    borderRadius: "20px", display: "inline-block",
    fontFamily: "'DM Sans', sans-serif",
  },
  domainAgri: { background: "#e8f5ec", color: "#1a7a3a" },
  domainLogi: { background: "#e8f4f8", color: "#0e4f7a" },

  spinnerWrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", height: "300px", gap: "16px",
  },
  spinner: {
    width: "40px", height: "40px",
    border: "4px solid #e8f0f8", borderTop: "4px solid #0e7c8a",
    borderRadius: "50%", animation: "spin 0.8s linear infinite",
  },
  spinnerTxt: {
    color: "#5a7a9a", fontSize: "14px", fontWeight: "500",
    fontFamily: "'DM Sans', sans-serif",
  },
  erreurBloc: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "48px", background: "#fff", borderRadius: "14px",
    border: "1px solid #fdecea", gap: "12px", textAlign: "center",
  },
  erreurTxt:  { color: "#c0392b", fontSize: "14px", maxWidth: "400px", fontWeight: "500" },
  retryBtn: {
    background: "#0a1a4a", color: "white", border: "none",
    borderRadius: "8px", padding: "10px 22px", fontSize: "13px",
    fontWeight: "600", cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", marginTop: "8px",
  },
};