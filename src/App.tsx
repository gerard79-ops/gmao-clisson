/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  loadDatabase,
  saveDatabase,
  resetDatabase,
  syncOfflineQueue
} from './data';
import {
  checkAndSeedFirestore,
  subscribeToGMAODatabase,
  dbSaveSettings,
  dbSaveEquipement,
  dbDeleteEquipement,
  dbSaveIntervention,
  dbDeleteIntervention,
  dbSavePiece,
  dbDeletePiece,
  dbSaveMouvement,
  dbSaveGamme,
  dbDeleteGamme,
  dbSaveCompteur,
  dbSaveSupplier,
  dbDeleteSupplier,
  dbSaveCommande,
  resetFirestoreDatabase,
  importBackupToFirestore,
  dbSaveAuditLog,
  dbSaveDocument,
  dbDeleteDocument,
  dbSaveBudget,
  dbDeleteBudget,
  dbSaveUtilisateur,
  dbDeleteUtilisateur,
  dbDeleteAuditLog,
  dbSavePermissionsMatrix,
  dbDeleteAllInCollection
} from './firebaseSync';
import {
  GlobalSettings,
  Equipement,
  Intervention,
  Piece,
  MouvementStock,
  Commande,
  Compteur,
  GammePreventive,
  Fournisseur,
  AuditLog,
  DocumentGed,
  Budget,
  Utilisateur
} from './types';

// Components imports
import Dashboard from './components/Dashboard';
import Equipements from './components/Equipements';
import Interventions from './components/Interventions';
import Magasin from './components/Magasin';
import Planning from './components/Planning';
import Achats from './components/Achats';
import Reporting from './components/Reporting';
import Reglages from './components/Reglages';
import PortailTerrain from './components/PortailTerrain';
import Cartographie from './components/Cartographie';
import Administration from './components/Administration';
import PortailAtelierDI from './components/PortailAtelierDI';
import GuideUtilisation from './components/GuideUtilisation';
import RapportIntervention from './components/RapportIntervention';
import Login from './components/Login';

// Firebase Auth
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { ForcePasswordChangeModal } from './components/ForcePasswordChangeModal';
import { auth } from './firebase';

// Icons
import {
  LayoutDashboard,
  Wrench,
  ClipboardList,
  Warehouse,
  CalendarDays,
  ShoppingBag,
  SlidersHorizontal,
  Wifi,
  WifiOff,
  ShieldCheck,
  Sun,
  Moon,
  Bell,
  Menu,
  X,
  Search,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  QrCode,
  Map,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  BookOpen,
  FileCheck,
  LogOut,
  Loader2
} from 'lucide-react';

const MODULE_HELP_DATA: Record<string, { title: string; desc: string; features: string[] }> = {
  dashboard: {
    title: "Tableau de Bord",
    desc: "Vue d'ensemble en temps réel de votre activité de maintenance.",
    features: [
      "Indicateurs clés de performance (KPI) : Taux de préventif, MTTR, commandes en attente.",
      "Statistiques interactives filtrables par criticité et par statut de panne.",
      "Mode diaporama automatique idéal pour l'affichage sur écran d'atelier.",
      "Flux d'activité en direct listant les derniers bons de travaux saisis ou modifiés."
    ]
  },
  'portail-terrain': {
    title: "Portail Terrain",
    desc: "Interface ultra-simplifiée conçue pour l'usage mobile des techniciens.",
    features: [
      "Saisie vocale intelligente pour rédiger les comptes-rendus d'intervention sans clavier.",
      "Lecteur de QR Code embarqué pour identifier instantanément les équipements.",
      "Prise de photos intégrée pour documenter les anomalies ou les pièces défectueuses.",
      "Clôture express de bons de travaux (BT) utilisable hors-ligne avec synchronisation."
    ]
  },
  equipements: {
    title: "Parc Équipements",
    desc: "Gestion complète du patrimoine technique et des infrastructures.",
    features: [
      "Arborescence fonctionnelle des machines et fiches techniques détaillées.",
      "Gestion de la criticité des pannes (faible, moyenne, élevée, critique).",
      "Nomenclatures détaillées associant les pièces détachées à chaque équipement.",
      "Historique complet des interventions et des coûts de maintenance cumulés."
    ]
  },
  cartographie: {
    title: "Cartographie SIG",
    desc: "Géolocalisation en direct de vos équipements et de vos équipes.",
    features: [
      "Localisation visuelle des machines sur le plan d'usine ou la carte géographique.",
      "Indicateurs de couleur dynamiques indiquant le niveau d'urgence des pannes.",
      "Sélection d'un marqueur pour ouvrir directement la fiche de l'équipement concerné.",
      "Recherche par zone géographique ou type d'équipement."
    ]
  },
  interventions: {
    title: "Gestion des Interventions",
    desc: "Planification et suivi des Bons de Travail (BT) curatifs et préventifs.",
    features: [
      "Création rapide de demandes d'interventions avec affectation des techniciens.",
      "Cycle de vie du BT : Nouveau, En cours, En attente de pièce, Clôturé.",
      "Suivi des temps d'arrêt machine et temps de travail réels des techniciens.",
      "Association de documents GED (photos, plans de sécurité, manuels)."
    ]
  },
  magasin: {
    title: "Magasin & Stocks",
    desc: "Contrôle en temps réel des pièces de rechange et des inventaires.",
    features: [
      "Suivi quantitatif du stock et calcul automatique de la valeur financière globale.",
      "Alertes de stock critique (niveau inférieur au seuil de sécurité).",
      "Enregistrement des entrées et sorties de pièces avec liaison automatique aux BT.",
      "Valorisation du stock selon la méthode CUMP ou dernier prix d'achat."
    ]
  },
  planning: {
    title: "Planning Préventif",
    desc: "Calendrier interactif d'ordonnancement de la maintenance préventive.",
    features: [
      "Calendrier interactif facilitant le glisser-déposer des tâches planifiées.",
      "Création de gammes de maintenance préventive récurrentes (mensuelles, annuelles).",
      "Génération automatique des bons de travaux à l'échéance programmée.",
      "Filtres avancés par équipe de maintenance ou par statut d'exécution."
    ]
  },
  achats: {
    title: "Achats & Approvisionnements",
    desc: "Suivi des demandes d'achats et commandes de pièces détachées.",
    features: [
      "Processus complet de Demandes d'Achats (DA) et Bons de Commande (BC).",
      "Circuit d'approbation intégré avec validation par les managers habilités.",
      "Association directe des commandes aux fournisseurs enregistrés dans le système.",
      "Suivi de livraison avec réception automatique en stock une fois validée."
    ]
  },
  reporting: {
    title: "Analyses & Reporting",
    desc: "Génération automatique d'indicateurs de performance clés (KPI).",
    features: [
      "Calcul automatique des temps moyens de réparation (MTTR) et de bon fonctionnement (MTBF).",
      "Analyse de la répartition des coûts (main d'œuvre vs pièces détachées).",
      "Indicateurs de conformité réglementaire et taux de couverture préventive.",
      "Module d'exportation de rapports détaillés au format PDF ou tableur."
    ]
  },
  reglages: {
    title: "Réglages & Préférences",
    desc: "Personnalisation complète de l'ergonomie et de l'environnement GMAO.",
    features: [
      "Choix du mode d'affichage visuel : Clair, Sombre ou Adaptatif (automatique).",
      "Ajustement dynamique de la taille de la police de caractères pour le confort visuel.",
      "Mode contraste renforcé améliorant l'accessibilité de l'application.",
      "Options de gestion et purge de la base de données locale (Cache de secours)."
    ]
  },
  administration: {
    title: "Administration Système",
    desc: "Gestion des rôles, sécurité, fournisseurs et performances.",
    features: [
      "Gestion fine des utilisateurs et attribution des rôles (Technicien, Manager, Admin).",
      "Suivi du journal d'audit de sécurité retraçant chaque action critique.",
      "Base de données des Fournisseurs et prestataires extérieurs sous contrat.",
      "Tableau de bord de performance système (KPI réseau, cache et bande passante)."
    ]
  }
};

export default function App() {
  // Database States
  const [db, setDb] = useState(loadDatabase());
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('fr-FR'));
  const [showHelp, setShowHelp] = useState(false);
  const [lastCheckedAutoPurge, setLastCheckedAutoPurge] = useState<string>('');

  // External Portal State (Workshop/Atelier DI)
  const [isAtelierPortal, setIsAtelierPortal] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash;
    return (
      hash.startsWith('#/portal-di') ||
      hash.startsWith('#/di') ||
      window.location.search.includes('portal=di') ||
      window.location.search.includes('portal=atelier')
    );
  });

  // External Portal State (Field/Portail Terrain)
  const [isTerrainPortal, setIsTerrainPortal] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash;
    return (
      hash.startsWith('#/portal-terrain') ||
      hash.startsWith('#/terrain') ||
      window.location.search.includes('portal=terrain') ||
      window.location.search.includes('portal=field')
    );
  });

  useEffect(() => {
    const handleHashAndUrlChange = () => {
      const hash = window.location.hash;
      const hasPortal = 
        hash.startsWith('#/portal-di') ||
        hash.startsWith('#/di') ||
        window.location.search.includes('portal=di') ||
        window.location.search.includes('portal=atelier');
      setIsAtelierPortal(hasPortal);

      const hasTerrain = 
        hash.startsWith('#/portal-terrain') ||
        hash.startsWith('#/terrain') ||
        window.location.search.includes('portal=terrain') ||
        window.location.search.includes('portal=field');
      setIsTerrainPortal(hasTerrain);
    };
    window.addEventListener('hashchange', handleHashAndUrlChange);
    window.addEventListener('popstate', handleHashAndUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleHashAndUrlChange);
      window.removeEventListener('popstate', handleHashAndUrlChange);
    };
  }, []);

  // Firebase Auth States
const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

 useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    setAuthUser(user);
    setAuthLoading(false);
  });
  return () => unsubscribeAuth();
}, []);

// Dérive le rôle réel depuis la fiche Firestore du collaborateur connecté
useEffect(() => {
  if (!authUser) return;
  const profile = (db.utilisateurs || []).find(
    (u) => u.id === authUser.uid || u.email === authUser.email
  );
  if (profile) {
    const mapped: 'Technicien' | 'Manager' =
      profile.role === 'Administrateur' || profile.role === "Chef d'Équipe"
        ? 'Manager'
        : 'Technicien';
    setUserRole(mapped);
    localStorage.setItem('gmaopro_role', mapped);
    setMustChangePassword(profile.mustChangePassword === true);
  } else if (authUser.email === 'admin@gmaopro.com') {
    setUserRole('Manager');
    localStorage.setItem('gmaopro_role', 'Manager');
  }
}, [authUser, db.utilisateurs]);

const currentUserProfile = (db.utilisateurs || []).find(
  (u) => u.id === authUser?.uid || u.email === authUser?.email
);
const isRealAdmin = (db.utilisateurs || []).some(
  (u) => (u.id === authUser?.uid || u.email === authUser?.email) && u.role === 'Administrateur'
);

  // Simple Role Management (Technicien vs Manager)
  const [userRole, setUserRole] = useState<'Technicien' | 'Manager'>(() => {
    const saved = localStorage.getItem('gmaopro_role');
    return (saved === 'Technicien' || saved === 'Manager') ? saved : 'Manager';
  });

  // Notification Feed States
  const [notifications, setNotifications] = useState<{ id: string; title: string; type: 'info' | 'warn' | 'success'; date: string }[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // App Layout States
  const [activeModule, setActiveModule] = useState<'dashboard' | 'equipements' | 'interventions' | 'rapport-intervention' | 'magasin' | 'planning' | 'achats' | 'reporting' | 'reglages' | 'portail-terrain' | 'cartographie' | 'administration' | 'guide'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('eq') || params.has('machine') || window.location.hash.includes('eq=')) {
        return 'portail-terrain';
      }
    }
    return 'dashboard';
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.has('eq') || params.has('machine') || window.location.hash.includes('eq=')) {
        setActiveModule('portail-terrain');
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Slideshow (Diaporama) States
  const [isSlideshowActive, setIsSlideshowActive] = useState(false);
  const [slideshowStep, setSlideshowStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isSlideshowPaused, setIsSlideshowPaused] = useState(false);

  const SLIDES = useMemo(() => [
    { module: 'equipements' as const, label: 'Équipements critiques' },
    { module: 'magasin' as const, label: 'Alertes stock' },
    { module: 'planning' as const, label: 'Planning préventif' }
  ], []);

  // Track window size for adaptive/responsive theme mode (PC: dark, Mobile: light)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveThemeMode = useMemo(() => {
    const mode = db.settings?.themeMode || 'adaptive';
    if (mode === 'light') return 'light';
    if (mode === 'dark') return 'dark';
    return isMobile ? 'light' : 'dark';
  }, [isMobile, db.settings?.themeMode]);

  // Auto-exit full screen when leaving dashboard (except when slideshow is active)
  useEffect(() => {
    if (activeModule !== 'dashboard' && !isSlideshowActive) {
      setIsFullScreen(false);
    }
  }, [activeModule, isSlideshowActive]);

  // Listen for Escape to exit full screen projection or slideshow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullScreen || isSlideshowActive) {
          setIsFullScreen(false);
          setIsSlideshowActive(false);
          setActiveModule('dashboard');
          try {
            if (document.fullscreenElement && document.exitFullscreen) {
              document.exitFullscreen();
            }
          } catch (err) {
            console.warn(err);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, isSlideshowActive]);

  // Register global guide navigation helper
  useEffect(() => {
    (window as any).gmaoNavigateToGuide = (moduleKey: string) => {
      let targetKey = moduleKey;
      if (moduleKey === 'portail-terrain') targetKey = 'terrain';
      if (moduleKey === 'cartographie') targetKey = 'reporting';
      if (moduleKey === 'administration' || moduleKey === 'reglages') targetKey = 'dashboard';
      
      localStorage.setItem('gmao_guide_target', JSON.stringify({ tab: 'modules', moduleKey: targetKey }));
      setActiveModule('guide');
      window.dispatchEvent(new CustomEvent('gmao_guide_navigate', { detail: { tab: 'modules', moduleKey: targetKey } }));
    };
    return () => {
      delete (window as any).gmaoNavigateToGuide;
    };
  }, []);

  // Slideshow (Diaporama) toggle & controls
  const handleToggleSlideshow = useCallback(() => {
    const nextActive = !isSlideshowActive;
    setIsSlideshowActive(nextActive);
    setIsSlideshowPaused(false);
    
    if (nextActive) {
      setIsFullScreen(true);
      setSlideshowStep(0);
      setTimeLeft(30);
      setActiveModule('equipements');
      
      try {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (e) {
        console.warn(e);
      }
    } else {
      setIsFullScreen(false);
      setActiveModule('dashboard');
      
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (e) {
        console.warn(e);
      }
    }
  }, [isSlideshowActive]);

  const handleNextSlide = useCallback(() => {
    setSlideshowStep(currentStep => {
      const nextStep = (currentStep + 1) % 3;
      setActiveModule(SLIDES[nextStep].module);
      return nextStep;
    });
    setTimeLeft(30);
  }, [SLIDES]);

  const handlePrevSlide = useCallback(() => {
    setSlideshowStep(currentStep => {
      const prevStep = (currentStep - 1 + 3) % 3;
      setActiveModule(SLIDES[prevStep].module);
      return prevStep;
    });
    setTimeLeft(30);
  }, [SLIDES]);

  // Slideshow Timer Loop
  useEffect(() => {
    if (!isSlideshowActive || isSlideshowPaused) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setSlideshowStep(currentStep => {
            const nextStep = (currentStep + 1) % 3;
            setActiveModule(SLIDES[nextStep].module);
            return nextStep;
          });
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSlideshowActive, isSlideshowPaused, slideshowStep, SLIDES]);

  // Stop slideshow if user manually clicks a non-slideshow tab
  useEffect(() => {
    if (isSlideshowActive) {
      const currentSlideModule = SLIDES[slideshowStep].module;
      if (activeModule !== currentSlideModule && activeModule !== 'dashboard') {
        setIsSlideshowActive(false);
        setIsFullScreen(false);
      }
    }
  }, [activeModule, isSlideshowActive, slideshowStep, SLIDES]);

  // Global Quick Search State
  const [globalSearch, setGlobalSearch] = useState('');
  const [showGlobalSearchResults, setShowGlobalSearchResults] = useState(false);

  // Inter-Module communication link
  const [selectedPieceIdFromDashboard, setSelectedPieceIdFromDashboard] = useState<string | null>(null);
  const [selectedEquipementIdFromDashboard, setSelectedEquipementIdFromDashboard] = useState<string | null>(null);
  const [selectedInterventionIdFromDashboard, setSelectedInterventionIdFromDashboard] = useState<string | null>(null);

  const [equipementFilter, setEquipementFilter] = useState<string | null>(null);
  const [interventionFilter, setInterventionFilter] = useState<string | null>(null);
  const [pieceFilter, setPieceFilter] = useState<string | null>(null);

// 1. Setup Firestore Check, Seeding, and Real-time subscription
  useEffect(() => {
    if (!authUser) return; // attend que l'utilisateur soit connecté
    let unsubscribe: (() => void) | null = null;
    checkAndSeedFirestore().then(() => {
      unsubscribe = subscribeToGMAODatabase((updates) => {
        setDb((prev) => ({ ...prev, ...updates }));
        setLastSyncTime(new Date().toLocaleTimeString('fr-FR'));
      });
    }).catch(err => {
      console.error("Firestore sync error:", err);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [authUser]);

  // Security log generator helper
  const handleLogAction = useCallback(async (action: string, details: string, criticite: 'faible' | 'moyenne' | 'eleve' = 'faible') => {
    let userDisplayName = "Utilisateur Inconnu";
const activeEmail = authUser?.email;
    if (activeEmail) {
      if (activeEmail === 'admin@gmaopro.com') {
        userDisplayName = `Jean Dupont (${userRole})`;
      } else if (activeEmail === 'tech1@gmaopro.com') {
        userDisplayName = `Pierre Martin (${userRole})`;
      } else {
        userDisplayName = `${activeEmail} (${userRole})`;
      }
    } else {
      userDisplayName = `Visiteur (${userRole})`;
    }

    const logItem: AuditLog = {
      id: "LOG-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Date.now().toString().slice(-4),
      timestamp: new Date().toISOString(),
      utilisateur: userDisplayName,
      action,
      details,
      criticite,
      ipAdresse: "192.168.1.50"
    };
    try {
      await dbSaveAuditLog(logItem);
    } catch (e) {
      console.warn("Could not save audit log to Firestore:", e);
    }
}, [userRole, authUser]);

  // Update Settings
  const handleUpdateSettings = (payload: Partial<GlobalSettings>) => {
    const nextSettings = { ...db.settings, ...payload };
    dbSaveSettings(nextSettings);
    handleLogAction("Modification Configuration", "Mise à jour des paramètres système globaux par l'administrateur.", "moyenne");
  };

  // Add equipment
  const handleAddEquipement = (payload: Omit<Equipement, 'id'> & { id?: string }) => {
    const newEq: Equipement = {
      ...payload,
      id: payload.id || ("EQ-" + Math.random().toString(36).substring(2, 6).toUpperCase())
    };
    dbSaveEquipement(newEq);
    triggerInAppNotification(`Nouvel équipement ajouté : ${newEq.nom}`, 'success');
    handleLogAction("Création Équipement", `Nouvel équipement enregistré : ${newEq.nom} (${newEq.id})`, "moyenne");
  };

  const handleEditEquipement = (id: string, payload: Partial<Equipement>) => {
    const current = db.equipements.find(eq => eq.id === id);
    if (current) {
      dbSaveEquipement({ ...current, ...payload });
      handleLogAction("Modification Équipement", `Informations de l'équipement ${current.nom} (${id}) modifiées.`, "faible");
    }
  };

  const handleDeleteEquipement = (id: string) => {
    const current = db.equipements.find(eq => eq.id === id);
    dbDeleteEquipement(id);
    handleLogAction("Suppression Équipement", `Suppression définitive de l'équipement : ${current?.nom || id} (${id})`, "eleve");
  };

  // Add technical document to GED
  const handleAddDocument = (payload: Omit<DocumentGed, 'id' | 'dateAjout'>) => {
    const newDoc: DocumentGed = {
      ...payload,
      id: "DOC-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Date.now().toString().slice(-4),
      dateAjout: new Date().toISOString()
    };
    dbSaveDocument(newDoc);
    triggerInAppNotification(`Document "${newDoc.nom}" ajouté à la GED`, 'success');
    handleLogAction("Ajout Document GED", `Nouveau document technique enregistré dans la GED : ${newDoc.nom} (Équipement : ${newDoc.equipementNom})`, "faible");
  };

  // Delete technical document from GED
  const handleDeleteDocument = (id: string) => {
    const docToDelete = (db.documents || []).find(d => d.id === id);
    dbDeleteDocument(id);
    triggerInAppNotification(`Document supprimé de la GED`, 'info');
    if (docToDelete) {
      handleLogAction("Suppression Document GED", `Document supprimé de la GED : ${docToDelete.nom} (Équipement : ${docToDelete.equipementNom})`, "moyenne");
    }
  };

  // Add intervention / BT
  const handleAddIntervention = (payload: Omit<Intervention, 'id' | 'dateCreation'>) => {
    const code = "BT-" + new Date().getFullYear().toString().substring(2, 4) + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const newInt: Intervention = {
      ...payload,
      id: "INT-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
      numero: code,
      dateCreation: new Date().toISOString()
    };
    dbSaveIntervention(newInt);
    triggerInAppNotification(`Nouveau Bon de Travail généré : ${code}`, 'success');
  };

  const handleEditIntervention = (id: string, payload: Partial<Intervention>) => {
    const current = db.interventions.find(int => int.id === id);
    if (current) {
      dbSaveIntervention({ ...current, ...payload });
      if (payload.statut && payload.statut !== current.statut) {
        handleLogAction("Workflow Validation", `Statut du BT n°${current.numero || id} modifié de "${current.statut}" à "${payload.statut}"`, "moyenne");
      }
    }
  };

  const handleDeleteIntervention = (id: string) => {
    const current = db.interventions.find(int => int.id === id);
    dbDeleteIntervention(id);
    handleLogAction("Suppression Interventions", `Suppression définitive du Bon de Travail n°${current?.numero || id} (${id})`, "eleve");
  };

  // Add / Edit pieces
  const handleAddPiece = (payload: Omit<Piece, 'id'>) => {
    const newPiece: Piece = {
      ...payload,
      id: "PC-" + Math.random().toString(36).substring(2, 6).toUpperCase()
    };
    dbSavePiece(newPiece);
    triggerInAppNotification(`Nouvel article magasin référencé : ${newPiece.designation}`, 'success');
    handleLogAction("Création Pièce Magasin", `Création de l'article de rechange : ${newPiece.designation} (Réf: ${newPiece.reference || 'Aucune'})`, "moyenne");
  };

  const handleEditPiece = (id: string, payload: Partial<Piece>) => {
    const current = db.pieces.find(p => p.id === id);
    if (current) {
      dbSavePiece({ ...current, ...payload });
      handleLogAction("Modification Pièce Magasin", `Fiche article ${current.designation} (${id}) mise à jour.`, "faible");
    }
  };

  const handleDeletePiece = (id: string) => {
    const current = db.pieces.find(p => p.id === id);
    dbDeletePiece(id);
    handleLogAction("Suppression Pièce Magasin", `Suppression définitive de l'article magasin : ${current?.designation || id} (${id})`, "eleve");
  };

  // Add stock movement
  const handleAddMouvement = (payload: Omit<MouvementStock, 'id' | 'dateCreation'>) => {
    const newMvt: MouvementStock = {
      ...payload,
      id: "MVT-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
      dateCreation: new Date().toISOString()
    };
    dbSaveMouvement(newMvt);
    const piece = db.pieces.find(p => p.id === payload.pieceId);
    handleLogAction("Ajustement Stock Sensible", `Mouvement d'inventaire sur ${piece?.designation || payload.pieceId} : ${payload.type === 'Entrée' ? '+' : '-'}${payload.quantite} unité(s).`, "moyenne");
  };

  // Add / Edit Gammes
  const handleAddGamme = (payload: Omit<GammePreventive, 'id'>) => {
    const newGamme: GammePreventive = {
      ...payload,
      id: "G-" + Math.random().toString(36).substring(2, 6).toUpperCase()
    };
    dbSaveGamme(newGamme);
    triggerInAppNotification(`Nouvelle gamme FMP ajoutée pour ${newGamme.equipementNom}`, 'success');
  };

  const handleEditGamme = (id: string, payload: Partial<GammePreventive>) => {
    const current = db.gammes.find(g => g.id === id);
    if (current) {
      dbSaveGamme({ ...current, ...payload });
    }
  };

  const handleDeleteGamme = (id: string) => {
    dbDeleteGamme(id);
  };

  // Add Compteur
  const handleAddCompteur = (payload: Omit<Compteur, 'id' | 'dateReleve'>) => {
    const newCompteur: Compteur = {
      ...payload,
      id: "CPT-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
      dateReleve: new Date().toISOString()
    };
    dbSaveCompteur(newCompteur);
    triggerInAppNotification(`Compteur mis à jour pour ${newCompteur.equipementNom}`, 'success');
  };

  // Add / Edit Suppliers
  const handleAddSupplier = (payload: Omit<Fournisseur, 'id'>) => {
    const newSup: Fournisseur = {
      ...payload,
      id: "SUP-" + Math.random().toString(36).substring(2, 6).toUpperCase()
    };
    dbSaveSupplier(newSup);
    triggerInAppNotification(`Nouveau partenaire de sous-traitance agréé : ${newSup.nom}`, 'success');
  };

  const handleEditSupplier = (id: string, payload: Partial<Fournisseur>) => {
    const current = db.suppliers.find(s => s.id === id);
    if (current) {
      dbSaveSupplier({ ...current, ...payload });
    }
  };

  const handleDeleteSupplier = (id: string) => {
    dbDeleteSupplier(id);
  };

  // Add purchase order
  const handleAddCommande = (payload: Omit<Commande, 'id' | 'dateCreation'>) => {
    const newCmd: Commande = {
      ...payload,
      id: "CMD-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
      dateCreation: new Date().toISOString()
    };
    dbSaveCommande(newCmd);
  };

  // Budget Management
  const handleAddBudget = (payload: Omit<Budget, 'id'>) => {
    const newBudget: Budget = {
      ...payload,
      id: "BG-" + Math.random().toString(36).substring(2, 6).toUpperCase()
    };
    dbSaveBudget(newBudget);
    triggerInAppNotification(`Nouveau budget alloué : ${newBudget.atelier} (${newBudget.annee})`, 'success');
    handleLogAction("Création Budget", `Nouveau budget alloué pour l'atelier ${newBudget.atelier} (${newBudget.annee}) : ${newBudget.enveloppe} €`, "faible");
  };

  const handleEditBudget = (id: string, payload: Partial<Budget>) => {
    const current = (db.budgets || []).find(b => b.id === id);
    if (current) {
      dbSaveBudget({ ...current, ...payload });
      triggerInAppNotification(`Budget ${current.atelier} (${current.annee}) mis à jour`, 'success');
      handleLogAction("Modification Budget", `Budget de l'atelier ${current.atelier} (${current.annee}) mis à jour : ${payload.enveloppe ?? current.enveloppe} €`, "faible");
    }
  };

  const handleDeleteBudget = (id: string) => {
    const current = (db.budgets || []).find(b => b.id === id);
    dbDeleteBudget(id);
    if (current) {
      triggerInAppNotification(`Budget ${current.atelier} (${current.annee}) supprimé`, 'info');
      handleLogAction("Suppression Budget", `Suppression du budget pour l'atelier ${current.atelier} (${current.annee})`, "moyenne");
    }
  };

  // Manage Utilisateurs (Collaborateurs)
  const handleAddUtilisateur = (payload: Omit<Utilisateur, 'id'>) => {
    const newU: Utilisateur = {
      ...payload,
      id: "U-" + Math.random().toString(36).substring(2, 6).toUpperCase()
    };
    dbSaveUtilisateur(newU);
    triggerInAppNotification(`Nouveau collaborateur ajouté : ${newU.prenom} ${newU.nom}`, 'success');
    handleLogAction("Création Collaborateur", `Nouveau profil créé : ${newU.prenom} ${newU.nom} (Rôle: ${newU.role})`, "moyenne");
  };

  const handleEditUtilisateur = (id: string, payload: Partial<Utilisateur>) => {
    const current = (db.utilisateurs || []).find(u => u.id === id);
    if (current) {
      dbSaveUtilisateur({ ...current, ...payload });
      handleLogAction("Modification Collaborateur", `Droits ou informations modifiés pour : ${current.prenom} ${current.nom}`, "moyenne");
    }
  };

  const handleDeleteUtilisateur = (id: string) => {
    const current = (db.utilisateurs || []).find(u => u.id === id);
    dbDeleteUtilisateur(id);
    if (current) {
      triggerInAppNotification(`Accès supprimé pour ${current.prenom} ${current.nom}`, 'info');
      handleLogAction("Suppression Collaborateur", `Suppression définitive de l'accès pour : ${current.prenom} ${current.nom}`, "eleve");
    }
  };

const handleSavePermissionsMatrix = async (matrix: typeof db.permissionsMatrix) => {
    setDb((prev) => ({ ...prev, permissionsMatrix: matrix }));
    try {
      await dbSavePermissionsMatrix(matrix);
    } catch (e) {
      console.error('Error saving permissions matrix:', e);
      triggerInAppNotification("Erreur lors de l'enregistrement de la matrice d'habilitations.", 'warn');
    }
  };

const handleDeleteCollection = async (collectionName: string): Promise<number> => {
    return await dbDeleteAllInCollection(collectionName);
  };

  const handleDeleteAuditLog = async (id: string) => {
    try {
      await dbDeleteAuditLog(id);
      triggerInAppNotification("Journal d'audit supprimé", 'info');
    } catch (e) {
      console.error("Failed to delete audit log:", e);
    }
  };

  const handlePurgeAuditLogs = async (criticite?: 'faible' | 'moyenne' | 'eleve' | 'all') => {
    try {
      const logsToPurge = (db.auditLogs || []).filter(log => {
        if (!criticite || criticite === 'all') return true;
        return log.criticite === criticite;
      });

      // Execute deletion of all matching logs
      await Promise.all(logsToPurge.map(log => dbDeleteAuditLog(log.id)));
      
      triggerInAppNotification(`Purge terminée : ${logsToPurge.length} entrées d'audit supprimées`, 'success');
      handleLogAction("Purge Logs Système", `Purge des logs d'audit effectuée (Criticité visée: ${criticite || 'Tous'}, Quantité: ${logsToPurge.length})`, "eleve");
    } catch (e) {
      console.error("Failed to purge audit logs:", e);
      triggerInAppNotification("Une erreur s'est produite lors de la purge", 'warn');
    }
  };

  // Import JSON database backup
  const handleImportBackup = (backupStr: string): boolean => {
    try {
      const parsed = JSON.parse(backupStr);
      if (
        parsed.settings &&
        parsed.equipements &&
        parsed.interventions &&
        parsed.pieces &&
        parsed.mouvements &&
        parsed.gammes &&
        parsed.compteurs &&
        parsed.suppliers &&
        parsed.commandes
      ) {
        importBackupToFirestore(parsed);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  // Export JSON database backup
  const handleExportBackup = (): string => {
    return JSON.stringify(db, null, 2);
  };

  // Trigger local state notification
  const triggerInAppNotification = (title: string, type: 'info' | 'warn' | 'success' = 'info') => {
    const newNotif = {
      id: "N-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      title,
      type,
      date: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 10)); // Keep max 10
  };

  // Automatic Audit Logs Purge Rule engine
  useEffect(() => {
    if (!db.settings || !db.auditLogs || db.auditLogs.length === 0) return;
    
    const rule = db.settings.autoPurgeAuditLogs;
    const ruleString = JSON.stringify(rule || {});
    
    if (lastCheckedAutoPurge === ruleString) return;
    
    if (rule && rule.enabled && rule.retentionMonths > 0) {
      const now = new Date();
      const cutoffDate = new Date();
      cutoffDate.setMonth(now.getMonth() - rule.retentionMonths);
      
      const logsToPurge = db.auditLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate < cutoffDate;
      });
      
      if (logsToPurge.length > 0) {
        setLastCheckedAutoPurge(ruleString);
        console.log(`[Auto-Purge] Deleting ${logsToPurge.length} audit logs older than ${rule.retentionMonths} months...`);
        Promise.all(logsToPurge.map(log => dbDeleteAuditLog(log.id)))
          .then(() => {
            triggerInAppNotification(`[Auto-Purge] ${logsToPurge.length} anciens journaux d'audit ont été purgés automatiquement pour maintenir les performances.`, 'info');
            handleLogAction("Purge Automatique Logs", `Purge automatique de ${logsToPurge.length} journaux d'audit dépassant l'ancienneté de ${rule.retentionMonths} mois.`, "faible");
          })
          .catch(err => {
            console.error("Failed to auto-purge logs:", err);
          });
      } else {
        setLastCheckedAutoPurge(ruleString);
      }
    } else {
      setLastCheckedAutoPurge(ruleString);
    }
  }, [db.settings, db.auditLogs, lastCheckedAutoPurge, handleLogAction]);

  const handleRoleChange = (role: 'Technicien' | 'Manager') => {
    setUserRole(role);
    localStorage.setItem('gmaopro_role', role);
    triggerInAppNotification(`Rôle changé : ${role}`, 'success');
    const logItem: AuditLog = {
      id: "LOG-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Date.now().toString().slice(-4),
      timestamp: new Date().toISOString(),
      utilisateur: `Jean Dupont (${role})`,
      action: "Changement de Rôle",
      details: `Session utilisateur basculée sur le rôle : ${role}`,
      criticite: "faible",
      ipAdresse: "192.168.1.50"
    };
    dbSaveAuditLog(logItem).catch(() => {});
  };

  // Listeners for network status (offline queue synchronizer)
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setSyncStatus('syncing');
      setTimeout(() => {
        syncOfflineQueue();
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('fr-FR'));
        triggerInAppNotification("Réseau restauré. Synchronisation sécurisée TLS 1.3 achevée.", 'success');
      }, 1000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      triggerInAppNotification("Mode hors-connexion activé. Les modifications restent enregistrées localement.", 'warn');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keyboard Shortcuts navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keys inside inputs, textareas, selects
      const activeEl = document.activeElement;
      if (activeEl) {
        const tag = activeEl.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || activeEl.getAttribute('contenteditable') === 'true') {
          return;
        }
      }

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

	if (!e.key) return; // ignore les événements clavier synthétiques sans touche définie

      const shortcuts = db.settings?.shortcuts || defaultShortcuts;
      const pressedKey = e.key.toLowerCase();

      // Find if any module has mapped this pressed key
      const foundModule = Object.entries(shortcuts).find(
        ([_, shortcutKey]) => typeof shortcutKey === 'string' && shortcutKey.toLowerCase() === pressedKey
      )?.[0];

      if (foundModule) {
        setActiveModule(foundModule as any);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [db.settings?.shortcuts]);

  // Auto-scanning thresholds to create reactive notifications (e.g. stock level alarm, pending preventive)
  useEffect(() => {
    const lowStockAlerts = db.pieces.filter(p => p.quantite <= p.seuil);
    if (lowStockAlerts.length > 0) {
      lowStockAlerts.forEach(p => {
        // Trigger one-time notify
        const exists = notifications.some(n => n.title.includes(p.designation));
        if (!exists) {
          triggerInAppNotification(`Alerte réapprovisionnement : ${p.designation} (${p.quantite} pcs restantes)`, 'warn');
        }
      });
    }

    const criticalMachines = db.equipements.filter(eq => eq.criticite === 'Haute' && eq.etat === 'En Panne');
    if (criticalMachines.length > 0) {
      criticalMachines.forEach(m => {
        const exists = notifications.some(n => n.title.includes(m.nom));
        if (!exists) {
          triggerInAppNotification(`Machine critique en panne : ${m.nom} dans l'atelier ${m.atelier}`, 'warn');
        }
      });
    }

    // Auto-scanning preventive alert options (e.g. 48h before due date)
    const today = new Date();
    db.gammes.forEach(g => {
      if (g.alerteActive) {
        if (g.typeDeclencheur === 'Jours' || g.typeDeclencheur === 'Mois') {
          let simulatedDate = new Date(g.dateReference);
          let safety = 0;
          while (simulatedDate <= today && safety < 100) {
            if (g.typeDeclencheur === 'Jours') {
              simulatedDate.setDate(simulatedDate.getDate() + g.valeurDeclencheur);
            } else {
              simulatedDate.setMonth(simulatedDate.getMonth() + g.valeurDeclencheur);
            }
            safety++;
          }
          
          const diffMs = simulatedDate.getTime() - today.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          const limitHours = g.delaiAlerteHeures || 48;
          
          if (diffHours > 0 && diffHours <= limitHours) {
            const dateStr = simulatedDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const alertText = g.typeAlerte === 'email'
              ? `📧 [E-mail envoyé à ${g.destinataireAlerte || 'l\'équipe'}] Intervention de maintenance préventive planifiée sous ${limitHours}h : ${g.titre} sur ${g.equipementNom} (${dateStr})`
              : g.typeAlerte === 'both'
                ? `🔄 [Push + E-mail à ${g.destinataireAlerte || 'l\'équipe'}] Intervention préventive imminente (sous ${limitHours}h) : ${g.titre} sur ${g.equipementNom} (${dateStr})`
                : `🔔 [Alerte Push] Intervention de maintenance préventive planifiée sous ${limitHours}h : ${g.titre} sur ${g.equipementNom} (${dateStr})`;
            
            const exists = notifications.some(n => n.title.includes(g.titre) && n.title.includes(g.equipementNom));
            if (!exists) {
              triggerInAppNotification(alertText, 'info');
            }
          }
        }
      }

      // Check for forgotten maintenance (relance automatique si pas de BT)
      if (g.notifierSiPasDeBt) {
        if (g.typeDeclencheur === 'Jours' || g.typeDeclencheur === 'Mois') {
          let lastDueDate: Date | null = null;
          let sim = new Date(g.dateReference);
          let safety = 0;
          while (sim <= today && safety < 100) {
            lastDueDate = new Date(sim);
            if (g.typeDeclencheur === 'Jours') {
              sim.setDate(sim.getDate() + g.valeurDeclencheur);
            } else {
              sim.setMonth(sim.getMonth() + g.valeurDeclencheur);
            }
            safety++;
          }

          if (lastDueDate) {
            const toleranceDays = g.toleranceJoursPasDeBt || 7;
            const toleranceMs = toleranceDays * 24 * 60 * 60 * 1000;
            const limitTime = lastDueDate.getTime() + toleranceMs;
            
            if (today.getTime() > limitTime) {
              // Check if any intervention has been created for this gamme since lastDueDate (minus 2 days of grace for early creation)
              const hasBt = (db.interventions || []).some(i => 
                i.gammeId === g.id && 
                new Date(i.dateCreation).getTime() >= (lastDueDate!.getTime() - 2 * 24 * 60 * 60 * 1000)
              );

              if (!hasBt) {
                const dateStr = lastDueDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const alertText = `⚠️ [Prévention Oubli] Aucun Bon de Travail n'a été créé pour la gamme "${g.titre}" sur "${g.equipementNom}" (Échéance du ${dateStr}, tolérance de ${toleranceDays} jours dépassée)`;
                
                const exists = notifications.some(n => n.title.includes(`Aucun Bon de Travail n'a été créé pour la gamme "${g.titre}"`));
                if (!exists) {
                  triggerInAppNotification(alertText, 'warn');
                }
              }
            }
          }
        }
      }
    });
  }, [db.pieces, db.equipements, db.gammes, db.interventions, notifications]);

  // Global search lookup handler
  const getGlobalSearchResults = () => {
    if (!globalSearch) return [];
    const q = globalSearch.toLowerCase();
    const results: { type: string; name: string; id: string; targetTab: typeof activeModule }[] = [];

    db.equipements.forEach(eq => {
      if (eq.nom.toLowerCase().includes(q) || eq.code.toLowerCase().includes(q) || (eq.emplacement || '').toLowerCase().includes(q)) {
        results.push({ type: 'Machine', name: `${eq.nom} (${eq.code})`, id: eq.id, targetTab: 'equipements' });
      }
    });

    db.interventions.forEach(int => {
      if (int.titre.toLowerCase().includes(q) || int.code.toLowerCase().includes(q) || (int.intervenant || '').toLowerCase().includes(q)) {
        results.push({ type: 'B.T.', name: `${int.code} : ${int.titre}`, id: int.id, targetTab: 'interventions' });
      }
    });

    db.pieces.forEach(p => {
      if (p.designation.toLowerCase().includes(q) || (p.codeArticle || '').toLowerCase().includes(q) || (p.reference || '').toLowerCase().includes(q)) {
        results.push({ type: 'Rechange', name: p.designation, id: p.id, targetTab: 'magasin' });
      }
    });

    return results.slice(0, 5); // Limit to top 5
  };

  const globalResults = getGlobalSearchResults();

  const handleGlobalResultClick = (res: typeof globalResults[0]) => {
    setActiveModule(res.targetTab);
    if (res.targetTab === 'magasin') {
      setSelectedPieceIdFromDashboard(res.id);
    }
    setGlobalSearch('');
    setShowGlobalSearchResults(false);
  };

  // Navigations linking from Dashboard quick stats
  const handleDashboardNavigate = (targetModule: string, highlightIdOrFilter?: string) => {
    let mod = targetModule as typeof activeModule;
    if (targetModule === 'travaux') mod = 'interventions';
    if (targetModule === 'stock') mod = 'magasin';

    setActiveModule(mod);

    if (mod === 'magasin') {
      if (highlightIdOrFilter === 'rupture') {
        setPieceFilter('rupture');
      } else if (highlightIdOrFilter) {
        setSelectedPieceIdFromDashboard(highlightIdOrFilter);
        setPieceFilter(null);
      } else {
        setPieceFilter(null);
      }
    } else if (mod === 'equipements') {
      if (highlightIdOrFilter === 'HS') {
        setEquipementFilter('HS');
      } else if (highlightIdOrFilter) {
        setSelectedEquipementIdFromDashboard(highlightIdOrFilter);
        setEquipementFilter(null);
      } else {
        setEquipementFilter(null);
      }
    } else if (mod === 'interventions') {
      if (highlightIdOrFilter === 'attente' || highlightIdOrFilter === 'Préventif') {
        setInterventionFilter(highlightIdOrFilter);
      } else if (highlightIdOrFilter) {
        setSelectedInterventionIdFromDashboard(highlightIdOrFilter);
        setInterventionFilter(null);
      } else {
        setInterventionFilter(null);
      }
    }
  };

  if (isAtelierPortal) {
    return (
      <div className={effectiveThemeMode === 'dark' ? 'dark' : ''}>
        <PortailAtelierDI
          equipements={db.equipements}
          interventions={db.interventions}
          settings={db.settings}
          onAddIntervention={handleAddIntervention}
        />
      </div>
    );
  }

  if (isTerrainPortal) {
    return (
      <div className={effectiveThemeMode === 'dark' ? 'dark' : ''}>
        <PortailTerrain
          equipements={db.equipements}
          interventions={db.interventions}
          settings={db.settings}
          pieces={db.pieces}
          onEditEquipement={handleEditEquipement}
          onAddIntervention={handleAddIntervention}
          onUpdateIntervention={handleEditIntervention}
          onAddCompteur={handleAddCompteur}
          onEditPiece={handleEditPiece}
          onAddMouvement={handleAddMouvement}
        />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500 mb-4" />
        <p className="text-sm font-semibold tracking-wide uppercase text-slate-400">Chargement de la session...</p>
      </div>
    );
  }

if (!authUser) {
    return (
      <Login onLoginSuccess={(email) => {
        triggerInAppNotification(`Bienvenue, ${email}.`, "success");
      }} />
    );
  }
  if (mustChangePassword && authUser) {
    return (
      <ForcePasswordChangeModal
        user={authUser}
        onDone={() => setMustChangePassword(false)}
      />
    );
  }

  return (
    <div className={`min-h-screen font-sans bg-primary-100 dark:bg-primary-950 transition-colors duration-300 font-scale-${db.settings.taillePolice} contrast-${db.settings.themeContraste} ${effectiveThemeMode === 'dark' ? 'dark' : ''}`}>
      
      {/* GLOBAL HEADER BAR */}
      {!isFullScreen && (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-primary-900 border-b border-primary-200 dark:border-primary-800 z-50 px-4 flex items-center justify-between">
<div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-accent-orange flex items-center justify-center font-display font-extrabold text-white text-base shadow-sm">
                G
              </span>
              <span className="font-display font-black text-lg tracking-tight text-primary-900 dark:text-white hidden sm:block">
                GMAO<span className="text-accent-orange ml-0.5">PRO</span>
              </span>
            </div>
          </div>

          {/* Global Search and Notifications */}
          <div className="flex items-center gap-4">
            
            {/* Global Fuzzy Search Bar */}
            <div className="relative hidden md:block w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary-400" size={14} />
              <input
                type="text"
                placeholder="Recherche globale immédiate..."
                value={globalSearch}
                onChange={e => {
                  setGlobalSearch(e.target.value);
                  setShowGlobalSearchResults(true);
                }}
                className="pl-8 py-1.5 text-xs bg-primary-50 dark:bg-primary-950 rounded-lg border-primary-200 dark:border-primary-800 w-full"
              />
              {showGlobalSearchResults && globalSearch && (
                <div className="absolute top-11 left-0 right-0 bg-white dark:bg-primary-900 border rounded-lg shadow-xl p-1 z-50 text-xs space-y-1">
                  {globalResults.length === 0 ? (
                    <p className="p-2 text-primary-400 italic text-center">Aucun résultat trouvé.</p>
                  ) : (
                    globalResults.map(res => (
                      <div
                        key={res.id}
                        onClick={() => handleGlobalResultClick(res)}
                        className="p-2 hover:bg-primary-50 dark:hover:bg-primary-800 rounded-lg cursor-pointer flex justify-between items-center"
                      >
                        <strong className="truncate max-w-[180px]">{res.name}</strong>
                        <span className="text-[9px] px-1.5 py-0.5 bg-primary-100 dark:bg-primary-950 font-bold text-primary-500 rounded">
                          {res.type}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

{/* Accès directs portails externes */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const url = window.location.origin + window.location.pathname + '#/portal-terrain';
                  window.open(url, '_blank');
                }}
                className="p-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/30 text-teal-600 dark:text-teal-400 flex items-center justify-center cursor-pointer transition-colors"
                title="Ouvrir le portail terrain (mobile)"
              >
                <QrCode size={18} />
              </button>
              <button
                onClick={() => {
                  const url = window.location.origin + window.location.pathname + '#/portal-di';
                  window.open(url, '_blank');
                }}
                className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 text-accent-orange flex items-center justify-center cursor-pointer transition-colors"
                title="Ouvrir le portail DI (atelier)"
              >
                <ClipboardList size={18} />
              </button>
            </div>

            {/* Quick theme togglers */}
            <button
              onClick={() => {
                let nextMode: 'light' | 'dark' | 'adaptive' = 'adaptive';
                if (db.settings.themeMode === 'adaptive' || !db.settings.themeMode) {
                  nextMode = 'light';
                } else if (db.settings.themeMode === 'light') {
                  nextMode = 'dark';
                } else {
                  nextMode = 'adaptive';
                }
                handleUpdateSettings({ themeMode: nextMode });
              }}
              className="p-1.5 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-800 text-primary-500 relative flex items-center justify-center cursor-pointer"
              title={`Mode actuel : ${
                db.settings.themeMode === 'adaptive' || !db.settings.themeMode
                  ? 'Adaptatif (Clair sur Mobile, Sombre sur PC)'
                  : db.settings.themeMode === 'light'
                  ? 'Clair'
                  : 'Sombre'
              }. Cliquez pour basculer.`}
            >
              {db.settings.themeMode === 'light' ? (
                <Sun size={18} />
              ) : db.settings.themeMode === 'dark' ? (
                <Moon size={18} />
              ) : (
                <div className="relative flex items-center justify-center">
                  {effectiveThemeMode === 'dark' ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-amber-500" />}
                  <span className="absolute -bottom-1 -right-1 text-[7px] bg-indigo-600 text-white font-black px-1 rounded-full border border-white dark:border-primary-900 leading-none">
                    A
                  </span>
                </div>
              )}
            </button>

            {/* In-App push notification center */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="p-1.5 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-800 text-primary-500 relative"
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotificationsDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 bg-white dark:bg-primary-900 border rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-3 border-b flex justify-between items-center bg-primary-50/50 dark:bg-primary-950/20">
                      <span className="font-bold text-xs text-primary-800 dark:text-primary-200">Alertes Temps Réel</span>
                      <button
                        onClick={() => setNotifications([])}
                        className="text-[10px] text-primary-400 hover:text-primary-600 font-bold"
                      >
                        Effacer tout
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-primary-100 dark:divide-primary-800 text-xs">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-center text-primary-400 italic">Aucune alerte active.</p>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="p-3 flex gap-2 hover:bg-primary-50/30 transition">
                            <span className="mt-0.5">
                              {n.type === 'warn' ? <AlertTriangle size={14} className="text-amber-500" /> : <CheckCircle size={14} className="text-emerald-500" />}
                            </span>
                            <div className="flex-1">
                              <p className="font-semibold text-primary-800 dark:text-primary-200">{n.title}</p>
                              <span className="text-[9px] text-primary-400 block mt-1">{n.date}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

{/* Authenticated User Display and Sign Out */}
{authUser && (
              <div className="flex items-center gap-2 border-l border-primary-200 dark:border-primary-800 pl-3">
                <div className="hidden xl:flex flex-col text-right">
                  <span className="text-xs font-semibold text-primary-900 dark:text-white leading-tight">
                    {currentUserProfile ? `${currentUserProfile.prenom} ${currentUserProfile.nom}` : authUser.email}
                  </span>
                  <span className="text-[10px] text-primary-400 font-medium leading-none">
                    {currentUserProfile ? currentUserProfile.role : userRole}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    await signOut(auth);
                    triggerInAppNotification("Déconnexion réussie.", "info");
                  }}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 flex items-center justify-center cursor-pointer transition-colors"
                  title="Se déconnecter"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </header>
      )}

      {/* FLOATING ACTION BADGE WHEN FULLSCREEN */}
      {isFullScreen && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 animate-fade-in max-w-lg w-[calc(100%-2rem)]">
          <div className="bg-white/95 dark:bg-primary-900/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-primary-200 dark:border-primary-800 flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSlideshowPaused ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isSlideshowPaused ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                </span>
                
                {isSlideshowActive ? (
                  <span className="font-bold text-primary-800 dark:text-primary-200 truncate">
                    Diaporama : <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{SLIDES[slideshowStep]?.label}</span>
                  </span>
                ) : (
                  <span className="font-bold text-primary-800 dark:text-primary-200">
                    Mode Projection Actif
                  </span>
                )}
              </div>

              {/* Control Buttons */}
              <div className="flex items-center gap-2">
                {isSlideshowActive && (
                  <div className="flex items-center bg-primary-100 dark:bg-primary-800 p-0.5 rounded-lg border border-primary-200 dark:border-primary-700">
                    <button
                      onClick={handlePrevSlide}
                      className="p-1 hover:bg-white dark:hover:bg-primary-900 rounded text-primary-600 dark:text-primary-300 transition cursor-pointer"
                      title="Précédent"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setIsSlideshowPaused(!isSlideshowPaused)}
                      className="p-1 hover:bg-white dark:hover:bg-primary-900 rounded text-primary-600 dark:text-primary-300 transition cursor-pointer"
                      title={isSlideshowPaused ? "Reprendre" : "Pause"}
                    >
                      {isSlideshowPaused ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                    <button
                      onClick={handleNextSlide}
                      className="p-1 hover:bg-white dark:hover:bg-primary-900 rounded text-primary-600 dark:text-primary-300 transition cursor-pointer"
                      title="Suivant"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    setIsFullScreen(false);
                    setIsSlideshowActive(false);
                    setActiveModule('dashboard');
                    try {
                      if (document.fullscreenElement && document.exitFullscreen) {
                        document.exitFullscreen();
                      }
                    } catch (e) { console.warn(e); }
                  }}
                  className="text-xs font-extrabold text-rose-500 hover:text-rose-600 transition px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                >
                  {isSlideshowActive ? "Quitter" : "Quitter (Échap)"}
                </button>
              </div>
            </div>

            {/* Countdown Progress Bar (only if slideshow is active) */}
            {isSlideshowActive && (
              <div className="w-full space-y-1">
                <div className="flex justify-between items-center text-[10px] text-primary-400 font-bold">
                  <span>Prochaine vue dans {timeLeft}s</span>
                  {isSlideshowPaused && <span className="text-amber-500">Mise en pause</span>}
                </div>
                <div className="w-full bg-primary-100 dark:bg-primary-800 h-1 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 rounded-full ${isSlideshowPaused ? 'bg-amber-400' : 'bg-indigo-500 dark:bg-indigo-400'}`} 
                    style={{ width: `${(timeLeft / 30) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

{/* STICKY MODULE NAVIGATION */}
      {!isFullScreen && (
        <nav className="fixed top-16 left-0 right-0 h-12 bg-white dark:bg-primary-900 border-b border-primary-200 dark:border-primary-800 z-40 overflow-x-auto lg:overflow-visible">
          <div className="flex items-center h-full px-3 gap-1 lg:gap-0.5 min-w-max lg:min-w-0 lg:justify-between lg:px-4">
            {[
              { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
              { id: 'equipements', label: 'Équipements', icon: Wrench },
              { id: 'cartographie', label: 'Cartographie', icon: Map },
              { id: 'interventions', label: 'Bons de Travail', icon: ClipboardList },
              { id: 'rapport-intervention', label: "Rapport d'Intervention", icon: FileCheck },
              { id: 'magasin', label: 'Magasin & Stocks', icon: Warehouse },
              { id: 'planning', label: 'Planning Préventif', icon: CalendarDays },
              { id: 'achats', label: 'Achats / S-T', icon: ShoppingBag },
              { id: 'reporting', label: 'Reporting', icon: BarChart3 },
              { id: 'administration', label: 'Administration', icon: ShieldCheck },
              { id: 'reglages', label: 'Configuration', icon: SlidersHorizontal },
              { id: 'guide', label: "Mode d'emploi", icon: BookOpen }
            ].filter(m => m.id !== 'administration' || isRealAdmin).map(m => {
              const Icon = m.icon;
              const active = activeModule === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveModule(m.id as any)}
                  className={`shrink-0 flex items-center gap-1.5 lg:gap-1 px-3 py-2 lg:px-2 lg:py-1.5 rounded-lg font-bold text-xs lg:text-[10.5px] whitespace-nowrap transition duration-150 ${active ? 'bg-accent-orange text-white shadow-sm' : 'text-primary-500 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-850 hover:text-primary-800'}`}
                >
                  <Icon size={14} className="lg:w-[13px] lg:h-[13px]" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* MAIN CONTAINER CONTENT */}
<main className={`transition-all duration-300 ${isFullScreen ? 'pt-4' : 'pt-28'} p-4 min-h-screen`}>
        <div className={`max-w-7xl mx-auto ${isFullScreen ? 'pb-4' : 'pb-16'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeModule === 'dashboard' && (
                <Dashboard
                  equipements={db.equipements}
                  interventions={db.interventions}
                  pieces={db.pieces}
                  settings={db.settings}
                  onNavigate={handleDashboardNavigate}
                  isFullScreen={isFullScreen}
                  isSlideshowActive={isSlideshowActive}
                  onToggleSlideshow={handleToggleSlideshow}
                  onToggleFullScreen={() => {
                    const next = !isFullScreen;
                    setIsFullScreen(next);
                    
                    // Request actual browser fullscreen if turning on
                    try {
                      if (next) {
                        if (!document.fullscreenElement) {
                          document.documentElement.requestFullscreen().catch(() => {});
                        }
                      } else {
                        if (document.fullscreenElement && document.exitFullscreen) {
                          document.exitFullscreen().catch(() => {});
                        }
                      }
                    } catch (e) {
                      console.warn(e);
                    }
                  }}
                />
              )}

              {activeModule === 'portail-terrain' && (
                <PortailTerrain
                  equipements={db.equipements}
                  interventions={db.interventions}
                  settings={db.settings}
                  pieces={db.pieces}
                  onEditEquipement={handleEditEquipement}
                  onAddIntervention={handleAddIntervention}
                  onUpdateIntervention={handleEditIntervention}
                  onAddCompteur={handleAddCompteur}
                  onEditPiece={handleEditPiece}
                  onAddMouvement={handleAddMouvement}
                />
              )}

              {activeModule === 'equipements' && (
		  <Equipements
                  currentRole={currentUserProfile?.role || userRole}
                  permissionsMatrix={db.permissionsMatrix}
                  equipements={db.equipements}
                  settings={db.settings}                  
		  interventions={db.interventions}
                  mouvements={db.mouvements}
                  pieces={db.pieces}
                  documents={db.documents || []}
                  compteurs={db.compteurs}
                  gammes={db.gammes}
                  onAddEquipement={handleAddEquipement}
                  onEditEquipement={handleEditEquipement}
                  onDeleteEquipement={handleDeleteEquipement}
                  onAddDocument={handleAddDocument}
                  onDeleteDocument={handleDeleteDocument}
                  selectedIdFromDashboard={selectedEquipementIdFromDashboard}
                  onClearNavigationId={() => setSelectedEquipementIdFromDashboard(null)}
                  initialStatusFilter={equipementFilter}
                  onClearStatusFilter={() => setEquipementFilter(null)}
                  initialCriticalityFilter={isSlideshowActive ? 'critique' : undefined}
                  onClearCriticalityFilter={() => {}}
                  onAddIntervention={handleAddIntervention}
                  onAddCompteur={handleAddCompteur}
                />
              )}

              {activeModule === 'cartographie' && (
                <Cartographie
                  equipements={db.equipements}
                  interventions={db.interventions}
                  settings={db.settings}
                  onEditEquipement={handleEditEquipement}
                  onAddIntervention={handleAddIntervention}
                  userRole={userRole}
                />
              )}

              {activeModule === 'interventions' && (
		 <Interventions
                  currentRole={currentUserProfile?.role || userRole}
                  permissionsMatrix={db.permissionsMatrix}
                  interventions={db.interventions}
                  equipements={db.equipements}
                  pieces={db.pieces}
                  settings={db.settings}
                  gammes={db.gammes}
                  onUpdateIntervention={handleEditIntervention}
                  onAddIntervention={handleAddIntervention}
                  userRole={userRole}
                  selectedIdFromDashboard={selectedInterventionIdFromDashboard}
                  onClearNavigationId={() => setSelectedInterventionIdFromDashboard(null)}
                  initialFilter={interventionFilter}
                  onClearFilter={() => setInterventionFilter(null)}
                />
              )}

              {activeModule === 'rapport-intervention' && (
                <RapportIntervention
                  interventions={db.interventions}
                  equipements={db.equipements}
                  pieces={db.pieces}
                  settings={db.settings}
                  onUpdateIntervention={handleEditIntervention}
                  onAddIntervention={handleAddIntervention}
                  onEditPiece={handleEditPiece}
                  onAddMouvement={handleAddMouvement}
                  userRole={userRole}
                  onNavigateToModule={(module) => setActiveModule(module as any)}
                />
              )}

              {activeModule === 'magasin' && (
                <Magasin
		  currentRole={currentUserProfile?.role || userRole}
                  permissionsMatrix={db.permissionsMatrix}
                  pieces={db.pieces}
                  equipements={db.equipements}
                  suppliers={db.suppliers}
                  settings={db.settings}
                  mouvements={db.mouvements}
                  onAddPiece={handleAddPiece}
                  onEditPiece={handleEditPiece}
                  onDeletePiece={handleDeletePiece}
                  onAddMouvement={handleAddMouvement}
                  selectedIdFromDashboard={selectedPieceIdFromDashboard}
                  onClearNavigationId={() => setSelectedPieceIdFromDashboard(null)}
                  initialFilter={isSlideshowActive ? 'rupture' : pieceFilter}
                  onClearFilter={() => setPieceFilter(null)}
                  userRole={userRole}
                />
              )}

              {activeModule === 'planning' && (
                <Planning
		  currentRole={currentUserProfile?.role || userRole}
                  permissionsMatrix={db.permissionsMatrix}
                  gammes={db.gammes}
                  compteurs={db.compteurs}
                  equipements={db.equipements}
                  settings={db.settings}
                  interventions={db.interventions}
                  onAddGamme={handleAddGamme}
                  onEditGamme={handleEditGamme}
                  onDeleteGamme={handleDeleteGamme}
                  onAddCompteur={handleAddCompteur}
                  onEditIntervention={handleEditIntervention}
                  onAddIntervention={handleAddIntervention}
                  userRole={userRole}
                  utilisateurs={db.utilisateurs}
                />
              )}

              {activeModule === 'achats' && (
                <Achats
		  currentRole={currentUserProfile?.role || userRole}
                  permissionsMatrix={db.permissionsMatrix}
                  suppliers={db.suppliers}
                  commandes={db.commandes}
                  settings={db.settings}
                  equipements={db.equipements}
                  budgets={db.budgets || []}
                  onAddSupplier={handleAddSupplier}
                  onEditSupplier={handleEditSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                  onAddCommande={handleAddCommande}
                  onAddBudget={handleAddBudget}
                  onEditBudget={handleEditBudget}
                  onDeleteBudget={handleDeleteBudget}
                  userRole={userRole}
                />
              )}

              {activeModule === 'reporting' && (
                <Reporting
		  currentRole={currentUserProfile?.role || userRole}
                  permissionsMatrix={db.permissionsMatrix}
                  equipements={db.equipements}
                  interventions={db.interventions}
                  pieces={db.pieces}
                  settings={db.settings}
                  gammes={db.gammes}
                  compteurs={db.compteurs}
                  onAddIntervention={handleAddIntervention}
                  onAddCompteur={handleAddCompteur}
                />
              )}

              {activeModule === 'reglages' && (
                <Reglages
		  currentRole={currentUserProfile?.role || userRole}
                  permissionsMatrix={db.permissionsMatrix}
		  onDeleteCollection={handleDeleteCollection}
                  settings={db.settings}
                  onUpdateSettings={handleUpdateSettings}
                  onResetDatabase={resetFirestoreDatabase}
                  onImportBackup={handleImportBackup}
                  onExportBackup={handleExportBackup}
                  equipements={db.equipements}
                  interventions={db.interventions}
                  pieces={db.pieces}
                  auditLogs={db.auditLogs || []}
                  userRole={userRole}
                />
              )}

              {activeModule === 'administration' && isRealAdmin && (
                <Administration
                  db={db}
		  permissionsMatrix={db.permissionsMatrix}
                  onSavePermissionsMatrix={handleSavePermissionsMatrix}
                  userRole={userRole}
                  onAddUtilisateur={handleAddUtilisateur}
                  onEditUtilisateur={handleEditUtilisateur}
                  onDeleteUtilisateur={handleDeleteUtilisateur}
                  onAddSupplier={handleAddSupplier}
                  onEditSupplier={handleEditSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                  onUpdateSettings={handleUpdateSettings}
                  onDeleteAuditLog={handleDeleteAuditLog}
                  onPurgeAuditLogs={handlePurgeAuditLogs}
                  triggerNotification={(msg, type) => triggerInAppNotification(msg, type)}
                />
              )}

              {activeModule === 'guide' && (
                <GuideUtilisation
                  settings={db.settings}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* FOOTER PERSISTENT STATUS BAR */}
      {!isFullScreen && (
        <footer className="fixed bottom-0 left-0 right-0 h-9 bg-white dark:bg-primary-900 border-t border-primary-200 dark:border-primary-800 px-4 flex items-center justify-between text-[10px] text-primary-500 font-bold z-40">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              {isOffline ? (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <WifiOff size={12} /> Mode Hors-connexion
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 animate-pulse">
                  <Wifi size={12} /> Serveur Synchro
                </span>
              )}
            </div>
            
            <div className="hidden sm:flex items-center gap-1">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>Sécurisé en TLS 1.3</span>
            </div>
          </div>

          <div>
            <span>Dernière synchro : {lastSyncTime}</span>
          </div>
        </footer>
      )}

      {/* FLOATING HELP ACTION BUTTON */}
      <div className="fixed bottom-14 right-6 z-50 flex flex-col items-end">
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mb-4 w-80 sm:w-96 max-h-[calc(100vh-180px)] bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-2xl shadow-2xl overflow-hidden text-left flex flex-col"
              id="help-tooltip-card"
            >
              <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-850 dark:to-primary-900 border-b border-primary-100 dark:border-primary-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <HelpCircle className="text-accent-orange" size={20} />
                  <h3 className="font-display font-bold text-sm text-primary-900 dark:text-white">
                    {MODULE_HELP_DATA[activeModule]?.title || "Aide contextuelle"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-primary-400 hover:text-primary-600 dark:hover:text-primary-200 transition p-1 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-800"
                  aria-label="Fermer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <p className="text-xs text-primary-600 dark:text-primary-300 leading-relaxed font-semibold">
                  {MODULE_HELP_DATA[activeModule]?.desc}
                </p>
                <div className="space-y-2.5">
                  <span className="block text-[10px] font-bold text-primary-400 dark:text-primary-500 uppercase tracking-wider">
                    Fonctionnalités principales :
                  </span>
                  <ul className="space-y-2">
                    {MODULE_HELP_DATA[activeModule]?.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-primary-700 dark:text-primary-300 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-orange shrink-0 mt-1.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {activeModule !== 'guide' && (
                  <div className="pt-3 border-t border-primary-100 dark:border-primary-800/60">
                    <button
                      onClick={() => {
                        setShowHelp(false);
                        if ((window as any).gmaoNavigateToGuide) {
                          (window as any).gmaoNavigateToGuide(activeModule);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg transition-all border border-indigo-200/50 dark:border-indigo-800/50 cursor-pointer shadow-xs"
                    >
                      <BookOpen size={14} />
                      <span>Ouvrir le Mode d'Emploi complet</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="bg-primary-50/50 dark:bg-primary-950/20 px-5 py-3 border-t border-primary-100 dark:border-primary-800/60 flex items-center justify-between text-[10px] text-primary-400 dark:text-primary-500 font-bold shrink-0">
                <span>GMAO-PRO • Centre d'aide</span>
                <span className="text-accent-orange">Module actif : {activeModule}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowHelp(!showHelp)}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg focus:outline-none transition-colors border ${
            showHelp
              ? 'bg-primary-800 dark:bg-primary-700 text-white border-primary-700'
              : 'bg-accent-orange hover:bg-accent-orange-hover text-white border-accent-orange'
          }`}
          aria-label="Centre d'aide"
          id="floating-help-button"
        >
          {showHelp ? <X size={22} /> : <HelpCircle size={22} />}
        </motion.button>
      </div>
    </div>
  );
}
