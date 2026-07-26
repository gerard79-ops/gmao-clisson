/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PermissionRole = 'Administrateur' | "Chef d'Équipe" | 'Technicien' | 'Magasinier' | 'Opérateur';

export const PERMISSION_ROLES: PermissionRole[] = [
  'Administrateur',
  "Chef d'Équipe",
  'Technicien',
  'Magasinier',
  'Opérateur'
];

export interface PermissionAction {
  key: string;
  label: string;
}

export interface PermissionModuleConfig {
  module: string;
  moduleLabel: string;
  actions: PermissionAction[];
}

// { [module]: { [action]: [roles autorisés] } }
export type PermissionsMatrix = {
  [moduleKey: string]: {
    [actionKey: string]: PermissionRole[];
  };
};

export const PERMISSIONS_CONFIG: PermissionModuleConfig[] = [
  {
    module: 'equipements',
    moduleLabel: 'Équipements',
    actions: [
      { key: 'voir', label: 'Voir la liste et les fiches' },
      { key: 'creer', label: 'Créer un équipement' },
      { key: 'modifier', label: 'Modifier un équipement' },
      { key: 'deplacer', label: "Déplacer dans l'arborescence" },
      { key: 'supprimer', label: 'Supprimer un équipement' },
      { key: 'interventionRapide', label: 'Créer une intervention rapide' },
      { key: 'releveCompteur', label: 'Saisir un relevé de compteur' }
    ]
  },
  {
    module: 'interventions',
    moduleLabel: 'Interventions',
    actions: [
      { key: 'voir', label: 'Voir les bons de travail' },
      { key: 'creer', label: 'Créer un bon spontané' },
      { key: 'traiter', label: 'Traiter / renseigner un bon' },
      { key: 'approuver', label: "Approuver une demande d'intervention" },
      { key: 'reouvrir', label: 'Réouvrir un bon clôturé' },
      { key: 'commenter', label: 'Commenter' }
    ]
  },
  {
    module: 'magasin',
    moduleLabel: 'Magasin / Stock',
    actions: [
      { key: 'voir', label: 'Voir les stocks' },
      { key: 'creerModifierPiece', label: 'Créer / modifier une pièce' },
      { key: 'entree', label: 'Saisir une entrée' },
      { key: 'sortie', label: 'Saisir une sortie' },
      { key: 'inventaire', label: 'Faire un inventaire tournant' },
      { key: 'supprimer', label: 'Supprimer une pièce' },
      { key: 'exporter', label: 'Exporter un rapport' }
    ]
  },
  {
    module: 'planning',
    moduleLabel: 'Planning préventif',
    actions: [
      { key: 'voir', label: 'Voir le planning' },
      { key: 'creerModifierGamme', label: 'Créer / modifier une gamme' },
      { key: 'supprimerGamme', label: 'Supprimer une gamme' },
      { key: 'releveCompteur', label: 'Saisir un relevé de compteur' },
      { key: 'replanifier', label: 'Replanifier (glisser-déposer)' }
    ]
  },
  {
    module: 'achats',
    moduleLabel: 'Achats',
    actions: [
      { key: 'voir', label: 'Voir commandes / devis' },
      { key: 'creerCommande', label: 'Créer une commande' },
      { key: 'creerModifierFournisseur', label: 'Créer / modifier un fournisseur' },
      { key: 'supprimerFournisseur', label: 'Supprimer un fournisseur' },
      { key: 'creerModifierBudget', label: 'Créer / modifier un budget' },
      { key: 'supprimerBudget', label: 'Supprimer un budget' },
      { key: 'importerCSV', label: 'Importer un CSV' },
      { key: 'exporter', label: 'Exporter les données' }
    ]
  },
  {
    module: 'reporting',
    moduleLabel: 'Reporting',
    actions: [
      { key: 'voir', label: 'Voir les tableaux de bord' },
      { key: 'exporter', label: 'Exporter (PDF / CSV)' },
      { key: 'auditRapport', label: "Générer un rapport d'audit" },
      { key: 'creerDepuisAnalyse', label: 'Créer un bon depuis une analyse' },
      { key: 'programmerEnvoi', label: 'Programmer un envoi automatique' }
    ]
  },
  {
    module: 'parametres',
    moduleLabel: 'Paramètres / Réglages',
    actions: [
      { key: 'voir', label: 'Voir les réglages' },
      { key: 'raccourcis', label: 'Modifier les raccourcis clavier' },
      { key: 'competences', label: 'Gérer les compétences techniques' },
      { key: 'importExport', label: 'Importer / exporter les données globales' },
      { key: 'purger', label: 'Purger des données' },
      { key: 'exportSecurite', label: 'Exporter les rapports de sécurité' }
    ]
  }
];

// Matrice par défaut : Administrateur et Chef d'Équipe ont accès à tout
// (identiques pour l'instant, ajustable plus tard). Les autres rôles ont
// un accès de départ raisonnable, entièrement modifiable ensuite depuis
// Administration > Matrice des habilitations.
export const buildDefaultPermissionsMatrix = (): PermissionsMatrix => {
  const matrix: PermissionsMatrix = {};

  const defaultsByModuleAction: Record<string, Record<string, PermissionRole[]>> = {
    equipements: {
      voir: ['Administrateur', "Chef d'Équipe", 'Technicien', 'Magasinier', 'Opérateur'],
      creer: ['Administrateur', "Chef d'Équipe", 'Technicien'],
      modifier: ['Administrateur', "Chef d'Équipe", 'Technicien'],
      deplacer: ['Administrateur', "Chef d'Équipe"],
      supprimer: ['Administrateur', "Chef d'Équipe"],
      interventionRapide: ['Administrateur', "Chef d'Équipe", 'Technicien'],
      releveCompteur: ['Administrateur', "Chef d'Équipe", 'Technicien', 'Opérateur']
    },
    interventions: {
      voir: ['Administrateur', "Chef d'Équipe", 'Technicien', 'Magasinier', 'Opérateur'],
      creer: ['Administrateur', "Chef d'Équipe", 'Technicien', 'Opérateur'],
      traiter: ['Administrateur', "Chef d'Équipe", 'Technicien'],
      approuver: ['Administrateur', "Chef d'Équipe"],
      reouvrir: ['Administrateur', "Chef d'Équipe"],
      commenter: ['Administrateur', "Chef d'Équipe", 'Technicien', 'Magasinier', 'Opérateur']
    },
    magasin: {
      voir: ['Administrateur', "Chef d'Équipe", 'Technicien', 'Magasinier'],
      creerModifierPiece: ['Administrateur', "Chef d'Équipe", 'Magasinier'],
      entree: ['Administrateur', "Chef d'Équipe", 'Magasinier'],
      sortie: ['Administrateur', "Chef d'Équipe", 'Technicien', 'Magasinier'],
      inventaire: ['Administrateur', "Chef d'Équipe", 'Magasinier'],
      supprimer: ['Administrateur', "Chef d'Équipe"],
      exporter: ['Administrateur', "Chef d'Équipe", 'Magasinier']
    },
    planning: {
      voir: ['Administrateur', "Chef d'Équipe", 'Technicien'],
      creerModifierGamme: ['Administrateur', "Chef d'Équipe"],
      supprimerGamme: ['Administrateur', "Chef d'Équipe"],
      releveCompteur: ['Administrateur', "Chef d'Équipe", 'Technicien'],
      replanifier: ['Administrateur', "Chef d'Équipe"]
    },
    achats: {
      voir: ['Administrateur', "Chef d'Équipe"],
      creerCommande: ['Administrateur', "Chef d'Équipe"],
      creerModifierFournisseur: ['Administrateur', "Chef d'Équipe"],
      supprimerFournisseur: ['Administrateur', "Chef d'Équipe"],
      creerModifierBudget: ['Administrateur', "Chef d'Équipe"],
      supprimerBudget: ['Administrateur'],
      importerCSV: ['Administrateur', "Chef d'Équipe"],
      exporter: ['Administrateur', "Chef d'Équipe"]
    },
    reporting: {
      voir: ['Administrateur', "Chef d'Équipe"],
      exporter: ['Administrateur', "Chef d'Équipe"],
      auditRapport: ['Administrateur', "Chef d'Équipe"],
      creerDepuisAnalyse: ['Administrateur', "Chef d'Équipe"],
      programmerEnvoi: ['Administrateur']
    },
    parametres: {
      voir: ['Administrateur', "Chef d'Équipe"],
      raccourcis: ['Administrateur', "Chef d'Équipe", 'Technicien', 'Magasinier', 'Opérateur'],
      competences: ['Administrateur', "Chef d'Équipe"],
      importExport: ['Administrateur'],
      purger: ['Administrateur'],
      exportSecurite: ['Administrateur']
    }
  };

  PERMISSIONS_CONFIG.forEach(({ module }) => {
    matrix[module] = defaultsByModuleAction[module] || {};
  });

  return matrix;
};

export const hasPermission = (
  matrix: PermissionsMatrix | undefined,
  role: string,
  moduleKey: string,
  actionKey: string
): boolean => {
  if (!matrix) return false;
  const allowedRoles = matrix[moduleKey]?.[actionKey];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role as PermissionRole);
};
