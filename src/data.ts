/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Equipement,
  Intervention,
  Piece,
  MouvementStock,
  GammePreventive,
  Compteur,
  Fournisseur,
  Commande,
  Utilisateur,
  GlobalSettings,
  Objectifs,
  Commentaire,
  AuditLog,
  DocumentGed,
  Budget
} from './types';

// Keys for LocalStorage
const KEYS = {
  SETTINGS: 'gmao_settings',
  OBJECTIFS: 'gmao_objectifs',
  EQUIPEMENTS: 'gmao_equipements',
  INTERVENTIONS: 'gmao_interventions',
  PIECES: 'gmao_pieces',
  MOUVEMENTS: 'gmao_mouvements',
  GAMMES: 'gmao_gammes',
  COMPTEURS: 'gmao_compteurs',
  FOURNISSEURS: 'gmao_fournisseurs',
  COMMANDES: 'gmao_commandes',
  UTILISATEURS: 'gmao_utilisateurs',
  OFFLINE_QUEUE: 'gmao_offline_queue',
  THEME: 'gmao_theme',
  FONT_SIZE: 'gmao_font_size',
  CONTRAST: 'gmao_contrast',
  CURRENT_USER: 'gmao_current_user',
  WIDGETS: 'gmao_widgets',
  AUDIT_LOGS: 'gmao_audit_logs',
  DOCUMENTS: 'gmao_documents',
  BUDGETS: 'gmao_budgets'
};

// INITIAL SEED DATA
export const INITIAL_SETTINGS: GlobalSettings = {
  nomEntreprise: "Usine Métal & Plastique PRO",
  coutMO: 65,
  devise: "€",
  themeMode: "adaptive",
  taillePolice: "md",
  themeContraste: "normal",
  competencesList: [
    "Habilitation Électrique BR/BC",
    "Consignation Hydraulique",
    "Automatisme Siemens S7",
    "Soudure TIG",
    "Diagnostic Vibratoire",
    "Mécanique Précision"
  ],
  competencesTechniciens: {
    "Jean Dupont (Admin)": ["Habilitation Électrique BR/BC", "Automatisme Siemens S7"],
    "Pierre Martin (Tech)": ["Habilitation Électrique BR/BC", "Mécanique Précision", "Soudure TIG"],
    "Luc Leblanc (Tech)": ["Consignation Hydraulique", "Mécanique Précision"],
    "Amine Ben (Tech)": ["Automatisme Siemens S7", "Habilitation Électrique BR/BC"],
    "Sylvie Roche (Magasin)": []
  },
  listes: {
    ateliers: ["CM", "Laseris", "ADB", "Services Généraux"],
    metiers: ["Mécanique", "Électricité", "Automatisme", "Pneumatique", "Hydraulique"],
    marques: ["Siemens", "Schneider Electric", "Bosch Rexroth", "SKF", "Telemecanique", "SMC", "Festo"],
    categories: {
      "Hydraulique": ["Pompes", "Distributeurs", "Filtres", "Vérins"],
      "Électrique": ["Disjoncteurs", "Relais", "Contacteurs", "Variateurs", "Câblages"],
      "Automatisme": ["Automates", "Cartes d'E/S", "Écrans IHM", "Capteurs"],
      "Mécanique": ["Roulements", "Pignons", "Courroies", "Accouplements", "Joints"]
    },
    etats: ["En attente", "En cours", "En attente de pièce", "Soldé"],
    urgences: ["Faible (Semaine)", "Moyenne (48h)", "Haute (24h)", "Critique (Arrêt Machine)"],
    effets: ["Fuite de fluide", "Surchauffe thermique", "Court-circuit électrique", "Bruit anormal", "Défaut d'alignement", "Perte d'IHM", "Blocage mécanique"],
    activites: ["Dépannage direct", "Remplacement pièce d'usure", "Soudure", "Nettoyage/Graissage", "Calibration"],
    technologies: ["Mécanique générale", "Pneumatique", "Hydraulique", "Électrotechnique", "Électronique"],
    causes: ["Usure normale", "Mauvaise lubrification", "Fatigue matière", "Surtension réseau", "Erreur opérateur", "Choc physique"],
    remedes: ["Pièce remplacée", "Réglage/Alignement", "Lubrification refaite", "Recâblage ou resserrage", "Mise à jour firmware"],
    imputations: ["Budget Maintenance Interne", "Budget Investissement (CAPEX)", "Contrat de sous-traitance", "Garantie constructeur"],
    operateurs: ["Jean Dupont (Admin)", "Pierre Martin (Tech)", "Luc Leblanc (Tech)", "Amine Ben (Tech)", "Sylvie Roche (Magasin)"]
  },
  shortcuts: {
    dashboard: "d",
    equipements: "e",
    interventions: "i",
    magasin: "m",
    planning: "p",
    achats: "a",
    reglages: "r",
    cartographie: "c",
    reporting: "o",
    "portail-terrain": "t"
  }
};

export const INITIAL_BUDGETS: Budget[] = [
  { id: "BG-001", annee: 2026, atelier: "Atelier Usinage", enveloppe: 15000, description: "Budget annuel de maintenance usinage" },
  { id: "BG-002", annee: 2026, atelier: "Atelier Injection", enveloppe: 25000, description: "Budget annuel injection (moules et presses)" },
  { id: "BG-003", annee: 2026, atelier: "Atelier Conditionnement", enveloppe: 12000, description: "Budget annuel lignes d'emballage" },
  { id: "BG-004", annee: 2026, atelier: "Services Généraux", enveloppe: 8000, description: "Infrastructures et utilités" }
];

export const INITIAL_OBJECTIFS: Objectifs = {
  budgetMax: 8000,
  dispoCible: 96.5,
  txPrevCible: 60,
  maxArrets: 8
};

export const INITIAL_EQUIPEMENTS: Equipement[] = [
  {
    id: "CLISSON",
    nom: "Groupe Clisson",
    atelier: "CM",
    metier: "MULTI-TECHNIQUES",
    statut: "Opérationnel",
    tempsOuverture: 8760,
    marque: "Clisson",
    type: "Site principal",
    serie: "ROOT",
    annee: 2020,
    garantie: "2030-12-31",
    prix: 0,
    critique: true,
    piecesAffectees: "",
    infos: "Siège principal et site de production du Groupe Clisson.",
    parentId: null
  },
  {
    id: "CM",
    nom: "CM",
    atelier: "CM",
    metier: "MULTI-TECHNIQUES",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "CM",
    type: "Division",
    serie: "CM-001",
    annee: 2021,
    garantie: "2028-12-31",
    prix: 0,
    critique: false,
    piecesAffectees: "",
    infos: "Division Construction Métallique du Groupe Clisson.",
    parentId: "CLISSON"
  },
  {
    id: "CM-XXX",
    nom: "XXX",
    atelier: "CM",
    metier: "Mécanique",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "CM",
    type: "Équipement CM",
    serie: "SN-XXX-CM",
    annee: 2022,
    garantie: "2025-12-31",
    prix: 15000,
    critique: false,
    piecesAffectees: "",
    infos: "Équipement auxiliaire de la division CM.",
    parentId: "CM"
  },
  {
    id: "LASERIS",
    nom: "Laseris",
    atelier: "Laseris",
    metier: "MULTI-TECHNIQUES",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "Laseris",
    type: "Division Laser",
    serie: "LAS-001",
    annee: 2021,
    garantie: "2028-12-31",
    prix: 0,
    critique: true,
    piecesAffectees: "",
    infos: "Division Découpe Laser et Pliage du Groupe Clisson.",
    parentId: "CLISSON"
  },
  {
    id: "BAT-1",
    nom: "Bat.1",
    atelier: "Laseris",
    metier: "MULTI-TECHNIQUES",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "Laseris",
    type: "Bâtiment 1",
    serie: "BAT1",
    annee: 2021,
    garantie: "2030-12-31",
    prix: 0,
    critique: true,
    piecesAffectees: "",
    infos: "Bâtiment de production N°1 - Laseris.",
    parentId: "LASERIS"
  },
  {
    id: "BAT1-PONTS",
    nom: "Ponts",
    atelier: "Laseris",
    metier: "Mécanique",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "Laseris",
    type: "Section Ponts",
    serie: "BAT1-P",
    annee: 2021,
    garantie: "2030-12-31",
    prix: 0,
    critique: true,
    piecesAffectees: "",
    infos: "Ponts roulants du Bâtiment 1.",
    parentId: "BAT-1"
  },
  {
    id: "PONT-987654",
    nom: "Pont N° 987654",
    atelier: "Laseris",
    metier: "Mécanique",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "Verlinde",
    type: "Pont Roulant Bi-poutre",
    serie: "SN-987654",
    annee: 2018,
    garantie: "2025-12-31",
    prix: 45000,
    critique: true,
    piecesAffectees: "Élingues, Moteur de translation, Télécommande",
    infos: "Pont roulant de manutention lourde, capacité 10 tonnes.",
    parentId: "BAT1-PONTS"
  },
  {
    id: "BAT1-LASERS",
    nom: "Lasers",
    atelier: "Laseris",
    metier: "Automatisme",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "Laseris",
    type: "Section Lasers",
    serie: "BAT1-L",
    annee: 2021,
    garantie: "2030-12-31",
    prix: 0,
    critique: true,
    piecesAffectees: "",
    infos: "Machines de découpe laser du Bâtiment 1.",
    parentId: "BAT-1"
  },
  {
    id: "MACH01",
    nom: "Mach01",
    atelier: "Laseris",
    metier: "Automatisme",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "Trumpf",
    type: "Laser de découpe CNC",
    serie: "SN-M01",
    annee: 2022,
    garantie: "2025-12-31",
    prix: 320000,
    critique: true,
    piecesAffectees: "Lentilles, Buses, Filtres",
    infos: "Laser Trumpf 4kW principal du Bâtiment 1.",
    parentId: "BAT1-LASERS"
  },
  {
    id: "MACH01-LM",
    nom: "Loadmaster",
    atelier: "Laseris",
    metier: "Automatisme",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "Trumpf",
    type: "Chargeur de tôles automatique",
    serie: "SN-LM01",
    annee: 2022,
    garantie: "2025-12-31",
    prix: 75000,
    critique: true,
    piecesAffectees: "Ventouses de levage, Vérins",
    infos: "Robot de chargement automatique pour Mach01.",
    parentId: "MACH01"
  },
  {
    id: "MACH01-LM-XXX",
    nom: "XXX",
    atelier: "Laseris",
    metier: "Pneumatique",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "Festo",
    type: "Module auxiliaire",
    serie: "SN-XXX-LM1",
    annee: 2023,
    garantie: "2026-12-31",
    prix: 5000,
    critique: false,
    piecesAffectees: "Électrovannes",
    infos: "Sous-ensemble pneumatique de régulation sur le Loadmaster de Mach01.",
    parentId: "MACH01-LM"
  },
  {
    id: "MACH02",
    nom: "Mach02",
    atelier: "Laseris",
    metier: "Automatisme",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "Bystronic",
    type: "Laser CO2",
    serie: "SN-M02",
    annee: 2020,
    garantie: "2023-12-31",
    prix: 280000,
    critique: false,
    piecesAffectees: "Buses de coupe",
    infos: "Laser secondaire Bystronic du Bâtiment 1.",
    parentId: "BAT1-LASERS"
  },
  {
    id: "BAT-2",
    nom: "Bat.2",
    atelier: "Laseris",
    metier: "MULTI-TECHNIQUES",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "Laseris",
    type: "Bâtiment 2",
    serie: "BAT2",
    annee: 2021,
    garantie: "2030-12-31",
    prix: 0,
    critique: false,
    piecesAffectees: "",
    infos: "Bâtiment de production N°2 - Laseris.",
    parentId: "LASERIS"
  },
  {
    id: "BAT2-PONTS",
    nom: "Ponts",
    atelier: "Laseris",
    metier: "Mécanique",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "Laseris",
    type: "Section Ponts",
    serie: "BAT2-P",
    annee: 2021,
    garantie: "2030-12-31",
    prix: 0,
    critique: true,
    piecesAffectees: "",
    infos: "Ponts roulants du Bâtiment 2.",
    parentId: "BAT-2"
  },
  {
    id: "PONT-123456",
    nom: "Pont N° 123456",
    atelier: "Laseris",
    metier: "Mécanique",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "Konecranes",
    type: "Pont Monorail",
    serie: "SN-123456",
    annee: 2019,
    garantie: "2026-12-31",
    prix: 38000,
    critique: false,
    piecesAffectees: "Galets de roulement",
    infos: "Pont roulant de manutention moyenne du Bâtiment 2.",
    parentId: "BAT2-PONTS"
  },
  {
    id: "BAT2-LASERS",
    nom: "Lasers",
    atelier: "Laseris",
    metier: "Automatisme",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "Laseris",
    type: "Section Lasers",
    serie: "BAT2-L",
    annee: 2021,
    garantie: "2030-12-31",
    prix: 0,
    critique: true,
    piecesAffectees: "",
    infos: "Machines de découpe laser du Bâtiment 2.",
    parentId: "BAT-2"
  },
  {
    id: "7000-01",
    nom: "7000-01",
    atelier: "Laseris",
    metier: "Automatisme",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "Trumpf",
    type: "Laser fibre haute puissance",
    serie: "SN-T7000-01",
    annee: 2023,
    garantie: "2026-06-30",
    prix: 450000,
    critique: true,
    piecesAffectees: "Optique de focalisation, miroir",
    infos: "Laser fibre Trumpf TruLaser 7000 de dernière génération.",
    parentId: "BAT2-LASERS"
  },
  {
    id: "7000-01-LM",
    nom: "Loadmaster",
    atelier: "Laseris",
    metier: "Automatisme",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "Trumpf",
    type: "Système de chargement de tôles",
    serie: "SN-LM7000",
    annee: 2023,
    garantie: "2026-06-30",
    prix: 85000,
    critique: true,
    piecesAffectees: "Ventouses",
    infos: "Robot d'alimentation automatique pour le laser 7000-01.",
    parentId: "7000-01"
  },
  {
    id: "ADB",
    nom: "ADB",
    atelier: "ADB",
    metier: "MULTI-TECHNIQUES",
    statut: "Opérationnel",
    tempsOuverture: 4800,
    marque: "ADB",
    type: "Division",
    serie: "ADB-001",
    annee: 2021,
    garantie: "2028-12-31",
    prix: 0,
    critique: false,
    piecesAffectees: "",
    infos: "Division ADB du Groupe Clisson.",
    parentId: "CLISSON"
  }
];

export const INITIAL_PIECES: Piece[] = [
  {
    id: "PC-001",
    codeArticle: "ROU-6204-SKF",
    designation: "Roulement à billes SKF 6204-2RSH",
    famille: "Mécanique",
    sousFamille: "Roulements",
    marque: "SKF",
    reference: "6204-2RSH",
    fournisseur: "SND Distri",
    refFournisseur: "SKF-6204-CAT",
    emplacement: "Rayon A - Étagère 2",
    quantite: 14,
    seuil: 5,
    prix: 12.50,
    codeBarre: "ROU-6204-SKF",
    equipementsLies: ["Ligne d'Usinage Numérique CNC-5"]
  },
  {
    id: "PC-002",
    codeArticle: "FIL-HYD-REX",
    designation: "Filtre à Huile Hydraulique 10 microns Rexroth",
    famille: "Hydraulique",
    sousFamille: "Filtres",
    marque: "Bosch Rexroth",
    reference: "R928006647",
    fournisseur: "Direct-H hydraulique",
    refFournisseur: "FIL-CONSTR-99",
    emplacement: "Rayon B - Bac 3",
    quantite: 4,
    seuil: 2,
    prix: 74.50,
    codeBarre: "FLT-REX-44",
    equipementsLies: ["GMAO PRO - Ligne 1", "Vidange et Graissage Annuel"]
  },
  {
    id: "p3",
    codeArticle: "CON-TEL-24V",
    designation: "Contacteur Tripolaire 24V DC LC1D09",
    famille: "Électrique",
    sousFamille: "Contacteurs",
    marque: "Schneider Electric",
    reference: "LC1D09BD",
    fournisseur: "Rexel Solutions",
    refFournisseur: "RX-LC1D09",
    emplacement: "Armoire Élec - Box 1",
    quantite: 8,
    seuil: 3,
    prix: 42.00,
    codeBarre: "LC1D09BD",
    equipementsLies: ["Ensacheuse Verticale Automatique EV5", "Presse Hydraulique Injection H300"]
  }
];

export const INITIAL_FOURNISSEURS: Fournisseur[] = [
  {
    id: "F-001",
    nom: "SND Distri",
    type: "Fournisseur",
    metier: "Transmission mécanique & Outillage",
    web: "www.snd-distribution.fr",
    telfax: "04.72.11.22.33",
    adresse: "12 Avenue de l'Industrie",
    cpville: "69000 Lyon",
    pays: "France",
    c1_nom: "Marc Gauthier",
    c1_fonc: "Technico-commercial",
    c1_tel: "06.12.34.56.78",
    c1_email: "m.gauthier@snd.fr",
    c2_nom: "Julie Bernard",
    c2_fonc: "Logistique & Expédition",
    c2_tel: "04.72.11.22.34",
    c2_email: "j.bernard@snd.fr",
    paiement: "30 jours fin de mois",
    livraison: "Franco de port > 150€ HT",
    tva: "20",
    devise: "€",
    obs: "Excellent fournisseur, très réactif pour les roulements et courroies standards.",
    obsCmd: "Veuillez joindre notre numéro de commande interne sur le bon de livraison."
  },
  {
    id: "F-002",
    nom: "Direct-H hydraulique",
    type: "Fournisseur",
    metier: "Composants hydrauliques & filtration",
    web: "www.direct-hydraulique.com",
    telfax: "03.20.99.88.77",
    adresse: "Zone Industrielle Nord, Rue des Vérins",
    cpville: "59000 Lille",
    pays: "France",
    c1_nom: "Alain Prost",
    c1_fonc: "Responsable Grands Comptes",
    c1_tel: "06.88.99.00.11",
    c1_email: "a.prost@direct-h.fr",
    c2_nom: "",
    c2_fonc: "",
    c2_tel: "",
    c2_email: "",
    paiement: "Virement à la commande",
    livraison: "Ex-Works (Départ d'usine)",
    tva: "20",
    devise: "€",
    obs: "Spécialiste de la filtration hydraulique haute pression Bosch Rexroth.",
    obsCmd: ""
  },
  {
    id: "F-003",
    nom: "FIP Maintenance Services",
    type: "Sous-traitant",
    metier: "Intervention sur presses d'injection",
    web: "www.fip-maintenances.fr",
    telfax: "01.44.55.66.77",
    adresse: "75 Boulevard Haussmann",
    cpville: "75008 Paris",
    pays: "France",
    c1_nom: "Stéphane Joly",
    c1_fonc: "Planificateur Interventions",
    c1_tel: "06.44.33.22.11",
    c1_email: "s.joly@fip-maintenance.fr",
    c2_nom: "",
    c2_fonc: "",
    c2_tel: "",
    c2_email: "",
    paiement: "45 jours fin de mois",
    livraison: "Sur site",
    tva: "20",
    devise: "€",
    obs: "Contrat de maintenance annuel actif pour l'assistance technique lourde sur presses d'injection.",
    obsCmd: "Appeler avant intervention pour accord de sécurité.",
    coutMO: 85,
    coutDeplacement: 120,
    catalogueServices: "Maintenance préventive constructeur, Réalignement de colonnes, Réparation vis de plastification",
    contratActif: true
  }
];

export const INITIAL_GAMMES: GammePreventive[] = [
  {
    id: "G-001",
    equipementId: "7000-01-LM",
    equipementNom: "Loadmaster (7000-01)",
    titre: "Contrôle des Ventouses et Vérins",
    typeDeclencheur: "Mois",
    valeurDeclencheur: 6,
    moPrevue: 2.5,
    checklist: [
      "Vérifier la consignation pneumatique et électrique du robot de chargement",
      "Contrôler l'état d'usure des ventouses de préhension",
      "Tester le jeu mécanique sur les bras télescopiques",
      "Nettoyer les filtres de dépression et mesurer le niveau de vide",
      "Faire un essai de cycle à vide et s'assurer de l'absence d'alertes"
    ],
    dateReference: "2026-01-10",
    valeurCompteurReference: 0,
    competencesRequises: ["Consignation Hydraulique", "Habilitation Électrique BR/BC"]
  },
  {
    id: "G-002",
    equipementId: "7000-01",
    equipementNom: "7000-01",
    titre: "Calibration de l'Optique Laser et Nettoyage",
    typeDeclencheur: "Jours",
    valeurDeclencheur: 90,
    moPrevue: 3,
    checklist: [
      "Nettoyer les poussières et résidus de découpe sur l'axe de la tête",
      "Vérifier l'état de la lentille de focalisation et de la buse",
      "Effectuer une calibration du capteur de hauteur de coupe",
      "Contrôler le bon fonctionnement du refroidisseur de la source laser",
      "Réaliser une découpe de test standard et valider la précision"
    ],
    dateReference: "2026-04-15",
    valeurCompteurReference: 0,
    competencesRequises: ["Mécanique Précision", "Diagnostic Vibratoire"]
  }
];

export const INITIAL_COMPTEURS: Compteur[] = [
  {
    id: "CP-001",
    equipementId: "MACH01",
    equipementNom: "Mach01",
    valeur: 8420,
    unite: "Heures",
    dateReleve: "2026-06-10T14:30:00.000Z"
  },
  {
    id: "CP-002",
    equipementId: "7000-01",
    equipementNom: "7000-01",
    valeur: 11250,
    unite: "Heures",
    dateReleve: "2026-06-20T10:00:00.000Z"
  }
];

export const INITIAL_COMMANDES: Commande[] = [
  {
    id: "CMD-001",
    numero: "CMD-2026-X8Y1",
    fournisseurId: "F-001",
    fournisseurNom: "SND Distri",
    atelier: "Atelier Usinage",
    demandeur: "Jean Dupont (Admin)",
    montant: 187.50,
    description: "Commande de 15 roulements SKF 6204 pour stock de sécurité.",
    dateCreation: "2026-06-15T09:00:00.000Z",
    statut: "En attente"
  }
];

export const INITIAL_UTILISATEURS: Utilisateur[] = [
  {
    id: "U-001",
    prenom: "Jean",
    nom: "Dupont",
    email: "admin@gmaopro.com",
    role: "Administrateur",
    droits: { equipements: 4, interventions: 4, stock: 4, planning: 4, achats: 4, reporting: 4, parametres: 4 }
  },
  {
    id: "U-002",
    prenom: "Pierre",
    nom: "Martin",
    email: "tech1@gmaopro.com",
    role: "Technicien",
    droits: { equipements: 2, interventions: 3, stock: 3, planning: 2, achats: 1, reporting: 2, parametres: 0 }
  },
  {
    id: "U-003",
    prenom: "Sylvie",
    nom: "Roche",
    email: "magasin@gmaopro.com",
    role: "Magasinier",
    droits: { equipements: 1, interventions: 2, stock: 4, planning: 1, achats: 3, reporting: 1, parametres: 0 }
  }
];

export const INITIAL_DOCUMENTS: DocumentGed[] = [
  {
    id: "DOC-001",
    equipementId: "7000-01",
    equipementNom: "7000-01",
    nom: "Manuel Technique TruLaser 7000-01",
    type: "Manuel Technique",
    fichierNom: "trulaser_7000_manual_FR.pdf",
    fichierTaille: "14.2 Mo",
    dateAjout: "2026-06-15T10:00:00.000Z",
    auteur: "Trumpf Support",
    description: "Manuel complet de maintenance, schémas électriques de la tête de découpe et spécifications de l'optique laser.",
    url: "https://www.trumpf.com/documents/trulaser_7000_manual_FR.pdf"
  },
  {
    id: "DOC-002",
    equipementId: "MACH01",
    equipementNom: "Mach01",
    nom: "Schéma Optique et Alignement",
    type: "Plan PDF",
    fichierNom: "mach01_optique_plan.pdf",
    fichierTaille: "4.8 Mo",
    dateAjout: "2026-06-20T14:30:00.000Z",
    auteur: "Trumpf Service",
    description: "Plan d'alignement du faisceau laser et circuits de refroidissement par eau pour Mach01.",
    url: "https://www.trumpf.com/documents/mach01_optique_plan.pdf"
  },
  {
    id: "DOC-003",
    equipementId: "7000-01-LM",
    equipementNom: "Loadmaster (7000-01)",
    nom: "Schéma Pneumatique Loadmaster 7000-01",
    type: "Autre",
    fichierNom: "loadmaster_7000_pneumatic_v3.pdf",
    fichierTaille: "3.1 Mo",
    dateAjout: "2026-06-25T09:15:00.000Z",
    auteur: "Automation Services",
    description: "Schéma pneumatique complet du robot de chargement de tôles pour le laser 7000-01.",
    url: "https://www.trumpf.com/documents/loadmaster_7000_pneumatic_v3.pdf"
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "LOG-001",
    timestamp: "2026-06-29T14:20:00.000Z",
    utilisateur: "Jean Dupont (Administrateur)",
    action: "Modification Configuration",
    details: "Mise à jour du taux horaire de main d'œuvre de 60€ à 65€/h.",
    criticite: "moyenne",
    ipAdresse: "192.168.1.50"
  },
  {
    id: "LOG-002",
    timestamp: "2026-06-29T10:15:30.000Z",
    utilisateur: "Jean Dupont (Administrateur)",
    action: "Export de Données",
    details: "Téléchargement d'un export de sauvegarde complet de la base de données (Format JSON).",
    criticite: "faible",
    ipAdresse: "192.168.1.50"
  },
  {
    id: "LOG-003",
    timestamp: "2026-06-28T16:45:10.000Z",
    utilisateur: "Sylvie Roche (Magasinier)",
    action: "Ajustement Stock Sensible",
    details: "Ajustement manuel de l'inventaire pour la pièce PC-A12 (Cartouche filtrante KAESER) : +5 unités ajoutées.",
    criticite: "moyenne",
    ipAdresse: "192.168.1.88"
  },
  {
    id: "LOG-004",
    timestamp: "2026-06-28T11:05:00.000Z",
    utilisateur: "Pierre Martin (Technicien)",
    action: "Clôture Bon de Travail",
    details: "Clôture et signature électronique de l'intervention critique BT-26-0012 (Panne compresseur principal).",
    criticite: "faible",
    ipAdresse: "192.168.1.75"
  },
  {
    id: "LOG-005",
    timestamp: "2026-06-27T09:30:15.000Z",
    utilisateur: "Jean Dupont (Administrateur)",
    action: "Création Équipement",
    details: "Ajout d'une nouvelle machine critique au parc : Presse à Injecter 350T (ID: EQ-M15).",
    criticite: "moyenne",
    ipAdresse: "192.168.1.50"
  },
  {
    id: "LOG-006",
    timestamp: "2026-06-25T14:10:22.000Z",
    utilisateur: "Jean Dupont (Administrateur)",
    action: "Suppression Équipement",
    details: "Suppression définitive de la machine réformée : Tour Parallèle Cazeneuve (ID: EQ-M4).",
    criticite: "eleve",
    ipAdresse: "192.168.1.50"
  }
];

// GENERATE DETAILED PAST CLOSED INTERVENTIONS TO POWER CHARTS (12 MONTHS HISTORIC)
export const generateHistoricalInterventions = (): Intervention[] => {
  const result: Intervention[] = [];
  const startYear = 2025;
  const startMonth = 5; // June 2025

  const eqNames = ["Mach01", "7000-01", "Pont N° 987654"];
  const operators = ["Pierre Martin (Tech)", "Luc Leblanc (Tech)", "Amine Ben (Tech)"];
  const causes = ["Usure normale", "Mauvaise lubrification", "Fatigue matière", "Surtension réseau", "Erreur opérateur"];
  const remedes = ["Pièce remplacée", "Réglage/Alignement", "Lubrification refaite", "Recâblage", "Mise à jour firmware"];

  // Seed some 40 closed past jobs
  for (let i = 0; i < 40; i++) {
    const monthOffset = Math.floor(i / 3.5);
    const eventDate = new Date(startYear, startMonth + monthOffset, 5 + (i * 2 % 22));
    if (eventDate > new Date()) continue; // don't write future events

    const isPrev = i % 4 === 0;
    const isCritical = i % 5 === 0 && !isPrev;
    const eq = i % 3;
    const tech = i % 3;
    const cause = causes[i % causes.length];
    const remede = remedes[i % remedes.length];
    const tps = 1 + (i % 4) * 0.5 + (isCritical ? 1.5 : 0);

    const intDateStr = eventDate.toISOString();

    const item: Intervention = {
      id: `BT-HIST-${i}`,
      typeDoc: isPrev ? 'Préventif' : 'BT',
      numero: isPrev ? `PREV-${2025 + Math.floor(i / 10)}-${1000 + i}` : `BT-${2025 + Math.floor(i / 10)}-${1000 + i}`,
      equipementId: eq === 0 ? "MACH01" : eq === 1 ? "7000-01" : "PONT-987654",
      equipementNom: eqNames[eq],
      atelier: eq === 0 ? "Laseris" : eq === 1 ? "Laseris" : "Laseris",
      urgence: isCritical ? "Critique (Arrêt Machine)" : (isPrev ? "Semaine" : "Moyenne (48h)"),
      typeProbleme: isPrev ? "Maintenance Planifiée" : "Alerte capteur / anomalie bruit",
      demandeur: "Opérateur Ligne " + (1 + (i % 4)),
      description: isPrev ? "Gamme périodique préventive systématique" : "Bruit inhabituel sur l'axe principal pendant le cycle",
      statut: "Soldé",
      dateCreation: intDateStr,
      dateCloture: intDateStr,
      compteRendu: `${remede} suite à constatation d'une défaillance causée par : ${cause}. Essais OK.`,
      tempsPasse: `${tps} H`,
      piecesConso: i % 2 === 0 ? "Roulement à billes SKF 6204 x1" : "Aucune",
      technicienCloture: operators[tech],
      signatureTechnicien: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAK8AAABkCAYAAAA...",
      source: "Rapport Historique"
    };
    result.push(item);
  }

  // Add 3 live active interventions (DI or BT in progress)
  result.push({
    id: "BT-LIVE-001",
    typeDoc: 'DI',
    numero: "",
    equipementId: "MACH01",
    equipementNom: "Mach01",
    atelier: "Laseris",
    urgence: "Critique (Arrêt Machine)",
    typeProbleme: "Fuite de fluide",
    demandeur: "Sylvain Lopez",
    description: "Fuite importante sous le réservoir de fluide. Machine à l'arrêt immédiat.",
    statut: "En attente",
    dateCreation: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    source: "Borne_Atelier"
  });

  result.push({
    id: "BT-LIVE-002",
    typeDoc: 'BT',
    numero: `BT-${new Date().getFullYear()}-H09B`,
    equipementId: "7000-01",
    equipementNom: "7000-01",
    atelier: "Laseris",
    urgence: "Moyenne (48h)",
    typeProbleme: "Défaut d'alignement",
    demandeur: "Antoine Dufour",
    description: "Micro-vibrations détectées sur la tête de découpe principale lors d'opérations laser.",
    statut: "En cours",
    dateCreation: new Date(Date.now() - 12 * 3600000).toISOString(), // 12 hours ago
    source: "Bureau Web UI"
  });

  return result;
};

// HELPER PERSISTENCE FUNCTIONS
export const getFromLS = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  if (!data) return defaultValue;
  try {
    return JSON.parse(data) as T;
  } catch (e) {
    return defaultValue;
  }
};

export const saveToLS = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// LOAD OR GENERATE ALL DATA
export interface GMAODatabase {
  settings: GlobalSettings;
  equipements: Equipement[];
  interventions: Intervention[];
  pieces: Piece[];
  mouvements: MouvementStock[];
  gammes: GammePreventive[];
  compteurs: Compteur[];
  suppliers: Fournisseur[];
  commandes: Commande[];
  auditLogs: AuditLog[];
  documents: DocumentGed[];
  budgets: Budget[];
  utilisateurs: Utilisateur[];
}

export const loadDatabase = (): GMAODatabase => {
  let interventions = getFromLS<Intervention[]>(KEYS.INTERVENTIONS, []);
  if (interventions.length === 0) {
    interventions = generateHistoricalInterventions();
    saveToLS(KEYS.INTERVENTIONS, interventions);
  }

  const db: GMAODatabase = {
    settings: getFromLS<GlobalSettings>(KEYS.SETTINGS, INITIAL_SETTINGS),
    equipements: getFromLS<Equipement[]>(KEYS.EQUIPEMENTS, INITIAL_EQUIPEMENTS),
    interventions,
    pieces: getFromLS<Piece[]>(KEYS.PIECES, INITIAL_PIECES),
    mouvements: getFromLS<MouvementStock[]>(KEYS.MOUVEMENTS, []),
    gammes: getFromLS<GammePreventive[]>(KEYS.GAMMES, INITIAL_GAMMES),
    compteurs: getFromLS<Compteur[]>(KEYS.COMPTEURS, INITIAL_COMPTEURS),
    suppliers: getFromLS<Fournisseur[]>(KEYS.FOURNISSEURS, INITIAL_FOURNISSEURS),
    commandes: getFromLS<Commande[]>(KEYS.COMMANDES, INITIAL_COMMANDES),
    auditLogs: getFromLS<AuditLog[]>(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS),
    documents: getFromLS<DocumentGed[]>(KEYS.DOCUMENTS, INITIAL_DOCUMENTS),
    budgets: getFromLS<Budget[]>(KEYS.BUDGETS, INITIAL_BUDGETS),
    utilisateurs: getFromLS<Utilisateur[]>(KEYS.UTILISATEURS, INITIAL_UTILISATEURS)
  };

  if (!localStorage.getItem(KEYS.SETTINGS)) saveToLS(KEYS.SETTINGS, db.settings);
  if (!localStorage.getItem(KEYS.EQUIPEMENTS)) saveToLS(KEYS.EQUIPEMENTS, db.equipements);
  if (!localStorage.getItem(KEYS.PIECES)) saveToLS(KEYS.PIECES, db.pieces);
  if (!localStorage.getItem(KEYS.FOURNISSEURS)) saveToLS(KEYS.FOURNISSEURS, db.suppliers);
  if (!localStorage.getItem(KEYS.GAMMES)) saveToLS(KEYS.GAMMES, db.gammes);
  if (!localStorage.getItem(KEYS.COMPTEURS)) saveToLS(KEYS.COMPTEURS, db.compteurs);
  if (!localStorage.getItem(KEYS.COMMANDES)) saveToLS(KEYS.COMMANDES, db.commandes);
  if (!localStorage.getItem(KEYS.AUDIT_LOGS)) saveToLS(KEYS.AUDIT_LOGS, db.auditLogs);
  if (!localStorage.getItem(KEYS.DOCUMENTS)) saveToLS(KEYS.DOCUMENTS, db.documents);
  if (!localStorage.getItem(KEYS.BUDGETS)) saveToLS(KEYS.BUDGETS, db.budgets);
  if (!localStorage.getItem(KEYS.UTILISATEURS)) saveToLS(KEYS.UTILISATEURS, db.utilisateurs);

  return db;
};

export const saveDatabase = (db: GMAODatabase): void => {
  saveToLS(KEYS.SETTINGS, db.settings);
  saveToLS(KEYS.EQUIPEMENTS, db.equipements);
  saveToLS(KEYS.INTERVENTIONS, db.interventions);
  saveToLS(KEYS.PIECES, db.pieces);
  saveToLS(KEYS.MOUVEMENTS, db.mouvements);
  saveToLS(KEYS.GAMMES, db.gammes);
  saveToLS(KEYS.COMPTEURS, db.compteurs);
  saveToLS(KEYS.FOURNISSEURS, db.suppliers);
  saveToLS(KEYS.COMMANDES, db.commandes);
  saveToLS(KEYS.AUDIT_LOGS, db.auditLogs);
  saveToLS(KEYS.DOCUMENTS, db.documents);
  saveToLS(KEYS.BUDGETS, db.budgets);
  saveToLS(KEYS.UTILISATEURS, db.utilisateurs);
};

export const resetDatabase = (): void => {
  localStorage.clear();
};

export const syncOfflineQueue = (): void => {
  saveToLS(KEYS.OFFLINE_QUEUE, []);
};

// OFFLINE QUEUE MANAGER
export interface OfflineOp {
  id: string;
  type: 'RAPPORT' | 'VALIDATION_DI' | 'BT_SPONTANE';
  payload: any;
  timestamp: string;
}

export const getOfflineQueue = (): OfflineOp[] => {
  return getFromLS<OfflineOp[]>(KEYS.OFFLINE_QUEUE, []);
};

export const addToOfflineQueue = (type: OfflineOp['type'], payload: any) => {
  const queue = getOfflineQueue();
  const op: OfflineOp = {
    id: `OP-${Date.now()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`,
    type,
    payload,
    timestamp: new Date().toISOString()
  };
  queue.push(op);
  saveToLS(KEYS.OFFLINE_QUEUE, queue);
};

export const clearOfflineQueue = () => {
  saveToLS(KEYS.OFFLINE_QUEUE, []);
};

export { KEYS };
