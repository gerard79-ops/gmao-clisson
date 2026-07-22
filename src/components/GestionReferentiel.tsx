/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { GlobalSettings, Intervention } from '../types';
import { dbSaveIntervention } from '../firebaseSync';
import {
  List,
  ShieldAlert,
  AlertCircle,
  Activity,
  Cpu,
  HelpCircle,
  CheckCircle,
  Coins,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Lock,
  ArrowRight,
  TrendingUp,
  Info
} from 'lucide-react';

interface GestionReferentielProps {
  settings: GlobalSettings;
  onUpdateSettings: (payload: Partial<GlobalSettings>) => void;
  interventions: Intervention[];
  userRole?: string;
}

type ListField =
  | 'etats'
  | 'urgences'
  | 'effets'
  | 'activites'
  | 'technologies'
  | 'causes'
  | 'remedes'
  | 'imputations';

interface ReferenceConfig {
  id: ListField;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  fieldName: keyof Intervention; // field in Intervention matching this list
  color: string;
  textColor: string;
}

const REFERENCE_LISTS: ReferenceConfig[] = [
  {
    id: 'etats',
    label: 'Statuts (États)',
    description: 'Cycle de vie des bons de travail et demandes d\'intervention.',
    icon: List,
    fieldName: 'statut',
    color: 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/40',
    textColor: 'text-blue-600 dark:text-blue-400'
  },
  {
    id: 'urgences',
    label: 'Niveaux d\'Urgence',
    description: 'Priorisation des tâches pour l\'équipe technique.',
    icon: ShieldAlert,
    fieldName: 'urgence',
    color: 'bg-red-50 dark:bg-red-950/40 border-red-100 dark:border-red-900/40',
    textColor: 'text-red-600 dark:text-red-400'
  },
  {
    id: 'effets',
    label: 'Effets / Criticité',
    description: 'Symptômes visibles ou impacts matériels constatés lors des pannes.',
    icon: AlertCircle,
    fieldName: 'effet',
    color: 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/40',
    textColor: 'text-amber-600 dark:text-amber-400'
  },
  {
    id: 'activites',
    label: 'Activités de Maintenance',
    description: 'Nature des travaux effectués par les techniciens (Dépannage, Calibration...).',
    icon: Activity,
    fieldName: 'activite',
    color: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40',
    textColor: 'text-emerald-600 dark:text-emerald-400'
  },
  {
    id: 'technologies',
    label: 'Technologies',
    description: 'Domaines techniques et organiques (Électricité, Mécanique, Automatisme...).',
    icon: Cpu,
    fieldName: 'technologie',
    color: 'bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900/40',
    textColor: 'text-purple-600 dark:text-purple-400'
  },
  {
    id: 'causes',
    label: 'Causes de Panne',
    description: 'Origines techniques de la panne pour l\'analyse de défaillances.',
    icon: HelpCircle,
    fieldName: 'cause',
    color: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/40',
    textColor: 'text-indigo-600 dark:text-indigo-400'
  },
  {
    id: 'remedes',
    label: 'Remèdes / Actions',
    description: 'Solutions appliquées pour résoudre les pannes de manière durable.',
    icon: CheckCircle,
    fieldName: 'remede',
    color: 'bg-teal-50 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900/40',
    textColor: 'text-teal-600 dark:text-teal-400'
  },
  {
    id: 'imputations',
    label: 'Imputations Budgétaires',
    description: 'Centres de coûts et budgets affectés aux interventions.',
    icon: Coins,
    fieldName: 'imputation',
    color: 'bg-orange-50 dark:bg-orange-950/40 border-orange-100 dark:border-orange-900/40',
    textColor: 'text-orange-600 dark:text-orange-400'
  }
];

export default function GestionReferentiel({
  settings,
  onUpdateSettings,
  interventions,
  userRole
}: GestionReferentielProps) {
  const [selectedListId, setSelectedListId] = useState<ListField>('etats');
  const [searchQuery, setSearchQuery] = useState('');
  const [newItemValue, setNewItemValue] = useState('');
  const [editingItemValue, setEditingItemValue] = useState<string | null>(null);
  const [editingCurrentText, setEditingCurrentText] = useState('');
  const [propagateChanges, setPropagateChanges] = useState(true);
  const [isUpdatingDb, setIsUpdatingDb] = useState(false);

  const isReadOnly = userRole === 'Technicien';

  // Get active list configuration
  const activeConfig = useMemo(() => {
    return REFERENCE_LISTS.find(r => r.id === selectedListId)!;
  }, [selectedListId]);

  // Current array of items for the selected list
  const currentItems = useMemo(() => {
    return settings.listes[selectedListId] || [];
  }, [settings.listes, selectedListId]);

  // Count usage of each item in the current selected list across all interventions
  const usageMetrics = useMemo(() => {
    const counts: Record<string, number> = {};
    // Initialize
    currentItems.forEach(item => {
      counts[item] = 0;
    });

    const field = activeConfig.fieldName;
    interventions.forEach(int => {
      const val = int[field];
      if (typeof val === 'string' && val) {
        if (counts[val] !== undefined) {
          counts[val]++;
        } else {
          // Keep track of unlisted legacy usages too if needed
          counts[val] = 1;
        }
      }
    });

    return counts;
  }, [currentItems, interventions, activeConfig]);

  // Filtered list based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return currentItems;
    return currentItems.filter(item =>
      item.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [currentItems, searchQuery]);

  // Handle addition of a new reference item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert("🔐 Accès refusé : Seuls les Managers peuvent modifier le référentiel global.");
      return;
    }

    const value = newItemValue.trim();
    if (!value) return;

    if (currentItems.includes(value)) {
      alert("⚠️ Cet élément existe déjà dans le référentiel.");
      return;
    }

    onUpdateSettings({
      listes: {
        ...settings.listes,
        [selectedListId]: [...currentItems, value]
      }
    });

    setNewItemValue('');
  };

  // Handle deleting a reference item
  const handleDeleteItem = async (itemToDelete: string) => {
    if (isReadOnly) {
      alert("🔐 Accès refusé : Seuls les Managers peuvent modifier le référentiel global.");
      return;
    }

    const usageCount = usageMetrics[itemToDelete] || 0;
    let confirmMsg = `Voulez-vous vraiment supprimer "${itemToDelete}" du référentiel ?`;
    
    if (usageCount > 0) {
      confirmMsg += `\n\n⚠️ Attention : Cet élément est actuellement utilisé dans ${usageCount} intervention(s) !`;
      confirmMsg += `\nLa suppression du référentiel empêchera la sélection de cette option pour les futurs bons, mais les bons existants conserveront la valeur historique.`;
    }

    if (currentItems.length <= 1) {
      alert("⚠️ Le référentiel doit contenir au moins une option.");
      return;
    }

    if (confirm(confirmMsg)) {
      onUpdateSettings({
        listes: {
          ...settings.listes,
          [selectedListId]: currentItems.filter(x => x !== itemToDelete)
        }
      });
    }
  };

  // Handle inline rename action
  const handleStartEdit = (item: string) => {
    if (isReadOnly) return;
    setEditingItemValue(item);
    setEditingCurrentText(item);
  };

  const handleCancelEdit = () => {
    setEditingItemValue(null);
    setEditingCurrentText('');
  };

  const handleSaveEdit = async (oldValue: string) => {
    if (isReadOnly) return;
    const newValue = editingCurrentText.trim();
    
    if (!newValue) {
      alert("⚠️ Le nom ne peut pas être vide.");
      return;
    }

    if (newValue === oldValue) {
      handleCancelEdit();
      return;
    }

    if (currentItems.includes(newValue)) {
      alert("⚠️ Cet élément existe déjà dans la liste.");
      return;
    }

    setIsUpdatingDb(true);
    try {
      // 1. Update lists option in local settings
      onUpdateSettings({
        listes: {
          ...settings.listes,
          [selectedListId]: currentItems.map(item => item === oldValue ? newValue : item)
        }
      });

      // 2. Propagation to existing interventions if checked
      const usageCount = usageMetrics[oldValue] || 0;
      if (propagateChanges && usageCount > 0) {
        const field = activeConfig.fieldName;
        const matchedInts = interventions.filter(int => int[field] === oldValue);
        
        let processedCount = 0;
        for (const int of matchedInts) {
          const updatedInt = {
            ...int,
            [field]: newValue
          };
          await dbSaveIntervention(updatedInt);
          processedCount++;
        }
        
        console.log(`Propagated rename to ${processedCount} interventions.`);
      }

      setEditingItemValue(null);
      setEditingCurrentText('');
    } catch (error) {
      console.error("Erreur de propagation du référentiel :", error);
      alert("Une erreur est survenue lors de la mise à jour globale. Veuillez réessayer.");
    } finally {
      setIsUpdatingDb(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-fade-in">
      {/* LEFT COLUMN: LIST SELECTOR */}
      <div className="xl:col-span-1 space-y-3">
        <div className="bg-white dark:bg-primary-950 rounded-2xl p-4 border border-primary-100 dark:border-primary-900/60 shadow-sm">
          <h2 className="text-xs font-bold text-primary-400 uppercase tracking-widest mb-3 px-1">
            Listes Référentielles
          </h2>
          <div className="space-y-1.5">
            {REFERENCE_LISTS.map(list => {
              const Icon = list.icon;
              const isSelected = list.id === selectedListId;
              const sizeOfList = (settings.listes[list.id] || []).length;

              return (
                <button
                  key={list.id}
                  onClick={() => {
                    setSelectedListId(list.id);
                    setSearchQuery('');
                    handleCancelEdit();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition border ${
                    isSelected
                      ? 'bg-primary-900 dark:bg-primary-800 border-primary-900 text-white shadow-md shadow-primary-900/10'
                      : 'bg-primary-50/40 dark:bg-primary-900/10 hover:bg-primary-50 dark:hover:bg-primary-900/20 border-primary-100/50 dark:border-primary-900/40 text-primary-700 dark:text-primary-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/10 text-white' : list.color + ' ' + list.textColor}`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate leading-tight">
                        {list.label}
                      </p>
                      <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-primary-200' : 'text-primary-400'}`}>
                        {list.description}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-2 shrink-0 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-primary-100 dark:bg-primary-800 text-primary-500'
                  }`}>
                    {sizeOfList}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* STATS BANNER */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100/60 dark:border-indigo-900/40 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
            <TrendingUp size={16} />
            <h3 className="text-xs font-bold uppercase tracking-wider">Statistiques d'utilisation</h3>
          </div>
          <p className="text-[11px] text-primary-500 dark:text-primary-400 mt-1.5 leading-relaxed">
            Chaque référence est reliée aux bases d'interventions de manière dynamique. Le compteur indique la présence exacte de l'option dans l'historique de votre GMAO.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: LIST ITEMS CRUD INTERFACE */}
      <div className="xl:col-span-3 space-y-6">
        {/* CURRENT CONFIG INFO */}
        <div className={`p-4 rounded-2xl border flex items-start gap-3.5 shadow-sm ${activeConfig.color}`}>
          <div className={`p-2.5 rounded-xl bg-white dark:bg-primary-950 shadow-sm ${activeConfig.textColor}`}>
            <activeConfig.icon size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-primary-900 dark:text-white text-sm">
              Configuration : {activeConfig.label}
            </h3>
            <p className="text-xs text-primary-600 dark:text-primary-300 mt-0.5 leading-relaxed">
              {activeConfig.description} Vous pouvez ajouter, renommer ou archiver des options de saisie. Les modifications se propagent instantanément aux formulaires d'intervention.
            </p>
          </div>
        </div>

        {/* ACTIONS BAR (Search & Quick Add) */}
        <div className="bg-white dark:bg-primary-950 rounded-2xl p-4 border border-primary-100 dark:border-primary-900/60 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* SEARCH */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-primary-400" size={16} />
              <input
                type="text"
                placeholder="Rechercher une option..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="text-xs pl-9 pr-4 py-2 w-full rounded-xl border border-primary-100 dark:border-primary-900 bg-primary-50/30 dark:bg-primary-950"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-primary-400 hover:text-primary-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* ADD FORM */}
            <form onSubmit={handleAddItem} className="flex gap-2 min-w-[320px]">
              <input
                type="text"
                placeholder={isReadOnly ? "🔐 Accès restreint aux Managers" : `Nouvelle valeur...`}
                value={newItemValue}
                onChange={e => setNewItemValue(e.target.value)}
                disabled={isReadOnly}
                className="text-xs flex-1 px-4 py-2 rounded-xl border border-primary-100 dark:border-primary-900 bg-primary-50/10 dark:bg-primary-950 disabled:bg-primary-100/50 dark:disabled:bg-primary-950/40"
              />
              <button
                type="submit"
                disabled={isReadOnly || !newItemValue.trim()}
                className="btn-primary py-2 px-4 rounded-xl flex items-center gap-1.5 text-xs font-bold shrink-0 disabled:opacity-50"
              >
                <Plus size={14} />
                Ajouter
              </button>
            </form>
          </div>

          {/* PROPAGATION BEHAVIOR FOR RENAMES */}
          {!isReadOnly && (
            <div className="flex items-center gap-2 pt-1 border-t border-primary-50 dark:border-primary-900/40">
              <input
                id="propagate-checkbox"
                type="checkbox"
                checked={propagateChanges}
                onChange={e => setPropagateChanges(e.target.checked)}
                className="h-3.5 w-3.5 text-primary-600 border-primary-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="propagate-checkbox" className="text-[11px] text-primary-500 dark:text-primary-400 cursor-pointer flex items-center gap-1 font-medium">
                Propager automatiquement les modifications de nom aux interventions existantes en base de données.
                <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded font-bold">Conseillé</span>
              </label>
            </div>
          )}
        </div>

        {/* ITEMS LIST */}
        <div className="bg-white dark:bg-primary-950 rounded-2xl border border-primary-100 dark:border-primary-900/60 shadow-sm overflow-hidden">
          <div className="p-4 bg-primary-50/40 dark:bg-primary-900/10 border-b border-primary-100 dark:border-primary-900/60 flex justify-between items-center">
            <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
              Options définies ({filteredItems.length} affichées)
            </span>
            {isReadOnly && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full font-bold border border-amber-100/50 dark:border-amber-900/20">
                <Lock size={10} /> Lecture Seule
              </span>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex p-3 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-400 mb-2">
                <Search size={20} />
              </div>
              <p className="text-xs text-primary-500 dark:text-primary-400">
                Aucun élément ne correspond à votre recherche.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-primary-50 dark:divide-primary-900/40">
              {filteredItems.map((item, index) => {
                const isEditing = editingItemValue === item;
                const count = usageMetrics[item] || 0;

                return (
                  <div
                    key={item}
                    className="flex items-center justify-between p-3.5 hover:bg-primary-50/20 dark:hover:bg-primary-900/5 transition text-xs"
                  >
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2 mr-4">
                        <input
                          type="text"
                          value={editingCurrentText}
                          onChange={e => setEditingCurrentText(e.target.value)}
                          className="text-xs px-3 py-1.5 flex-1 rounded-lg border border-primary-300 dark:border-primary-700 bg-white dark:bg-primary-950"
                          autoFocus
                          disabled={isUpdatingDb}
                        />
                        <button
                          onClick={() => handleSaveEdit(item)}
                          disabled={isUpdatingDb}
                          className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition disabled:opacity-50"
                          title="Valider la modification"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isUpdatingDb}
                          className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-800 hover:bg-primary-200 text-primary-500 transition disabled:opacity-50"
                          title="Annuler"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-primary-400 font-mono text-[10px] w-6 text-right select-none">
                          #{index + 1}
                        </span>
                        <span className="font-bold text-primary-900 dark:text-white truncate">
                          {item}
                        </span>
                        
                        {/* LIVE USAGE CHIP */}
                        <div className="flex items-center gap-1 shrink-0">
                          {count > 0 ? (
                            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-semibold border border-indigo-100/50 dark:border-indigo-900/20 flex items-center gap-1">
                              <Info size={10} /> Utilisé {count} fois
                            </span>
                          ) : (
                            <span className="text-[10px] bg-primary-50 dark:bg-primary-900/30 text-primary-400 px-2 py-0.5 rounded-full font-medium">
                              Non utilisé
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ACTIONS */}
                    {!isEditing && (
                      <div className="flex items-center gap-1.5 ml-4 shrink-0">
                        <button
                          onClick={() => handleStartEdit(item)}
                          disabled={isReadOnly}
                          className="p-1.5 text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-900 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                          title={isReadOnly ? "Lecture seule" : "Renommer l'élément"}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          disabled={isReadOnly}
                          className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                          title={isReadOnly ? "Lecture seule" : "Supprimer du référentiel"}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
