// src/pages/Admin/tabs/CitiesTab.jsx
// Onglet Villes — Dashboard Admin
// Données 100% dynamiques depuis GET /admin/cities
// 3 états : chargement | données | erreur
// Colonnes : Ville · Région · Utilisateurs · Précision modèle (barre + %)
// Note bleue d'information sur villes.py

import { useState, useEffect } from "react";
import { getCities } from "../../../api/admin";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Couleur de la barre de précision selon le niveau
function couleurBarre(precision) {
  if (precision >= 90) return "linear-gradient(90deg,#0a1a4a,#0e7c8a)";
  if (precision >= 80) return "linear-gradient(90deg,#0e4f7a,#0e7c8a)";
  return "linear-gradient(90deg,#b45309,#d97706)";
}

// ─── Composants utilitaires ────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={styles.spinnerWrap}>
      <div style={styles.spinner} />
      <p style={styles.spinnerTxt}>Chargement des villes...</p>
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
export default function CitiesTab() {
  const [etat, setEtat]         = useState("chargement");
  const [villes, setVilles]     = useState([]);
  const [erreurMsg, setErreurMsg] = useState("");

  useEffect(() => { charger(); }, []);

  async function charger() {
    setEtat("chargement");
    setErreurMsg("");
    try {
      const res = await getCities();
      setVilles(res.data);
      setEtat("donnees");
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "Impossible de charger les villes. Vérifiez que le backend est démarré.";
      setErreurMsg(msg);
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

  return (
    <div style={styles.pad}>

      {/* ── Note d'information villes.py ── */}
      <div style={styles.infoNote}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: "1px" }}>
          <circle cx="8" cy="8" r="7" stroke="#0e4f7a" strokeWidth="1.4"/>
          <path d="M8 7v5M8 5v.5" stroke="#0e4f7a" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span>
          Les villes sont gérées via le fichier <code style={styles.code}>villes.py</code>.
          Tout ajout dans ce fichier (nom + coordonnées GPS) se synchronise automatiquement
          dans cette liste et dans toutes les listes déroulantes du site.
        </span>
      </div>

      {/* ── Tableau des villes ── */}
      <div style={styles.tableWrap}>
        <div style={styles.scrollTable}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Ville</th>
                <th style={styles.th}>Région</th>
                <th style={{ ...styles.th, textAlign: "center" }}>Utilisateurs</th>
                <th style={styles.th}>Précision modèle</th>
              </tr>
            </thead>
            <tbody>
              {villes.length === 0 ? (
                <tr>
                  <td colSpan={4} style={styles.emptyTd}>
                    <div style={styles.emptyWrap}>
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                        <path d="M18 4C12.477 4 8 8.477 8 14c0 8.4 10 18 10 18s10-9.6 10-18c0-5.523-4.477-10-10-10z"
                          stroke="#c8d8e8" strokeWidth="2" fill="none"/>
                        <circle cx="18" cy="14" r="3.5" stroke="#c8d8e8" strokeWidth="2"/>
                      </svg>
                      <span style={styles.emptyTxt}>Aucune ville enregistrée.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                villes.map((ville, idx) => {
                  // precision peut venir du backend comme float (ex: 0.942) ou déjà en %
                  const pct = ville.precision
                    ? (ville.precision <= 1 ? Math.round(ville.precision * 100) : Math.round(ville.precision))
                    : null;

                  return (
                    <tr key={ville.nom || idx} style={styles.tr}>

                      {/* Ville */}
                      <td style={styles.td}>
                        <div style={styles.villeCell}>
                          <div style={styles.pinWrap}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M7 1C4.791 1 3 2.791 3 5c0 3.25 4 8 4 8s4-4.75 4-8c0-2.209-1.791-4-4-4z"
                                fill="#0e7c8a"/>
                              <circle cx="7" cy="5" r="1.5" fill="white"/>
                            </svg>
                          </div>
                          <span style={styles.villeName}>{ville.nom}</span>
                        </div>
                      </td>

                      {/* Région */}
                      <td style={styles.td}>
                        <span style={styles.regionSpan}>{ville.region || "—"}</span>
                      </td>

                      {/* Utilisateurs */}
                      <td style={{ ...styles.td, textAlign: "center" }}>
                        <span style={styles.usersBadge}>
                          {ville.nb_utilisateurs ?? 0}
                        </span>
                      </td>

                      {/* Précision */}
                      <td style={styles.td}>
                        {pct !== null ? (
                          <div style={styles.precWrap}>
                            <div style={styles.precBarBg}>
                              <div style={{
                                ...styles.precBarFill,
                                width: `${pct}%`,
                                background: couleurBarre(pct),
                              }} />
                            </div>
                            <span style={styles.precPct}>{pct}%</span>
                          </div>
                        ) : (
                          <span style={styles.noData}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pied de tableau : nombre total de villes */}
        {villes.length > 0 && (
          <div style={styles.tableFooter}>
            {villes.length} ville{villes.length > 1 ? "s" : ""} enregistrée{villes.length > 1 ? "s" : ""}
          </div>
        )}
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

  // Note info
  infoNote: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    background: "#e8f4f8",
    borderLeft: "4px solid #0e4f7a",
    borderRadius: "0 9px 9px 0",
    padding: "13px 16px",
    marginBottom: "20px",
    fontSize: "13px",
    color: "#0a3a6a",
    lineHeight: 1.55,
  },
  code: {
    background: "rgba(14,76,122,0.1)",
    borderRadius: "4px",
    padding: "1px 6px",
    fontFamily: "monospace",
    fontSize: "12.5px",
  },

  // Tableau
  tableWrap: {
    background: "#fff",
    borderRadius: "14px",
    border: "1px solid rgba(14,76,122,0.12)",
    boxShadow: "0 2px 8px rgba(10,26,74,0.07)",
    overflow: "hidden",
  },
  scrollTable: {
    overflowX: "auto",
  },
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
    padding: "12px 18px",
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
    padding: "14px 18px",
    verticalAlign: "middle",
    color: "#0a1a4a",
  },

  // Cellule ville
  villeCell: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
  },
  pinWrap: {
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    background: "#e0f5f7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  villeName: {
    fontWeight: "700",
    fontSize: "13.5px",
    color: "#0a1a4a",
  },

  // Région
  regionSpan: {
    color: "#5a7a9a",
    fontSize: "13px",
  },

  // Badge utilisateurs
  usersBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "32px",
    height: "26px",
    background: "#e8f0f8",
    color: "#0a3a6a",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "700",
    padding: "0 10px",
  },

  // Barre précision
  precWrap: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  precBarBg: {
    height: "7px",
    borderRadius: "4px",
    background: "#e8f0f8",
    width: "100px",
    overflow: "hidden",
    flexShrink: 0,
  },
  precBarFill: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.5s ease",
  },
  precPct: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0a1a4a",
    minWidth: "40px",
  },
  noData: {
    color: "#b0c0d0",
    fontSize: "13px",
  },

  // Pied de tableau
  tableFooter: {
    padding: "11px 18px",
    borderTop: "1px solid rgba(14,76,122,0.06)",
    fontSize: "12px",
    color: "#8aa0b8",
    fontStyle: "italic",
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
