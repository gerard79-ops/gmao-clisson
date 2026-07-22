/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Map,
  MapPin,
  Search,
  Wrench,
  AlertTriangle,
  CheckCircle,
  X,
  Plus,
  Move,
  Settings,
  Sliders,
  Filter,
  Eye,
  Sparkles,
  Info,
  ChevronRight,
  RefreshCw,
  Compass,
  LayoutGrid,
  MapPinned
} from 'lucide-react';
import { Equipement, Intervention, GlobalSettings } from '../types';
import { ModuleHelp } from './ModuleHelp';

interface CartographieProps {
  equipements: Equipement[];
  interventions: Intervention[];
  settings: GlobalSettings;
  onEditEquipement: (id: string, payload: Partial<Equipement>) => void;
  onAddIntervention: (payload: Omit<Intervention, 'id' | 'dateCreation'>) => void;
  userRole: 'Technicien' | 'Manager';
}

interface MapZone {
  id: string;
  nom: string;
  color: string;
  borderColor: string;
  textColor: string;
  bgColor: string;
  xRange: [number, number]; // Percentage on X axis
  yRange: [number, number]; // Percentage on Y axis
  desc: string;
}

export default function Cartographie({
  equipements,
  interventions,
  settings,
  onEditEquipement,
  onAddIntervention,
  userRole
}: CartographieProps) {
  // State
  const [selectedEqId, setSelectedEqId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Opérationnel' | 'HS'>('all');
  const [criticalityFilter, setCriticalityFilter] = useState<'all' | 'critique' | 'normal'>('all');
  const [selectedZoneId, setSelectedZoneId] = useState<string | 'all'>('all');
  
  // Placement State
  const [placingEqId, setPlacingEqId] = useState<string | null>(null);
  const [draggingEqId, setDraggingEqId] = useState<string | null>(null);
  
  // Map Preferences
  const [showGrid, setShowGrid] = useState(true);
  const [showZoneNames, setShowZoneNames] = useState(true);
  const [showPathwayLines, setShowPathwayLines] = useState(true);
  const [mapTheme, setMapTheme] = useState<'blueprint' | 'cyber' | 'technical'>('blueprint');

  // New Quick Work Order Form State
  const [showQuickOrderForm, setShowQuickOrderForm] = useState(false);
  const [quickOrderType, setQuickOrderType] = useState<'DI' | 'BT'>('DI');
  const [quickOrderUrgence, setQuickOrderUrgence] = useState('Moyenne (48h)');
  const [quickOrderDesc, setQuickOrderDesc] = useState('');
  const [quickOrderTypeProbleme, setQuickOrderTypeProbleme] = useState('Mécanique');

  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Define 4 structural zones based on the settings' ateliers list
  const zones: MapZone[] = useMemo(() => {
    return [
      {
        id: 'Atelier Injection',
        nom: 'Atelier Injection',
        color: 'indigo',
        borderColor: 'border-indigo-400 dark:border-indigo-600',
        textColor: 'text-indigo-600 dark:text-indigo-400',
        bgColor: 'bg-indigo-50/40 dark:bg-indigo-950/20',
        xRange: [2, 48],
        yRange: [2, 48],
        desc: 'Secteur presses & moulage par injection'
      },
      {
        id: 'Atelier Usinage',
        nom: 'Atelier Usinage',
        color: 'emerald',
        borderColor: 'border-emerald-400 dark:border-emerald-600',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-50/40 dark:bg-emerald-950/20',
        xRange: [52, 98],
        yRange: [2, 48],
        desc: 'Centres d\'usinage, CNC & rectification'
      },
      {
        id: 'Atelier Conditionnement',
        nom: 'Atelier Conditionnement',
        color: 'amber',
        borderColor: 'border-amber-400 dark:border-amber-600',
        textColor: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50/40 dark:bg-amber-950/20',
        xRange: [2, 48],
        yRange: [52, 98],
        desc: 'Ensachage, tri robotisé, palettisation'
      },
      {
        id: 'Services Généraux',
        nom: 'Services Généraux',
        color: 'rose',
        borderColor: 'border-rose-400 dark:border-rose-600',
        textColor: 'text-rose-600 dark:text-rose-400',
        bgColor: 'bg-rose-50/40 dark:bg-rose-950/20',
        xRange: [52, 98],
        yRange: [52, 98],
        desc: 'Réseaux fluides, énergies, centrales d\'air'
      }
    ];
  }, []);

  // Filtered equipment list
  const filteredEquipements = useMemo(() => {
    return equipements.filter(eq => {
      const matchesSearch = eq.nom.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            eq.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            eq.marque.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || eq.statut === statusFilter;
      const matchesCriticality = criticalityFilter === 'all' || 
                                (criticalityFilter === 'critique' ? eq.critique : !eq.critique);
      const matchesZone = selectedZoneId === 'all' || eq.atelier === selectedZoneId;
      return matchesSearch && matchesStatus && matchesCriticality && matchesZone;
    });
  }, [equipements, searchQuery, statusFilter, criticalityFilter, selectedZoneId]);

  // Group equipments by Placed vs Unplaced
  const [placedEquipements, unplacedEquipements] = useMemo(() => {
    const placed: Equipement[] = [];
    const unplaced: Equipement[] = [];
    equipements.forEach(eq => {
      if (typeof eq.posX === 'number' && typeof eq.posY === 'number') {
        placed.push(eq);
      } else {
        unplaced.push(eq);
      }
    });
    return [placed, unplaced];
  }, [equipements]);

  // Selected Equipment Details
  const selectedEq = useMemo(() => {
    return equipements.find(eq => eq.id === selectedEqId) || null;
  }, [equipements, selectedEqId]);

  // Count active interventions for a specific equipment
  const activeBTsForEq = useMemo(() => {
    if (!selectedEqId) return [];
    return interventions.filter(int => int.equipementId === selectedEqId && int.statut !== 'Soldé' && int.statut !== 'Clôturé');
  }, [interventions, selectedEqId]);

  // Click on map container to place an equipment
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingEqId || !mapContainerRef.current) return;
    
    const rect = mapContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Calculate percentage coordinates
    const posX = Math.round((clickX / rect.width) * 100);
    const posY = Math.round((clickY / rect.height) * 100);

    // Secure boundary check
    const clampedX = Math.max(2, Math.min(98, posX));
    const clampedY = Math.max(2, Math.min(98, posY));

    onEditEquipement(placingEqId, { posX: clampedX, posY: clampedY });
    
    const eqName = equipements.find(eq => eq.id === placingEqId)?.nom || placingEqId;
    setPlacingEqId(null);
  };

  // Drag and drop event handlers
  const handleDragStart = (id: string) => {
    if (userRole === 'Technicien') return;
    setDraggingEqId(id);
  };

  const handleMapMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingEqId || !mapContainerRef.current || userRole === 'Technicien') return;
    
    const rect = mapContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    let posX = Math.round((mouseX / rect.width) * 100);
    let posY = Math.round((mouseY / rect.height) * 100);

    // Keep pins within reasonable bounds
    posX = Math.max(2, Math.min(98, posX));
    posY = Math.max(2, Math.min(98, posY));

    // Live reposition update
    onEditEquipement(draggingEqId, { posX, posY });
  };

  const handleMapMouseUp = () => {
    setDraggingEqId(null);
  };

  // Auto-detect a reasonable default position if placed in an atelier but coordinates don't exist
  const triggerAutoPlaceAll = () => {
    if (userRole === 'Technicien') {
      alert("🔐 Accès refusé : Seuls les Managers peuvent réinitialiser les positions.");
      return;
    }
    
    if (confirm("⚠️ Confirmer le placement automatique des équipements sans coordonnées ? Les équipements seront répartis équitablement dans leurs zones d'atelier respectives.")) {
      let count = 0;
      equipements.forEach(eq => {
        if (typeof eq.posX !== 'number' || typeof eq.posY !== 'number') {
          // Find matching zone for its atelier
          const zone = zones.find(z => z.id === eq.atelier) || zones[3];
          
          // Generate a randomized coordinate within that zone range
          const xMin = zone.xRange[0] + 5;
          const xMax = zone.xRange[1] - 5;
          const yMin = zone.yRange[0] + 5;
          const yMax = zone.yRange[1] - 5;
          
          const posX = Math.round(xMin + Math.random() * (xMax - xMin));
          const posY = Math.round(yMin + Math.random() * (yMax - yMin));
          
          onEditEquipement(eq.id, { posX, posY });
          count++;
        }
      });
      alert(`✅ ${count} équipement(s) positionné(s) automatiquement avec succès.`);
    }
  };

  // Remove coordinates to unplace equipment
  const handleUnplaceEq = (id: string) => {
    if (userRole === 'Technicien') {
      alert("🔐 Accès restreint aux Managers.");
      return;
    }
    onEditEquipement(id, { posX: undefined, posY: undefined });
    if (selectedEqId === id) {
      setSelectedEqId(null);
    }
  };

  // Handle Quick Work Order Submission
  const handleQuickOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEqId || !selectedEq) return;

    onAddIntervention({
      typeDoc: quickOrderType,
      numero: `${quickOrderType}-${Math.floor(10000 + Math.random() * 90000)}`,
      equipementId: selectedEq.id,
      equipementNom: selectedEq.nom,
      atelier: selectedEq.atelier,
      urgence: quickOrderUrgence,
      typeProbleme: quickOrderTypeProbleme,
      demandeur: userRole === 'Manager' ? "Jean Dupont (Manager Map)" : "Technicien de Quart",
      description: quickOrderDesc || `Intervention de maintenance rapide générée depuis la vue cartographique interactive.\n\nDescription : Aucun détail supplémentaire fourni.`,
      statut: 'En attente'
    });

    setShowQuickOrderForm(false);
    setQuickOrderDesc('');
    alert(`🚀 Bon de Travail créé avec succès pour ${selectedEq.nom} !`);
  };

  // Helper to get machine color based on its status or active interventions
  const getPinStyles = (eq: Equipement) => {
    const hasActiveBT = interventions.some(int => int.equipementId === eq.id && int.statut !== 'Soldé' && int.statut !== 'Clôturé');
    
    if (eq.statut === 'HS') {
      return {
        bgColor: 'bg-red-500',
        ringColor: 'ring-red-400 dark:ring-red-600',
        textColor: 'text-red-500',
        animate: 'animate-pulse scale-110 shadow-lg shadow-red-500/50',
        badge: 'bg-red-100 text-red-800 border-red-200'
      };
    }
    if (hasActiveBT) {
      return {
        bgColor: 'bg-amber-500',
        ringColor: 'ring-amber-400 dark:ring-amber-600',
        textColor: 'text-amber-500',
        animate: 'scale-105 shadow-md shadow-amber-500/30',
        badge: 'bg-amber-100 text-amber-800 border-amber-200'
      };
    }
    return {
      bgColor: 'bg-emerald-500',
      ringColor: 'ring-emerald-400 dark:ring-emerald-600',
      textColor: 'text-emerald-500',
      animate: 'hover:scale-110 shadow-sm shadow-emerald-500/20',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    };
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-primary-900 p-6 rounded-2xl border border-primary-200 dark:border-primary-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl">
              <MapPinned size={20} className="animate-bounce" />
            </span>
            <h1 className="text-xl font-display font-black text-primary-900 dark:text-white flex items-center">
              Cartographie Interactive du Site
              <ModuleHelp moduleId="cartographie" />
            </h1>
          </div>
          <p className="text-xs text-primary-500 mt-1 max-w-2xl">
            Localisez visuellement vos équipements sur le plan de l'usine. Positionnez les machines, surveillez leur état opérationnel en temps réel, et pilotez les interventions d'un seul clic.
          </p>
        </div>

        {/* Action button to auto-place or reposition all */}
        {userRole === 'Manager' && unplacedEquipements.length > 0 && (
          <button
            onClick={triggerAutoPlaceAll}
            className="text-xs font-bold btn-primary py-2 px-4 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition transform active:scale-95"
          >
            <Compass size={14} className="animate-spin" />
            Placer automatiquement ({unplacedEquipements.length})
          </button>
        )}
      </div>

      {/* SEARCH AND MAP CONTROLS FILTERS */}
      <div className="bg-white dark:bg-primary-900 p-4 rounded-xl border border-primary-200 dark:border-primary-800 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Search */}
        <div className="relative lg:col-span-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" size={14} />
          <input
            type="text"
            placeholder="Rechercher une machine par nom/ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 py-2 text-xs bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          />
        </div>

        {/* Filters Grid */}
        <div className="lg:col-span-9 flex flex-wrap gap-3 items-center justify-start lg:justify-end text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-primary-500 font-bold flex items-center gap-1">
              <Filter size={12} />
              État :
            </span>
            <div className="bg-primary-50 dark:bg-primary-950 p-1 rounded-lg border border-primary-200 dark:border-primary-800 flex gap-1">
              {(['all', 'Opérationnel', 'HS'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                    statusFilter === f
                      ? 'bg-white dark:bg-primary-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-primary-200 dark:border-primary-700'
                      : 'text-primary-500 hover:text-primary-800'
                  }`}
                >
                  {f === 'all' ? 'Tous' : f === 'HS' ? '🚨 HS / En Panne' : '✅ Opérationnel'}
                </button>
              ))}
            </div>
          </div>

          {/* Criticality Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-primary-500 font-bold flex items-center gap-1">
              <Sliders size={12} />
              Criticité :
            </span>
            <div className="bg-primary-50 dark:bg-primary-950 p-1 rounded-lg border border-primary-200 dark:border-primary-800 flex gap-1">
              {(['all', 'critique', 'normal'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setCriticalityFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                    criticalityFilter === f
                      ? 'bg-white dark:bg-primary-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-primary-200 dark:border-primary-700'
                      : 'text-primary-500 hover:text-primary-800'
                  }`}
                >
                  {f === 'all' ? 'Toutes' : f === 'critique' ? '⚠️ Critique ★' : 'Standard'}
                </button>
              ))}
            </div>
          </div>

          {/* Atelier Zone Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-primary-500 font-bold">Zone :</span>
            <select
              value={selectedZoneId}
              onChange={e => setSelectedZoneId(e.target.value)}
              className="py-1 px-2 text-[11px] bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg text-primary-700 dark:text-primary-200 font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="all">Toutes les zones</option>
              {settings.listes.ateliers.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* PLACING FLOATING BANNER */}
      {placingEqId && (
        <div className="bg-amber-500 text-white font-bold p-3 rounded-xl flex items-center justify-between shadow-lg animate-bounce text-xs">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="animate-spin" />
            <span>
              Mode de placement actif : Cliquez sur le plan ci-dessous à l'endroit exact de l'équipement <strong>"{equipements.find(eq => eq.id === placingEqId)?.nom}"</strong>.
            </span>
          </div>
          <button
            onClick={() => setPlacingEqId(null)}
            className="p-1 hover:bg-white/20 rounded-lg transition text-white"
            title="Annuler le placement"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* MAIN TWO COLUMN MAP VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: LIST OF EQUIPMENTS FOR PLACING (4 cols) */}
        <div className="card space-y-4 lg:col-span-4 border border-primary-200 dark:border-primary-800 bg-white dark:bg-primary-900 p-5 rounded-2xl shadow-sm">
          <div className="border-b border-primary-100 dark:border-primary-800 pb-3">
            <h3 className="text-sm font-display font-bold text-primary-800 dark:text-white flex items-center justify-between">
              <span>Répertoire d'Usine</span>
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full text-indigo-600 font-extrabold">
                {filteredEquipements.length} / {equipements.length} Machines
              </span>
            </h3>
          </div>

          {/* Quick Stats of placed machines */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/15 rounded-xl border border-emerald-100/30">
              <span className="block text-lg font-black text-emerald-600">{placedEquipements.length}</span>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-primary-400">Positionnés</span>
            </div>
            <div className="p-2.5 bg-amber-50/50 dark:bg-amber-950/15 rounded-xl border border-amber-100/30">
              <span className="block text-lg font-black text-amber-500">{unplacedEquipements.length}</span>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-primary-400">À positionner</span>
            </div>
          </div>

          {/* Unplaced equipment section list */}
          {unplacedEquipements.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-black text-amber-600 tracking-wider flex items-center gap-1">
                <AlertTriangle size={11} />
                En attente d'implantation ({unplacedEquipements.length}) :
              </span>
              <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 border-b border-primary-100 dark:border-primary-800 pb-3">
                {unplacedEquipements.map(eq => (
                  <div
                    key={eq.id}
                    className="flex items-center justify-between p-2.5 bg-amber-50/25 dark:bg-amber-950/5 rounded-xl border border-amber-100/40 hover:border-amber-400 dark:hover:border-amber-600 transition text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-primary-800 dark:text-primary-100 block truncate">{eq.nom}</span>
                      <span className="text-[9px] text-primary-400 font-medium block truncate mt-0.5">
                        {eq.atelier} • Ref: {eq.id}
                      </span>
                    </div>
                    {userRole === 'Manager' ? (
                      <button
                        onClick={() => setPlacingEqId(eq.id)}
                        className={`text-[9px] font-bold py-1 px-2.5 rounded-lg border transition duration-200 flex items-center gap-1 ${
                          placingEqId === eq.id
                            ? 'bg-amber-500 text-white border-amber-500 shadow'
                            : 'bg-white dark:bg-primary-950 border-amber-300 dark:border-amber-800 hover:bg-amber-50 text-amber-700 dark:text-amber-400'
                        }`}
                        title="Positionner sur la carte"
                      >
                        <Move size={11} className="animate-spin-slow" />
                        Placer
                      </button>
                    ) : (
                      <span className="text-[9px] italic text-primary-400 font-medium">Lecture seule</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Placed / Filtered equipment lists */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-black text-primary-400 tracking-wider flex items-center gap-1">
              <LayoutGrid size={11} />
              Liste des machines :
            </span>
            <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
              {filteredEquipements.length === 0 ? (
                <div className="text-center py-8 text-xs text-primary-400 bg-primary-50/50 dark:bg-primary-950/10 rounded-xl border border-dashed border-primary-200">
                  Aucun équipement ne correspond à vos filtres.
                </div>
              ) : (
                filteredEquipements.map(eq => {
                  const isPlaced = typeof eq.posX === 'number' && typeof eq.posY === 'number';
                  const isSelected = selectedEqId === eq.id;
                  const stat = getPinStyles(eq);
                  
                  return (
                    <div
                      key={eq.id}
                      onClick={() => {
                        setSelectedEqId(eq.id);
                        if (isPlaced && mapContainerRef.current) {
                          // Visual ping scroll simulation
                        }
                      }}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500'
                          : 'bg-primary-50/40 dark:bg-primary-950/20 border-primary-100 dark:border-primary-850 hover:border-primary-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${stat.bgColor}`} />
                          <span className="font-bold text-primary-800 dark:text-primary-100 block truncate">{eq.nom}</span>
                        </div>
                        <span className="text-[9px] text-primary-400 font-semibold block truncate mt-1">
                          {eq.atelier} • Code: {eq.id}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {isPlaced ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                              Placé
                            </span>
                            {userRole === 'Manager' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnplaceEq(eq.id);
                                }}
                                className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition"
                                title="Enlever la position"
                              >
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[8px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-bold">
                            Non placé
                          </span>
                        )}
                        <ChevronRight size={14} className="text-primary-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: THE INTERACTIVE FLOOR PLAN WORKSHOP CARDS (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* MAP TOOLBAR FOR STYLE PREFERENCES */}
          <div className="bg-white dark:bg-primary-900 p-3 rounded-xl border border-primary-200 dark:border-primary-800 flex flex-wrap gap-4 items-center justify-between text-xs font-bold text-primary-500 shadow-sm">
            <div className="flex items-center gap-3">
              <LayoutGrid size={14} className="text-indigo-500" />
              <span>Affichage :</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={e => setShowGrid(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Grille
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showZoneNames}
                  onChange={e => setShowZoneNames(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Ateliers
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPathwayLines}
                  onChange={e => setShowPathwayLines(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Flux Logistiques
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Compass size={14} className="text-amber-500" />
              <span>Style :</span>
              <div className="bg-primary-50 dark:bg-primary-950 p-0.5 rounded-lg border border-primary-200 dark:border-primary-850 flex gap-0.5">
                {(['blueprint', 'cyber', 'technical'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setMapTheme(t)}
                    className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition ${
                      mapTheme === t
                        ? 'bg-white dark:bg-primary-800 text-indigo-600 shadow-sm'
                        : 'text-primary-400 hover:text-primary-800'
                    }`}
                  >
                    {t === 'blueprint' ? 'Plan technique' : t === 'cyber' ? 'Tactique' : 'Vectoriel'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* THE PLAN CONTAINER CANVAS */}
          <div
            ref={mapContainerRef}
            onClick={handleMapClick}
            onMouseMove={handleMapMouseMove}
            onMouseUp={handleMapMouseUp}
            className={`relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-primary-200 dark:border-primary-800 shadow-lg select-none transition-all duration-300 ${
              placingEqId ? 'cursor-crosshair border-amber-400 ring-4 ring-amber-500/25' : 'cursor-default'
            } ${
              mapTheme === 'blueprint'
                ? 'bg-gradient-to-br from-indigo-950 to-primary-950 text-indigo-200'
                : mapTheme === 'cyber'
                  ? 'bg-black text-green-400 font-mono'
                  : 'bg-primary-50 dark:bg-primary-950 text-primary-800'
            }`}
          >
            {/* GRID LAYER */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.08]"
                style={{
                  backgroundImage: `
                    radial-gradient(circle, currentColor 1px, transparent 1px),
                    linear-gradient(to right, currentColor 1px, transparent 1px),
                    linear-gradient(to bottom, currentColor 1px, transparent 1px)
                  `,
                  backgroundSize: '100% 100%, 4% 4%, 4% 4%',
                }}
              />
            )}

            {/* FLOW LOGISTICS OVERLAYS */}
            {showPathwayLines && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" xmlns="http://www.w3.org/2000/svg">
                {/* Horizontal central logistics alley */}
                <line x1="2%" y1="50%" x2="98%" y2="50%" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
                {/* Vertical central logistics alley */}
                <line x1="50%" y1="2%" x2="50%" y2="98%" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
                {/* Visual Assembly loop arrows */}
                <path d="M 15 25 L 15 75 L 85 75 L 85 25 Z" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="50%" cy="50%" r="20" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
                <text x="51%" y="48%" className="text-[8px] font-mono tracking-widest uppercase opacity-60">Rond-point logistique</text>
              </svg>
            )}

            {/* ATELIER ZONES */}
            {zones.map(z => {
              const width = z.xRange[1] - z.xRange[0];
              const height = z.yRange[1] - z.yRange[0];
              
              const isFilteredZone = selectedZoneId !== 'all' && selectedZoneId !== z.id;

              return (
                <div
                  key={z.id}
                  className={`absolute rounded-xl border border-dashed transition-all duration-300 flex flex-col justify-between p-3 pointer-events-none ${
                    z.borderColor
                  } ${
                    isFilteredZone ? 'opacity-10' : 'opacity-100'
                  } ${
                    mapTheme === 'blueprint' 
                      ? 'bg-indigo-900/[0.04]' 
                      : mapTheme === 'cyber' 
                        ? 'bg-green-950/[0.03]' 
                        : 'bg-primary-100/30 dark:bg-primary-900/10'
                  }`}
                  style={{
                    left: `${z.xRange[0]}%`,
                    top: `${z.yRange[0]}%`,
                    width: `${width}%`,
                    height: `${height}%`
                  }}
                >
                  {/* Zone Header Label */}
                  {showZoneNames && (
                    <div className="flex items-start justify-between">
                      <div className="backdrop-blur-sm bg-white/5 dark:bg-black/20 px-2 py-1 rounded-md border border-white/10 flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full bg-${z.color}-500 animate-pulse`} />
                        <span className="text-[10px] font-display font-black tracking-wider uppercase text-white">
                          {z.nom}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono opacity-50">Z-{z.id.substring(8, 12).toUpperCase()}</span>
                    </div>
                  )}

                  {/* Room footprint/layout text */}
                  <div className="text-right">
                    <p className="text-[8px] font-mono opacity-30 italic leading-none max-w-[140px] ml-auto">
                      {z.desc}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* PLACED EQUIPMENT PINS */}
            {placedEquipements.map(eq => {
              const styles = getPinStyles(eq);
              const isSelected = selectedEqId === eq.id;
              
              // Filter check: If eq doesn't pass search/status/critical filters, dim it down!
              const isFilteredOut = !filteredEquipements.some(f => f.id === eq.id);
              if (isFilteredOut) return null;

              return (
                <div
                  key={eq.id}
                  onMouseDown={() => handleDragStart(eq.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEqId(eq.id);
                  }}
                  className={`absolute z-20 group transition-all duration-300 ${
                    draggingEqId === eq.id ? 'scale-125 opacity-90 cursor-grabbing' : 'cursor-grab'
                  } ${styles.animate}`}
                  style={{
                    left: `${eq.posX}%`,
                    top: `${eq.posY}%`,
                    transform: `translate(-50%, -50%)`
                  }}
                >
                  {/* Ping Animation for HS machines */}
                  {eq.statut === 'HS' && (
                    <span className="absolute -inset-2.5 rounded-full bg-red-500/25 animate-ping" />
                  )}

                  {/* Pulsing ring around searched/highlighted match */}
                  {searchQuery && eq.nom.toLowerCase().includes(searchQuery.toLowerCase()) && (
                    <span className="absolute -inset-4 rounded-full border-2 border-dashed border-indigo-400 animate-spin-slow pointer-events-none" />
                  )}

                  {/* The visual Pin Dot */}
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center border-2 border-white shadow-md text-[9px] font-bold text-white transition-all ${
                      isSelected
                        ? 'bg-indigo-600 scale-125 ring-4 ring-indigo-500/40 z-30 border-amber-300'
                        : styles.bgColor
                    }`}
                  >
                    <Wrench size={10} />
                  </div>

                  {/* Tooltip on Hover */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform origin-top duration-150 bg-primary-950 border border-primary-800 text-white p-2 rounded-lg shadow-2xl text-[9px] font-sans font-bold whitespace-nowrap z-50 pointer-events-none space-y-1">
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${styles.bgColor}`} />
                      <span>{eq.nom}</span>
                    </div>
                    <div className="flex justify-between gap-4 font-mono text-[8px] text-primary-400">
                      <span>Ref: {eq.id}</span>
                      <span className="text-indigo-400 font-bold">{eq.atelier}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* CURRENT PLACEMENT CROSSHAIR HELP TEXT */}
            {placingEqId && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-500/90 text-white font-bold px-4 py-2 rounded-full shadow-lg pointer-events-none text-[10px] uppercase tracking-wider flex items-center gap-2">
                <Compass size={12} className="animate-spin" />
                <span>Cliquez n'importe où sur le plan de l'atelier pour implanter</span>
              </div>
            )}
          </div>

          {/* SELECTED EQUIPMENT DRAWER / MODAL DETAILS */}
          <AnimatePresence>
            {selectedEq && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-white dark:bg-primary-900 rounded-2xl border border-primary-200 dark:border-primary-800 shadow-lg p-5 flex flex-col md:flex-row gap-5 items-start justify-between relative"
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedEqId(null)}
                  className="absolute top-4 right-4 p-1.5 hover:bg-primary-100 dark:hover:bg-primary-800 text-primary-400 rounded-lg transition"
                >
                  <X size={16} />
                </button>

                {/* Left Side: General Info */}
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-full">
                      {selectedEq.atelier}
                    </span>
                    {selectedEq.critique && (
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">
                        ★ Critique
                      </span>
                    )}
                    <span className="text-[10px] bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300 px-2 py-0.5 rounded-full font-mono">
                      Ref: {selectedEq.id}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-display font-bold text-primary-800 dark:text-white truncate">
                      {selectedEq.nom}
                    </h4>
                    <p className="text-xs text-primary-400 mt-1">
                      {selectedEq.infos || "Aucune description détaillée."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 text-xs">
                    <div className="p-2 bg-primary-50 dark:bg-primary-950 rounded-lg">
                      <span className="block text-[10px] text-primary-400 font-bold uppercase">Marque</span>
                      <span className="font-bold text-primary-700 dark:text-primary-100 block mt-0.5">{selectedEq.marque}</span>
                    </div>
                    <div className="p-2 bg-primary-50 dark:bg-primary-950 rounded-lg">
                      <span className="block text-[10px] text-primary-400 font-bold uppercase">Modèle</span>
                      <span className="font-bold text-primary-700 dark:text-primary-100 block mt-0.5 truncate">{selectedEq.type}</span>
                    </div>
                    <div className="p-2 bg-primary-50 dark:bg-primary-950 rounded-lg">
                      <span className="block text-[10px] text-primary-400 font-bold uppercase">Année</span>
                      <span className="font-bold text-primary-700 dark:text-primary-100 block mt-0.5">{selectedEq.annee || 'N/A'}</span>
                    </div>
                    <div className="p-2 bg-primary-50 dark:bg-primary-950 rounded-lg">
                      <span className="block text-[10px] text-primary-400 font-bold uppercase">État</span>
                      <span className={`font-bold block mt-0.5 ${selectedEq.statut === 'HS' ? 'text-red-500' : selectedEq.statut === 'En Maintenance' ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {selectedEq.statut === 'HS' ? '🚨 HS / En Panne' : selectedEq.statut === 'En Maintenance' ? '🔧 En Maintenance' : '✅ Opérationnel'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Quick action center */}
                <div className="w-full md:w-64 space-y-3 pt-4 md:pt-0 md:pl-5 border-t md:border-t-0 md:border-l border-primary-100 dark:border-primary-800 flex flex-col justify-between self-stretch">
                  
                  {/* Status Toggle for Technicians & Managers */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-primary-400 tracking-wider block">Piloter l'État :</span>
                    <button
                      onClick={() => {
                        const nextStatus = selectedEq.statut === 'HS' ? 'Opérationnel' : 'HS';
                        onEditEquipement(selectedEq.id, { statut: nextStatus });
                      }}
                      className={`w-full py-2 px-3 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 duration-150 cursor-pointer ${
                        selectedEq.statut === 'HS'
                          ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600'
                          : 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                      }`}
                    >
                      {selectedEq.statut === 'HS' ? (
                        <>
                          <CheckCircle size={14} />
                          <span>Remettre en service (Opérationnel)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={14} />
                          <span>Déclarer en Panne (Arrêt HS)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Move coordinate button */}
                  {userRole === 'Manager' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPlacingEqId(selectedEq.id)}
                        className="text-xs font-bold py-2 px-3 bg-white dark:bg-primary-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-primary-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-primary-850 flex-1 flex items-center justify-center gap-1 transition"
                      >
                        <Move size={13} />
                        Déplacer
                      </button>
                      <button
                        onClick={() => handleUnplaceEq(selectedEq.id)}
                        className="text-xs font-bold py-2 px-3 bg-white dark:bg-primary-950 text-red-500 border border-red-100 dark:border-primary-800 rounded-xl hover:bg-red-50 dark:hover:bg-primary-850 flex items-center justify-center transition"
                        title="Désimplanter"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  {/* Link to create quick intervention */}
                  <button
                    onClick={() => {
                      setQuickOrderDesc('');
                      setShowQuickOrderForm(true);
                    }}
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition duration-200 flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Créer un Bon de Travail (BT)</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ACTIVE WORK ORDERS ON THE SELECTED EQUIPMENT */}
          {selectedEqId && activeBTsForEq.length > 0 && (
            <div className="card space-y-3 border border-primary-200 dark:border-primary-800 bg-white dark:bg-primary-900 p-5 rounded-2xl shadow-sm animate-fade-in">
              <span className="text-[10px] uppercase font-black text-amber-500 tracking-wider block flex items-center gap-1">
                <Wrench size={11} className="animate-bounce" />
                Interventions & Bons de Travail actifs sur cette machine ({activeBTsForEq.length}) :
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeBTsForEq.map(bt => (
                  <div
                    key={bt.id}
                    className="p-3 bg-primary-50/50 dark:bg-primary-950/25 border border-primary-100 dark:border-primary-800 rounded-xl flex justify-between items-start text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-primary-800 dark:text-primary-100 font-mono text-[11px]">
                          {bt.numero}
                        </span>
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full ${
                          bt.typeDoc === 'DI' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {bt.typeDoc}
                        </span>
                        <span className="text-[9px] text-red-500 font-bold">{bt.urgence}</span>
                      </div>
                      <p className="font-semibold text-primary-700 dark:text-primary-200 mt-1 truncate max-w-[180px]">
                        {bt.description.split('\n')[0]}
                      </p>
                      <span className="block text-[9px] text-primary-400 mt-0.5">
                        Statut : <strong>{bt.statut}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUICK DI/BT ORDER CREATION MODAL FORM */}
          <AnimatePresence>
            {showQuickOrderForm && selectedEq && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-2xl p-6 shadow-2xl w-full max-w-md relative text-xs"
                >
                  <button
                    onClick={() => setShowQuickOrderForm(false)}
                    className="absolute top-4 right-4 p-1.5 hover:bg-primary-100 dark:hover:bg-primary-800 text-primary-400 rounded-lg transition"
                  >
                    <X size={16} />
                  </button>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-primary-100 dark:border-primary-800">
                      <Sparkles size={16} className="text-indigo-600 animate-pulse" />
                      <div>
                        <h3 className="font-display font-bold text-sm text-primary-800 dark:text-white">
                          Nouveau Bon de Travail Rapide
                        </h3>
                        <p className="text-[10px] text-primary-400">
                          Équipement cible : <span className="font-bold text-primary-600 dark:text-primary-300">{selectedEq.nom}</span>
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleQuickOrderSubmit} className="space-y-4">
                      {/* Doc Type Toggle */}
                      <div className="space-y-1">
                        <label className="font-bold text-primary-500 uppercase tracking-wide text-[9px]">Type de Document :</label>
                        <div className="bg-primary-50 dark:bg-primary-950 p-1 rounded-lg border border-primary-200 dark:border-primary-850 flex gap-1">
                          {(['DI', 'BT'] as const).map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setQuickOrderType(t)}
                              className={`flex-1 py-1.5 rounded-md font-bold text-[10px] transition ${
                                quickOrderType === t
                                  ? 'bg-white dark:bg-primary-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-primary-200 dark:border-primary-700'
                                  : 'text-primary-500 hover:text-primary-800'
                              }`}
                            >
                              {t === 'DI' ? 'Demande d\'Intervention (DI)' : 'Bon de Travail (BT) Direct'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Urgences */}
                        <div className="space-y-1">
                          <label className="font-bold text-primary-500 uppercase tracking-wide text-[9px]">Degré d'Urgence :</label>
                          <select
                            value={quickOrderUrgence}
                            onChange={e => setQuickOrderUrgence(e.target.value)}
                            className="w-full p-2 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg text-primary-800 dark:text-primary-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="Faible (Semaine)">Faible (Semaine)</option>
                            <option value="Moyenne (48h)">Moyenne (48h)</option>
                            <option value="Haute (24h)">Haute (24h)</option>
                            <option value="Critique (Arrêt Machine)">🚨 Critique (Arrêt Machine)</option>
                          </select>
                        </div>

                        {/* Type problème / métier */}
                        <div className="space-y-1">
                          <label className="font-bold text-primary-500 uppercase tracking-wide text-[9px]">Métier / Spécialité :</label>
                          <select
                            value={quickOrderTypeProbleme}
                            onChange={e => setQuickOrderTypeProbleme(e.target.value)}
                            className="w-full p-2 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg text-primary-800 dark:text-primary-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {settings.listes.metiers.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <label className="font-bold text-primary-500 uppercase tracking-wide text-[9px]">Description de la panne ou du besoin :</label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Décrivez précisément le symptôme ou le besoin (ex: Fuite d'huile sur le vérin hydraulique principal, alarme IHM)..."
                          value={quickOrderDesc}
                          onChange={e => setQuickOrderDesc(e.target.value)}
                          className="w-full p-2 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg text-primary-800 dark:text-primary-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none text-[11px]"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setShowQuickOrderForm(false)}
                          className="px-4 py-2 border border-primary-200 dark:border-primary-800 hover:bg-primary-50 dark:hover:bg-primary-950 text-primary-600 rounded-xl font-bold"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow"
                        >
                          Créer l'Intervention
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
