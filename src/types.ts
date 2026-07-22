/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Equipement {
  id: string;
  nom: string;
  atelier: string;
  metier: string;
  statut: 'Opérationnel' | 'HS' | 'En Maintenance';
  tempsOuverture: number;
  marque: string;
  type: string;
  serie: string;
  annee: number;
  garantie: string;
  prix: number;
  critique: boolean;
  piecesAffectees: string;
  infos: string;
  parentId: string | null;
  photoUrl?: string;
  posX?: number;
  posY?: number;
  copiedWarning?: boolean;
  copiedFromParentName?: string;
  ordre?: number;
  favoris?: boolean;
}

export interface Intervention {
  id: string;
  typeDoc: 'DI' | 'BT' | 'Préventif';
  numero: string;
  equipementId: string;
  equipementNom: string;
  atelier: string;
  urgence: string;
  typeProbleme: string;
  demandeur: string;
  description: string;
  statut: 'En attente' | 'En cours' | 'En attente de pièce' | 'Soldé' | 'Clôturé' | 'Brouillon' | 'En attente de validation' | 'Terminé';
  dateCreation: string;
  dateCloture?: string;
  datePrevue?: string;
  compteRendu?: string;
  tempsPasse?: string; // e.g. "2.5 H"
  tempsArret?: string; // e.g. "1.5 H"
  piecesConso?: string;
  technicienCloture?: string;
  signatureTechnicien?: string;
  photoUrl?: string;
  codeDefaut?: string;
  gammeId?: string;
  source?: string;
  activite?: string;
  technologie?: string;
  cause?: string;
  remede?: string;
  operateur?: string;
  imputation?: string;
  effet?: string;
}

export interface Piece {
  id: string;
  codeArticle: string;
  designation: string;
  famille: string;
  sousFamille: string;
  marque: string;
  reference: string;
  fournisseur: string;
  refFournisseur: string;
  emplacement: string;
  quantite: number;
  seuil: number;
  prix: number;
  codeBarre: string;
  equipementsLies: string[];
  photoUrl?: string;
}

export interface MouvementStock {
  id: string;
  pieceId: string;
  pieceNom: string;
  type: 'Entrée' | 'Sortie';
  dateStr: string;
  quantite: number;
  intervenant: string;
  prixUnitaire?: number;
  magasin?: string;
  destinationType?: string;
  destinationNom?: string;
  commentaires: string;
  dateCreation: string;
}

export interface GammePreventive {
  id: string;
  equipementId: string;
  equipementNom: string;
  titre: string;
  typeDeclencheur: 'Jours' | 'Mois' | 'Compteur';
  valeurDeclencheur: number;
  moPrevue: number;
  checklist: string[];
  dateReference: string;
  valeurCompteurReference: number;
  alerteActive?: boolean;
  typeAlerte?: 'email' | 'push' | 'both' | 'sms' | 'all';
  delaiAlerteHeures?: number;
  destinataireAlerte?: string;
  competencesRequises?: string[];
  notifierSiPasDeBt?: boolean;
  toleranceJoursPasDeBt?: number;
}

export interface Compteur {
  id: string;
  equipementId: string;
  equipementNom: string;
  valeur: number;
  unite: string;
  dateReleve: string;
}

export interface Fournisseur {
  id: string;
  nom: string;
  type: 'Fournisseur' | 'Sous-traitant';
  metier: string;
  web: string;
  telfax: string;
  adresse: string;
  cpville: string;
  pays: string;
  c1_nom: string;
  c1_fonc: string;
  c1_tel: string;
  c1_email: string;
  c2_nom: string;
  c2_fonc: string;
  c2_tel: string;
  c2_email: string;
  paiement: string;
  livraison: string;
  tva: string;
  devise: string;
  obs: string;
  obsCmd: string;
  logoUrl?: string;
  coutMO?: number;
  coutDeplacement?: number;
  catalogueServices?: string;
  contratActif?: boolean;
  contratPdfUrl?: string;
}

export interface Commande {
  id: string;
  numero: string;
  fournisseurId: string;
  fournisseurNom: string;
  atelier: string;
  demandeur: string;
  montant: number;
  description: string;
  dateCreation: string;
  statut: string;
  origine?: string;
  pieceId?: string;
  pieceRef?: string;
  quantiteCmd?: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  utilisateur: string;
  action: string;
  details: string;
  criticite: 'faible' | 'moyenne' | 'eleve';
  ipAdresse: string;
}

export interface Utilisateur {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  role: string;
  droits: {
    equipements: number;
    interventions: number;
    stock: number;
    planning: number;
    achats: number;
    reporting: number;
    parametres: number;
  };
}

export interface NotificationPreference {
  enabled: boolean;
  startHour: string; // "08:00"
  endHour: string;   // "18:00"
  days: string[];    // ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]
  receiveCriticalOnly: boolean;
}

export interface GlobalSettings {
  nomEntreprise: string;
  coutMO: number;
  devise: string;
  themeMode?: 'light' | 'dark' | 'adaptive';
  taillePolice?: 'sm' | 'md' | 'lg';
  themeContraste?: 'normal' | 'eleve';
  competencesList?: string[];
  competencesTechniciens?: Record<string, string[]>;
  notificationPreferences?: Record<string, NotificationPreference>;
  listes: {
    ateliers: string[];
    metiers: string[];
    marques: string[];
    categories: Record<string, string[]>;
    etats: string[];
    urgences: string[];
    effets: string[];
    activites: string[];
    technologies: string[];
    causes: string[];
    remedes: string[];
    imputations: string[];
    operateurs: string[];
  };
  shortcuts?: Record<string, string>;
  autoPurgeAuditLogs?: {
    enabled: boolean;
    retentionMonths: number;
  };
}

export interface Objectifs {
  budgetMax: number;
  dispoCible: number;
  txPrevCible: number;
  maxArrets: number;
}

export interface Commentaire {
  id: string;
  texte: string;
  auteur: string;
  timestamp: string;
}

export interface DocumentGed {
  id: string;
  equipementId: string;
  equipementNom: string;
  nom: string;
  type: 'Manuel Technique' | 'Plan PDF' | 'Schéma Électrique' | 'Autre';
  fichierNom: string;
  fichierTaille: string;
  dateAjout: string;
  auteur: string;
  url?: string;
  description?: string;
}

export interface Budget {
  id: string;
  annee: number;
  atelier: string;
  enveloppe: number;
  description?: string;
}

