/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './firebase';
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import {
  GlobalSettings,
  Equipement,
  Intervention,
  Piece,
  MouvementStock,
  GammePreventive,
  Compteur,
  Fournisseur,
  Commande,
  AuditLog,
  DocumentGed,
  Budget,
  Utilisateur
} from './types';
import { PermissionsMatrix, buildDefaultPermissionsMatrix } from './permissionsConfig';
import {
  GMAODatabase,
  INITIAL_SETTINGS,
  INITIAL_EQUIPEMENTS,
  INITIAL_PIECES,
  INITIAL_FOURNISSEURS,
  INITIAL_GAMMES,
  INITIAL_COMPTEURS,
  INITIAL_COMMANDES,
  INITIAL_AUDIT_LOGS,
  INITIAL_DOCUMENTS,
  INITIAL_BUDGETS,
  INITIAL_UTILISATEURS,
  generateHistoricalInterventions
} from './data';

// Helper to check and seed Firestore database
export const checkAndSeedFirestore = async (): Promise<boolean> => {
  try {
    const globalSettingsRef = doc(db, 'settings', 'global');
    const docSnap = await getDoc(globalSettingsRef);

    if (!docSnap.exists()) {
      console.log('No data found in Firestore. Seeding database...');
      
      // 1. Seed Settings
      await setDoc(globalSettingsRef, INITIAL_SETTINGS);

      // 2. Seed Equipements
      for (const eq of INITIAL_EQUIPEMENTS) {
        await setDoc(doc(db, 'equipements', eq.id), eq);
      }

      // 3. Seed Interventions
      const historicalInts = generateHistoricalInterventions();
      for (const int of historicalInts) {
        await setDoc(doc(db, 'interventions', int.id), int);
      }

      // 4. Seed Pieces
      for (const pc of INITIAL_PIECES) {
        await setDoc(doc(db, 'pieces', pc.id), pc);
      }

      // 5. Seed Suppliers (Fournisseurs)
      for (const sup of INITIAL_FOURNISSEURS) {
        await setDoc(doc(db, 'suppliers', sup.id), sup);
      }

      // 6. Seed Gammes
      for (const g of INITIAL_GAMMES) {
        await setDoc(doc(db, 'gammes', g.id), g);
      }

      // 7. Seed Compteurs
      for (const cp of INITIAL_COMPTEURS) {
        await setDoc(doc(db, 'compteurs', cp.id), cp);
      }

      // 8. Seed Commandes
      for (const cmd of INITIAL_COMMANDES) {
        await setDoc(doc(db, 'commandes', cmd.id), cmd);
      }

      // 9. Seed Audit Logs
      for (const logItem of INITIAL_AUDIT_LOGS) {
        await setDoc(doc(db, 'audit_logs', logItem.id), logItem);
      }

      // 10. Seed Documents (GED)
      for (const docItem of INITIAL_DOCUMENTS) {
        await setDoc(doc(db, 'documents', docItem.id), docItem);
      }

      // 11. Seed Budgets
      for (const b of INITIAL_BUDGETS) {
        await setDoc(doc(db, 'budgets', b.id), b);
      }

// 12. Seed Utilisateurs
      for (const u of INITIAL_UTILISATEURS) {
        await setDoc(doc(db, 'utilisateurs', u.id), u);
      }

      // 13. Seed Permissions Matrix
      await setDoc(doc(db, 'settings', 'permissions'), buildDefaultPermissionsMatrix());

      console.log('Firestore successfully seeded!');
      return true;
    }

    // Projet déjà initialisé : on s'assure quand même que la matrice
    // d'habilitations existe (cas d'un projet migré avant cette fonctionnalité).
    const permissionsRef = doc(db, 'settings', 'permissions');
    const permsSnap = await getDoc(permissionsRef);
    if (!permsSnap.exists()) {
      await setDoc(permissionsRef, buildDefaultPermissionsMatrix());
      console.log('Permissions matrix seeded (existing project).');
    }

    return false;
  } catch (error) {
    console.error('Error during Firestore seeding:', error);
    return false;
  }
};

// Real-time synchronization subscription
export const subscribeToGMAODatabase = (
  onUpdate: (data: Partial<GMAODatabase>) => void
): (() => void) => {
  const unsubscribes: (() => void)[] = [];

// Settings subscription
  unsubscribes.push(
    onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        onUpdate({ settings: docSnap.data() as GlobalSettings });
      }
    })
  );

  // Permissions matrix subscription
  unsubscribes.push(
    onSnapshot(doc(db, 'settings', 'permissions'), (docSnap) => {
      if (docSnap.exists()) {
        onUpdate({ permissionsMatrix: docSnap.data() as PermissionsMatrix });
      }
    })
  );

  // Equipements subscription
  unsubscribes.push(
    onSnapshot(collection(db, 'equipements'), (querySnap) => {
      const items: Equipement[] = [];
      querySnap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Equipement);
      });
      onUpdate({ equipements: items });
    })
  );

  // Interventions subscription
  unsubscribes.push(
    onSnapshot(collection(db, 'interventions'), (querySnap) => {
      const items: Intervention[] = [];
      querySnap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Intervention);
      });
      // Sort interventions by dateCreation descending to keep standard order
      items.sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());
      onUpdate({ interventions: items });
    })
  );

  // Pieces subscription
  unsubscribes.push(
    onSnapshot(collection(db, 'pieces'), (querySnap) => {
      const items: Piece[] = [];
      querySnap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Piece);
      });
      onUpdate({ pieces: items });
    })
  );

  // Mouvements subscription
  unsubscribes.push(
    onSnapshot(collection(db, 'mouvements'), (querySnap) => {
      const items: MouvementStock[] = [];
      querySnap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as MouvementStock);
      });
      // Sort by dateCreation descending
      items.sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());
      onUpdate({ mouvements: items });
    })
  );

  // Gammes subscription
  unsubscribes.push(
    onSnapshot(collection(db, 'gammes'), (querySnap) => {
      const items: GammePreventive[] = [];
      querySnap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as GammePreventive);
      });
      onUpdate({ gammes: items });
    })
  );

  // Compteurs subscription
  unsubscribes.push(
    onSnapshot(collection(db, 'compteurs'), (querySnap) => {
      const items: Compteur[] = [];
      querySnap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Compteur);
      });
      onUpdate({ compteurs: items });
    })
  );

  // Suppliers subscription
  unsubscribes.push(
    onSnapshot(collection(db, 'suppliers'), (querySnap) => {
      const items: Fournisseur[] = [];
      querySnap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Fournisseur);
      });
      onUpdate({ suppliers: items });
    })
  );

  // Commandes subscription
  unsubscribes.push(
    onSnapshot(collection(db, 'commandes'), (querySnap) => {
      const items: Commande[] = [];
      querySnap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Commande);
      });
      // Sort by dateCreation descending
      items.sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());
      onUpdate({ commandes: items });
    })
  );

  // Audit Logs subscription
  unsubscribes.push(
    onSnapshot(collection(db, 'audit_logs'), (querySnap) => {
      const items: AuditLog[] = [];
      querySnap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as AuditLog);
      });
      // Sort by timestamp descending
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate({ auditLogs: items });
    })
  );

  // Documents (GED) subscription
  unsubscribes.push(
    onSnapshot(collection(db, 'documents'), (querySnap) => {
      const items: DocumentGed[] = [];
      querySnap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as DocumentGed);
      });
      // Sort by dateAjout descending (latest first)
      items.sort((a, b) => new Date(b.dateAjout).getTime() - new Date(a.dateAjout).getTime());
      onUpdate({ documents: items });
    })
  );

  // Budgets subscription
  unsubscribes.push(
    onSnapshot(collection(db, 'budgets'), (querySnap) => {
      const items: Budget[] = [];
      querySnap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Budget);
      });
      onUpdate({ budgets: items });
    })
  );

  // Utilisateurs subscription
  unsubscribes.push(
    onSnapshot(collection(db, 'utilisateurs'), (querySnap) => {
      const items: Utilisateur[] = [];
      querySnap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Utilisateur);
      });
      onUpdate({ utilisateurs: items });
    })
  );

  // Return a function to clean up all snapshot listeners
  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
};

// WRITE OPERATIONS DIRECTLY TO FIRESTORE

export const dbSaveSettings = async (settings: GlobalSettings) => {
  await setDoc(doc(db, 'settings', 'global'), settings);
};

export const dbSavePermissionsMatrix = async (matrix: PermissionsMatrix) => {
  await setDoc(doc(db, 'settings', 'permissions'), matrix);
};

export const dbSaveEquipement = async (eq: Equipement) => {
  await setDoc(doc(db, 'equipements', eq.id), eq);
};

export const dbDeleteEquipement = async (id: string) => {
  await deleteDoc(doc(db, 'equipements', id));
};

export const dbSaveIntervention = async (int: Intervention) => {
  await setDoc(doc(db, 'interventions', int.id), int);
};

export const dbDeleteIntervention = async (id: string) => {
  await deleteDoc(doc(db, 'interventions', id));
};

export const dbSavePiece = async (p: Piece) => {
  await setDoc(doc(db, 'pieces', p.id), p);
};

export const dbDeletePiece = async (id: string) => {
  await deleteDoc(doc(db, 'pieces', id));
};

export const dbSaveMouvement = async (mvt: MouvementStock) => {
  await setDoc(doc(db, 'mouvements', mvt.id), mvt);
};

export const dbSaveGamme = async (g: GammePreventive) => {
  await setDoc(doc(db, 'gammes', g.id), g);
};

export const dbDeleteGamme = async (id: string) => {
  await deleteDoc(doc(db, 'gammes', id));
};

export const dbSaveCompteur = async (c: Compteur) => {
  await setDoc(doc(db, 'compteurs', c.id), c);
};

export const dbSaveSupplier = async (s: Fournisseur) => {
  await setDoc(doc(db, 'suppliers', s.id), s);
};

export const dbDeleteSupplier = async (id: string) => {
  await deleteDoc(doc(db, 'suppliers', id));
};

export const dbSaveCommande = async (cmd: Commande) => {
  await setDoc(doc(db, 'commandes', cmd.id), cmd);
};

export const dbSaveAuditLog = async (logItem: AuditLog) => {
  await setDoc(doc(db, 'audit_logs', logItem.id), logItem);
};

export const dbDeleteAuditLog = async (id: string) => {
  await deleteDoc(doc(db, 'audit_logs', id));
};

export const dbSaveDocument = async (docItem: DocumentGed) => {
  await setDoc(doc(db, 'documents', docItem.id), docItem);
};

export const dbDeleteDocument = async (id: string) => {
  await deleteDoc(doc(db, 'documents', id));
};

export const dbSaveBudget = async (b: Budget) => {
  await setDoc(doc(db, 'budgets', b.id), b);
};

export const dbDeleteBudget = async (id: string) => {
  await deleteDoc(doc(db, 'budgets', id));
};

export const dbSaveUtilisateur = async (u: Utilisateur) => {
  await setDoc(doc(db, 'utilisateurs', u.id), u);
};

export const dbDeleteUtilisateur = async (id: string) => {
  await deleteDoc(doc(db, 'utilisateurs', id));
};

export const resetFirestoreDatabase = async () => {
  await deleteDoc(doc(db, 'settings', 'global'));
};

// Supprime tous les documents d'une collection Firestore, par lots de 450
// (limite technique Firestore : 500 opérations max par batch)
export const dbDeleteAllInCollection = async (collectionName: string): Promise<number> => {
  const snap = await getDocs(collection(db, collectionName));
  const docsToDelete = snap.docs;
  let deletedCount = 0;
  for (let i = 0; i < docsToDelete.length; i += 450) {
    const chunk = docsToDelete.slice(i, i + 450);
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deletedCount += chunk.length;
  }
  return deletedCount;
};

export const importBackupToFirestore = async (backup: GMAODatabase) => {
  if (backup.settings) await setDoc(doc(db, 'settings', 'global'), backup.settings);
  if (backup.equipements) {
    for (const eq of backup.equipements) {
      await setDoc(doc(db, 'equipements', eq.id), eq);
    }
  }
  if (backup.interventions) {
    for (const int of backup.interventions) {
      await setDoc(doc(db, 'interventions', int.id), int);
    }
  }
  if (backup.pieces) {
    for (const pc of backup.pieces) {
      await setDoc(doc(db, 'pieces', pc.id), pc);
    }
  }
  if (backup.mouvements) {
    for (const mvt of backup.mouvements) {
      await setDoc(doc(db, 'mouvements', mvt.id), mvt);
    }
  }
  if (backup.gammes) {
    for (const g of backup.gammes) {
      await setDoc(doc(db, 'gammes', g.id), g);
    }
  }
  if (backup.compteurs) {
    for (const cp of backup.compteurs) {
      await setDoc(doc(db, 'compteurs', cp.id), cp);
    }
  }
  if (backup.suppliers) {
    for (const sup of backup.suppliers) {
      await setDoc(doc(db, 'suppliers', sup.id), sup);
    }
  }
  if (backup.commandes) {
    for (const cmd of backup.commandes) {
      await setDoc(doc(db, 'commandes', cmd.id), cmd);
    }
  }
  if (backup.auditLogs) {
    for (const logItem of backup.auditLogs) {
      await setDoc(doc(db, 'audit_logs', logItem.id), logItem);
    }
  }
  if (backup.documents) {
    for (const docItem of backup.documents) {
      await setDoc(doc(db, 'documents', docItem.id), docItem);
    }
  }
  if (backup.budgets) {
    for (const b of backup.budgets) {
      await setDoc(doc(db, 'budgets', b.id), b);
    }
  }
  if (backup.utilisateurs) {
    for (const u of backup.utilisateurs) {
      await setDoc(doc(db, 'utilisateurs', u.id), u);
    }
  }
};

