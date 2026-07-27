/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, FormEvent, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import { GlobalSettings, Equipement, Intervention, Piece, AuditLog, NotificationPreference } from '../types';
import { hasPermission, PermissionsMatrix } from '../permissionsConfig';
import {
  dbSaveEquipement,
  dbDeleteEquipement,
  dbSaveIntervention,
  dbDeleteIntervention,
  dbSavePiece,
  dbDeletePiece,
  dbSaveAuditLog
} from '../firebaseSync';
import GestionReferentiel from './GestionReferentiel';
import {
  Settings,
  Database,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Accessibility,
  Keyboard,
  CheckCircle,
  HelpCircle,
  FileSpreadsheet,
  AlertCircle,
  Check,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Lock,
  Terminal,
  Search,
  Filter,
  Award,
  Wrench,
  User,
  Bell,
  Clock,
  Calendar,
  FileText,
  Printer
} from 'lucide-react';

interface ReglagesProps {
  currentRole: string;
  permissionsMatrix: PermissionsMatrix;
  settings: GlobalSettings;
  onUpdateSettings: (payload: Partial<GlobalSettings>) => void;
  onResetDatabase: () => void;
  onImportBackup: (backupStr: string) => boolean;
  onExportBackup: () => string;
  equipements: Equipement[];
  interventions: Intervention[];
  pieces: Piece[];
  auditLogs: AuditLog[];
  userRole?: string;
}

export default function Reglages({
  currentRole,
  permissionsMatrix,
  settings,
  onUpdateSettings,
  onResetDatabase,
  onImportBackup,
  onExportBackup,
  equipements,
  interventions,
  pieces,
  auditLogs,
  userRole
}: ReglagesProps) {

  // Lists editors states
const canRaccourcis = hasPermission(permissionsMatrix, currentRole, 'parametres', 'raccourcis');
  const canCompetences = hasPermission(permissionsMatrix, currentRole, 'parametres', 'competences');
  const canImportExportParams = hasPermission(permissionsMatrix, currentRole, 'parametres', 'importExport');
  const canPurger = hasPermission(permissionsMatrix, currentRole, 'parametres', 'purger');
  const canExportSecurite = hasPermission(permissionsMatrix, currentRole, 'parametres', 'exportSecurite');
  const [activeSubTab, setActiveSubTab] = useState<'options' | 'access' | 'data' | 'csv' | 'security' | 'competences' | 'notifications' | 'referentiel'>('referentiel');
  const [newAtelier, setNewAtelier] = useState('');
  const [newMetier, setNewMetier] = useState('');
  const [newMarque, setNewMarque] = useState('');
  const [newOrgane, setNewOrgane] = useState('');
  const [newCompetence, setNewCompetence] = useState('');
  const [newEtat, setNewEtat] = useState('');
  const [newUrgence, setNewUrgence] = useState('');
  const [newEffet, setNewEffet] = useState('');
  const [newActivite, setNewActivite] = useState('');
  const [newTechnologie, setNewTechnologie] = useState('');
  const [newCause, setNewCause] = useState('');
  const [newRemede, setNewRemede] = useState('');
  const [newImputation, setNewImputation] = useState('');

  // Keyboard Shortcuts custom state
  const [localShortcuts, setLocalShortcuts] = useState<Record<string, string>>({});

  useEffect(() => {
    const defaultShortcuts: Record<string, string> = {
      dashboard: 'd',
      equipements: 'e',
      interventions: 'i',
      magasin: 'm',
      planning: 'p',
      achats: 'a',
      reglages: 'r',
      cartographie: 'c',
      reporting: 'o',
      'portail-terrain': 't'
    };
    setLocalShortcuts(settings.shortcuts || defaultShortcuts);
  }, [settings.shortcuts]);

  const handleShortcutChange = (moduleKey: string, val: string) => {
    // Keep only the last character, strip spaces, and lowercase it
    const char = val.trim().toLowerCase().slice(-1);
    setLocalShortcuts(prev => ({
      ...prev,
      [moduleKey]: char
    }));
  };

  const handleSaveShortcuts = () => {
    if (userRole === 'Technicien') {
      alert("🔐 Accès refusé : Seuls les Managers peuvent modifier la configuration globale.");
      return;
    }
    // Check for duplicates
    const values = Object.entries(localShortcuts)
      .map(([_, key]) => key)
      .filter(k => k !== '');

    const hasDuplicates = values.some((val, i) => values.indexOf(val) !== i);
    if (hasDuplicates) {
      if (!confirm("⚠️ Certains raccourcis utilisent la même touche. Cela peut provoquer des conflits de navigation. Voulez-vous enregistrer quand même ?")) {
        return;
      }
    }

    onUpdateSettings({ shortcuts: localShortcuts });
    alert("✅ Vos raccourcis clavier personnalisés ont été enregistrés !");
    logSecurityAction("Configuration Raccourcis", "Mise à jour des raccourcis clavier globaux de navigation par l'administrateur.", "faible");
  };

  const handleResetShortcuts = () => {
    if (userRole === 'Technicien') {
      alert("🔐 Accès refusé : Seuls les Managers peuvent modifier la configuration globale.");
      return;
    }
    if (confirm("🔄 Voulez-vous restaurer les raccourcis clavier d'origine ?")) {
      const defaultShortcuts: Record<string, string> = {
        dashboard: 'd',
        equipements: 'e',
        interventions: 'i',
        magasin: 'm',
        planning: 'p',
        achats: 'a',
        reglages: 'r',
        cartographie: 'c',
        reporting: 'o',
        'portail-terrain': 't'
      };
      onUpdateSettings({ shortcuts: defaultShortcuts });
      setLocalShortcuts(defaultShortcuts);
    }
  };

  const MODULE_SHORTCUT_LABELS: Record<string, { label: string; desc: string }> = {
    dashboard: { label: "Tableau de bord", desc: "Suivi KPIs et performance" },
    equipements: { label: "Parc Équipements", desc: "Inventaire et fiches machines" },
    interventions: { label: "Interventions (BT/DI)", desc: "Historique et travaux en cours" },
    magasin: { label: "Stocks / Magasin", desc: "Pièces détachées et inventaire" },
    planning: { label: "Planning d'équipe", desc: "Calendrier des techniciens" },
    achats: { label: "Achats & Commandes", desc: "Approvisionnements et sous-traitance" },
    cartographie: { label: "Cartographie SIG", desc: "Géo-localisation des équipements" },
    reporting: { label: "Statistiques & Coûts", desc: "Analyses, MTBF, MTTR, budgets" },
    'portail-terrain': { label: "Portail Terrain", desc: "Interface simplifiée pour techniciens" },
    reglages: { label: "Configuration", desc: "Réglages de l'application" }
  };

  // Notification states
  const [selectedTech, setSelectedTech] = useState<string>('');
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifStartHour, setNotifStartHour] = useState('08:00');
  const [notifEndHour, setNotifEndHour] = useState('18:00');
  const [notifDays, setNotifDays] = useState<string[]>(['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']);
  const [notifCriticalOnly, setNotifCriticalOnly] = useState(true);

  // Sync notification form states when selectedTech changes
  useEffect(() => {
    const techName = selectedTech || settings.listes.operateurs[0] || '';
    if (techName) {
      const prefs = settings.notificationPreferences?.[techName] || {
        enabled: true,
        startHour: '08:00',
        endHour: '18:00',
        days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
        receiveCriticalOnly: true
      };
      setNotifEnabled(prefs.enabled);
      setNotifStartHour(prefs.startHour);
      setNotifEndHour(prefs.endHour);
      setNotifDays(prefs.days);
      setNotifCriticalOnly(prefs.receiveCriticalOnly);
    }
  }, [selectedTech, settings.notificationPreferences, settings.listes.operateurs]);

  const handleSaveNotifPrefs = (e: React.FormEvent) => {
    e.preventDefault();
    const techName = selectedTech || settings.listes.operateurs[0] || '';
    if (!techName) return;

    const updatedPrefs: NotificationPreference = {
      enabled: notifEnabled,
      startHour: notifStartHour,
      endHour: notifEndHour,
      days: notifDays,
      receiveCriticalOnly: notifCriticalOnly
    };

    const currentPrefsMap = settings.notificationPreferences || {};
    onUpdateSettings({
      notificationPreferences: {
        ...currentPrefsMap,
        [techName]: updatedPrefs
      }
    });

    logSecurityAction(
      "Configuration Alertes",
      `Mise à jour des plages horaires d'alerte push critiques pour le technicien ${techName} : ${notifStartHour}-${notifEndHour}, Jours: ${notifDays.join(', ')}`,
      "faible"
    );

    alert(`✅ Les préférences de notification de ${techName} ont été enregistrées.`);
  };

  // Security audit states
  const [securitySearch, setSecuritySearch] = useState('');
  const [securityCriticiteFilter, setSecurityCriticiteFilter] = useState<'all' | 'faible' | 'moyenne' | 'eleve'>('all');

  const handleExportSecurityPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const query = securitySearch.toLowerCase();
    const filtered = [...(auditLogs || [])]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter(log => {
        const matchesSearch = 
          log.action.toLowerCase().includes(query) ||
          log.utilisateur.toLowerCase().includes(query) ||
          (log.details && log.details.toLowerCase().includes(query)) ||
          (log.ipAdresse && log.ipAdresse.toLowerCase().includes(query));
          
        const matchesCriticite = 
          securityCriticiteFilter === 'all' || 
          log.criticite === securityCriticiteFilter;
          
        return matchesSearch && matchesCriticite;
      });

    // Header styling
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("REGISTRE D'AUDIT DE SÉCURITÉ & CONFORMITÉ", 14, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Établissement : ${settings.nomEntreprise || "Usine Métal & Plastique PRO"}`, 14, 24);
    doc.text(`Généré le : ${new Date().toLocaleString('fr-FR')}`, 14, 29);
    doc.text(`Filtres - Recherche: "${securitySearch || 'Aucune'}" | Criticité: ${securityCriticiteFilter === 'all' ? 'Toutes' : securityCriticiteFilter.toUpperCase()}`, 14, 34);

    // Official block
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(205, 12, 78, 24, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text("CERTIFICATION DE CONFORMITÉ", 209, 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Total des événements : ${filtered.length}`, 209, 22);
    doc.text(`Critiques : ${filtered.filter(l => l.criticite === 'eleve').length} | Moyens : ${filtered.filter(l => l.criticite === 'moyenne').length}`, 209, 26);
    doc.text("Document intègre et inaltérable", 209, 31);

    // Table settings
    const colWidths = {
      timestamp: 36,
      utilisateur: 38,
      action: 42,
      details: 104,
      criticite: 22,
      ip: 31
    };

    let currentY = 42;

    // Header draw function
    const drawTableHeader = (y: number) => {
      doc.setFillColor(79, 70, 229); // indigo-600
      doc.rect(14, y, 269, 8, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      
      doc.text("Horodatage", 16, y + 5.5);
      doc.text("Utilisateur", 16 + colWidths.timestamp, y + 5.5);
      doc.text("Action", 16 + colWidths.timestamp + colWidths.utilisateur, y + 5.5);
      doc.text("Détails de l'opération", 16 + colWidths.timestamp + colWidths.utilisateur + colWidths.action, y + 5.5);
      doc.text("Criticité", 16 + colWidths.timestamp + colWidths.utilisateur + colWidths.action + colWidths.details, y + 5.5);
      doc.text("Adresse IP", 16 + colWidths.timestamp + colWidths.utilisateur + colWidths.action + colWidths.details + colWidths.criticite, y + 5.5);
    };

    drawTableHeader(currentY);
    currentY += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    filtered.forEach((log, index) => {
      // Wrap lines
      const detailsLines = doc.splitTextToSize(log.details || "", colWidths.details - 4);
      const actionLines = doc.splitTextToSize(log.action || "", colWidths.action - 4);
      const userLines = doc.splitTextToSize(log.utilisateur || "", colWidths.utilisateur - 4);
      
      const lineCount = Math.max(detailsLines.length, actionLines.length, userLines.length);
      const rowHeight = (lineCount * 4) + 4;

      // Page break check
      if (currentY + rowHeight > 185) {
        doc.addPage();
        currentY = 15;
        drawTableHeader(currentY);
        currentY += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }

      // Zebra styling
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252); // slate-50
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(14, currentY, 269, rowHeight, "F");

      // Grid line
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.line(14, currentY + rowHeight, 283, currentY + rowHeight);

      // Print columns
      doc.setTextColor(51, 65, 85); // slate-700
      
      // Timestamp
      const dateStr = new Date(log.timestamp).toLocaleString('fr-FR');
      doc.text(dateStr, 16, currentY + 4.5);

      // Utilisateur (can be multiline)
      userLines.forEach((line: string, i: number) => {
        doc.text(line, 16 + colWidths.timestamp, currentY + 4.5 + (i * 4));
      });

      // Action
      actionLines.forEach((line: string, i: number) => {
        doc.text(line, 16 + colWidths.timestamp + colWidths.utilisateur, currentY + 4.5 + (i * 4));
      });

      // Details
      detailsLines.forEach((line: string, i: number) => {
        doc.text(line, 16 + colWidths.timestamp + colWidths.utilisateur + colWidths.action, currentY + 4.5 + (i * 4));
      });

      // Criticite (with specific color styling)
      const critX = 16 + colWidths.timestamp + colWidths.utilisateur + colWidths.action + colWidths.details;
      if (log.criticite === 'eleve') {
        doc.setTextColor(220, 38, 38); // red-600
        doc.setFont("helvetica", "bold");
        doc.text("ÉLEVÉ", critX, currentY + 4.5);
        doc.setFont("helvetica", "normal");
      } else if (log.criticite === 'moyenne') {
        doc.setTextColor(217, 119, 6); // amber-600
        doc.setFont("helvetica", "bold");
        doc.text("MOYEN", critX, currentY + 4.5);
        doc.setFont("helvetica", "normal");
      } else {
        doc.setTextColor(79, 70, 229); // indigo-600
        doc.text("FAIBLE", critX, currentY + 4.5);
      }

      // IP
      doc.setTextColor(100, 116, 139); // slate-500
      const ipX = critX + colWidths.criticite;
      doc.text(log.ipAdresse || "Interne", ipX, currentY + 4.5);

      currentY += rowHeight;
    });

    // Page numbering and footer certifying conformity on each page
    const pages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Document d'archivage officiel généré par ${settings.nomEntreprise || "GMAO PRO"} - Page ${i} sur ${pages}`, 14, 202);
      doc.text("Conformité réglementaire RGPD, ISO 55001 & Traçabilité des interventions", 195, 202);
    }

    doc.save(`gmao_audit_securite_${new Date().toISOString().substring(0, 10)}.pdf`);
    
    // Log security audit export action!
    logSecurityAction(
      "Export PDF Audit", 
      `Exportation officielle du journal d'audit de sécurité au format PDF (${filtered.length} lignes exportées).`, 
      "moyenne"
    );
  };

  const competencesList = settings.competencesList || [];
  const competencesTechniciens = settings.competencesTechniciens || {};

  const handleAddCompetence = () => {
    if (userRole === 'Technicien') {
      alert("🔐 Accès refusé : Seuls les Managers peuvent ajouter des compétences.");
      return;
    }
    if (!newCompetence.trim()) return;
    if (competencesList.includes(newCompetence.trim())) {
      alert("⚠️ Cette compétence existe déjà.");
      return;
    }
    const nextList = [...competencesList, newCompetence.trim()];
    onUpdateSettings({
      competencesList: nextList
    });
    setNewCompetence('');
    logSecurityAction("Création Compétence", `Ajout de la compétence globale : ${newCompetence.trim()}`, "faible");
  };

  const handleRemoveCompetence = (skill: string) => {
    if (userRole === 'Technicien') {
      alert("🔐 Accès refusé : Seuls les Managers peuvent supprimer des compétences.");
      return;
    }
    if (confirm(`⚠️ Confirmer la suppression définitive de la compétence "${skill}" ? Elle sera retirée de tous les techniciens.`)) {
      const nextList = competencesList.filter(s => s !== skill);
      
      const nextTechs: Record<string, string[]> = {};
      Object.keys(competencesTechniciens).forEach(techName => {
        nextTechs[techName] = (competencesTechniciens[techName] || []).filter(s => s !== skill);
      });
      
      onUpdateSettings({
        competencesList: nextList,
        competencesTechniciens: nextTechs
      });
      logSecurityAction("Suppression Compétence", `Suppression de la compétence globale : ${skill}`, "faible");
    }
  };

  const handleToggleTechSkill = (techName: string, skill: string) => {
    if (userRole === 'Technicien') {
      alert("🔐 Accès refusé : Seuls les Managers peuvent modifier les compétences des techniciens.");
      return;
    }
    const currentTechSkills = competencesTechniciens[techName] || [];
    let updatedSkills: string[];
    if (currentTechSkills.includes(skill)) {
      updatedSkills = currentTechSkills.filter(s => s !== skill);
    } else {
      updatedSkills = [...currentTechSkills, skill];
    }
    
    onUpdateSettings({
      competencesTechniciens: {
        ...competencesTechniciens,
        [techName]: updatedSkills
      }
    });
    logSecurityAction("Modification Compétences", `Mise à jour des compétences du technicien ${techName}`, "faible");
  };

  const logSecurityAction = async (action: string, details: string, criticite: 'faible' | 'moyenne' | 'eleve') => {
    const logItem: AuditLog = {
      id: "LOG-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Date.now().toString().slice(-4),
      timestamp: new Date().toISOString(),
      utilisateur: "Jean Dupont (Administrateur)",
      action,
      details,
      criticite,
      ipAdresse: "192.168.1.50"
    };
    try {
      await dbSaveAuditLog(logItem);
    } catch (e) {
      console.warn("Could not write security audit log:", e);
    }
  };

  // Access and accessibility states
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Backup import state
  const [backupText, setBackupText] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'idle' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' });

  // CSV Import/Export States
  const [csvType, setCsvType] = useState<'equipements' | 'interventions' | 'pieces'>('equipements');
  const [importMethod, setImportMethod] = useState<'merge' | 'replace'>('merge');
  const [dragActive, setDragActive] = useState(false);
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [validationReport, setValidationReport] = useState<{
    valid: number;
    invalid: number;
    warnings: string[];
    itemsToImport: any[];
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; updated: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to parse CSV string to matrix (supports semicolon and comma separators, and quoted fields)
  const parseCSV = (text: string): string[][] => {
    const firstLine = text.split('\n')[0] || '';
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    const rows: string[][] = [];
    let row: string[] = [];
    let currentVal = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentVal += '"';
            i++; // skip next quote
          } else {
            inQuotes = false;
          }
        } else {
          currentVal += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === delimiter) {
          row.push(currentVal.trim());
          currentVal = '';
        } else if (char === '\r' || char === '\n') {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          row.push(currentVal.trim());
          rows.push(row);
          row = [];
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
    }
    if (row.length > 0 || currentVal !== '') {
      row.push(currentVal.trim());
      rows.push(row);
    }
    return rows.filter(r => r.some(cell => cell !== ''));
  };

  // Run validation on parsed rows
  const runValidation = (headers: string[], rows: string[][], type: 'equipements' | 'interventions' | 'pieces') => {
    const warnings: string[] = [];
    let valid = 0;
    let invalid = 0;
    const itemsToImport: any[] = [];

    // Lowercase headers for foolproof case-insensitive match
    const headersLower = headers.map(h => h.toLowerCase());

    if (type === 'equipements') {
      // Check mandatory columns
      if (!headersLower.includes('nom')) {
        setImportResult(null);
        setValidationReport({
          valid: 0,
          invalid: rows.length,
          warnings: ["La colonne obligatoire 'nom' (Désignation de la machine) est introuvable."],
          itemsToImport: []
        });
        return;
      }

      rows.forEach((row, idx) => {
        const getVal = (colName: string) => {
          const colIdx = headersLower.indexOf(colName.toLowerCase());
          return colIdx !== -1 && colIdx < row.length ? row[colIdx] : '';
        };

        const nom = getVal('nom');
        if (!nom) {
          invalid++;
          warnings.push(`Ligne ${idx + 2} ignorée : 'nom' vide.`);
          return;
        }

        const id = getVal('id') || ("EQ-" + Math.random().toString(36).substring(2, 6).toUpperCase());
        const rawStatut = getVal('statut');
        const statut = (rawStatut === 'HS' ? 'HS' : 'Opérationnel') as 'Opérationnel' | 'HS';

        itemsToImport.push({
          id,
          nom,
          atelier: getVal('atelier') || settings.listes.ateliers[0] || 'Général',
          metier: getVal('metier') || settings.listes.metiers[0] || 'MULTI-TECHNIQUES',
          statut,
          tempsOuverture: Number(getVal('tempsOuverture')) || 168,
          marque: getVal('marque') || '',
          type: getVal('type') || '',
          serie: getVal('serie') || '',
          annee: Number(getVal('annee')) || new Date().getFullYear(),
          garantie: getVal('garantie') || '',
          prix: Number(getVal('prix')) || 0,
          critique: getVal('critique')?.toLowerCase() === 'true' || getVal('critique')?.toLowerCase() === 'oui' || getVal('critique')?.toLowerCase() === 'yes',
          piecesAffectees: getVal('piecesAffectees') || '',
          infos: getVal('infos') || '',
          parentId: getVal('parentId') || null,
        });
        valid++;
      });
    } else if (type === 'interventions') {
      if (!headersLower.includes('equipementid') && !headersLower.includes('equipementnom')) {
        setValidationReport({
          valid: 0,
          invalid: rows.length,
          warnings: ["Il faut au moins une colonne 'equipementId' ou 'equipementNom'."],
          itemsToImport: []
        });
        return;
      }

      rows.forEach((row, idx) => {
        const getVal = (colName: string) => {
          const colIdx = headersLower.indexOf(colName.toLowerCase());
          return colIdx !== -1 && colIdx < row.length ? row[colIdx] : '';
        };

        const eqNom = getVal('equipementNom') || getVal('equipementid') || 'Équipement non spécifié';
        const id = getVal('id') || ("INT-" + Math.random().toString(36).substring(2, 6).toUpperCase());
        const typeDoc = (getVal('typeDoc') || 'BT') as 'DI' | 'BT' | 'Préventif';
        const rawStatut = getVal('statut');
        const statut = (rawStatut || 'En cours') as 'En attente' | 'En cours' | 'En attente de pièce' | 'Soldé' | 'Clôturé';

        itemsToImport.push({
          id,
          typeDoc,
          numero: getVal('numero') || ("BT-" + new Date().getFullYear().toString().substring(2, 4) + "-" + Math.random().toString(36).substring(2, 6).toUpperCase()),
          equipementId: getVal('equipementId') || '',
          equipementNom: eqNom,
          atelier: getVal('atelier') || settings.listes.ateliers[0] || 'Général',
          urgence: getVal('urgence') || 'Moyenne',
          typeProbleme: getVal('typeProbleme') || 'Panne',
          demandeur: getVal('demandeur') || 'Importateur CSV',
          description: getVal('description') || 'Importé par CSV',
          statut,
          dateCreation: getVal('dateCreation') || new Date().toISOString(),
          dateCloture: getVal('dateCloture') || undefined,
          datePrevue: getVal('datePrevue') || undefined,
          compteRendu: getVal('compteRendu') || undefined,
          tempsPasse: getVal('tempsPasse') || undefined,
          piecesConso: getVal('piecesConso') || undefined,
          technicienCloture: getVal('technicienCloture') || undefined,
          activite: getVal('activite') || undefined,
          technologie: getVal('technologie') || undefined,
          cause: getVal('cause') || undefined,
          remede: getVal('remede') || undefined,
          imputation: getVal('imputation') || undefined,
        });
        valid++;
      });
    } else if (type === 'pieces') {
      if (!headersLower.includes('designation')) {
        setValidationReport({
          valid: 0,
          invalid: rows.length,
          warnings: ["La colonne obligatoire 'designation' (Désignation de la pièce) est introuvable."],
          itemsToImport: []
        });
        return;
      }

      rows.forEach((row, idx) => {
        const getVal = (colName: string) => {
          const colIdx = headersLower.indexOf(colName.toLowerCase());
          return colIdx !== -1 && colIdx < row.length ? row[colIdx] : '';
        };

        const designation = getVal('designation');
        if (!designation) {
          invalid++;
          warnings.push(`Ligne ${idx + 2} ignorée : 'designation' vide.`);
          return;
        }

        const id = getVal('id') || ("PC-" + Math.random().toString(36).substring(2, 6).toUpperCase());
        const codeArticle = getVal('codeArticle') || ('ART-' + Math.random().toString(36).substring(2, 7).toUpperCase());

        itemsToImport.push({
          id,
          codeArticle,
          designation,
          famille: getVal('famille') || 'DIVERS',
          sousFamille: getVal('sousFamille') || '',
          marque: getVal('marque') || '',
          reference: getVal('reference') || '',
          fournisseur: getVal('fournisseur') || '',
          refFournisseur: getVal('refFournisseur') || '',
          emplacement: getVal('emplacement') || 'MAGASIN GÉNÉRAL',
          quantite: Number(getVal('quantite')) || 0,
          seuil: Number(getVal('seuil')) || 0,
          prix: Number(getVal('prix')) || 0,
          codeBarre: getVal('codeBarre') || '',
          equipementsLies: getVal('equipementsLies') ? getVal('equipementsLies').split(',').map(x => x.trim()) : [],
        });
        valid++;
      });
    }

    setValidationReport({
      valid,
      invalid,
      warnings,
      itemsToImport
    });
  };

  // File handling
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      
      const matrix = parseCSV(text);
      if (matrix.length < 2) {
        setImportResult(null);
        setValidationReport({
          valid: 0,
          invalid: 0,
          warnings: ["Le fichier semble vide ou ne contient que des en-têtes."],
          itemsToImport: []
        });
        return;
      }

      const headers = matrix[0];
      const dataRows = matrix.slice(1);
      setParsedHeaders(headers);
      setParsedRows(dataRows);
      setImportResult(null);
      runValidation(headers, dataRows, csvType);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Perform actual import to Firestore
  const executeImport = async () => {
    if (userRole === 'Technicien') {
      alert("🔐 Accès refusé : Seuls les Managers peuvent importer des données par CSV.");
      return;
    }
    if (!validationReport || validationReport.itemsToImport.length === 0) return;
    setIsImporting(true);
    setImportResult(null);

    let added = 0;
    let updated = 0;
    let errorsCount = 0;

    const items = validationReport.itemsToImport;

    try {
      if (csvType === 'equipements') {
        if (importMethod === 'replace') {
          // Overwrite mode: delete existing
          for (const eq of equipements) {
            await dbDeleteEquipement(eq.id);
          }
        }
        for (const item of items) {
          const exists = equipements.some(e => e.id === item.id);
          await dbSaveEquipement(item);
          if (exists && importMethod !== 'replace') {
            updated++;
          } else {
            added++;
          }
        }
      } else if (csvType === 'interventions') {
        if (importMethod === 'replace') {
          for (const int of interventions) {
            await dbDeleteIntervention(int.id);
          }
        }
        for (const item of items) {
          const exists = interventions.some(i => i.id === item.id);
          await dbSaveIntervention(item);
          if (exists && importMethod !== 'replace') {
            updated++;
          } else {
            added++;
          }
        }
      } else if (csvType === 'pieces') {
        if (importMethod === 'replace') {
          for (const pc of pieces) {
            await dbDeletePiece(pc.id);
          }
        }
        for (const item of items) {
          const exists = pieces.some(p => p.id === item.id);
          await dbSavePiece(item);
          if (exists && importMethod !== 'replace') {
            updated++;
          } else {
            added++;
          }
        }
      }

      setImportResult({ added, updated, errors: errorsCount });
      logSecurityAction("Importation CSV", `Importation réussie de données métiers (${csvType}) via fichier CSV : +${added} ajouté(s), ~${updated} mis à jour.`, "moyenne");
      setValidationReport(null);
      setParsedRows([]);
      setParsedHeaders([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error("CSV Import error:", err);
      alert("Une erreur est survenue lors de l'enregistrement dans la base Firestore.");
    } finally {
      setIsImporting(false);
    }
  };

  // CSV Export helper (compatible with French Excel)
  const handleExportCSV = (type: 'equipements' | 'interventions' | 'pieces') => {
    let headers: string[] = [];
    let data: any[] = [];
    let mapper: (item: any) => string[] = () => [];
    let filename = '';

    if (type === 'equipements') {
      filename = `export_equipements_${new Date().toISOString().split('T')[0]}.csv`;
      headers = [
        'id', 'nom', 'atelier', 'metier', 'statut', 'tempsOuverture',
        'marque', 'type', 'serie', 'annee', 'garantie', 'prix',
        'critique', 'piecesAffectees', 'infos', 'parentId'
      ];
      data = equipements;
      mapper = (eq: Equipement) => [
        eq.id, eq.nom, eq.atelier, eq.metier, eq.statut, String(eq.tempsOuverture),
        eq.marque, eq.type, eq.serie, String(eq.annee), eq.garantie, String(eq.prix),
        String(eq.critique), eq.piecesAffectees, eq.infos, eq.parentId || ''
      ];
    } else if (type === 'interventions') {
      filename = `export_bons_travail_${new Date().toISOString().split('T')[0]}.csv`;
      headers = [
        'id', 'typeDoc', 'numero', 'equipementId', 'equipementNom', 'atelier',
        'urgence', 'typeProbleme', 'demandeur', 'description', 'statut',
        'dateCreation', 'dateCloture', 'datePrevue', 'compteRendu', 'tempsPasse',
        'piecesConso', 'technicienCloture', 'activite', 'technologie', 'cause',
        'remede', 'imputation'
      ];
      data = interventions;
      mapper = (int: Intervention) => [
        int.id, int.typeDoc, int.numero, int.equipementId, int.equipementNom, int.atelier,
        int.urgence, int.typeProbleme, int.demandeur, int.description, int.statut,
        int.dateCreation, int.dateCloture || '', int.datePrevue || '', int.compteRendu || '', int.tempsPasse || '',
        int.piecesConso || '', int.technicienCloture || '', int.activite || '', int.technologie || '', int.cause || '',
        int.remede || '', int.imputation || ''
      ];
    } else if (type === 'pieces') {
      filename = `export_magasin_pieces_${new Date().toISOString().split('T')[0]}.csv`;
      headers = [
        'id', 'codeArticle', 'designation', 'famille', 'sousFamille', 'marque',
        'reference', 'fournisseur', 'refFournisseur', 'emplacement', 'quantite',
        'seuil', 'prix', 'codeBarre', 'equipementsLies'
      ];
      data = pieces;
      mapper = (pc: Piece) => [
        pc.id, pc.codeArticle, pc.designation, pc.famille, pc.sousFamille, pc.marque,
        pc.reference, pc.fournisseur, pc.refFournisseur, pc.emplacement, String(pc.quantite),
        String(pc.seuil), String(pc.prix), pc.codeBarre, pc.equipementsLies.join(',')
      ];
    }

    const delimiter = ';';
    const csvRows = [headers.join(delimiter)];
    for (const item of data) {
      const values = mapper(item);
      const escaped = values.map(val => {
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      });
      csvRows.push(escaped.join(delimiter));
    }

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    logSecurityAction("Export CSV", `Exportation de la table de données '${type}' au format Excel/CSV (${data.length} enregistrements).`, "faible");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export complet : télécharge d'abord le parc machines, puis les interventions
  const handleExportCompletAudit = () => {
    // 1. Export equipements
    handleExportCSV('equipements');
    
    // 2. Export interventions with a tiny timeout to let the browser process the first download
    setTimeout(() => {
      handleExportCSV('interventions');
    }, 300);
    
    logSecurityAction("Export Audit Complet", `Exportation complète du parc (${equipements.length} machines) et des interventions (${interventions.length} BT/DI) au format CSV distincts pour audit externe.`, "faible");
  };

  // Export d'Audit Consolidé (Chaque intervention est enrichie des détails techniques complets de sa machine)
  const handleExportConsolideAudit = () => {
    const filename = `export_audit_gmao_consolide_${new Date().toISOString().split('T')[0]}.csv`;
    const headers = [
      'Intervention_ID', 'Type_Document', 'Numero_Intervention', 'Statut_Intervention',
      'Urgence', 'Type_Probleme', 'Demandeur', 'Description', 'Date_Creation',
      'Date_Cloture', 'Date_Prevue', 'Temps_Passe_Heures', 'Compte_Rendu',
      'Activite', 'Technologie', 'Cause_Panne', 'Remede', 'Imputation_Atelier',
      'Equipement_ID', 'Equipement_Nom', 'Equipement_Atelier', 'Equipement_Specialite',
      'Equipement_Statut', 'Equipement_Marque', 'Equipement_Type', 'Equipement_Serie',
      'Equipement_Annee', 'Equipement_Critique', 'Equipement_Prix'
    ];

    const delimiter = ';';
    const csvRows = [headers.join(delimiter)];

    for (const int of interventions) {
      const eq = equipements.find(e => e.id === int.equipementId) || 
                 equipements.find(e => e.nom === int.equipementNom);

      const values = [
        int.id,
        int.typeDoc,
        int.numero,
        int.statut,
        int.urgence,
        int.typeProbleme,
        int.demandeur,
        int.description,
        int.dateCreation,
        int.dateCloture || '',
        int.datePrevue || '',
        int.tempsPasse || '',
        int.compteRendu || '',
        int.activite || '',
        int.technologie || '',
        int.cause || '',
        int.remede || '',
        int.imputation || '',
        eq ? eq.id : (int.equipementId || ''),
        eq ? eq.nom : (int.equipementNom || ''),
        eq ? eq.atelier : '',
        eq ? eq.metier : '',
        eq ? eq.statut : '',
        eq ? eq.marque : '',
        eq ? eq.type : '',
        eq ? eq.serie : '',
        eq ? String(eq.annee) : '',
        eq ? (eq.critique ? 'Oui' : 'Non') : '',
        eq ? String(eq.prix) : ''
      ];

      const escaped = values.map(val => {
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      });
      csvRows.push(escaped.join(delimiter));
    }

    // Ajout des équipements n'ayant aucune intervention pour garantir l'exhaustivité de l'audit
    for (const eq of equipements) {
      const hasIntervention = interventions.some(int => int.equipementId === eq.id || int.equipementNom === eq.nom);
      if (!hasIntervention) {
        const values = [
          '', '', '', '', '', '', 'Aucune intervention enregistrée (Conformité ok)', '', '', '', '', '', '', '', '', '', '', '',
          eq.id,
          eq.nom,
          eq.atelier,
          eq.metier,
          eq.statut,
          eq.marque,
          eq.type,
          eq.serie,
          String(eq.annee),
          eq.critique ? 'Oui' : 'Non',
          String(eq.prix)
        ];
        const escaped = values.map(val => {
          if (val === undefined || val === null) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        });
        csvRows.push(escaped.join(delimiter));
      }
    }

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    logSecurityAction("Export Audit Consolidé", `Exportation du registre d'audit consolidé au format Excel/CSV (${interventions.length} interventions jointes, machines sans historique incluses).`, "moyenne");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download CSV template
  const handleDownloadTemplate = (type: 'equipements' | 'interventions' | 'pieces') => {
    let headers: string[] = [];
    let sample: string[] = [];
    let filename = '';

    if (type === 'equipements') {
      filename = 'gabarit_import_equipements.csv';
      headers = [
        'id', 'nom', 'atelier', 'metier', 'statut', 'tempsOuverture',
        'marque', 'type', 'serie', 'annee', 'garantie', 'prix',
        'critique', 'piecesAffectees', 'infos', 'parentId'
      ];
      sample = [
        'EQ-M1', 'Centrale d\'air comprimé', 'Atelier A', 'MÉCANIQUE', 'Opérationnel', '168',
        'KAESER', 'CSD-105', 'SN-87452', '2023', '2025-12-31', '14200',
        'TRUE', 'PC-A12, PC-B04', 'Compresseur principal haute pression', ''
      ];
    } else if (type === 'interventions') {
      filename = 'gabarit_import_interventions.csv';
      headers = [
        'id', 'typeDoc', 'numero', 'equipementId', 'equipementNom', 'atelier',
        'urgence', 'typeProbleme', 'demandeur', 'description', 'statut',
        'dateCreation', 'dateCloture', 'datePrevue', 'compteRendu', 'tempsPasse',
        'piecesConso', 'technicienCloture', 'activite', 'technologie', 'cause',
        'remede', 'imputation'
      ];
      sample = [
        'INT-M1', 'BT', 'BT-26-0043', 'EQ-M1', 'Centrale d\'air comprimé', 'Atelier A',
        'Haute', 'Vibrations anormales', 'Eric Lambert', 'Vibrations excessives constatées au niveau du bloc vis.', 'En cours',
        '2026-06-29T10:30:00Z', '', '2026-06-30T08:00:00Z', '', '',
        '', '', 'Correctif', 'Mécanique', '', '', 'Atelier A'
      ];
    } else if (type === 'pieces') {
      filename = 'gabarit_import_pieces_magasin.csv';
      headers = [
        'id', 'codeArticle', 'designation', 'famille', 'sousFamille', 'marque',
        'reference', 'fournisseur', 'refFournisseur', 'emplacement', 'quantite',
        'seuil', 'prix', 'codeBarre', 'equipementsLies'
      ];
      sample = [
        'PC-A12', 'ART-00241', 'Cartouche filtrante KAESER', 'FILTRATION', 'Filtres à air', 'KAESER',
        '6.2015.0', 'SMC France', 'SMC-F87', 'Rack C-02', '12',
        '4', '54.90', '3700123456789', 'EQ-M1'
      ];
    }

    const delimiter = ';';
    const csvRows = [
      headers.join(delimiter),
      sample.map(val => `"${val.replace(/"/g, '""')}"`).join(delimiter)
    ];

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // List updates helpers
  const handleAddListOption = (
    field: 'ateliers' | 'metiers' | 'marques' | 'etats' | 'urgences' | 'effets' | 'activites' | 'technologies' | 'causes' | 'remedes' | 'imputations',
    value: string,
    setter: (v: string) => void
  ) => {
    if (userRole === 'Technicien') {
      alert("🔐 Accès refusé : Seuls les Managers peuvent modifier la configuration globale.");
      return;
    }
    if (!value.trim()) return;
    const current = settings.listes[field];
    if (current.includes(value.trim())) {
      alert("⚠️ Cette option existe déjà dans la liste.");
      return;
    }

    onUpdateSettings({
      listes: {
        ...settings.listes,
        [field]: [...current, value.trim()].sort((a, b) => a.localeCompare(b))
      }
    });
    setter('');
  };

  const handleRemoveListOption = (
    field: 'ateliers' | 'metiers' | 'marques' | 'etats' | 'urgences' | 'effets' | 'activites' | 'technologies' | 'causes' | 'remedes' | 'imputations',
    value: string
  ) => {
    if (userRole === 'Technicien') {
      alert("🔐 Accès refusé : Seuls les Managers peuvent modifier la configuration globale.");
      return;
    }
    if (settings.listes[field].length <= 1) {
      alert("⚠️ La liste doit contenir au moins une option par défaut.");
      return;
    }
    if (confirm(`Souhaitez-vous retirer "${value}" de la liste des ${field} ? Les données existantes utilisant cette valeur ne seront pas altérées.`)) {
      onUpdateSettings({
        listes: {
          ...settings.listes,
          [field]: settings.listes[field].filter(x => x !== value)
        }
      });
    }
  };

  // Import Handler
  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'Technicien') {
      alert("🔐 Accès refusé : Seuls les Managers peuvent restaurer une sauvegarde de données.");
      return;
    }
    if (!backupText.trim()) {
      setImportStatus({ type: 'error', msg: 'Le champ de sauvegarde est vide.' });
      return;
    }

    const success = onImportBackup(backupText);
    if (success) {
      logSecurityAction("Restauration de Sauvegarde", "Restauration complète de la base de données depuis un fichier JSON.", "eleve");
      setImportStatus({ type: 'success', msg: 'Base de données restaurée avec succès ! Rechargement en cours.' });
      setBackupText('');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      setImportStatus({ type: 'error', msg: 'Format de fichier de sauvegarde non valide ou corrompu.' });
    }
  };

  // Export Trigger
  const handleExport = () => {
    try {
      const dataStr = onExportBackup();
      logSecurityAction("Export de Données", "Téléchargement d'un export de sauvegarde complet de la base de données (Format JSON).", "faible");
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `GMAO-PRO-BACKUP-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      alert("Une erreur est survenue lors de l'exportation des données.");
    }
  };

  // Database Reset Trigger
  const handlePurge = () => {
    if (userRole === 'Technicien') {
      alert("🔐 Accès refusé : Seuls les Managers peuvent réinitialiser la base de données.");
      return;
    }
    if (confirm("⚠️ ATTENTION : Vous allez réinitialiser l'intégralité de l'application GMAO PRO aux valeurs de démonstration d'usine. Tous vos bons de travail récents, nouvelles machines et mouvements de stock seront définitivement effacés. Confirmer ?")) {
      logSecurityAction("Réinitialisation Base", "Purge complète et réinitialisation de la base de données aux valeurs de démonstration d'usine.", "eleve");
      onResetDatabase();
      alert("Base de données réinitialisée ! Rechargement de l'application.");
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* RESTRICTED ACCESS BANNER */}
      {userRole === 'Technicien' && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in">
          <div className="p-2 rounded-lg bg-amber-500 text-white mt-0.5">
            <Lock size={16} />
          </div>
          <div className="flex-1 text-xs">
            <h3 className="font-extrabold text-amber-800 dark:text-amber-200 text-sm">Mode Lecture Seule (Accès Technicien)</h3>
            <p className="text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
              Votre rôle actuel est défini sur <strong>Technicien</strong>. Vous pouvez consulter les réglages d'ergonomie visuelle, mais la modification de la configuration globale (ateliers, spécialités, fabricants), l'import/restauration de sauvegardes et la purge des bases de données sont réservées aux <strong>Managers</strong>.
            </p>
            <p className="text-amber-600 dark:text-amber-400 mt-1.5 font-semibold">
              💡 Astuce : Utilisez le sélecteur de rôle en haut de l'écran pour basculer sur le rôle <strong>Manager</strong>.
            </p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-display font-bold text-primary-900 dark:text-white">
          Réglages & Configuration
        </h1>
        <p className="text-sm text-primary-500 dark:text-primary-400 mt-1">
          Ajustez les listes d'options globales de votre atelier, modifiez l'accessibilité et sauvegardez votre base locale.
        </p>
      </div>

      {/* SUBTABS */}
      <div className="flex gap-2 p-1 bg-primary-100 dark:bg-primary-900/50 rounded-xl w-fit flex-wrap">
        <button
          onClick={() => {
            setActiveSubTab('referentiel');
            logSecurityAction("Consultation Référentiel", "Consultation de l'interface CRUD centralisée du référentiel.", "faible");
          }}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${activeSubTab === 'referentiel' ? 'bg-white dark:bg-primary-800 text-primary-900 dark:text-white shadow-sm border border-indigo-100 dark:border-indigo-950' : 'text-primary-500 hover:text-primary-700'}`}
        >
          <Settings size={12} className="text-primary-500" />
          Référentiel (CRUD)
        </button>
        <button
          onClick={() => setActiveSubTab('options')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${activeSubTab === 'options' ? 'bg-white dark:bg-primary-800 text-primary-900 dark:text-white shadow-sm' : 'text-primary-500 hover:text-primary-700'}`}
        >
          Listes Déroulantes
        </button>
        <button
          onClick={() => setActiveSubTab('access')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${activeSubTab === 'access' ? 'bg-white dark:bg-primary-800 text-primary-900 dark:text-white shadow-sm' : 'text-primary-500 hover:text-primary-700'}`}
        >
          Accessibilité / Raccourcis
        </button>
        <button
          onClick={() => setActiveSubTab('data')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${activeSubTab === 'data' ? 'bg-white dark:bg-primary-800 text-primary-900 dark:text-white shadow-sm' : 'text-primary-500 hover:text-primary-700'}`}
        >
          Sauvegarde JSON
        </button>
        <button
          onClick={() => setActiveSubTab('csv')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${activeSubTab === 'csv' ? 'bg-white dark:bg-primary-800 text-primary-900 dark:text-white shadow-sm' : 'text-primary-500 hover:text-primary-700'}`}
        >
          Import / Export CSV (Excel)
        </button>
        <button
          onClick={() => {
            setActiveSubTab('competences');
            logSecurityAction("Consultation Compétences", "Consultation de la gestion des compétences des techniciens par l'administrateur.", "faible");
          }}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${activeSubTab === 'competences' ? 'bg-white dark:bg-primary-800 text-primary-900 dark:text-white shadow-sm border border-indigo-100 dark:border-indigo-950' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-700'}`}
        >
          <Award size={12} className="text-amber-500 animate-pulse" />
          Compétences Techniciens
        </button>
        <button
          onClick={() => {
            setActiveSubTab('notifications');
            logSecurityAction("Consultation Notifications", "Consultation des préférences de notification des techniciens par l'administrateur.", "faible");
          }}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${activeSubTab === 'notifications' ? 'bg-white dark:bg-primary-800 text-primary-900 dark:text-white shadow-sm border border-orange-100 dark:border-orange-950' : 'text-orange-600 dark:text-orange-400 hover:bg-orange-50/50 hover:text-orange-700'}`}
        >
          <Bell size={12} className="text-orange-500" />
          Alertes & Notifications
        </button>
        <button
          id="tab-security"
          onClick={() => {
            setActiveSubTab('security');
            logSecurityAction("Consultation Journal", "Consultation du journal d'audit de sécurité des données par l'administrateur.", "faible");
          }}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${activeSubTab === 'security' ? 'bg-white dark:bg-primary-800 text-primary-900 dark:text-white shadow-sm border border-indigo-100 dark:border-indigo-950' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-700'}`}
        >
          <Lock size={12} className="text-indigo-500" />
          Audit de Sécurité
        </button>
      </div>

      {/* SUBTAB: REFERENTIEL CRUD MANAGER */}
      {activeSubTab === 'referentiel' && (
        <GestionReferentiel
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          interventions={interventions}
          userRole={userRole}
        />
      )}

      {/* SUBTAB 1 : DROPDOWN OPTIONS LISTS CUSTOMIZER */}
      {activeSubTab === 'options' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ATELIERS EDITOR */}
          <div className="card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-500">
              Liste des Ateliers d'Imputation
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={userRole === 'Technicien' ? "Accès restreint aux Managers" : "Nouvel Atelier..."}
                value={newAtelier}
                onChange={e => setNewAtelier(e.target.value)}
                disabled={userRole === 'Technicien'}
                className="text-xs disabled:opacity-50 disabled:bg-primary-100 dark:disabled:bg-primary-950/40"
              />
              <button
                onClick={() => handleAddListOption('ateliers', newAtelier, setNewAtelier)}
                disabled={userRole === 'Technicien'}
                className="btn-primary py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              {[...settings.listes.ateliers].sort((a, b) => a.localeCompare(b)).map(a => (
                <div key={a} className="flex justify-between items-center text-xs p-1.5 bg-white dark:bg-primary-950 rounded border">
                  <span className="font-semibold">{a}</span>
                  <button
                    onClick={() => handleRemoveListOption('ateliers', a)}
                    disabled={userRole === 'Technicien'}
                    className={`text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={userRole === 'Technicien' ? "Modification réservée aux Managers" : "Retirer de la liste"}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* METIERS EDITOR */}
          <div className="card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-500">
              Spécialités Techniques (Métiers)
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={userRole === 'Technicien' ? "Accès restreint aux Managers" : "Nouveau Métier..."}
                value={newMetier}
                onChange={e => setNewMetier(e.target.value)}
                disabled={userRole === 'Technicien'}
                className="text-xs disabled:opacity-50 disabled:bg-primary-100 dark:disabled:bg-primary-950/40"
              />
              <button
                onClick={() => handleAddListOption('metiers', newMetier, setNewMetier)}
                disabled={userRole === 'Technicien'}
                className="btn-primary py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              {[...settings.listes.metiers].sort((a, b) => a.localeCompare(b)).map(m => (
                <div key={m} className="flex justify-between items-center text-xs p-1.5 bg-white dark:bg-primary-950 rounded border">
                  <span className="font-semibold">{m}</span>
                  <button
                    onClick={() => handleRemoveListOption('metiers', m)}
                    disabled={userRole === 'Technicien'}
                    className={`text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={userRole === 'Technicien' ? "Modification réservée aux Managers" : "Retirer de la liste"}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* MARQUES EDITOR */}
          <div className="card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-500">
              Fabricants / Marques agréées
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={userRole === 'Technicien' ? "Accès restreint aux Managers" : "Nouveau Fabricant..."}
                value={newMarque}
                onChange={e => setNewMarque(e.target.value)}
                disabled={userRole === 'Technicien'}
                className="text-xs disabled:opacity-50 disabled:bg-primary-100 dark:disabled:bg-primary-950/40"
              />
              <button
                onClick={() => handleAddListOption('marques', newMarque, setNewMarque)}
                disabled={userRole === 'Technicien'}
                className="btn-primary py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              {[...settings.listes.marques].sort((a, b) => a.localeCompare(b)).map(m => (
                <div key={m} className="flex justify-between items-center text-xs p-1.5 bg-white dark:bg-primary-950 rounded border">
                  <span className="font-semibold">{m}</span>
                  <button
                    onClick={() => handleRemoveListOption('marques', m)}
                    disabled={userRole === 'Technicien'}
                    className={`text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={userRole === 'Technicien' ? "Modification réservée aux Managers" : "Retirer de la liste"}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* STATUTS EDITOR */}
          <div className="card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-500">
              Statuts des Interventions (États)
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={userRole === 'Technicien' ? "Accès restreint aux Managers" : "Nouveau Statut..."}
                value={newEtat}
                onChange={e => setNewEtat(e.target.value)}
                disabled={userRole === 'Technicien'}
                className="text-xs disabled:opacity-50 disabled:bg-primary-100 dark:disabled:bg-primary-950/40"
              />
              <button
                onClick={() => handleAddListOption('etats', newEtat, setNewEtat)}
                disabled={userRole === 'Technicien'}
                className="btn-primary py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              {[...(settings.listes.etats || [])].sort((a, b) => a.localeCompare(b)).map(e => (
                <div key={e} className="flex justify-between items-center text-xs p-1.5 bg-white dark:bg-primary-950 rounded border">
                  <span className="font-semibold">{e}</span>
                  <button
                    onClick={() => handleRemoveListOption('etats', e)}
                    disabled={userRole === 'Technicien'}
                    className={`text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={userRole === 'Technicien' ? "Modification réservée aux Managers" : "Retirer de la liste"}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* URGENCES EDITOR */}
          <div className="card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-500">
              Niveaux d'Urgence
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={userRole === 'Technicien' ? "Accès restreint aux Managers" : "Nouvelle Urgence..."}
                value={newUrgence}
                onChange={e => setNewUrgence(e.target.value)}
                disabled={userRole === 'Technicien'}
                className="text-xs disabled:opacity-50 disabled:bg-primary-100 dark:disabled:bg-primary-950/40"
              />
              <button
                onClick={() => handleAddListOption('urgences', newUrgence, setNewUrgence)}
                disabled={userRole === 'Technicien'}
                className="btn-primary py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              {[...(settings.listes.urgences || [])].sort((a, b) => a.localeCompare(b)).map(u => (
                <div key={u} className="flex justify-between items-center text-xs p-1.5 bg-white dark:bg-primary-950 rounded border">
                  <span className="font-semibold">{u}</span>
                  <button
                    onClick={() => handleRemoveListOption('urgences', u)}
                    disabled={userRole === 'Technicien'}
                    className={`text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={userRole === 'Technicien' ? "Modification réservée aux Managers" : "Retirer de la liste"}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* EFFETS EDITOR */}
          <div className="card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-500">
              Effets / Criticité de Panne
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={userRole === 'Technicien' ? "Accès restreint aux Managers" : "Nouvel Effet..."}
                value={newEffet}
                onChange={e => setNewEffet(e.target.value)}
                disabled={userRole === 'Technicien'}
                className="text-xs disabled:opacity-50 disabled:bg-primary-100 dark:disabled:bg-primary-950/40"
              />
              <button
                onClick={() => handleAddListOption('effets', newEffet, setNewEffet)}
                disabled={userRole === 'Technicien'}
                className="btn-primary py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              {[...(settings.listes.effets || [])].sort((a, b) => a.localeCompare(b)).map(eff => (
                <div key={eff} className="flex justify-between items-center text-xs p-1.5 bg-white dark:bg-primary-950 rounded border">
                  <span className="font-semibold">{eff}</span>
                  <button
                    onClick={() => handleRemoveListOption('effets', eff)}
                    disabled={userRole === 'Technicien'}
                    className={`text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={userRole === 'Technicien' ? "Modification réservée aux Managers" : "Retirer de la liste"}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ACTIVITES EDITOR */}
          <div className="card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-500">
              Activités de Maintenance
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={userRole === 'Technicien' ? "Accès restreint aux Managers" : "Nouvelle Activité..."}
                value={newActivite}
                onChange={e => setNewActivite(e.target.value)}
                disabled={userRole === 'Technicien'}
                className="text-xs disabled:opacity-50 disabled:bg-primary-100 dark:disabled:bg-primary-950/40"
              />
              <button
                onClick={() => handleAddListOption('activites', newActivite, setNewActivite)}
                disabled={userRole === 'Technicien'}
                className="btn-primary py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              {[...(settings.listes.activites || [])].sort((a, b) => a.localeCompare(b)).map(act => (
                <div key={act} className="flex justify-between items-center text-xs p-1.5 bg-white dark:bg-primary-950 rounded border">
                  <span className="font-semibold">{act}</span>
                  <button
                    onClick={() => handleRemoveListOption('activites', act)}
                    disabled={userRole === 'Technicien'}
                    className={`text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={userRole === 'Technicien' ? "Modification réservée aux Managers" : "Retirer de la liste"}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* TECHNOLOGIES EDITOR */}
          <div className="card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-500">
              Technologies / Organes
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={userRole === 'Technicien' ? "Accès restreint aux Managers" : "Nouvelle Technologie..."}
                value={newTechnologie}
                onChange={e => setNewTechnologie(e.target.value)}
                disabled={userRole === 'Technicien'}
                className="text-xs disabled:opacity-50 disabled:bg-primary-100 dark:disabled:bg-primary-950/40"
              />
              <button
                onClick={() => handleAddListOption('technologies', newTechnologie, setNewTechnologie)}
                disabled={userRole === 'Technicien'}
                className="btn-primary py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              {[...(settings.listes.technologies || [])].sort((a, b) => a.localeCompare(b)).map(tech => (
                <div key={tech} className="flex justify-between items-center text-xs p-1.5 bg-white dark:bg-primary-950 rounded border">
                  <span className="font-semibold">{tech}</span>
                  <button
                    onClick={() => handleRemoveListOption('technologies', tech)}
                    disabled={userRole === 'Technicien'}
                    className={`text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={userRole === 'Technicien' ? "Modification réservée aux Managers" : "Retirer de la liste"}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* CAUSES EDITOR */}
          <div className="card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-500">
              Causes de Panne
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={userRole === 'Technicien' ? "Accès restreint aux Managers" : "Nouvelle Cause..."}
                value={newCause}
                onChange={e => setNewCause(e.target.value)}
                disabled={userRole === 'Technicien'}
                className="text-xs disabled:opacity-50 disabled:bg-primary-100 dark:disabled:bg-primary-950/40"
              />
              <button
                onClick={() => handleAddListOption('causes', newCause, setNewCause)}
                disabled={userRole === 'Technicien'}
                className="btn-primary py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              {[...(settings.listes.causes || [])].sort((a, b) => a.localeCompare(b)).map(c => (
                <div key={c} className="flex justify-between items-center text-xs p-1.5 bg-white dark:bg-primary-950 rounded border">
                  <span className="font-semibold">{c}</span>
                  <button
                    onClick={() => handleRemoveListOption('causes', c)}
                    disabled={userRole === 'Technicien'}
                    className={`text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={userRole === 'Technicien' ? "Modification réservée aux Managers" : "Retirer de la liste"}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* REMEDES EDITOR */}
          <div className="card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-500">
              Remèdes / Solutions
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={userRole === 'Technicien' ? "Accès restreint aux Managers" : "Nouveau Remède..."}
                value={newRemede}
                onChange={e => setNewRemede(e.target.value)}
                disabled={userRole === 'Technicien'}
                className="text-xs disabled:opacity-50 disabled:bg-primary-100 dark:disabled:bg-primary-950/40"
              />
              <button
                onClick={() => handleAddListOption('remedes', newRemede, setNewRemede)}
                disabled={userRole === 'Technicien'}
                className="btn-primary py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              {[...(settings.listes.remedes || [])].sort((a, b) => a.localeCompare(b)).map(rem => (
                <div key={rem} className="flex justify-between items-center text-xs p-1.5 bg-white dark:bg-primary-950 rounded border">
                  <span className="font-semibold">{rem}</span>
                  <button
                    onClick={() => handleRemoveListOption('remedes', rem)}
                    disabled={userRole === 'Technicien'}
                    className={`text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={userRole === 'Technicien' ? "Modification réservée aux Managers" : "Retirer de la liste"}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* IMPUTATIONS EDITOR */}
          <div className="card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-500">
              Imputations Budgétaires / Centres de coûts
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={userRole === 'Technicien' ? "Accès restreint aux Managers" : "Nouvelle Imputation..."}
                value={newImputation}
                onChange={e => setNewImputation(e.target.value)}
                disabled={userRole === 'Technicien'}
                className="text-xs disabled:opacity-50 disabled:bg-primary-100 dark:disabled:bg-primary-950/40"
              />
              <button
                onClick={() => handleAddListOption('imputations', newImputation, setNewImputation)}
                disabled={userRole === 'Technicien'}
                className="btn-primary py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              {[...(settings.listes.imputations || [])].sort((a, b) => a.localeCompare(b)).map(imp => (
                <div key={imp} className="flex justify-between items-center text-xs p-1.5 bg-white dark:bg-primary-950 rounded border">
                  <span className="font-semibold">{imp}</span>
                  <button
                    onClick={() => handleRemoveListOption('imputations', imp)}
                    disabled={userRole === 'Technicien'}
                    className={`text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={userRole === 'Technicien' ? "Modification réservée aux Managers" : "Retirer de la liste"}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2 : ACCESSIBILITY & SHORTCUTS */}
      {activeSubTab === 'access' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary-800 dark:text-primary-200 border-b pb-2 flex items-center gap-1.5">
              <Accessibility size={18} className="text-accent-orange" />
              Réglages Ergonomie visuelle
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-primary-50 dark:bg-primary-900/30 rounded-lg border">
                <div>
                  <span className="font-bold block">Mode d'affichage (Thème)</span>
                  <p className="text-[10px] text-primary-400">
                    Basculez entre le mode Clair, Sombre ou Adaptatif (recommandé : Clair sur Mobile, Sombre sur PC).
                  </p>
                </div>
                <select
                  value={settings.themeMode || 'adaptive'}
                  onChange={e => onUpdateSettings({ themeMode: e.target.value as any })}
                  className="w-40 p-1 text-xs bg-white dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded text-primary-800 dark:text-primary-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="adaptive">🌐 Adaptatif (PC Sombre / Mobile Clair)</option>
                  <option value="light">☀️ Mode Clair permanent</option>
                  <option value="dark">🌙 Mode Sombre permanent</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-primary-50 dark:bg-primary-900/30 rounded-lg border">
                <div>
                  <span className="font-bold block">Thème Contraste Élevé (Accessibility)</span>
                  <p className="text-[10px] text-primary-400">Renforce les contrastes des bordures et la lisibilité du texte.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.themeContraste === 'eleve'}
                  onChange={e => onUpdateSettings({ themeContraste: e.target.checked ? 'eleve' : 'normal' })}
                  className="h-5 w-5 accent-accent-orange cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-primary-50 dark:bg-primary-900/30 rounded-lg border">
                <div>
                  <span className="font-bold block">Taille Globale de Police</span>
                  <p className="text-[10px] text-primary-400">Ajustez l'échelle de lisibilité de la typographie de l'interface.</p>
                </div>
                <select
                  value={settings.taillePolice}
                  onChange={e => onUpdateSettings({ taillePolice: e.target.value as any })}
                  className="w-24 p-1 text-xs"
                >
                  <option value="sm">Petite</option>
                  <option value="md">Standard</option>
                  <option value="lg">Grande</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary-800 dark:text-primary-200 border-b pb-2 flex items-center gap-1.5">
              <Keyboard size={18} className="text-indigo-500" />
              Personnalisation des Raccourcis Clavier
            </h3>

            <div className="text-xs space-y-4">
              <p className="text-primary-500">
                Personnalisez les raccourcis d'une seule touche pour naviguer instantanément entre les modules (laissez vide pour désactiver) :
              </p>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {Object.keys(MODULE_SHORTCUT_LABELS).map((moduleKey) => {
                  const meta = MODULE_SHORTCUT_LABELS[moduleKey];
                  const value = localShortcuts[moduleKey] || '';
                  
                  // Check for duplicate keys
                  const isDuplicate = Object.entries(localShortcuts).some(
                    ([mk, key]) => mk !== moduleKey && typeof key === 'string' && key !== '' && key.toLowerCase() === value.toLowerCase()
                  );

                  return (
                    <div key={moduleKey} className="flex items-center justify-between p-2 rounded-xl bg-primary-50/50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-850">
                      <div>
                        <span className="font-bold text-primary-900 dark:text-white block">{meta.label}</span>
                        <span className="text-[10px] text-primary-400">{meta.desc}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isDuplicate && value && (
                          <span className="text-[10px] text-red-500 font-bold" title="Touche en doublon !">⚠️ Doublon</span>
                        )}
                        <input
                          type="text"
                          maxLength={1}
                          value={value}
                          onChange={(e) => handleShortcutChange(moduleKey, e.target.value)}
                          className={`w-12 h-9 text-center font-mono font-bold text-sm bg-white dark:bg-primary-950 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-primary-900 dark:text-white uppercase ${isDuplicate && value ? 'border-red-500 focus:ring-red-500 bg-red-500/5' : 'border-primary-200 dark:border-primary-800'}`}
                          placeholder="-"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

<div className="flex gap-2.5 pt-2">
                {canRaccourcis && (
                <button
                  type="button"
                  onClick={handleSaveShortcuts}
                  className="btn-primary py-2 text-xs font-bold shrink-0 cursor-pointer bg-indigo-600 hover:bg-indigo-700"
                >
                  <Check size={14} /> Enregistrer
                </button>
                )}
                {canRaccourcis && (
                <button
                  type="button"
                  onClick={handleResetShortcuts}
                  className="px-3.5 py-2 text-xs font-bold text-primary-600 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-850 rounded-xl transition cursor-pointer"
                >
                  Défauts
                </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3 : BACKUPS & RESTORE DATA */}
      {activeSubTab === 'data' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Export Box */}
          <div className="card text-center space-y-4 md:col-span-1">
            <Database size={36} className="text-emerald-500 mx-auto" />
            <h3 className="font-bold text-sm text-primary-800 dark:text-primary-200">Exportation Globale</h3>
            <p className="text-[11px] text-primary-500 leading-relaxed">
              Exportez d'un clic l'ensemble de votre base locale (paramètres, nomenclatures, historiques d'intervention) sous la forme d'un fichier JSON.
            </p>
{canImportExportParams && (
            <button
              onClick={handleExport}
              className="btn-primary justify-center w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Download size={14} /> Télécharger la sauvegarde
            </button>
            )}
          </div>

          {/* Import Box */}
          <div className="card space-y-4 md:col-span-2">
            <h3 className="font-bold text-sm text-primary-800 dark:text-primary-200 flex items-center gap-1.5">
              <Upload size={16} className="text-indigo-500" /> Restaurer une sauvegarde
            </h3>

            <form onSubmit={handleImport} className="space-y-3 text-xs">
              <div>
                <label>Collez ici le contenu JSON complet de votre sauvegarde :</label>
                <textarea
                  required
                  rows={4}
                  value={backupText}
                  onChange={e => setBackupText(e.target.value)}
placeholder={!canImportExportParams ? "Action réservée aux Managers" : '{"GMAO_SETTINGS": ..., "GMAO_EQUIPEMENTS": ...}'}
                  disabled={!canImportExportParams}
                  className="font-mono text-[10px] bg-primary-50 disabled:opacity-50"
                />
              </div>

              {importStatus.type !== 'idle' && (
                <div className={`p-2.5 rounded-lg border text-xs font-semibold ${importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {importStatus.type === 'success' ? <CheckCircle size={14} className="inline mr-1" /> : null}
                  {importStatus.msg}
                </div>
              )}

              <button
                type="submit"
                disabled={!canImportExportParams}
                className="btn-primary w-full justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Démarrer la restauration
              </button>
            </form>
          </div>

          {/* Purge Factory Box */}
          <div className="card md:col-span-3 border-l-4 border-l-red-500 bg-red-50/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-red-600">Réinitialisation complète d'usine (Hard reset)</h3>
              <p className="text-xs text-primary-500 dark:text-primary-400 mt-1 max-w-2xl leading-relaxed">
                Efface l'intégralité du stockage local de votre navigateur et restaure les données de démonstration initiales (parc machine type, pièces détachées standards et d'historique de maintenance).
              </p>
            </div>
            <button
              onClick={handlePurge}
              disabled={!canPurger}
              className="btn-primary bg-red-600 hover:bg-red-700 justify-center whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={14} /> {!canPurger ? "Réinitialisation désactivée" : "Purger et Réinitialiser"}
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 4 : EXCEL & CSV METIER IMPORTS/EXPORTS */}
      {activeSubTab === 'csv' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          {/* Left Block: File Dropzone & Importation Panel (7 cols on desktop) */}
          <div className="card space-y-6 lg:col-span-7">
            <div>
              <h2 className="text-base font-display font-bold text-primary-800 dark:text-white flex items-center gap-2">
                <Upload size={18} className="text-accent-orange animate-bounce" />
                Importateur de Fichiers Métier (CSV / Excel)
              </h2>
              <p className="text-xs text-primary-400 mt-1">
                Importez vos nomenclatures machines, historiques de maintenance ou stocks pièces détachées directement depuis vos feuilles de calcul.
              </p>
            </div>

            {/* Selection of Category and Reconciliation mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-primary-50 dark:bg-primary-900/10 p-4 rounded-xl border border-primary-100 dark:border-primary-800">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-primary-500">Nature des données</label>
                <select
                  value={csvType}
                  onChange={e => {
                    setCsvType(e.target.value as any);
                    setValidationReport(null);
                    setParsedRows([]);
                    setParsedHeaders([]);
                    setImportResult(null);
                  }}
                  className="w-full text-xs p-2 rounded-lg border bg-white dark:bg-primary-950 text-primary-800 dark:text-primary-100"
                >
                  <option value="pieces">📦 Articles Magasin (Pièces détachées)</option>
                  <option value="interventions">🛠️ Bons de Travail (Historique BT)</option>
                  <option value="equipements">🚜 Équipements & Parc Machines</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-primary-500">Mode de réconciliation</label>
                <div className="flex gap-2 h-9 items-center">
                  <button
                    type="button"
                    onClick={() => setImportMethod('merge')}
                    className={`flex-1 text-[11px] font-bold py-2 rounded-lg border text-center transition ${importMethod === 'merge' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 shadow-sm' : 'bg-white dark:bg-primary-950 text-primary-500'}`}
                  >
                    Fusionner (Ajout/Maj)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMethod('replace')}
                    className={`flex-1 text-[11px] font-bold py-2 rounded-lg border text-center transition ${importMethod === 'replace' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 shadow-sm' : 'bg-white dark:bg-primary-950 text-primary-500'}`}
                  >
                    Écraser & Remplacer
                  </button>
                </div>
              </div>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition relative overflow-hidden group ${dragActive ? 'border-accent-orange bg-accent-orange/5' : 'border-primary-200 dark:border-primary-800 hover:border-primary-400 bg-white dark:bg-primary-900/20'}`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept=".csv"
                className="hidden"
              />
              <FileSpreadsheet size={36} className="text-primary-300 dark:text-primary-700 mx-auto mb-3 group-hover:scale-110 transition" />
              <p className="text-xs font-semibold text-primary-800 dark:text-primary-200">
                Glissez-déposez votre fichier <span className="text-accent-orange font-bold font-sans">.CSV</span> ici
              </p>
              <p className="text-[10px] text-primary-400 mt-1">
                Ou cliquez pour parcourir les dossiers (Délimiteur : virgule ou point-virgule)
              </p>
            </div>

            {/* Live feedback results */}
            {importResult && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-2 animate-fade-in">
                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <CheckCircle size={16} className="text-emerald-500" />
                  Importation finalisée avec succès !
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
                  <div className="p-2 bg-white dark:bg-primary-900 rounded border border-primary-100 dark:border-primary-800">
                    <span className="block text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">{importResult.added}</span>
                    <span className="text-[10px] text-primary-400 font-medium">Créés</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-primary-900 rounded border border-primary-100 dark:border-primary-800">
                    <span className="block text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400">{importResult.updated}</span>
                    <span className="text-[10px] text-primary-400 font-medium">Mis à jour</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-primary-900 rounded border border-primary-100 dark:border-primary-800">
                    <span className="block text-lg font-mono font-bold text-red-500">{importResult.errors}</span>
                    <span className="text-[10px] text-primary-400 font-medium">Erreurs</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pre-validation Report and Preview */}
            {validationReport && (
              <div className="space-y-4 border-t border-primary-100 dark:border-primary-800 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary-500 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-500" />
                    Rapport de Pré-Validation
                  </h3>
                  <div className="flex gap-2 text-[10px] font-bold">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 rounded">
                      {validationReport.valid} Lignes Valides
                    </span>
                    {validationReport.invalid > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-950/40 rounded">
                        {validationReport.invalid} Ignorées
                      </span>
                    )}
                  </div>
                </div>

                {/* Warnings List */}
                {validationReport.warnings.length > 0 && (
                  <div className="max-h-24 overflow-y-auto p-2 bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-lg text-[10px] text-amber-700 space-y-1">
                    {validationReport.warnings.map((w, i) => (
                      <div key={i} className="flex gap-1.5 items-start">
                        <AlertCircle size={10} className="mt-0.5 shrink-0" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Micro preview table of the first 3 lines */}
                {validationReport.itemsToImport.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-primary-400">Aperçu des premières fiches détectées :</span>
                    <div className="overflow-x-auto border border-primary-100 dark:border-primary-800 rounded-lg bg-primary-50/50 dark:bg-primary-950/10">
                      <table className="w-full text-left text-[10px] border-collapse">
                        <thead>
                          <tr className="bg-primary-100/60 dark:bg-primary-900 border-b border-primary-200 dark:border-primary-800">
                            {parsedHeaders.slice(0, 5).map((h, i) => (
                              <th key={i} className="p-2 font-bold text-primary-600 truncate">{h}</th>
                            ))}
                            {parsedHeaders.length > 5 && <th className="p-2 font-bold text-primary-600">...</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-primary-100 dark:divide-primary-800">
                          {validationReport.itemsToImport.slice(0, 3).map((item, rowIdx) => (
                            <tr key={rowIdx}>
                              {parsedHeaders.slice(0, 5).map((h, i) => {
                                const val = String(item[h] || item[Object.keys(item).find(k => k.toLowerCase() === h.toLowerCase()) || ''] || '');
                                return (
                                  <td key={i} className="p-2 truncate max-w-[120px] font-semibold text-primary-700 dark:text-primary-300">
                                    {val || '-'}
                                  </td>
                                );
                              })}
                              {parsedHeaders.length > 5 && <td className="p-2 text-primary-400 font-bold">...</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Trigger Import Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isImporting || validationReport.itemsToImport.length === 0 || userRole === 'Technicien'}
                    onClick={executeImport}
                    className={`btn-primary w-full justify-center text-xs py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 shadow-sm ${(isImporting || userRole === 'Technicien') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isImporting ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>
                      {userRole === 'Technicien' ? "Importation réservée aux Managers" : (importMethod === 'replace' ? '⚠️ Écraser tout et lancer l\'importation' : `Lancer l'importation de ${validationReport.itemsToImport.length} fiches`)}
                    </span>
                  </button>
                  {importMethod === 'replace' && (
                    <p className="text-[9px] text-red-500 text-center font-bold mt-1">
                      ⚠️ Le mode Écraser effacera irréversiblement toutes les fiches existantes de cette catégorie avant d'importer.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Block: Template Downloads & Live Export (5 cols on desktop) */}
          <div className="space-y-6 lg:col-span-5">
            {/* Template Card */}
            <div className="card space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary-500">
                  Modèles d'Importation Vierge (Gabarits)
                </h3>
                <p className="text-[10px] text-primary-400 mt-1">
                  Téléchargez ces modèles pour formater correctement vos données avant l'intégration.
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Equipement Template Download */}
                <div className="flex items-center justify-between p-2.5 bg-primary-50 dark:bg-primary-900/15 rounded-lg border border-primary-100 dark:border-primary-800 hover:bg-primary-100/30 transition">
                  <div>
                    <span className="font-bold block text-primary-800 dark:text-primary-200">Gabarit Équipements</span>
                    <span className="text-[9px] text-primary-400 font-medium">Pour fiches machines & parc</span>
                  </div>
                  <button
                    onClick={() => handleDownloadTemplate('equipements')}
                    className="p-1.5 hover:bg-white dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded text-primary-600 hover:text-primary-900 transition flex items-center gap-1 bg-white dark:bg-primary-800 shadow-sm"
                  >
                    <Download size={13} />
                    <span className="text-[10px] font-bold">Gabarit</span>
                  </button>
                </div>

                {/* Interventions Template Download */}
                <div className="flex items-center justify-between p-2.5 bg-primary-50 dark:bg-primary-900/15 rounded-lg border border-primary-100 dark:border-primary-800 hover:bg-primary-100/30 transition">
                  <div>
                    <span className="font-bold block text-primary-800 dark:text-primary-200">Gabarit Bons de Travail</span>
                    <span className="text-[9px] text-primary-400 font-medium">Historiques, pannes et DI</span>
                  </div>
                  <button
                    onClick={() => handleDownloadTemplate('interventions')}
                    className="p-1.5 hover:bg-white dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded text-primary-600 hover:text-primary-900 transition flex items-center gap-1 bg-white dark:bg-primary-800 shadow-sm"
                  >
                    <Download size={13} />
                    <span className="text-[10px] font-bold">Gabarit</span>
                  </button>
                </div>

                {/* Spare parts Template Download */}
                <div className="flex items-center justify-between p-2.5 bg-primary-50 dark:bg-primary-900/15 rounded-lg border border-primary-100 dark:border-primary-800 hover:bg-primary-100/30 transition">
                  <div>
                    <span className="font-bold block text-primary-800 dark:text-primary-200">Gabarit Magasin Pièces</span>
                    <span className="text-[9px] text-primary-400 font-medium">Stockages, casiers, seuils</span>
                  </div>
                  <button
                    onClick={() => handleDownloadTemplate('pieces')}
                    className="p-1.5 hover:bg-white dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded text-primary-600 hover:text-primary-900 transition flex items-center gap-1 bg-white dark:bg-primary-800 shadow-sm"
                  >
                    <Download size={13} />
                    <span className="text-[10px] font-bold">Gabarit</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Audits Externes & Exports Complets */}
            <div className="card space-y-4 border-l-4 border-l-indigo-500 dark:border-l-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/5">
              <div>
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[9px] font-bold uppercase rounded-full tracking-wider">
                  Audits & Conformité
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary-800 dark:text-white mt-1.5 flex items-center gap-1.5">
                  <Award size={14} className="text-indigo-500" />
                  Exports Complets d'Audit (CSV)
                </h3>
                <p className="text-[10px] text-primary-400 mt-1">
                  Générez des rapports complets pour faciliter les audits de maintenance réglementaires ou de certification ISO.
                </p>
              </div>

              <div className="space-y-3 text-xs pt-1">
                {/* Export complet séparé */}
                <div className="p-3 bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-extrabold block text-primary-800 dark:text-primary-100">Fichiers d'Audit Distincts</span>
                      <p className="text-[10px] text-primary-400 mt-0.5">Télécharge en un clic deux fichiers CSV séparés (Nomenclature du parc et Journal historique des BT).</p>
                    </div>
                  </div>
                  <button
                    onClick={handleExportCompletAudit}
                    className="w-full btn-primary bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 text-xs shadow-sm transition-all"
                  >
                    <Download size={14} />
                    <span>Exporter Parc & Interventions</span>
                  </button>
                </div>

                {/* Export d'Audit Consolidé (Jointé) */}
                <div className="p-3 bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-extrabold block text-primary-800 dark:text-primary-100">Registre d'Audit Consolidé</span>
                      <p className="text-[10px] text-primary-400 mt-0.5">Génère un fichier CSV plat combiné où chaque intervention est enrichie des détails techniques complets de sa machine (y compris machines sans historique).</p>
                    </div>
                  </div>
                  <button
                    onClick={handleExportConsolideAudit}
                    className="w-full btn-primary bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 text-xs shadow-sm transition-all"
                  >
                    <FileSpreadsheet size={14} />
                    <span>Télécharger le Registre Jointé</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Exports Card */}
            <div className="card space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary-500">
                  Exportations Métier Immédiates (CSV)
                </h3>
                <p className="text-[10px] text-primary-400 mt-1">
                  Récupérez vos listes de données réelles encodées en UTF-8 (compatible Excel et LibreOffice).
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Equipements CSV Export */}
                <div className="flex items-center justify-between p-2.5 bg-primary-50 dark:bg-primary-900/15 rounded-lg border border-primary-100 dark:border-primary-800 hover:bg-primary-100/30 transition">
                  <div>
                    <span className="font-bold block text-primary-800 dark:text-primary-200">Équipements</span>
                    <span className="text-[9px] text-primary-400 font-semibold font-mono text-indigo-500">{equipements.length} machines</span>
                  </div>
                  <button
                    onClick={() => handleExportCSV('equipements')}
                    className="p-1.5 hover:bg-white dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded text-emerald-600 hover:text-emerald-900 transition flex items-center gap-1 bg-white dark:bg-primary-800 shadow-sm"
                  >
                    <Download size={13} />
                    <span className="text-[10px] font-bold">CSV</span>
                  </button>
                </div>

                {/* Interventions CSV Export */}
                <div className="flex items-center justify-between p-2.5 bg-primary-50 dark:bg-primary-900/15 rounded-lg border border-primary-100 dark:border-primary-800 hover:bg-primary-100/30 transition">
                  <div>
                    <span className="font-bold block text-primary-800 dark:text-primary-200">Bons de Travail</span>
                    <span className="text-[9px] text-primary-400 font-semibold font-mono text-indigo-500">{interventions.length} BT / DI</span>
                  </div>
                  <button
                    onClick={() => handleExportCSV('interventions')}
                    className="p-1.5 hover:bg-white dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded text-emerald-600 hover:text-emerald-900 transition flex items-center gap-1 bg-white dark:bg-primary-800 shadow-sm"
                  >
                    <Download size={13} />
                    <span className="text-[10px] font-bold">CSV</span>
                  </button>
                </div>

                {/* Pieces CSV Export */}
                <div className="flex items-center justify-between p-2.5 bg-primary-50 dark:bg-primary-900/15 rounded-lg border border-primary-100 dark:border-primary-800 hover:bg-primary-100/30 transition">
                  <div>
                    <span className="font-bold block text-primary-800 dark:text-primary-200">Magasin & Stock</span>
                    <span className="text-[9px] text-primary-400 font-semibold font-mono text-indigo-500">{pieces.length} articles</span>
                  </div>
                  <button
                    onClick={() => handleExportCSV('pieces')}
                    className="p-1.5 hover:bg-white dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded text-emerald-600 hover:text-emerald-900 transition flex items-center gap-1 bg-white dark:bg-primary-800 shadow-sm"
                  >
                    <Download size={13} />
                    <span className="text-[10px] font-bold">CSV</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: TECHNICIAN COMPETENCIES */}
      {activeSubTab === 'competences' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          {/* LEFT COLUMN: Competencies Directory (5 cols) */}
          <div className="card space-y-4 lg:col-span-5 border border-primary-200 dark:border-primary-800">
            <div>
              <h3 className="text-base font-display font-bold text-primary-800 dark:text-white flex items-center gap-1.5">
                <Award size={18} className="text-amber-500 animate-pulse" />
                Répertoire des Compétences & Certifications
              </h3>
              <p className="text-xs text-primary-400 mt-1">
                Gérez le catalogue des compétences requises pour vos opérations de maintenance (Habilitations, Spécialités, Robots).
              </p>
            </div>

            {/* Input to add competence */}
<div className="flex gap-2">
              <input
                type="text"
                placeholder={!canCompetences ? "Modification réservée aux Managers" : "Nouvelle compétence (ex: Robotique ABB, Consign. Gaz)..."}
                value={newCompetence}
                onChange={e => setNewCompetence(e.target.value)}
                disabled={!canCompetences}
                className="text-xs flex-1 disabled:opacity-50 disabled:bg-primary-100 dark:disabled:bg-primary-950/40"
              />
              <button
                onClick={handleAddCompetence}
                disabled={!canCompetences || !newCompetence.trim()}
                className="btn-primary py-1.5 px-3.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center gap-1"
                title="Ajouter au catalogue"
              >
                <Plus size={14} />
                <span>Ajouter</span>
              </button>
            </div>

            {/* Competency list */}
            <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto pr-1">
              {competencesList.length === 0 ? (
                <div className="text-center py-8 text-primary-400 text-xs font-medium bg-primary-50/50 dark:bg-primary-950/10 rounded-xl border border-dashed">
                  Aucune compétence enregistrée. Créez-en une ci-dessus.
                </div>
              ) : (
                competencesList.map(skill => {
                  // Count how many techs have this skill
                  const countTechs = Object.values(competencesTechniciens).filter(skills => skills.includes(skill)).length;
                  
                  return (
                    <div
                      key={skill}
                      className="flex items-center justify-between p-2.5 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-800/60 hover:border-primary-300 dark:hover:border-primary-700 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-600">
                          <Award size={14} />
                        </span>
                        <div>
                          <span className="text-xs font-semibold text-primary-800 dark:text-primary-200">{skill}</span>
                          <span className="block text-[9px] text-primary-400 font-medium mt-0.5">
                            {countTechs === 0 ? "Aucun technicien qualifié" : `${countTechs} technicien(s) qualifié(s)`}
                          </span>
                        </div>
                      </div>
<button
                        onClick={() => handleRemoveCompetence(skill)}
                        disabled={!canCompetences}
                        className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"
                        title={!canCompetences ? "Accès restreint" : "Supprimer la compétence"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Technicians Matrix (7 cols) */}
          <div className="card space-y-4 lg:col-span-7 border border-primary-200 dark:border-primary-800">
            <div>
              <h3 className="text-base font-display font-bold text-primary-800 dark:text-white flex items-center gap-1.5">
                <User size={18} className="text-indigo-500" />
                Matrice des Habilitations par Technicien
              </h3>
              <p className="text-xs text-primary-400 mt-1">
                Associez des compétences aux membres de votre équipe pour que le système les suggère automatiquement lors de la planification des BT.
              </p>
            </div>

            {/* Grid of technicians */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {[...settings.listes.operateurs].sort((a, b) => a.localeCompare(b)).map(techName => {
                const techSkills = competencesTechniciens[techName] || [];
                
                return (
                  <div
                    key={techName}
                    className="p-4 bg-primary-50/50 dark:bg-primary-900/10 rounded-xl border border-primary-100 dark:border-primary-800 flex flex-col justify-between animate-fade-in"
                  >
                    <div>
                      {/* Tech Header */}
                      <div className="flex items-center gap-2 pb-3 border-b border-primary-100 dark:border-primary-800/60">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                          {techName.substring(0, 2)}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-primary-800 dark:text-primary-100 block">{techName}</span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-[9px] font-bold text-indigo-600 mt-0.5">
                            {techSkills.length} active(s)
                          </span>
                        </div>
                      </div>

                      {/* Tech Skills Badges Checklist */}
                      <div className="mt-4 space-y-1.5">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-primary-400 block mb-2">Qualifications :</span>
                        
                        {competencesList.length === 0 ? (
                          <span className="text-[10px] text-primary-400 font-medium italic">Ajoutez d'abord des compétences globales</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {competencesList.map(skill => {
                              const hasSkill = techSkills.includes(skill);
                              return (
<button
                                  key={skill}
                                  onClick={() => handleToggleTechSkill(techName, skill)}
                                  disabled={!canCompetences}
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition border ${
                                    hasSkill
                                      ? "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-900/40 font-bold"
                                      : "bg-white dark:bg-primary-800 text-primary-400 dark:text-primary-500 border-primary-200 dark:border-primary-700/60 hover:bg-primary-100/30"
                                  } ${!canCompetences ? 'cursor-not-allowed opacity-70' : ''}`}
                                  title={!canCompetences ? "Lecture seule" : `Cliquer pour ${hasSkill ? 'retirer' : 'ajouter'} cette compétence`}
                                >
                                  {skill}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: NOTIFICATIONS PREFERENCES */}
      {activeSubTab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          {/* LEFT COLUMN: Technicians list (5 cols) */}
          <div className="card space-y-4 lg:col-span-5 border border-primary-200 dark:border-primary-800">
            <div>
              <h3 className="text-base font-display font-bold text-primary-800 dark:text-white flex items-center gap-1.5">
                <User size={18} className="text-orange-500" />
                Membres de l'Équipe
              </h3>
              <p className="text-xs text-primary-400 mt-1">
                Sélectionnez un technicien ou administrateur pour configurer ses plages de réception d'alertes push critiques.
              </p>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {[...settings.listes.operateurs].sort((a, b) => a.localeCompare(b)).map(techName => {
                const isSelected = (selectedTech || settings.listes.operateurs[0]) === techName;
                const techPrefs = settings.notificationPreferences?.[techName];
                const isConfigured = !!techPrefs;
                const isEnabled = techPrefs ? techPrefs.enabled : true;
                const start = techPrefs ? techPrefs.startHour : '08:00';
                const end = techPrefs ? techPrefs.endHour : '18:00';
                const daysCount = techPrefs ? techPrefs.days.length : 5;

                return (
                  <button
                    key={techName}
                    type="button"
                    onClick={() => setSelectedTech(techName)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                      isSelected
                        ? "bg-orange-50/60 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800"
                        : "bg-primary-50/30 dark:bg-primary-900/10 border-primary-100 dark:border-primary-800 hover:border-primary-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm ${
                        isSelected
                          ? "bg-orange-500 text-white"
                          : "bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300"
                      }`}>
                        {techName.substring(0, 2)}
                      </div>
                      <div>
                        <span className={`text-xs font-bold block ${isSelected ? 'text-orange-800 dark:text-orange-200' : 'text-primary-800 dark:text-primary-100'}`}>
                          {techName}
                        </span>
                        <span className="block text-[10px] text-primary-400 font-medium mt-0.5">
                          {isConfigured
                            ? (isEnabled ? `Active: ${start} - ${end} (${daysCount}j)` : "⚠️ Alertes Désactivées")
                            : "Standard: 08:00 - 18:00 (Lun-Ven)"
                          }
                        </span>
                      </div>
                    </div>
                    {isConfigured ? (
                      <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 bg-primary-100 dark:bg-primary-800 text-primary-500 rounded font-semibold">Par défaut</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Preference form (7 cols) */}
          <div className="card space-y-5 lg:col-span-7 border border-primary-200 dark:border-primary-800">
            {(() => {
              const techName = selectedTech || settings.listes.operateurs[0] || '';
              if (!techName) {
                return (
                  <div className="text-center py-12 text-primary-400 text-xs italic">
                    Aucun technicien défini dans l'équipe. Veuillez d'abord configurer la liste des opérateurs.
                  </div>
                );
              }

              return (
                <form onSubmit={handleSaveNotifPrefs} className="space-y-5">
                  <div className="border-b pb-3 border-primary-100 dark:border-primary-800/60 flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-orange-500 tracking-widest">Configuration Individuelle</span>
                      <h3 className="text-lg font-display font-bold text-primary-800 dark:text-white mt-1">
                        {techName}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] bg-primary-50 dark:bg-primary-900 border text-primary-600 dark:text-primary-300 rounded-md font-mono">
                      Alerte Push Mobile
                    </span>
                  </div>

                  {/* 1. ACTIVATION TOGGLE */}
                  <div className="flex items-center justify-between p-3 bg-primary-50/50 dark:bg-primary-900/10 rounded-xl border border-primary-100 dark:border-primary-800">
                    <div>
                      <span className="text-xs font-bold text-primary-800 dark:text-primary-100 block">Autoriser les notifications d'urgence</span>
                      <p className="text-[10px] text-primary-400 mt-0.5">Permet de recevoir les notifications de pannes sur l'application mobile pro.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifEnabled}
                        onChange={e => setNotifEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-primary-200 peer-focus:outline-none rounded-full peer dark:bg-primary-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-primary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>

                  {notifEnabled && (
                    <div className="space-y-5">
                      {/* 2. PLAGES HORAIRES (TIME RANGE) */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-primary-700 dark:text-primary-300 flex items-center gap-1.5">
                          <Clock size={14} className="text-orange-500" />
                          Plage horaire d'activité autorisée (Heure locale)
                        </label>
                        <p className="text-[10px] text-primary-400">
                          Configurez les heures de garde durant lesquelles ce technicien recevra les pushs critiques.
                        </p>
                        <div className="flex items-center gap-4 bg-primary-50/30 dark:bg-primary-900/5 p-3 rounded-xl border border-primary-100 dark:border-primary-800">
                          <div className="flex-1">
                            <span className="text-[10px] text-primary-400 uppercase font-semibold block mb-1">À partir de :</span>
                            <input
                              type="time"
                              value={notifStartHour}
                              onChange={e => setNotifStartHour(e.target.value)}
                              required
                              className="w-full p-2 text-xs font-bold border rounded-lg bg-white dark:bg-primary-900"
                            />
                          </div>
                          <span className="text-primary-400 text-xs font-semibold mt-4">à</span>
                          <div className="flex-1">
                            <span className="text-[10px] text-primary-400 uppercase font-semibold block mb-1">Jusqu'à :</span>
                            <input
                              type="time"
                              value={notifEndHour}
                              onChange={e => setNotifEndHour(e.target.value)}
                              required
                              className="w-full p-2 text-xs font-bold border rounded-lg bg-white dark:bg-primary-900"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 3. JOURS ACTIFS */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-primary-700 dark:text-primary-300 flex items-center gap-1.5">
                          <Calendar size={14} className="text-orange-500" />
                          Jours d'activité de l'astreinte
                        </label>
                        <p className="text-[10px] text-primary-400">
                          Sélectionnez les jours de la semaine concernés par ces plages d'acheminement.
                        </p>
                        <div className="flex flex-wrap gap-1.5 p-3 bg-primary-50/30 dark:bg-primary-900/5 rounded-xl border border-primary-100 dark:border-primary-800">
                          {["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].map(day => {
                            const isSelected = notifDays.includes(day);
                            return (
                              <button
                                type="button"
                                key={day}
                                onClick={() => {
                                  if (isSelected) {
                                    setNotifDays(notifDays.filter(d => d !== day));
                                  } else {
                                    setNotifDays([...notifDays, day]);
                                  }
                                }}
                                className={`text-[11px] px-3 py-1.5 rounded-full font-bold transition border ${
                                  isSelected
                                    ? "bg-orange-500 border-orange-500 text-white shadow-sm"
                                    : "bg-white dark:bg-primary-800 text-primary-500 border-primary-200 dark:border-primary-700/80 hover:bg-primary-50"
                                }`}
                              >
                                {day.substring(0, 3)}.
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 4. CRITICAL ONLY FILTER */}
                      <div className="flex items-start gap-3 p-3 bg-red-50/10 dark:bg-red-950/10 rounded-xl border border-red-200/40">
                        <input
                          type="checkbox"
                          id="notifCriticalOnly"
                          checked={notifCriticalOnly}
                          onChange={e => setNotifCriticalOnly(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded accent-red-500 text-red-500 focus:ring-red-500 cursor-pointer"
                        />
                        <div className="text-xs">
                          <label htmlFor="notifCriticalOnly" className="font-extrabold text-red-800 dark:text-red-200 cursor-pointer">
                            ⚠️ Filtrer uniquement les alertes critiques (Panne de priorité 4)
                          </label>
                          <p className="text-[10px] text-primary-400 mt-1 leading-relaxed">
                            Si cette option est activée, le technicien ne recevra de push mobile que pour les pannes bloquantes provoquant un arrêt machine ("Critique"). Les demandes d'intervention de niveau faible ou moyenne seront simplement consignées au tableau sans dérangement push.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SAVE BUTTON */}
                  <div className="border-t pt-4 flex justify-end gap-2">
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ backgroundColor: '#F97316' }}
                    >
                      <Check size={14} />
                      Enregistrer les plages d'alertes
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* SUBTAB 5 : SECURITY AUDIT LOG */}
      {activeSubTab === 'security' && (
        <div className="space-y-6">
          {/* STATS DE SÉCURITÉ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4 flex items-center justify-between border-l-4 border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400">Total Actions Journalisées</span>
                <p className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {auditLogs.length}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 dark:bg-indigo-950 rounded-xl text-indigo-600 dark:text-indigo-400">
                <Terminal size={20} />
              </div>
            </div>

            <div className="card p-4 flex items-center justify-between border-l-4 border-red-500 bg-red-50/10 dark:bg-red-950/10">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400">Événements Critiques</span>
                <p className="text-2xl font-mono font-bold text-red-600 dark:text-red-400">
                  {auditLogs.filter(l => l.criticite === 'eleve').length}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-950 rounded-xl text-red-600 dark:text-red-400">
                <ShieldAlert size={20} />
              </div>
            </div>

            <div className="card p-4 flex items-center justify-between border-l-4 border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400">Dernière Synchronisation</span>
                <p className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 pt-1.5 truncate max-w-[180px]">
                  {auditLogs.length > 0 
                    ? new Date([...auditLogs].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp).toLocaleString('fr-FR')
                    : 'Aucun événement'}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950 rounded-xl text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={20} />
              </div>
            </div>
          </div>

          {/* LEDGER & FILTERS CARD */}
          <div className="card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-primary-800 dark:text-primary-100 flex items-center gap-1.5">
                  <Lock size={15} className="text-indigo-500" />
                  Registre de Sécurité & Traçabilité
                </h3>
                <p className="text-[10px] text-primary-400 mt-0.5">
                  Journal en lecture seule (conforme RGPD & ISO 55001) enregistrant les suppressions, ajustements de stocks, modifications des réglages et restaurations.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* EXPORT PDF BUTTON */}
{canExportSecurite && (
                <button
                  type="button"
                  onClick={handleExportSecurityPDF}
                  className="text-[10px] font-bold px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white rounded-lg shadow-sm hover:shadow-red-600/10 active:scale-95 transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
                  title="Générer un document d'archivage PDF officiel conforme aux réglementations d'audit"
                >
                  <FileText size={13} />
                  <span>Exporter PDF (Conformité)</span>
                </button>
                )}

                {/* TEST TRIGGER: Log a simulated suspicious test */}
                <button
                  type="button"
                  onClick={() => {
                    logSecurityAction("Test de Sécurité", "Simulation d'une vérification de l'intégrité du registre d'audit de sécurité.", "moyenne");
                    alert("Événement de test généré dans le journal d'audit de sécurité !");
                  }}
                  className="text-[10px] font-bold px-2.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-lg border border-indigo-200/40 transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} />
                  Tester l'Audit
                </button>
              </div>
            </div>

            {/* FILTERS & SEARCH */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
                <input
                  type="text"
                  placeholder="Rechercher par action, utilisateur, IP..."
                  value={securitySearch}
                  onChange={(e) => setSecuritySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-primary-200 dark:border-primary-800 bg-white dark:bg-primary-950 text-primary-800 dark:text-primary-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Criticality Filters */}
              <div className="flex gap-1 bg-primary-50 dark:bg-primary-900/40 p-1 rounded-lg border border-primary-150 dark:border-primary-800">
                <button
                  type="button"
                  onClick={() => setSecurityCriticiteFilter('all')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${securityCriticiteFilter === 'all' ? 'bg-white dark:bg-primary-800 text-primary-800 dark:text-white shadow-sm' : 'text-primary-400 hover:text-primary-600'}`}
                >
                  Tous
                </button>
                <button
                  type="button"
                  onClick={() => setSecurityCriticiteFilter('faible')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition flex items-center gap-1 ${securityCriticiteFilter === 'faible' ? 'bg-indigo-500 text-white shadow-sm' : 'text-indigo-500 hover:bg-indigo-50/50'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  Faible
                </button>
                <button
                  type="button"
                  onClick={() => setSecurityCriticiteFilter('moyenne')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition flex items-center gap-1 ${securityCriticiteFilter === 'moyenne' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-500 hover:bg-amber-50/50'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Moyen
                </button>
                <button
                  type="button"
                  onClick={() => setSecurityCriticiteFilter('eleve')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition flex items-center gap-1 ${securityCriticiteFilter === 'eleve' ? 'bg-red-500 text-white shadow-sm' : 'text-red-500 hover:bg-red-50/50'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Élevé
                </button>
              </div>
            </div>

            {/* LEDGER TABLE */}
            <div className="overflow-x-auto border border-primary-200 dark:border-primary-800 rounded-xl bg-white dark:bg-primary-950/20">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-primary-50/75 dark:bg-primary-900/50 border-b border-primary-200 dark:border-primary-800 text-primary-500 font-bold">
                    <th className="p-3">Horodatage</th>
                    <th className="p-3">Utilisateur</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Détails de l'opération</th>
                    <th className="p-3 text-center">Criticité</th>
                    <th className="p-3 text-right">Adresse IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-100 dark:divide-primary-800">
                  {(() => {
                    const query = securitySearch.toLowerCase();
                    const filtered = [...(auditLogs || [])]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .filter(log => {
                        const matchesSearch = 
                          log.action.toLowerCase().includes(query) ||
                          log.utilisateur.toLowerCase().includes(query) ||
                          (log.details && log.details.toLowerCase().includes(query)) ||
                          (log.ipAdresse && log.ipAdresse.toLowerCase().includes(query));
                          
                        const matchesCriticite = 
                          securityCriticiteFilter === 'all' || 
                          log.criticite === securityCriticiteFilter;
                          
                        return matchesSearch && matchesCriticite;
                      });

                    return filtered.length > 0 ? (
                      filtered.map((log) => {
                        let badgeStyle = "bg-primary-100 text-primary-600 dark:bg-primary-800 dark:text-primary-300";
                        let badgeDot = "bg-primary-400";
                        if (log.criticite === 'eleve') {
                          badgeStyle = "bg-red-50 text-red-700 border border-red-200/50 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/40";
                          badgeDot = "bg-red-500 animate-pulse";
                        } else if (log.criticite === 'moyenne') {
                          badgeStyle = "bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40";
                          badgeDot = "bg-amber-500";
                        } else if (log.criticite === 'faible') {
                          badgeStyle = "bg-indigo-50 text-indigo-700 border border-indigo-100/50 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30";
                          badgeDot = "bg-indigo-400";
                        }

                        return (
                          <tr 
                            key={log.id}
                            className="hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition group"
                          >
                            <td className="p-3 whitespace-nowrap font-mono text-[10px] text-primary-400 font-medium group-hover:text-primary-600 transition">
                              {new Date(log.timestamp).toLocaleString('fr-FR')}
                            </td>
                            <td className="p-3 whitespace-nowrap font-bold text-primary-800 dark:text-primary-200">
                              {log.utilisateur}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className="font-semibold text-primary-900 dark:text-white px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 rounded-md">
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3 text-primary-600 dark:text-primary-300 max-w-sm sm:max-w-md font-medium leading-relaxed">
                              {log.details}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeStyle}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${badgeDot}`} />
                                {log.criticite.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3 text-right whitespace-nowrap font-mono text-[10px] text-primary-400 font-bold">
                              {log.ipAdresse || '127.0.0.1'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-primary-400 font-medium">
                          <Lock size={32} className="mx-auto mb-2.5 text-primary-300 opacity-60" />
                          Aucun événement de sécurité trouvé pour les critères sélectionnés.
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            {/* AUDIT LEGEND BANNER */}
            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-800 flex items-start gap-2.5 text-[10px] text-primary-400 font-medium">
              <AlertCircle size={14} className="text-indigo-500 shrink-0 mt-0.5" />
              <p>
                <strong>Remarque légale :</strong> Ce registre d'audit est certifié conforme pour le suivi ISO 55001. Les administrateurs peuvent consulter le journal d'activité mais aucune action de suppression ou de modification rétroactive du journal n'est permise au sein du panneau GMAO standard.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export { KEYS } from '../data';
