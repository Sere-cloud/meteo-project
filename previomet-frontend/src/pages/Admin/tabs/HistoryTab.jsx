// src/pages/Admin/tabs/HistoryTab.jsx
// Onglet Historique — Dashboard Admin
// Données 100% dynamiques depuis GET /admin/stats et GET /admin/logs
// 3 états : chargement | données | erreur
// 4 cartes stats : Utilisateurs actifs · Villes couvertes · Précision modèle actif · Entraînements ce mois
// Journal : Date · Action · Détail

import { useState, useEffect } from "react";
import { getStats, getLogs } from "../../../api/admin";
import { getModels } from "../../../api/admin";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Formater date ISO en "19 Avr. 2026, 14:32"
const MOIS = ["Jan.","Fév.","Mar.","Avr.","Mai","Juin","Juil.","Août","Sep.","Oct.","Nov.","Déc."];
function formatDateHeure(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return "—";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
  } catch { return "—"; }
}

// Dériver le label d'action depuis le champ "type" des logs
// type peut être : "temperature" | "vent" | "precipitation" | "humidite" | "connexion" | etc.
// On essaie d'inférer un libellé lisible
function labelAction(log) {
  const t = (log.type || "").toLowerCase();
  if (t === "connexion" || t === "login")           return "Connexion utilisateur";
  if (t === "inscription" || t === "register")       return "Inscription utilisateur";
  if (t === "entrainement" || t === "train")         return "Entraînement modèle";
  if (t === "recommandation" || t === "recommendation") return "Recommandation générée";
  if (t === "profil" || t === "update_profile")      return "Mise à jour profil";
  // Fallback : on retourne le titre du log si disponible, sinon le type
  return log.titre || log.type || "Activité";
}

// Construire le "Détail" lisible depuis les champs du log
function buildDetail(log) {
  const parts = [];
  if (log.culture)  parts.push(log.culture);
  if (log.horizon)  parts.push(log.horizon);
  if (log.detail)   return log.detail; // priorité au champ detail s'il est renseigné
  return parts.join(" · ") || "—";
}

// Icône selon le type d'action
function IconeAction({ type }) {
  const t = (type || "").toLowerCase();
  if (t === "entrainement" || t === "train") {
    return (
      <div style={{ ...styles.iconWrap, background: "#e0f5f7" }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 2l8 5-8 5V2z" fill="#0e7c8a"/>
        </svg>
      </div>
    );
  }
  if (t === "connexion" || t === "login") {
    return (
      <div style={{ ...styles.iconWrap, background: "#e8f0f8" }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 7H2m5-3l3 3-3 3" stroke="#0a3a6a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }
  if (t === "inscription" || t === "register") {
    return (
      <div style={{ ...styles.iconWrap, background: "#e8f5ec" }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="5" r="2.5" stroke="#1a5a2a" strokeWidth="1.4"/>
          <path d="M2 12c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="#1a5a2a" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }
  // Défaut
  return (
    <div style={{ ...styles.iconWrap, background: "#f0f4f8" }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="#5a7a9a" strokeWidth="1.4"/>
        <path d="M7 4v4M7 9.5v.5" stroke="#5a7a9a" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

// Calculer le nombre d'entraînements ce mois depuis les logs
function countTrainMois(logs) {
  const now = new Date();
  return logs.filter((l) => {
    const t = (l.type || "").toLowerCase();
    if (t !== "entrainement" && t !== "train") return false;
    try {
      const d = new Date(l.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    } catch { return false; }
  }).length;
}

// ─── Composants utilitaires ────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={styles.spinnerWrap}>
      <div style={styles.spinner} />
      <p style={styles.spinnerTxt}>Chargement de l'historique...</p>
    </div>
  );
}

function ErreurBloc({ message, onRetry }) {
  return (
    <div style={styles.erreurBloc}>
      <span style={{ fontSize: 32 }}>⚠️</span>
      <p style={styles.erreurTxt}>{message}</p>
      <button style={styles.retryBtn} onClick={onRetry}>Réessayer</button>
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────
export default function HistoryTab() {
  const [etat, setEtat]           = useState("chargement");
  const [stats, setStats]         = useState(null);
  const [logs, setLogs]           = useState([]);
  const [precisionModele, setPrecisionModele] = useState(null);
  const [erreurMsg, setErreurMsg] = useState("");

  useEffect(() => { charger(); }, []);

  async function charger() {
    setEtat("chargement");
    setErreurMsg("");
    try {
      // On charge stats + logs en parallèle, et les métriques pour la précision
      const [resStats, resLogs, resModels] = await Promise.allSettled([
        getStats(),
        getLogs(),
        getModels(),
      ]);

      const statsData = resStats.status === "fulfilled" ? resStats.value.data : null;
      const logsData  = resLogs.status  === "fulfilled" ? resLogs.value.data  : [];

      // Calcul précision globale depuis métriques si disponible
      let prec = null;
      if (resModels.status === "fulfilled") {
        const m = resModels.value.data;
        const vals = [];
        ["H3","H6","H12","H24","J2","J3","J4","J5"].forEach(h => {
          if (!m[h]) return;
          ["temperature","vent","precipitation","humidite"].forEach(k => {
            if (m[h][k]) vals.push(Math.max(0, Math.min(100, Math.round((1 - m[h][k].MAE) * 100))));
          });
        });
        if (vals.length) prec = (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(1);
      }

      setStats(statsData);
      setLogs(logsData);
      setPrecisionModele(prec);
      setEtat("donnees");
    } catch (err) {
      setErreurMsg("Impossible de charger l'historique. Vérifiez que le backend est démarré.");
      setEtat("erreur");
    }
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────

  if (etat === "chargement") return <Spinner />;

  if (etat === "erreur") {
    return (
      <div style={styles.pad}>
        <ErreurBloc message={erreurMsg} onRetry={charger} />
      </div>
    );
  }

  const nbVilles        = stats?.nb_villes        ?? "—";
  const nbUsers         = stats?.total_users       ?? "—";
  const nbTrainsMois    = countTrainMois(logs);

  return (
    <div style={styles.pad}>

      {/* ── 4 Cartes stats ── */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIconWrap}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="8" r="4" stroke="#0a3a6a" strokeWidth="1.6"/>
              <path d="M3 18c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="#0a3a6a" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={styles.statNum}>{nbUsers}</div>
          <div style={styles.statLbl}>Utilisateurs actifs</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIconWrap}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C6.7 2 4 4.7 4 8c0 5 6 10 6 10s6-5 6-10c0-3.3-2.7-6-6-6z" stroke="#0e7c8a" strokeWidth="1.6" fill="none"/>
              <circle cx="10" cy="8" r="2" fill="#0e7c8a"/>
            </svg>
          </div>
          <div style={styles.statNum}>{nbVilles}</div>
          <div style={styles.statLbl}>Villes couvertes</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIconWrap}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10a6 6 0 1 1 12 0A6 6 0 0 1 4 10z" stroke="#1a7a3a" strokeWidth="1.6"/>
              <path d="M10 7v4l2.5 2" stroke="#1a7a3a" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ ...styles.statNum, color: "#1a7a3a" }}>
            {precisionModele !== null ? `${precisionModele}%` : "—"}
          </div>
          <div style={styles.statLbl}>Précision modèle actif</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIconWrap}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 4l14 6-14 6V4z" fill="#0e7c8a"/>
            </svg>
          </div>
          <div style={styles.statNum}>{nbTrainsMois}</div>
          <div style={styles.statLbl}>Entraînements ce mois</div>
        </div>
      </div>

      {/* ── Journal des activités ── */}
      <div style={styles.tableWrap}>
        <div style={styles.tableHeader}>
          <div style={styles.tableTitle}>Journal des activités</div>
          <div style={styles.logCount}>
            {logs.length} entrée{logs.length > 1 ? "s" : ""}
          </div>
        </div>

        <div style={styles.scrollTable}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Détail</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} style={styles.emptyTd}>
                    <div style={styles.emptyWrap}>
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                        <rect x="6" y="4" width="24" height="28" rx="3" stroke="#c8d8e8" strokeWidth="2"/>
                        <path d="M12 12h12M12 18h8M12 24h5" stroke="#c8d8e8" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <span style={styles.emptyTxt}>Aucune activité enregistrée.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={log.id || idx} style={styles.tr}>

                    {/* Date */}
                    <td style={{ ...styles.td, ...styles.dateTd }}>
                      {formatDateHeure(log.date)}
                    </td>

                    {/* Action */}
                    <td style={styles.td}>
                      <div style={styles.actionCell}>
                        <IconeAction type={log.type} />
                        <span style={styles.actionLabel}>{labelAction(log)}</span>
                      </div>
                    </td>

                    {/* Détail */}
                    <td style={{ ...styles.td, ...styles.detailTd }}>
                      {buildDetail(log)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const styles = {
  pad: {
    padding: "24px",
    flex: 1,
    overflowY: "auto",
    background: "#f0f4f8",
    minHeight: "100%",
  },

  // Stats
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "14px",
    marginBottom: "22px",
  },
  statCard: {
    background: "#fff",
    borderRadius: "14px",
    border: "1px solid rgba(14,76,122,0.12)",
    padding: "18px",
    boxShadow: "0 2px 8px rgba(10,26,74,0.07)",
  },
  statIconWrap: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: "#f0f4f8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "10px",
  },
  statNum: {
    fontFamily: "'Syne', sans-serif",
    fontSize: "28px",
    fontWeight: "800",
    color: "#0a1a4a",
  },
  statLbl: {
    fontSize: "12.5px",
    color: "#5a7a9a",
    marginTop: "4px",
    fontWeight: "600",
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
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid rgba(14,76,122,0.08)",
  },
  tableTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0a1a4a",
  },
  logCount: {
    fontSize: "12px",
    color: "#8aa0b8",
    fontStyle: "italic",
  },
  scrollTable: { overflowX: "auto" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13.5px",
  },
  theadRow: {
    background: "#f8fafd",
    borderBottom: "1px solid rgba(14,76,122,0.1)",
  },
  th: {
    padding: "11px 18px",
    textAlign: "left",
    fontSize: "11.5px",
    fontWeight: "800",
    color: "#5a7a9a",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid rgba(14,76,122,0.06)",
    transition: "background 0.15s",
  },
  td: {
    padding: "13px 18px",
    verticalAlign: "middle",
    color: "#0a1a4a",
  },
  dateTd: {
    color: "#8aa0b8",
    fontSize: "12.5px",
    whiteSpace: "nowrap",
  },
  actionCell: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
  },
  iconWrap: {
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionLabel: {
    fontWeight: "600",
    color: "#0a1a4a",
    fontSize: "13.5px",
  },
  detailTd: {
    color: "#5a7a9a",
    fontSize: "13px",
  },

  // Vide
  emptyTd: { padding: "48px 0" },
  emptyWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  emptyTxt: {
    color: "#8aa0b8",
    fontSize: "13.5px",
    fontWeight: "600",
  },

  // Spinner
  spinnerWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "300px",
    gap: "16px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e8f0f8",
    borderTop: "4px solid #0e7c8a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  spinnerTxt: {
    color: "#5a7a9a",
    fontSize: "14px",
    fontWeight: "600",
  },

  // Erreur
  erreurBloc: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "48px",
    background: "#fff",
    borderRadius: "14px",
    border: "1px solid #fdecea",
    gap: "12px",
    textAlign: "center",
  },
  erreurTxt: {
    color: "#c0392b",
    fontSize: "14px",
    maxWidth: "400px",
    fontWeight: "600",
  },
  retryBtn: {
    background: "#0a1a4a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "10px 22px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    fontFamily: "'Nunito', sans-serif",
    marginTop: "8px",
  },
};
