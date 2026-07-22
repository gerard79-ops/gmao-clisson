/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, X, Keyboard, Zap, Sparkles, BookOpen } from 'lucide-react';

interface ModuleHelpProps {
  moduleId: string;
}

const HELPS: Record<string, {
  title: string;
  description: string;
  features: string[];
  shortcuts: { keys: string[]; desc: string }[];
}> = {
  dashboard: {
    title: "Cockpit de Supervision",
    description: "Pilotez la performance, les interventions urgentes et le taux de couverture préventive de vos installations industrielles en temps réel.",
    features: [
      "Visualisation des KPI critiques : MTBF (temps de bon fonctionnement), MTTR (temps de réparation), taux de préventif, coût total.",
      "Personnalisation de la disposition en activant/masquant des widgets de façon dynamique.",
      "Projection automatique (Slideshow) réglable pour l'affichage sur téléviseur d'atelier.",
      "Filtre rapide par statut et sélecteur de criticité globale des pannes."
    ],
    shortcuts: [
      { keys: ["P"], desc: "Activer ou désactiver le mode plein écran / projection" },
      { keys: ["S"], desc: "Lancer ou mettre en pause le diaporama automatique" },
      { keys: ["C"], desc: "Ouvrir/fermer le panneau de personnalisation des widgets" }
    ]
  },
  'portail-terrain': {
    title: "Portail Mobile & Saisie Vocale",
    description: "Interface ultra-simplifiée et tactile conçue pour l'usage direct des techniciens sur le terrain depuis un smartphone.",
    features: [
      "Scan de QR Code pour ouvrir instantanément la fiche technique d'une machine.",
      "Saisie vocale avancée transcrivant automatiquement le diagnostic de panne en temps réel.",
      "Prise de photos et compression intégrée pour documenter l'état des pièces cassées.",
      "Mode hors-ligne : saisie locale sécurisée avec synchronisation automatique au retour réseau."
    ],
    shortcuts: [
      { keys: ["V"], desc: "Lancer la saisie vocale pour rédiger le rapport" },
      { keys: ["Q"], desc: "Simuler un scan de QR Code d'équipement" },
      { keys: ["Entrée"], desc: "Valider et enregistrer le bon de travail actuel" }
    ]
  },
  equipements: {
    title: "Patrimoine & Parc Équipements",
    description: "Structurez votre arborescence technique et accédez à tout l'historique de maintenance de chaque machine.",
    features: [
      "Navigation arborescente par ateliers de production (Usinage, Injection, Assemblage, etc.).",
      "Barre de progression dynamique sous chaque équipement parent affichant la disponibilité opérationnelle et le taux de préventif réalisé de tout son sous-parc.",
      "Fiches de caractéristiques techniques complètes et de criticité (A, B, C).",
      "Nomenclature complète des pièces détachées associées à chaque machine.",
      "Historique chronologique des pannes, coûts de maintenance cumulés et heures d'arrêt."
    ],
    shortcuts: [
      { keys: ["Ctrl", "F"], desc: "Focus sur le champ de recherche d'équipement" },
      { keys: ["N"], desc: "Ouvrir le formulaire de création d'un équipement" },
      { keys: ["Échap"], desc: "Fermer le panneau de détail ou la fiche de l'équipement" }
    ]
  },
  cartographie: {
    title: "Cartographie SIG Usine",
    description: "Visualisez spatialement l'état opérationnel de vos installations sur la carte géographique ou le plan de masse de votre usine.",
    features: [
      "Marqueurs interactifs géolocalisés changeant de couleur selon la criticité des pannes en cours.",
      "Création rapide de bons de travaux en cliquant directement sur l'équipement cartographié.",
      "Visualisation des secteurs à haut risque nécessitant des inspections préventives.",
      "Filtrage géographique rapide par atelier ou par niveau de gravité de panne."
    ],
    shortcuts: [
      { keys: ["+"], desc: "Zoom avant sur la carte interactive" },
      { keys: ["-"], desc: "Zoom arrière sur la carte interactive" },
      { keys: ["Clic marqueur"], desc: "Ouvrir les détails rapides de l'équipement" }
    ]
  },
  interventions: {
    title: "Gestion des Interventions (BT)",
    description: "Planifiez, assignez, suivez le cycle de vie et consolidez vos Bons de Travail curatifs et préventifs.",
    features: [
      "Création rapide de Bons de Travail (BT) avec description de la panne et technicien assigné.",
      "Cycle de vie complet du BT : Nouveau ➔ En cours ➔ En attente de pièce ➔ Clôturé.",
      "Saisie des temps passés, des coûts de main d'œuvre et des pièces consommées.",
      "Importation de fichiers GED (photos de panne, plans de sécurité, notices constructeurs)."
    ],
    shortcuts: [
      { keys: ["Ctrl", "F"], desc: "Rechercher un numéro de bon de travail ou mot-clé" },
      { keys: ["N"], desc: "Créer une nouvelle demande d'intervention" },
      { keys: ["F"], desc: "Filtrer par statut actif (ex: En cours)" }
    ]
  },
  magasin: {
    title: "Magasin & Stocks de Rechange",
    description: "Optimisez la disponibilité de vos pièces détachées critiques et réduisez la valeur de vos stocks dormants.",
    features: [
      "Calcul automatique de la valeur financière du stock et détection des ruptures.",
      "Ajustement des seuils d'alerte et des quantités minimales de sécurité.",
      "Historique complet des mouvements d'entrée, de sortie et d'ajustement d'inventaire.",
      "Association directe des pièces aux machines via la nomenclature d'équipements."
    ],
    shortcuts: [
      { keys: ["S"], desc: "Enregistrer une sortie de stock de pièces pour un BT" },
      { keys: ["E"], desc: "Enregistrer une entrée de stock de rechanges" },
      { keys: ["I"], desc: "Lancer un ajustement d'inventaire" }
    ]
  },
  planning: {
    title: "Planning Préventif",
    description: "Planifiez vos gammes de maintenance récurrentes pour maximiser la disponibilité opérationnelle de vos installations.",
    features: [
      "Calendrier interactif mensuel, hebdomadaire et journalier d'ordonnancement.",
      "Planification par déclenchement temporel (ex: mensuel) ou compteur horaire/machine.",
      "Option 'Anti-oubli' : Activation d'une notification et d'une alerte automatique si aucun Bon de Travail n'a été créé après une période de tolérance définie après l'échéance.",
      "Génération automatique des Bons de Travail préventifs à l'échéance programmée.",
      "Ajustement rapide des dates d'exécution par glisser-déposer sur le calendrier."
    ],
    shortcuts: [
      { keys: ["M"], desc: "Passer le calendrier en vue Mensuelle" },
      { keys: ["H"], desc: "Passer le calendrier en vue Hebdomadaire" },
      { keys: ["G"], desc: "Créer une nouvelle gamme de maintenance préventive" }
    ]
  },
  achats: {
    title: "Achats & Sous-traitance",
    description: "Gérez vos fournisseurs extérieurs, vos contrats de sous-traitance et le budget de maintenance annuel.",
    features: [
      "Demandes d'Achats (DA) intégrées soumises à signature hiérarchique.",
      "Conversion automatique des DA validées en Bons de Commande (BC) fournisseurs.",
      "Suivi budgétaire en temps réel par centre de coût avec alerte de dépassement.",
      "Évaluation continue de la ponctualité de livraison et de la qualité des pièces."
    ],
    shortcuts: [
      { keys: ["D"], desc: "Rédiger une nouvelle demande d'achat de pièces" },
      { keys: ["B"], desc: "Consulter la répartition des enveloppes budgétaires" },
      { keys: ["F"], desc: "Rechercher ou filtrer par fournisseur de pièces" }
    ]
  },
  reporting: {
    title: "Reporting & Analyses Industrielles",
    description: "Générez des rapports automatiques sur les causes de pannes pour optimiser vos coûts opérationnels.",
    features: [
      "Indicateurs d'efficacité : Calcul en temps réel du MTTR, MTBF et taux de préventif.",
      "Analyse financière : Répartition détaillée des coûts (Main d'œuvre vs Pièces de rechange).",
      "Courbe de Pareto des équipements ayant provoqué le plus grand nombre d'heures d'arrêt usine.",
      "Exports formatés pour l'analyse sous tableur (CSV) ou présentation (PDF)."
    ],
    shortcuts: [
      { keys: ["Ctrl", "P"], desc: "Lancer l'impression ou l'export PDF du rapport d'analyse" },
      { keys: ["D"], desc: "Changer la période d'analyse des données (Mensuelle/Annuelle)" },
      { keys: ["K"], desc: "Sélectionner les indicateurs clés affichés" }
    ]
  },
  administration: {
    title: "Administration & Pilotage Système",
    description: "Gérez les comptes utilisateurs, tracez les modifications et optimisez les accélérateurs de performance.",
    features: [
      "Gestion fine des utilisateurs et attribution des rôles (Technicien, Magasinier, Manager, Administrateur).",
      "Journal d'audit de sécurité enregistrant chaque ajout, modification ou suppression.",
      "Module de benchmark mesurant en temps réel la vitesse de connexion et de traitement.",
      "Activation des accélérateurs réseau et mise en cache locale (Brotli, IndexedDB)."
    ],
    shortcuts: [
      { keys: ["U"], desc: "Ajouter ou modifier un utilisateur et son rôle de sécurité" },
      { keys: ["B"], desc: "Lancer le Benchmark de performances système" },
      { keys: ["Alt", "Tab"], desc: "Basculer entre l'audit de sécurité et l'onglet performances" }
    ]
  }
};

export function ModuleHelp({ moduleId }: ModuleHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const data = HELPS[moduleId];

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!data) return null;

  return (
    <div className="relative inline-block ml-2 align-middle">
      {/* Help Circle Icon Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded-full transition-all flex items-center justify-center border focus:outline-none cursor-pointer ${
          isOpen
            ? 'bg-accent-orange text-white border-accent-orange shadow-sm scale-110'
            : 'bg-primary-50 hover:bg-primary-100 text-primary-500 hover:text-accent-orange border-primary-200 dark:bg-primary-800 dark:hover:bg-primary-750 dark:border-primary-700 dark:text-primary-300'
        }`}
        title={`Aide contextuelle : ${data.title}`}
        aria-label="Aide"
        id={`help-btn-${moduleId}`}
      >
        <HelpCircle size={16} className={isOpen ? "animate-pulse" : ""} />
      </button>

      {/* Popover overlay modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for click outside to close */}
            <div
              className="fixed inset-0 z-40 bg-black/5 dark:bg-black/10"
              onClick={() => setIsOpen(false)}
            />

            {/* Help Card content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 5 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 mt-2 z-50 w-80 sm:w-96 bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-xl shadow-xl overflow-hidden text-left origin-top-left"
              id={`help-card-popover-${moduleId}`}
            >
              {/* Card Header */}
              <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-850 dark:to-primary-900 border-b border-primary-100 dark:border-primary-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-accent-orange" size={16} />
                  <span className="font-display font-bold text-sm text-primary-900 dark:text-white">
                    Guide : {data.title}
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-primary-400 hover:text-primary-600 dark:hover:text-primary-200 transition p-1 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-800 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Description */}
                <p className="text-xs text-primary-600 dark:text-primary-300 leading-relaxed font-semibold">
                  {data.description}
                </p>

                {/* Key Features */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-primary-400 dark:text-primary-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap size={12} className="text-accent-orange" />
                    Fonctionnalités clés
                  </span>
                  <ul className="space-y-1.5">
                    {data.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-primary-700 dark:text-primary-300 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-orange shrink-0 mt-1.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Shortcuts & Quick actions */}
                {data.shortcuts.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-primary-100 dark:border-primary-800/60">
                    <span className="block text-[10px] font-bold text-primary-400 dark:text-primary-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Keyboard size={12} className="text-accent-orange" />
                      Raccourcis & Astuces rapides
                    </span>
                    <div className="space-y-1.5">
                      {data.shortcuts.map((sh, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-4 text-xs text-primary-700 dark:text-primary-300 py-0.5">
                          <span className="leading-relaxed font-semibold">{sh.desc}</span>
                          <div className="flex gap-1 shrink-0">
                            {sh.keys.map((k, kidx) => (
                              <kbd
                                key={kidx}
                                className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-primary-100 border border-primary-300 text-primary-800 rounded dark:bg-primary-800 dark:border-primary-700 dark:text-primary-200"
                              >
                                {k}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-primary-100 dark:border-primary-800/60">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      if ((window as any).gmaoNavigateToGuide) {
                        (window as any).gmaoNavigateToGuide(moduleId);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg transition-all border border-indigo-200/50 dark:border-indigo-800/50 cursor-pointer shadow-xs"
                  >
                    <BookOpen size={14} />
                    <span>Ouvrir le Mode d'Emploi complet</span>
                  </button>
                </div>
              </div>

              {/* Card Footer */}
              <div className="bg-primary-50/50 dark:bg-primary-950/20 px-4 py-2 border-t border-primary-100 dark:border-primary-800/60 flex items-center justify-between text-[9px] text-primary-400 dark:text-primary-500 font-bold">
                <span>GMAO-PRO INLINE HELP</span>
                <span className="text-accent-orange uppercase">{moduleId}</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
