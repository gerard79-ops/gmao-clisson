/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  HelpCircle, 
  Compass, 
  Wrench, 
  ClipboardList, 
  Warehouse, 
  CalendarDays, 
  ShoppingBag, 
  BarChart3, 
  ShieldCheck, 
  SlidersHorizontal, 
  QrCode, 
  Map, 
  LayoutDashboard,
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Mic, 
  TrendingUp, 
  Layers, 
  Info,
  ChevronDown,
  Play,
  Zap,
  Settings,
  User,
  Activity,
  DollarSign,
  Camera,
  Check,
  Plus,
  Minus,
  RefreshCw,
  FileText,
  Download,
  Eye,
  Clock,
  UserCheck,
  History,
  TrendingDown,
  Printer,
  X
} from 'lucide-react';

interface GuideUtilisationProps {
  settings: {
    taillePolice: 'small' | 'medium' | 'large';
    themeContraste: 'normal' | 'high';
    themeMode: 'light' | 'dark' | 'adaptive';
  };
}

export default function GuideUtilisation({ settings }: GuideUtilisationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'intro' | 'modules' | 'glossaire' | 'faq'>('intro');
  const [selectedModuleGuide, setSelectedModuleGuide] = useState<string>('dashboard');
  const [faqOpenIndex, setFAQOpenIndex] = useState<number | null>(null);

  // States for interactive illustrations
  const [illustrationStep, setIllustrationStep] = useState<number>(1);
  const [diaporamaRunning, setDiaporamaRunning] = useState<boolean>(false);
  const [terrainPhoto, setTerrainPhoto] = useState<boolean>(false);
  const [equipmentTab, setEquipmentTab] = useState<'info' | 'parts' | 'history'>('info');
  const [diStatus, setDiStatus] = useState<'new' | 'assigned' | 'resolved' | 'closed'>('new');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [purchaseAmount, setPurchaseAmount] = useState<number>(1250);
  const [purchaseStatus, setPurchaseStatus] = useState<'draft' | 'pending' | 'approved' | 'received'>('draft');
  const [paretoMode, setParetoMode] = useState<'breakdowns' | 'costs'>('breakdowns');
  const [mobileVocalState, setMobileVocalState] = useState<'idle' | 'recording' | 'success'>('idle');
  const [mobileText, setMobileText] = useState('');
  const [miniStockQty, setMiniStockQty] = useState(15);
  const [miniKanbanStatus, setMiniKanbanStatus] = useState<'new' | 'inprogress' | 'done'>('new');
  const [selectedEqNode, setSelectedEqNode] = useState<string>('tour');

  // Predictive search states and ref
  const [suggestActiveIndex, setSuggestActiveIndex] = useState(-1);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchableFeatures = useMemo(() => [
    // Prise en main
    {
      id: 'intro',
      title: 'Introduction au Guide',
      category: 'Prise en main',
      desc: 'Présentation du guide, de son fonctionnement et de l\'apprentissage interactif.',
      keywords: 'accueil introduction guide aide debut',
      tab: 'intro' as const,
      anchorId: 'guide-main-content'
    },
    {
      id: 'cycle-panne',
      title: 'Cycle d\'une Panne (Flux)',
      category: 'Prise en main',
      desc: 'Le flux complet de résolution : du signalement d\'une panne (DI) à sa clôture officielle (BT).',
      keywords: 'cycle panne flux workflow di bt etapes processus',
      tab: 'intro' as const,
      anchorId: 'intro-cycle'
    },
    {
      id: 'premiers-pas',
      title: 'Premiers Pas',
      category: 'Prise en main',
      desc: 'Comment bien démarrer l\'application : connexion, navigation, et configuration initiale.',
      keywords: 'debuter premiers pas connecter demarrer configurer',
      tab: 'intro' as const,
      anchorId: 'intro-steps'
    },
    {
      id: 'consignes-securite',
      title: 'Consignes de Sécurité',
      category: 'Prise en main',
      desc: 'Les règles et consignes de sécurité fondamentales lors des interventions de maintenance.',
      keywords: 'securite consignes regles protection danger gants casque epi',
      tab: 'intro' as const,
      anchorId: 'intro-conseil'
    },

    // Modules
    {
      id: 'mod-dashboard',
      title: 'Tableau de Bord',
      category: 'Modules',
      desc: 'Cockpit de supervision : indicateurs KPI clés (MTBF, MTTR, préventif), répartition et mode diaporama.',
      keywords: 'tableau bord dashboard kpi mtbf mttr preventif couts graphique diaporama supervision',
      tab: 'modules' as const,
      moduleKey: 'dashboard',
      anchorId: 'module-detail-container'
    },
    {
      id: 'mod-terrain',
      title: 'Portail Terrain & Saisie Vocale',
      category: 'Modules',
      desc: 'Outil mobile pour le technicien terrain : scan QR code, saisie vocale intelligente, prise de photos et mode hors-ligne.',
      keywords: 'terrain portable mobile photo qr code vocal micro parler hors-ligne synchronisation',
      tab: 'modules' as const,
      moduleKey: 'terrain',
      anchorId: 'module-detail-container'
    },
    {
      id: 'mod-equipements',
      title: 'Parc Équipements',
      category: 'Modules',
      desc: 'Gestion patrimoniale des machines, arborescence technique par atelier, criticité, notices PDF, nomenclature et historique.',
      keywords: 'equipements machines parc usine atelier arborescence criticité notice pdf nomenclature historique pieces',
      tab: 'modules' as const,
      moduleKey: 'equipements',
      anchorId: 'module-detail-container'
    },
    {
      id: 'mod-interventions',
      title: 'Bons de Travail (BT)',
      category: 'Modules',
      desc: 'Gestion opérationnelle : demandes d\'intervention (DI), bons de travail (BT), saisie des rapports de pannes, signatures électroniques.',
      keywords: 'interventions bons travail bt demandes di panne reparation rapport temps signature',
      tab: 'modules' as const,
      moduleKey: 'interventions',
      anchorId: 'module-detail-container'
    },
    {
      id: 'mod-magasin',
      title: 'Magasin & Pièces de Rechange',
      category: 'Modules',
      desc: 'Gestion des stocks de rechange : valeur financière, alertes de seuils critiques, entrées/sorties de stock et fournisseurs.',
      keywords: 'magasin pieces rechange stocks inventaire seuil critique alerte sortie entree fournisseur',
      tab: 'modules' as const,
      moduleKey: 'magasin',
      anchorId: 'module-detail-container'
    },
    {
      id: 'mod-planning',
      title: 'Planning Préventif',
      category: 'Modules',
      desc: 'Planification et récurrence : calendrier d\'entretien, création de gammes, système anti-oubli de maintenance préventive.',
      keywords: 'planning preventif calendrier entretien gammes recurrence alerte oubli declencheur',
      tab: 'modules' as const,
      moduleKey: 'planning',
      anchorId: 'module-detail-container'
    },
    {
      id: 'mod-achats',
      title: 'Achats & Sous-Traitance',
      category: 'Modules',
      desc: 'Gérez les demandes d\'achat (DA), les budgets annuels de maintenance, les contrats de sous-traitance et évaluation fournisseurs.',
      keywords: 'achats sous-traitance prestataires da budget commande fournisseur devis contrat',
      tab: 'modules' as const,
      moduleKey: 'achats',
      anchorId: 'module-detail-container'
    },
    {
      id: 'mod-reporting',
      title: 'Reporting & Analyses',
      category: 'Modules',
      desc: 'Statistiques avancées : diagramme de Pareto (80/20), répartition financière des coûts, export de rapports d\'activité.',
      keywords: 'reporting analyses statistiques pareto 80/20 kpi couts export csv pdf rapports graphique',
      tab: 'modules' as const,
      moduleKey: 'reporting',
      anchorId: 'module-detail-container'
    },

    // Spécifiques fonctionnalités
    {
      id: 'fn-vocal',
      title: 'Saisie Vocale Intelligente (Speech to Text)',
      category: 'Fonctionnalité',
      desc: 'Rédiger des comptes-rendus ou signaler des pannes par la voix sans clavier.',
      keywords: 'saisie vocale intelligente speech to text micro voix parler dictée mobile',
      tab: 'modules' as const,
      moduleKey: 'terrain',
      anchorId: 'module-detail-container'
    },
    {
      id: 'fn-qrcode',
      title: 'Scanner de QR Codes Machines',
      category: 'Fonctionnalité',
      desc: 'Scannez le code collé sur une machine pour voir sa fiche technique ou signaler une panne.',
      keywords: 'scanner qr code flash flasher mobile etiquette portable appareil photo',
      tab: 'modules' as const,
      moduleKey: 'terrain',
      anchorId: 'module-detail-container'
    },
    {
      id: 'fn-diaporama',
      title: 'Mode Diaporama (Supervision)',
      category: 'Fonctionnalité',
      desc: 'Faire défiler les KPI et les pannes sur un écran mural dans l\'atelier.',
      keywords: 'diaporama supervision defiler atelier ecran geant kpi kpis',
      tab: 'modules' as const,
      moduleKey: 'dashboard',
      anchorId: 'module-detail-container'
    },
    {
      id: 'fn-arborescence',
      title: 'Arborescence Technique de l\'Usine',
      category: 'Fonctionnalité',
      desc: 'Structure hiérarchique des ateliers et machines avec suivi en temps réel de leur disponibilité.',
      keywords: 'arborescence structure arbre atelier usine sous-equipements hiérarchie',
      tab: 'modules' as const,
      moduleKey: 'equipements',
      anchorId: 'module-detail-container'
    },
    {
      id: 'fn-predictif',
      title: 'Maintenance Prédictive & Compteurs',
      category: 'Fonctionnalité',
      desc: 'Analyse d\'évolution d\'usage des compteurs pour estimer la prochaine date de panne.',
      keywords: 'predictive predictif compteurs d\'usure heures marche regression tendance panne estimée',
      tab: 'modules' as const,
      moduleKey: 'equipements',
      anchorId: 'module-detail-container'
    },
    {
      id: 'fn-anti-oubli',
      title: 'Système Anti-Oubli de Préventif',
      category: 'Fonctionnalité',
      desc: 'Alerte automatique si un Bon de Travail préventif programmé n\'est pas effectué.',
      keywords: 'anti-oubli oubli alerte prevention preventif calendrier retard retardataire',
      tab: 'modules' as const,
      moduleKey: 'planning',
      anchorId: 'module-detail-container'
    },
    {
      id: 'fn-pareto',
      title: 'Analyse de Pareto (Loi 80/20)',
      category: 'Fonctionnalité',
      desc: 'Repérez d\'un coup d\'œil les 20% d\'équipements qui causent 80% des arrêts ou des coûts.',
      keywords: 'pareto 80/20 graphique statistiques histogramme récurrentes pannes critiques',
      tab: 'modules' as const,
      moduleKey: 'reporting',
      anchorId: 'module-detail-container'
    },
    {
      id: 'fn-budget',
      title: 'Contrôle Budgétaire de Maintenance',
      category: 'Fonctionnalité',
      desc: 'Suivez en temps réel l\'enveloppe financière dépensée et restante pour vos pièces et prestataires.',
      keywords: 'budget controle enveloppe depenses couts pieces achats argent devises limite',
      tab: 'modules' as const,
      moduleKey: 'achats',
      anchorId: 'module-detail-container'
    },

    // FAQ
    {
      id: 'faq-all',
      title: 'Foire Aux Questions (FAQ)',
      category: 'Ressources',
      desc: 'Réponses aux questions fréquentes : hors-ligne, signature électronique, codes-barres...',
      keywords: 'faq foire aux questions reponses questions frequentes aide probleme',
      tab: 'faq' as const,
      anchorId: 'faq-start'
    },

    // Glossaire
    {
      id: 'glossaire-all',
      title: 'Glossaire Technique',
      category: 'Ressources',
      desc: 'Définitions complètes des acronymes de la maintenance : GMAO, DI, BT, MTBF, MTTR...',
      keywords: 'glossaire definitions termes acronymes gmao di bt mtbf mttr curative preventive',
      tab: 'glossaire' as const,
      anchorId: 'glossaire-start'
    },
  ], []);

  // Trigger vocal simulation
  const handleSimulateVocal = () => {
    if (mobileVocalState === 'idle') {
      setMobileVocalState('recording');
      setMobileText('');
      setTimeout(() => {
        setMobileText("Surchauffe détectée sur le moteur principal du Tour CN 01, bruit anormal.");
        setMobileVocalState('success');
      }, 2500);
    } else {
      setMobileVocalState('idle');
      setMobileText('');
    }
  };

  const glossaryItems = useMemo(() => [
    {
      term: "GMAO",
      def: "Gestion de Maintenance Assistée par Ordinateur",
      desc: "C'est le logiciel actuel dans lequel vous naviguez. Il sert à centraliser toutes les informations concernant vos machines, vos pièces de rechange, vos interventions et vos coûts.",
      example: "Comme un carnet d'entretien numérique géant pour toute l'usine !"
    },
    {
      term: "DI (Demande d'Intervention)",
      def: "Signalement d'une anomalie",
      desc: "Document créé lorsqu'un opérateur ou technicien constate un dysfonctionnement sur une machine (ex : bruit anormal, fuite, voyant rouge). C'est le point de départ de la maintenance.",
      example: "Marc voit une fuite d'huile sous la presse hydraulique. Il scanne le QR code de la presse et clique sur 'Signaler une panne' pour créer une DI."
    },
    {
      term: "BT (Bon de Travail)",
      def: "Ordre d'intervention officiel",
      desc: "Une DI validée se transforme en BT. C'est le document officiel confié à un technicien qui lui dicte la tâche à accomplir, les consignes de sécurité, et sur lequel il saisira son rapport de fin.",
      example: "Le chef d'équipe valide la DI de Marc et assigne le BT n°BT-2026-004 à Sophie (électricienne) pour changer le joint d'étanchéité."
    },
    {
      term: "Maintenance Curative / Corrective",
      def: "Dépannage d'une panne active",
      desc: "Intervention réalisée après la panne. On répare ou remplace ce qui ne fonctionne plus pour remettre l'équipement en état de marche.",
      example: "Le tapis roulant s'est arrêté net. Le technicien intervient en urgence pour remplacer le moteur brûlé."
    },
    {
      term: "Maintenance Préventive",
      def: "Entretien régulier pour éviter les pannes",
      desc: "Interventions programmées à l'avance (selon une fréquence temporelle ou un compteur d'heures) pour nettoyer, graisser, vérifier ou remplacer des pièces d'usure avant qu'elles ne cassent.",
      example: "Toutes les 500 heures de fonctionnement, le technicien effectue la vidange d'huile et le remplacement des filtres d'une machine."
    },
    {
      term: "Pièce critique (Stock)",
      def: "Pièce de rechange vitale",
      desc: "Pièce détachée indispensable au fonctionnement d'une machine clé, dont la rupture de stock provoquerait un arrêt de production prolongé et très coûteux.",
      example: "Une carte électronique d'automate programmable principale est classée 'Critique' avec un stock minimum de sécurité de 1 unité."
    },
    {
      term: "MTBF",
      def: "Temps Moyen de Bon Fonctionnement",
      desc: "Indicateur qui mesure la fiabilité d'une machine. C'est le temps moyen écoulé entre deux pannes consécutives. Plus il est élevé, plus la machine est fiable.",
      example: "Si le compresseur tourne en moyenne 300 heures sans aucune panne, sa MTBF est de 300h."
    },
    {
      term: "MTTR",
      def: "Temps Moyen de Réparation",
      desc: "Indicateur qui mesure la réactivité et la maintenabilité. C'est le temps moyen mis par l'équipe pour diagnostiquer et réparer une panne. Plus il est bas, plus l'équipe est efficace.",
      example: "Si en moyenne l'équipe met 45 minutes pour remettre une machine en route après un arrêt, la MTTR est de 45 min."
    }
  ], []);

  const faqItems = useMemo(() => [
    {
      q: "Comment signaler une panne le plus rapidement possible depuis l'atelier ?",
      a: "Le moyen le plus rapide est d'utiliser le module 'Portail Terrain' depuis votre smartphone ou tablette. Scannez le QR Code collé sur la machine (ou cliquez sur 'Simuler Scan QR Code' si vous êtes sur ordinateur). Le formulaire se pré-remplit instantanément avec les infos de la machine. Parlez ensuite au micro grâce à la Saisie Vocale pour décrire le problème sans taper, puis validez !"
    },
    {
      q: "Qui peut valider et clôturer un Bon de Travail (BT) ?",
      a: "Par défaut, les utilisateurs ayant le rôle 'Manager' ou 'Administrateur' ont tous les droits de validation et de clôture financière. Un 'Technicien' peut passer un bon en statut 'En cours' ou 'En validation' (travail fini en attente de visa du responsable), mais la clôture finale et archivage sont réservés pour garantir la conformité des rapports d'entretien."
    },
    {
      q: "Que se passe-t-il si une pièce atteint son seuil d'alerte en stock ?",
      a: "Le système génère automatiquement une alerte visuelle rouge 'Rupture ou Seuil critique' dans le tableau de bord et dans le module Magasin. Une notification est envoyée au magasinier pour qu'il puisse lancer une Demande d'Achat (DA) auprès du fournisseur présélectionné."
    },
    {
      q: "Puis-je utiliser le logiciel s'il n'y a plus de réseau Wi-Fi dans l'atelier ?",
      a: "Oui ! Le 'Portail Terrain' dispose d'un mode hors-ligne intelligent. Vous pouvez continuer à saisir vos rapports d'intervention et relevés de compteurs. Vos données sont conservées temporairement dans la mémoire sécurisée de votre appareil. Dès que le réseau est rétabli, un voyant vert apparaît et vos modifications se synchronisent automatiquement avec le serveur central."
    },
    {
      q: "Comment planifier une tâche de maintenance qui se répète ?",
      a: "Rendez-vous dans le module 'Planning Préventif', puis cliquez sur 'Ajouter une Gamme'. Définissez le titre (ex : Vidange annuelle), associez la machine concernée, choisissez la récurrence (par exemple tous les 3 mois, ou toutes les 1000 heures de marche) et listez les opérations à effectuer. À chaque échéance, le logiciel créera automatiquement un Bon de Travail préventif pré-rempli !"
    }
  ], []);

  const modulesGuideData = {
    dashboard: {
      title: "Tableau de Bord",
      icon: LayoutDashboard,
      color: "text-accent-orange bg-amber-500/10",
      intro: "Votre cockpit de supervision générale. Il permet de voir d'un seul coup d'œil la santé globale de l'usine.",
      steps: [
        "Consultez les 4 indicateurs clés (KPI) en haut : MTBF (fiabilité), MTTR (vitesse de réparation), Taux de préventif (anticipation) et Coût de maintenance.",
        "Observez le graphique de répartition des interventions en cours pour orienter vos priorités de la journée.",
        "Utilisez le bouton 'Activer Diaporama' pour faire défiler automatiquement les données sur un grand écran accroché au mur de l'atelier."
      ],
      tip: "Le bouton 'Personnaliser' vous permet de masquer les widgets qui ne vous intéressent pas afin d'avoir une vue épurée et sur-mesure."
    },
    terrain: {
      title: "Portail Terrain & Saisie Vocale",
      icon: QrCode,
      color: "text-amber-500 bg-amber-500/10",
      intro: "L'outil indispensable du technicien mobile, conçu pour être simple, rapide et utilisable même avec des gants.",
      steps: [
        "Scannez le QR Code physique de la machine pour charger sa fiche d'identité.",
        "Appuyez sur le bouton micro rouge de la Saisie Vocale et décrivez la panne à voix haute : le texte s'écrit tout seul !",
        "Prenez une photo de la pièce défaillante directement avec l'appareil photo du téléphone pour illustrer le problème.",
        "Si vous perdez le réseau Wi-Fi de l'usine, continuez de travailler normalement, le système synchronisera tout à votre retour."
      ],
      tip: "Vous pouvez également faire des relevés de compteurs (ex : heures de marche) pour alimenter le planning préventif en temps réel."
    },
    equipements: {
      title: "Parc Équipements & Patrimoine",
      icon: Wrench,
      color: "text-blue-500 bg-blue-500/10",
      intro: "La bibliothèque de toutes vos machines classées par atelier.",
      steps: [
        "Sélectionnez un atelier de production (ex: Usinage, Injection) pour filtrer les machines.",
        "Observez l'arborescence : chaque équipement parent affiche des barres de progression montrant en temps réel la disponibilité opérationnelle de l'ensemble de ses sous-équipements ainsi que le taux de préventif réalisé.",
        "Cliquez sur une machine pour voir sa fiche d'identité technique, sa notice constructeur au format PDF, et son niveau de criticité.",
        "Consultez la nomenclature (liste des pièces détachées compatibles) pour savoir exactement quel filtre ou joint commander.",
        "Analysez l'historique complet de toutes les pannes passées de la machine pour comprendre ses faiblesses."
      ],
      tip: "La criticité 'A' désigne les machines vitales dont l'arrêt stoppe toute l'usine. Chouchoutez-les en priorité !"
    },
    interventions: {
      title: "Bons de Travail (Interventions)",
      icon: ClipboardList,
      color: "text-sky-500 bg-sky-500/10",
      intro: "Le cœur opérationnel de la maintenance. C'est ici que l'on suit le cycle de vie de chaque dépannage.",
      steps: [
        "Les pannes apparaissent d'abord dans la colonne 'Demandes d'Intervention (DI)' en attente de validation.",
        "Glissez-déposez le bon (ou changez son statut) dans la colonne 'En Cours (BT)' pour démarrer le travail.",
        "À l'intérieur du bon, saisissez votre rapport écrit, le temps que vous avez passé, et les pièces de rechange que vous avez utilisées.",
        "Une fois terminé, passez le bon en 'Validation' pour que votre responsable signe électroniquement et archive le bon."
      ],
      tip: "Mettez une ligne en surbrillance en passant votre souris dessus et cliquez pour ouvrir instantanément ses détails complets !"
    },
    magasin: {
      title: "Magasin & Pièces de Rechange",
      icon: Warehouse,
      color: "text-emerald-500 bg-emerald-500/10",
      intro: "La gestion des stocks de pièces détachées pour éviter la panne sèche.",
      steps: [
        "Visualisez instantanément la valeur financière globale de votre stock de rechanges.",
        "Consultez la liste des pièces et repérez les alertes de seuils critiques (niveau bas ou rupture de stock).",
        "Enregistrez une Sortie de pièce dès que vous l'utilisez pour réparer une machine afin de maintenir le stock informatique à jour.",
        "Faites une Entrée de stock pour enregistrer la livraison des nouvelles pièces commandées."
      ],
      tip: "Chaque pièce est associée à un fournisseur préféré pour accélérer les commandes de réapprovisionnement."
    },
    planning: {
      title: "Planning Préventif",
      icon: CalendarDays,
      color: "text-indigo-500 bg-indigo-500/10",
      intro: "L'agenda de l'entretien préventif pour planifier et anticiper les pannes avant qu'elles ne surviennent.",
      steps: [
        "Visualisez le calendrier mensuel ou hebdomadaire des opérations d'entretien planifiées.",
        "Créez une nouvelle gamme de maintenance récurrente (ex : Graissage des roulements, calibrage des capteurs).",
        "Configurez l'alerte 'Anti-oubli' : cochez la case pour recevoir une notification et une alerte automatique si aucun Bon de Travail n'a été créé après la période de tolérance définie (ex: 7 jours) après l'échéance.",
        "Associez un déclencheur automatique (par exemple : tous les 1ers du mois, ou dès que la machine atteint 2000 heures de fonctionnement).",
        "Le jour J, le système génère et vous envoie automatiquement le Bon de Travail correspondant dans votre liste de tâches."
      ],
      tip: "Le système anti-oubli vérifie régulièrement l'historique et vous protège contre tout oubli de maintenance critique sur vos équipements clés."
    },
    achats: {
      title: "Achats & Sous-Traitance",
      icon: ShoppingBag,
      color: "text-pink-500 bg-pink-500/10",
      intro: "Gérez vos fournisseurs de pièces, vos prestataires de services externes et votre budget annuel.",
      steps: [
        "Créez une Demande d'Achat (DA) lorsque vous manquez de pièces ou devez faire intervenir un expert externe.",
        "Suivez l'enveloppe budgétaire annuelle : le système vous alerte si les dépenses approchent de la limite autorisée.",
        "Enregistrez les contrats de sous-traitance et évaluez la ponctualité de vos fournisseurs à la livraison."
      ],
      tip: "Une DA approuvée se transforme automatiquement en Bon de Commande (BC) prêt à être envoyé par email au fournisseur."
    },
    reporting: {
      title: "Reporting & Analyses",
      icon: BarChart3,
      color: "text-teal-500 bg-teal-500/10",
      intro: "L'outil statistique pour analyser l'efficacité de l'équipe et justifier les budgets de maintenance.",
      steps: [
        "Consultez le graphique Pareto pour voir les 20% d'équipements qui causent 80% des arrêts d'usine (les 'machines à problèmes').",
        "Analysez la répartition financière globale (Coût de main d'œuvre interne vs coût d'achat des pièces).",
        "Exportez des rapports d'activité d'un seul clic au format CSV ou imprimez un rapport PDF propre pour votre réunion de direction."
      ],
      tip: "Un taux de maintenance préventive supérieur à 70% indique une usine saine qui subit peu de pannes imprévues !"
    }
  };

  const filteredGlossary = useMemo(() => {
    if (!searchQuery) return glossaryItems;
    const query = searchQuery.toLowerCase();
    return glossaryItems.filter(item => 
      item.term.toLowerCase().includes(query) || 
      item.def.toLowerCase().includes(query) || 
      item.desc.toLowerCase().includes(query)
    );
  }, [searchQuery, glossaryItems]);

  const [mobileSommaireOpen, setMobileSommaireOpen] = useState(false);

  const navigationItems = [
    {
      group: "1. Prise en Main & Flux",
      items: [
        { label: "Introduction", icon: Compass, tab: 'intro' as const, anchorId: 'guide-main-content' },
        { label: "Cycle d'une Panne (Flux)", icon: Activity, tab: 'intro' as const, anchorId: 'intro-cycle' },
        { label: "Premiers Pas", icon: BookOpen, tab: 'intro' as const, anchorId: 'intro-steps' },
        { label: "Consignes de Sécurité", icon: ShieldCheck, tab: 'intro' as const, anchorId: 'intro-conseil' },
      ]
    },
    {
      group: "2. Guides par Module",
      items: [
        { label: "Tableau de Bord", icon: LayoutDashboard, tab: 'modules' as const, moduleKey: 'dashboard', anchorId: 'module-detail-container' },
        { label: "Portail Terrain & Vocal", icon: QrCode, tab: 'modules' as const, moduleKey: 'terrain', anchorId: 'module-detail-container' },
        { label: "Parc Équipements", icon: Wrench, tab: 'modules' as const, moduleKey: 'equipements', anchorId: 'module-detail-container' },
        { label: "Bons de Travail (BT)", icon: ClipboardList, tab: 'modules' as const, moduleKey: 'interventions', anchorId: 'module-detail-container' },
        { label: "Magasin & Stocks", icon: Warehouse, tab: 'modules' as const, moduleKey: 'magasin', anchorId: 'module-detail-container' },
        { label: "Planning Préventif", icon: CalendarDays, tab: 'modules' as const, moduleKey: 'planning', anchorId: 'module-detail-container' },
        { label: "Achats & Sous-Traitance", icon: ShoppingBag, tab: 'modules' as const, moduleKey: 'achats', anchorId: 'module-detail-container' },
        { label: "Reporting & Analyses", icon: BarChart3, tab: 'modules' as const, moduleKey: 'reporting', anchorId: 'module-detail-container' },
      ]
    },
    {
      group: "3. Ressources",
      items: [
        { label: "Glossaire Technique", icon: Layers, tab: 'glossaire' as const, anchorId: 'glossaire-start' },
        { label: "Foire Aux Questions", icon: HelpCircle, tab: 'faq' as const, anchorId: 'faq-start' },
      ]
    }
  ];

  const navigateToSection = useCallback((tab: 'intro' | 'modules' | 'glossaire' | 'faq', moduleKey?: string, anchorId?: string) => {
    setActiveTab(tab);
    if (moduleKey) {
      setSelectedModuleGuide(moduleKey);
      setIllustrationStep(1);
      setDiaporamaRunning(false);
      setTerrainPhoto(false);
      setDiStatus('new');
      setPurchaseStatus('draft');
    }
    
    setTimeout(() => {
      const element = anchorId ? document.getElementById(anchorId) : document.getElementById('guide-main-content');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, []);

  useEffect(() => {
    const checkTarget = () => {
      const stored = localStorage.getItem('gmao_guide_target');
      if (stored) {
        try {
          const { tab, moduleKey } = JSON.parse(stored);
          navigateToSection(tab, moduleKey, 'module-detail-container');
          localStorage.removeItem('gmao_guide_target');
        } catch (e) {
          console.error(e);
        }
      }
    };

    const handleCustomNavigate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { tab, moduleKey } = customEvent.detail;
        navigateToSection(tab, moduleKey, 'module-detail-container');
        localStorage.removeItem('gmao_guide_target');
      }
    };

    checkTarget();

    window.addEventListener('gmao_guide_navigate', handleCustomNavigate);
    return () => {
      window.removeEventListener('gmao_guide_navigate', handleCustomNavigate);
    };
  }, [navigateToSection]);

  // Combine all searchable items (features + glossary items)
  const allSearchableItems = useMemo(() => {
    const items = [...searchableFeatures];
    // Map glossary items to searchable format
    glossaryItems.forEach((g, idx) => {
      items.push({
        id: `glossary-${idx}`,
        title: `${g.term} (${g.def})`,
        category: 'Glossaire',
        desc: g.desc,
        keywords: `${g.term} ${g.def} ${g.desc} definition`.toLowerCase(),
        tab: 'glossaire' as const,
        anchorId: 'glossaire-start'
      });
    });
    return items;
  }, [searchableFeatures, glossaryItems]);

  // Compute suggestions based on searchQuery
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 1) return [];
    const query = searchQuery.toLowerCase().trim();
    return allSearchableItems.filter(item => {
      return (
        item.title.toLowerCase().includes(query) ||
        item.desc.toLowerCase().includes(query) ||
        item.keywords.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }).slice(0, 8); // Limit to 8 best suggestions
  }, [searchQuery, allSearchableItems]);

  const getCategoryMeta = (category: string) => {
    switch (category) {
      case 'Prise en main':
        return { icon: Compass, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' };
      case 'Modules':
        return { icon: Wrench, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      case 'Fonctionnalité':
        return { icon: Zap, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' };
      case 'Ressources':
        return { icon: HelpCircle, color: 'text-teal-500 bg-teal-500/10 border-teal-500/20' };
      case 'Glossaire':
        return { icon: Layers, color: 'text-pink-500 bg-pink-500/10 border-pink-500/20' };
      default:
        return { icon: BookOpen, color: 'text-primary-500 bg-primary-500/10 border-primary-500/20' };
    }
  };

  const handleSelectSuggestion = (item: any) => {
    setIsSuggestOpen(false);
    setSearchQuery(item.title);
    navigateToSection(item.tab, 'moduleKey' in item ? item.moduleKey : undefined, item.anchorId);
  };

  // Click outside search container to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSuggestOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-6" id="guide-utilisation-container">
      {/* Banner Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-indigo-950">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-400 via-indigo-500 to-indigo-950"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-accent-orange text-white tracking-widest animate-pulse">
              <BookOpen size={10} /> Mode d'emploi officiel
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
              Guide d'Utilisation GMAO-PRO
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 max-w-2xl leading-relaxed">
              Bienvenue dans votre guide d'apprentissage. Conçu spécifiquement pour être simple et compréhensible par tous, il vous guidera étape par étape dans l'utilisation de chaque outil de l'application grâce à des explications claires et des prototypes de démonstration interactifs.
            </p>
            <div className="pt-2 flex flex-wrap gap-2.5 print-hide">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent-orange hover:bg-amber-600 active:scale-95 text-white text-xs font-extrabold rounded-xl transition shadow-md hover:shadow-lg cursor-pointer font-sans"
              >
                <Printer size={14} />
                <span>Télécharger / Imprimer le Guide (PDF)</span>
              </button>
            </div>
          </div>
          
          {/* Quick search with predictive autocomplete */}
          <div ref={searchRef} className="relative w-full md:w-96 print-hide">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-300" size={16} />
              <input
                type="text"
                placeholder="Rechercher (ex: MTBF, scan QR, panne...)"
                value={searchQuery}
                onFocus={() => setIsSuggestOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSuggestOpen(true);
                  setSuggestActiveIndex(-1);
                  if (activeTab === 'intro') {
                    setActiveTab('glossaire');
                  }
                }}
                onKeyDown={(e) => {
                  if (filteredSuggestions.length === 0) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSuggestActiveIndex(prev => (prev + 1) % filteredSuggestions.length);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSuggestActiveIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const indexToSelect = suggestActiveIndex >= 0 ? suggestActiveIndex : 0;
                    const selectedItem = filteredSuggestions[indexToSelect];
                    if (selectedItem) {
                      handleSelectSuggestion(selectedItem);
                    }
                  } else if (e.key === 'Escape') {
                    setIsSuggestOpen(false);
                  }
                }}
                className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 rounded-xl py-2.5 pl-10 pr-12 text-xs font-semibold placeholder:text-indigo-200 text-white outline-none focus:ring-2 focus:ring-accent-orange transition-all shadow-inner"
              />
              {searchQuery && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setIsSuggestOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-200 hover:text-white bg-white/20 p-1 rounded-md transition cursor-pointer"
                  title="Vider la recherche"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Predictive suggestions dropdown */}
            <AnimatePresence>
              {isSuggestOpen && filteredSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-50 mt-2 w-full bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-xl shadow-xl overflow-hidden max-h-96 overflow-y-auto"
                >
                  <div className="p-2 border-b border-primary-100 dark:border-primary-850 flex items-center justify-between bg-primary-50/50 dark:bg-primary-950/20">
                    <span className="text-[10px] font-bold text-primary-400 dark:text-primary-500 uppercase tracking-wider">
                      Suggestions prédictives ({filteredSuggestions.length})
                    </span>
                    <span className="text-[9px] text-primary-400 font-medium">
                      Utilisez ↑↓ et Entrée
                    </span>
                  </div>
                  <div className="divide-y divide-primary-50 dark:divide-primary-850">
                    {filteredSuggestions.map((item, index) => {
                      const isActive = index === suggestActiveIndex;
                      const { icon: Icon, color: categoryColor } = getCategoryMeta(item.category);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectSuggestion(item)}
                          onMouseEnter={() => setSuggestActiveIndex(index)}
                          className={`w-full text-left px-4 py-3 flex gap-3 items-start transition-all cursor-pointer ${
                            isActive 
                              ? 'bg-primary-100/60 dark:bg-primary-800/80 text-primary-900 dark:text-white' 
                              : 'hover:bg-primary-50/50 dark:hover:bg-primary-850/50 text-primary-700 dark:text-primary-200'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 ${categoryColor}`}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold truncate">
                                {item.title}
                              </span>
                              <span className={`shrink-0 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${categoryColor}`}>
                                {item.category}
                              </span>
                            </div>
                            <p className="text-[10px] text-primary-500 dark:text-primary-400 line-clamp-1">
                              {item.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile Sommaire Trigger (visible only on mobile/tablet) */}
      <div className="lg:hidden print-hide mb-4">
        <div className="card bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800 rounded-2xl overflow-hidden shadow-xs">
          <button
            onClick={() => setMobileSommaireOpen(!mobileSommaireOpen)}
            className="w-full flex items-center justify-between p-4 font-extrabold text-xs text-primary-900 dark:text-white hover:bg-primary-50/50 dark:hover:bg-primary-950/10 transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Compass size={16} className="text-accent-orange animate-pulse" />
              <span>SOMMAIRE DU GUIDE D'UTILISATION</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-primary-400 bg-primary-100 dark:bg-primary-800 px-2 py-0.5 rounded-full uppercase">Navigation Rapide</span>
              <ChevronDown size={16} className={`text-primary-400 transition-transform ${mobileSommaireOpen ? 'rotate-180 text-accent-orange' : ''}`} />
            </div>
          </button>
          
          <AnimatePresence>
            {mobileSommaireOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-primary-100 dark:border-primary-800 bg-primary-50/30 dark:bg-primary-950/5 p-4 space-y-4"
              >
                {navigationItems.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-1.5">
                    <span className="block text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{group.group}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {group.items.map((item, iIdx) => {
                        const Icon = item.icon;
                        const isModule = 'moduleKey' in item;
                        const isActive = activeTab === item.tab && (!isModule || selectedModuleGuide === item.moduleKey);
                        return (
                          <button
                            key={iIdx}
                            onClick={() => {
                              navigateToSection(item.tab, isModule ? (item as any).moduleKey : undefined, item.anchorId);
                              setMobileSommaireOpen(false);
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left font-bold text-xs transition duration-150 ${
                              isActive 
                                ? 'bg-primary-900 text-white dark:bg-accent-orange dark:text-white' 
                                : 'text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-850 dark:text-primary-300'
                            }`}
                          >
                            <Icon size={14} className={isActive ? 'text-white' : 'text-primary-400'} />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Two-column layout for Desktop Sidebar + Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start" id="guide-main-content">
        {/* Left Column: Persistent Sticky Sidebar Navigation (Visible on lg screens) */}
        <div className="hidden lg:block lg:col-span-1 space-y-4 sticky top-6 print-hide">
          <div className="card bg-white dark:bg-primary-900 p-4 rounded-2xl border border-primary-100 dark:border-primary-800 shadow-sm space-y-4">
            <div className="pb-3 border-b border-primary-100 dark:border-primary-800">
              <span className="flex items-center gap-2 font-display font-extrabold text-xs text-primary-900 dark:text-white">
                <Compass size={16} className="text-accent-orange animate-pulse" />
                <span>INDEX DU GUIDE</span>
              </span>
              <p className="text-[10px] text-primary-400 font-semibold mt-1">Saut rapide vers les rubriques</p>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[75vh] pr-1 scrollbar-thin">
              {navigationItems.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1.5">
                  <span className="block text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest pl-2">
                    {group.group}
                  </span>
                  <div className="space-y-0.5">
                    {group.items.map((item, iIdx) => {
                      const Icon = item.icon;
                      const isModule = 'moduleKey' in item;
                      const isActive = activeTab === item.tab && (!isModule || selectedModuleGuide === item.moduleKey);
                      return (
                        <button
                          key={iIdx}
                          onClick={() => navigateToSection(item.tab, isModule ? (item as any).moduleKey : undefined, item.anchorId)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-bold text-xs transition-all duration-150 ${
                            isActive 
                              ? 'bg-primary-900 text-white dark:bg-accent-orange dark:text-white shadow-xs translate-x-1' 
                              : 'text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-850 hover:text-primary-900 dark:hover:text-primary-100'
                          }`}
                        >
                          <Icon size={14} className={isActive ? 'text-white' : 'text-primary-400 shrink-0'} />
                          <span className="truncate">{item.label}</span>
                          {isActive && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-orange dark:bg-white animate-pulse" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-2 border-t border-primary-100 dark:border-primary-800 text-center">
              <button
                onClick={() => window.print()}
                className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-primary-800 dark:hover:bg-primary-750 text-primary-800 dark:text-primary-100 text-[10px] font-extrabold rounded-xl transition cursor-pointer"
              >
                <Printer size={12} />
                <span>Format Impression PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Main navigation tabs */}
          <div className="flex flex-wrap gap-2 border-b border-primary-200 dark:border-primary-800 pb-1 print-hide">
            <button
              onClick={() => setActiveTab('intro')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'intro' ? 'bg-primary-900 text-white dark:bg-accent-orange dark:text-white shadow-sm' : 'text-primary-500 hover:text-primary-800 dark:hover:text-primary-200'}`}
            >
              <Compass size={14} />
              <span>Introduction & Flux de Travail</span>
            </button>
            <button
              onClick={() => setActiveTab('modules')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'modules' ? 'bg-primary-900 text-white dark:bg-accent-orange dark:text-white shadow-sm' : 'text-primary-500 hover:text-primary-800 dark:hover:text-primary-200'}`}
            >
              <Wrench size={14} />
              <span>Tutoriel des Modules & Illustrations</span>
            </button>
            <button
              onClick={() => setActiveTab('glossaire')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'glossaire' ? 'bg-primary-900 text-white dark:bg-accent-orange dark:text-white shadow-sm' : 'text-primary-500 hover:text-primary-800 dark:hover:text-primary-200'}`}
            >
              <Layers size={14} />
              <span>Glossaire Débutant ({filteredGlossary.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'faq' ? 'bg-primary-900 text-white dark:bg-accent-orange dark:text-white shadow-sm' : 'text-primary-500 hover:text-primary-800 dark:hover:text-primary-200'}`}
            >
              <HelpCircle size={14} />
              <span>Foire Aux Questions (FAQ)</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="min-h-[400px]">
        {/* TAB 1: INTRODUCTION & GENERAL WORKFLOW */}
        {activeTab === 'intro' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
          >
            {/* Main Flow card */}
            <div id="intro-cycle" className="lg:col-span-2 card bg-white dark:bg-primary-900 p-6 rounded-2xl border border-primary-100 dark:border-primary-800 shadow-xs space-y-6 scroll-mt-6">
              <div className="space-y-1">
                <h2 className="text-base font-display font-extrabold text-primary-900 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-orange shrink-0" />
                  Le cycle de vie d'une panne dans l'usine
                </h2>
                <p className="text-xs text-primary-500">
                  Découvrez le cheminement logique, de la découverte d'un problème sur le terrain à sa clôture administrative.
                </p>
              </div>

              {/* Graphical Workflow Diagram */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center pt-2">
                {/* Step 1 */}
                <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30 text-center relative flex flex-col items-center justify-between h-36">
                  <span className="absolute top-2 left-2 font-mono font-extrabold text-[10px] text-red-500 bg-red-100 dark:bg-red-950 px-1.5 py-0.5 rounded">Étape 1</span>
                  <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xs mt-3">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <span className="block text-xs font-extrabold text-red-700 dark:text-red-400">Signalement (DI)</span>
                    <span className="text-[10px] text-red-500 dark:text-red-300">L'opérateur constate un défaut.</span>
                  </div>
                </div>

                <div className="hidden md:flex justify-center text-primary-300">
                  <ArrowRight size={24} />
                </div>

                {/* Step 2 */}
                <div className="bg-sky-50 dark:bg-sky-950/20 p-4 rounded-xl border border-sky-100 dark:border-sky-900/30 text-center relative flex flex-col items-center justify-between h-36">
                  <span className="absolute top-2 left-2 font-mono font-extrabold text-[10px] text-sky-500 bg-sky-100 dark:bg-sky-950 px-1.5 py-0.5 rounded">Étape 2</span>
                  <div className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-xs mt-3">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <span className="block text-xs font-extrabold text-sky-700 dark:text-sky-400">Bon de Travail (BT)</span>
                    <span className="text-[10px] text-sky-500 dark:text-sky-300">Le responsable valide & planifie.</span>
                  </div>
                </div>

                <div className="hidden md:flex justify-center text-primary-300">
                  <ArrowRight size={24} />
                </div>

                {/* Step 3 */}
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-center relative flex flex-col items-center justify-between h-36">
                  <span className="absolute top-2 left-2 font-mono font-extrabold text-[10px] text-emerald-500 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">Étape 3</span>
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs mt-3">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <span className="block text-xs font-extrabold text-emerald-700 dark:text-emerald-400">Clôture & Archivage</span>
                    <span className="text-[10px] text-emerald-500 dark:text-emerald-300">Le technicien répare & clôture.</span>
                  </div>
                </div>
              </div>

              {/* Explanatory notes */}
              <div className="space-y-4 pt-2 border-t border-primary-100 dark:border-primary-800">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-primary-800 dark:text-primary-100">Qui peut déclarer une anomalie ?</h3>
                    <p className="text-xs text-primary-600 dark:text-primary-300 leading-relaxed">
                      <strong>Tout le monde !</strong> Les opérateurs en atelier, le chef d'équipe ou les cadres. Grâce au portail public d'auto-signalement accessible par QR code (collé sur chaque équipement), il suffit de prendre en photo le défaut et de dicter l'anomalie. Aucune connexion ou mot de passe requis pour cette étape.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-primary-800 dark:text-primary-100">Comment s'organise l'intervention ?</h3>
                    <p className="text-xs text-primary-600 dark:text-primary-300 leading-relaxed">
                      La demande arrive instantanément dans le logiciel. Le chef d'équipe technique l'analyse, évalue la gravité (criticité) et décide de la transformer en <strong>Bon de Travail (BT)</strong>. Il y désigne un technicien disponible et alloue si nécessaire les pièces de rechange du magasin.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-primary-800 dark:text-primary-100">Que saisit le technicien lors de la réparation ?</h3>
                    <p className="text-xs text-primary-600 dark:text-primary-300 leading-relaxed">
                      Sur le terrain, le technicien désigné reçoit son ordre de travail. Il change les pièces, saisit son temps d'intervention et écrit un rapport rapide (manuellement ou par commande vocale). Les pièces consommées sont automatiquement déduites du stock informatique, et l'historique de la machine est mis à jour.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Beginner Quickstart Card */}
            <div className="space-y-6">
              <div id="intro-steps" className="card bg-gradient-to-br from-indigo-50 to-white dark:from-primary-950 dark:to-primary-900 p-6 rounded-2xl border border-indigo-100/50 dark:border-primary-800 shadow-xs scroll-mt-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    <Compass size={18} />
                  </div>
                  <h3 className="font-display font-extrabold text-sm text-primary-900 dark:text-white">GUIDE DES PREMIERS PAS</h3>
                </div>
                <p className="text-xs text-primary-600 dark:text-primary-300 leading-relaxed mb-4">
                  Si vous ouvrez ce logiciel pour la première fois, voici l'ordre idéal pour configurer votre usine et vous familiariser avec l'outil :
                </p>
                <ul className="space-y-3">
                  <li className="flex gap-2.5 items-start text-xs text-primary-700 dark:text-primary-300">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">1</span>
                    <span><strong>Créez vos machines :</strong> Allez dans <em>Parc Équipements</em> et ajoutez les machines clés de vos ateliers de production.</span>
                  </li>
                  <li className="flex gap-2.5 items-start text-xs text-primary-700 dark:text-primary-300">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">2</span>
                    <span><strong>Saisissez vos pièces de rechange :</strong> Remplissez le stock du <em>Magasin</em> avec vos filtres, joints et cartes électriques.</span>
                  </li>
                  <li className="flex gap-2.5 items-start text-xs text-primary-700 dark:text-primary-300">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">3</span>
                    <span><strong>Simulez une panne :</strong> Ouvrez le <em>Portail Terrain</em>, écrivez un diagnostic de panne et validez pour voir le flux en direct.</span>
                  </li>
                  <li className="flex gap-2.5 items-start text-xs text-primary-700 dark:text-primary-300">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">4</span>
                    <span><strong>Vérifiez les indicateurs :</strong> Ouvrez le <em>Tableau de Bord</em> pour observer comment vos indicateurs MTBF et MTTR réagissent.</span>
                  </li>
                </ul>
              </div>

              {/* Informative advice */}
              <div id="intro-conseil" className="card bg-white dark:bg-primary-900 p-5 rounded-2xl border border-primary-100 dark:border-primary-800 flex gap-4 scroll-mt-6">
                <div className="text-amber-500 mt-0.5 shrink-0">
                  <Info size={18} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-primary-900 dark:text-white">Conseil pratique de sécurité</h4>
                  <p className="text-[11px] text-primary-600 dark:text-primary-300 leading-relaxed">
                    Avant de démarrer une tâche de maintenance sur le terrain, assurez-vous d'avoir bien consigné la machine électriquement et mécaniquement. Utilisez le cadenas de sécurité requis indiqué sur le Bon de Travail !
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: DETAILED MODULE TUTORIALS & INTERACTIVE ILLUSTRATIONS */}
        {activeTab === 'modules' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start"
          >
            {/* Left selector menu (hidden on desktop because the global sidebar covers it) */}
            <div className="lg:hidden card bg-white dark:bg-primary-900 p-3 rounded-2xl border border-primary-100 dark:border-primary-800 space-y-1 print-hide">
              <span className="block text-[10px] font-bold text-primary-400 uppercase tracking-wider px-3.5 py-2">Modules Applicatifs</span>
              {Object.entries(modulesGuideData).map(([id, info]) => {
                const Icon = info.icon;
                const active = selectedModuleGuide === id;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setSelectedModuleGuide(id);
                      setIllustrationStep(1);
                      setDiaporamaRunning(false);
                      setTerrainPhoto(false);
                      setDiStatus('new');
                      setPurchaseStatus('draft');
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs text-left transition duration-150 ${active ? 'bg-primary-900 text-white dark:bg-accent-orange dark:text-white' : 'text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-850 hover:text-primary-800 dark:hover:text-primary-200'}`}
                  >
                    <Icon size={16} />
                    <span>{info.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Right module guide detail & Interactive mockups (expanded to full 4-columns on desktop) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Main Info Card */}
              {Object.entries(modulesGuideData).map(([id, info]) => {
                if (selectedModuleGuide !== id) return null;
                const Icon = info.icon;
                return (
                  <motion.div
                    key={id}
                    id="module-detail-container"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="card bg-white dark:bg-primary-900 p-6 rounded-2xl border border-primary-100 dark:border-primary-800 shadow-xs space-y-6 scroll-mt-6"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary-100 dark:border-primary-800 pb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${info.color}`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-primary-400 uppercase tracking-wider">Guide d'utilisation</span>
                          <h2 className="text-lg font-display font-extrabold text-primary-900 dark:text-white">{info.title}</h2>
                        </div>
                      </div>
                      
                      {/* Sub-tag */}
                      <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-primary-300">
                        <Info size={11} /> Module opérationnel
                      </span>
                    </div>

                    {/* Intro */}
                    <p className="text-xs sm:text-sm text-primary-700 dark:text-primary-200 font-semibold leading-relaxed">
                      {info.intro}
                    </p>

                    {/* Step-by-Step guide */}
                    <div className="space-y-3 bg-primary-50/50 dark:bg-primary-950/20 p-4 rounded-2xl border border-primary-100 dark:border-primary-800/80">
                      <span className="block text-[10px] font-bold text-primary-400 uppercase tracking-wider">Comment faire ? Guide pas à pas</span>
                      <ol className="space-y-3 font-semibold text-xs text-primary-700 dark:text-primary-300 list-decimal pl-4">
                        {info.steps.map((step, idx) => (
                          <li key={idx} className="leading-relaxed pl-1">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Highlighted Tip */}
                    <div className="flex gap-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-xs text-amber-800 dark:text-amber-200">
                      <div className="text-accent-orange font-bold shrink-0">ASTUCE PRO :</div>
                      <p className="leading-relaxed font-semibold">{info.tip}</p>
                    </div>

                    {/* Interactive Illustration Area */}
                    <div className="space-y-4 pt-4 border-t border-primary-100 dark:border-primary-800" id="interactive-illustration-section">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span className="block text-xs font-bold text-primary-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Play size={12} className="text-accent-orange animate-pulse" />
                          Illustration Interactive Étape par Étape
                        </span>
                        
                        {/* Unified Step Navigation Controls */}
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3].map((stepNum) => {
                            const stepLabels: Record<string, string[]> = {
                              dashboard: ["1. KPIs Généraux", "2. Graphiques d'Activité", "3. Diaporama Atelier"],
                              terrain: ["1. Scan QR Code", "2. Saisie Vocale", "3. Photo & Envoi"],
                              equipements: ["1. Choisir Atelier", "2. Fiche Machine", "3. Historique/Nomenclature"],
                              interventions: ["1. Recevoir Alerte (DI)", "2. Planifier (BT)", "3. Clôturer / Archiver"],
                              magasin: ["1. Seuils Alerte", "2. Sortie Stock", "3. Réapprovisionnement"],
                              planning: ["1. Gamme Préventive", "2. Calendrier", "3. Déclenchement Automatique"],
                              achats: ["1. Demande d'Achat", "2. Jauge Budgétaire", "3. Réception Pièces"],
                              reporting: ["1. Règle Pareto (80/20)", "2. Analyse Coûts", "3. Export Rapports"]
                            };
                            const label = stepLabels[id]?.[stepNum - 1] || `Étape ${stepNum}`;
                            const isCurrent = illustrationStep === stepNum;
                            return (
                              <button
                                key={stepNum}
                                onClick={() => setIllustrationStep(stepNum)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${isCurrent ? 'bg-primary-900 text-white dark:bg-accent-orange dark:text-white shadow-xs' : 'bg-primary-100 text-primary-600 dark:bg-primary-800 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-750'}`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Display explanation card for the current step */}
                      <div className="bg-indigo-50/50 dark:bg-primary-950/30 border border-indigo-100 dark:border-primary-800 rounded-xl p-3.5 text-xs flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                          {illustrationStep}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-primary-900 dark:text-white">
                            {id === 'dashboard' && illustrationStep === 1 && "Étape 1 : Lire et comprendre les KPIs généraux de performance"}
                            {id === 'dashboard' && illustrationStep === 2 && "Étape 2 : Analyser les graphiques de pannes en cours"}
                            {id === 'dashboard' && illustrationStep === 3 && "Étape 3 : Activer le Diaporama Atelier en temps réel"}

                            {id === 'terrain' && illustrationStep === 1 && "Étape 1 : Scanner le QR code collé sur l'équipement"}
                            {id === 'terrain' && illustrationStep === 2 && "Étape 2 : Dicter l'anomalie sans clavier grâce à la reconnaissance vocale"}
                            {id === 'terrain' && illustrationStep === 3 && "Étape 3 : Associer une photo de la panne et valider l'envoi"}

                            {id === 'equipements' && illustrationStep === 1 && "Étape 1 : Naviguer par Atelier de production pour filtrer la liste"}
                            {id === 'equipements' && illustrationStep === 2 && "Étape 2 : Consulter la fiche technique complète de l'équipement"}
                            {id === 'equipements' && illustrationStep === 3 && "Étape 3 : Consulter la nomenclature des pièces compatibles et l'historique de pannes"}

                            {id === 'interventions' && illustrationStep === 1 && "Étape 1 : Recevoir le signalement de panne (Demande d'Intervention - DI)"}
                            {id === 'interventions' && illustrationStep === 2 && "Étape 2 : Planifier, attribuer un technicien et valider le Bon de Travail (BT)"}
                            {id === 'interventions' && illustrationStep === 3 && "Étape 3 : Rédiger le rapport technique final et clôturer l'intervention"}

                            {id === 'magasin' && illustrationStep === 1 && "Étape 1 : Surveiller les alertes de stock bas et rupture"}
                            {id === 'magasin' && illustrationStep === 2 && "Étape 2 : Enregistrer une Sortie de pièce lors d'une réparation"}
                            {id === 'magasin' && illustrationStep === 3 && "Étape 3 : Enregistrer une Entrée de stock (Livraison fournisseur)"}

                            {id === 'planning' && illustrationStep === 1 && "Étape 1 : Créer la gamme de maintenance préventive récurrente"}
                            {id === 'planning' && illustrationStep === 2 && "Étape 2 : Visualiser le calendrier prévisionnel des tâches"}
                            {id === 'planning' && illustrationStep === 3 && "Étape 3 : Génération automatique du Bon de Travail le jour J"}

                            {id === 'achats' && illustrationStep === 1 && "Étape 1 : Rédiger une Demande d'Achat (DA) de réapprovisionnement"}
                            {id === 'achats' && illustrationStep === 2 && "Étape 2 : Suivre l'évaluation de l'impact sur le budget annuel de maintenance"}
                            {id === 'achats' && illustrationStep === 3 && "Étape 3 : Réceptionner la commande et valoriser informatiquement le stock"}

                            {id === 'reporting' && illustrationStep === 1 && "Étape 1 : Identifier les machines responsables de 80% des pannes (Diagramme Pareto)"}
                            {id === 'reporting' && illustrationStep === 2 && "Étape 2 : Analyser la ventilation des coûts (Pièces, main d'œuvre, prestataires)"}
                            {id === 'reporting' && illustrationStep === 3 && "Étape 3 : Exporter et télécharger le rapport d'activité propre pour la direction"}
                          </h4>
                          <p className="text-primary-600 dark:text-primary-300 font-semibold leading-relaxed">
                            {id === 'dashboard' && illustrationStep === 1 && "Ces 4 indicateurs analysent la réactivité globale : la MTBF indique la fiabilité d'usage, la MTTR chiffre le temps moyen de dépannage, et la jauge budgétaire contrôle la rentabilité d'atelier."}
                            {id === 'dashboard' && illustrationStep === 2 && "Ce tableau comptabilise les pannes par niveau de gravité. Cela permet au responsable de répartir son équipe de techniciens en concentrant les forces sur les arrêts critiques."}
                            {id === 'dashboard' && illustrationStep === 3 && "Le Diaporama projette les données sur grand écran en atelier. Le défilement est automatique pour garder l'équipe soudée autour des objectifs hebdomadaires."}

                            {id === 'terrain' && illustrationStep === 1 && "Chaque machine possède un QR code unique collé sur sa structure. Le technicien mobile le scanne avec son smartphone pour charger immédiatement la bonne fiche."}
                            {id === 'terrain' && illustrationStep === 2 && "La reconnaissance vocale avancée permet d'écrire le diagnostic sans clavier. Pratique si le technicien porte des gants ou se trouve dans un recoin sombre."}
                            {id === 'terrain' && illustrationStep === 3 && "Une image vaut mille mots ! Ajouter un cliché de la pièce cassée permet au chef d'équipe de préparer à l'avance les bons outils et rechanges avant d'intervenir."}

                            {id === 'equipements' && illustrationStep === 1 && "Diviser l'usine en Ateliers (ex: Usinage, Injection) permet de structurer proprement l'arborescence et d'affecter les techniciens de façon sectorisée."}
                            {id === 'equipements' && illustrationStep === 2 && "La fiche de la machine récapitule sa marque, son modèle, son niveau de criticité (vital, moyen, secondaire) et permet d'ouvrir ses notices techniques d'origine."}
                            {id === 'equipements' && illustrationStep === 3 && "La nomenclature montre les rechanges compatibles (ex: joints, filtres) pour ne pas se tromper. L'historique liste les anciennes pannes pour comprendre l'usure de l'appareil."}

                            {id === 'interventions' && illustrationStep === 1 && "Lorsqu'une panne est signalée sur le terrain, elle apparaît instantanément en statut 'Demande d'Intervention' (DI) rouge dans le tableau d'affichage central."}
                            {id === 'interventions' && illustrationStep === 2 && "Le responsable valide la panne, choisit le technicien qualifié (Sophie, Marc, Pierre), estime la durée requise, et le bon passe automatiquement en statut 'En Cours' (BT)."}
                            {id === 'interventions' && illustrationStep === 3 && "Une fois le dépannage terminé, le technicien tape ou dicte son rapport d'action, enregistre les rechanges utilisées et clôture. Le bon est archivé en statut vert 'Soldé'."}

                            {id === 'magasin' && illustrationStep === 1 && "Chaque article possède un seuil de sécurité. Si la quantité en stock descend sous ce seuil (par exemple 5 unités), une alerte rouge clignote pour éviter la rupture complète."}
                            {id === 'magasin' && illustrationStep === 2 && "Dès qu'un technicien prend un filtre pour dépanner une machine, il enregistre une Sortie de pièce. Le stock informatique descend et recalcule automatiquement les alertes."}
                            {id === 'magasin' && illustrationStep === 3 && "Lors de la livraison du fournisseur, le magasinier valide la Réception. Les pièces s'ajoutent au stock informatique, et l'alerte critique rouge s'éteint."}

                            {id === 'planning' && illustrationStep === 1 && "Une gamme préventive définit la liste des tâches d'entretien répétitives (ex: vidange, étalonnage) avec les consignes de sécurité obligatoires."}
                            {id === 'planning' && illustrationStep === 2 && "Le calendrier dynamique centralise toutes ces échéances futures. On voit en bleu les opérations programmées pour la semaine, permettant d'éviter les surcharges."}
                            {id === 'planning' && illustrationStep === 3 && "Dès que le jour J de l'échéance arrive, le logiciel génère lui-même un Bon de Travail complet pré-rempli dans la boîte de réception du technicien désigné."}

                            {id === 'achats' && illustrationStep === 1 && "En cas de stock bas ou de besoin de sous-traitance, la Demande d'Achat (DA) réunit les quantités, prix négociés et le fournisseur pressenti."}
                            {id === 'achats' && illustrationStep === 2 && "Le système compare le montant total estimé au budget annuel restant pour l'atelier. Il vous avertit s'il y a un dépassement ou si une validation supérieure est requise."}
                            {id === 'achats' && illustrationStep === 3 && "Dès réception des colis, le magasinier confirme la livraison conforme. Le système met à jour la comptabilité de maintenance et le stock réel de rechanges."}

                            {id === 'reporting' && illustrationStep === 1 && "Le Diagramme de Pareto applique la règle des 80/20. Il montre que 80% des temps d'arrêt de l'usine proviennent d'uniquement 20% des machines ('les machines à problèmes')."}
                            {id === 'reporting' && illustrationStep === 2 && "Le graphique de ventilation des coûts met en lumière la part consacrée aux pièces détachées, aux salaires internes, et aux contrats de sous-traitance."}
                            {id === 'reporting' && illustrationStep === 3 && "En fin de mois, l'exportation compile l'activité d'un seul clic au format Excel/CSV ou génère un PDF prêt pour la direction usine."}
                          </p>
                        </div>
                      </div>

                      {/* The actual interactive simulator view depending on module and step */}
                      <div className="border border-primary-200 dark:border-primary-800 rounded-2xl bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden shadow-inner">
                        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 text-[8px] font-extrabold bg-green-500 text-white rounded uppercase tracking-wider">
                          Démonstrateur Interactif
                        </span>

                        {/* 1. DASHBOARD ILLUSTRATIONS */}
                        {id === 'dashboard' && (
                          <div className="space-y-4 pt-2">
                            {illustrationStep === 1 && (
                              <div className="space-y-4">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Focus : 4 Indicateurs de Performance (KPIs)</span>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                  <div className="bg-white dark:bg-primary-900 border-2 border-indigo-500 rounded-xl p-3 text-center space-y-1 relative ring-4 ring-indigo-500/20">
                                    <span className="block text-[9px] font-bold text-indigo-500 uppercase tracking-wider">MTBF (Fiabilité)</span>
                                    <span className="block text-xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">284 h</span>
                                    <span className="block text-[8px] text-green-500 font-bold">Excellent (+12% vs juin)</span>
                                  </div>
                                  <div className="bg-white dark:bg-primary-900 border border-primary-150 dark:border-primary-800 rounded-xl p-3 text-center space-y-1 opacity-60">
                                    <span className="block text-[9px] font-bold text-primary-400 uppercase tracking-wider">MTTR (Vitesse)</span>
                                    <span className="block text-xl font-extrabold font-mono text-primary-500">42 min</span>
                                    <span className="block text-[8px] text-primary-400">Stable</span>
                                  </div>
                                  <div className="bg-white dark:bg-primary-900 border border-primary-150 dark:border-primary-800 rounded-xl p-3 text-center space-y-1 opacity-60">
                                    <span className="block text-[9px] font-bold text-primary-400 uppercase tracking-wider">Taux Préventif</span>
                                    <span className="block text-xl font-extrabold font-mono text-primary-500">76 %</span>
                                    <span className="block text-[8px] text-green-500 font-bold">Objectif atteint</span>
                                  </div>
                                  <div className="bg-white dark:bg-primary-900 border border-primary-150 dark:border-primary-800 rounded-xl p-3 text-center space-y-1 opacity-60">
                                    <span className="block text-[9px] font-bold text-primary-400 uppercase tracking-wider">Dépenses</span>
                                    <span className="block text-xl font-extrabold font-mono text-primary-500">8 450 €</span>
                                    <span className="block text-[8px] text-primary-400">Sous contrôle</span>
                                  </div>
                                </div>
                                <div className="p-3 bg-white dark:bg-primary-900 border border-indigo-100 dark:border-primary-800 rounded-xl text-[11px] leading-relaxed text-indigo-700 dark:text-indigo-300 font-semibold">
                                  📌 <strong>Explication Novice :</strong> L'indicateur encadré en bleu est la <strong>MTBF</strong>. Plus le nombre d'heures est grand, plus vos machines fonctionnent longtemps sans pannes. C'est le Graal de l'équipe de maintenance !
                                </div>
                              </div>
                            )}

                            {illustrationStep === 2 && (
                              <div className="space-y-4">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Focus : Répartition par Gravité de Panne</span>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div className="bg-red-500/10 border-2 border-red-500 rounded-xl p-3 space-y-1.5 relative ring-2 ring-red-500/10">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-extrabold text-red-600 dark:text-red-400 uppercase">Urgence Haute</span>
                                      <span className="bg-red-500 text-white font-mono text-xs px-2 py-0.5 rounded-full font-extrabold">3 en cours</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-red-200 dark:bg-red-950 rounded-full overflow-hidden">
                                      <div className="h-full bg-red-500" style={{ width: '75%' }}></div>
                                    </div>
                                    <span className="block text-[9px] text-red-500 font-bold">Ex: Arrêt complet d'un atelier</span>
                                  </div>
                                  
                                  <div className="bg-amber-500/5 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3 space-y-1.5 opacity-60">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-extrabold text-amber-600 uppercase">Urgence Moyenne</span>
                                      <span className="bg-amber-500 text-white font-mono text-xs px-2 py-0.5 rounded-full font-extrabold">5 en cours</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-amber-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-amber-500" style={{ width: '45%' }}></div>
                                    </div>
                                    <span className="block text-[9px] text-amber-500">Ex: Dégradation de vitesse</span>
                                  </div>

                                  <div className="bg-sky-500/5 border border-sky-200 dark:border-sky-900/40 rounded-xl p-3 space-y-1.5 opacity-60">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-extrabold text-sky-600 uppercase">Urgence Basse</span>
                                      <span className="bg-sky-500 text-white font-mono text-xs px-2 py-0.5 rounded-full font-extrabold">12 en cours</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-sky-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-sky-500" style={{ width: '20%' }}></div>
                                    </div>
                                    <span className="block text-[9px] text-sky-500">Ex: Petite vérification de niveau</span>
                                  </div>
                                </div>
                                <div className="p-3 bg-white dark:bg-primary-900 border border-red-100 dark:border-primary-800 rounded-xl text-[11px] leading-relaxed text-red-700 dark:text-red-400 font-semibold">
                                  🚨 <strong>Consigne de sécurité :</strong> Les alarmes en <strong>Urgence Haute</strong> coupent la production. Les techniciens doivent s'y rendre immédiatement pour limiter le coût financier d'arrêt machine.
                                </div>
                              </div>
                            )}

                            {illustrationStep === 3 && (
                              <div className="space-y-4">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Simulateur : Diaporama Mural d'Atelier</span>
                                <div className="border-4 border-slate-700 bg-slate-900 text-white p-4 rounded-xl flex flex-col justify-between min-h-[140px] shadow-lg relative">
                                  <div className="flex justify-between items-center pb-2 border-b border-white/10 text-[10px]">
                                    <span className="font-extrabold text-amber-400 flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                      DIAPORAMA ATELIER ACTIVE
                                    </span>
                                    <span className="text-slate-400">Mise à jour automatique</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 py-3">
                                    <div className="text-center">
                                      <span className="block text-[9px] text-slate-400">Taux de Résolution</span>
                                      <span className="block text-2xl font-extrabold font-mono text-green-400">92 %</span>
                                      <span className="text-[8px] text-slate-500">Objectif : &gt; 90%</span>
                                    </div>
                                    <div className="text-center">
                                      <span className="block text-[9px] text-slate-400">Bons Clôturés ce mois</span>
                                      <span className="block text-2xl font-extrabold font-mono text-indigo-400">142 BT</span>
                                      <span className="text-[8px] text-slate-500">Un record d'efficacité !</span>
                                    </div>
                                  </div>
                                  
                                  <button
                                    onClick={() => setDiaporamaRunning(!diaporamaRunning)}
                                    className={`w-full py-1.5 rounded text-[10px] font-bold uppercase transition ${diaporamaRunning ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                  >
                                    {diaporamaRunning ? "❚❚ Arrêter la rotation" : "▶ Démarrer la rotation"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 2. TERRAIN MOBILE ILLUSTRATIONS */}
                        {id === 'terrain' && (
                          <div className="space-y-4 pt-2">
                            {illustrationStep === 1 && (
                              <div className="flex flex-col md:flex-row gap-6 items-center">
                                {/* Smartphone container */}
                                <div className="w-64 h-80 bg-slate-900 rounded-[28px] p-2.5 shadow-xl border-4 border-slate-700 relative flex flex-col justify-between overflow-hidden text-white">
                                  <div className="w-20 h-3 bg-slate-700 mx-auto rounded-b-lg absolute top-0 left-1/2 -translate-x-1/2 z-20"></div>
                                  <div className="flex-1 bg-slate-950 rounded-[20px] p-3 pt-5 flex flex-col justify-between text-xs relative">
                                    <div className="space-y-2 text-center">
                                      <span className="block text-[9px] text-indigo-400 uppercase font-extrabold">Étape 1 : Numériser QR Code</span>
                                      <div className="w-28 h-28 border-2 border-indigo-500 border-dashed rounded-xl mx-auto flex items-center justify-center relative bg-indigo-500/5 overflow-hidden">
                                        <QrCode size={48} className="text-indigo-400 animate-pulse" />
                                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-indigo-400"></div>
                                        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-indigo-400"></div>
                                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-indigo-400"></div>
                                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-indigo-400"></div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setIllustrationStep(2);
                                        setMobileVocalState('idle');
                                      }}
                                      className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center cursor-pointer"
                                    >
                                      Simuler Scan QR Code ➔
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="space-y-2 flex-1 text-xs">
                                  <h4 className="font-extrabold text-primary-900 dark:text-white flex items-center gap-1">
                                    <QrCode size={14} className="text-indigo-600" />
                                    Le QR Code en usine
                                  </h4>
                                  <p className="text-primary-600 dark:text-primary-300 leading-relaxed font-semibold">
                                    Plutôt que de chercher la machine "Presse hydraulique PH-04" dans une liste de 200 noms, le technicien approche simplement sa tablette ou son téléphone de l'autocollant QR code. Le scan se fait en un dixième de seconde et élimine tout risque d'erreur d'équipement !
                                  </p>
                                </div>
                              </div>
                            )}

                            {illustrationStep === 2 && (
                              <div className="flex flex-col md:flex-row gap-6 items-center">
                                <div className="w-64 h-80 bg-slate-900 rounded-[28px] p-2.5 shadow-xl border-4 border-slate-700 relative flex flex-col justify-between overflow-hidden text-white">
                                  <div className="w-20 h-3 bg-slate-700 mx-auto rounded-b-lg absolute top-0 left-1/2 -translate-x-1/2 z-20"></div>
                                  <div className="flex-1 bg-slate-950 rounded-[20px] p-3 pt-5 flex flex-col justify-between text-xs">
                                    <div className="space-y-2">
                                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-[10px]">
                                        <span className="block text-[8px] uppercase text-indigo-400 font-extrabold">Fiche Ouverte :</span>
                                        <span className="block font-bold">Presse Hydraulique PH-04</span>
                                      </div>
                                      
                                      <div className="space-y-1.5 text-center">
                                        <button
                                          onClick={handleSimulateVocal}
                                          className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-all ${mobileVocalState === 'recording' ? 'bg-red-500 animate-pulse scale-105 shadow-md shadow-red-500/40' : mobileVocalState === 'success' ? 'bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                                        >
                                          <Mic size={20} className={mobileVocalState === 'recording' ? 'animate-bounce' : ''} />
                                        </button>
                                        <span className="block text-[9px] text-slate-400">
                                          {mobileVocalState === 'recording' ? 'Écoute active...' : mobileVocalState === 'success' ? 'Traduit !' : 'Cliquez sur le micro'}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div className="h-16 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[10px] text-slate-300 overflow-y-auto italic">
                                      {mobileVocalState === 'recording' && "Enregistrement en cours..."}
                                      {mobileVocalState === 'success' && mobileText}
                                      {mobileVocalState === 'idle' && "Cliquez sur le micro ci-dessus pour simuler une dictée vocale de l'anomalie."}
                                    </div>

                                    <button
                                      disabled={mobileVocalState !== 'success'}
                                      onClick={() => setIllustrationStep(3)}
                                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider text-center cursor-pointer"
                                    >
                                      Étape Suivante ➔
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2 flex-1 text-xs">
                                  <h4 className="font-extrabold text-primary-900 dark:text-white flex items-center gap-1">
                                    <Mic size={14} className="text-red-500 animate-pulse" />
                                    La dictée vocale simplifiée
                                  </h4>
                                  <p className="text-primary-600 dark:text-primary-300 leading-relaxed font-semibold">
                                    Une fois le micro activé, l'IA du système traduit les paroles en texte structuré en temps réel.
                                  </p>
                                  <div className="bg-white dark:bg-primary-900 border border-primary-150 dark:border-primary-800 p-2.5 rounded-xl text-[10px] italic text-primary-500 leading-normal">
                                    <span className="font-bold text-accent-orange block uppercase not-italic mb-1">Phrase simulée :</span>
                                    "La pompe hydraulique fait un sifflement aigu et fuit au niveau du raccord rapide."
                                  </div>
                                </div>
                              </div>
                            )}

                            {illustrationStep === 3 && (
                              <div className="flex flex-col md:flex-row gap-6 items-center">
                                <div className="w-64 h-80 bg-slate-900 rounded-[28px] p-2.5 shadow-xl border-4 border-slate-700 relative flex flex-col justify-between overflow-hidden text-white">
                                  <div className="w-20 h-3 bg-slate-700 mx-auto rounded-b-lg absolute top-0 left-1/2 -translate-x-1/2 z-20"></div>
                                  <div className="flex-1 bg-slate-950 rounded-[20px] p-3 pt-5 flex flex-col justify-between text-xs">
                                    <div className="space-y-2">
                                      <span className="block text-[8px] uppercase text-indigo-400 font-extrabold">Étape 3 : Photo & Validation</span>
                                      
                                      {/* Mock Photo preview */}
                                      <div className="w-full h-24 bg-slate-900 rounded-lg border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center">
                                        {terrainPhoto ? (
                                          <div className="absolute inset-0 bg-slate-800 flex flex-col items-center justify-center gap-1">
                                            <span className="text-[10px] text-green-400 font-bold flex items-center gap-1">✔ Photo ajoutée !</span>
                                            <span className="text-[8px] text-slate-400">PH-04_fuite.png</span>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => setTerrainPhoto(true)}
                                            className="text-slate-400 hover:text-white flex flex-col items-center gap-1.5 cursor-pointer"
                                          >
                                            <Camera size={24} />
                                            <span className="text-[9px]">Prendre une photo de panne</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => {
                                        alert("Démonstration terminée ! Votre demande d'intervention fictive a été enregistrée avec succès.");
                                        setIllustrationStep(1);
                                        setTerrainPhoto(false);
                                        setMobileVocalState('idle');
                                      }}
                                      className="w-full bg-green-500 hover:bg-green-600 py-2.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest text-center text-white cursor-pointer"
                                    >
                                      ✓ Envoyer la Panne !
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2 flex-1 text-xs">
                                  <h4 className="font-extrabold text-primary-900 dark:text-white flex items-center gap-1">
                                    <Camera size={14} className="text-emerald-500" />
                                    L'envoi instantané au Chef d'Équipe
                                  </h4>
                                  <p className="text-primary-600 dark:text-primary-300 leading-relaxed font-semibold">
                                    En validant l'envoi, les informations (machine scannée, texte dicté, photo jointe) sont réunies dans une fiche d'intervention. Celle-ci apparaît instantanément en rouge chez les techniciens. Simple, clair et infaillible !
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 3. PARC EQUIPEMENTS ILLUSTRATIONS */}
                        {id === 'equipements' && (
                          <div className="space-y-4 pt-2">
                            {illustrationStep === 1 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Focus : Sélectionner l'Atelier de Production</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                  {["Usinage", "Injection Plastique", "Emballage & Tri", "Fluides / Centrales"].map((at, index) => {
                                    const active = (index === 0);
                                    return (
                                      <button
                                        key={at}
                                        className={`p-3 rounded-xl font-bold text-xs text-center border transition ${active ? 'bg-indigo-600 text-white border-indigo-600 ring-4 ring-indigo-500/25' : 'bg-white dark:bg-primary-900 text-primary-500 border-primary-150 dark:border-primary-800'}`}
                                      >
                                        🏭 {at}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="p-3 bg-white dark:bg-primary-900 border border-indigo-100 dark:border-primary-800 rounded-xl text-[11px] leading-relaxed text-indigo-700 dark:text-indigo-300 font-semibold">
                                  💡 <strong>Règle d'usage :</strong> Choisir l'Atelier permet de filtrer les machines affichées dans l'arborescence à gauche, pour ne pas encombrer l'écran avec d'autres unités.
                                </div>
                              </div>
                            )}

                            {illustrationStep === 2 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Focus : Fiche d'identité machine détaillée</span>
                                <div className="bg-white dark:bg-primary-900 border-2 border-indigo-500 rounded-xl p-4 space-y-3 relative ring-4 ring-indigo-500/10">
                                  <div className="flex justify-between items-center pb-2 border-b">
                                    <div>
                                      <h5 className="font-extrabold text-xs text-primary-400 uppercase">Code Équipement : #EQ-TOUR-CN01</h5>
                                      <h4 className="font-extrabold text-sm text-primary-900 dark:text-white">⚙️ Tour Numérique Haute Précision</h4>
                                    </div>
                                    <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded font-extrabold">Criticité A (Vitale)</span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-semibold text-primary-600 dark:text-primary-300">
                                    <div>🏢 Localisation : Atelier A</div>
                                    <div>🏷 Marque : DMG MORI</div>
                                    <div>🔢 N° Série : CN-994-01-A</div>
                                  </div>
                                </div>
                                <div className="p-3 bg-white dark:bg-primary-900 border border-indigo-100 dark:border-primary-800 rounded-xl text-[11px] leading-relaxed text-indigo-700 dark:text-indigo-300 font-semibold">
                                  ⚠️ <strong>Comprendre la Criticité :</strong> La criticité <strong>"A"</strong> désigne une machine goulot d'étranglement de l'usine. Si elle tombe en panne, toute la production s'arrête. Elle demande un plan préventif ultra rigoureux.
                                </div>
                              </div>
                            )}

                            {illustrationStep === 3 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Focus : Nomenclature Pièces & Historique d'entretien</span>
                                <div className="bg-white dark:bg-primary-900 border border-primary-150 dark:border-primary-800 rounded-xl overflow-hidden">
                                  {/* Inner tabs */}
                                  <div className="flex border-b text-[10px] font-bold bg-primary-50/50 dark:bg-primary-950/25">
                                    <button 
                                      onClick={() => setEquipmentTab('info')}
                                      className={`px-4 py-2 border-r ${equipmentTab === 'info' ? 'bg-white dark:bg-primary-900 text-indigo-600' : 'text-primary-400'}`}
                                    >
                                      Nomenclature Pièces
                                    </button>
                                    <button 
                                      onClick={() => setEquipmentTab('parts')}
                                      className={`px-4 py-2 border-r ${equipmentTab === 'parts' ? 'bg-white dark:bg-primary-900 text-indigo-600' : 'text-primary-400'}`}
                                    >
                                      Historique Pannes
                                    </button>
                                  </div>
                                  
                                  <div className="p-3.5 text-xs">
                                    {equipmentTab === 'info' ? (
                                      <div className="space-y-1.5 font-semibold text-primary-700 dark:text-primary-300">
                                        <p>🔧 Les pièces détachées compatibles et homologuées pour cette machine :</p>
                                        <ul className="list-disc pl-4 text-[10px] text-primary-500 space-y-1">
                                          <li><strong>#P-FILTRE-H24 :</strong> Filtre hydraulique (Stock mini : 5)</li>
                                          <li><strong>#P-JOINT-J30 :</strong> Joint torique haute pression (Stock mini : 10)</li>
                                          <li><strong>#P-COURROIE-C12 :</strong> Courroie de transmission principale (Stock mini : 1)</li>
                                        </ul>
                                      </div>
                                    ) : (
                                      <div className="space-y-1.5 font-semibold text-primary-700 dark:text-primary-300">
                                        <p>📜 Historique des interventions récentes sur cette machine :</p>
                                        <ul className="text-[10px] text-primary-500 space-y-2">
                                          <li className="flex justify-between items-center bg-slate-50 dark:bg-primary-950/30 p-1.5 rounded">
                                            <span>Remplacement Courroie cassée (Sophie)</span>
                                            <span className="text-indigo-600 dark:text-indigo-400 font-mono">14 Juin 2026</span>
                                          </li>
                                          <li className="flex justify-between items-center bg-slate-50 dark:bg-primary-950/30 p-1.5 rounded">
                                            <span>Vidange et filtres d'huile préventifs (Marc)</span>
                                            <span className="text-indigo-600 dark:text-indigo-400 font-mono">02 Mai 2026</span>
                                          </li>
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 4. BONS D'INTERVENTIONS ILLUSTRATIONS */}
                        {id === 'interventions' && (
                          <div className="space-y-4 pt-2">
                            {illustrationStep === 1 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Étape 1 : Analyser une Demande d'Anomalie Entrante</span>
                                <div className="bg-red-500/10 border-2 border-red-500 p-4 rounded-xl space-y-3 relative ring-4 ring-red-500/15">
                                  <div className="flex justify-between items-center">
                                    <span className="px-2 py-0.5 text-[9px] font-extrabold bg-red-600 text-white rounded">DEMANDE DE PANNE REÇUE</span>
                                    <span className="text-[10px] text-primary-400 font-mono font-bold">#DI-2026-089</span>
                                  </div>
                                  <div className="space-y-1 text-xs">
                                    <h4 className="font-extrabold text-primary-900 dark:text-white">Vibrations anormales & bruit suspect sur ventilateur</h4>
                                    <p className="text-primary-500">Signalisé par : Marc (Opérateur) à l'atelier Emballage.</p>
                                    <p className="italic text-primary-600 dark:text-primary-400">"Le ventilateur de séchage fait des claquements répétitifs."</p>
                                  </div>
                                  <button
                                    onClick={() => setIllustrationStep(2)}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-xs font-bold uppercase transition cursor-pointer"
                                  >
                                    Prendre en charge et planifier ➔
                                  </button>
                                </div>
                              </div>
                            )}

                            {illustrationStep === 2 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Étape 2 : Planification du Bon de Travail (BT)</span>
                                <div className="bg-white dark:bg-primary-900 border-2 border-indigo-500 rounded-xl p-4 space-y-4 relative shadow-md">
                                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block border-b pb-1">PARAMÈTRES D'AFFECTATION :</span>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="space-y-1">
                                      <label className="block text-[10px] font-extrabold text-primary-400 uppercase">Attribuer le technicien :</label>
                                      <select
                                        value={selectedTechnician}
                                        onChange={(e) => setSelectedTechnician(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded px-2.5 py-1.5 font-bold"
                                      >
                                        <option value="">-- Choisir --</option>
                                        <option value="sophie">Sophie (Électricienne)</option>
                                        <option value="marc">Marc (Mécanicien)</option>
                                        <option value="pierre">Pierre (Polyvalent)</option>
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="block text-[10px] font-extrabold text-primary-400 uppercase">Niveau d'Urgence :</label>
                                      <div className="flex gap-2.5 pt-1">
                                        <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">Urgent</span>
                                        <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 px-2 py-0.5 rounded text-[10px]">Normal</span>
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    disabled={!selectedTechnician}
                                    onClick={() => setIllustrationStep(3)}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-primary-400 text-white rounded-lg py-2 text-xs font-bold uppercase transition cursor-pointer"
                                  >
                                    Valider et Planifier ➔
                                  </button>
                                </div>
                              </div>
                            )}

                            {illustrationStep === 3 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Étape 3 : Rédiger le rapport final & Clôturer</span>
                                <div className="bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-500 p-4 rounded-xl space-y-3 relative">
                                  <span className="px-2 py-0.5 text-[9px] font-extrabold bg-green-500 text-white rounded uppercase tracking-wider">Bon d'intervention terminé</span>
                                  <div className="space-y-2 text-xs">
                                    <div className="bg-white dark:bg-primary-900 border border-emerald-200 rounded p-2.5 italic">
                                      <strong>Rapport de dépannage (Sophie) :</strong>
                                      <p className="text-primary-600 dark:text-primary-400">"Serrage des boulons d'ancrage du moteur de séchage effectué. Test de vibration OK. Remis en service."</p>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-primary-500 font-semibold">
                                      <span>⏱ Temps passé : 1,5 heures</span>
                                      <span>📦 Pièces utilisées : Aucune</span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      alert("Démonstration terminée ! L'intervention est maintenant classée verte, clôturée de façon définitive.");
                                      setIllustrationStep(1);
                                      setSelectedTechnician('');
                                    }}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 text-xs font-bold uppercase transition cursor-pointer"
                                  >
                                    Signer et Archiver le BT ✔
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 5. MAGASIN & STOCK ILLUSTRATIONS */}
                        {id === 'magasin' && (
                          <div className="space-y-4 pt-2">
                            {illustrationStep === 1 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Étape 1 : Alerte Stock Critique (Seuils d'Alerte)</span>
                                <div className="bg-white dark:bg-primary-900 border-2 border-red-500 rounded-xl p-4 space-y-3 relative ring-4 ring-red-500/15">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="text-[9px] font-bold text-primary-400 font-mono">Ref: #P-FILTRE-H24</span>
                                      <h4 className="font-extrabold text-sm text-primary-900 dark:text-white">Filtre Hydraulique Haute Pression</h4>
                                    </div>
                                    <span className="bg-red-500 text-white text-[9px] px-2.5 py-0.5 rounded-full font-extrabold animate-pulse">STOCK DANGER (3/20)</span>
                                  </div>
                                  <div className="w-full bg-primary-100 dark:bg-primary-800 h-3 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500" style={{ width: '15%' }}></div>
                                  </div>
                                  <div className="flex justify-between text-[9px] text-primary-500 font-bold">
                                    <span>Quantité actuelle : 3 filtres</span>
                                    <span>Seuil d'alerte critique : 5 filtres</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {illustrationStep === 2 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Étape 2 : Consommation lors d'une Panne (Enregistrer Sortie)</span>
                                <div className="bg-white dark:bg-primary-900 border-2 border-indigo-500 rounded-xl p-4 space-y-3 relative shadow-md">
                                  <div className="flex justify-between text-xs font-bold">
                                    <span>Stock Actuel :</span>
                                    <span className="text-red-500 font-mono">{miniStockQty} unités en stock</span>
                                  </div>
                                  <div className="flex gap-2.5">
                                    <button
                                      onClick={() => {
                                        setMiniStockQty(prev => Math.max(0, prev - 1));
                                      }}
                                      disabled={miniStockQty === 0}
                                      className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-200 text-white rounded-lg py-2 text-xs font-bold transition cursor-pointer"
                                    >
                                      Sortie (-1 pièce)
                                    </button>
                                  </div>
                                  <p className="text-[10px] text-primary-400 font-semibold italic text-center">
                                    💡 <strong>Simulateur :</strong> Cliquez sur "Sortie" pour simuler qu'un technicien prend un filtre au magasin. Observez l'alerte de stock s'allumer quand vous passez sous 5 pièces !
                                  </p>
                                </div>
                              </div>
                            )}

                            {illustrationStep === 3 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Étape 3 : Réapprovisionner le Magasin (Entrée)</span>
                                <div className="bg-white dark:bg-primary-900 border-2 border-emerald-500 rounded-xl p-4 space-y-3 relative shadow-md">
                                  <div className="flex justify-between text-xs font-bold">
                                    <span>Stock Actuel :</span>
                                    <span className="text-emerald-500 font-mono">{miniStockQty} unités en stock</span>
                                  </div>
                                  <div className="flex gap-2.5">
                                    <button
                                      onClick={() => {
                                        setMiniStockQty(prev => Math.min(20, prev + 10));
                                      }}
                                      disabled={miniStockQty >= 20}
                                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-lg py-2 text-xs font-bold transition cursor-pointer"
                                    >
                                      Enregistrer une Réception Fournisseur (+10 pièces)
                                    </button>
                                  </div>
                                  <p className="text-[10px] text-primary-400 font-semibold italic text-center">
                                    💡 <strong>Simulateur :</strong> Cliquez sur le bouton vert ci-dessus pour simuler la livraison d'un carton de 10 filtres par le livreur. Le stock redevient conforme !
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 6. PLANNING PREVENTIF ILLUSTRATIONS */}
                        {id === 'planning' && (
                          <div className="space-y-4 pt-2">
                            {illustrationStep === 1 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Étape 1 : Programmer une Gamme récurrente</span>
                                <div className="bg-white dark:bg-primary-900 border-2 border-indigo-500 rounded-xl p-4 space-y-3 shadow-md">
                                  <h4 className="font-extrabold text-xs text-indigo-600 uppercase">MODÈLE DE PROGRAMME DE MAINTENANCE :</h4>
                                  <div className="space-y-1.5 text-xs text-primary-700 dark:text-primary-300">
                                    <div><strong>📌 Titre :</strong> Entretien de sécurité semestriel compresseur</div>
                                    <div><strong>🔁 Récurrence :</strong> Tous les 6 mois (ou toutes les 1500 heures)</div>
                                    <div><strong>🛠 Consigne de sécurité obligatoire :</strong> Port de lunettes & Cadenassage de vanne</div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {illustrationStep === 2 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Étape 2 : Visualiser sur le Calendrier Technique</span>
                                <div className="bg-white dark:bg-primary-900 border border-primary-150 rounded-xl overflow-hidden shadow-xs">
                                  <div className="bg-indigo-600 text-white px-3 py-1.5 flex justify-between items-center text-[10px] font-bold">
                                    <span>📅 Calendrier Technique Juillet 2026</span>
                                  </div>
                                  <div className="grid grid-cols-7 gap-1 p-2 font-mono text-[9px] text-center">
                                    <div className="p-2 border bg-slate-50 dark:bg-slate-900">01</div>
                                    <div className="p-2 border bg-slate-50 dark:bg-slate-900">02</div>
                                    <div className="p-2 border bg-indigo-500 text-white rounded font-extrabold relative" title="Maintenance préventive programmée">
                                      03
                                      <span className="block text-[7px] text-white font-sans mt-1">🔧 Vidange</span>
                                    </div>
                                    <div className="p-2 border bg-slate-50 dark:bg-slate-900">04</div>
                                    <div className="p-2 border bg-slate-50 dark:bg-slate-900">05</div>
                                    <div className="p-2 border bg-slate-50 dark:bg-slate-900">06</div>
                                    <div className="p-2 border bg-slate-50 dark:bg-slate-900">07</div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {illustrationStep === 3 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Étape 3 : Simuler l'alerte automatique du système</span>
                                <div className="bg-white dark:bg-primary-900 border-2 border-emerald-500 rounded-xl p-4 space-y-3 shadow-md">
                                  <p className="text-xs text-primary-600 leading-normal">
                                    Le jour J de l'échéance programmée, l'ordinateur central se charge de tout. Pas besoin d'y penser !
                                  </p>
                                  <button
                                    onClick={() => {
                                      alert("✓ Succès : Le système a simulé le passage de la date échéance. Un Bon de Travail #BT-PREV-2006 a été généré automatiquement et affecté au technicien de permanence.");
                                    }}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-4 rounded-lg tracking-wide uppercase cursor-pointer"
                                  >
                                    ▶ Simuler l'arrivée de la date d'échéance !
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 7. ACHATS & BUDGET ILLUSTRATIONS */}
                        {id === 'achats' && (
                          <div className="space-y-4 pt-2">
                            {illustrationStep === 1 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Étape 1 : Rédiger la Demande d'Achat (DA)</span>
                                <div className="bg-white dark:bg-primary-900 border-2 border-indigo-500 rounded-xl p-4 space-y-3 shadow-md text-xs">
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-extrabold text-primary-400 uppercase">Fournisseur ciblé :</label>
                                    <div className="font-extrabold bg-slate-50 dark:bg-slate-800 p-2 rounded">🏢 HYDRATECH SARL (Fournisseur Pièces)</div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                                    <div>Quantité : <strong>5 filtres</strong></div>
                                    <div>Prix Unitaire : <strong>150,00 €</strong></div>
                                  </div>
                                  <div className="pt-2 border-t border-dashed flex justify-between font-extrabold text-indigo-600">
                                    <span>Montant Total HT :</span>
                                    <span>750,00 €</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {illustrationStep === 2 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Étape 2 : Suivi du Budget annuel de l'Atelier</span>
                                <div className="bg-white dark:bg-primary-900 border-2 border-indigo-500 rounded-xl p-4 space-y-3 shadow-md">
                                  <span className="block text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider">Jauge budgétaire temps réel :</span>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold text-primary-900 dark:text-white">
                                      <span>Budget Engagé :</span>
                                      <span>18 500 € / 45 000 € (41% consommé)</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-primary-800 h-4 rounded-full overflow-hidden">
                                      <div className="h-full bg-green-500" style={{ width: '41%' }}></div>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-green-500 font-bold text-center">✓ Enveloppe sécurisée. Feu Vert pour valider la commande !</p>
                                </div>
                              </div>
                            )}

                            {illustrationStep === 3 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Étape 3 : Réceptionner et injecter en stock</span>
                                <div className="bg-white dark:bg-primary-900 border-2 border-emerald-500 rounded-xl p-4 space-y-3 shadow-md text-center">
                                  <p className="text-xs text-primary-600">
                                    Le colis est livré. Le magasinier vérifie l'absence de casse et clique pour valider la livraison.
                                  </p>
                                  <button
                                    onClick={() => {
                                      alert("✓ Commande reçue ! 5 nouveaux Filtres Hydrauliques ont été ajoutés informatiquement au Magasin et la facture a été comptabilisée.");
                                    }}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-4 rounded-lg tracking-wide uppercase cursor-pointer"
                                  >
                                    Confirmer la livraison conforme ✔
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 8. REPORTING & PARETO ILLUSTRATIONS */}
                        {id === 'reporting' && (
                          <div className="space-y-4 pt-2">
                            {illustrationStep === 1 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Étape 1 : Le Diagramme Pareto (Règle d'or 80/20)</span>
                                <div className="bg-white dark:bg-primary-900 border-2 border-indigo-500 rounded-xl p-4 space-y-3 shadow-md">
                                  <h4 className="font-extrabold text-xs text-primary-400 uppercase">HEURES D'ARRÊT USINE PAR ÉQUIPEMENT :</h4>
                                  
                                  <div className="space-y-2 text-xs">
                                    <div className="space-y-1">
                                      <div className="flex justify-between font-bold text-[11px]">
                                        <span>⚙️ Tour Numérique CN-01 (Usinage)</span>
                                        <span className="text-red-500">72 Heures d'arrêt (54%)</span>
                                      </div>
                                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500" style={{ width: '54%' }}></div>
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <div className="flex justify-between font-bold text-[11px]">
                                        <span>⚙️ Compresseur C3 (Fluides)</span>
                                        <span className="text-amber-500">24 Heures d'arrêt (18%)</span>
                                      </div>
                                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500" style={{ width: '18%' }}></div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="p-3 bg-white dark:bg-primary-900 border border-indigo-100 dark:border-primary-800 rounded-xl text-[11px] leading-relaxed text-indigo-700 dark:text-indigo-300 font-semibold">
                                  🎯 <strong>Le secret de Pareto :</strong> Concentrez-vous uniquement sur le <strong>Tour CN-01</strong>. En évitant la panne sur cette unique machine, vous éliminez plus de la moitié de tous vos arrêts d'usine !
                                </div>
                              </div>
                            )}

                            {illustrationStep === 2 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Étape 2 : Analyser la Ventilation Financière</span>
                                <div className="bg-white dark:bg-primary-900 border border-indigo-150 rounded-xl p-4 space-y-3 shadow-md">
                                  <h4 className="font-extrabold text-xs text-indigo-600 uppercase">RÉPARTITION DES DÉPENSES ANNUELLES :</h4>
                                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-extrabold">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded">
                                      <span>⚙ Pièces</span>
                                      <span className="block text-sm font-mono mt-1">45%</span>
                                    </div>
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded">
                                      <span>⏱ Techniciens</span>
                                      <span className="block text-sm font-mono mt-1">35%</span>
                                    </div>
                                    <div className="p-2 bg-amber-50 dark:bg-amber-950 text-amber-600 rounded">
                                      <span>🏢 Prestataires</span>
                                      <span className="block text-sm font-mono mt-1">20%</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {illustrationStep === 3 && (
                              <div className="space-y-3">
                                <span className="block text-[10px] font-bold text-primary-400 uppercase">Étape 3 : Simuler l'Export de Rapport d'activité</span>
                                <div className="bg-white dark:bg-primary-900 border-2 border-indigo-500 rounded-xl p-4 space-y-3 shadow-md text-center">
                                  <p className="text-xs text-primary-600">
                                    Vous devez présenter vos chiffres de maintenance lors du prochain comité de direction ?
                                  </p>
                                  <button
                                    onClick={() => {
                                      alert("✓ Téléchargement lancé : Le rapport mensuel 'GMAOPRO_RAPPORT_JUILLET.pdf' a été simulé et préparé pour l'impression.");
                                    }}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 px-4 rounded-lg tracking-wide uppercase flex items-center justify-center gap-2 cursor-pointer"
                                  >
                                    <Download size={14} />
                                    Télécharger le Rapport d'activité (Simulation)
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Interactive Step Navigation Indicator Bar */}
                        <div className="flex justify-between items-center pt-3 mt-4 border-t border-primary-200/50 dark:border-primary-800/50">
                          <button
                            disabled={illustrationStep === 1}
                            onClick={() => setIllustrationStep(prev => Math.max(1, prev - 1))}
                            className="px-3 py-1.5 text-[10px] font-bold uppercase rounded bg-primary-200 hover:bg-primary-300 disabled:opacity-40 transition cursor-pointer text-primary-800"
                          >
                            ◀ Étape Précédente
                          </button>
                          
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3].map((step) => (
                              <span
                                key={step}
                                className={`w-2 h-2 rounded-full transition ${illustrationStep === step ? 'bg-indigo-600 dark:bg-accent-orange scale-125' : 'bg-primary-200'}`}
                              />
                            ))}
                          </div>

                          <button
                            disabled={illustrationStep === 3}
                            onClick={() => setIllustrationStep(prev => Math.min(3, prev + 1))}
                            className="px-3 py-1.5 text-[10px] font-bold uppercase rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition cursor-pointer"
                          >
                            Étape Suivante ▶
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* TAB 3: BEGINNER GLOSSARY */}
        {activeTab === 'glossaire' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Glossaire listing */}
            <div id="glossaire-start" className="card bg-white dark:bg-primary-900 p-6 rounded-2xl border border-primary-100 dark:border-primary-800 shadow-xs space-y-4 scroll-mt-6">
              <div className="space-y-1">
                <h3 className="text-base font-display font-extrabold text-primary-900 dark:text-white">Le dictionnaire de la maintenance industrielle</h3>
                <p className="text-xs text-primary-500">
                  Des définitions simplifiées et vulgarisées, sans jargon inutile, parfaites pour les débutants.
                </p>
              </div>

              {filteredGlossary.length === 0 ? (
                <div className="text-center py-12 text-primary-400 font-bold text-xs space-y-2">
                  <p>Aucun terme ne correspond à votre recherche "{searchQuery}"</p>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="text-accent-orange underline hover:text-amber-600"
                  >
                    Réinitialiser la recherche
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredGlossary.map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-4 bg-primary-50/40 dark:bg-primary-950/20 rounded-xl border border-primary-100 dark:border-primary-800/80 hover:border-indigo-200 dark:hover:border-indigo-900 transition flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-display font-extrabold text-sm text-indigo-600 dark:text-indigo-400">{item.term}</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 uppercase">GMAO-PRO</span>
                        </div>
                        <span className="block text-[10px] font-bold text-primary-400 uppercase tracking-wide italic">{item.def}</span>
                        <p className="text-xs text-primary-600 dark:text-primary-300 leading-relaxed font-semibold">
                          {item.desc}
                        </p>
                      </div>
                      
                      {/* Example callout */}
                      <div className="mt-3 bg-white dark:bg-primary-900 p-2.5 rounded-lg border border-primary-100 dark:border-primary-800 text-[10px] text-primary-500 leading-relaxed font-semibold flex items-start gap-2">
                        <span className="text-accent-orange font-bold shrink-0">Exemple :</span>
                        <span>{item.example}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 4: FREQUENTLY ASKED QUESTIONS */}
        {activeTab === 'faq' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div id="faq-start" className="card bg-white dark:bg-primary-900 p-6 rounded-2xl border border-primary-100 dark:border-primary-800 shadow-xs space-y-4 scroll-mt-6">
              <div className="space-y-1">
                <h3 className="text-base font-display font-extrabold text-primary-900 dark:text-white">Foire aux questions des utilisateurs</h3>
                <p className="text-xs text-primary-500">
                  Réponses claires et illustrées aux doutes les plus fréquents des techniciens et gestionnaires d'atelier.
                </p>
              </div>

              <div className="space-y-3">
                {faqItems.map((item, idx) => {
                  const isOpen = faqOpenIndex === idx;
                  return (
                    <div 
                      key={idx}
                      className="border border-primary-150 dark:border-primary-800 rounded-xl overflow-hidden"
                    >
                      {/* Accordion Trigger */}
                      <button
                        onClick={() => setFAQOpenIndex(isOpen ? null : idx)}
                        className="w-full flex justify-between items-center p-4 bg-primary-50/50 hover:bg-primary-50 dark:bg-primary-950/10 dark:hover:bg-primary-950/20 text-left cursor-pointer transition"
                      >
                        <span className="font-bold text-xs sm:text-sm text-primary-900 dark:text-white flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">?</span>
                          {item.q}
                        </span>
                        <ChevronDown 
                          size={16} 
                          className={`text-primary-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-accent-orange' : ''}`} 
                        />
                      </button>

                      {/* Accordion Content */}
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="bg-white dark:bg-primary-900 border-t border-primary-150 dark:border-primary-800"
                          >
                            <div className="p-4 text-xs text-primary-700 dark:text-primary-300 leading-relaxed font-semibold space-y-2">
                              <p>{item.a}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>

        </div> {/* Closes right column: Main Content Area */}
      </div> {/* Closes Two-column layout grid */}

      {/* Embedded illustrated guide for quick-access instructions */}
      <div className="card bg-gradient-to-r from-primary-900 to-indigo-950 rounded-2xl p-6 text-white border border-indigo-900/40 shadow-md">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl text-amber-400 shrink-0 animate-bounce">
              <HelpCircle size={28} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold">Besoin d'une démonstration ou d'aide supplémentaire ?</h4>
              <p className="text-xs text-indigo-200">
                Vous pouvez contacter l'administrateur système de la maintenance ou ré-initialiser la base de données de test pour recommencer à zéro.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              // Smooth scroll to top of guide
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-accent-orange hover:bg-amber-600 font-extrabold text-xs text-white rounded-xl transition shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
          >
            Retourner en haut du guide ➔
          </button>
        </div>
      </div>

      {/* Global Print Styles and PDF printable section */}
      <style>{`
        @media screen {
          #guide-print-area {
            display: none !important;
          }
        }
        @media print {
          /* Hide fixed headers, scrollbars, tabs, sidebars, backgrounds and buttons */
          header, 
          aside, 
          nav, 
          button, 
          input, 
          select, 
          footer,
          .print-hide,
          #guide-utilisation-container > :not(#guide-print-area),
          div[class*="fixed"], 
          div[class*="absolute"], 
          div[class*="z-50"] {
            display: none !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            visibility: hidden !important;
          }

          /* Force static page wrapper flow, removing layout bounds, paddings or margins */
          html, body, #root, #root > div, main, div[class*="max-w-"], div[class*="mx-auto"], #guide-utilisation-container {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            transform: none !important;
            transition: none !important;
          }

          /* Printable container styling */
          #guide-print-area {
            display: block !important;
            visibility: visible !important;
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            padding: 20px !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            font-family: "Inter", -apple-system, sans-serif !important;
          }

          #guide-print-area * {
            visibility: visible !important;
          }

          /* Prevent cut offs and configure page breaks */
          .print-page-break {
            page-break-before: always !important;
            break-before: page !important;
            padding-top: 20px !important;
          }

          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Keep readable borders and grids on paper */
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 20px !important;
          }

          .print-border {
            border: 1px solid #cbd5e1 !important;
          }

          .print-bg-slate {
            background-color: #f8fafc !important;
          }
        }
      `}</style>

      <div id="guide-print-area" className="hidden font-sans">
        {/* Cover Page */}
        <div className="flex flex-col justify-between" style={{ pageBreakAfter: 'always', breakAfter: 'page', minHeight: '22cm' }}>
          <div className="border-8 border-indigo-900 p-10 text-center my-auto relative" style={{ minHeight: '19cm' }}>
            <span className="block text-xs font-bold uppercase tracking-widest text-indigo-600 mb-4">Documentation Officielle GMAO-PRO</span>
            <div className="h-1 bg-indigo-900 w-24 mx-auto mb-16"></div>
            
            <h1 className="text-4xl font-extrabold tracking-tight text-indigo-950 uppercase mt-24">
              Manuel de Prise en Main &amp; Mode d'Emploi
            </h1>
            <h2 className="text-6xl font-black tracking-tight text-amber-500 mt-4">
              GMAO-PRO
            </h2>
            <p className="text-sm font-semibold text-slate-500 mt-6 max-w-md mx-auto leading-relaxed">
              Le guide complet étape par étape pour les opérateurs, techniciens et responsables de la maintenance industrielle d'usine.
            </p>

            <div className="mt-48 text-left max-w-md mx-auto space-y-2 border-t pt-8 text-xs text-slate-500 font-semibold">
              <p><strong>Logiciel de gestion :</strong> GMAO-PRO v2.4 (Version Production)</p>
              <p><strong>Date d'édition :</strong> Juillet 2026</p>
              <p><strong>Auteur :</strong> Bureau des Méthodes &amp; Maintenance Générale</p>
              <p><strong>Règlement :</strong> Document interne destiné au personnel certifié</p>
            </div>
            
            <div className="absolute bottom-6 left-0 right-0 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              GMAO-PRO © 2026 • TOUS DROITS RÉSERVÉS
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="print-page-break">
          <h2 className="text-2xl font-extrabold text-indigo-950 border-b-2 border-slate-300 pb-2 mb-8 uppercase">Table des Matières</h2>
          <div className="space-y-6 text-sm font-bold text-slate-700">
            <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-1">
              <span>1. Introduction &amp; Flux Opérationnel de l'Usine</span>
              <span className="font-mono">Page 2</span>
            </div>
            <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-1">
              <span>2. Guide pas-à-pas des 8 Modules de GMAO-PRO</span>
              <span className="font-mono">Page 3</span>
            </div>
            <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-1 pl-6 text-xs text-slate-500 font-medium">
              <span>• Module A : Tableau de Bord &amp; Supervision Générale</span>
              <span className="font-mono">Page 3</span>
            </div>
            <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-1 pl-6 text-xs text-slate-500 font-medium">
              <span>• Module B : Portail Terrain Mobile (Saisie Vocale &amp; QR Code)</span>
              <span className="font-mono">Page 3</span>
            </div>
            <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-1 pl-6 text-xs text-slate-500 font-medium">
              <span>• Module C : Parc Équipements &amp; Fiches Techniques</span>
              <span className="font-mono">Page 4</span>
            </div>
            <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-1 pl-6 text-xs text-slate-500 font-medium">
              <span>• Module D : Bons de Travail &amp; Kanban d'intervention</span>
              <span className="font-mono">Page 4</span>
            </div>
            <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-1 pl-6 text-xs text-slate-500 font-medium">
              <span>• Module E : Magasin &amp; Gestion des Stocks de rechanges</span>
              <span className="font-mono">Page 5</span>
            </div>
            <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-1 pl-6 text-xs text-slate-500 font-medium">
              <span>• Module F : Planning de Maintenance Préventive Récurrente</span>
              <span className="font-mono">Page 5</span>
            </div>
            <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-1 pl-6 text-xs text-slate-500 font-medium">
              <span>• Module G : Achats, Fournisseurs &amp; Suivi Budgétaire</span>
              <span className="font-mono">Page 6</span>
            </div>
            <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-1 pl-6 text-xs text-slate-500 font-medium">
              <span>• Module H : Reporting, Statistiques &amp; Pareto 80/20</span>
              <span className="font-mono">Page 6</span>
            </div>
            <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-1">
              <span>3. Dictionnaire de la maintenance (Glossaire complet pour débutants)</span>
              <span className="font-mono">Page 7</span>
            </div>
            <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-1">
              <span>4. Foire Aux Questions (FAQ utilisateurs)</span>
              <span className="font-mono">Page 8</span>
            </div>
          </div>
        </div>

        {/* Section 1: Introduction */}
        <div className="print-page-break">
          <h2 className="text-xl font-extrabold text-indigo-950 border-b-2 border-slate-300 pb-2 mb-4 uppercase">1. Introduction &amp; Flux Opérationnel</h2>
          <p className="text-xs text-slate-700 leading-relaxed mb-6 font-semibold">
            GMAO-PRO est la colonne vertébrale numérique de l'organisation technique de notre usine. Elle centralise les données sur les actifs, gère les stocks physiques de pièces détachées et automatise les flux de travaux. Ce manuel a pour vocation d'accompagner chaque collaborateur dans l'assimilation des processus opérationnels de maintenance.
          </p>

          <h3 className="text-sm font-extrabold text-indigo-900 uppercase mb-3">Cycle de vie d'une panne dans le système :</h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border rounded-xl print-avoid-break">
              <span className="text-[10px] font-bold text-red-600 uppercase block mb-1">Étape A : Détection &amp; Auto-Signalement (DI)</span>
              <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                Tout utilisateur de l'usine (opérateur, chef de ligne) découvrant un comportement suspect ou une panne active sur une machine scanne son QR code ou se rend sur le portail d'auto-signalement. Il dicte son anomalie de vive voix (moteur bruyant, fuite d'eau, etc.). Cela génère instantanément une <strong>Demande d'Intervention (DI)</strong> sans nécessiter de mot de passe.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border rounded-xl print-avoid-break">
              <span className="text-[10px] font-bold text-sky-600 uppercase block mb-1">Étape B : Validation &amp; Affectation (BT)</span>
              <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                Le chef technique reçoit l'alerte sur sa console d'administration. Il analyse la criticité de l'appareil (les machines A sont les plus importantes pour éviter l'arrêt complet de la chaîne) et transforme la DI en <strong>Bon de Travail (BT)</strong> officiel. Il affecte un technicien adéquat et pré-réserve les pièces détachées nécessaires du magasin.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border rounded-xl print-avoid-break">
              <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Étape C : Intervention, Saisie du rapport &amp; Clôture</span>
              <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                Le technicien effectue sa réparation sur le terrain. Une fois résolue, il rédige ou dicte son rapport d'intervention, renseigne les pièces consommées (qui se déduisent automatiquement du stock) et son temps d'intervention réel. Le responsable signe électroniquement le bon, ce qui solde définitivement la tâche et met à jour les indicateurs MTBF de la machine.
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-indigo-50 border border-indigo-100 rounded-xl print-avoid-break">
            <h4 className="text-xs font-bold text-indigo-900 uppercase">🚀 Guide Rapide de démarrage pour les Nouveaux :</h4>
            <ul className="mt-2 space-y-2 text-[11px] text-indigo-800 font-semibold list-decimal pl-4">
              <li><strong>Création d'équipements :</strong> Enregistrez vos machines physiques dans le module Parc Équipement.</li>
              <li><strong>Saisie de stock initial :</strong> Renseignez les pièces de rechange courantes au Magasin informatique.</li>
              <li><strong>Test de signalement :</strong> Simulez une déclaration d'anomalie depuis le Portail Terrain.</li>
              <li><strong>KPIs Techniques :</strong> Consultez les tableaux de bord pour valider les calculs MTBF et MTTR.</li>
            </ul>
          </div>
        </div>

        {/* Section 2: Modules details */}
        <div className="print-page-break">
          <h2 className="text-xl font-extrabold text-indigo-950 border-b-2 border-slate-300 pb-2 mb-4 uppercase">2. Guide Pas-à-Pas des Modules Applicatifs</h2>
          
          <div className="space-y-6">
            <div className="p-4 border rounded-xl bg-slate-50/40 print-avoid-break">
              <h3 className="text-xs font-extrabold text-indigo-900 uppercase block mb-1">Module A : Tableau de Bord &amp; Supervision Générale</h3>
              <p className="text-[11px] text-slate-600 font-semibold italic mb-3">"Votre cockpit de supervision générale. Il permet de voir d'un seul coup d'œil la santé globale de l'usine."</p>
              <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1 font-semibold mb-3">
                <li>Consultez les 4 indicateurs clés (KPI) en haut : MTBF (fiabilité), MTTR (vitesse de réparation), Taux de préventif (anticipation) et Coût de maintenance.</li>
                <li>Observez le graphique de répartition des interventions en cours pour orienter vos priorités de la journée.</li>
                <li>Utilisez le bouton 'Activer Diaporama' pour faire défiler automatiquement les données sur un grand écran accroché au mur de l'atelier.</li>
              </ul>
              <div className="p-2 bg-indigo-50 text-[10px] text-indigo-800 font-semibold rounded">
                <strong>💡 Astuce d'expert :</strong> Le bouton 'Personnaliser' vous permet de masquer les widgets qui ne vous intéressent pas afin d'avoir une vue épurée et sur-mesure.
              </div>
            </div>

            <div className="p-4 border rounded-xl bg-slate-50/40 print-avoid-break">
              <h3 className="text-xs font-extrabold text-indigo-900 uppercase block mb-1">Module B : Portail Terrain Mobile (Saisie Vocale &amp; QR Code)</h3>
              <p className="text-[11px] text-slate-600 font-semibold italic mb-3">"L'outil indispensable du technicien mobile, conçu pour être simple, rapide et utilisable même avec des gants."</p>
              <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1 font-semibold mb-3">
                <li>Scannez le QR Code physique de la machine pour charger sa fiche d'identité.</li>
                <li>Appuyez sur le bouton micro rouge de la Saisie Vocale et décrivez la panne à voix haute : le texte s'écrit tout seul !</li>
                <li>Prenez une photo de la pièce défaillante directement avec l'appareil photo du téléphone pour illustrer le problème.</li>
                <li>Si vous perdez le réseau Wi-Fi de l'usine, continuez de travailler normalement, le système synchronisera tout à votre retour.</li>
              </ul>
              <div className="p-2 bg-indigo-50 text-[10px] text-indigo-800 font-semibold rounded">
                <strong>💡 Astuce d'expert :</strong> Vous pouvez également faire des relevés de compteurs (ex : heures de marche) pour alimenter le planning préventif en temps réel.
              </div>
            </div>

            <div className="p-4 border rounded-xl bg-slate-50/40 print-avoid-break">
              <h3 className="text-xs font-extrabold text-indigo-900 uppercase block mb-1">Module C : Parc Équipements &amp; Fiches Techniques</h3>
              <p className="text-[11px] text-slate-600 font-semibold italic mb-3">"La bibliothèque de toutes vos machines classées par atelier."</p>
              <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1 font-semibold mb-3">
                <li>Sélectionnez un atelier de production (ex: Usinage, Injection) pour filtrer les machines.</li>
                <li>Cliquez sur une machine pour voir sa fiche d'identité technique, sa notice constructeur au format PDF, et son niveau de criticité.</li>
                <li>Consultez la nomenclature (liste des pièces détachées compatibles) pour savoir exactement quel filtre ou joint commander.</li>
                <li>Analysez l'historique complet de toutes les pannes passées de la machine pour comprendre ses faiblesses.</li>
              </ul>
              <div className="p-2 bg-indigo-50 text-[10px] text-indigo-800 font-semibold rounded">
                <strong>💡 Astuce d'expert :</strong> La criticité 'A' désigne les machines vitales dont l'arrêt stoppe toute l'usine. Chouchoutez-les en priorité !
              </div>
            </div>

            <div className="p-4 border rounded-xl bg-slate-50/40 print-avoid-break">
              <h3 className="text-xs font-extrabold text-indigo-900 uppercase block mb-1">Module D : Bons de Travail &amp; Kanban d'intervention</h3>
              <p className="text-[11px] text-slate-600 font-semibold italic mb-3">"Le cœur opérationnel de la maintenance. C'est ici que l'on suit le cycle de vie de chaque dépannage."</p>
              <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1 font-semibold mb-3">
                <li>Les pannes apparaissent d'abord dans la colonne 'Demandes d'Intervention (DI)' en attente de validation.</li>
                <li>Glissez-déposez le bon (ou changez son statut) dans la colonne 'En Cours (BT)' pour démarrer le travail.</li>
                <li>À l'intérieur du bon, saisissez votre rapport écrit, le temps que vous avez passé, et les pièces de rechange que vous avez utilisées.</li>
                <li>Une fois terminé, passez le bon en 'Validation' pour que votre responsable signe électroniquement et archive le bon.</li>
              </ul>
              <div className="p-2 bg-indigo-50 text-[10px] text-indigo-800 font-semibold rounded">
                <strong>💡 Astuce d'expert :</strong> Mettez une ligne en surbrillance en passant votre souris dessus et cliquez pour ouvrir instantanément ses détails complets !
              </div>
            </div>

            <div className="p-4 border rounded-xl bg-slate-50/40 print-avoid-break">
              <h3 className="text-xs font-extrabold text-indigo-900 uppercase block mb-1">Module E : Magasin &amp; Gestion des Stocks de rechanges</h3>
              <p className="text-[11px] text-slate-600 font-semibold italic mb-3">"La gestion des stocks de pièces détachées pour éviter la panne sèche."</p>
              <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1 font-semibold mb-3">
                <li>Visualisez instantanément la valeur financière globale de votre stock de rechanges.</li>
                <li>Consultez la liste des pièces et repérez les alertes de seuils critiques (niveau bas ou rupture de stock).</li>
                <li>Enregistrez une Sortie de pièce dès que vous l'utilisez pour réparer une machine afin de maintenir le stock informatique à jour.</li>
                <li>Faites une Entrée de stock pour enregistrer la livraison des nouvelles pièces commandées.</li>
              </ul>
              <div className="p-2 bg-indigo-50 text-[10px] text-indigo-800 font-semibold rounded">
                <strong>💡 Astuce d'expert :</strong> Chaque pièce est associée à un fournisseur préféré pour accélérer les commandes de réapprovisionnement.
              </div>
            </div>

            <div className="p-4 border rounded-xl bg-slate-50/40 print-avoid-break">
              <h3 className="text-xs font-extrabold text-indigo-900 uppercase block mb-1">Module F : Planning de Maintenance Préventive</h3>
              <p className="text-[11px] text-slate-600 font-semibold italic mb-3">"L'agenda de l'entretien préventif pour planifier et anticiper les pannes avant qu'elles ne surviennent."</p>
              <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1 font-semibold mb-3">
                <li>Visualisez le calendrier mensuel ou hebdomadaire des opérations d'entretien planifiées.</li>
                <li>Créez une nouvelle gamme de maintenance récurrente (ex : Graissage des roulements, calibrage des capteurs).</li>
                <li>Associez un déclencheur automatique (par exemple : tous les 1ers du mois, ou dès que la machine atteint 2000 heures de fonctionnement).</li>
                <li>Le jour J, le système génère et vous envoie automatiquement le Bon de Travail correspondant dans votre liste de tâches.</li>
              </ul>
              <div className="p-2 bg-indigo-50 text-[10px] text-indigo-800 font-semibold rounded">
                <strong>💡 Astuce d'expert :</strong> Vous pouvez glisser-déposer un rendez-vous directement sur le calendrier pour décaler une intervention si la production est surchargée.
              </div>
            </div>

            <div className="p-4 border rounded-xl bg-slate-50/40 print-avoid-break">
              <h3 className="text-xs font-extrabold text-indigo-900 uppercase block mb-1">Module G : Achats, Fournisseurs &amp; Suivi Budgétaire</h3>
              <p className="text-[11px] text-slate-600 font-semibold italic mb-3">"Gérez vos fournisseurs de pièces, vos prestataires de services externes et votre budget annuel."</p>
              <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1 font-semibold mb-3">
                <li>Créez une Demande d'Achat (DA) lorsque vous manquez de pièces ou devez faire intervenir un expert externe.</li>
                <li>Suivez l'enveloppe budgétaire annuelle : le système vous alerte si les dépenses approchent de la limite autorisée.</li>
                <li>Enregistrez les contrats de sous-traitance et évaluez la ponctualité de vos fournisseurs à la livraison.</li>
              </ul>
              <div className="p-2 bg-indigo-50 text-[10px] text-indigo-800 font-semibold rounded">
                <strong>💡 Astuce d'expert :</strong> Une DA approuvée se transforme automatiquement en Bon de Commande (BC) prêt à être envoyé par email au fournisseur.
              </div>
            </div>

            <div className="p-4 border rounded-xl bg-slate-50/40 print-avoid-break">
              <h3 className="text-xs font-extrabold text-indigo-900 uppercase block mb-1">Module H : Reporting, Statistiques &amp; Pareto 80/20</h3>
              <p className="text-[11px] text-slate-600 font-semibold italic mb-3">"L'outil statistique pour analyser l'efficacité de l'équipe et justifier les budgets de maintenance."</p>
              <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1 font-semibold mb-3">
                <li>Consultez le graphique Pareto pour voir les 20% d'équipements qui causent 80% des arrêts d'usine (les 'machines à problèmes').</li>
                <li>Analysez la répartition financière globale (Coût de main d'œuvre interne vs coût d'achat des pièces).</li>
                <li>Exportez des rapports d'activité d'un seul clic au format CSV ou imprimez un rapport PDF propre pour votre réunion de direction.</li>
              </ul>
              <div className="p-2 bg-indigo-50 text-[10px] text-indigo-800 font-semibold rounded">
                <strong>💡 Astuce d'expert :</strong> Un taux de maintenance préventive supérieur à 70% indique une usine saine qui subit peu de pannes imprévues !
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Glossaire */}
        <div className="print-page-break">
          <h2 className="text-xl font-extrabold text-indigo-950 border-b-2 border-slate-300 pb-2 mb-4 uppercase">3. Dictionnaire de la Maintenance (Glossaire)</h2>
          <p className="text-xs text-slate-700 leading-relaxed mb-6 font-semibold">
            Définitions claires des principaux concepts de maintenance industrielle indispensables pour maîtriser GMAO-PRO.
          </p>

          <div className="space-y-4">
            {glossaryItems.map((item, idx) => (
              <div key={idx} className="p-4 border rounded-xl bg-slate-50/50 print-avoid-break">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-extrabold text-xs text-indigo-900 uppercase">{item.term}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase italic">Définition : {item.def}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-semibold mb-2">
                  {item.desc}
                </p>
                <div className="bg-white p-2 border border-slate-100 rounded text-[10px] text-slate-500 font-semibold italic flex gap-1">
                  <span className="text-amber-500 font-bold shrink-0">Exemple :</span>
                  <span>{item.example}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: FAQ */}
        <div className="print-page-break">
          <h2 className="text-xl font-extrabold text-indigo-950 border-b-2 border-slate-300 pb-2 mb-4 uppercase">4. Questions Fréquentes (FAQ)</h2>
          <p className="text-xs text-slate-700 leading-relaxed mb-6 font-semibold">
            Réponses pratiques rédigées par l'équipe d'intégration pour lever les doutes quotidiens.
          </p>

          <div className="space-y-4">
            {faqItems.map((item, idx) => (
              <div key={idx} className="p-4 border rounded-xl bg-slate-50/50 print-avoid-break">
                <h4 className="font-extrabold text-xs text-indigo-900 mb-2 flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-900 text-white font-bold flex items-center justify-center text-[10px] shrink-0">?</span>
                  {item.q}
                </h4>
                <div className="pl-7 text-xs text-slate-700 font-semibold leading-relaxed flex gap-2">
                  <span className="text-amber-600 font-bold shrink-0">RÉPONSE :</span>
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Page footer */}
        <div className="print-footer text-center pt-8 border-t mt-12 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
          Manuel d'Utilisation GMAO-PRO • Édition Juillet 2026 • Document Certifié Conforme
        </div>
      </div>
    </div>
  );
}
