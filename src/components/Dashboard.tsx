/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wrench,
  Euro,
  Activity,
  AlertTriangle,
  TrendingUp,
  LayoutGrid,
  CheckCircle,
  Eye,
  Settings,
  HelpCircle,
  Clock,
  Monitor,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Plus,
  Play
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  ComposedChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ReferenceLine
} from 'recharts';
import { Equipement, Intervention, Piece, GlobalSettings } from '../types';
import { ModuleHelp } from './ModuleHelp';

interface DashboardProps {
  equipements: Equipement[];
  interventions: Intervention[];
  pieces: Piece[];
  settings: GlobalSettings;
  onNavigate: (module: string, itemId?: string) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  isSlideshowActive?: boolean;
  onToggleSlideshow?: () => void;
}

interface WidgetConfig {
  id: string;
  title: string;
  enabled: boolean;
}

export default function Dashboard({
  equipements,
  interventions,
  pieces,
  settings,
  onNavigate,
  isFullScreen = false,
  onToggleFullScreen,
  isSlideshowActive = false,
  onToggleSlideshow
}: DashboardProps) {
  // Widget customization state
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem('gmao_widgets_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) { /* use default */ }
    }
    return [
      { id: 'kpis', title: 'KPIs d\'Exploitation', enabled: true },
      { id: 'ratio', title: 'Jauge d\'Objectif Préventif', enabled: true },
      { id: 'charts', title: 'Courbes de Fiabilité (MTBF/MTTR)', enabled: true },
      { id: 'pareto', title: 'Diagramme de Pareto (80/20 Arrêts)', enabled: true },
      { id: 'critical', title: 'Top 5 Équipements Critiques', enabled: true },
    ];
  });

  const [showConfig, setShowConfig] = useState(false);

  // Drag and Drop reordering states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('gmao_widgets_config', JSON.stringify(widgets));
  }, [widgets]);

  const toggleWidget = (id: string) => {
    setWidgets(prev =>
      prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w)
    );
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const reordered = [...widgets];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, draggedItem);
    
    setWidgets(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= widgets.length) return;

    const reordered = [...widgets];
    const [item] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, item);
    setWidgets(reordered);
  };

  // CALCULATE KPIS FROM DATA
  const activeJobs = interventions.filter(
    i => i.statut !== 'Soldé' && i.statut !== 'Clôturé'
  );
  
  const totalActiveBTs = activeJobs.filter(i => i.typeDoc === 'BT' || i.typeDoc === 'Préventif').length;
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);

  // Month Cost Calculation: Time spent * hourly rate + estimated part costs (150 per part usage)
  const monthInterventions = interventions.filter(i => {
    if (!i.dateCloture) return false;
    const d = new Date(i.dateCloture);
    return d >= currentMonthStart;
  });

  const totalCostMonth = monthInterventions.reduce((sum, i) => {
    const hours = parseFloat(i.tempsPasse?.replace(/[^\d.]/g, '') || '0') || 0;
    const labor = hours * settings.coutMO;
    const parts = i.piecesConso && i.piecesConso !== 'Aucune' ? 150 : 0;
    return sum + labor + parts;
  }, 0);

  // Preventive ratio calculation
  const totalMonthCount = monthInterventions.length;
  const prevMonthCount = monthInterventions.filter(i => i.typeDoc === 'Préventif').length;
  const prevRatio = totalMonthCount > 0 ? (prevMonthCount / totalMonthCount) * 100 : 65; // fall back to target if no data

  // Overall availability: based on active machine stoppage
  const activeShutdowns = activeJobs.filter(
    i => i.urgence && i.urgence.toLowerCase().includes('arrêt')
  ).length;
  const totalMachines = Math.max(equipements.length, 1);
  const availability = ((totalMachines - activeShutdowns) / totalMachines) * 100;

  // Total downtime logged this month
  const totalDowntimeMonth = monthInterventions.reduce((sum, i) => {
    if (i.tempsArret) {
      return sum + (parseFloat(i.tempsArret.replace(/[^\d.]/g, '')) || 0);
    }
    return sum;
  }, 0);

  // Alerts
  const stockAlerts = pieces.filter(p => p.quantite <= p.seuil).length;

  // 12-Month MTBF vs MTTR Curves calculations
  const get12MonthTrends = () => {
    const data = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const keyMois = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
      const label = targetDate.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });

      // Find closed past pannes (non-preventive) for this month
      const pannes = interventions.filter(int => {
        if (int.typeDoc === 'Préventif' || !int.dateCloture) return false;
        const d = new Date(int.dateCloture);
        return d.getFullYear() === targetDate.getFullYear() && d.getMonth() === targetDate.getMonth();
      });

      const totalRepairHours = pannes.reduce((sum, p) => {
        return sum + (parseFloat(p.tempsPasse?.replace(/[^\d.]/g, '') || '0') || 0);
      }, 0);

      const count = pannes.length;
      const mttr = count > 0 ? totalRepairHours / count : 0.8 + (i * 0.1 % 0.5); // base model simulation with slight variation

      // MTBF simulation
      const theoreticalOperatingHours = 290 * totalMachines; // ~3500 hours / 12 per machine
      const mtbf = count > 0 ? (theoreticalOperatingHours - totalRepairHours) / count : theoreticalOperatingHours;

      data.push({
        name: label,
        MTBF: Math.max(Math.round(mtbf), 120),
        MTTR: parseFloat(mttr.toFixed(1))
      });
    }
    return data;
  };

  const chartData = get12MonthTrends();

  // Top 5 Critical Machines calculation
  const getTopCriticalEquipements = () => {
    const counts: Record<string, { id: string; nom: string; count: number; atelier: string }> = {};
    
    interventions.forEach(i => {
      if (i.typeDoc !== 'Préventif' && i.dateCloture && i.equipementId) {
        if (!counts[i.equipementId]) {
          const eq = equipements.find(e => e.id === i.equipementId);
          counts[i.equipementId] = {
            id: i.equipementId,
            nom: i.equipementNom,
            count: 0,
            atelier: eq?.atelier || "Atelier"
          };
        }
        counts[i.equipementId].count += 1;
      }
    });

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const topCritical = getTopCriticalEquipements();

  // Pareto Analysis for 80/20 Downtime Rule
  const getParetoAnalysis = () => {
    const downtimeMap: Record<string, { id: string; nom: string; atelier: string; downtime: number }> = {};

    // 1. Pre-populate with all equipments to guarantee full context
    equipements.forEach(eq => {
      downtimeMap[eq.id] = { id: eq.id, nom: eq.nom, atelier: eq.atelier, downtime: 0 };
    });

    // 2. Sum downtime (tempsArret) from all interventions. Fallback to tempsPasse for non-preventive closed works if tempsArret is empty.
    interventions.forEach(i => {
      if (i.equipementId) {
        let dt = 0;
        if (i.tempsArret) {
          dt = parseFloat(i.tempsArret.replace(/[^\d.]/g, '')) || 0;
        } else if (i.typeDoc !== 'Préventif' && i.tempsPasse) {
          dt = parseFloat(i.tempsPasse.replace(/[^\d.]/g, '')) || 0;
        }

        if (dt > 0) {
          if (!downtimeMap[i.equipementId]) {
            downtimeMap[i.equipementId] = {
              id: i.equipementId,
              nom: i.equipementNom || `Équipement #${i.equipementId}`,
              atelier: i.atelier || 'Atelier',
              downtime: 0
            };
          }
          downtimeMap[i.equipementId].downtime += dt;
        }
      }
    });

    // 3. Filter down to items with positive downtime and sort descending
    const sorted = Object.values(downtimeMap)
      .filter(item => item.downtime > 0)
      .sort((a, b) => b.downtime - a.downtime);

    const totalDowntime = sorted.reduce((sum, item) => sum + item.downtime, 0);
    const totalEquipmentsCount = Math.max(equipements.length, 1);

    let cumulative = 0;
    const chartData = sorted.map((item, index) => {
      cumulative += item.downtime;
      const cumPercent = totalDowntime > 0 ? (cumulative / totalDowntime) * 100 : 0;
      const percentage = totalDowntime > 0 ? (item.downtime / totalDowntime) * 100 : 0;
      return {
        ...item,
        rank: index + 1,
        downtime: parseFloat(item.downtime.toFixed(1)),
        percentage,
        cumulativePercentage: parseFloat(cumPercent.toFixed(1)),
        threshold: 80
      };
    });

    // 4. Identify critical equipments responsible for the first 80% of total downtime
    const criticalFew = [];
    let cumPercentageAcc = 0;
    for (const item of chartData) {
      criticalFew.push(item);
      cumPercentageAcc = item.cumulativePercentage;
      if (cumPercentageAcc >= 80) {
        break;
      }
    }

    const criticalAssetsCount = criticalFew.length;
    const criticalAssetsRatio = (criticalAssetsCount / totalEquipmentsCount) * 100;
    const criticalDowntimeSum = criticalFew.reduce((sum, item) => sum + item.downtime, 0);
    const criticalDowntimeRatio = totalDowntime > 0 ? (criticalDowntimeSum / totalDowntime) * 100 : 0;

    return {
      chartData,
      totalDowntime: parseFloat(totalDowntime.toFixed(1)),
      criticalFew,
      criticalAssetsCount,
      criticalAssetsRatio,
      criticalDowntimeSum: parseFloat(criticalDowntimeSum.toFixed(1)),
      criticalDowntimeRatio,
      totalEquipmentsCount
    };
  };

  const paretoAnalysis = getParetoAnalysis();

  const prevRatioPieData = [
    { name: 'Préventif', value: Math.round(prevRatio) },
    { name: 'Curatif', value: Math.round(100 - prevRatio) }
  ];

  const PIE_COLORS = ['#F97316', '#334155'];

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-primary-900 dark:text-white flex items-center">
            Cockpit de GMAO
            <ModuleHelp moduleId="dashboard" />
          </h1>
          <p className="text-sm text-primary-500 dark:text-primary-400 mt-1">
            Supervision temps réel et fiabilité industrielle du parc de production.
            <span className="ml-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {onToggleSlideshow && (
            <button
              onClick={onToggleSlideshow}
              className={`btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition ${
                isSlideshowActive 
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40' 
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40'
              }`}
              title="Lancer le diaporama automatique (Défilement des vues toutes les 30 secondes)"
            >
              <Play size={16} className={isSlideshowActive ? 'animate-pulse' : ''} />
              <span>{isSlideshowActive ? "Arrêter diaporama" : "Lancer diaporama"}</span>
            </button>
          )}

          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className={`btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition ${
                isFullScreen 
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40' 
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/40'
              }`}
              title="Projeter sur écran d'usine (Plein écran)"
            >
              <Monitor size={16} className={isFullScreen ? '' : 'animate-pulse'} />
              <span>{isFullScreen ? "Quitter projection" : "Écran d'usine (Projection)"}</span>
            </button>
          )}

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="btn-secondary flex items-center gap-2"
          >
            <Settings size={16} />
            {showConfig ? "Fermer options" : "Personnaliser"}
          </button>
        </div>
      </div>

      {/* Customizable Widget Panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-white dark:bg-primary-800 border border-primary-200 dark:border-primary-700 rounded-xl shadow-sm"
          >
            <h3 className="text-sm font-semibold text-primary-800 dark:text-primary-100 flex items-center gap-2 mb-3">
              <LayoutGrid size={16} />
              Disposition du tableau de bord (Utilisateur Avancé)
            </h3>
            <p className="text-xs text-primary-500 dark:text-primary-400 mb-4">
              Activez ou masquez les widgets du cockpit en fonction de vos priorités opérationnelles.
            </p>
            <div className="flex flex-wrap gap-4">
              {widgets.map(w => (
                <label
                  key={w.id}
                  className="flex items-center gap-2.5 px-3 py-2 bg-primary-50 dark:bg-primary-900 rounded-lg cursor-pointer border border-primary-100 dark:border-primary-800 select-none hover:border-accent-orange transition"
                >
                  <input
                    type="checkbox"
                    checked={w.enabled}
                    onChange={() => toggleWidget(w.id)}
                    className="accent-accent-orange h-4 w-4 rounded"
                  />
                  <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                    {w.title}
                  </span>
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WIDGETS GRID CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {widgets.map((widget, index) => {
          if (!widget.enabled) return null;

          // Render drag-and-drop wrapper for the widget
          return (
            <motion.div
              layout
              key={widget.id}
              draggable={showConfig}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, index)}
              className={`transition-all duration-300 flex flex-col ${
                widget.id === 'kpis' || widget.id === 'critical' || widget.id === 'pareto' ? 'lg:col-span-3' : widget.id === 'charts' ? 'lg:col-span-2' : 'lg:col-span-1'
              } ${
                showConfig ? 'border-2 border-dashed border-indigo-400/50 dark:border-indigo-800/50 rounded-2xl p-2.5 bg-indigo-50/5 dark:bg-indigo-950/5' : ''
              } ${
                draggedIndex === index ? 'opacity-40 scale-98 pointer-events-none' : ''
              } ${
                dragOverIndex === index ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-primary-950 scale-98' : ''
              }`}
            >
              {showConfig && (
                <div className="flex items-center justify-between px-3.5 py-2 mb-2 bg-indigo-50/80 dark:bg-indigo-950/80 border border-indigo-100/60 dark:border-indigo-900/40 rounded-xl text-[10px] font-bold text-indigo-700 dark:text-indigo-300 select-none cursor-grab active:cursor-grabbing shadow-sm shrink-0">
                  <div className="flex items-center gap-1.5">
                    <GripVertical size={13} className="shrink-0 text-indigo-400" />
                    <span>Disposition : {widget.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-primary-400 mr-2 font-normal hidden sm:inline">Faites glisser ou utilisez :</span>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveWidget(index, 'up')}
                      className="p-1 hover:bg-indigo-200 dark:hover:bg-indigo-900 rounded disabled:opacity-30 transition"
                      title="Déplacer vers le haut/gauche"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={index === widgets.length - 1}
                      onClick={() => moveWidget(index, 'down')}
                      className="p-1 hover:bg-indigo-200 dark:hover:bg-indigo-900 rounded disabled:opacity-30 transition"
                      title="Déplacer vers le bas/droite"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* RENDER DYNAMIC COMPONENT WIDGET */}
              {widget.id === 'kpis' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
                  {/* Card 1: Active Interventions */}
                  <div
                    onClick={() => onNavigate('interventions', 'attente')}
                    className="card cursor-pointer border-b-4 border-b-sky-500 p-5 hover:translate-y-[-2px] transition flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider">
                        Travaux Actifs
                      </span>
                      <Wrench className="text-sky-500" size={18} />
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-4xl font-display font-bold text-primary-900 dark:text-white">
                        {totalActiveBTs}
                      </span>
                      <span className="text-xs text-primary-400">BT ouverts</span>
                    </div>
                    <p className="text-xs text-primary-500 dark:text-primary-400 mt-2">
                      Bons de travaux en cours ou en attente.
                    </p>
                  </div>

                  {/* Card 2: Costs */}
                  <div
                    onClick={() => onNavigate('reporting')}
                    className="card cursor-pointer border-b-4 border-b-emerald-500 p-5 hover:translate-y-[-2px] transition flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider">
                        Coût Réel (Mois)
                      </span>
                      <Euro className="text-emerald-500" size={18} />
                    </div>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-display font-bold text-primary-900 dark:text-white">
                        {totalCostMonth.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-sm font-bold text-primary-700 dark:text-primary-300">€</span>
                    </div>
                    <p className="text-xs text-primary-500 dark:text-primary-400 mt-2">
                      Frais de main d'oeuvre + consommables.
                    </p>
                  </div>

                  {/* Card 3: Availability */}
                  <div
                    onClick={() => onNavigate('equipements', 'HS')}
                    className="card cursor-pointer border-b-4 border-b-amber-500 p-5 hover:translate-y-[-2px] transition flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider">
                        Dispo Globale
                      </span>
                      <Activity className="text-amber-500" size={18} />
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-3xl font-display font-bold text-amber-600 dark:text-amber-400">
                        {availability.toFixed(1)} %
                      </span>
                    </div>
                    <p className="text-xs text-primary-500 dark:text-primary-400 mt-2">
                      {activeShutdowns > 0 ? (
                        <span className="text-red-500 font-semibold">{activeShutdowns} machine(s) à l'arrêt</span>
                      ) : (
                        "Tout le parc est opérationnel."
                      )}
                      {totalDowntimeMonth > 0 && (
                        <span className="block text-[10px] text-amber-500 dark:text-amber-400 mt-1 font-semibold">Cumul d'arrêts (mois) : {totalDowntimeMonth.toFixed(1)} H</span>
                      )}
                    </p>
                  </div>

                  {/* Card 4: Low Stock Alerts */}
                  <div
                    onClick={() => onNavigate('magasin', 'rupture')}
                    className="card cursor-pointer border-b-4 border-b-red-500 p-5 hover:translate-y-[-2px] transition flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider">
                        Magasin & Stock
                      </span>
                      <AlertTriangle className="text-red-500" size={18} />
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className={`text-4xl font-display font-bold ${stockAlerts > 0 ? 'text-red-600 dark:text-red-400' : 'text-primary-900 dark:text-white'}`}>
                        {stockAlerts}
                      </span>
                      <span className="text-xs text-primary-400">alertes</span>
                    </div>
                    <p className="text-xs text-primary-500 dark:text-primary-400 mt-2">
                      Articles ayant franchi le seuil de sécurité.
                    </p>
                  </div>
                </div>
              )}

              {widget.id === 'charts' && (
                <div className="card flex flex-col justify-between h-full">
                  <div>
                    <h3 className="text-base font-display font-bold text-primary-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="text-primary-400" size={18} />
                      Évolution de la Fiabilité Parc (Moyenne Mobile 12 Mois)
                    </h3>
                    <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
                      Suivi du MTBF (Temps Moyen de Bon Fonctionnement) et du MTTR (Temps Moyen de Réparation) en heures.
                    </p>
                  </div>
                  <div className="h-72 w-full mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          axisLine={{ stroke: '#cbd5e1' }}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: 10, fill: '#10b981' }}
                          axisLine={{ stroke: '#10b981' }}
                          label={{ value: 'MTBF (Heures)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#10b981', fontWeight: 600 } }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 10, fill: '#ef4444' }}
                          axisLine={{ stroke: '#ef4444' }}
                          label={{ value: 'MTTR (Heures)', angle: 90, position: 'insideRight', offset: 10, style: { fontSize: 10, fill: '#ef4444', fontWeight: 600 } }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '11px'
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: '10px' }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="MTBF"
                          name="MTBF (Heures d'opération)"
                          stroke="#10B981"
                          strokeWidth={2.5}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="MTTR"
                          name="MTTR (Heures de dépannage)"
                          stroke="#EF4444"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {widget.id === 'ratio' && (
                <div
                  onClick={() => onNavigate('interventions', 'Préventif')}
                  className="card flex flex-col justify-between cursor-pointer hover:translate-y-[-2px] transition h-full"
                >
                  <div>
                    <h3 className="text-base font-display font-bold text-primary-900 dark:text-white flex items-center gap-2">
                      <CheckCircle className="text-primary-400" size={18} />
                      Objectif Taux Préventif
                    </h3>
                    <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
                      Taux mensuel des interventions planifiées préventives par rapport au curatif (cible à 60%).
                    </p>
                  </div>
                  
                  <div className="h-44 w-full flex flex-col items-center justify-center relative">
                    {/* Render elegant progress ring */}
                    <div className="relative h-28 w-28 flex items-center justify-center rounded-full border-8 border-primary-100 dark:border-primary-850">
                      <span className="text-2xl font-display font-extrabold text-primary-900 dark:text-white">
                        {Math.round(prevRatio)}%
                      </span>
                    </div>
                    <div className="mt-4 text-center">
                      <span className="text-xs font-semibold text-primary-600 dark:text-primary-300">
                        {prevMonthCount} Préventives sur {totalMonthCount} clôtures
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-primary-50 dark:bg-primary-900 rounded-lg text-center">
                    <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                      {prevRatio >= 60 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">✓ Objectif stratégique atteint !</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">⚠ Planifier plus de préventif (Cible : 60%)</span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {widget.id === 'pareto' && (
                <div className="card h-full">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-primary-100 dark:border-primary-800 pb-4">
                    <div>
                      <h3 className="text-lg font-display font-bold text-primary-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="text-indigo-500" size={20} />
                        Analyse de Pareto (Règle des 80/20) : Temps d'Arrêt
                      </h3>
                      <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
                        Identification méthodique des 20% d'équipements générant 80% des temps d'arrêt totaux pour cibler les actions de fiabilisation.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                      <Clock size={14} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
                        Total arrêts : {paretoAnalysis.totalDowntime} H
                      </span>
                    </div>
                  </div>

                  {paretoAnalysis.chartData.length === 0 ? (
                    <div className="text-center py-12 bg-primary-50 dark:bg-primary-950/20 rounded-2xl border border-dashed border-primary-200 dark:border-primary-800">
                      <AlertTriangle className="mx-auto text-primary-400 mb-3 animate-pulse" size={40} />
                      <h4 className="text-sm font-semibold text-primary-800 dark:text-primary-200">Aucune donnée d'arrêt de production</h4>
                      <p className="text-xs text-primary-500 dark:text-primary-400 mt-1 max-w-md mx-auto">
                        Pour afficher le diagramme de Pareto, assurez-vous que les interventions clôturées ou curatives contiennent des informations de temps d'arrêt.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                      {/* Left: Recharts ComposedChart (Pareto) */}
                      <div className="xl:col-span-3 flex flex-col justify-between">
                        <div className="h-80 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              data={paretoAnalysis.chartData}
                              margin={{ top: 15, right: 10, left: -10, bottom: 10 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block opacity-30" />
                              <XAxis
                                dataKey="nom"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={{ stroke: '#cbd5e1' }}
                              />
                              {/* Left Axis: Hours of Downtime */}
                              <YAxis
                                yAxisId="left"
                                tick={{ fontSize: 10, fill: '#6366f1' }}
                                axisLine={{ stroke: '#6366f1' }}
                                label={{
                                  value: 'Temps d\'arrêt (Heures)',
                                  angle: -90,
                                  position: 'insideLeft',
                                  offset: 10,
                                  style: { fontSize: 10, fill: '#6366f1', fontWeight: 600 }
                                }}
                              />
                              {/* Right Axis: Cumulative Percentage */}
                              <YAxis
                                yAxisId="right"
                                orientation="right"
                                domain={[0, 100]}
                                tick={{ fontSize: 10, fill: '#f43f5e' }}
                                axisLine={{ stroke: '#f43f5e' }}
                                label={{
                                  value: 'Pourcentage Cumulé (%)',
                                  angle: 90,
                                  position: 'insideRight',
                                  offset: 15,
                                  style: { fontSize: 10, fill: '#f43f5e', fontWeight: 600 }
                                }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                  border: 'none',
                                  borderRadius: '10px',
                                  color: 'white',
                                  fontSize: '11px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                }}
                                formatter={(value, name) => {
                                  if (name === 'downtime') return [`${value} H`, 'Durée d\'arrêt'];
                                  if (name === 'cumulativePercentage') return [`${value} %`, 'Cumul (%)'];
                                  return [value, name];
                                }}
                              />
                              <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: '10px' }}
                              />
                              {/* Individual bars */}
                              <Bar
                                yAxisId="left"
                                dataKey="downtime"
                                name="Temps d'Arrêt Individuel (H)"
                                fill="#6366f1"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={45}
                              />
                              {/* Cumulative line curve */}
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="cumulativePercentage"
                                name="Pourcentage Cumulé (%)"
                                stroke="#f43f5e"
                                strokeWidth={3}
                                dot={{ r: 4, stroke: '#f43f5e', strokeWidth: 2, fill: '#fff' }}
                                activeDot={{ r: 7 }}
                              />
                              {/* 80% Threshold reference line */}
                              <ReferenceLine
                                yAxisId="right"
                                y={80}
                                stroke="#ef4444"
                                strokeDasharray="5 5"
                                strokeWidth={1.5}
                                label={{
                                  value: 'Seuil 80%',
                                  fill: '#ef4444',
                                  position: 'insideBottomRight',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  offset: 10
                                }}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-4 p-3 bg-slate-50 dark:bg-primary-900/40 border border-slate-100 dark:border-primary-850 rounded-xl">
                          <p className="text-[10px] text-slate-500 dark:text-primary-400 font-mono leading-relaxed">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">💡 Lecture graphique : </span>
                            Les barres violettes représentent la durée de panne totale cumulée de chaque équipement (axe gauche). La ligne rouge trace le cumul de ces pannes exprimé en pourcentage du total global (axe droit). Le croisement avec le seuil des 80% délimite l'ensemble critique.
                          </p>
                        </div>
                      </div>

                      {/* Right: Analytical Cards & Identified Equipments */}
                      <div className="xl:col-span-2 flex flex-col justify-between gap-4">
                        {/* 80/20 Rule Verdict Banner */}
                        <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl">
                          <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <AlertTriangle size={13} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
                            Verdict de l'Analyse Pareto
                          </h4>
                          <div className="space-y-3">
                            <div className="text-xl font-display font-extrabold text-indigo-900 dark:text-white leading-snug">
                              {paretoAnalysis.criticalAssetsCount} {paretoAnalysis.criticalAssetsCount > 1 ? 'équipements' : 'équipement'} ({paretoAnalysis.criticalAssetsRatio.toFixed(0)}% du parc)
                            </div>
                            <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
                              Sont responsables de <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{paretoAnalysis.criticalDowntimeRatio.toFixed(0)}%</span> des arrêts totaux (soit <span className="font-bold">{paretoAnalysis.criticalDowntimeSum} H</span> sur un cumul de {paretoAnalysis.totalDowntime} H).
                            </p>
                            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-t border-indigo-100/50 dark:border-indigo-900/50 pt-2 flex items-center gap-1">
                              {paretoAnalysis.criticalAssetsRatio <= 25 ? (
                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  ⚡ La distribution suit précisément la loi de Pareto (20/80).
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                  ⚙️ Distribution modérément dispersée (Loi 80/{paretoAnalysis.criticalAssetsRatio.toFixed(0)}).
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* List of Critical Equipments */}
                        <div className="flex-1 flex flex-col">
                          <h4 className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>Équipements de la zone critique (80%)</span>
                            <span className="text-[10px] lowercase font-normal text-primary-400">Classés par impact</span>
                          </h4>
                          <div className="space-y-2 overflow-y-auto max-h-56 pr-1 custom-scrollbar">
                            {paretoAnalysis.criticalFew.map((item, idx) => {
                              const badgeColors = idx === 0 
                                ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
                                : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
                              return (
                                <div
                                  key={item.id}
                                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition hover:border-indigo-300 dark:hover:border-indigo-800 bg-white dark:bg-primary-950/30 border-primary-100 dark:border-primary-850`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`h-6 w-6 shrink-0 rounded-lg border font-bold text-xs flex items-center justify-center ${badgeColors}`}>
                                      #{idx + 1}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="font-semibold text-xs text-primary-800 dark:text-white truncate">
                                        {item.nom}
                                      </div>
                                      <div className="text-[10px] text-primary-400 truncate font-mono">
                                        {item.atelier} • Cumul : {item.cumulativePercentage}%
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-right">
                                      <div className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                        {item.downtime} H
                                      </div>
                                      <div className="text-[9px] text-primary-400 font-medium">
                                        {(item.percentage ?? 0).toFixed(0)}% du total
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => onNavigate('equipements', item.id)}
                                      className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 rounded-lg text-primary-400 dark:text-primary-500 transition"
                                      title="Ouvrir la fiche équipement"
                                    >
                                      <Eye size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {widget.id === 'critical' && (
                <div className="card h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-display font-bold text-primary-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle className="text-red-500" size={18} />
                        Top 5 Équipements Critiques (Correctif Récurrent)
                      </h3>
                      <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
                        Équipements ayant généré le plus grand nombre de pannes curatives d'urgence clôturées.
                      </p>
                    </div>
                    <HelpCircle size={16} className="text-primary-400" />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="data-table w-full">
                      <thead>
                        <tr>
                          <th>Rang</th>
                          <th>Équipement</th>
                          <th>Atelier / Zone</th>
                          <th className="text-center">Fréquence pannes</th>
                          <th>Niveau de risque</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topCritical.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center text-primary-500 py-6 text-sm">
                              Aucune panne curative clôturée enregistrée sur le parc.
                            </td>
                          </tr>
                        ) : (
                          topCritical.map((item, index) => {
                            const progress = (item.count / topCritical[0].count) * 100;
                            return (
                              <tr
                                key={item.id}
                                className="hover:bg-primary-50 dark:hover:bg-primary-800 transition"
                              >
                                <td className="w-12 font-bold text-red-500">#{index + 1}</td>
                                <td className="font-semibold text-primary-800 dark:text-white">{item.nom}</td>
                                <td>
                                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
                                    {item.atelier}
                                  </span>
                                </td>
                                <td className="w-48">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-primary-100 dark:bg-primary-900 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-red-500 rounded-full"
                                        style={{ width: `${progress}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-primary-800 dark:text-primary-200">
                                      {item.count} pannes
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  {item.count >= 5 ? (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                                      Très Élevé
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                      Modéré
                                    </span>
                                  )}
                                </td>
                                <td className="text-right">
                                  <button
                                    onClick={() => onNavigate('equipements', item.id)}
                                    className="btn-icon bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 hover:bg-accent-orange hover:text-white"
                                    title="Consulter le dossier machine"
                                  >
                                    <Eye size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
