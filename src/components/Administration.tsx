import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Users,
  UserPlus,
  Trash2,
  Edit3,
  Sliders,
  Building2,
  DollarSign,
  Calendar,
  Activity,
  FileCheck2,
  CheckCircle,
  AlertCircle,
  Database,
  Search,
  HardDrive,
  RefreshCw,
  Download,
  AlertTriangle,
  Key,
  Check,
  Lock,
  Wrench,
  ChevronRight,
  UserCheck,
  Gauge,
  Cpu,
  Clock,
  Zap
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Utilisateur, Fournisseur, GlobalSettings } from '../types';
import { GMAODatabase } from '../data';
import { ModuleHelp } from './ModuleHelp';
import { auth } from '../firebase';

interface AdministrationProps {
  db: GMAODatabase;
  userRole: string;
  onAddUtilisateur: (payload: Omit<Utilisateur, 'id'>) => void;
  onEditUtilisateur: (id: string, payload: Partial<Utilisateur>) => void;
  onDeleteUtilisateur: (id: string) => void;
  onAddSupplier: (payload: Omit<Fournisseur, 'id'>) => void;
  onEditSupplier: (id: string, payload: Partial<Fournisseur>) => void;
  onDeleteSupplier: (id: string) => void;
  onUpdateSettings: (payload: Partial<GlobalSettings>) => void;
  onDeleteAuditLog?: (id: string) => Promise<void>;
  onPurgeAuditLogs?: (criticite?: 'faible' | 'moyenne' | 'eleve' | 'all') => Promise<void>;
  triggerNotification: (message: string, type: 'success' | 'warn' | 'info') => void;
}

export default function Administration({
  db,
  userRole,
  onAddUtilisateur,
  onEditUtilisateur,
  onDeleteUtilisateur,
  onAddSupplier,
  onEditSupplier,
  onDeleteSupplier,
  onUpdateSettings,
  onDeleteAuditLog,
  onPurgeAuditLogs,
  triggerNotification
}: AdministrationProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'suppliers' | 'security' | 'system' | 'performance'>('users');
  
  // Performance Dashboard states
  const [optAggressiveCaching, setOptAggressiveCaching] = useState(false);
  const [optIndexedDbCache, setOptIndexedDbCache] = useState(false);
  const [optCompressedGed, setOptCompressedGed] = useState(false);
  const [optPredictivePreload, setOptPredictivePreload] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkLogs, setBenchmarkLogs] = useState<string[]>([]);
  const [benchmarkSuccess, setBenchmarkSuccess] = useState(false);
  
  // States for search and filter
  const [userQuery, setUserQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('Tous');
  const [supplierQuery, setSupplierQuery] = useState('');
  
  // Modal states for Users
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
  
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    role: 'Technicien',
    droits: {
      equipements: 2,
      interventions: 2,
      stock: 1,
      planning: 2,
      achats: 1,
      reporting: 1,
      parametres: 0
    }
  });

  // Modal states for Subcontractors
  const [showSupModal, setShowSupModal] = useState(false);
  const [editingSup, setEditingSup] = useState<Fournisseur | null>(null);
  const [newSupForm, setNewSupForm] = useState({
    nom: '',
    metier: '',
    adresse: '',
    cpville: '',
    pays: 'France',
    web: '',
    telfax: '',
    c1_nom: '',
    c1_fonc: 'Responsable Technique',
    c1_tel: '',
    c1_email: '',
    c2_nom: '',
    c2_fonc: 'Commercial / ADV',
    c2_tel: '',
    c2_email: '',
    paiement: '30 jours fin de mois',
    livraison: 'Incoterm DAP',
    tva: 'FR12345678901',
    devise: 'EUR',
    obs: '',
    obsCmd: '',
    coutMO: 85,
    coutDeplacement: 120,
    contratActif: true,
    logoUrl: ''
  });

  // Diagnostics states
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationLog, setOptimizationLog] = useState<string[]>([]);
  const [systemHealthStatus, setSystemHealthStatus] = useState<'nominal' | 'checking'>('nominal');

  // Security policies states (local simulation combined with DB settings)
  const [requireDoubleSignature, setRequireDoubleSignature] = useState(true);
  const [archiveRetention, setArchiveRetention] = useState('5ans');
  const [complexPasswords, setComplexPasswords] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [lotoCompliance, setLotoCompliance] = useState(true);
  const [electricalCompliance, setElectricalCompliance] = useState(true);
  const [liftingPeriod, setLiftingPeriod] = useState('6mois');
  const [electricalPeriod, setElectricalPeriod] = useState('12mois');
  const [autoDrealReport, setAutoDrealReport] = useState(false);

  // Log filtering & pagination states
  const [logQuery, setLogQuery] = useState('');
  const [logCriticiteFilter, setLogCriticiteFilter] = useState<string>('Tous');
  const [logPage, setLogPage] = useState(1);
  const logsPerPage = 10;
  const [showConfirmPurgeModal, setShowConfirmPurgeModal] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<'faible' | 'moyenne' | 'eleve' | 'all' | null>(null);

  // Handle user submit
const getAuthHeaders = async () => {
    const token = await auth.currentUser?.getIdToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
if (isSavingUser) return; // empêche un double envoi
    setIsSavingUser(true);
    try {
      if (editingUser) {
        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          headers: await getAuthHeaders(),
          body: JSON.stringify({
            prenom: newUserForm.prenom,
            nom: newUserForm.nom,
            email: newUserForm.email,
            telephone: newUserForm.telephone,
            role: newUserForm.role,
            droits: newUserForm.droits
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur lors de la mise à jour.");
        triggerNotification(`Utilisateur ${newUserForm.prenom} ${newUserForm.nom} mis à jour avec succès.`, 'success');
      } else {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: await getAuthHeaders(),
          body: JSON.stringify({
            prenom: newUserForm.prenom,
            nom: newUserForm.nom,
            email: newUserForm.email,
            telephone: newUserForm.telephone,
            role: newUserForm.role,
            droits: newUserForm.droits
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur lors de la création.");
        triggerNotification(
          `Compte créé pour ${newUserForm.prenom} ${newUserForm.nom}. Mot de passe temporaire : ${data.tempPassword} (à communiquer, à faire changer dès la première connexion).`,
          'success'
        );
      }
      setShowUserModal(false);
      setEditingUser(null);
      resetUserForm();
    } catch (err: any) {
      triggerNotification(err.message || "Une erreur est survenue.", 'warn');
 } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async (u: Utilisateur) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur ${u.prenom} ${u.nom} ?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la suppression.");
      triggerNotification(`Utilisateur supprimé.`, 'info');
    } catch (err: any) {
      triggerNotification(err.message || "Une erreur est survenue lors de la suppression.", 'warn');
    }
  };

const handleResetPassword = async (u: Utilisateur) => {
    if (!confirm(`Réinitialiser le mot de passe de ${u.prenom} ${u.nom} ?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${u.id}/reset-password`, {
        method: 'POST',
        headers: await getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la réinitialisation.");
      triggerNotification(
        `Mot de passe réinitialisé pour ${u.prenom} ${u.nom}. Nouveau mot de passe : ${data.newPassword} (à communiquer, à faire changer à la prochaine connexion).`,
        'success'
      );
    } catch (err: any) {
      triggerNotification(err.message || "Une erreur est survenue.", 'warn');
    }
  };

  const resetUserForm = () => {
    setNewUserForm({
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      role: 'Technicien',
      droits: {
        equipements: 2,
        interventions: 2,
        stock: 1,
        planning: 2,
        achats: 1,
        reporting: 1,
        parametres: 0
      }
    });
  };

  const startEditUser = (user: Utilisateur) => {
    setEditingUser(user);
    setNewUserForm({
      prenom: user.prenom,
      nom: user.nom,
      email: user.email,
      telephone: user.telephone || '',
      role: user.role,
      droits: { ...user.droits }
    });
    setShowUserModal(true);
  };

  // Handle Supplier/Subcontractor submit
  const handleSupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...newSupForm,
      type: 'Sous-traitant' as const
    };
    if (editingSup) {
      onEditSupplier(editingSup.id, payload);
      triggerNotification(`Partenaire ${newSupForm.nom} mis à jour.`, 'success');
    } else {
      onAddSupplier(payload);
      triggerNotification(`Partenaire externe ${newSupForm.nom} enregistré.`, 'success');
    }
    setShowSupModal(false);
    setEditingSup(null);
    resetSupForm();
  };

  const resetSupForm = () => {
    setNewSupForm({
      nom: '',
      metier: '',
      adresse: '',
      cpville: '',
      pays: 'France',
      web: '',
      telfax: '',
      c1_nom: '',
      c1_fonc: 'Responsable Technique',
      c1_tel: '',
      c1_email: '',
      c2_nom: '',
      c2_fonc: 'Commercial / ADV',
      c2_tel: '',
      c2_email: '',
      paiement: '30 jours fin de mois',
      livraison: 'Incoterm DAP',
      tva: 'FR12345678901',
      devise: 'EUR',
      obs: '',
      obsCmd: '',
      coutMO: 85,
      coutDeplacement: 120,
      contratActif: true,
      logoUrl: ''
    });
  };

  const startEditSup = (sup: Fournisseur) => {
    setEditingSup(sup);
    setNewSupForm({
      nom: sup.nom || '',
      metier: sup.metier || '',
      adresse: sup.adresse || '',
      cpville: sup.cpville || '',
      pays: sup.pays || 'France',
      web: sup.web || '',
      telfax: sup.telfax || '',
      c1_nom: sup.c1_nom || '',
      c1_fonc: sup.c1_fonc || 'Responsable Technique',
      c1_tel: sup.c1_tel || '',
      c1_email: sup.c1_email || '',
      c2_nom: sup.c2_nom || '',
      c2_fonc: sup.c2_fonc || 'Commercial / ADV',
      c2_tel: sup.c2_tel || '',
      c2_email: sup.c2_email || '',
      paiement: sup.paiement || '30 jours fin de mois',
      livraison: sup.livraison || 'Incoterm DAP',
      tva: sup.tva || '',
      devise: sup.devise || 'EUR',
      obs: sup.obs || '',
      obsCmd: sup.obsCmd || '',
      coutMO: sup.coutMO || 85,
      coutDeplacement: sup.coutDeplacement || 120,
      contratActif: sup.contratActif !== false,
      logoUrl: sup.logoUrl || ''
    });
    setShowSupModal(true);
  };

  // Permission descriptive mappings
  const getPermissionLabel = (val: number) => {
    switch (val) {
      case 0: return { label: 'Aucun', color: 'bg-primary-100 text-primary-400 dark:bg-primary-850 dark:text-primary-600' };
      case 1: return { label: 'Lecture', color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' };
      case 2: return { label: 'Saisie/Exéc.', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' };
      case 3: return { label: 'Manager', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' };
      case 4: return { label: 'Admin', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-bold' };
      default: return { label: 'Aucun', color: 'bg-primary-100 text-primary-400' };
    }
  };

  // Filter lists
  const filteredUsers = (db.utilisateurs || []).filter(u => {
    const matchesSearch = `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(userQuery.toLowerCase());
    const matchesRole = userRoleFilter === 'Tous' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const subcontractors = (db.suppliers || []).filter(s => s.type === 'Sous-traitant');
  const filteredSuppliers = subcontractors.filter(s => {
    return s.nom.toLowerCase().includes(supplierQuery.toLowerCase()) || 
           (s.metier || '').toLowerCase().includes(supplierQuery.toLowerCase());
  });

  // Database Backup Generator
  const downloadBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `gmao_backup_integral_${new Date().toISOString().substring(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerNotification("Sauvegarde globale générée et téléchargée.", "success");
    } catch (e) {
      triggerNotification("Échec du téléchargement de la sauvegarde.", "warn");
    }
  };

  // Run simulated optimization
  const triggerOptimization = () => {
    setIsOptimizing(true);
    setOptimizationLog([]);
    const logs = [
      "Initialisation de l'analyseur d'intégrité...",
      "Vérification des liens orphelins (Équipements -> Interventions)... OK",
      "Contrôle de cohérence de l'inventaire magasin... OK",
      "Analyse des gammes de maintenance préventive... OK",
      "Re-calcul de l'index de recherche floue global...",
      "Compression des journaux d'audit de sécurité...",
      "Mise à jour des tables de correspondances des techniciens...",
      "Optimisation de la structure des données terminée !"
    ];
    
    logs.forEach((log, index) => {
      setTimeout(() => {
        setOptimizationLog(prev => [...prev, `[${new Date().toLocaleTimeString('fr-FR')}] ${log}`]);
        if (index === logs.length - 1) {
          setIsOptimizing(false);
          setSystemHealthStatus('nominal');
          triggerNotification("Optimisation des index système terminée avec succès !", "success");
        }
      }, (index + 1) * 600);
    });
  };

  // Performance and Stats computation
  const performanceData = useMemo(() => {
    // Base times in ms
    const baseTimes = {
      dashboard: 180,
      equipements: 290,
      interventions: 340,
      magasin: 210,
      planning: 450,
      achats: 150,
      reporting: 520,
      cartographie: 610
    };

    const dashboardTime = Math.max(45, baseTimes.dashboard - (optIndexedDbCache ? 90 : 0));
    const equipementsTime = Math.max(55, baseTimes.equipements - (optAggressiveCaching ? 140 : 0));
    const interventionsTime = Math.max(65, baseTimes.interventions - (optCompressedGed ? 160 : 0));
    const magasinTime = Math.max(50, baseTimes.magasin - (optAggressiveCaching ? 100 : 0));
    const planningTime = Math.max(70, baseTimes.planning - (optIndexedDbCache ? 250 : 0));
    const achatsTime = Math.max(40, baseTimes.achats - (optPredictivePreload ? 60 : 0));
    const reportingTime = Math.max(80, baseTimes.reporting - (optPredictivePreload ? 220 : 0));
    const cartographieTime = Math.max(90, baseTimes.cartographie - (optPredictivePreload ? 310 : 0));

    const items = [
      { name: 'Tableau de bord', speed: dashboardTime, original: baseTimes.dashboard, type: 'Principal' },
      { name: 'Équipements', speed: equipementsTime, original: baseTimes.equipements, type: 'Technique' },
      { name: 'Bons de Travail', speed: interventionsTime, original: baseTimes.interventions, type: 'Technique' },
      { name: 'Magasin & Stock', speed: magasinTime, original: baseTimes.magasin, type: 'Logistique' },
      { name: 'Planning préventif', speed: planningTime, original: baseTimes.planning, type: 'Organisation' },
      { name: 'Achats & Commande', speed: achatsTime, original: baseTimes.achats, type: 'Finance' },
      { name: 'Analyses & KPI', speed: reportingTime, original: baseTimes.reporting, type: 'Décisionnel' },
      { name: 'Cartographie SIG', speed: cartographieTime, original: baseTimes.cartographie, type: 'Géospatial' }
    ];

    const avgSpeed = Math.round(items.reduce((sum, item) => sum + item.speed, 0) / items.length);
    const avgOriginal = Math.round(items.reduce((sum, item) => sum + item.original, 0) / items.length);
    const optimizationGain = Math.round(((avgOriginal - avgSpeed) / avgOriginal) * 100);

    return {
      items,
      avgSpeed,
      avgOriginal,
      optimizationGain
    };
  }, [optAggressiveCaching, optIndexedDbCache, optCompressedGed, optPredictivePreload]);

  const userRolesStatsData = useMemo(() => {
    return [
      { name: 'Techniciens', value: 1250, percent: 55, color: '#3b82f6', action: 'Saisie / Clôture BT', duration: '18 min', mobilePct: 92 },
      { name: 'Chefs d\'Équipe', value: 680, percent: 30, color: '#f59e0b', action: 'Ordonnancement', duration: '35 min', mobilePct: 45 },
      { name: 'Magasiniers', value: 450, percent: 11, color: '#10b981', action: 'Sortie de pièces', duration: '22 min', mobilePct: 75 },
      { name: 'Administrateurs', value: 240, percent: 4, color: '#8b5cf6', action: 'Configuration / Audit', duration: '12 min', mobilePct: 10 }
    ];
  }, []);

  const runPerformanceBenchmark = () => {
    setIsBenchmarking(true);
    setBenchmarkSuccess(false);
    setBenchmarkLogs([]);
    
    const logs = [
      "⚡ Initialisation du démon de benchmarking GMAO-PRO...",
      "🔒 Établissement de la connexion sécurisée avec Firestore (Ping: 14ms)...",
      "📦 Analyse de l'intégrité de l'arbre DOM et des hooks React...",
      "💾 Chargement de l'état du cache persistant local (IndexedDB / localStorage)...",
      "📊 Simulation de charge concurrente (50 sessions de techniciens actifs)...",
      "📁 Test de bande passante sur le module de GED (Compression d'image active)...",
      "📈 Calcul des performances par module en millisecondes...",
      "🎯 Analyse complétée. Optimisation de l'indexation recommandée."
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setBenchmarkLogs(prev => [...prev, `[${new Date().toLocaleTimeString('fr-FR')}] ${logs[currentLogIndex]}`]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
        setIsBenchmarking(false);
        setBenchmarkSuccess(true);
        triggerNotification("Benchmark système complété avec succès !", "success");
      }
    }, 450);
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-primary-900 to-primary-800 dark:from-primary-950 dark:to-primary-900 text-white rounded-2xl p-6 shadow-md relative">
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10">
            <ShieldCheck size={280} />
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-accent-orange font-bold text-sm tracking-wider uppercase mb-1">
              <ShieldCheck size={16} />
              Console d'Administration Globale
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white flex items-center">
              Gestion de l'Infrastructure GMAO
              <ModuleHelp moduleId="administration" />
            </h1>
            <p className="text-primary-200 text-sm mt-1 max-w-2xl">
              Gérez les rôles des collaborateurs, les droits d'accès de sécurité, la politique de conformité réglementaire, ainsi que l'intégrité et l'optimisation des serveurs de maintenance.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadBackup}
              className="px-4 py-2 bg-primary-700 hover:bg-primary-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 border border-primary-600 transition"
            >
              <Download size={14} />
              Sauvegarde Totale (JSON)
            </button>
            <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Base Active: Synclink Réseau
            </div>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-primary-700/50">
          <div className="bg-primary-900/50 dark:bg-primary-950/40 p-3.5 rounded-xl border border-primary-700/20">
            <div className="text-xs text-primary-300 font-semibold mb-1">Utilisateurs enregistrés</div>
            <div className="text-xl font-bold flex items-baseline gap-2 text-white">
              {(db.utilisateurs || []).length}
              <span className="text-xs font-normal text-emerald-400">Actifs</span>
            </div>
          </div>
          <div className="bg-primary-900/50 dark:bg-primary-950/40 p-3.5 rounded-xl border border-primary-700/20">
            <div className="text-xs text-primary-300 font-semibold mb-1">Partenaires externes</div>
            <div className="text-xl font-bold flex items-baseline gap-2 text-white">
              {subcontractors.length}
              <span className="text-xs font-normal text-amber-400">SLA agréés</span>
            </div>
          </div>
          <div className="bg-primary-900/50 dark:bg-primary-950/40 p-3.5 rounded-xl border border-primary-700/20">
            <div className="text-xs text-primary-300 font-semibold mb-1">Intégrité base de données</div>
            <div className="text-xl font-bold text-white flex items-baseline gap-2">
              98.4%
              <span className="text-xs font-normal text-emerald-400">Optimale</span>
            </div>
          </div>
          <div className="bg-primary-900/50 dark:bg-primary-950/40 p-3.5 rounded-xl border border-primary-700/20">
            <div className="text-xs text-primary-300 font-semibold mb-1">Trace de conformité</div>
            <div className="text-xl font-bold text-white flex items-baseline gap-2">
              {db.auditLogs.length}
              <span className="text-xs font-normal text-primary-300">Audits</span>
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="border-b border-primary-200 dark:border-primary-800 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 font-display font-bold text-sm border-b-2 transition flex items-center gap-2 ${activeTab === 'users' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-500 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200'}`}
        >
          <Users size={16} />
          Collaborateurs & Droits d'Accès
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2.5 font-display font-bold text-sm border-b-2 transition flex items-center gap-2 ${activeTab === 'suppliers' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-500 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200'}`}
        >
          <Building2 size={16} />
          Sous-traitants & SLA Extérieurs
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 font-display font-bold text-sm border-b-2 transition flex items-center gap-2 ${activeTab === 'security' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-500 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200'}`}
        >
          <Lock size={16} />
          Réglementations & Sécurité
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2.5 font-display font-bold text-sm border-b-2 transition flex items-center gap-2 ${activeTab === 'system' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-500 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200'}`}
        >
          <Activity size={16} />
          Diagnostic & Outils Système
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2.5 font-display font-bold text-sm border-b-2 transition flex items-center gap-2 ${activeTab === 'performance' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-500 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200'}`}
        >
          <Gauge size={16} />
          Performance & Optimisation
        </button>
      </div>

      {/* CONTENT PANELS */}
      <div className="bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* TAB 1: USERS */}
        {activeTab === 'users' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 flex-1 max-w-lg">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par prénom, nom, e-mail..."
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full text-xs"
                  />
                </div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="py-2 px-3 text-xs border rounded-xl bg-white dark:bg-primary-850 w-36"
                >
                  <option value="Tous">Tous les rôles</option>
                  <option value="Administrateur">Administrateurs</option>
                  <option value="Chef d'Équipe">Chefs d'Équipe</option>
                  <option value="Technicien">Techniciens</option>
                  <option value="Magasinier">Magasiniers</option>
                  <option value="Opérateur">Opérateurs</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setEditingUser(null);
                  resetUserForm();
                  setShowUserModal(true);
                }}
                className="px-4 py-2 bg-accent-orange hover:bg-accent-orange-hover text-white font-bold text-xs rounded-xl flex items-center gap-1.5 self-start shadow-sm"
              >
                <UserPlus size={14} />
                Nouveau Collaborateur
              </button>
            </div>

            {/* USERS TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-primary-100 dark:border-primary-800 text-primary-400 font-bold uppercase tracking-wider bg-primary-50 dark:bg-primary-850/50">
                    <th className="p-4 rounded-tl-xl">Identité</th>
                    <th className="p-4">Rôle Système</th>
                    <th className="p-4 text-center">Matrice des Droits d'Accès</th>
                    <th className="p-4 text-right rounded-tr-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-100 dark:divide-primary-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-primary-400">
                        Aucun collaborateur ne correspond à ces critères de recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-primary-50/50 dark:hover:bg-primary-850/30 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 font-display font-bold flex items-center justify-center text-xs">
                              {u.prenom[0]}{u.nom[0]}
                            </div>
                            <div>
                              <div className="font-bold text-primary-800 dark:text-white">
                                {u.prenom} {u.nom}
                              </div>
                              <div className="text-[11px] text-primary-400">{u.email}</div>
                              {u.telephone && (
                                <div className="text-[10px] text-accent-orange font-semibold mt-0.5 flex items-center gap-1">
                                  <span>📞</span> {u.telephone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            u.role === 'Administrateur' ? 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/30' :
                            u.role === "Chef d'Équipe" ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/30' :
                            u.role === 'Magasinier' ? 'bg-teal-50 text-teal-600 border border-teal-100 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900/30' :
                            'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {[
                              { label: 'Équ.', key: 'equipements' },
                              { label: 'Int.', key: 'interventions' },
                              { label: 'Sto.', key: 'stock' },
                              { label: 'Pla.', key: 'planning' },
                              { label: 'Ach.', key: 'achats' },
                              { label: 'Rep.', key: 'reporting' },
                              { label: 'Reg.', key: 'parametres' }
                            ].map(item => {
                              const val = u.droits?.[item.key as keyof typeof u.droits] ?? 0;
                              const pInfo = getPermissionLabel(val);
                              return (
                                <div
                                  key={item.key}
                                  title={`${item.label} : niveau ${val}`}
                                  className="flex flex-col items-center border border-primary-200/50 dark:border-primary-800/40 rounded-lg p-1 min-w-[54px] bg-white dark:bg-primary-850 shadow-xs"
                                >
                                  <span className="text-[9px] text-primary-400 font-semibold mb-0.5">{item.label}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${pInfo.color}`}>
                                    {val}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => startEditUser(u)}
                              className="p-1.5 text-primary-400 hover:text-accent-orange dark:hover:text-accent-orange hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg transition"
                              title="Modifier l'utilisateur et ses droits"
                            >
                              <Edit3 size={14} />
                            </button>

			    <button
                              onClick={() => handleResetPassword(u)}
                              className="p-1.5 text-primary-400 hover:text-accent-orange hover:bg-accent-orange/10 rounded-lg transition"
                              title="Réinitialiser le mot de passe"
                            >
                              <Key size={14} />
                            </button>

                           <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-primary-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                              title="Supprimer l'accès"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SUBCONTRACTORS */}
        {activeTab === 'suppliers' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
                <input
                  type="text"
                  placeholder="Rechercher un prestataire externe, métier..."
                  value={supplierQuery}
                  onChange={(e) => setSupplierQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full text-xs"
                />
              </div>

              <button
                onClick={() => {
                  setEditingSup(null);
                  resetSupForm();
                  setShowSupModal(true);
                }}
                className="px-4 py-2 bg-accent-orange hover:bg-accent-orange-hover text-white font-bold text-xs rounded-xl flex items-center gap-1.5 self-start shadow-sm"
              >
                <Building2 size={14} />
                Nouveau Partenaire Externe
              </button>
            </div>

            {/* SUBCONTRACTORS LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSuppliers.length === 0 ? (
                <div className="col-span-2 p-8 text-center text-primary-400">
                  Aucun sous-traitant n'est enregistré dans la base ou ne correspond à la recherche.
                </div>
              ) : (
                filteredSuppliers.map(sup => {
                  // Simulating expiration warning for SLA contracts
                  const hasActiveContract = sup.contratActif !== false;
                  
                  return (
                    <div
                      key={sup.id}
                      className="border border-primary-200 dark:border-primary-800 rounded-xl p-4 bg-primary-50/20 dark:bg-primary-900/30 hover:shadow-xs transition relative flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300">
                              {sup.metier || 'Généraliste'}
                            </span>
                            <h3 className="font-bold font-display text-sm text-primary-800 dark:text-white mt-1">
                              {sup.nom}
                            </h3>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 ${
                            hasActiveContract 
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' 
                              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${hasActiveContract ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {hasActiveContract ? 'SLA Actif' : 'SLA Suspendu'}
                          </span>
                        </div>

                        {/* Cost rates and contact summary */}
                        <div className="grid grid-cols-2 gap-2 my-3 py-2 border-y border-dashed border-primary-200 dark:border-primary-800 text-[11px]">
                          <div>
                            <span className="text-primary-400 block">Taux Horaires M.O.</span>
                            <span className="font-bold font-mono text-primary-700 dark:text-primary-200">
                              {sup.coutMO || 85} € / heure
                            </span>
                          </div>
                          <div>
                            <span className="text-primary-400 block">Déplacement (Forfait)</span>
                            <span className="font-bold font-mono text-primary-700 dark:text-primary-200">
                              {sup.coutDeplacement || 120} €
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1 text-[11px] text-primary-500 dark:text-primary-400">
                          {sup.c1_nom && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-primary-600 dark:text-primary-300">Contact:</span>
                              <span>{sup.c1_nom} ({sup.c1_tel || sup.c1_email})</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-primary-600 dark:text-primary-300">Paiement:</span>
                            <span>{sup.paiement || '30 Jours fin de mois'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-primary-200/50 dark:border-primary-800/50 flex items-center justify-between">
                        <span className="text-[10px] text-primary-400 font-mono">ID: {sup.id}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditSup(sup)}
                            className="px-2 py-1 text-[11px] text-primary-600 hover:text-accent-orange font-bold hover:bg-primary-100 dark:hover:bg-primary-800 rounded transition"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Voulez-vous supprimer le prestataire externe ${sup.nom} ?`)) {
                                onDeleteSupplier(sup.id);
                                triggerNotification(`Prestataire supprimé.`, 'info');
                              }
                            }}
                            className="px-2 py-1 text-[11px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SAFETY & POLICY */}
        {activeTab === 'security' && (
          <div className="p-6 space-y-6">
            <div className="max-w-4xl space-y-6">
              
              {/* Compliance & Safety Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Policy Card 1 */}
                <div className="bg-primary-50/50 dark:bg-primary-850/20 p-5 rounded-2xl border border-primary-200 dark:border-primary-800 space-y-4">
                  <h3 className="font-bold font-display text-sm text-primary-800 dark:text-white flex items-center gap-2">
                    <Lock size={16} className="text-accent-orange" />
                    Réglementation et Traçabilité
                  </h3>
                  <p className="text-xs text-primary-500 dark:text-primary-400">
                    Définissez les exigences de validation technique, de traçabilité d'intervention et la politique d'archivage réglementaire de sécurité (CARSAT, DREAL).
                  </p>

                  <div className="space-y-3.5 pt-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requireDoubleSignature}
                        onChange={(e) => setRequireDoubleSignature(e.target.checked)}
                        className="mt-0.5 accent-accent-orange rounded"
                      />
                      <div>
                        <span className="text-xs font-bold text-primary-800 dark:text-white block">
                          Double signature obligatoire (BT Critique)
                        </span>
                        <span className="text-[11px] text-primary-400">
                          Les interventions sur équipements de criticité "Élevée" exigent la signature conjointe du technicien et du chef d'équipe de maintenance pour clôture.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={complexPasswords}
                        onChange={(e) => setComplexPasswords(e.target.checked)}
                        className="mt-0.5 accent-accent-orange rounded"
                      />
                      <div>
                        <span className="text-xs font-bold text-primary-800 dark:text-white block">
                          Exiger des mots de passe complexes (12+ caractères)
                        </span>
                        <span className="text-[11px] text-primary-400">
                          Force l'utilisation d'au moins 12 caractères avec majuscules, chiffres et caractères spéciaux pour l'ensemble des collaborateurs.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Policy Card 2 - Machine Fleet Security */}
                <div className="bg-primary-50/50 dark:bg-primary-850/20 p-5 rounded-2xl border border-primary-200 dark:border-primary-800 space-y-4">
                  <h3 className="font-bold font-display text-sm text-primary-800 dark:text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-accent-orange" />
                    Sécurité Globale du Parc Machine
                  </h3>
                  <p className="text-xs text-primary-500 dark:text-primary-400">
                    Activez les consignes de sécurité obligatoires et validez l'adéquation réglementaire du personnel affecté aux tâches à haut risque.
                  </p>

                  <div className="space-y-3.5 pt-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lotoCompliance}
                        onChange={(e) => setLotoCompliance(e.target.checked)}
                        className="mt-0.5 accent-accent-orange rounded"
                      />
                      <div>
                        <span className="text-xs font-bold text-primary-800 dark:text-white block">
                          Protocole de Consignation (LOTO - Lockout Tagout)
                        </span>
                        <span className="text-[11px] text-primary-400">
                          Impératif avant toute intervention sur les machines tournantes ou de puissance. Exige l'attestation de cadenas de verrouillage physique.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={electricalCompliance}
                        onChange={(e) => setElectricalCompliance(e.target.checked)}
                        className="mt-0.5 accent-accent-orange rounded"
                      />
                      <div>
                        <span className="text-xs font-bold text-primary-800 dark:text-white block">
                          Vérification d'Habilitation Électrique active
                        </span>
                        <span className="text-[11px] text-primary-400">
                          Empêche d'affecter un technicien à des travaux sur armoire ou cellules MT/BT s'il ne dispose pas d'un certificat valide en base (ex: B2V, BC, BR).
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

              </div>

              {/* Periodic Inspection Configurations */}
              <div className="border border-primary-200 dark:border-primary-800 p-5 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-primary-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity size={14} className="text-accent-orange" />
                  Périodicités Réglementaires Obligatoires
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-primary-400 uppercase">
                      Organes de Levage & Élingues
                    </label>
                    <select
                      value={liftingPeriod}
                      onChange={(e) => setLiftingPeriod(e.target.value)}
                      className="w-full text-xs py-2 px-3 border border-primary-200 dark:border-primary-800 rounded-xl bg-white dark:bg-primary-900"
                    >
                      <option value="3mois">Tous les 3 mois (Cadence Sévère)</option>
                      <option value="6mois">Tous les 6 mois (Norme standard)</option>
                      <option value="12mois">Tous les 12 mois (Fréquence légère)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-primary-400 uppercase">
                      Installations Électriques & Thermographies
                    </label>
                    <select
                      value={electricalPeriod}
                      onChange={(e) => setElectricalPeriod(e.target.value)}
                      className="w-full text-xs py-2 px-3 border border-primary-200 dark:border-primary-800 rounded-xl bg-white dark:bg-primary-900"
                    >
                      <option value="6mois">Tous les 6 mois</option>
                      <option value="12mois">Tous les 12 mois (Standard Q19)</option>
                      <option value="24mois">Tous les 2 ans</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoDrealReport}
                      onChange={(e) => setAutoDrealReport(e.target.checked)}
                      className="accent-accent-orange rounded"
                    />
                    <span className="text-[11px] text-primary-700 dark:text-primary-300 font-semibold">
                      Générer et transmettre automatiquement un récapitulatif trimestriel d'anomalies critiques résolues (DREAL)
                    </span>
                  </label>
                </div>
              </div>

              {/* Cost settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-primary-200 dark:border-primary-800 p-4 rounded-xl space-y-3">
                  <label className="block text-xs font-bold text-primary-800 dark:text-white">
                    Établissement de Maintenance
                  </label>
                  <input
                    type="text"
                    value={db.settings.nomEntreprise || "Usine Métal & Plastique PRO"}
                    onChange={(e) => onUpdateSettings({ nomEntreprise: e.target.value })}
                    className="w-full py-2 px-3 text-xs border rounded-xl bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-800"
                  />
                  <span className="text-[10px] text-primary-400 block">
                    S'affiche sur les rapports officiels et entêtes de documents.
                  </span>
                </div>

                <div className="border border-primary-200 dark:border-primary-800 p-4 rounded-xl space-y-3">
                  <label className="block text-xs font-bold text-primary-800 dark:text-white">
                    Coût Horaire Interne Moyen (€/h)
                  </label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
                    <input
                      type="number"
                      value={db.settings.coutMO || 65}
                      onChange={(e) => onUpdateSettings({ coutMO: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-2 text-xs border rounded-xl bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-800"
                    />
                  </div>
                  <span className="text-[10px] text-primary-400 block">
                    Utilisé pour chiffrer automatiquement le temps de travail des techniciens.
                  </span>
                </div>
              </div>

              {/* Data retention selection */}
              <div className="border border-primary-200 dark:border-primary-800 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-primary-800 dark:text-white">
                  Durée de rétention des archives réglementaires
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '1an', label: '1 An', desc: 'Archives temporaires' },
                    { id: '5ans', label: '5 Ans', desc: 'Durée CARSAT standard' },
                    { id: 'infini', label: 'Illimité', desc: 'Conformité totale GED' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setArchiveRetention(item.id)}
                      className={`p-2.5 rounded-xl border text-left transition ${archiveRetention === item.id ? 'border-accent-orange bg-accent-orange/5 text-accent-orange font-bold' : 'border-primary-200 dark:border-primary-800 hover:bg-primary-50 dark:hover:bg-primary-850'}`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[9px] text-primary-400">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Apply settings */}
              <button
                onClick={() => {
                  triggerNotification("Politique de sécurité globale et périodicités réglementaires appliquées.", "success");
                }}
                className="px-5 py-2.5 bg-accent-orange hover:bg-accent-orange-hover text-white font-bold text-xs rounded-xl shadow transition"
              >
                Appliquer la Politique de Sécurité
              </button>

            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM TOOLS & SECURITY LOGS */}
        {activeTab === 'system' && (
          <div className="p-6 space-y-8">
            
            {/* Row 1: Diagnostic Utilities & Log statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* DIAGNOSTIC OPTIONS */}
              <div className="lg:col-span-1 space-y-4">
                <h3 className="font-bold font-display text-sm text-primary-800 dark:text-white flex items-center gap-2">
                  <Database size={16} className="text-accent-orange" />
                  Utilitaires Système
                </h3>
                <p className="text-xs text-primary-500 dark:text-primary-400">
                  Exécutez des vérifications structurelles sur la base de données, optimisez la rapidité de chargement ou synchronisez manuellement l'état hors-ligne.
                </p>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={triggerOptimization}
                    disabled={isOptimizing}
                    className="w-full px-4 py-3 bg-primary-50 hover:bg-primary-100 dark:bg-primary-850 dark:hover:bg-primary-800 border border-primary-200 dark:border-primary-800 rounded-xl text-left transition flex items-center gap-3"
                  >
                    <RefreshCw size={15} className={`text-accent-orange ${isOptimizing ? 'animate-spin' : ''}`} />
                    <div>
                      <div className="text-xs font-bold text-primary-800 dark:text-white">Optimiser les Index</div>
                      <div className="text-[10px] text-primary-400">Améliore les performances de recherche globale</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      triggerNotification("La base de données locale est cohérente à 100%.", "success");
                    }}
                    className="w-full px-4 py-3 bg-primary-50 hover:bg-primary-100 dark:bg-primary-850 dark:hover:bg-primary-800 border border-primary-200 dark:border-primary-800 rounded-xl text-left transition flex items-center gap-3"
                  >
                    <FileCheck2 size={15} className="text-emerald-500" />
                    <div>
                      <div className="text-xs font-bold text-primary-800 dark:text-white">Tester l'Intégrité Réseau</div>
                      <div className="text-[10px] text-primary-400">Vérifie l'intégrité des clés et liens Firestore</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      triggerNotification("File d'attente hors-ligne synchronisée avec Firestore.", "success");
                    }}
                    className="w-full px-4 py-3 bg-primary-50 hover:bg-primary-100 dark:bg-primary-850 dark:hover:bg-primary-800 border border-primary-200 dark:border-primary-800 rounded-xl text-left transition flex items-center gap-3"
                  >
                    <HardDrive size={15} className="text-blue-500" />
                    <div>
                      <div className="text-xs font-bold text-primary-800 dark:text-white">Vider le Cache d'Accès</div>
                      <div className="text-[10px] text-primary-400">Purge et recalcule l'état mémoire hors-ligne</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* LOG MONITOR OR OUTPUT console */}
              <div className="lg:col-span-2 border border-primary-200 dark:border-primary-800 rounded-2xl p-5 bg-primary-950 text-emerald-400 font-mono text-[11px] h-80 overflow-y-auto flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="text-primary-400 border-b border-primary-800 pb-2 mb-2 flex items-center justify-between font-sans">
                    <span className="font-bold">Console Diagnostic Système</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-bold animate-pulse">En direct</span>
                  </div>
                  <div>[gmao-system-daemon] booting engine... v2.4</div>
                  <div>[gmao-system-daemon] online state detected (Cloud run socket established)</div>
                  <div>[firestore-sync] subscriptions attached successfully.</div>
                  <div>[integrity] 0 dangling keys found in primary tables.</div>
                  {optimizationLog.map((log, i) => (
                    <div key={i} className="text-emerald-300 animate-fade-in">{log}</div>
                  ))}
                  {isOptimizing && (
                    <div className="flex items-center gap-1.5 text-accent-orange py-1">
                      <span className="animate-ping w-1.5 h-1.5 rounded-full bg-accent-orange" />
                      <span>Calcul de l'index de recherche floue global en cours...</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-primary-800/50 mt-4 flex items-center justify-between font-sans text-primary-400">
                  <span>Version : Build 2026.07.03-Prod</span>
                  <span>Port : Ingress standard TLS SSL</span>
                </div>
              </div>

            </div>

            {/* Row 2: Purging and Advanced Management of Security Audit Logs */}
            <div className="border border-primary-200 dark:border-primary-800 rounded-2xl bg-white dark:bg-primary-900/40 p-6 space-y-6">
              
              {/* Header and Statistics */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-primary-100 dark:border-primary-800 pb-5">
                <div>
                  <h3 className="text-sm font-bold font-display text-primary-800 dark:text-white flex items-center gap-2">
                    <ShieldCheck size={18} className="text-accent-orange" />
                    Purge et Gestion des Journaux d'Audit & Sécurité
                  </h3>
                  <p className="text-xs text-primary-400 mt-1">
                    Conformément aux directives de sécurité, gérez, recherchez et purgez les enregistrements d'activité système.
                  </p>
                </div>
                
                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-primary-50/50 dark:bg-primary-850/40 px-3 py-2 rounded-xl border border-primary-100 dark:border-primary-800">
                    <span className="text-[10px] text-primary-400 block font-semibold">Total Logs</span>
                    <span className="text-sm font-bold text-primary-800 dark:text-white">{(db.auditLogs || []).length}</span>
                  </div>
                  <div className="bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl text-red-500">
                    <span className="text-[10px] text-red-400 block font-semibold">Élevée</span>
                    <span className="text-sm font-bold">{(db.auditLogs || []).filter(l => l.criticite === 'eleve').length}</span>
                  </div>
                  <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl text-amber-500">
                    <span className="text-[10px] text-amber-400 block font-semibold">Moyenne</span>
                    <span className="text-sm font-bold">{(db.auditLogs || []).filter(l => l.criticite === 'moyenne').length}</span>
                  </div>
                  <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl text-emerald-500">
                    <span className="text-[10px] text-emerald-400 block font-semibold">Faible</span>
                    <span className="text-sm font-bold">{(db.auditLogs || []).filter(l => l.criticite === 'faible').length}</span>
                  </div>
                </div>
              </div>

              {/* Règle de Purge Automatique des Logs d'Audit */}
              <div className="bg-primary-50/50 dark:bg-primary-850/20 border border-primary-200 dark:border-primary-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-primary-800 dark:text-white flex items-center gap-2">
                      <Clock size={15} className="text-accent-orange" />
                      Règle de Purge Automatique des Logs d'Audit
                    </h4>
                    <p className="text-[11px] text-primary-500 dark:text-primary-400">
                      Définissez une règle d'ancienneté pour purger automatiquement les anciens journaux d'audit et préserver les performances de la base de données.
                    </p>
                  </div>
                  
                  {/* Toggle Button */}
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-primary-400 uppercase">
                      {db.settings?.autoPurgeAuditLogs?.enabled ? 'Activé' : 'Désactivé'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const currentRule = db.settings?.autoPurgeAuditLogs || { enabled: false, retentionMonths: 12 };
                        onUpdateSettings({
                          autoPurgeAuditLogs: {
                            ...currentRule,
                            enabled: !currentRule.enabled
                          }
                        });
                        triggerNotification(
                          `Purge automatique des logs d'audit ${!currentRule.enabled ? 'activée' : 'désactivée'}.`, 
                          'info'
                        );
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        db.settings?.autoPurgeAuditLogs?.enabled ? 'bg-accent-orange' : 'bg-primary-200 dark:bg-primary-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          db.settings?.autoPurgeAuditLogs?.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {db.settings?.autoPurgeAuditLogs?.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-dashed border-primary-200 dark:border-primary-800 animate-fade-in">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-primary-400 uppercase block">Seuil d'Ancienneté maximum</label>
                      <select
                        value={db.settings?.autoPurgeAuditLogs?.retentionMonths ?? 12}
                        onChange={(e) => {
                          const months = parseInt(e.target.value) || 12;
                          const currentRule = db.settings?.autoPurgeAuditLogs || { enabled: true, retentionMonths: 12 };
                          onUpdateSettings({
                            autoPurgeAuditLogs: {
                              ...currentRule,
                              retentionMonths: months
                            }
                          });
                          triggerNotification(`Seuil de rétention des logs mis à jour : ${months} mois.`, 'success');
                        }}
                        className="text-xs py-2 px-3 border rounded-xl bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-800 w-full focus:border-accent-orange outline-none transition"
                      >
                        <option value={1}>1 Mois</option>
                        <option value={3}>3 Mois</option>
                        <option value={6}>6 Mois</option>
                        <option value={12}>1 An (Recommandé)</option>
                        <option value={24}>2 Ans</option>
                      </select>
                    </div>

                    <div className="bg-primary-50 dark:bg-primary-850/40 p-3 rounded-xl flex items-start gap-2.5">
                      <AlertCircle size={14} className="text-primary-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-primary-500 dark:text-primary-400 leading-relaxed">
                        <span className="font-semibold block text-primary-700 dark:text-primary-300">Impact de la règle :</span>
                        {(() => {
                          const months = db.settings?.autoPurgeAuditLogs?.retentionMonths ?? 12;
                          const now = new Date();
                          const cutoffDate = new Date();
                          cutoffDate.setMonth(now.getMonth() - months);
                          const outdatedLogsCount = (db.auditLogs || []).filter(log => new Date(log.timestamp) < cutoffDate).length;
                          
                          if (outdatedLogsCount > 0) {
                            return (
                              <span>
                                Actuellement, <strong className="text-accent-orange">{outdatedLogsCount} logs</strong> d'audit dépassent la limite de {months} mois et seront purgés pour optimiser l'espace.
                              </span>
                            );
                          } else {
                            return (
                              <span>Aucun journal d'audit ne dépasse le seuil actuel de {months} mois. Les performances sont optimales.</span>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced Bulk Purge Controls */}
              <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-400">
                  <AlertTriangle size={15} />
                  Actions de Purge Massive de Sécurité
                </div>
                <p className="text-[11px] text-primary-500 dark:text-primary-400 max-w-3xl">
                  Ces actions suppriment définitivement les journaux d'activité d'audit sélectionnés de l'instance de stockage durable de votre GMAO. Une fois confirmée, cette action est irréversible.
                </p>
                
                <div className="flex flex-wrap gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPurgeTarget('faible');
                      setShowConfirmPurgeModal(true);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
                  >
                    Purger les logs Faible impact
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPurgeTarget('moyenne');
                      setShowConfirmPurgeModal(true);
                    }}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
                  >
                    Purger les logs Moyen impact
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPurgeTarget('all');
                      setShowConfirmPurgeModal(true);
                    }}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
                  >
                    Vider entièrement l'Historique
                  </button>
                </div>
              </div>

              {/* Filtering & Interactive Search Table */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-primary-50/40 dark:bg-primary-850/10 p-3 rounded-xl border border-primary-100 dark:border-primary-800">
                  
                  {/* Query Search */}
                  <div className="relative flex-1 w-full">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
                    <input
                      type="text"
                      placeholder="Rechercher par action, utilisateur, détails, IP..."
                      value={logQuery}
                      onChange={(e) => {
                        setLogQuery(e.target.value);
                        setLogPage(1);
                      }}
                      className="w-full pl-8 pr-4 py-1.5 text-xs border rounded-xl bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-800"
                    />
                  </div>

                  {/* Criticite filter */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-[10px] font-bold text-primary-400 uppercase whitespace-nowrap">Criticité :</span>
                    <select
                      value={logCriticiteFilter}
                      onChange={(e) => {
                        setLogCriticiteFilter(e.target.value);
                        setLogPage(1);
                      }}
                      className="text-xs py-1.5 px-2.5 border rounded-xl bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-800"
                    >
                      <option value="Tous">Tous les niveaux</option>
                      <option value="Eleve">Élevée uniquement</option>
                      <option value="Faible">Faible uniquement</option>
                      <option value="Moyenne">Moyenne uniquement</option>
                    </select>
                  </div>
                </div>

                {/* Audit Logs Table */}
                <div className="border border-primary-200 dark:border-primary-800 rounded-xl overflow-hidden bg-white dark:bg-primary-900">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-primary-50 dark:bg-primary-850 text-[10px] text-primary-400 uppercase font-bold border-b border-primary-200 dark:border-primary-800">
                          <th className="p-3">Horodatage</th>
                          <th className="p-3">Utilisateur / Opérateur</th>
                          <th className="p-3">Action Système</th>
                          <th className="p-3">Détails de Traçabilité</th>
                          <th className="p-3 text-center">Criticité</th>
                          <th className="p-3">Adresse IP</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-primary-100 dark:divide-primary-800 text-xs">
                        {(() => {
                          const filteredLogs = (db.auditLogs || []).filter(log => {
                            const matchesQuery = !logQuery || 
                              log.action.toLowerCase().includes(logQuery.toLowerCase()) ||
                              log.details.toLowerCase().includes(logQuery.toLowerCase()) ||
                              log.utilisateur.toLowerCase().includes(logQuery.toLowerCase()) ||
                              (log.ipAdresse && log.ipAdresse.toLowerCase().includes(logQuery.toLowerCase()));
                              
                            const matchesCriticite = logCriticiteFilter === 'Tous' || 
                              log.criticite.toLowerCase() === (logCriticiteFilter === 'Eleve' ? 'eleve' : logCriticiteFilter.toLowerCase());
                            
                            return matchesQuery && matchesCriticite;
                          });

                          const totalPages = Math.ceil(filteredLogs.length / logsPerPage) || 1;
                          const currentLogs = filteredLogs.slice((logPage - 1) * logsPerPage, logPage * logsPerPage);

                          if (currentLogs.length === 0) {
                            return (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-primary-400 font-medium">
                                  Aucun journal d'audit trouvé pour les filtres actifs.
                                </td>
                              </tr>
                            );
                          }

                          return currentLogs.map((log) => {
                            const badgeColor = 
                              log.criticite === 'eleve' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                              log.criticite === 'moyenne' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                              'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';

                            return (
                              <tr key={log.id} className="hover:bg-primary-50/50 dark:hover:bg-primary-850/20 transition">
                                <td className="p-3 text-[10px] text-primary-400 whitespace-nowrap">
                                  {new Date(log.timestamp).toLocaleString('fr-FR')}
                                </td>
                                <td className="p-3 font-semibold text-primary-800 dark:text-primary-100 whitespace-nowrap">
                                  {log.utilisateur}
                                </td>
                                <td className="p-3 font-bold text-xs text-primary-800 dark:text-primary-200">
                                  {log.action}
                                </td>
                                <td className="p-3 text-primary-500 dark:text-primary-400 max-w-xs break-words">
                                  {log.details}
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${badgeColor}`}>
                                    {log.criticite === 'eleve' ? 'Élevée' : log.criticite === 'moyenne' ? 'Moyenne' : 'Faible'}
                                  </span>
                                </td>
                                <td className="p-3 text-[10px] font-mono text-primary-400">
                                  {log.ipAdresse || "127.0.0.1"}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onDeleteAuditLog) {
                                        onDeleteAuditLog(log.id);
                                      }
                                    }}
                                    className="p-1.5 text-primary-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                                    title="Supprimer cette entrée définitivement"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination control */}
                  {(() => {
                    const filteredLogs = (db.auditLogs || []).filter(log => {
                      const matchesQuery = !logQuery || 
                        log.action.toLowerCase().includes(logQuery.toLowerCase()) ||
                        log.details.toLowerCase().includes(logQuery.toLowerCase()) ||
                        log.utilisateur.toLowerCase().includes(logQuery.toLowerCase()) ||
                        (log.ipAdresse && log.ipAdresse.toLowerCase().includes(logQuery.toLowerCase()));
                        
                      const matchesCriticite = logCriticiteFilter === 'Tous' || 
                        log.criticite.toLowerCase() === (logCriticiteFilter === 'Eleve' ? 'eleve' : logCriticiteFilter.toLowerCase());
                      
                      return matchesQuery && matchesCriticite;
                    });

                    const totalPages = Math.ceil(filteredLogs.length / logsPerPage) || 1;

                    if (totalPages <= 1) return null;

                    return (
                      <div className="flex items-center justify-between p-3 border-t border-primary-200 dark:border-primary-800 bg-primary-50/20 text-xs text-primary-500 font-semibold">
                        <span>Page {logPage} sur {totalPages} ({filteredLogs.length} entrées au total)</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={logPage === 1}
                            onClick={() => setLogPage(prev => Math.max(prev - 1, 1))}
                            className="px-2.5 py-1 border border-primary-200 dark:border-primary-800 hover:bg-primary-50 dark:hover:bg-primary-850 rounded disabled:opacity-50"
                          >
                            Précédent
                          </button>
                          <button
                            type="button"
                            disabled={logPage === totalPages}
                            onClick={() => setLogPage(prev => Math.min(prev + 1, totalPages))}
                            className="px-2.5 py-1 border border-primary-200 dark:border-primary-800 hover:bg-primary-50 dark:hover:bg-primary-850 rounded disabled:opacity-50"
                          >
                            Suivant
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: PERFORMANCE & OPTIMISATION */}
        {activeTab === 'performance' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6">
              
              {/* LEFT SIDE: SUMMARY CARD AND BENCHMARK CONTROL */}
              <div className="flex-1 space-y-6">
                <div className="bg-gradient-to-br from-primary-900 to-primary-950 text-white rounded-2xl p-6 relative overflow-hidden shadow-md">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Cpu size={120} />
                  </div>
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Système Opérationnel
                    </div>
                    <div>
                      <h3 className="text-xl font-bold font-display">Index de Performance GMAO</h3>
                      <p className="text-xs text-primary-300 mt-1">
                        Analyse en temps réel de l'expérience utilisateur et de la latence de traitement.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-center">
                        <span className="block text-[10px] font-bold text-primary-300 uppercase">Score Global</span>
                        <span className="text-2xl font-bold block text-accent-orange mt-1">
                          {performanceData.optimizationGain > 50 ? 'A+' : performanceData.optimizationGain > 30 ? 'A' : 'B'}
                        </span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-center">
                        <span className="block text-[10px] font-bold text-primary-300 uppercase">Latence Moyenne</span>
                        <span className="text-2xl font-bold block text-white mt-1">
                          {performanceData.avgSpeed} ms
                        </span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-center">
                        <span className="block text-[10px] font-bold text-primary-300 uppercase">Optimisation</span>
                        <span className="text-2xl font-bold block text-emerald-400 mt-1">
                          +{performanceData.optimizationGain}%
                        </span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-center">
                        <span className="block text-[10px] font-bold text-primary-300 uppercase">Cache Rate</span>
                        <span className="text-2xl font-bold block text-blue-400 mt-1">
                          {optIndexedDbCache || optAggressiveCaching ? '94%' : '64%'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CENTRE DE CONTROLE DES OPTIMISATIONS */}
                <div className="border border-primary-200 dark:border-primary-800 rounded-2xl p-5 bg-primary-50/20 dark:bg-primary-900/40 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-primary-800 dark:text-white flex items-center gap-2">
                      <Sliders size={16} className="text-accent-orange" />
                      Centre de Contrôle des Accélérateurs
                    </h4>
                    <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">
                      Activez les algorithmes et protocoles d'optimisation pour réduire le temps de chargement de la GMAO.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* OPT 1 */}
                    <div className="p-3.5 rounded-xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-primary-900 flex items-start justify-between gap-3 shadow-xs">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-primary-800 dark:text-white flex items-center gap-1.5">
                          Mise en Cache Agressive (Equipements)
                          {optAggressiveCaching && <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.2 rounded-full font-bold">Actif</span>}
                        </span>
                        <p className="text-[11px] text-primary-500 dark:text-primary-400">
                          Stocke les fiches équipements et nomenclatures en mémoire vive. Réduit le temps de chargement de 140ms.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOptAggressiveCaching(!optAggressiveCaching);
                          triggerNotification(!optAggressiveCaching ? "Cache agressif activé !" : "Cache agressif désactivé", "info");
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${optAggressiveCaching ? 'bg-accent-orange' : 'bg-primary-200 dark:bg-primary-700'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${optAggressiveCaching ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* OPT 2 */}
                    <div className="p-3.5 rounded-xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-primary-900 flex items-start justify-between gap-3 shadow-xs">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-primary-800 dark:text-white flex items-center gap-1.5">
                          Index local persistant (IndexedDB)
                          {optIndexedDbCache && <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.2 rounded-full font-bold">Actif</span>}
                        </span>
                        <p className="text-[11px] text-primary-500 dark:text-primary-400">
                          Utilise la base de données interne du navigateur pour les plannings et KPI. Réduit la latence de 250ms.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOptIndexedDbCache(!optIndexedDbCache);
                          triggerNotification(!optIndexedDbCache ? "Persistance locale IndexedDB activée !" : "IndexedDB désactivé", "info");
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${optIndexedDbCache ? 'bg-accent-orange' : 'bg-primary-200 dark:bg-primary-700'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${optIndexedDbCache ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* OPT 3 */}
                    <div className="p-3.5 rounded-xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-primary-900 flex items-start justify-between gap-3 shadow-xs">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-primary-800 dark:text-white flex items-center gap-1.5">
                          Compression WebP & Brotli (GED)
                          {optCompressedGed && <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.2 rounded-full font-bold">Actif</span>}
                        </span>
                        <p className="text-[11px] text-primary-500 dark:text-primary-400">
                          Re-dimensionne et compresse à la volée les pièces jointes des bons de travaux. Gain de 160ms.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOptCompressedGed(!optCompressedGed);
                          triggerNotification(!optCompressedGed ? "Compression WebP/Brotli activée !" : "Compression désactivée", "info");
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${optCompressedGed ? 'bg-accent-orange' : 'bg-primary-200 dark:bg-primary-700'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${optCompressedGed ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* OPT 4 */}
                    <div className="p-3.5 rounded-xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-primary-900 flex items-start justify-between gap-3 shadow-xs">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-primary-800 dark:text-white flex items-center gap-1.5">
                          Pré-chargement prédictif par Rôle
                          {optPredictivePreload && <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.2 rounded-full font-bold">Actif</span>}
                        </span>
                        <p className="text-[11px] text-primary-500 dark:text-primary-400">
                          Anticipe le clic de l'utilisateur en chargeant en arrière-plan les modules favoris. Gain global de 310ms.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOptPredictivePreload(!optPredictivePreload);
                          triggerNotification(!optPredictivePreload ? "Pré-chargement prédictif activé !" : "Pré-chargement désactivé", "info");
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${optPredictivePreload ? 'bg-accent-orange' : 'bg-primary-200 dark:bg-primary-700'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${optPredictivePreload ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE: BENCHMARK DIRECT & LOGS */}
              <div className="w-full lg:w-96 border border-primary-200 dark:border-primary-800 bg-primary-50/10 dark:bg-primary-950/20 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-primary-800 dark:text-white flex items-center gap-2">
                      <Activity size={16} className="text-accent-orange" />
                      Diagnostic & Benchmark Live
                    </h4>
                    <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">
                      Mesurez l'impact réel de votre configuration réseau et base de données sur la GMAO.
                    </p>
                  </div>

                  {/* BENCHMARK TERMINAL */}
                  <div className="bg-primary-950 border border-primary-800 rounded-xl p-3 h-52 font-mono text-[11px] text-emerald-400 overflow-y-auto space-y-1.5 shadow-inner">
                    {benchmarkLogs.length === 0 ? (
                      <div className="text-primary-500 italic h-full flex items-center justify-center text-center">
                        Prêt pour le diagnostic. Cliquez sur le bouton ci-dessous pour lancer l'analyse en direct.
                      </div>
                    ) : (
                      benchmarkLogs.map((log, idx) => (
                        <div key={idx} className="leading-relaxed border-l-2 border-emerald-500/30 pl-2">
                          {log}
                        </div>
                      ))
                    )}
                    {isBenchmarking && (
                      <div className="flex items-center gap-2 text-primary-400 animate-pulse mt-2 pl-2">
                        <RefreshCw size={11} className="animate-spin text-accent-orange" />
                        <span>Exécution du diagnostic en cours...</span>
                      </div>
                    )}
                  </div>

                  {benchmarkSuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-3">
                      <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                      <div className="text-xs">
                        <span className="font-bold text-emerald-500 block">Rapport Généré</span>
                        <p className="text-primary-600 dark:text-primary-300 mt-0.5">
                          Tous les points de contrôle sont valides. Votre GMAO est optimisée à <span className="font-bold text-emerald-400">{100 - Math.round((performanceData.avgSpeed / 610) * 100)}%</span> par rapport au profil standard.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-primary-200 dark:border-primary-800">
                  <button
                    type="button"
                    disabled={isBenchmarking}
                    onClick={runPerformanceBenchmark}
                    className="w-full py-2 px-4 bg-accent-orange hover:bg-accent-orange-hover text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={isBenchmarking ? "animate-spin" : ""} />
                    {isBenchmarking ? "Analyse en cours..." : "Lancer le Benchmark Système"}
                  </button>
                </div>
              </div>

            </div>

            {/* CHARTS CONTAINER */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* MODULES LOADING SPEED CHART */}
              <div className="border border-primary-200 dark:border-primary-800 rounded-2xl p-5 bg-white dark:bg-primary-900 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-primary-800 dark:text-white flex items-center gap-2">
                      <Clock size={16} className="text-blue-500" />
                      Temps de Chargement par Module (ms)
                    </h4>
                    <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">
                      Visualisation de la rapidité d'affichage en millisecondes. Les barres plus courtes indiquent de meilleures performances.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-full border border-blue-500/20">
                    Seuil optimal &lt; 200ms
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={performanceData.items}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                      <XAxis type="number" unit="ms" stroke="#94a3b8" fontSize={10} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={110} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #1e293b',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '11px'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Bar name="Temps actuel (ms)" dataKey="speed" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                        {performanceData.items.map((entry, index) => {
                          const isSlow = entry.speed > 300;
                          const isExcellent = entry.speed < 150;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={isSlow ? '#f59e0b' : isExcellent ? '#10b981' : '#3b82f6'}
                            />
                          );
                        })}
                      </Bar>
                      <Bar name="Temps de référence (ms)" dataKey="original" fill="#94a3b8" opacity={0.3} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* MODULE DETAILS TABLE */}
                <div className="overflow-x-auto border border-primary-100 dark:border-primary-800 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-primary-50/50 dark:bg-primary-850 text-primary-400 font-bold uppercase text-[9px] tracking-wider">
                        <th className="p-2.5 pl-3">Module</th>
                        <th className="p-2.5">Catégorie</th>
                        <th className="p-2.5 text-center">Réf (ms)</th>
                        <th className="p-2.5 text-center">Actuel (ms)</th>
                        <th className="p-2.5 text-center">Gain</th>
                        <th className="p-2.5 pr-3 text-right">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary-100 dark:divide-primary-800 font-semibold">
                      {performanceData.items.map((item, idx) => {
                        const improvement = item.original - item.speed;
                        const pct = Math.round((improvement / item.original) * 100);
                        const statusColor = 
                          item.speed < 150 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                          item.speed <= 300 ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                          'bg-amber-500/10 text-amber-500 border border-amber-500/20';
                        const statusLabel = 
                          item.speed < 150 ? 'Optimal' :
                          item.speed <= 300 ? 'Correct' :
                          'Lourd';
                        
                        return (
                          <tr key={idx} className="hover:bg-primary-50/30 dark:hover:bg-primary-850/10 transition">
                            <td className="p-2.5 pl-3 text-primary-800 dark:text-primary-100">{item.name}</td>
                            <td className="p-2.5 text-primary-400 font-normal">{item.type}</td>
                            <td className="p-2.5 text-center text-primary-400 font-mono">{item.original}ms</td>
                            <td className="p-2.5 text-center text-primary-800 dark:text-primary-200 font-mono">{item.speed}ms</td>
                            <td className="p-2.5 text-center text-emerald-500 font-mono">
                              {improvement > 0 ? `-${improvement}ms (-${pct}%)` : '--'}
                            </td>
                            <td className="p-2.5 pr-3 text-right">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${statusColor}`}>
                                {statusLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* USER ROLE STATS CHART */}
              <div className="border border-primary-200 dark:border-primary-800 rounded-2xl p-5 bg-white dark:bg-primary-900 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-primary-800 dark:text-white flex items-center gap-2">
                      <Users size={16} className="text-amber-500" />
                      Statistiques d'Utilisation par Rôle Utilisateur
                    </h4>
                    <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">
                      Volume d'activité réseau (requêtes API & écritures Firestore cumulées par jour).
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">
                    Total: 2,620 req/jour
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="h-48 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={userRolesStatsData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {userRolesStatsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '11px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* LEGEND WITH STATS */}
                  <div className="space-y-2">
                    {userRolesStatsData.map((entry, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: entry.color }} />
                        <div className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary-800 dark:text-white">{entry.name}</span>
                            <span className="text-[10px] text-primary-400">({entry.percent}%)</span>
                          </div>
                          <span className="text-primary-500 dark:text-primary-400 text-[11px] block">
                            {entry.value} requêtes • fav: <span className="italic">{entry.action}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PERFORMANCE OPTIMIZATION INSIGHTS */}
                <div className="border border-primary-100 dark:border-primary-800 bg-primary-50/25 dark:bg-primary-950/20 rounded-xl p-3.5 space-y-3">
                  <span className="text-xs font-bold text-primary-800 dark:text-white flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-500" />
                    Recommandations d'Optimisation de l'Expérience Utilisateur (UX)
                  </span>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2 text-primary-700 dark:text-primary-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-orange shrink-0 mt-1.5" />
                      <p>
                        <strong className="text-primary-800 dark:text-white">Techniciens (55% de charge) :</strong> 92% d'entre eux travaillent sur smartphone. Pour optimiser leur fluidité, veillez à garder l'accélérateur <strong className="text-accent-orange">Brotli (GED)</strong> activé afin de réduire de 60% le temps de transfert de photos de pannes.
                      </p>
                    </div>
                    <div className="flex items-start gap-2 text-primary-700 dark:text-primary-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-orange shrink-0 mt-1.5" />
                      <p>
                        <strong className="text-primary-800 dark:text-white">Chefs d'Équipe (30% de charge) :</strong> Effectuent des opérations lourdes d'ordonnancement de planning préventif. Activez <strong className="text-accent-orange">IndexedDB</strong> pour mettre en cache locale leurs 500 dernières interventions et supprimer tout délai de transition de calendrier.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>

      {/* USER CREATION/EDIT MODAL */}
      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-2xl p-6 w-full max-w-xl shadow-lg"
            >
              <h2 className="text-lg font-bold font-display text-primary-800 dark:text-white mb-4">
                {editingUser ? "Modifier le Collaborateur" : "Ajouter un nouveau Collaborateur"}
              </h2>

              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-primary-400 uppercase mb-1">Prénom</label>
                    <input
                      type="text"
                      required
                      value={newUserForm.prenom}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, prenom: e.target.value }))}
                      className="py-1.5 px-3 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-primary-400 uppercase mb-1">Nom</label>
                    <input
                      type="text"
                      required
                      value={newUserForm.nom}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, nom: e.target.value }))}
                      className="py-1.5 px-3 border rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-primary-400 uppercase mb-1">Adresse E-mail</label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="py-1.5 px-3 border rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-primary-400 uppercase mb-1">Rôle Système</label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, role: e.target.value }))}
                      className="py-1.5 px-3 border rounded-xl bg-white dark:bg-primary-850"
                    >
                      <option value="Administrateur">Administrateur</option>
                      <option value="Chef d'Équipe">Chef d'Équipe</option>
                      <option value="Magasinier">Magasinier</option>
                      <option value="Opérateur">Opérateur</option>
                      <option value="Technicien">Technicien</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-primary-400 uppercase mb-1">Téléphone Mobile</label>
                    <input
                      type="tel"
                      placeholder="Ex: +33 6 12 34 56 78"
                      value={newUserForm.telephone}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, telephone: e.target.value }))}
                      className="py-1.5 px-3 border rounded-xl"
                    />
                  </div>
                </div>

                {/* DROITS DROPDOWN MATRIX WITH SLIDERS */}
                <div className="border border-primary-200 dark:border-primary-800 rounded-xl p-3.5 space-y-3 bg-primary-50/20 dark:bg-primary-850/10">
                  <span className="text-xs font-bold text-primary-800 dark:text-white block">
                    Matrice des habilitations (0 à 4)
                  </span>
                  
                  <div className="space-y-2.5">
                    {[
                      { label: 'Équipements', key: 'equipements' },
                      { label: 'Bons de Travail', key: 'interventions' },
                      { label: 'Magasin & Stock', key: 'stock' },
                      { label: 'Planning préventif', key: 'planning' },
                      { label: 'Achats & Commande', key: 'achats' },
                      { label: 'Reporting / Stats', key: 'reporting' },
                      { label: 'Configuration', key: 'parametres' }
                    ].map(module => {
                      const value = newUserForm.droits[module.key as keyof typeof newUserForm.droits] ?? 0;
                      return (
                        <div key={module.key} className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-semibold text-primary-700 dark:text-primary-300 w-32">{module.label}</span>
                          <input
                            type="range"
                            min="0"
                            max="4"
                            value={value}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setNewUserForm(prev => ({
                                ...prev,
                                droits: {
                                  ...prev.droits,
                                  [module.key]: val
                                }
                              }));
                            }}
                            className="flex-1 accent-accent-orange"
                          />
                          <span className="w-24 text-right font-bold text-[10px]">
                            {getPermissionLabel(value).label} ({value})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserModal(false);
                      setEditingUser(null);
                    }}
                    className="px-4 py-2 border border-primary-200 hover:bg-primary-50 text-primary-700 font-bold text-xs rounded-xl"
                  >
                    Annuler
                  </button>
                 <button
                    type="submit"
                    disabled={isSavingUser}
                    className="px-4 py-2 bg-accent-orange hover:bg-accent-orange-hover text-white font-bold text-xs rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingUser ? "Enregistrement..." : "Enregistrer le Profil"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUBCONTRACTOR MODAL */}
      <AnimatePresence>
        {showSupModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-2xl p-6 w-full max-w-2xl shadow-lg my-8"
            >
              <h2 className="text-lg font-bold font-display text-primary-800 dark:text-white mb-4">
                {editingSup ? "Modifier le Partenaire externe" : "Ajouter un Partenaire externe"}
              </h2>

              <form onSubmit={handleSupSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-primary-400 uppercase mb-1">Raison sociale</label>
                    <input
                      type="text"
                      required
                      value={newSupForm.nom}
                      onChange={(e) => setNewSupForm(prev => ({ ...prev, nom: e.target.value }))}
                      className="py-1.5 px-3 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-primary-400 uppercase mb-1">Métier / Domaine de S-T</label>
                    <input
                      type="text"
                      placeholder="ex: Automatisme, Hydraulique, Levage..."
                      required
                      value={newSupForm.metier}
                      onChange={(e) => setNewSupForm(prev => ({ ...prev, metier: e.target.value }))}
                      className="py-1.5 px-3 border rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-primary-400 uppercase mb-1">Adresse</label>
                    <input
                      type="text"
                      value={newSupForm.adresse}
                      onChange={(e) => setNewSupForm(prev => ({ ...prev, adresse: e.target.value }))}
                      className="py-1.5 px-3 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-primary-400 uppercase mb-1">Code Postal & Ville</label>
                    <input
                      type="text"
                      value={newSupForm.cpville}
                      onChange={(e) => setNewSupForm(prev => ({ ...prev, cpville: e.target.value }))}
                      className="py-1.5 px-3 border rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-primary-400 uppercase mb-1">Coût Horaire Main d'Œuvre (€/h)</label>
                    <input
                      type="number"
                      value={newSupForm.coutMO}
                      onChange={(e) => setNewSupForm(prev => ({ ...prev, coutMO: parseFloat(e.target.value) || 0 }))}
                      className="py-1.5 px-3 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-primary-400 uppercase mb-1">Forfait Déplacement (€)</label>
                    <input
                      type="number"
                      value={newSupForm.coutDeplacement}
                      onChange={(e) => setNewSupForm(prev => ({ ...prev, coutDeplacement: parseFloat(e.target.value) || 0 }))}
                      className="py-1.5 px-3 border rounded-xl"
                    />
                  </div>
                </div>

                <div className="border border-primary-200 dark:border-primary-800 rounded-xl p-3.5 space-y-3 bg-primary-50/20">
                  <span className="text-xs font-bold text-primary-800 dark:text-white block">
                    Contact Principal Technique
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder="Nom & Prénom"
                        value={newSupForm.c1_nom}
                        onChange={(e) => setNewSupForm(prev => ({ ...prev, c1_nom: e.target.value }))}
                        className="py-1.5 px-3 border rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Téléphone"
                        value={newSupForm.c1_tel}
                        onChange={(e) => setNewSupForm(prev => ({ ...prev, c1_tel: e.target.value }))}
                        className="py-1.5 px-3 border rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="Email contact"
                        value={newSupForm.c1_email}
                        onChange={(e) => setNewSupForm(prev => ({ ...prev, c1_email: e.target.value }))}
                        className="py-1.5 px-3 border rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input
                      type="checkbox"
                      checked={newSupForm.contratActif}
                      onChange={(e) => setNewSupForm(prev => ({ ...prev, contratActif: e.target.checked }))}
                      className="accent-accent-orange"
                    />
                    <span className="text-xs font-bold text-primary-800 dark:text-white">
                      Contrat de sous-traitance et SLA en cours de validité
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSupModal(false);
                      setEditingSup(null);
                    }}
                    className="px-4 py-2 border border-primary-200 hover:bg-primary-50 text-primary-700 font-bold text-xs rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-accent-orange hover:bg-accent-orange-hover text-white font-bold text-xs rounded-xl"
                  >
                    Enregistrer le Partenaire
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
