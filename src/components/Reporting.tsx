/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Wrench,
  Euro,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  ChevronUp,
  Filter,
  Layers,
  Sparkles,
  Info,
  Calendar,
  CheckCircle,
  Activity,
  FileText,
  Loader2,
  X,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  Download,
  Package,
  Mail,
  Trash2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Equipement, Intervention, Piece, GlobalSettings, GammePreventive, Compteur } from '../types';
import { ModuleHelp } from './ModuleHelp';

interface ReportingProps {
  equipements: Equipement[];
  interventions: Intervention[];
  pieces: Piece[];
  settings: GlobalSettings;
  gammes?: GammePreventive[];
  compteurs?: Compteur[];
  onAddIntervention?: (payload: Omit<Intervention, 'id' | 'dateCreation'>) => void;
  onAddCompteur?: (payload: Omit<Compteur, 'id' | 'dateReleve'>) => void;
}

type SortField = 'nom' | 'failures' | 'cost' | 'mtbf' | 'mttr' | 'availability';
type SortOrder = 'asc' | 'desc';

// Helper to estimate consumed pieces cost
const getPiecesConsoCost = (piecesConsoStr: string | undefined, piecesList: Piece[]): number => {
  if (!piecesConsoStr || piecesConsoStr === 'Aucune' || piecesConsoStr === '') return 0;
  let total = 0;
  const items = piecesConsoStr.split(',');
  for (const item of items) {
    const trimmed = item.trim();
    // Match "Name xQuantity" or similar
    const match = trimmed.match(/(.+)\s+x\s*(\d+)/i) || trimmed.match(/(.+)\s+(\d+)\s*$/);
    if (match) {
      const name = match[1].trim();
      const qte = parseInt(match[2]) || 1;
      // Search in pieces
      const piece = piecesList.find(
        p => p.designation.toLowerCase() === name.toLowerCase() || 
             p.codeArticle.toLowerCase() === name.toLowerCase()
      );
      const price = piece ? piece.prix : 45; // Default fallback to 45 EUR per item
      total += price * qte;
    } else {
      total += 45; // default fallback
    }
  }
  return total;
};

// Helper to extract hours as number
const parseHours = (hoursStr: string | undefined): number => {
  if (!hoursStr) return 0;
  return parseFloat(hoursStr.replace(/[^\d.]/g, '')) || 0;
};

export default function Reporting({
  equipements,
  interventions,
  pieces,
  settings,
  gammes = [],
  compteurs = [],
  onAddIntervention,
  onAddCompteur
}: ReportingProps) {
  // State filters
  const [period, setPeriod] = useState<'3' | '6' | '12' | 'custom' | 'all'>('6');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedAtelier, setSelectedAtelier] = useState<string>('all');
  const [selectedCriticite, setSelectedCriticite] = useState<'all' | 'critique' | 'standard'>('all');
  
  // Sort state for equipment table
  const [sortField, setSortField] = useState<SortField>('failures');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Search in table
  const [tableSearch, setTableSearch] = useState('');
  
  // PDF Export loading state
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Audit Report States
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isGeneratingAudit, setIsGeneratingAudit] = useState(false);
  const [isExportingAuditPDF, setIsExportingAuditPDF] = useState(false);
  const [activeAuditTab, setActiveAuditTab] = useState<'synthesis' | 'failures' | 'availability' | 'stocks' | 'plan'>('synthesis');

  // Advanced Visual Reporting States
  const [chartMetric, setChartMetric] = useState<'costs' | 'volume' | 'hours'>('costs');
  const [rightPanelTab, setRightPanelTab] = useState<'gauge' | 'trend'>('gauge');
  const [selectedChartTech, setSelectedChartTech] = useState<string | null>(null);
  const [activeKpiFilter, setActiveKpiFilter] = useState<'all' | 'availability' | 'failures' | 'cost'>('all');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Predictive Maintenance States
  const [activeSectionTab, setActiveSectionTab] = useState<'performance' | 'predictive' | 'pareto'>('performance');
  
  // Pareto Analysis States
  const [paretoMetric, setParetoMetric] = useState<'count' | 'failures' | 'cost'>('count');
  const [selectedParetoEqForBT, setSelectedParetoEqForBT] = useState<any>(null);
  const [paretoBtDescription, setParetoBtDescription] = useState('');
  const [paretoBtUrgence, setParetoBtUrgence] = useState('Standard');

  const [predictiveFilter, setPredictiveFilter] = useState<'all' | 'critical' | 'warning' | 'secure'>('all');
  const [predictiveSearch, setPredictiveSearch] = useState('');
  const [selectedAlertForBT, setSelectedAlertForBT] = useState<any>(null);
  const [updatingCounterEqId, setUpdatingCounterEqId] = useState<string | null>(null);
  const [newCounterValue, setNewCounterValue] = useState<number>(0);
  const [newCounterUnit, setNewCounterUnit] = useState<string>('H');
  const [btDescriptionOverride, setBtDescriptionOverride] = useState('');
  const [btUrgenceOverride, setBtUrgenceOverride] = useState('Critique');

  // PDF Signature States
  const [signatureTechnician, setSignatureTechnician] = useState('Jean Dupont');
  const [signatureSupervisor, setSignatureSupervisor] = useState('Marc-Antoine Laurent');
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split('T')[0]);
  const [signatureComments, setSignatureComments] = useState("Le bilan analytique de performance est validé. Les recommandations pour l'ajustement du stock de sécurité des pièces de rechange et les actions préventives planifiées sont approuvées pour exécution immédiate.");
  const [signatureApproved, setSignatureApproved] = useState(true);

  // Automatic Email Scheduling States
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isTestingSend, setIsTestingSend] = useState(false);
  const [scheduleStatusMessage, setScheduleStatusMessage] = useState<string | null>(null);
  const [scheduleConfig, setScheduleConfig] = useState(() => {
    const saved = localStorage.getItem('gmaopro_report_schedule');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing schedule config", e);
      }
    }
    return {
      active: true,
      emails: "m.laurent@gmaopro.com, d.production@gmaopro.com",
      dayOfWeek: "Lundi",
      time: "08:00",
      includeKpis: true,
      includeEquipments: true,
      includeParts: true,
      includePreventive: true,
      customMessage: "Bonjour,\n\nVeuillez trouver ci-joint le rapport hebdomadaire d'analyse de performance et de fiabilité des équipements pour notre usine.",
      history: [
        { id: 'h-1', date: '2026-06-29T08:00:00.000Z', status: 'Success', recipients: "m.laurent@gmaopro.com, d.production@gmaopro.com", trigger: 'Auto' },
        { id: 'h-2', date: '2026-06-22T08:00:00.000Z', status: 'Success', recipients: "m.laurent@gmaopro.com, d.production@gmaopro.com", trigger: 'Auto' },
        { id: 'h-3', date: '2026-06-15T08:00:00.000Z', status: 'Success', recipients: "m.laurent@gmaopro.com, d.production@gmaopro.com", trigger: 'Auto' }
      ]
    };
  });

  const handleSaveSchedule = (updatedConfig: typeof scheduleConfig) => {
    setScheduleConfig(updatedConfig);
    localStorage.setItem('gmaopro_report_schedule', JSON.stringify(updatedConfig));
    setScheduleStatusMessage("Planification enregistrée avec succès !");
    setTimeout(() => setScheduleStatusMessage(null), 4000);
  };

  const handleTestSend = async () => {
    setIsTestingSend(true);
    setScheduleStatusMessage(null);
    // Mimic processing/compiling PDF
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add new history entry
    const newEntry = {
      id: `h-test-${Date.now()}`,
      date: new Date().toISOString(),
      status: 'Success' as const,
      recipients: scheduleConfig.emails,
      trigger: 'Test' as const
    };
    const updatedHistory = [newEntry, ...scheduleConfig.history];
    const updatedConfig = {
      ...scheduleConfig,
      history: updatedHistory
    };
    
    setScheduleConfig(updatedConfig);
    localStorage.setItem('gmaopro_report_schedule', JSON.stringify(updatedConfig));
    setIsTestingSend(false);
    setScheduleStatusMessage("Rapport d'essai envoyé avec succès par email aux responsables !");
    setTimeout(() => setScheduleStatusMessage(null), 5000);
  };

  // Extract unique ateliers dynamically
  const listAteliers = useMemo(() => {
    const ateliers = new Set<string>();
    equipements.forEach(eq => {
      if (eq.atelier) ateliers.add(eq.atelier);
    });
    return Array.from(ateliers);
  }, [equipements]);

  // Filter interventions & equipments based on selections
  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    if (period !== 'all' && period !== 'custom') {
      const months = parseInt(period);
      startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);
    } else if (period === 'custom') {
      if (customStartDate) {
        startDate = new Date(customStartDate);
        startDate.setHours(0, 0, 0, 0);
      }
      if (customEndDate) {
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    // 1. Filter Equipments first
    const filteredEqs = equipements.filter(eq => {
      if (selectedAtelier !== 'all' && eq.atelier !== selectedAtelier) return false;
      if (selectedCriticite === 'critique' && !eq.critique) return false;
      if (selectedCriticite === 'standard' && eq.critique) return false;
      return true;
    });

    const filteredEqIds = new Set(filteredEqs.map(eq => eq.id));

    // 2. Filter Interventions
    const filteredInterventions = interventions.filter(int => {
      // Filter by equipment of active subset
      if (!filteredEqIds.has(int.equipementId)) return false;

      // Filter by date
      const dateInt = new Date(int.dateCreation);
      if (startDate && dateInt < startDate) return false;
      if (endDate && dateInt > endDate) return false;
      
      return true;
    });

    // Compute approximate monthsCount
    let monthsCount = 6;
    if (period !== 'all' && period !== 'custom') {
      monthsCount = parseInt(period);
    } else if (period === 'all') {
      monthsCount = 12; // default
    } else if (period === 'custom') {
      const s = startDate || new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const e = endDate || now;
      const diffYears = e.getFullYear() - s.getFullYear();
      const diffMonths = diffYears * 12 + e.getMonth() - s.getMonth();
      monthsCount = Math.max(1, diffMonths + 1);
    }

    return {
      equipements: filteredEqs,
      interventions: filteredInterventions,
      monthsCount,
      startDate,
      endDate
    };
  }, [equipements, interventions, period, customStartDate, customEndDate, selectedAtelier, selectedCriticite]);

  // METRICS & KPIS CALCULATIONS
  const stats = useMemo(() => {
    const { interventions: activeInts, equipements: activeEqs, monthsCount } = filteredData;
    const closedInts = activeInts.filter(i => i.statut === 'Soldé' || i.statut === 'Clôturé');
    
    // Categorize
    const correctiveClosed = closedInts.filter(i => i.typeDoc === 'DI' || i.typeDoc === 'BT');
    const preventiveClosed = closedInts.filter(i => i.typeDoc === 'Préventif');
    
    const correctiveAll = activeInts.filter(i => i.typeDoc === 'DI' || i.typeDoc === 'BT');
    const preventiveAll = activeInts.filter(i => i.typeDoc === 'Préventif');

    // 1. Preventive Policy Ratio
    const totalCount = activeInts.length;
    const preventiveRatio = totalCount > 0 ? (preventiveAll.length / totalCount) * 100 : 0;

    // 2. Costs calculation
    let laborCost = 0;
    let partsCost = 0;

    activeInts.forEach(i => {
      const hours = parseHours(i.tempsPasse);
      laborCost += hours * settings.coutMO;
      partsCost += getPiecesConsoCost(i.piecesConso, pieces);
    });

    const totalCost = laborCost + partsCost;

    // 3. MTBF & MTTR
    // MTTR = Total repair hours / closed corrective interventions
    let totalRepairHours = 0;
    correctiveClosed.forEach(i => {
      totalRepairHours += parseHours(i.tempsPasse);
    });
    const mttr = correctiveClosed.length > 0 ? totalRepairHours / correctiveClosed.length : 0;

    // MTBF = Operating time / number of corrective failures
    // Let's assume standard target operating time is 150 hours per month per equipment
    const totalEquipmentUptimeTarget = activeEqs.length * 150 * monthsCount;
    const failureCount = correctiveAll.length;
    const mtbf = failureCount > 0 ? (totalEquipmentUptimeTarget - totalRepairHours) / failureCount : totalEquipmentUptimeTarget;

    // 4. Availability
    const totalPotentialHours = Math.max(1, totalEquipmentUptimeTarget);
    const downtimeHours = activeInts.reduce((sum, i) => {
      if (i.tempsArret !== undefined) {
        return sum + parseHours(i.tempsArret);
      }
      // High urgency or Stoppage adds to downtime
      const isStoppage = i.urgence?.toLowerCase().includes('arrêt') || i.urgence?.toLowerCase().includes('critique');
      if (isStoppage) {
        return sum + Math.max(parseHours(i.tempsPasse), 1); // assume at least 1h for stoppages if empty
      }
      return sum + parseHours(i.tempsPasse);
    }, 0);
    const availability = Math.max(0, Math.min(100, ((totalPotentialHours - downtimeHours) / totalPotentialHours) * 100));

    return {
      totalBTCount: activeInts.length,
      closedBTCount: closedInts.length,
      preventiveRatio,
      laborCost,
      partsCost,
      totalCost,
      mttr,
      mtbf,
      availability,
      failureCount
    };
  }, [filteredData, settings, pieces]);

  // HISTORICAL & CHART DATA GENERATION
  const chartData = useMemo(() => {
    const { interventions: activeInts, equipements: activeEqs, monthsCount } = filteredData;
    
    // Group by Month (YYYY-MM)
    const monthlyGroups: Record<string, { 
      monthLabel: string; 
      labor: number; 
      parts: number; 
      total: number; 
      prev: number; 
      corr: number;
      repairHours: number;
    }> = {};
    const now = new Date();
    
    // Initialize months
    for (let i = monthsCount - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
      const label = targetDate.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      
      monthlyGroups[key] = {
        monthLabel: label,
        labor: 0,
        parts: 0,
        total: 0,
        prev: 0,
        corr: 0,
        repairHours: 0
      };
    }

    activeInts.forEach(i => {
      const d = new Date(i.dateCreation);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyGroups[key]) {
        const hours = parseHours(i.tempsPasse);
        const lCost = hours * settings.coutMO;
        const pCost = getPiecesConsoCost(i.piecesConso, pieces);
        
        monthlyGroups[key].labor += lCost;
        monthlyGroups[key].parts += pCost;
        monthlyGroups[key].total += lCost + pCost;
        
        if (i.typeDoc === 'Préventif') {
          monthlyGroups[key].prev += 1;
        } else {
          monthlyGroups[key].corr += 1;
          monthlyGroups[key].repairHours += hours;
        }
      }
    });

    const activeEqsCount = Math.max(1, activeEqs.length);
    const monthlyList = Object.keys(monthlyGroups)
      .sort()
      .map(k => {
        const grp = monthlyGroups[k];
        const monthlyUptimeTarget = activeEqsCount * 150;
        const mtbf = grp.corr > 0 ? (monthlyUptimeTarget - grp.repairHours) / grp.corr : monthlyUptimeTarget;
        const mttr = grp.corr > 0 ? grp.repairHours / grp.corr : 0;

        return {
          key: k,
          ...grp,
          labor: Math.round(grp.labor),
          parts: Math.round(grp.parts),
          total: Math.round(grp.total),
          hours: Math.round(grp.repairHours + grp.prev * 1.5), // Estimate hours spent
          mtbf: Math.round(Math.max(0, mtbf)),
          mttr: parseFloat(mttr.toFixed(1))
        };
      });

    // Failure Cause Distribution
    const technologyCounts: Record<string, number> = {};
    activeInts.forEach(i => {
      if (i.typeDoc !== 'Préventif') {
        const tech = i.technologie || i.typeProbleme || 'Autre';
        technologyCounts[tech] = (technologyCounts[tech] || 0) + 1;
      }
    });

    const techList = Object.keys(technologyCounts).map(name => ({
      name,
      value: technologyCounts[name]
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    // COLORS for Pie
    const COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#64748B'];

    // Top Costly Equipments
    const eqCosts: Record<string, { id: string; nom: string; cost: number; failures: number; labor: number; parts: number }> = {};
    activeInts.forEach(i => {
      const hours = parseHours(i.tempsPasse);
      const lCost = hours * settings.coutMO;
      const pCost = getPiecesConsoCost(i.piecesConso, pieces);
      const total = lCost + pCost;

      if (!eqCosts[i.equipementId]) {
        eqCosts[i.equipementId] = {
          id: i.equipementId,
          nom: i.equipementNom,
          cost: 0,
          failures: 0,
          labor: 0,
          parts: 0
        };
      }
      eqCosts[i.equipementId].cost += total;
      eqCosts[i.equipementId].labor += lCost;
      eqCosts[i.equipementId].parts += pCost;
      if (i.typeDoc !== 'Préventif') {
        eqCosts[i.equipementId].failures += 1;
      }
    });

    const topEquipments = Object.values(eqCosts)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)
      .map(eq => ({
        ...eq,
        cost: Math.round(eq.cost),
        labor: Math.round(eq.labor),
        parts: Math.round(eq.parts)
      }));

    return {
      monthlyList,
      techList,
      topEquipments,
      COLORS
    };
  }, [filteredData, settings, pieces]);

  // EQUIPMENT PERFORMANCE TABLE DATA
  const eqPerformanceData = useMemo(() => {
    const { equipements: activeEqs, interventions: activeInts, monthsCount } = filteredData;

    return activeEqs.map(eq => {
      const eqInts = activeInts.filter(i => i.equipementId === eq.id);
      const failures = eqInts.filter(i => i.typeDoc !== 'Préventif').length;
      
      let labor = 0;
      let parts = 0;
      let repairHours = 0;

      eqInts.forEach(i => {
        const hours = parseHours(i.tempsPasse);
        labor += hours * settings.coutMO;
        parts += getPiecesConsoCost(i.piecesConso, pieces);
        if (i.typeDoc !== 'Préventif') {
          repairHours += hours;
        }
      });

      const totalCost = labor + parts;
      
      // MTBF: target 150h/month
      const operatingTimeTarget = 150 * monthsCount;
      const mtbf = failures > 0 ? (operatingTimeTarget - repairHours) / failures : operatingTimeTarget;
      
      // MTTR
      const closedFailures = eqInts.filter(i => i.typeDoc !== 'Préventif' && (i.statut === 'Soldé' || i.statut === 'Clôturé')).length;
      const mttr = closedFailures > 0 ? repairHours / closedFailures : 0;

      // Availability
      const downtime = eqInts.reduce((sum, i) => {
        if (i.tempsArret !== undefined) {
          return sum + parseHours(i.tempsArret);
        }
        const isStoppage = i.urgence?.toLowerCase().includes('arrêt') || i.urgence?.toLowerCase().includes('critique');
        return sum + (isStoppage ? Math.max(parseHours(i.tempsPasse), 1) : parseHours(i.tempsPasse));
      }, 0);
      const availability = Math.max(0, Math.min(100, ((operatingTimeTarget - downtime) / operatingTimeTarget) * 100));

      return {
        id: eq.id,
        nom: eq.nom,
        atelier: eq.atelier,
        critique: eq.critique,
        failures,
        cost: totalCost,
        mtbf,
        mttr,
        availability
      };
    });
  }, [filteredData, settings, pieces]);

  // COMPILE COMPLETE AUDIT REPORT DATA
  const auditReportData = useMemo(() => {
    const { interventions: activeInts, equipements: activeEqs } = filteredData;
    
    // --- 1. STATISTICS OF BREAKDOWNS (Corrective) ---
    const correctives = activeInts.filter(i => i.typeDoc === 'DI' || i.typeDoc === 'BT');
    const totalBreakdowns = correctives.length;
    const closedBreakdowns = correctives.filter(i => i.statut === 'Soldé' || i.statut === 'Clôturé').length;
    
    // Troubleshooting categories breakdown
    const problemCategories: Record<string, number> = {};
    correctives.forEach(c => {
      const cat = c.typeProbleme || 'Autre / Non spécifié';
      problemCategories[cat] = (problemCategories[cat] || 0) + 1;
    });
    const formattedCategories = Object.entries(problemCategories).map(([name, value]) => ({ name, value }));
    
    // --- 2. MACHINE AVAILABILITY ---
    // Average availability of all active equipments
    const totalAvailability = eqPerformanceData.reduce((sum, eq) => sum + eq.availability, 0);
    const avgAvailability = eqPerformanceData.length > 0 ? totalAvailability / eqPerformanceData.length : 100;
    
    // Group availability by workshop (atelier)
    const workshopAvailabilities: Record<string, { total: number; count: number }> = {};
    eqPerformanceData.forEach(eq => {
      if (!workshopAvailabilities[eq.atelier]) {
        workshopAvailabilities[eq.atelier] = { total: 0, count: 0 };
      }
      workshopAvailabilities[eq.atelier].total += eq.availability;
      workshopAvailabilities[eq.atelier].count += 1;
    });
    const formattedWorkshops = Object.entries(workshopAvailabilities).map(([name, data]) => ({
      name,
      availability: data.total / data.count,
      count: data.count
    }));
    
    // Critical equipment: availability < 95%
    const criticalEqsList = [...eqPerformanceData]
      .filter(eq => eq.availability < 95)
      .sort((a, b) => a.availability - b.availability);

    // --- 3. STOCK DISCREPANCIES (Écarts de stocks) ---
    // Pieces having quantite <= seuil (this is a discrepancy/critical alert)
    const discrepantPiecesList = pieces.filter(p => p.quantite <= p.seuil);
    
    let totalReplenishmentCost = 0;
    let totalMissingItems = 0;
    const piecesRestockDetails = discrepantPiecesList.map(p => {
      const deficiency = Math.max(0, p.seuil - p.quantite);
      const restockCost = deficiency * p.prix;
      totalReplenishmentCost += restockCost;
      totalMissingItems += deficiency;
      return {
        ...p,
        deficiency,
        restockCost
      };
    }).sort((a, b) => b.restockCost - a.restockCost);

    // General stock values
    const totalStockValue = pieces.reduce((sum, p) => sum + (p.quantite * p.prix), 0);
    const totalTargetStockValue = pieces.reduce((sum, p) => sum + (p.seuil * p.prix), 0);
    const globalStockGap = Math.max(0, totalTargetStockValue - totalStockValue);

    return {
      totalBreakdowns,
      closedBreakdowns,
      openBreakdowns: totalBreakdowns - closedBreakdowns,
      formattedCategories,
      avgAvailability,
      formattedWorkshops,
      criticalEqsList,
      discrepantPiecesList,
      piecesRestockDetails,
      totalReplenishmentCost,
      totalMissingItems,
      totalStockValue,
      totalTargetStockValue,
      globalStockGap
    };
  }, [filteredData, eqPerformanceData, pieces]);

  // ANALYZE SPARE PARTS CONSUMPTION TREND AND FORECASTS
  const partsConsumptionData = useMemo(() => {
    const { interventions: activeInts, monthsCount } = filteredData;
    const N = Math.max(1, monthsCount);

    // Group parts consumption by Month (YYYY-MM)
    const monthlyPartsGroups: Record<string, {
      monthLabel: string;
      qty: number;
      cost: number;
    }> = {};

    const now = new Date();
    for (let i = monthsCount - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
      const label = targetDate.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });

      monthlyPartsGroups[key] = {
        monthLabel: label,
        qty: 0,
        cost: 0
      };
    }

    const partsBreakdown: Record<string, {
      id: string;
      codeArticle: string;
      designation: string;
      totalQty: number;
      totalCost: number;
      currentStock: number;
      seuil: number;
      prix: number;
      fournisseur: string;
    }> = {};

    activeInts.forEach(i => {
      if (!i.piecesConso || i.piecesConso === 'Aucune' || i.piecesConso === '') return;
      const d = new Date(i.dateCreation);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const items = i.piecesConso.split(',');
      items.forEach(item => {
        const trimmed = item.trim();
        const match = trimmed.match(/(.+)\s+x\s*(\d+)/i) || trimmed.match(/(.+)\s+(\d+)\s*$/);
        if (match) {
          const nameOrCode = match[1].trim();
          const qty = parseInt(match[2]) || 1;

          const piece = pieces.find(
            p => p.designation.toLowerCase() === nameOrCode.toLowerCase() ||
                 p.codeArticle.toLowerCase() === nameOrCode.toLowerCase() ||
                 p.id === nameOrCode
          );

          const price = piece ? piece.prix : 45;
          const itemCost = price * qty;
          const code = piece ? piece.codeArticle : 'GEN-PART';
          const designation = piece ? piece.designation : nameOrCode;
          const pieceId = piece ? piece.id : nameOrCode;

          // Add to monthly history
          if (monthlyPartsGroups[key]) {
            monthlyPartsGroups[key].qty += qty;
            monthlyPartsGroups[key].cost += itemCost;
          }

          // Add to breakdown
          if (!partsBreakdown[pieceId]) {
            partsBreakdown[pieceId] = {
              id: pieceId,
              codeArticle: code,
              designation: designation,
              totalQty: 0,
              totalCost: 0,
              currentStock: piece ? piece.quantite : 5,
              seuil: piece ? piece.seuil : 2,
              prix: price,
              fournisseur: piece ? piece.fournisseur || 'Multi-fournisseur' : 'Autre'
            };
          }
          partsBreakdown[pieceId].totalQty += qty;
          partsBreakdown[pieceId].totalCost += itemCost;
        }
      });
    });

    const topConsumedParts = Object.values(partsBreakdown)
      .map(p => {
        const avgQty = p.totalQty / N;
        const rawNeed = p.seuil + avgQty - p.currentStock;
        const projectedNeed = Math.max(0, Math.ceil(rawNeed));
        const projectedCost = projectedNeed * p.prix;

        let status: 'Critique' | 'Sous-seuil' | 'Sécurisé' = 'Sécurisé';
        if (p.currentStock === 0) {
          status = 'Critique';
        } else if (p.currentStock <= p.seuil) {
          status = 'Sous-seuil';
        }

        return {
          ...p,
          avgMonthlyQty: parseFloat(avgQty.toFixed(1)),
          projectedNeed,
          projectedCost,
          status
        };
      })
      .sort((a, b) => b.totalQty - a.totalQty);

    const totalQtySum = Object.values(monthlyPartsGroups).reduce((sum, m) => sum + m.qty, 0);
    const totalCostSum = Object.values(monthlyPartsGroups).reduce((sum, m) => sum + m.cost, 0);
    const overallAvgQty = totalQtySum / N;
    const overallAvgCost = totalCostSum / N;

    const historicalMonths = Object.keys(monthlyPartsGroups)
      .sort()
      .map(key => ({
        monthLabel: monthlyPartsGroups[key].monthLabel,
        qty: monthlyPartsGroups[key].qty,
        cost: Math.round(monthlyPartsGroups[key].cost),
        isForecast: false
      }));

    // Create forecast point
    const forecastDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const forecastLabel = forecastDate.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) + ' (Prév.)';

    const monthlyPartsTrend = [
      ...historicalMonths,
      {
        monthLabel: forecastLabel,
        qty: Math.round(overallAvgQty),
        cost: Math.round(overallAvgCost),
        isForecast: true
      }
    ];

    const totalBudgetForecast = topConsumedParts.reduce((sum, p) => sum + p.projectedCost, 0);
    const itemsWithPurchaseNeed = topConsumedParts.filter(p => p.projectedNeed > 0).length;

    return {
      monthlyPartsTrend,
      topConsumedParts,
      totalBudgetForecast: Math.round(totalBudgetForecast),
      itemsWithPurchaseNeed,
      overallAvgQty: parseFloat(overallAvgQty.toFixed(1)),
      overallAvgCost: Math.round(overallAvgCost)
    };
  }, [filteredData, pieces]);

  // ANALYZE PREVENTIVE PLANNING COMPARISON (THEORETICAL VS ACTUAL)
  const preventiveComparisonData = useMemo(() => {
    const { interventions: activeInts, monthsCount } = filteredData;
    const now = new Date();

    // Initialize monthly structure
    const monthlyPreventive: Record<string, {
      monthLabel: string;
      theoretical: number;
      actual: number;
    }> = {};

    const startDate = filteredData.startDate ? new Date(filteredData.startDate) : new Date(now.getFullYear(), now.getMonth() - monthsCount + 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = filteredData.endDate ? new Date(filteredData.endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);

    // Build month buckets from startDate to endDate
    let currentBucketDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endBucketDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    // Safety limit to avoid infinite loops
    let safetyCounter = 0;
    while (currentBucketDate <= endBucketDate && safetyCounter < 120) {
      safetyCounter++;
      const key = `${currentBucketDate.getFullYear()}-${String(currentBucketDate.getMonth() + 1).padStart(2, '0')}`;
      const label = currentBucketDate.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });

      monthlyPreventive[key] = {
        monthLabel: label,
        theoretical: 0,
        actual: 0
      };
      
      currentBucketDate.setMonth(currentBucketDate.getMonth() + 1);
    }

    // Compute simulated/theoretical occurrences for each GammePreventive in active period
    gammes.forEach(g => {
      if (g.typeDeclencheur === 'Jours' || g.typeDeclencheur === 'Mois') {
        const simulatedDate = new Date(g.dateReference);
        if (g.typeDeclencheur === 'Jours') {
          const days = g.valeurDeclencheur || 30;
          if (simulatedDate < startDate) {
            const diffTime = Math.abs(startDate.getTime() - simulatedDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const skipCycles = Math.floor(diffDays / days) - 1;
            if (skipCycles > 0) {
              simulatedDate.setDate(simulatedDate.getDate() + skipCycles * days);
            }
          }
          let safety = 0;
          while (simulatedDate <= endDate && safety < 500) {
            safety++;
            if (simulatedDate >= startDate && simulatedDate <= endDate) {
              const mKey = `${simulatedDate.getFullYear()}-${String(simulatedDate.getMonth() + 1).padStart(2, '0')}`;
              if (monthlyPreventive[mKey]) {
                monthlyPreventive[mKey].theoretical += 1;
              }
            }
            simulatedDate.setDate(simulatedDate.getDate() + days);
          }
        } else if (g.typeDeclencheur === 'Mois') {
          const months = g.valeurDeclencheur || 1;
          if (simulatedDate < startDate) {
            const diffYears = startDate.getFullYear() - simulatedDate.getFullYear();
            const diffMonths = diffYears * 12 + startDate.getMonth() - simulatedDate.getMonth();
            const skipCycles = Math.floor(diffMonths / months) - 1;
            if (skipCycles > 0) {
              simulatedDate.setMonth(simulatedDate.getMonth() + skipCycles * months);
            }
          }
          let safety = 0;
          while (simulatedDate <= endDate && safety < 100) {
            safety++;
            if (simulatedDate >= startDate && simulatedDate <= endDate) {
              const mKey = `${simulatedDate.getFullYear()}-${String(simulatedDate.getMonth() + 1).padStart(2, '0')}`;
              if (monthlyPreventive[mKey]) {
                monthlyPreventive[mKey].theoretical += 1;
              }
            }
            simulatedDate.setMonth(simulatedDate.getMonth() + months);
          }
        }
      }
    });

    // Compute actual preventive interventions recorded
    activeInts.forEach(i => {
      if (i.typeDoc === 'Préventif') {
        const d = new Date(i.dateCreation);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyPreventive[mKey]) {
          monthlyPreventive[mKey].actual += 1;
        }
      }
    });

    // Map monthly preventive trend array
    const monthlyTrend = Object.keys(monthlyPreventive)
      .sort()
      .map(key => {
        const m = monthlyPreventive[key];
        const complianceRate = m.theoretical > 0
          ? Math.min(100, Math.round((m.actual / m.theoretical) * 100))
          : m.actual > 0 ? 100 : 100;

        return {
          ...m,
          complianceRate
        };
      });

    // Compute equipment-level comparative metrics
    const equipmentComparison = equipements.map(eq => {
      const eqGammes = gammes.filter(g => g.equipementId === eq.id);
      let eqTheoretical = 0;

      eqGammes.forEach(g => {
        if (g.typeDeclencheur === 'Jours' || g.typeDeclencheur === 'Mois') {
          const simulatedDate = new Date(g.dateReference);
          if (g.typeDeclencheur === 'Jours') {
            const days = g.valeurDeclencheur || 30;
            if (simulatedDate < startDate) {
              const diffTime = Math.abs(startDate.getTime() - simulatedDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const skipCycles = Math.floor(diffDays / days) - 1;
              if (skipCycles > 0) {
                simulatedDate.setDate(simulatedDate.getDate() + skipCycles * days);
              }
            }
            let safety = 0;
            while (simulatedDate <= endDate && safety < 500) {
              safety++;
              if (simulatedDate >= startDate && simulatedDate <= endDate) {
                eqTheoretical += 1;
              }
              simulatedDate.setDate(simulatedDate.getDate() + days);
            }
          } else if (g.typeDeclencheur === 'Mois') {
            const months = g.valeurDeclencheur || 1;
            if (simulatedDate < startDate) {
              const diffYears = startDate.getFullYear() - simulatedDate.getFullYear();
              const diffMonths = diffYears * 12 + startDate.getMonth() - simulatedDate.getMonth();
              const skipCycles = Math.floor(diffMonths / months) - 1;
              if (skipCycles > 0) {
                simulatedDate.setMonth(simulatedDate.getMonth() + skipCycles * months);
              }
            }
            let safety = 0;
            while (simulatedDate <= endDate && safety < 100) {
              safety++;
              if (simulatedDate >= startDate && simulatedDate <= endDate) {
                eqTheoretical += 1;
              }
              simulatedDate.setMonth(simulatedDate.getMonth() + months);
            }
          }
        }
      });

      const eqActual = activeInts.filter(i => i.equipementId === eq.id && i.typeDoc === 'Préventif').length;
      const eqPending = activeInts.filter(i => i.equipementId === eq.id && i.typeDoc === 'Préventif' && i.statut !== 'Soldé' && i.statut !== 'Clôturé').length;

      const complianceRate = eqTheoretical > 0
        ? Math.min(100, Math.round((eqActual / eqTheoretical) * 100))
        : eqActual > 0 ? 100 : 100;

      return {
        id: eq.id,
        nom: eq.nom,
        atelier: eq.atelier,
        gammesCount: eqGammes.length,
        theoretical: eqTheoretical,
        actual: eqActual,
        pending: eqPending,
        complianceRate
      };
    }).filter(item => item.gammesCount > 0 || item.actual > 0);

    const totalTheoretical = Object.values(monthlyPreventive).reduce((sum, m) => sum + m.theoretical, 0);
    const totalActual = Object.values(monthlyPreventive).reduce((sum, m) => sum + m.actual, 0);
    const globalCompliance = totalTheoretical > 0
      ? Math.min(100, Math.round((totalActual / totalTheoretical) * 100))
      : totalActual > 0 ? 100 : 100;

    return {
      monthlyTrend,
      equipmentComparison,
      totalTheoretical,
      totalActual,
      globalCompliance
    };
  }, [filteredData, gammes, equipements]);

  // Sorted and searched performance data
  const sortedPerformanceData = useMemo(() => {
    let data = eqPerformanceData;

    // 1. Filter by Technology slice selected in Pie Chart
    if (selectedChartTech) {
      const matchingEqIds = new Set(
        filteredData.interventions
          .filter(i => i.typeDoc !== 'Préventif' && (i.technologie || i.typeProbleme || 'Autre') === selectedChartTech)
          .map(i => i.equipementId)
      );
      data = data.filter(eq => matchingEqIds.has(eq.id));
    }

    // 2. Filter by Active KPI Quick Filter
    if (activeKpiFilter === 'availability') {
      data = data.filter(eq => eq.availability < 95);
    } else if (activeKpiFilter === 'failures') {
      data = data.filter(eq => eq.failures >= 2);
    } else if (activeKpiFilter === 'mttr') {
      data = data.filter(eq => eq.mttr > 2);
    } else if (activeKpiFilter === 'cost') {
      data = data.filter(eq => eq.cost > 500);
    }

    // 3. Search filter
    const searched = data.filter(item => 
      item.nom.toLowerCase().includes(tableSearch.toLowerCase()) ||
      item.atelier.toLowerCase().includes(tableSearch.toLowerCase()) ||
      item.id.toLowerCase().includes(tableSearch.toLowerCase())
    );

    // 4. Sort
    return searched.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (typeof aVal === 'string') {
        aVal = (aVal as string).toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [eqPerformanceData, sortField, sortOrder, tableSearch, selectedChartTech, activeKpiFilter, filteredData.interventions]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // PARETO ANALYSIS DATA COMPUTATION
  const paretoAnalysisData = useMemo(() => {
    const { interventions: activeInts, equipements: activeEqs } = filteredData;
    
    // Calculate values based on selected metric
    const mappedEqs = activeEqs.map(eq => {
      const eqInts = activeInts.filter(i => i.equipementId === eq.id);
      
      let metricValue = 0;
      let count = eqInts.length; // volume of all interventions (pannes + préventif)
      let failures = eqInts.filter(i => i.typeDoc !== 'Préventif').length; // corrective only (pannes)
      
      let costValue = 0;
      eqInts.forEach(i => {
        const hours = parseHours(i.tempsPasse);
        costValue += (hours * settings.coutMO) + getPiecesConsoCost(i.piecesConso, pieces);
      });

      if (paretoMetric === 'count') {
        metricValue = count;
      } else if (paretoMetric === 'failures') {
        metricValue = failures;
      } else if (paretoMetric === 'cost') {
        metricValue = Math.round(costValue);
      }

      // Check preventive coverage (gammes de maintenance)
      const gammesCount = gammes ? gammes.filter(g => g.equipementId === eq.id).length : 0;

      return {
        id: eq.id,
        nom: eq.nom,
        atelier: eq.atelier,
        critique: eq.critique,
        count,
        failures,
        cost: Math.round(costValue),
        metricValue,
        gammesCount
      };
    });

    // Sort descending by metricValue
    const sorted = [...mappedEqs].sort((a, b) => b.metricValue - a.metricValue);
    
    const totalMetricSum = sorted.reduce((sum, item) => sum + item.metricValue, 0);
    const totalCostSum = sorted.reduce((sum, item) => sum + item.cost, 0);

    // Compute cumulative percentage and individual share
    let cumulative = 0;
    const chartData = sorted.map((item, index) => {
      cumulative += item.metricValue;
      const cumulativePercent = totalMetricSum > 0 ? (cumulative / totalMetricSum) * 100 : 0;
      const individualPercent = totalMetricSum > 0 ? (item.metricValue / totalMetricSum) * 100 : 0;
      return {
        ...item,
        cumulativePercent: parseFloat(cumulativePercent.toFixed(1)),
        individualPercent: parseFloat(individualPercent.toFixed(1)),
        rank: index + 1
      };
    });

    // Pareto 20/80 indicators
    const totalCount = sorted.length;
    const top20Count = Math.max(1, Math.round(totalCount * 0.2));
    
    // Top 20% equipments list
    const top20Eqs = chartData.slice(0, top20Count);
    
    // Percentage of metric accounted for by the top 20%
    const top20MetricSum = top20Eqs.reduce((sum, item) => sum + item.metricValue, 0);
    const top20PercentShare = totalMetricSum > 0 ? Math.round((top20MetricSum / totalMetricSum) * 100) : 0;

    // Cost accounted for by the top 20%
    const top20CostSum = top20Eqs.reduce((sum, item) => sum + item.cost, 0);
    const top20CostPercentShare = totalCostSum > 0 ? Math.round((top20CostSum / totalCostSum) * 100) : 0;

    return {
      chartData,
      totalCount,
      top20Count,
      top20Eqs,
      top20MetricSum,
      top20PercentShare,
      totalMetricSum,
      top20CostSum,
      top20CostPercentShare,
      totalCostSum
    };
  }, [filteredData, paretoMetric, settings, pieces, gammes]);

  // Specific selected equipment calculations for the reliability drill-down modal
  const selectedAsset = useMemo(() => {
    if (!selectedAssetId) return null;
    return equipements.find(eq => eq.id === selectedAssetId);
  }, [selectedAssetId, equipements]);

  const selectedAssetPerformance = useMemo(() => {
    if (!selectedAsset) return null;

    const { monthsCount } = filteredData;
    // Get all interventions on this equipment
    const eqInts = interventions.filter(i => i.equipementId === selectedAsset.id);
    
    // Sort descending by date
    const sortedEqInts = [...eqInts].sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());

    let labor = 0;
    let parts = 0;
    let repairHours = 0;
    let failures = 0;

    eqInts.forEach(i => {
      const hours = parseHours(i.tempsPasse);
      const lCost = hours * settings.coutMO;
      const pCost = getPiecesConsoCost(i.piecesConso, pieces);
      
      labor += lCost;
      parts += pCost;
      
      if (i.typeDoc !== 'Préventif') {
        failures += 1;
        repairHours += hours;
      }
    });

    const totalCost = labor + parts;
    
    // MTBF: target 150h/month
    const operatingTimeTarget = 150 * monthsCount;
    const mtbf = failures > 0 ? (operatingTimeTarget - repairHours) / failures : operatingTimeTarget;
    
    // MTTR
    const closedFailures = eqInts.filter(i => i.typeDoc !== 'Préventif' && (i.statut === 'Soldé' || i.statut === 'Clôturé')).length;
    const mttr = closedFailures > 0 ? repairHours / closedFailures : 0;

    // Availability
    const downtime = eqInts.reduce((sum, i) => {
      if (i.tempsArret !== undefined) {
        return sum + parseHours(i.tempsArret);
      }
      const isStoppage = i.urgence?.toLowerCase().includes('arrêt') || i.urgence?.toLowerCase().includes('critique');
      return sum + (isStoppage ? Math.max(parseHours(i.tempsPasse), 1) : parseHours(i.tempsPasse));
    }, 0);
    const availability = Math.max(0, Math.min(100, ((operatingTimeTarget - downtime) / operatingTimeTarget) * 100));

    // Extract parts details
    const consumedPartsList: Array<{ codeArticle: string; designation: string; qty: number; totalCost: number }> = [];
    const partsRecord: Record<string, number> = {};
    eqInts.forEach(i => {
      if (i.piecesConso) {
        i.piecesConso.split(',').forEach(p => {
          const trimmed = p.trim();
          if (trimmed) {
            const partsOfPart = trimmed.split(':');
            if (partsOfPart.length === 2) {
              const code = partsOfPart[0].trim();
              const qty = parseInt(partsOfPart[1].trim()) || 0;
              if (qty > 0) {
                partsRecord[code] = (partsRecord[code] || 0) + qty;
              }
            }
          }
        });
      }
    });

    Object.keys(partsRecord).forEach(code => {
      const matchPart = pieces.find(p => p.codeArticle === code || p.id === code);
      if (matchPart) {
        consumedPartsList.push({
          codeArticle: matchPart.codeArticle,
          designation: matchPart.designation,
          qty: partsRecord[code],
          totalCost: partsRecord[code] * matchPart.prix
        });
      } else {
        consumedPartsList.push({
          codeArticle: code,
          designation: "Pièce Rechange Spécifique",
          qty: partsRecord[code],
          totalCost: partsRecord[code] * 25 // estimate
        });
      }
    });

    // Intervention types breakdown
    const typeBreakdown = [
      { name: 'Correctif (DI/BT)', value: eqInts.filter(i => i.typeDoc !== 'Préventif').length },
      { name: 'Préventif', value: eqInts.filter(i => i.typeDoc === 'Préventif').length }
    ].filter(item => item.value > 0);

    return {
      interventionsCount: eqInts.length,
      failures,
      laborCost: labor,
      partsCost: parts,
      totalCost,
      mtbf,
      mttr,
      availability,
      sortedEqInts,
      consumedPartsList,
      typeBreakdown
    };
  }, [selectedAsset, interventions, pieces, settings, filteredData]);

  // AUTOMATIC INSIGHTS GENERATION
  const insights = useMemo(() => {
    const list: string[] = [];
    const criticalEqs = eqPerformanceData.filter(eq => eq.critique);
    const topFailureMachine = [...eqPerformanceData].sort((a, b) => b.failures - a.failures)[0];
    const topCostlyMachine = [...eqPerformanceData].sort((a, b) => b.cost - a.cost)[0];

    // 1. Preventive Policy
    if (stats.preventiveRatio < 40) {
      list.push(`⚠️ **Politique curative prédominante (${Math.round(stats.preventiveRatio)}% de préventif)** : Votre usine subit trop de pannes fortuites. Il est urgent d'augmenter la fréquence des rondes et de planifier des gammes d'inspection régulières.`);
    } else if (stats.preventiveRatio >= 40 && stats.preventiveRatio < 60) {
      list.push(`💡 **Approche équilibrée (${Math.round(stats.preventiveRatio)}% de préventif)** : Vous êtes sur la bonne voie. Ciblez le franchissement du seuil de 60% pour optimiser durablement la disponibilité.`);
    } else {
      list.push(`🎉 **Excellente gestion préventive (${Math.round(stats.preventiveRatio)}%)** : Bravo, la maintenance planifiée est votre priorité. Surveillez le risque de sur-entretien pour ne pas surcharger le budget.`);
    }

    // 2. MTTR Alert
    if (stats.mttr > 2.5) {
      list.push(`🔧 **MTTR élevé (${stats.mttr.toFixed(1)} heures)** : Le temps de résolution moyen d'une panne est long. Recommandations : structurer les fiches techniques de remèdes, organiser le magasin pour localiser instantanément les pièces ou former les opérateurs au diagnostic rapide.`);
    } else {
      list.push(`⚡ **MTTR performant (${stats.mttr.toFixed(1)} heures)** : Vos techniciens interviennent et remettent en route l'outil de production avec une excellente réactivité.`);
    }

    // 3. Worst Asset failure
    if (topFailureMachine && topFailureMachine.failures > 2) {
      list.push(`🔍 **Goulot de fiabilité** : L'équipement **${topFailureMachine.nom}** (${topFailureMachine.atelier}) a subi **${topFailureMachine.failures} pannes** sur la période. Un audit approfondi de sa motorisation ou de son système hydraulique est vivement conseillé.`);
    }

    // 4. Worst Asset Cost
    if (topCostlyMachine && topCostlyMachine.cost > 1000) {
      list.push(`💸 **Goulot financier** : L'équipement **${topCostlyMachine.nom}** est le plus onéreux avec un coût cumulé de **${Math.round(topCostlyMachine.cost)} €** (MO + pièces). Envisagez une analyse de rentabilité pour un éventuel investissement de remplacement (CAPEX).`);
    }

    // 5. Stock status
    const criticalStockAlert = pieces.filter(p => p.quantite <= p.seuil).length;
    if (criticalStockAlert > 0) {
      list.push(`📦 **Alerte magasin** : **${criticalStockAlert} articles** sont actuellement en rupture ou sous leur seuil d'alerte critique. Validez vos demandes d'achats pour éviter des délais de livraison préjudiciables lors de la prochaine panne.`);
    }

    return list;
  }, [stats, eqPerformanceData, pieces]);

  // ENGINE FOR PREDICTIVE MAINTENANCE: COUNTER-BASED WEAR ANALYSIS & INTERVENTION RECOMMENDATIONS
  const predictiveAlerts = useMemo(() => {
    const list: Array<{
      equipementId: string;
      equipementNom: string;
      atelier: string;
      critique: boolean;
      currentCounterValue: number;
      counterUnit: string;
      lastReadingDate: string;
      ruleType: 'gamme' | 'default';
      ruleName: string;
      thresholdValue: number;
      lastReferenceValue: number;
      wearValue: number;
      wearPercentage: number;
      status: 'Sécurisé' | 'Attention' | 'Critique';
      recommendation: string;
      gammeId?: string;
      estimatedDate: string;
      remainingDays: number;
      dailyUsageRate: number;
      approachingThreshold: boolean;
    }> = [];

    equipements.forEach(eq => {
      // 1. Get latest counter reading
      const eqCompteurs = compteurs.filter(c => c.equipementId === eq.id);
      let latestCompteur = eqCompteurs.length > 0 
        ? [...eqCompteurs].sort((a, b) => new Date(b.dateReleve).getTime() - new Date(a.dateReleve).getTime())[0]
        : null;

      // If no reading is recorded, derive a stable baseline value based on the ID hash
      const idHash = eq.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const defaultVal = (idHash % 15) * 110 + 380;
      const currentVal = latestCompteur ? latestCompteur.valeur : defaultVal;
      const unit = latestCompteur ? latestCompteur.unite : 'H';
      const lastDate = latestCompteur ? latestCompteur.dateReleve : new Date().toISOString();

      // Estimate usage rates
      const yearlyHours = eq.tempsOuverture || 3600;
      const dailyUsageRate = yearlyHours / 365;

      // 2. Scan gammes for counter-based thresholds
      const eqGammes = (gammes || []).filter(g => g.equipementId === eq.id && g.typeDeclencheur === 'Compteur');

      if (eqGammes.length > 0) {
        eqGammes.forEach(g => {
          const threshold = g.valeurDeclencheur || 1000;
          const refVal = g.valeurCompteurReference || 0;
          const wear = Math.max(0, currentVal - refVal);
          const pct = Math.round((wear / threshold) * 100);

          // Proximity & timeline calculations
          const remainingUnits = Math.max(0, threshold - wear);
          const remainingDays = dailyUsageRate > 0 ? remainingUnits / dailyUsageRate : 999;
          const lastReadingTime = new Date(lastDate).getTime();
          const estimatedTime = lastReadingTime + remainingDays * 24 * 60 * 60 * 1000;
          
          let status: 'Sécurisé' | 'Attention' | 'Critique' = 'Sécurisé';
          if (pct >= 100) status = 'Critique';
          else if (pct >= 85) status = 'Attention';

          const approachingThreshold = pct >= 80 && pct < 100;

          const estimatedDate = pct >= 100 
            ? "Échéance dépassée" 
            : new Date(estimatedTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

          let recommendation = '';
          if (pct >= 100) {
            recommendation = `Échéance d'usure dépassée de ${pct - 100}% (+${wear - threshold} ${unit}). Déclencher immédiatement l'intervention de maintenance préventive "${g.titre}".`;
          } else if (pct >= 85) {
            recommendation = `Seuil critique de ${pct}% d'usure atteint. Planifier l'intervention "${g.titre}" sous 48-72h pour prévenir la panne (prochaine échéance estimée le ${estimatedDate}).`;
          } else if (approachingThreshold) {
            recommendation = `La machine approche de son seuil d'usure (${pct}% d'usure). Prévoyez l'intervention "${g.titre}" d'ici environ ${Math.round(remainingDays)} jours (estimée le ${estimatedDate}).`;
          } else {
            recommendation = `Fonctionnement nominal (${pct}% d'usure). Seuil fixé à ${threshold} ${unit}. Prochaine maintenance prévue à ${refVal + threshold} ${unit} (soit le ${estimatedDate}).`;
          }

          list.push({
            equipementId: eq.id,
            equipementNom: eq.nom,
            atelier: eq.atelier,
            critique: eq.critique,
            currentCounterValue: currentVal,
            counterUnit: unit,
            lastReadingDate: lastDate,
            ruleType: 'gamme',
            ruleName: g.titre,
            thresholdValue: threshold,
            lastReferenceValue: refVal,
            wearValue: wear,
            wearPercentage: pct,
            status,
            recommendation,
            gammeId: g.id,
            estimatedDate,
            remainingDays,
            dailyUsageRate,
            approachingThreshold
          });
        });
      } else {
        // Fallback: define highly realistic standard industrial thresholds based on machine names/types
        const nameLower = eq.nom.toLowerCase();
        const typeLower = eq.type.toLowerCase();
        const isHydraulic = nameLower.includes('presse') || typeLower.includes('presse') || nameLower.includes('injecteuse') || nameLower.includes('vérin');
        const isRotary = nameLower.includes('compresseur') || nameLower.includes('pompe') || nameLower.includes('moteur') || nameLower.includes('turbine');

        let threshold = 1500;
        let ruleName = "Révision d'usure et inspection des organes mécaniques";
        if (isHydraulic) {
          threshold = 800;
          ruleName = "Vidange huile hydraulique, contrôle d'étanchéité et lubrification";
        } else if (isRotary) {
          threshold = 1200;
          ruleName = "Remplacement des courroies de transmission et des cartouches filtrantes";
        }

        const refVal = 0;
        const wear = currentVal;
        const pct = Math.round((wear / threshold) * 100);

        // Proximity & timeline calculations
        const remainingUnits = Math.max(0, threshold - wear);
        const remainingDays = dailyUsageRate > 0 ? remainingUnits / dailyUsageRate : 999;
        const lastReadingTime = new Date(lastDate).getTime();
        const estimatedTime = lastReadingTime + remainingDays * 24 * 60 * 60 * 1000;

        let status: 'Sécurisé' | 'Attention' | 'Critique' = 'Sécurisé';
        if (pct >= 100) status = 'Critique';
        else if (pct >= 85) status = 'Attention';

        const approachingThreshold = pct >= 80 && pct < 100;

        const estimatedDate = pct >= 100 
          ? "Échéance dépassée" 
          : new Date(estimatedTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

        let recommendation = '';
        if (pct >= 100) {
          recommendation = `Alerte prédictive d'usure à ${pct}%. Recommander la création immédiate d'un BT pour : ${ruleName}.`;
        } else if (pct >= 85) {
          recommendation = `Attention : usure estimée à ${pct}% (${currentVal}/${threshold} ${unit}). Préparer l'intervention : ${ruleName} (prochaine échéance estimée le ${estimatedDate}).`;
        } else if (approachingThreshold) {
          recommendation = `La machine approche de son seuil d'utilisation (${pct}%). Planifier l'intervention : ${ruleName} d'ici environ ${Math.round(remainingDays)} jours (estimée le ${estimatedDate}).`;
        } else {
          recommendation = `Usure estimée à ${pct}%. Fonctionnement sécurisé. Limite d'usage fixée à ${threshold} ${unit} (échéance estimée le ${estimatedDate}).`;
        }

        list.push({
          equipementId: eq.id,
          equipementNom: eq.nom,
          atelier: eq.atelier,
          critique: eq.critique,
          currentCounterValue: currentVal,
          counterUnit: unit,
          lastReadingDate: lastDate,
          ruleType: 'default',
          ruleName,
          thresholdValue: threshold,
          lastReferenceValue: refVal,
          wearValue: wear,
          wearPercentage: pct,
          status,
          recommendation,
          estimatedDate,
          remainingDays,
          dailyUsageRate,
          approachingThreshold
        });
      }
    });

    return list.sort((a, b) => b.wearPercentage - a.wearPercentage);
  }, [equipements, compteurs, gammes]);

  const filteredPredictiveAlerts = useMemo(() => {
    return predictiveAlerts.filter(alert => {
      const matchesSearch = alert.equipementNom.toLowerCase().includes(predictiveSearch.toLowerCase()) ||
                            alert.atelier.toLowerCase().includes(predictiveSearch.toLowerCase()) ||
                            alert.ruleName.toLowerCase().includes(predictiveSearch.toLowerCase());
      
      if (predictiveFilter === 'critical') return matchesSearch && alert.status === 'Critique';
      if (predictiveFilter === 'warning') return matchesSearch && alert.status === 'Attention';
      if (predictiveFilter === 'secure') return matchesSearch && alert.status === 'Sécurisé';
      
      return matchesSearch;
    });
  }, [predictiveAlerts, predictiveSearch, predictiveFilter]);

  // Handlers for Predictive Actions
  const handleOpenBTModal = (alert: any) => {
    setSelectedAlertForBT(alert);
    setBtUrgenceOverride(alert.critique ? 'Critique' : 'Standard');
    setBtDescriptionOverride(
      `[BONS DE TRAVAIL PRÉDICTIF AUTOMATISÉ]\n` +
      `L'analyse analytique des compteurs a détecté un niveau d'usure de ${alert.wearPercentage}% sur l'équipement ${alert.equipementNom}.\n\n` +
      `- Opération requise : ${alert.ruleName}\n` +
      `- Relevé compteur actuel : ${alert.currentCounterValue} ${alert.counterUnit} (Valeur de référence précédente : ${alert.lastReferenceValue} ${alert.counterUnit}, Seuil d'intervention : ${alert.thresholdValue} ${alert.counterUnit})\n` +
      `- Diagnostic / Alerte : ${alert.recommendation}\n\n` +
      `Merci d'effectuer la révision et d'enregistrer les détails dans le compte-rendu technique.`
    );
  };

  const handleCreatePredictiveBT = () => {
    if (!selectedAlertForBT || !onAddIntervention) return;

    onAddIntervention({
      numero: '',
      typeDoc: 'BT',
      equipementId: selectedAlertForBT.equipementId,
      equipementNom: selectedAlertForBT.equipementNom,
      atelier: selectedAlertForBT.atelier,
      urgence: btUrgenceOverride,
      typeProbleme: 'Maintenance Prédictive',
      demandeur: 'IA Analytique (Predictive Maintenance)',
      description: btDescriptionOverride,
      statut: 'En cours', // directly active
      technologie: 'Mécanique',
      gammeId: selectedAlertForBT.gammeId,
      source: 'Analytique Prédictive'
    });

    setSelectedAlertForBT(null);
  };

  const handleOpenParetoBTModal = (eq: any) => {
    setSelectedParetoEqForBT(eq);
    setParetoBtUrgence('Standard');
    setParetoBtDescription(
      `Plan d'action préventif prioritaire (Analyse de Pareto 80/20).\n\n` +
      `Cet équipement [${eq.nom}] fait partie du Top 20% des machines critiques, concentrant à lui seul un volume élevé de pannes/coûts.\n\n` +
      `Instructions :\n` +
      `1. Réaliser un audit de fiabilité approfondi sur cet équipement.\n` +
      `2. Effectuer les opérations de maintenance de niveau 2 ou 3 (nettoyage, graissage, serrage de connectique).\n` +
      `3. Rédiger un plan de maintenance préventive récurrent pour cet équipement s'il n'en possède pas encore.`
    );
  };

  const handleCreateParetoPreventiveBT = () => {
    if (!selectedParetoEqForBT || !onAddIntervention) return;

    onAddIntervention({
      numero: '',
      typeDoc: 'BT',
      equipementId: selectedParetoEqForBT.id,
      equipementNom: selectedParetoEqForBT.nom,
      atelier: selectedParetoEqForBT.atelier,
      urgence: paretoBtUrgence,
      typeProbleme: 'Maintenance Préventive',
      demandeur: 'Optimisation de Pareto (80/20)',
      description: paretoBtDescription,
      statut: 'En cours',
      technologie: 'Mécanique',
      source: 'Analyse Pareto'
    });

    setSelectedParetoEqForBT(null);
  };

  const handleOpenCounterModal = (alert: any) => {
    setUpdatingCounterEqId(alert.equipementId);
    setNewCounterValue(alert.currentCounterValue);
    setNewCounterUnit(alert.counterUnit);
  };

  const handleSaveCounter = () => {
    if (!updatingCounterEqId || !onAddCompteur) return;

    const eq = equipements.find(e => e.id === updatingCounterEqId);
    if (eq) {
      onAddCompteur({
        equipementId: updatingCounterEqId,
        equipementNom: eq.nom,
        valeur: Number(newCounterValue),
        unite: newCounterUnit
      });
    }

    setUpdatingCounterEqId(null);
  };

  // PRINT EXPORT TRIGGER
  const handlePrint = () => {
    window.print();
  };

  // CSV EXPORT TRIGGER
  const handleCSVExport = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Code Eq;Nom;Atelier;Criticite;Nombre de Pannes;Cout Maintenance (EUR);MTBF (H);MTTR (H);Disponibilite (%)\n';
    
    eqPerformanceData.forEach(row => {
      const critText = row.critique ? 'A - CRITIQUE' : 'C - STANDARD';
      const line = `"${row.id}";"${row.nom}";"${row.atelier}";"${critText}";${row.failures};${Math.round(row.cost)};${Math.round(row.mtbf)};${row.mttr.toFixed(1)};${row.availability.toFixed(1)}`;
      csvContent += line + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rapport_performance_gmao_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateAuditReport = () => {
    setIsGeneratingAudit(true);
    setTimeout(() => {
      setIsGeneratingAudit(false);
      setIsAuditModalOpen(true);
      setActiveAuditTab('synthesis');
    }, 800);
  };

  const handleAuditPDFExport = async () => {
    setIsExportingAuditPDF(true);

    const originalStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')) as (HTMLStyleElement | HTMLLinkElement)[];
    const tempStyleTags: HTMLStyleElement[] = [];
    const disabledElements: (HTMLStyleElement | HTMLLinkElement)[] = [];

    const sanitizeCSS = (cssText: string) => {
      return cssText
        .replace(/oklch\(([^)]+)\)/g, (_match, p1) => {
          try {
            const parts = p1.split(/[\s/]+/).filter(Boolean);
            if (parts.length < 3) return 'rgb(120, 120, 120)';
            const l = parts[0].endsWith('%') ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
            const c = parseFloat(parts[1]);
            const h = parseFloat(parts[2]);
            const a = parts[3] ? (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : 1;
            const s = Math.min(100, Math.max(0, c * 250));
            const lightness = Math.min(100, Math.max(0, l * 100));
            const hDecimal = h / 360;
            const sDecimal = s / 100;
            const lDecimal = lightness / 100;
            let r = lDecimal, g = lDecimal, b = lDecimal;
            if (sDecimal !== 0) {
              const q = lDecimal < 0.5 ? lDecimal * (1 + sDecimal) : lDecimal + sDecimal - lDecimal * sDecimal;
              const p = 2 * lDecimal - q;
              const hue2rgb = (pVal: number, qVal: number, tVal: number) => {
                let t = tVal;
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return pVal + (qVal - pVal) * 6 * t;
                if (t < 1/2) return qVal;
                if (t < 2/3) return pVal + (qVal - pVal) * (2/3 - t) * 6;
                return pVal;
              };
              r = hue2rgb(p, q, hDecimal + 1/3);
              g = hue2rgb(p, q, hDecimal);
              b = hue2rgb(p, q, hDecimal - 1/3);
            }
            const rInt = Math.round(r * 255);
            const gInt = Math.round(g * 255);
            const bInt = Math.round(b * 255);
            return a === 1 ? `rgb(${rInt}, ${gInt}, ${bInt})` : `rgba(${rInt}, ${gInt}, ${bInt}, ${a})`;
          } catch (e) {
            return 'rgb(120, 120, 120)';
          }
        })
        .replace(/oklab\(([^)]+)\)/g, (_match, p1) => {
          try {
            const parts = p1.split(/[\s/]+/).filter(Boolean);
            const l = parts[0].endsWith('%') ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
            const val = Math.round(l * 255);
            return `rgb(${val}, ${val}, ${val})`;
          } catch (e) {
            return 'rgb(120, 120, 120)';
          }
        });
    };

    try {
      for (const el of originalStyles) {
        let cssText = '';
        try {
          if (el.tagName.toLowerCase() === 'style') {
            cssText = el.textContent || '';
          } else if (el.tagName.toLowerCase() === 'link') {
            const linkEl = el as HTMLLinkElement;
            const sheet = Array.from(document.styleSheets).find(s => s.href === linkEl.href);
            if (sheet) {
              try {
                const rules = sheet.cssRules || sheet.rules;
                if (rules) {
                  cssText = Array.from(rules).map(r => r.cssText).join('\n');
                }
              } catch (e) {}
            }
            if (!cssText && linkEl.href) {
              const res = await fetch(linkEl.href);
              if (res.ok) {
                cssText = await res.text();
              }
            }
          }
          if (cssText) {
            const sanitized = sanitizeCSS(cssText);
            const tempStyle = document.createElement('style');
            tempStyle.textContent = sanitized;
            document.head.appendChild(tempStyle);
            tempStyleTags.push(tempStyle);
            el.disabled = true;
            disabledElements.push(el);
          }
        } catch (err) {
          console.error('Error disabling style element:', err);
        }
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;
      const contentWidth = pdfWidth - 2 * margin;
      const isDarkMode = document.documentElement.classList.contains('dark');

      const addAuditPageToPDF = async (sectionId: string, addPageBefore: boolean, pageTitle: string) => {
        const sec = document.getElementById(sectionId);
        if (!sec) return;

        const originalStyle = sec.style.cssText;
        if (isDarkMode) {
          sec.style.cssText += 'background-color: #0f172a !important; color: #ffffff !important; padding: 12px !important; border-radius: 8px !important;';
        } else {
          sec.style.cssText += 'background-color: #ffffff !important; color: #0f172a !important; padding: 12px !important; border-radius: 8px !important;';
        }

        const canvas = await html2canvas(sec, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: isDarkMode ? '#0f172a' : '#ffffff'
        });

        sec.style.cssText = originalStyle;

        if (addPageBefore) {
          pdf.addPage();
        }

        // Header framing
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(99, 102, 241); // indigo-500
        pdf.text("GMAO PRO - RAPPORT D'AUDIT TECHNIQUE GLOBAL", margin, 12);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184); // slate-400
        pdf.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} - Page ${pdf.getNumberOfPages()} / 3`, pdfWidth - margin, 12, { align: 'right' });

        // Divider line
        pdf.setDrawColor(226, 232, 240); // slate-200
        pdf.setLineWidth(0.3);
        pdf.line(margin, 15, pdfWidth - margin, 15);

        // Page section title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42); // slate-900
        pdf.text(pageTitle, margin, 22);

        // Add section image
        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * contentWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', margin, 26, contentWidth, imgHeight);

        // Footer framing
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7.5);
        pdf.setTextColor(148, 163, 184);
        pdf.text("Rapport d'audit de maintenance industrielle - Confidentiel Interne", pdfWidth / 2, pdfHeight - 8, { align: 'center' });
      };

      // Generate 3 elegant pages sequentially
      await addAuditPageToPDF('audit-pdf-page-1', false, "1. SYNTHÈSE EXECUTIVE ET STATISTIQUES DES PANNES");
      await addAuditPageToPDF('audit-pdf-page-2', true, "2. DIAGNOSTIC DE DISPONIBILITÉ ET PERFORMANCE DES ATELIERS");
      await addAuditPageToPDF('audit-pdf-page-3', true, "3. AUDIT DES ÉCARTS DE STOCKS ET PLAN D'ACTIONS RECOMMANDÉ");

      pdf.save(`rapport_audit_gmao_complet_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Erreur d'export PDF de l'audit :", error);
    } finally {
      disabledElements.forEach(el => {
        try {
          el.disabled = false;
        } catch (e) {}
      });
      tempStyleTags.forEach(tag => tag.remove());
      setIsExportingAuditPDF(false);
    }
  };

  // PDF EXPORT TRIGGER
  const handlePDFExport = async () => {
    setIsExportingPDF(true);

    const originalStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')) as (HTMLStyleElement | HTMLLinkElement)[];
    const tempStyleTags: HTMLStyleElement[] = [];
    const disabledElements: (HTMLStyleElement | HTMLLinkElement)[] = [];

    // Helper to sanitize CSS text
    const sanitizeCSS = (cssText: string) => {
      return cssText
        .replace(/oklch\(([^)]+)\)/g, (_match, p1) => {
          try {
            const parts = p1.split(/[\s/]+/).filter(Boolean);
            if (parts.length < 3) return 'rgb(120, 120, 120)';

            const l = parts[0].endsWith('%') ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
            const c = parseFloat(parts[1]);
            const h = parseFloat(parts[2]);
            const a = parts[3] ? (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : 1;

            const s = Math.min(100, Math.max(0, c * 250));
            const lightness = Math.min(100, Math.max(0, l * 100));
            
            const hDecimal = h / 360;
            const sDecimal = s / 100;
            const lDecimal = lightness / 100;
            
            let r = lDecimal, g = lDecimal, b = lDecimal;
            if (sDecimal !== 0) {
              const q = lDecimal < 0.5 ? lDecimal * (1 + sDecimal) : lDecimal + sDecimal - lDecimal * sDecimal;
              const p = 2 * lDecimal - q;
              const hue2rgb = (pVal: number, qVal: number, tVal: number) => {
                let t = tVal;
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return pVal + (qVal - pVal) * 6 * t;
                if (t < 1/2) return qVal;
                if (t < 2/3) return pVal + (qVal - pVal) * (2/3 - t) * 6;
                return pVal;
              };
              r = hue2rgb(p, q, hDecimal + 1/3);
              g = hue2rgb(p, q, hDecimal);
              b = hue2rgb(p, q, hDecimal - 1/3);
            }
            
            const rInt = Math.round(r * 255);
            const gInt = Math.round(g * 255);
            const bInt = Math.round(b * 255);
            
            return a === 1 ? `rgb(${rInt}, ${gInt}, ${bInt})` : `rgba(${rInt}, ${gInt}, ${bInt}, ${a})`;
          } catch (e) {
            return 'rgb(120, 120, 120)';
          }
        })
        .replace(/oklab\(([^)]+)\)/g, (_match, p1) => {
          try {
            const parts = p1.split(/[\s/]+/).filter(Boolean);
            const l = parts[0].endsWith('%') ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
            const val = Math.round(l * 255);
            return `rgb(${val}, ${val}, ${val})`;
          } catch (e) {
            return 'rgb(120, 120, 120)';
          }
        });
    };

    try {
      // Extract and sanitize stylesheets, then disable original ones
      for (const el of originalStyles) {
        let cssText = '';
        try {
          if (el.tagName.toLowerCase() === 'style') {
            cssText = el.textContent || '';
          } else if (el.tagName.toLowerCase() === 'link') {
            const linkEl = el as HTMLLinkElement;
            const sheet = Array.from(document.styleSheets).find(s => s.href === linkEl.href);
            if (sheet) {
              try {
                const rules = sheet.cssRules || sheet.rules;
                if (rules) {
                  cssText = Array.from(rules).map(r => r.cssText).join('\n');
                }
              } catch (e) {
                // Ignore cross-origin issues
              }
            }
            if (!cssText && linkEl.href) {
              const res = await fetch(linkEl.href);
              if (res.ok) {
                cssText = await res.text();
              }
            }
          }

          if (cssText) {
            const sanitized = sanitizeCSS(cssText);
            const tempStyle = document.createElement('style');
            tempStyle.textContent = sanitized;
            document.head.appendChild(tempStyle);
            tempStyleTags.push(tempStyle);

            el.disabled = true;
            disabledElements.push(el);
          }
        } catch (err) {
          console.error('Error disabling style element:', err);
        }
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;
      const contentWidth = pdfWidth - 2 * margin;

      const isDarkMode = document.documentElement.classList.contains('dark');

      const addSectionToPDF = async (sectionId: string, addPageBefore: boolean, pageTitle: string) => {
        const sec = document.getElementById(sectionId);
        if (!sec) return;

        // Temporarily prepare container styling for screenshot
        const originalStyle = sec.style.cssText;
        if (isDarkMode) {
          sec.style.cssText += 'background-color: #0f172a !important; color: #ffffff !important; padding: 12px !important; border-radius: 8px !important;';
        } else {
          sec.style.cssText += 'background-color: #ffffff !important; color: #0f172a !important; padding: 12px !important; border-radius: 8px !important;';
        }

        const canvas = await html2canvas(sec, {
          scale: 2, // High resolution
          useCORS: true,
          logging: false,
          backgroundColor: isDarkMode ? '#0f172a' : '#ffffff'
        });

        // Restore styles
        sec.style.cssText = originalStyle;

        if (addPageBefore) {
          pdf.addPage();
        }

        // Draw Page Header & Corporate Logo
        // Left accent colored bar for the logo symbol
        pdf.setFillColor(79, 70, 229); // Royal Indigo
        pdf.rect(margin, 7, 2, 10, 'F');
        
        // Draw corporate logo: beautiful minimalist abstract circles (100% vector, sharp)
        pdf.setFillColor(79, 70, 229); // Indigo circle
        pdf.circle(margin + 8, 12, 3.5, 'F');
        pdf.setFillColor(249, 115, 22); // Orange dot inside
        pdf.circle(margin + 10, 10, 1.2, 'F');
        pdf.setFillColor(255, 255, 255); // White inner core
        pdf.circle(margin + 8, 12, 1.2, 'F');

        // Corporate title text next to logo
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(15, 23, 42); // slate-900
        pdf.text("USINE MÉTAL & PLASTIQUE", margin + 14, 11);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(100, 116, 139); // slate-500
        pdf.text("Département Maintenance & Performance", margin + 14, 15);

        // Right side: Document Title & metadata
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(79, 70, 229); // Royal Indigo
        pdf.text("GMAO PRO • BILAN DE SÉCURITÉ & FIABILITÉ", pdfWidth - margin, 11, { align: 'right' });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(148, 163, 184); // slate-400
        pdf.text(`Rapport généré le ${new Date().toLocaleDateString('fr-FR')} | Confidentiel`, pdfWidth - margin, 15, { align: 'right' });

        // sleek double separator line
        pdf.setDrawColor(226, 232, 240); // slate-200
        pdf.setLineWidth(0.35);
        pdf.line(margin, 19, pdfWidth - margin, 19);
        
        // Accent orange highlight strip underneath separator
        pdf.setDrawColor(249, 115, 22); // Orange
        pdf.setLineWidth(0.6);
        pdf.line(margin, 19, margin + 25, 19);

        // Page title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42); // slate-900
        pdf.text(pageTitle, margin, 25);

        // Add section image (slightly offset down to accommodate beautiful header)
        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * contentWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', margin, 29, contentWidth, imgHeight);

        // Footer
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7.5);
        pdf.setTextColor(148, 163, 184); // slate-400
        pdf.text("Usine Métal & Plastique - Confidentiel - Maintenance Industrielle", pdfWidth / 2, pdfHeight - 8, { align: 'center' });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(148, 163, 184); // slate-400
        pdf.text(`Page ${pdf.getNumberOfPages()}`, pdfWidth - margin, pdfHeight - 8, { align: 'right' });
      };

      // Page 1: KPIs + Cost evolution chart
      await addSectionToPDF('pdf-section-kpi-and-costs', false, "1. Indicateurs de Performance Globaux (KPIs) & Coûts");
      
      // Page 2: Charts row 2 & AI Diagnostics
      await addSectionToPDF('pdf-section-tech-and-ai', true, "2. Analyse Technique & Diagnostic Assisté par IA");

      // Page 3: Preventive Plan comparison (Theoretical vs Actual)
      await addSectionToPDF('pdf-section-preventive-plan', true, "3. Suivi du Plan Préventif (Théorique vs Réel)");

      // Page 4: Detailed table
      await addSectionToPDF('pdf-section-table', true, "4. Tableau de Bord de Fiabilité par Équipement");

      pdf.save(`rapport_performance_gmao_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF :", error);
    } finally {
      // Cleanup: Re-enable original stylesheets and remove temporary ones
      disabledElements.forEach(el => {
        try {
          el.disabled = false;
        } catch (e) {
          // Ignore if already enabled or failed
        }
      });
      tempStyleTags.forEach(tag => tag.remove());
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-primary-900 p-5 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-800 print:shadow-none print:border-none print:p-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="text-accent-orange" size={24} />
            <h1 className="text-2xl font-display font-bold text-primary-900 dark:text-white flex items-center">
              Analytique & Reporting Performance
              <ModuleHelp moduleId="reporting" />
            </h1>
          </div>
          <p className="text-xs text-primary-500 max-w-2xl print:hidden">
            Analysez la fiabilité de votre outil industriel en temps réel. Suivez les indicateurs clés (MTBF, MTTR, Disponibilité) et optimisez votre budget de maintenance préventive.
          </p>
          <div className="hidden print:block text-xs text-primary-600 mt-1 font-mono">
            Rapport généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')} - Usine Métal & Plastique
          </div>
        </div>

        {/* QUICK REPORT ACTION BUTTONS */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={handleGenerateAuditReport}
            disabled={isGeneratingAudit}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 transition cursor-pointer border border-indigo-200 dark:border-indigo-800/40 shadow-sm disabled:opacity-50"
          >
            {isGeneratingAudit ? (
              <Loader2 size={15} className="animate-spin text-indigo-500" />
            ) : (
              <Sparkles size={15} className="text-accent-orange animate-pulse" />
            )}
            <span>{isGeneratingAudit ? "Compilation..." : "Générer rapport d'audit"}</span>
          </button>

          <button
            onClick={handleCSVExport}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 transition cursor-pointer"
          >
            <FileSpreadsheet size={15} />
            <span>Exporter CSV</span>
          </button>

          <button
            onClick={handlePDFExport}
            disabled={isExportingPDF}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExportingPDF ? (
              <Loader2 size={15} className="animate-spin text-blue-500" />
            ) : (
              <FileText size={15} />
            )}
            <span>{isExportingPDF ? "Génération PDF..." : "Exporter PDF"}</span>
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-primary-700 bg-primary-100 dark:bg-primary-800 dark:text-primary-300 rounded-lg hover:bg-primary-200 transition cursor-pointer"
          >
            <Printer size={15} />
            <span>Imprimer le Rapport</span>
          </button>

          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 transition cursor-pointer border border-indigo-200 dark:border-indigo-800/40 shadow-sm"
          >
            <Mail size={15} className="text-indigo-600 dark:text-indigo-400" />
            <span>Planifier l'envoi auto.</span>
            {scheduleConfig.active && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* SUB-MODULE NAVIGATION TABS */}
      <div className="flex border-b border-primary-200 dark:border-primary-800 gap-6 text-sm font-bold print:hidden">
        <button
          id="tab-btn-performance"
          onClick={() => setActiveSectionTab('performance')}
          className={`pb-3 px-1 transition-all relative cursor-pointer ${
            activeSectionTab === 'performance'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-primary-400 hover:text-primary-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={16} />
            <span>Tableau de Bord & Performance</span>
          </div>
          {activeSectionTab === 'performance' && (
            <motion.div
              layoutId="reportingActiveTabLine"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"
              style={{ originY: 0 }}
            />
          )}
        </button>
        <button
          id="tab-btn-predictive"
          onClick={() => setActiveSectionTab('predictive')}
          className={`pb-3 px-1 transition-all relative cursor-pointer ${
            activeSectionTab === 'predictive'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-primary-400 hover:text-primary-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500 animate-pulse" />
            <span>Maintenance Prédictive des Compteurs</span>
            <span className="bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full animate-pulse ml-1">
              {predictiveAlerts.filter(a => a.status === 'Critique').length}
            </span>
          </div>
          {activeSectionTab === 'predictive' && (
            <motion.div
              layoutId="reportingActiveTabLine"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"
              style={{ originY: 0 }}
            />
          )}
        </button>
        <button
          id="tab-btn-pareto"
          onClick={() => setActiveSectionTab('pareto')}
          className={`pb-3 px-1 transition-all relative cursor-pointer ${
            activeSectionTab === 'pareto'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-primary-400 hover:text-primary-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-orange-500" />
            <span>Analyse de Pareto (80/20)</span>
            <span className="bg-orange-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ml-1">
              Top 20%
            </span>
          </div>
          {activeSectionTab === 'pareto' && (
            <motion.div
              layoutId="reportingActiveTabLine"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"
              style={{ originY: 0 }}
            />
          )}
        </button>
      </div>

      {activeSectionTab === 'performance' ? (
        <>
          {/* FILTER CONTROL PANEL */}
      <div className="bg-white dark:bg-primary-900 p-4 rounded-xl shadow-sm border border-primary-100 dark:border-primary-800 flex flex-wrap items-center gap-4 print:hidden">
        <div className="flex items-center gap-2 text-xs font-bold text-primary-700 dark:text-primary-300 mr-2">
          <Filter size={15} className="text-accent-orange" />
          <span>Filtres Actifs :</span>
        </div>

        {/* Period filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-primary-400 font-bold uppercase">Période d'Analyse</label>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as any)}
            className="text-xs py-1.5 px-3 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg font-bold text-primary-800 dark:text-primary-200 focus:outline-none focus:border-accent-orange"
          >
            <option value="3">Trimestriel (3 mois)</option>
            <option value="6">Semestriel (6 mois)</option>
            <option value="12">Annuel (12 mois)</option>
            <option value="custom">📅 Personnalisé...</option>
            <option value="all">Tout l'historique</option>
          </select>
        </div>

        {/* Custom date range inputs */}
        {period === 'custom' && (
          <div className="flex items-center gap-2 bg-indigo-50/40 dark:bg-indigo-950/20 p-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40 animate-fade-in">
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] text-indigo-500 font-bold uppercase">Début</label>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="text-xs py-0.5 px-1.5 bg-white dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded font-mono font-bold text-primary-800 dark:text-primary-200 focus:outline-none"
              />
            </div>
            <span className="text-primary-400 self-end mb-1 text-[11px]">à</span>
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] text-indigo-500 font-bold uppercase">Fin</label>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="text-xs py-0.5 px-1.5 bg-white dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded font-mono font-bold text-primary-800 dark:text-primary-200 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Atelier filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-primary-400 font-bold uppercase">Atelier de Production</label>
          <select
            value={selectedAtelier}
            onChange={e => setSelectedAtelier(e.target.value)}
            className="text-xs py-1.5 px-3 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg font-bold text-primary-800 dark:text-primary-200 focus:outline-none focus:border-accent-orange"
          >
            <option value="all">Tous les ateliers</option>
            {[...listAteliers].sort((a, b) => a.localeCompare(b)).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Criticality filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-primary-400 font-bold uppercase">Criticité Asset</label>
          <select
            value={selectedCriticite}
            onChange={e => setSelectedCriticite(e.target.value as any)}
            className="text-xs py-1.5 px-3 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg font-bold text-primary-800 dark:text-primary-200 focus:outline-none focus:border-accent-orange"
          >
            <option value="all">Toutes criticités</option>
            <option value="critique">Critique (A) uniquement</option>
            <option value="standard">Standard (B / C) uniquement</option>
          </select>
        </div>

        {/* Dynamic subset indicator */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {selectedChartTech && (
            <span className="flex items-center gap-1 bg-orange-100 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-[10px] font-bold px-2.5 py-1 rounded-lg">
              <span>Technologie: <strong>{selectedChartTech}</strong></span>
              <button 
                onClick={() => setSelectedChartTech(null)} 
                className="hover:bg-orange-200 dark:hover:bg-orange-900/40 rounded-full h-4 w-4 flex items-center justify-center font-bold text-xs cursor-pointer ml-1"
                title="Supprimer le filtre"
              >
                ×
              </button>
            </span>
          )}
          {activeKpiFilter !== 'all' && (
            <span className="flex items-center gap-1 bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2.5 py-1 rounded-lg">
              <span>Filtre KPI: <strong>{activeKpiFilter === 'availability' ? 'Dispo < 95%' : activeKpiFilter === 'failures' ? 'Pannes répétitives (≥2)' : activeKpiFilter === 'mttr' ? 'MTTR Critique (>2h)' : 'Coût Élevé (>500€)'}</strong></span>
              <button 
                onClick={() => setActiveKpiFilter('all')} 
                className="hover:bg-blue-200 dark:hover:bg-blue-900/40 rounded-full h-4 w-4 flex items-center justify-center font-bold text-xs cursor-pointer ml-1"
                title="Supprimer le filtre"
              >
                ×
              </button>
            </span>
          )}
          <div className="flex items-center gap-1 bg-primary-50 dark:bg-primary-950 px-3 py-1.5 rounded-lg border border-primary-200/50 dark:border-primary-800/50">
            <Layers size={13} className="text-primary-400" />
            <span className="text-[10px] font-mono text-primary-500 font-bold">
              {filteredData.equipements.length} Machines / {filteredData.interventions.length} BTs filtrés
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: KPIS & COSTS (FOR PDF EXPORT) */}
      <div id="pdf-section-kpi-and-costs" className="space-y-6">
        {/* KPI GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Availability Card */}
        <div 
          onClick={() => setActiveKpiFilter(prev => prev === 'availability' ? 'all' : 'availability')}
          className={`p-4 rounded-xl shadow-sm border flex flex-col justify-between transition-all duration-200 cursor-pointer ${
            activeKpiFilter === 'availability' 
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5' 
              : 'bg-white dark:bg-primary-900 border-primary-100 dark:border-primary-800 hover:border-emerald-500 hover:shadow-md'
          }`}
          title="Cliquez pour filtrer les équipements avec Disponibilité < 95%"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-primary-500 font-bold">Taux de Disponibilité</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
              <Activity size={16} />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-mono font-bold text-primary-900 dark:text-white">
              {stats.availability.toFixed(1)}%
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-emerald-500 font-bold font-sans">
                Cible : 96.5%
              </span>
              <span className="text-[9px] text-primary-400 italic">Filtrer &darr;</span>
            </div>
          </div>
        </div>

        {/* MTBF Card (Pannes Repetitives Filter) */}
        <div 
          onClick={() => setActiveKpiFilter(prev => prev === 'failures' ? 'all' : 'failures')}
          className={`p-4 rounded-xl shadow-sm border flex flex-col justify-between transition-all duration-200 cursor-pointer ${
            activeKpiFilter === 'failures' 
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5' 
              : 'bg-white dark:bg-primary-900 border-primary-100 dark:border-primary-800 hover:border-blue-500 hover:shadow-md'
          }`}
          title="Cliquez pour filtrer les équipements ayant subi ≥ 2 pannes"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-primary-500 font-bold">MTBF (Fiabilité Globale)</span>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
              <Clock size={16} />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-mono font-bold text-primary-900 dark:text-white">
              {Math.round(stats.mtbf)} <span className="text-xs">H</span>
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-primary-400 font-sans">
                Intervalle moyen
              </span>
              <span className="text-[9px] text-primary-400 italic">Filtrer &darr;</span>
            </div>
          </div>
        </div>

        {/* MTTR Card */}
        <div 
          onClick={() => setActiveKpiFilter(prev => prev === 'mttr' ? 'all' : 'mttr')}
          className={`p-4 rounded-xl shadow-sm border flex flex-col justify-between transition-all duration-200 cursor-pointer ${
            activeKpiFilter === 'mttr' 
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5' 
              : 'bg-white dark:bg-primary-900 border-primary-100 dark:border-primary-800 hover:border-amber-500 hover:shadow-md'
          }`}
          title="Cliquez pour filtrer les équipements avec MTTR > 2 heures"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-primary-500 font-bold">MTTR (Réactivité Réparation)</span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
              <Wrench size={16} />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-mono font-bold text-primary-900 dark:text-white">
              {stats.mttr.toFixed(1)} <span className="text-xs">H</span>
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-primary-400 font-sans">
                Moyenne de réparation
              </span>
              <span className="text-[9px] text-primary-400 italic">Filtrer &darr;</span>
            </div>
          </div>
        </div>

        {/* Total Cost Card */}
        <div 
          onClick={() => setActiveKpiFilter(prev => prev === 'cost' ? 'all' : 'cost')}
          className={`p-4 rounded-xl shadow-sm border flex flex-col justify-between transition-all duration-200 cursor-pointer ${
            activeKpiFilter === 'cost' 
              ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-500/5' 
              : 'bg-white dark:bg-primary-900 border-primary-100 dark:border-primary-800 hover:border-orange-500 hover:shadow-md'
          }`}
          title="Cliquez pour filtrer les équipements coûteux (> 500 €)"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-primary-500 font-bold">Coût Maintenance Total</span>
            <span className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 text-accent-orange">
              <Euro size={16} />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-mono font-bold text-primary-900 dark:text-white">
              {Math.round(stats.totalCost).toLocaleString('fr-FR')} {settings.devise}
            </span>
            <div className="flex items-center justify-between text-[10px] text-primary-400 font-mono mt-1 w-full">
              <span>MO: {Math.round(stats.laborCost)} €</span>
              <span>Pièces: {Math.round(stats.partsCost)} €</span>
            </div>
          </div>
        </div>

      </div>

      {/* CORE CHARTS ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cost evolution chart (labor vs parts) */}
        <div className="lg:col-span-2 bg-white dark:bg-primary-900 p-5 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-800">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-5">
            <div>
              <h3 className="font-display font-bold text-sm text-primary-800 dark:text-primary-100 flex items-center gap-1.5">
                <Activity size={16} className="text-accent-orange" />
                <span>
                  {chartMetric === 'costs' ? 'Évolution des Coûts Cumulés (MO + Pièces)' : 
                   chartMetric === 'volume' ? 'Volume et Répartition des Bons de Travail' : 
                   'Intensité de Main d\'Œuvre (Heures passées)'}
                </span>
              </h3>
              <p className="text-[10px] text-primary-400 mt-0.5">Données de performance filtrées par mois</p>
            </div>
            
            <div className="flex bg-primary-50 dark:bg-primary-950 p-1 rounded-lg border border-primary-200/50 dark:border-primary-800/50 text-[10px] self-start sm:self-auto shrink-0 font-bold shadow-inner">
              <button
                onClick={() => setChartMetric('costs')}
                className={`px-2.5 py-1 rounded-md transition-all duration-150 cursor-pointer ${chartMetric === 'costs' ? 'bg-white dark:bg-primary-900 shadow-sm text-accent-orange' : 'text-primary-500 hover:text-primary-800 dark:hover:text-primary-300'}`}
              >
                Coûts (€)
              </button>
              <button
                onClick={() => setChartMetric('volume')}
                className={`px-2.5 py-1 rounded-md transition-all duration-150 cursor-pointer ${chartMetric === 'volume' ? 'bg-white dark:bg-primary-900 shadow-sm text-accent-orange' : 'text-primary-500 hover:text-primary-800 dark:hover:text-primary-300'}`}
              >
                Volume BT
              </button>
              <button
                onClick={() => setChartMetric('hours')}
                className={`px-2.5 py-1 rounded-md transition-all duration-150 cursor-pointer ${chartMetric === 'hours' ? 'bg-white dark:bg-primary-900 shadow-sm text-accent-orange' : 'text-primary-500 hover:text-primary-800 dark:hover:text-primary-300'}`}
              >
                Heures (h)
              </button>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {chartMetric === 'costs' ? (
                <BarChart data={chartData.monthlyList}>
                  <defs>
                    <linearGradient id="colorLabor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.85}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.45}/>
                    </linearGradient>
                    <linearGradient id="colorParts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.85}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.45}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:opacity-5" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis unit="€" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="labor" name="Main d'Œuvre (MO)" stackId="a" fill="url(#colorLabor)" />
                  <Bar dataKey="parts" name="Pièces Détachées" stackId="a" fill="url(#colorParts)" />
                </BarChart>
              ) : chartMetric === 'volume' ? (
                <BarChart data={chartData.monthlyList}>
                  <defs>
                    <linearGradient id="colorCorr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.85}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.45}/>
                    </linearGradient>
                    <linearGradient id="colorPrev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.85}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.45}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:opacity-5" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="corr" name="Pannes (Correctif)" stackId="b" fill="url(#colorCorr)" />
                  <Bar dataKey="prev" name="Rondes (Préventif)" stackId="b" fill="url(#colorPrev)" />
                </BarChart>
              ) : (
                <AreaChart data={chartData.monthlyList}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:opacity-5" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis unit="h" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                  <Area type="monotone" dataKey="hours" name="Heures passées" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Preventive vs Corrective trend ratio OR MTBF/MTTR Trends */}
        <div className="bg-white dark:bg-primary-900 p-5 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-800">
          <div className="flex justify-between items-center mb-4 border-b border-primary-50 dark:border-primary-850 pb-2">
            <div className="flex bg-primary-50 dark:bg-primary-950 p-0.5 rounded-lg border border-primary-200/50 dark:border-primary-800/50 text-[10px] font-bold shadow-inner">
              <button
                onClick={() => setRightPanelTab('gauge')}
                className={`px-3 py-1 rounded-md transition-all duration-150 cursor-pointer ${rightPanelTab === 'gauge' ? 'bg-white dark:bg-primary-900 shadow-sm text-accent-orange' : 'text-primary-500 hover:text-primary-800 dark:hover:text-primary-300'}`}
              >
                Taux Préventif
              </button>
              <button
                onClick={() => setRightPanelTab('trend')}
                className={`px-3 py-1 rounded-md transition-all duration-150 cursor-pointer ${rightPanelTab === 'trend' ? 'bg-white dark:bg-primary-900 shadow-sm text-accent-orange' : 'text-primary-500 hover:text-primary-800 dark:hover:text-primary-300'}`}
              >
                Tendance MTBF/MTTR
              </button>
            </div>

            <span className="text-[10px] font-mono text-primary-400 font-bold uppercase">
              Rapport GMAO
            </span>
          </div>

          {rightPanelTab === 'gauge' ? (
            <>
              <div className="h-40 flex flex-col justify-center items-center relative">
                {/* Minimalist Gauge Circle */}
                <div className="relative h-32 w-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="52"
                      stroke="#e2e8f0"
                      strokeWidth="10"
                      fill="transparent"
                      className="dark:stroke-primary-800"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="52"
                      stroke="#f97316"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray="326.7"
                      strokeDashoffset={326.7 - (326.7 * stats.preventiveRatio) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-2xl font-mono font-extrabold text-primary-900 dark:text-white">
                      {Math.round(stats.preventiveRatio)}%
                    </span>
                    <span className="block text-[9px] text-primary-400 uppercase font-bold tracking-wider mt-0.5">
                      Préventif
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-primary-50 dark:border-primary-850 pt-3 flex justify-between text-xs">
                <div className="text-center">
                  <span className="text-[10px] text-primary-400 block">Correctif</span>
                  <span className="font-mono font-bold text-primary-800 dark:text-primary-200">
                    {chartData.monthlyList.reduce((sum, m) => sum + m.corr, 0)} BTs
                  </span>
                </div>
                <div className="text-center border-x px-4 border-primary-100 dark:border-primary-800">
                  <span className="text-[10px] text-primary-400 block">Préventif</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {chartData.monthlyList.reduce((sum, m) => sum + m.prev, 0)} BTs
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-primary-400 block">Total</span>
                  <span className="font-mono font-bold text-primary-800 dark:text-primary-200">
                    {stats.totalBTCount} BTs
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col h-48 justify-between">
              <div className="h-40 mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.monthlyList}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:opacity-5" />
                    <XAxis dataKey="monthLabel" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#3b82f6' }} width={25} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#f59e0b' }} width={25} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '10px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '9px', marginTop: '-10px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="mtbf" name="MTBF (H)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line yAxisId="right" type="monotone" dataKey="mttr" name="MTTR (H)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[9px] text-primary-400 text-center italic mt-1 leading-tight">
                Le MTBF représente la fiabilité moyenne. Le MTTR mesure le délai moyen de remise en service.
              </p>
            </div>
          )}
        </div>

      </div>

      </div>

      {/* SECTION 2: TECH & AI (FOR PDF EXPORT) */}
      <div id="pdf-section-tech-and-ai" className="space-y-6">
        {/* CORE CHARTS ROW 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top costly machines (Bar chart) */}
        <div className="bg-white dark:bg-primary-900 p-5 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-sm text-primary-800 dark:text-primary-100">
              Top 5 Équipements les plus coûteux
            </h3>
            <span className="text-[10px] text-primary-400 font-bold uppercase font-sans">
              Main d'Œuvre + Consommables
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.topEquipments}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:opacity-5" />
                <XAxis type="number" unit="€" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis dataKey="nom" type="category" width={110} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '9px' }} />
                <Bar dataKey="labor" name="Coût MO (€)" stackId="a" fill="#3b82f6" />
                <Bar dataKey="parts" name="Coût Pièces (€)" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Technology/Cause Breakdown (Pie Chart) */}
        <div className="bg-white dark:bg-primary-900 p-5 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-800">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-display font-bold text-sm text-primary-800 dark:text-primary-100">
                Distribution des Pannes par Technologie
              </h3>
              <p className="text-[10px] text-primary-400 mt-0.5">Cliquez sur une section pour filtrer les machines</p>
            </div>
            <span className="text-[10px] text-primary-400 font-bold uppercase font-sans">
              Origines des Défaillances
            </span>
          </div>

          <div className="h-64 flex flex-col md:flex-row items-center justify-around">
            {chartData.techList.length === 0 ? (
              <p className="text-xs text-primary-400 italic">Aucune panne corrective sur cette période.</p>
            ) : (
              <>
                <div className="h-48 w-48 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.techList}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        onClick={(data) => {
                          if (data && data.name) {
                            setSelectedChartTech(prev => prev === data.name ? null : data.name);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        {chartData.techList.map((entry, index) => {
                          const isSelected = selectedChartTech === entry.name;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={chartData.COLORS[index % chartData.COLORS.length]} 
                              opacity={selectedChartTech ? (isSelected ? 1 : 0.35) : 1}
                              stroke={isSelected ? '#fff' : 'transparent'}
                              strokeWidth={isSelected ? 2 : 0}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  {selectedChartTech && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center bg-white/95 dark:bg-slate-900/95 p-1.5 rounded-lg shadow-sm border border-primary-100 dark:border-primary-800 max-w-[110px]">
                        <p className="text-[9px] font-bold text-orange-600 dark:text-orange-400 truncate">{selectedChartTech}</p>
                        <p className="text-[8px] text-primary-400">Filtre Actif</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1.5 max-w-[180px] w-full mt-4 md:mt-0">
                  {chartData.techList.map((entry, index) => {
                    const isSelected = selectedChartTech === entry.name;
                    return (
                      <button 
                        key={entry.name} 
                        onClick={() => setSelectedChartTech(prev => prev === entry.name ? null : entry.name)}
                        className={`flex items-center justify-between text-[11px] w-full text-left p-1 rounded-lg transition-all duration-150 cursor-pointer ${
                          selectedChartTech ? (isSelected ? 'bg-primary-50 dark:bg-primary-850 font-bold ring-1 ring-primary-200 dark:ring-primary-800' : 'opacity-40 hover:opacity-70') : 'hover:bg-primary-50 dark:hover:bg-primary-850'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: chartData.COLORS[index % chartData.COLORS.length] }}
                          />
                          <span className="font-medium text-primary-700 dark:text-primary-300 truncate">{entry.name}</span>
                        </div>
                        <span className="font-mono text-primary-400 ml-2 font-bold">{entry.value} BTs</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* AI DYNAMIC REPORT INSIGHTS */}
      <div className="bg-gradient-to-br from-primary-900 via-primary-950 to-primary-950 dark:from-primary-950 dark:to-black p-5 rounded-2xl text-white shadow-xl border border-primary-800 flex flex-col md:flex-row gap-5">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-orange-500/10 text-accent-orange animate-pulse">
              <Sparkles size={18} />
            </span>
            <h2 className="font-display font-bold text-base text-white">
              Analyse Automatisée des Défaillances & Diagnostic IA
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-primary-200">
            {insights.map((insight, idx) => {
              const cleaned = insight.replace(/\*\*/g, '');
              const isWarning = cleaned.startsWith('⚠️');
              const isSuccess = cleaned.startsWith('🎉') || cleaned.startsWith('✅') || cleaned.startsWith('⚡');
              const isAlert = cleaned.startsWith('🔍');
              
              let borderClass = "border-primary-800/40 bg-white/5";
              if (isWarning) borderClass = "border-amber-500/30 bg-amber-500/5";
              if (isSuccess) borderClass = "border-emerald-500/30 bg-emerald-500/5";
              if (isAlert) borderClass = "border-orange-500/30 bg-orange-500/5";

              return (
                <div key={idx} className={`p-3 rounded-xl border ${borderClass} leading-relaxed`}>
                  {cleaned}
                </div>
              );
            })}
          </div>
        </div>

        <div className="md:w-64 bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between text-xs shrink-0">
          <div>
            <div className="flex items-center gap-1.5 mb-2 font-bold text-white">
              <Info size={14} className="text-accent-orange" />
              <span>Résumé Opérationnel</span>
            </div>
            <p className="text-primary-300 leading-relaxed text-[11px]">
              La disponibilité globale de vos installations est estimée à <strong className="text-emerald-400">{stats.availability.toFixed(1)}%</strong>. 
              Le préventif représente <strong className="text-accent-orange">{Math.round(stats.preventiveRatio)}%</strong> du plan de charge.
            </p>
          </div>
          <div className="pt-3 border-t border-white/10 mt-3 text-[10px] text-primary-400 italic">
            Prochain cycle préventif automatique : Fin de mois en cours.
          </div>
        </div>
      </div>

      </div>

      {/* SECTION SPARE PARTS TREND & FORECASTS */}
      <div className="bg-white dark:bg-primary-900 p-6 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary-50 dark:border-primary-850 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <Package size={18} />
              </span>
              <h3 className="font-display font-bold text-base text-primary-900 dark:text-white">
                Tendance de Consommation & Prévision d'Achats des Pièces
              </h3>
            </div>
            <p className="text-xs text-primary-400 mt-1">
              Analyse prédictive de consommation basée sur l'historique des bons de travail pour anticiper les ruptures
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 px-2.5 py-1 rounded-full font-bold font-mono">
              PROFIL DE STOCK : {partsConsumptionData.itemsWithPurchaseNeed} BESOINS IDENTIFIÉS
            </span>
          </div>
        </div>

        {/* Top KPIs Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          <div className="p-4 bg-primary-50/30 dark:bg-primary-950/10 border border-primary-100/50 dark:border-primary-800/40 rounded-xl">
            <span className="block text-[10px] uppercase font-bold text-primary-400 tracking-wider">Moyenne Mensuelle</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-mono font-extrabold text-primary-900 dark:text-white">
                {partsConsumptionData.overallAvgQty} pces
              </span>
              <span className="text-xs text-primary-400">({partsConsumptionData.overallAvgCost} €)</span>
            </div>
          </div>
          <div className="p-4 bg-primary-50/30 dark:bg-primary-950/10 border border-primary-100/50 dark:border-primary-800/40 rounded-xl">
            <span className="block text-[10px] uppercase font-bold text-primary-400 tracking-wider">Budget d'Achats Anticipé (M+1)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                {partsConsumptionData.totalBudgetForecast} €
              </span>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">Recommandé</span>
            </div>
          </div>
          <div className="p-4 bg-primary-50/30 dark:bg-primary-950/10 border border-primary-100/50 dark:border-primary-800/40 rounded-xl">
            <span className="block text-[10px] uppercase font-bold text-primary-400 tracking-wider">Taux de Rotation Estimé</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-mono font-extrabold text-amber-500">
                {Math.round(partsConsumptionData.overallAvgQty > 0 ? (pieces.reduce((acc, p) => acc + p.quantite, 0) / partsConsumptionData.overallAvgQty) : 0)} mois
              </span>
              <span className="text-xs text-primary-400">de couverture globale</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
          {/* Trend Chart */}
          <div className="lg:col-span-2 space-y-2">
            <h4 className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider flex items-center gap-1">
              <Activity size={14} className="text-indigo-500" />
              <span>Tendance mensuelle & Projection prédictive</span>
            </h4>
            <div className="h-64 border border-primary-100/60 dark:border-primary-800/40 rounded-xl p-4 bg-primary-50/10 dark:bg-primary-950/5">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={partsConsumptionData.monthlyPartsTrend}>
                  <defs>
                    <linearGradient id="partsConsoColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:opacity-5" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#6366f1' }} label={{ value: 'Quantité (pcs)', angle: -90, position: 'insideLeft', style: { fontSize: 8, fill: '#6366f1' } }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#10b981' }} label={{ value: 'Coût (€)', angle: 90, position: 'insideRight', style: { fontSize: 8, fill: '#10b981' } }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '9px' }} />
                  <Area yAxisId="left" type="monotone" dataKey="qty" name="Quantité Consommée" fill="url(#partsConsoColor)" stroke="#6366f1" strokeWidth={2} />
                  <Bar yAxisId="right" dataKey="cost" name="Coût des Pièces (€)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-primary-400 italic text-center">
              * La dernière colonne affiche la projection prédictive pour le mois prochain basée sur la moyenne mobile historique.
            </p>
          </div>

          {/* Predictive Purchasing Assistant */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-500" />
              <span>Assistant d'Achat Prédictif (Top Consommés)</span>
            </h4>
            <div className="space-y-3 overflow-y-auto max-h-[260px] pr-1 scrollbar-thin">
              {partsConsumptionData.topConsumedParts.slice(0, 5).map(part => {
                const urgencyColor = part.status === 'Critique' ? 'bg-red-500/10 text-red-500 border-red-500/20' : part.status === 'Sous-seuil' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
                return (
                  <div key={part.id} className="p-3 bg-primary-50/20 dark:bg-primary-950/15 border border-primary-100 dark:border-primary-800 rounded-xl flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-primary-400 font-bold">{part.codeArticle}</span>
                        <h5 className="text-xs font-bold text-primary-900 dark:text-white truncate" title={part.designation}>
                          {part.designation}
                        </h5>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${urgencyColor}`}>
                        {part.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-[10px] text-primary-400 border-t border-b border-primary-100/50 dark:border-primary-800/30 py-1.5 font-semibold">
                      <div>
                        <span>Stock Actuel</span>
                        <span className="block font-mono font-extrabold text-primary-800 dark:text-white mt-0.5">
                          {part.currentStock} pcs
                        </span>
                      </div>
                      <div>
                        <span>Seuil Alerte</span>
                        <span className="block font-mono font-bold text-primary-500 mt-0.5">
                          {part.seuil} pcs
                        </span>
                      </div>
                      <div>
                        <span>Moy. Mensuelle</span>
                        <span className="block font-mono font-bold text-primary-500 mt-0.5">
                          {part.avgMonthlyQty} pcs
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[10px] text-primary-400">Achat suggéré :</span>
                      <span className={`font-mono font-bold ${part.projectedNeed > 0 ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-primary-400'}`}>
                        {part.projectedNeed > 0 ? `+${part.projectedNeed} pcs (${part.projectedCost} €)` : 'Sécurisé (0 pcs)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Global Anticipation Purchase Plan Table */}
        <div className="space-y-2.5 border-t border-primary-50 dark:border-primary-850 pt-5 font-sans">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Plan Complet d'Approvisionnement Prédictif (M+1)</span>
            </h4>
            <span className="text-[10px] text-primary-400 font-bold">
              Affichage de {partsConsumptionData.topConsumedParts.length} articles identifiés
            </span>
          </div>

          <div className="overflow-x-auto border border-primary-100 dark:border-primary-800 rounded-xl bg-primary-50/5 dark:bg-primary-950/5">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-primary-100/45 dark:bg-primary-900/60 border-b border-primary-100 dark:border-primary-800 text-[10px] text-primary-400 font-bold uppercase tracking-wider">
                  <th className="p-3">Code Article</th>
                  <th className="p-3">Désignation</th>
                  <th className="p-3">Fournisseur</th>
                  <th className="p-3 text-center">Total Consommé (Période)</th>
                  <th className="p-3 text-center">Consom. Moy. Mensuelle</th>
                  <th className="p-3 text-center">Stock Actuel</th>
                  <th className="p-3 text-center">Seuil Sécurité</th>
                  <th className="p-3 text-right">Quantité Suggérée (M+1)</th>
                  <th className="p-3 text-right">Budget Estimé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100/60 dark:divide-primary-800/55 font-semibold text-primary-700 dark:text-primary-300">
                {partsConsumptionData.topConsumedParts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-primary-400 italic">
                      Aucune consommation de pièces enregistrée sur cette période dans les rapports d'intervention.
                    </td>
                  </tr>
                ) : (
                  partsConsumptionData.topConsumedParts.map(part => (
                    <tr key={part.id} className="hover:bg-primary-50/30 dark:hover:bg-primary-950/15 transition-colors">
                      <td className="p-3 font-mono text-[10px] text-primary-400">{part.codeArticle}</td>
                      <td className="p-3 text-primary-900 dark:text-white truncate max-w-[200px]" title={part.designation}>
                        {part.designation}
                      </td>
                      <td className="p-3 text-primary-400 truncate max-w-[120px]" title={part.fournisseur}>
                        {part.fournisseur}
                      </td>
                      <td className="p-3 text-center font-mono">{part.totalQty}</td>
                      <td className="p-3 text-center font-mono">{part.avgMonthlyQty} / mois</td>
                      <td className="p-3 text-center font-mono">
                        <span className={part.currentStock <= part.seuil ? 'text-amber-500 font-bold' : ''}>
                          {part.currentStock}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-primary-400">{part.seuil}</td>
                      <td className="p-3 text-right font-mono text-indigo-600 dark:text-indigo-400 font-extrabold">
                        {part.projectedNeed > 0 ? `+${part.projectedNeed}` : '0'}
                      </td>
                      <td className="p-3 text-right font-mono text-primary-900 dark:text-white">
                        {part.projectedNeed > 0 ? `${part.projectedCost} €` : '0 €'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION COMPARATIVE VIEW: PREVENTIVE PLAN THEORETICAL VS ACTUAL */}
      <div id="pdf-section-preventive-plan" className="space-y-6">
        <div className="bg-white dark:bg-primary-900 p-6 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-800 space-y-6">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary-50 dark:border-primary-850 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Calendar size={18} />
                </span>
                <h3 className="font-display font-bold text-base text-primary-900 dark:text-white">
                  Suivi & Adhérence au Plan Préventif (Théorique vs Réel)
                </h3>
              </div>
              <p className="text-xs text-primary-400 mt-1 max-w-3xl">
                Superposition de la planification théorique (Fréquence des gammes configurées) et du volume d'interventions préventives réellement exécutées sur la période sélectionnée.
              </p>
            </div>
            
            <div className="flex items-center gap-1 bg-indigo-50/50 dark:bg-indigo-950/20 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Analyse consolidée ({period === 'all' ? "Toute la période" : `${period} derniers mois`})</span>
            </div>
          </div>

          {/* Quick KPIs Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Adherence Score */}
            <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-950/40 dark:to-primary-900/40 p-4 rounded-xl border border-primary-150 dark:border-primary-800/60 relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400 block mb-1">Taux d'adhérence global (SLA)</span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-mono font-black ${
                    preventiveComparisonData.globalCompliance >= 85 ? 'text-emerald-600 dark:text-emerald-400' :
                    preventiveComparisonData.globalCompliance >= 60 ? 'text-amber-500' : 'text-rose-500'
                  }`}>
                    {preventiveComparisonData.globalCompliance}%
                  </span>
                  <span className="text-[10px] text-primary-400">du plan</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-primary-200 dark:bg-primary-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      preventiveComparisonData.globalCompliance >= 85 ? 'bg-emerald-500' :
                      preventiveComparisonData.globalCompliance >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                    }`} 
                    style={{ width: `${preventiveComparisonData.globalCompliance}%` }} 
                  />
                </div>
                <span className="text-[9px] text-primary-400 block mt-1">
                  Objectif d'usine cible : 85%
                </span>
              </div>
            </div>

            {/* KPI 2: Theoretical Expected */}
            <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-950/40 dark:to-primary-900/40 p-4 rounded-xl border border-primary-150 dark:border-primary-800/60 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400 block mb-1">Volume Théorique Attendu</span>
                <span className="text-2xl font-mono font-black text-primary-800 dark:text-primary-100">
                  {preventiveComparisonData.totalTheoretical}
                </span>
                <span className="text-[10px] text-primary-400 block mt-1">occurrences planifiées</span>
              </div>
              <span className="text-[9px] text-primary-400 mt-3 block">Calculé sur la récurrence des gammes</span>
            </div>

            {/* KPI 3: Actual Completed */}
            <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-950/40 dark:to-primary-900/40 p-4 rounded-xl border border-primary-150 dark:border-primary-800/60 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400 block mb-1">Volume Réel Enregistré</span>
                <span className="text-2xl font-mono font-black text-indigo-600 dark:text-indigo-400">
                  {preventiveComparisonData.totalActual}
                </span>
                <span className="text-[10px] text-primary-400 block mt-1">interventions créées</span>
              </div>
              <span className="text-[9px] text-primary-400 mt-3 block">Tous statuts confondus (DI/BT)</span>
            </div>

            {/* KPI 4: Overdue/Delta */}
            <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-950/40 dark:to-primary-900/40 p-4 rounded-xl border border-primary-150 dark:border-primary-800/60 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400 block mb-1">Écart de Réalisation</span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-mono font-black ${
                    preventiveComparisonData.totalTheoretical - preventiveComparisonData.totalActual > 0 ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    {preventiveComparisonData.totalTheoretical - preventiveComparisonData.totalActual > 0 
                      ? `-${preventiveComparisonData.totalTheoretical - preventiveComparisonData.totalActual}`
                      : `+${Math.abs(preventiveComparisonData.totalTheoretical - preventiveComparisonData.totalActual)}`
                    }
                  </span>
                  <span className="text-[10px] text-primary-400">BTs</span>
                </div>
              </div>
              <span className="text-[9px] text-primary-400 mt-3 block">
                {preventiveComparisonData.totalTheoretical - preventiveComparisonData.totalActual > 0 
                  ? "Opérations programmées non exécutées"
                  : "Excellent ! Plus de préventif que prévu"
                }
              </span>
            </div>
          </div>

          {/* Superimposed Chart Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recharts Superimposed Bar and Line Chart */}
            <div className="lg:col-span-2 bg-primary-50/10 dark:bg-primary-950/10 p-4 rounded-xl border border-primary-100 dark:border-primary-800/60">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-xs font-bold text-primary-700 dark:text-primary-300">Évolution Mensuelle : Planification vs Réalisé</h4>
                  <p className="text-[9px] text-primary-400">Histogramme double avec courbe d'adhérence</p>
                </div>
                <div className="flex items-center gap-3 text-[9px] font-bold">
                  <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
                    <span className="w-2.5 h-1 bg-indigo-500 rounded" /> Théorique
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2.5 h-1 bg-emerald-500 rounded" /> Réel
                  </span>
                  <span className="flex items-center gap-1 text-amber-500">
                    <span className="w-2.5 h-1 bg-amber-500 rounded-full" /> Adhérence (%)
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={preventiveComparisonData.monthlyTrend}
                    margin={{ top: 10, right: 5, left: -15, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-primary-800/40" />
                    <XAxis 
                      dataKey="monthLabel" 
                      tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fill: '#94a3b8', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'Interventions (U)', angle: -90, position: 'insideLeft', offset: 0, fill: '#94a3b8', fontSize: 9 }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: '#f59e0b', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                      label={{ value: 'Adhérence (%)', angle: 90, position: 'insideRight', offset: 0, fill: '#f59e0b', fontSize: 9 }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-primary-950 p-3 rounded-lg border border-primary-200 dark:border-primary-850 shadow-md text-xs space-y-1">
                              <p className="font-bold text-primary-900 dark:text-white mb-1.5">{data.monthLabel}</p>
                              <div className="flex justify-between gap-6 text-primary-500">
                                <span>Planifié Théorique :</span>
                                <strong className="text-indigo-600 dark:text-indigo-400">{data.theoretical} BTs</strong>
                              </div>
                              <div className="flex justify-between gap-6 text-primary-500">
                                <span>Réalisé Terrain :</span>
                                <strong className="text-emerald-600 dark:text-emerald-400">{data.actual} BTs</strong>
                              </div>
                              <div className="flex justify-between gap-6 pt-1 border-t border-primary-100 dark:border-primary-850">
                                <span className="font-bold text-primary-700 dark:text-primary-300">Taux de respect :</span>
                                <strong className="text-amber-500 font-mono">{data.complianceRate}%</strong>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      yAxisId="left" 
                      dataKey="theoretical" 
                      fill="#818cf8" 
                      radius={[3, 3, 0, 0]} 
                      barSize={16} 
                    />
                    <Bar 
                      yAxisId="left" 
                      dataKey="actual" 
                      fill="#10b981" 
                      radius={[3, 3, 0, 0]} 
                      barSize={16} 
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="complianceRate" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 1 }} 
                      activeDot={{ r: 5 }} 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Qualitative analysis box */}
            <div className="bg-primary-50/10 dark:bg-primary-950/10 p-4 rounded-xl border border-primary-100 dark:border-primary-800/60 flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-primary-700 dark:text-primary-300">Analyse de Fiabilité Préventive</h4>
                
                <div className="text-[11px] text-primary-600 dark:text-primary-400 leading-relaxed space-y-2">
                  <p>
                    L'adhérence globale au plan préventif de <strong className="text-primary-800 dark:text-white">{preventiveComparisonData.globalCompliance}%</strong> témoigne de {
                      preventiveComparisonData.globalCompliance >= 85 ? "l'excellent respect de vos gammes de maintenance systématiques." :
                      preventiveComparisonData.globalCompliance >= 60 ? "la nécessité de resserrer la planification opérationnelle pour éviter le dérive curatif." :
                      "retards sévères sur les campagnes de ronde. Le risque d'arrêts critiques fortuits s'en trouve accru."
                    }
                  </p>
                  <p>
                    <strong>Observations notables :</strong> Les équipements disposant de plus de 3 gammes de maintenance configurées subissent un effet de goulot d'étranglement par rapport aux effectifs de techniciens disponibles.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-400">
                  <div className="font-bold flex items-center gap-1 mb-0.5">
                    <span>⚠️ Points de Vigilance</span>
                  </div>
                  <span>{preventiveComparisonData.totalTheoretical > preventiveComparisonData.totalActual 
                    ? `Il y a ${preventiveComparisonData.totalTheoretical - preventiveComparisonData.totalActual} cycles d'entretien théoriques non déclarés sur le terrain. Ajustez la charge.` 
                    : "Plan préventif rigoureusement exécuté sur l'ensemble des installations."
                  }</span>
                </div>
              </div>

              <div className="text-[10px] text-primary-400 italic pt-2 border-t border-primary-100 dark:border-primary-800/40">
                GMAO PRO • Analyse prévisionnelle intelligente
              </div>
            </div>
          </div>

          {/* Table Breakdown by Equipment */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-primary-700 dark:text-primary-300">Adhérence par Équipement & Surcharge de Gammes</h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-primary-700 dark:text-primary-300">
                <thead>
                  <tr className="border-b border-primary-100 dark:border-primary-800/60 text-[10px] font-bold text-primary-400 uppercase">
                    <th className="p-2.5">Équipement</th>
                    <th className="p-2.5">Atelier</th>
                    <th className="p-2.5 text-center">Gammes Config.</th>
                    <th className="p-2.5 text-center">Cycles Attendus (Théorique)</th>
                    <th className="p-2.5 text-center">Interventions (Réel)</th>
                    <th className="p-2.5 text-center">En Cours (En attente)</th>
                    <th className="p-2.5 text-center">Taux d'adhérence</th>
                    <th className="p-2.5 text-right">Statut Respect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-100 dark:divide-primary-800/40">
                  {preventiveComparisonData.equipmentComparison.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-primary-400">
                        Aucune gamme préventive configurée ou aucune intervention préventive enregistrée.
                      </td>
                    </tr>
                  ) : (
                    preventiveComparisonData.equipmentComparison.slice(0, 5).map(item => (
                      <tr key={item.id} className="hover:bg-primary-50/20 dark:hover:bg-primary-950/20 transition-colors">
                        <td className="p-2.5 font-bold text-primary-800 dark:text-primary-200">{item.nom}</td>
                        <td className="p-2.5">{item.atelier}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-indigo-500">{item.gammesCount}</td>
                        <td className="p-2.5 text-center font-mono font-bold">{item.theoretical}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{item.actual}</td>
                        <td className="p-2.5 text-center font-mono text-primary-400">{item.pending}</td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <span className="font-mono font-bold text-[11px]">{item.complianceRate}%</span>
                            <div className="w-12 bg-primary-200 dark:bg-primary-800 h-1 rounded-full overflow-hidden hidden sm:block">
                              <div className="h-full bg-emerald-500" style={{ width: `${item.complianceRate}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="p-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            item.complianceRate >= 85 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200' :
                            item.complianceRate >= 50 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200' :
                            'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200'
                          }`}>
                            {item.complianceRate >= 85 ? 'Conforme' : item.complianceRate >= 50 ? 'Retard partiel' : 'Critique'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {preventiveComparisonData.equipmentComparison.length > 5 && (
              <p className="text-[10px] text-right text-primary-400">
                Visualisation des 5 premiers équipements actifs sur un total de {preventiveComparisonData.equipmentComparison.length}.
              </p>
            )}
          </div>

        </div>
      </div>

      {/* SECTION 3: DETAILED TABLE (FOR PDF EXPORT) */}
      <div id="pdf-section-table" className="space-y-6">
        {/* DETAILED EQUIPMENT PERFORMANCE GRID TABLE */}
        <div className="bg-white dark:bg-primary-900 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-800 overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-4 border-b border-primary-100 dark:border-primary-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-sm text-primary-800 dark:text-primary-100">
              Performance par Équipement & Indicateurs de Fiabilité
            </h3>
            <p className="text-[11px] text-primary-400">
              Cliquez sur les entêtes de colonne pour trier les machines selon vos objectifs d'ingénierie.
            </p>
          </div>
          
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Filtrer une machine..."
              value={tableSearch}
              onChange={e => setTableSearch(e.target.value)}
              className="w-full text-xs py-1.5 pl-3 pr-8 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg text-primary-800 dark:text-primary-200 focus:outline-none focus:border-accent-orange"
            />
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-primary-700 dark:text-primary-300">
            <thead className="bg-primary-50/50 dark:bg-primary-950/20 text-[10px] uppercase tracking-wider font-bold text-primary-500 border-b border-primary-100 dark:border-primary-800">
              <tr>
                <th 
                  onClick={() => toggleSort('nom')}
                  className="py-3 px-4 cursor-pointer hover:text-primary-900 dark:hover:text-white transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Équipement</span>
                    {sortField === 'nom' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
                <th className="py-3 px-4">Atelier</th>
                <th className="py-3 px-4">Criticité</th>
                <th 
                  onClick={() => toggleSort('failures')}
                  className="py-3 px-4 cursor-pointer hover:text-primary-900 dark:hover:text-white transition text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Pannes</span>
                    {sortField === 'failures' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('cost')}
                  className="py-3 px-4 cursor-pointer hover:text-primary-900 dark:hover:text-white transition text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Coût Cumulé</span>
                    {sortField === 'cost' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('mtbf')}
                  className="py-3 px-4 cursor-pointer hover:text-primary-900 dark:hover:text-white transition text-center font-mono"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>MTBF</span>
                    {sortField === 'mtbf' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('mttr')}
                  className="py-3 px-4 cursor-pointer hover:text-primary-900 dark:hover:text-white transition text-center font-mono"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>MTTR</span>
                    {sortField === 'mttr' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('availability')}
                  className="py-3 px-4 cursor-pointer hover:text-primary-900 dark:hover:text-white transition text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Dispo (%)</span>
                    {sortField === 'availability' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100 dark:divide-primary-800">
              {sortedPerformanceData.map((row, index) => {
                const isLowDispo = row.availability < 95;
                const isHighFailure = row.failures >= 3;

                return (
                  <tr 
                    key={row.id}
                    onClick={() => setSelectedAssetId(row.id)}
                    className="hover:bg-orange-500/[0.04] dark:hover:bg-orange-500/[0.04] cursor-pointer transition-all font-sans group border-b border-primary-100 dark:border-primary-800"
                    title="Cliquez pour ouvrir la fiche de fiabilité détaillée"
                  >
                    <td className="py-3 px-4 font-semibold text-primary-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="group-hover:text-accent-orange transition-colors">{row.nom}</span>
                          <span className="block text-[9px] text-primary-400 font-mono font-normal">{row.id}</span>
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-orange-50 dark:bg-orange-950/40 text-accent-orange text-[9px] px-1.5 py-0.5 rounded font-mono font-normal shrink-0">
                          Analyser &rarr;
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-primary-500 font-bold">{row.atelier}</td>
                    <td className="py-3 px-4">
                      {row.critique ? (
                        <span className="px-2 py-0.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded">
                          CRITIQUE (A)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-800 text-primary-500 text-[10px] font-bold rounded">
                          STANDARD (C)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className={isHighFailure ? 'text-amber-500 font-extrabold' : 'text-primary-700 dark:text-primary-300 font-bold'}>
                        {row.failures}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-primary-900 dark:text-white">
                      {Math.round(row.cost).toLocaleString('fr-FR')} {settings.devise}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold">
                      {Math.round(row.mtbf)} h
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold">
                      {row.mttr.toFixed(1)} h
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span className={`font-bold ${isLowDispo ? 'text-red-500' : 'text-emerald-500'}`}>
                        {row.availability.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* SECTION DE VALIDATION & SIGNATURE POUR LES TECHNICIENS */}
        <div className="bg-white dark:bg-primary-900 p-6 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-primary-100 dark:border-primary-800 pb-4">
            <div>
              <h3 className="font-display font-bold text-base text-primary-900 dark:text-white flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle size={18} />
                </span>
                <span>Validation du Rapport & Signatures de l'Équipe</span>
              </h3>
              <p className="text-xs text-primary-400 mt-1">
                Configurez les visas, signatures électroniques et commentaires avant d'exporter le document PDF officiel.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full font-mono flex items-center gap-1 ${
                signatureApproved 
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-indigo-800/40' 
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${signatureApproved ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {signatureApproved ? 'RAPPORT APPROUVÉ ET SIGNÉ' : 'RAPPORT EN ATTENTE DE VISA'}
              </span>
            </div>
          </div>

          {/* Interactive fields in Web UI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans print:hidden">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-primary-500 uppercase mb-1">Signataire 1 : Technicien</label>
                <input
                  type="text"
                  value={signatureTechnician}
                  onChange={(e) => setSignatureTechnician(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  placeholder="Nom du technicien"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-primary-500 uppercase mb-1">Signataire 2 : Responsable</label>
                <input
                  type="text"
                  value={signatureSupervisor}
                  onChange={(e) => setSignatureSupervisor(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  placeholder="Nom du superviseur"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-primary-500 uppercase mb-1">Date de Signature</label>
                <input
                  type="date"
                  value={signatureDate}
                  onChange={(e) => setSignatureDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2 pt-3">
                <input
                  type="checkbox"
                  id="approve-chk"
                  checked={signatureApproved}
                  onChange={(e) => setSignatureApproved(e.target.checked)}
                  className="rounded border-primary-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="approve-chk" className="text-xs font-bold text-primary-700 dark:text-primary-300 cursor-pointer">
                  Approuver formellement le rapport
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-primary-500 uppercase mb-1">Observations générales</label>
              <textarea
                value={signatureComments}
                onChange={(e) => setSignatureComments(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white h-24 resize-none"
                placeholder="Ajoutez vos conclusions ou observations pour l'équipe..."
              />
            </div>
          </div>

          {/* Visual Signatures Display Box (Included in screenshot / print!) */}
          <div className="border border-primary-100 dark:border-primary-800/80 bg-primary-50/10 dark:bg-primary-950/20 p-5 rounded-2xl space-y-5">
            <div>
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-primary-400">Conclusions & Observations de Validation</h4>
              <p className="text-xs text-primary-700 dark:text-primary-300 italic leading-relaxed mt-1 border-l-2 border-indigo-500 pl-3">
                "{signatureComments}"
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-primary-100 dark:border-primary-800/40">
              {/* Technician Signature Card */}
              <div className="p-4 bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800/60 rounded-xl relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                <div>
                  <span className="text-[10px] font-bold uppercase text-primary-400">Visa Technicien de Maintenance</span>
                  <div className="mt-2">
                    <span className="block text-xs font-bold text-primary-800 dark:text-primary-200">{signatureTechnician}</span>
                    <span className="text-[10px] text-primary-400">Opérations Techniques</span>
                  </div>
                </div>

                <div className="relative border-t border-dashed border-primary-200 dark:border-primary-800 mt-4 pt-3 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-primary-400">Fait le {new Date(signatureDate).toLocaleDateString('fr-FR')}</span>
                  {signatureApproved && (
                    <div className="relative text-right">
                      {/* Stylized Handwritten Mimic Signature */}
                      <span className="font-serif italic text-indigo-500 dark:text-indigo-400 text-lg select-none pr-2" style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.5px' }}>
                        {signatureTechnician.split(' ').map(n => n[0]).join('')}. {signatureTechnician.split(' ').slice(-1)[0]}
                      </span>
                      <span className="absolute -top-3 right-0 text-[8px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1 py-0.2 rounded font-mono font-bold">
                        ELECTRONICALLY SIGNED
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Supervisor/Manager Signature Card */}
              <div className="p-4 bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800/60 rounded-xl relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                <div>
                  <span className="text-[10px] font-bold uppercase text-primary-400">Visa Responsable de Maintenance (Suivi)</span>
                  <div className="mt-2">
                    <span className="block text-xs font-bold text-primary-800 dark:text-primary-200">{signatureSupervisor}</span>
                    <span className="text-[10px] text-primary-400">Direction d'Ingénierie</span>
                  </div>
                </div>

                <div className="relative border-t border-dashed border-primary-200 dark:border-primary-800 mt-4 pt-3 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-primary-400">Fait le {new Date(signatureDate).toLocaleDateString('fr-FR')}</span>
                  {signatureApproved && (
                    <div className="relative text-right">
                      {/* Stylized Handwritten Mimic Signature */}
                      <span className="font-serif italic text-amber-500 dark:text-amber-400 text-lg select-none pr-2" style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.5px' }}>
                        {signatureSupervisor.split(' ').map(n => n[0]).join('')}. {signatureSupervisor.split(' ').slice(-1)[0]}
                      </span>
                      <span className="absolute -top-3 right-0 text-[8px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1 py-0.2 rounded font-mono font-bold">
                        APPROVED & SECURED
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      </div>
        </>
      ) : activeSectionTab === 'pareto' ? (
        <div id="pareto-analysis-module" className="space-y-6 animate-fade-in font-sans pb-12">
          {/* PARETO HEADER BANNER */}
          <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-primary-50/20 dark:from-orange-950/20 dark:via-amber-950/10 dark:to-primary-950/5 p-6 rounded-2xl border border-orange-100 dark:border-orange-950 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-2xl">
              <span className="text-[10px] uppercase font-bold text-orange-500 tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-orange-500" />
                <span>Priorisation Mathématique de la Maintenance (Loi des 80/20)</span>
              </span>
              <h2 className="text-lg font-display font-bold text-primary-900 dark:text-white">
                Analyse de Pareto des Équipements Critiques
              </h2>
              <p className="text-xs text-primary-500 leading-relaxed">
                Identifiez automatiquement les <strong>20% d'équipements</strong> à l'origine de <strong>80% des défaillances</strong>. 
                Concentrer les plans de maintenance préventive sur ce noyau critique permet d'obtenir un retour sur investissement optimal et de maximiser la disponibilité globale.
              </p>
            </div>

            <div className="flex bg-primary-50 dark:bg-primary-950 p-1 rounded-lg border border-primary-200/50 dark:border-primary-800/50 text-[11px] font-bold self-start md:self-auto shrink-0">
              <button
                onClick={() => setParetoMetric('count')}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer ${paretoMetric === 'count' ? 'bg-white dark:bg-primary-800 text-orange-600 dark:text-white shadow-sm' : 'text-primary-400 hover:text-primary-600'}`}
                title="Pannes et toutes interventions confondues"
              >
                Tout ({paretoAnalysisData.totalMetricSum})
              </button>
              <button
                onClick={() => setParetoMetric('failures')}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer ${paretoMetric === 'failures' ? 'bg-white dark:bg-primary-800 text-orange-600 dark:text-white shadow-sm' : 'text-primary-400 hover:text-primary-600'}`}
                title="Uniquement les interventions correctives (pannes)"
              >
                Pannes
              </button>
              <button
                onClick={() => setParetoMetric('cost')}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer ${paretoMetric === 'cost' ? 'bg-white dark:bg-primary-800 text-orange-600 dark:text-white shadow-sm' : 'text-primary-400 hover:text-primary-600'}`}
                title="Cumul des coûts de main d'œuvre et pièces de rechange"
              >
                Coûts (€)
              </button>
            </div>
          </div>

          {/* PARETO KEY KPIS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-primary-900 p-4 rounded-xl shadow-sm border border-primary-100 dark:border-primary-800 flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-950/40 text-orange-600 rounded-lg">
                <Layers size={20} />
              </div>
              <div>
                <span className="block text-xs font-bold text-primary-400 uppercase">Top 20% Machines</span>
                <span className="block text-lg font-mono font-bold text-primary-800 dark:text-white">
                  {paretoAnalysisData.top20Count} <span className="text-xs text-primary-400 font-normal">/ {paretoAnalysisData.totalCount}</span>
                </span>
                <span className="block text-[10px] text-primary-500 font-medium">
                  Soit {paretoAnalysisData.totalCount > 0 ? Math.round((paretoAnalysisData.top20Count / paretoAnalysisData.totalCount) * 100) : 0}% du parc
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-primary-900 p-4 rounded-xl shadow-sm border border-primary-100 dark:border-primary-800 flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-lg">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <span className="block text-xs font-bold text-primary-400 uppercase">Volume Absorbé</span>
                <span className="block text-lg font-mono font-bold text-red-600">
                  {paretoAnalysisData.top20PercentShare}%
                </span>
                <span className="block text-[10px] text-primary-500 font-medium">
                  Des {paretoMetric === 'count' ? 'interventions' : paretoMetric === 'failures' ? 'pannes' : 'coûts'} concentrées ici
                </span>
                <div className="w-full bg-primary-100 dark:bg-primary-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className="bg-red-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${paretoAnalysisData.top20PercentShare}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-primary-900 p-4 rounded-xl shadow-sm border border-primary-100 dark:border-primary-800 flex items-center gap-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
                <Euro size={20} />
              </div>
              <div className="flex-1">
                <span className="block text-xs font-bold text-primary-400 uppercase">Coût Top 20% Estimé</span>
                <span className="block text-lg font-mono font-bold text-emerald-600">
                  {paretoAnalysisData.top20CostSum.toLocaleString('fr-FR')} €
                </span>
                <span className="block text-[10px] text-primary-500 font-medium">
                  Soit {paretoAnalysisData.top20CostPercentShare}% des coûts totaux ({paretoAnalysisData.totalCostSum.toLocaleString('fr-FR')} €)
                </span>
                <div className="w-full bg-primary-100 dark:bg-primary-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${paretoAnalysisData.top20CostPercentShare}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-primary-900 p-4 rounded-xl shadow-sm border border-primary-100 dark:border-primary-800 flex items-center gap-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 rounded-lg">
                <Wrench size={20} />
              </div>
              <div>
                <span className="block text-xs font-bold text-primary-400 uppercase">Planification</span>
                <span className="block text-lg font-mono font-bold text-primary-800 dark:text-white">
                  {paretoAnalysisData.top20Eqs.filter(e => e.gammesCount > 0).length} <span className="text-xs text-primary-400 font-normal">/ {paretoAnalysisData.top20Count}</span>
                </span>
                <span className="block text-[10px] text-primary-500 font-medium">
                  Machines du Top 20% couvertes par du préventif
                </span>
              </div>
            </div>
          </div>

          {/* COMBINED PARETO CHART */}
          <div className="bg-white dark:bg-primary-900 p-6 rounded-xl shadow-sm border border-primary-100 dark:border-primary-800">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-display font-bold text-primary-900 dark:text-white flex items-center gap-2">
                  <Activity size={16} className="text-orange-500" />
                  Graphique Combiné de Pareto (Loi 80/20)
                </h3>
                <p className="text-xs text-primary-400 mt-1">
                  Les barres d'équipements sont classées par ordre décroissant {paretoMetric === 'count' ? 'd\'interventions' : paretoMetric === 'failures' ? 'de pannes' : 'de coûts'}. La courbe bleue trace la somme cumulée en %.
                </p>
              </div>
              <div className="text-xs font-semibold px-2.5 py-1 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border border-orange-100 dark:border-orange-900 rounded-lg">
                Métrique : <strong className="uppercase">{paretoMetric === 'count' ? 'Volume total' : paretoMetric === 'failures' ? 'Pannes' : 'Coût (€)'}</strong>
              </div>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={paretoAnalysisData.chartData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-primary-800" />
                  <XAxis 
                    dataKey="nom" 
                    tick={{ fontSize: 9, fill: '#64748B', fontWeight: 600 }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    yAxisId="left" 
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    label={{ 
                      value: paretoMetric === 'count' ? 'Volume Interventions' : paretoMetric === 'failures' ? 'Volume Pannes' : 'Coûts de Maintenance (€)', 
                      angle: -90, 
                      position: 'insideLeft', 
                      offset: -5,
                      style: { fontSize: 10, fill: '#64748B', fontWeight: 'bold' } 
                    }} 
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#3B82F6' }}
                    label={{ 
                      value: 'Pourcentage Cumulé (%)', 
                      angle: 90, 
                      position: 'insideRight', 
                      offset: 5,
                      style: { fontSize: 10, fill: '#3B82F6', fontWeight: 'bold' } 
                    }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(249, 115, 22, 0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-primary-950 p-4 border border-primary-200 dark:border-primary-800 rounded-xl shadow-xl text-xs space-y-1.5 font-sans">
                            <div className="font-extrabold text-primary-900 dark:text-white border-b pb-1 mb-1.5 flex items-center justify-between gap-4">
                              <span>{data.nom}</span>
                              <span className="text-[10px] uppercase font-bold text-primary-400 font-mono">Rang #{data.rank}</span>
                            </div>
                            <p className="text-primary-500 font-medium">Atelier : <strong className="text-primary-800 dark:text-primary-200">{data.atelier}</strong></p>
                            <p className="text-primary-500 font-medium">Criticité : <span className={`px-1.5 py-0.5 text-[9px] rounded font-bold ${data.critique ? 'bg-red-100 text-red-700' : 'bg-primary-100 text-primary-700'}`}>{data.critique ? 'Critique' : 'Standard'}</span></p>
                            
                            <div className="pt-1.5 border-t border-primary-100 dark:border-primary-800/50 mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1">
                              <div>
                                <span className="text-[9px] uppercase font-bold text-primary-400 block">Valeur Actuelle</span>
                                <strong className="text-sm font-mono text-orange-500">
                                  {paretoMetric === 'cost' ? `${data.metricValue} €` : data.metricValue}
                                </strong>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-primary-400 block">Part Individuelle</span>
                                <strong className="text-sm font-mono text-primary-700 dark:text-primary-300">{data.individualPercent}%</strong>
                              </div>
                              <div className="col-span-2 mt-1 pt-1 border-t border-primary-50">
                                <span className="text-[9px] uppercase font-bold text-primary-400 block">Somme Cumulée</span>
                                <strong className="text-sm font-mono text-blue-500">{data.cumulativePercent}%</strong>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  
                  {/* Reference line at 80% on the cumulative percentage axis */}
                  <ReferenceLine 
                    yAxisId="right" 
                    y={80} 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    strokeDasharray="5 5" 
                    label={{ 
                      value: 'Seuil Pareto 80%', 
                      position: 'insideTopLeft', 
                      fill: '#EF4444', 
                      fontSize: 10, 
                      fontWeight: 'bold',
                      className: 'font-sans'
                    }} 
                  />

                  {/* Vertical line at the 20% equipment threshold */}
                  {paretoAnalysisData.chartData[paretoAnalysisData.top20Count - 1] && (
                    <ReferenceLine 
                      yAxisId="left" 
                      x={paretoAnalysisData.chartData[paretoAnalysisData.top20Count - 1].nom} 
                      stroke="#10B981" 
                      strokeWidth={1.5}
                      strokeDasharray="3 3" 
                      label={{ 
                        value: 'Limite Top 20%', 
                        position: 'insideBottomRight', 
                        fill: '#10B981', 
                        fontSize: 10, 
                        fontWeight: 'bold',
                        className: 'font-sans'
                      }} 
                    />
                  )}

                  <Bar 
                    yAxisId="left" 
                    dataKey="metricValue" 
                    name="Valeur Individuelle" 
                    fill="#F97316" 
                    radius={[4, 4, 0, 0]} 
                  >
                    {paretoAnalysisData.chartData.map((entry, index) => {
                      const isTop20 = index < paretoAnalysisData.top20Count;
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={isTop20 ? '#F97316' : '#94A3B8'} 
                          fillOpacity={isTop20 ? 0.95 : 0.6}
                        />
                      );
                    })}
                  </Bar>
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="cumulativePercent" 
                    name="% Cumulé" 
                    stroke="#3B82F6" 
                    strokeWidth={3} 
                    dot={{ stroke: '#3B82F6', strokeWidth: 2, r: 4, fill: '#fff' }}
                    activeDot={{ r: 7, fill: '#3B82F6' }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PARETO ACTIONABLE TABLE OF THE 20% OF CRITICAL EQUIPMENTS */}
          <div className="bg-white dark:bg-primary-900 rounded-xl shadow-sm border border-primary-100 dark:border-primary-800 overflow-hidden">
            <div className="p-5 border-b border-primary-100 dark:border-primary-800/60 bg-primary-50/20 dark:bg-primary-950/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-display font-bold text-primary-900 dark:text-white flex items-center gap-2">
                  <Wrench size={16} className="text-orange-500" />
                  Plans de Maintenance Préventive Prioritaires - Groupe "Top 20%"
                </h3>
                <p className="text-xs text-primary-400 mt-1">
                  Ces {paretoAnalysisData.top20Count} machines représentent votre priorité absolue de fiabilisation. Planifiez une gamme préventive récurrente pour stopper définitivement les pannes à répétition.
                </p>
              </div>
              <span className="px-3 py-1 text-[11px] font-bold bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 rounded-full border border-orange-200/50 self-start md:self-auto shrink-0">
                Cible : {paretoAnalysisData.top20PercentShare}% des {paretoMetric === 'count' ? 'interventions' : paretoMetric === 'failures' ? 'pannes' : 'coûts'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-primary-100 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/10 text-[10px] uppercase font-bold text-primary-400 tracking-wider">
                    <th className="py-3 px-4 text-center w-12">Rang</th>
                    <th className="py-3 px-4">Équipement</th>
                    <th className="py-3 px-4">Atelier / Secteur</th>
                    <th className="py-3 px-4 text-right">Volume Interv. (Pannes)</th>
                    <th className="py-3 px-4 text-right">Coûts Cumulés</th>
                    <th className="py-3 px-4 text-center">Part Cumulative</th>
                    <th className="py-3 px-4 text-center">Plan Préventif</th>
                    <th className="py-3 px-4 text-center">Action de Priorisation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-100 dark:divide-primary-800 text-xs">
                  {paretoAnalysisData.top20Eqs.map((eq, idx) => {
                    return (
                      <tr 
                        key={eq.id} 
                        className="hover:bg-primary-50/40 dark:hover:bg-primary-900/30 transition-colors"
                      >
                        <td className="py-3 px-4 text-center font-mono font-bold text-primary-400">
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-600 font-extrabold text-xs">
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-primary-800 dark:text-primary-100">
                          <div>
                            <span>{eq.nom}</span>
                            <span className="block text-[9px] text-primary-400 font-mono mt-0.5">{eq.id}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-primary-500">
                          {eq.atelier}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-primary-700 dark:text-primary-300">
                          {eq.count} <span className="text-[10px] text-primary-400 font-normal">({eq.failures})</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-500">
                          {eq.cost.toLocaleString('fr-FR')} €
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono font-extrabold text-blue-500">{eq.cumulativePercent}%</span>
                            <span className="text-[9px] text-primary-400 font-medium">Part ind.: {eq.individualPercent}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {eq.gammesCount > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-200/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>🛡️ {eq.gammesCount} active(s)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-200/50 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>⚠️ Non couvert</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenParetoBTModal(eq)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-sm hover:shadow transition cursor-pointer"
                          >
                            <Wrench size={12} />
                            <span>Planifier Préventif</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div id="predictive-maintenance-module" className="space-y-6 animate-fade-in font-sans">
          
          {/* Predictive Banner / Stats Card */}
          <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-primary-50/20 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-primary-950/5 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-950 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-2xl">
              <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} className="animate-pulse" />
                <span>Modélisation Analytique Active</span>
              </span>
              <h2 className="text-lg font-display font-bold text-primary-900 dark:text-white">
                Système d'Analyse Prédictive d'Usure des Équipements
              </h2>
              <p className="text-xs text-primary-500 leading-relaxed">
                Ce module surveille en permanence l'état d'usure de vos machines en corrélant les relevés de compteurs réels.
                Il génère des diagnostics automatisés et suggère la création directe de bons de travail préventifs pour éviter toute défaillance fortuite.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white dark:bg-primary-900/60 p-4 rounded-xl border border-primary-100 dark:border-primary-800 shrink-0">
              <div className="text-center px-2">
                <span className="block text-lg font-mono font-bold text-primary-800 dark:text-white">{predictiveAlerts.length}</span>
                <span className="text-[9px] uppercase font-bold text-primary-400">Analysés</span>
              </div>
              <div className="text-center px-2 border-l border-primary-100 dark:border-primary-800">
                <span className="block text-lg font-mono font-bold text-red-500">{predictiveAlerts.filter(a => a.status === 'Critique').length}</span>
                <span className="text-[9px] uppercase font-bold text-primary-400">Critiques</span>
              </div>
              <div className="text-center px-2 border-l border-primary-100 dark:border-primary-800">
                <span className="block text-lg font-mono font-bold text-amber-500">{predictiveAlerts.filter(a => a.status === 'Attention').length}</span>
                <span className="text-[9px] uppercase font-bold text-primary-400">Attention</span>
              </div>
              <div className="text-center px-2 border-l border-primary-100 dark:border-primary-800">
                <span className="block text-lg font-mono font-bold text-emerald-500">{predictiveAlerts.filter(a => a.status === 'Sécurisé').length}</span>
                <span className="text-[9px] uppercase font-bold text-primary-400">Sécurisés</span>
              </div>
            </div>
          </div>

          {/* Filters and search panel */}
          <div className="bg-white dark:bg-primary-900 p-4 rounded-xl shadow-sm border border-primary-100 dark:border-primary-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative w-full md:w-64">
                <input
                  type="text"
                  placeholder="Rechercher équipement, atelier, diagnostic..."
                  value={predictiveSearch}
                  onChange={e => setPredictiveSearch(e.target.value)}
                  className="w-full text-xs font-semibold pl-8 pr-3 py-2 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
                <Filter size={14} className="absolute left-2.5 top-2.5 text-primary-400" />
                {predictiveSearch && (
                  <button onClick={() => setPredictiveSearch('')} className="absolute right-2.5 top-2 text-primary-400 hover:text-primary-700 text-xs">×</button>
                )}
              </div>

              {/* Status filter tabs */}
              <div className="flex bg-primary-50 dark:bg-primary-950 p-1 rounded-lg border border-primary-200/50 dark:border-primary-800/50 text-[11px] font-bold">
                <button
                  onClick={() => setPredictiveFilter('all')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${predictiveFilter === 'all' ? 'bg-white dark:bg-primary-800 text-indigo-600 dark:text-white shadow-sm' : 'text-primary-400 hover:text-primary-600'}`}
                >
                  Tous ({predictiveAlerts.length})
                </button>
                <button
                  onClick={() => setPredictiveFilter('critical')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${predictiveFilter === 'critical' ? 'bg-red-500 text-white shadow-sm' : 'text-primary-400 hover:text-red-500'}`}
                >
                  Critiques ({predictiveAlerts.filter(a => a.status === 'Critique').length})
                </button>
                <button
                  onClick={() => setPredictiveFilter('warning')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${predictiveFilter === 'warning' ? 'bg-amber-500 text-white shadow-sm' : 'text-primary-400 hover:text-amber-500'}`}
                >
                  Attention ({predictiveAlerts.filter(a => a.status === 'Attention').length})
                </button>
                <button
                  onClick={() => setPredictiveFilter('secure')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${predictiveFilter === 'secure' ? 'bg-emerald-500 text-white shadow-sm' : 'text-primary-400 hover:text-emerald-500'}`}
                >
                  Sécurisés ({predictiveAlerts.filter(a => a.status === 'Sécurisé').length})
                </button>
              </div>
            </div>

            <div className="text-[10px] text-primary-400 font-bold uppercase">
              Affichage de {filteredPredictiveAlerts.length} diagnostics
            </div>
          </div>

          {/* Cards Grid */}
          {filteredPredictiveAlerts.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800 rounded-2xl">
              <AlertCircle size={32} className="mx-auto text-primary-300 mb-3" />
              <p className="text-sm font-semibold text-primary-500 italic">Aucun diagnostic ne correspond à vos critères de recherche.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPredictiveAlerts.map(alert => {
                const isCrit = alert.status === 'Critique';
                const isWarn = alert.status === 'Attention';
                
                const themeColorClass = isCrit 
                  ? 'border-red-200 dark:border-red-950/50 bg-red-50/5' 
                  : isWarn 
                    ? 'border-amber-200 dark:border-amber-950/40 bg-amber-50/5' 
                    : 'border-primary-100 dark:border-primary-800 bg-white dark:bg-primary-900';

                const progressColor = isCrit ? 'bg-red-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500';
                const textStatusColor = isCrit ? 'text-red-500' : isWarn ? 'text-amber-500' : 'text-emerald-500';

                return (
                  <div 
                    key={`${alert.equipementId}-${alert.ruleName}`} 
                    className={`p-5 rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between gap-4 ${themeColorClass}`}
                  >
                    <div className="space-y-3.5">
                      {/* Card Header */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <span className="text-[9px] font-mono font-bold text-primary-400 uppercase bg-primary-100/50 dark:bg-primary-950 px-2 py-0.5 rounded">
                            {alert.atelier}
                          </span>
                          <h3 className="font-display font-extrabold text-xs text-primary-900 dark:text-white mt-1 truncate" title={alert.equipementNom}>
                            {alert.equipementNom}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {alert.critique && (
                            <span className="text-[8px] font-extrabold bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 px-1.5 py-0.5 rounded" title="Équipement critique de classe A">
                              CRITIQUE A
                            </span>
                          )}
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                            isCrit 
                              ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                              : isWarn 
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          }`}>
                            {alert.status}
                          </span>
                        </div>
                      </div>

                      {/* Wear indicator gauge */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-primary-400">Niveau d'Usure Estimé</span>
                          <span className={textStatusColor}>{alert.wearPercentage}%</span>
                        </div>
                        <div className="w-full bg-primary-100 dark:bg-primary-950 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                            style={{ width: `${Math.min(100, alert.wearPercentage)}%` }}
                          />
                        </div>
                      </div>

                      {/* Operational Readings Table */}
                      <div className="grid grid-cols-2 gap-3 p-3 bg-primary-50/40 dark:bg-primary-950/30 rounded-xl text-[11px] font-semibold text-primary-600 dark:text-primary-300">
                        <div>
                          <span className="block text-[9px] text-primary-400 font-bold uppercase">Compteur Actuel</span>
                          <span className="font-mono text-primary-900 dark:text-white font-extrabold text-xs">
                            {alert.currentCounterValue} {alert.counterUnit}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-primary-400 font-bold uppercase">Seuil Usure / Gamme</span>
                          <span className="font-mono text-primary-500 font-bold">
                            {alert.thresholdValue} {alert.counterUnit}
                          </span>
                        </div>
                        {alert.lastReferenceValue > 0 && (
                          <div className="col-span-2 border-t border-primary-100 dark:border-primary-800/40 pt-1.5 mt-0.5">
                            <span className="text-[9px] text-primary-400 font-bold uppercase">Usage depuis dernier BT : </span>
                            <span className="font-mono font-bold text-primary-700 dark:text-primary-200">{alert.wearValue} {alert.counterUnit}</span>
                          </div>
                        )}
                      </div>

                      {/* Estimated Next Intervention & Rate Section */}
                      <div className="p-3 bg-indigo-50/20 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/30 dark:border-indigo-900/10 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-primary-450 dark:text-primary-400 font-semibold flex items-center gap-1.5">
                            <Calendar size={12} className="text-indigo-500 shrink-0" />
                            Échéance Prévue (Est.) :
                          </span>
                          <span className={`font-mono font-bold ${alert.wearPercentage >= 100 ? 'text-red-500 animate-pulse' : alert.approachingThreshold ? 'text-amber-500 font-extrabold' : 'text-indigo-600 dark:text-indigo-400'}`}>
                            {alert.estimatedDate}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] border-t border-primary-100/30 dark:border-primary-800/20 pt-1.5">
                          <span className="text-primary-450 dark:text-primary-400 font-semibold">Taux quotidien :</span>
                          <span className="font-mono text-primary-700 dark:text-primary-300 font-bold">
                            ~{alert.dailyUsageRate.toFixed(1)} {alert.counterUnit}/jour
                          </span>
                        </div>
                        {alert.wearPercentage < 100 && (
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-primary-450 dark:text-primary-400 font-semibold">Délai estimé :</span>
                            <span className="font-mono text-primary-700 dark:text-primary-300 font-bold">
                              {alert.remainingDays > 365 ? "> 1 an" : `~${Math.round(alert.remainingDays)} jours`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Approaching Usage Threshold Alert Banner */}
                      {alert.approachingThreshold && (
                        <div className="flex items-start gap-2.5 p-3 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400">
                          <AlertTriangle size={15} className="shrink-0 text-amber-500 mt-0.5 animate-bounce" />
                          <div className="text-[10.5px] leading-snug">
                            <span className="font-bold block text-amber-800 dark:text-amber-300">Seuil d'utilisation proche ({alert.wearPercentage}%)</span>
                            <span>La machine approche de sa limite d'utilisation. Prévoyez l'intervention rapidement d'ici {Math.round(alert.remainingDays)} jours.</span>
                          </div>
                        </div>
                      )}

                      {/* Diagnostic & Recommendation Text */}
                      <div className="p-3 bg-indigo-50/25 dark:bg-indigo-950/15 border border-indigo-100/50 dark:border-indigo-900/20 rounded-xl">
                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 uppercase tracking-wide">
                          <Activity size={11} />
                          <span>Diagnostic Analytique</span>
                        </p>
                        <p className="text-[11px] text-primary-600 dark:text-primary-300 leading-relaxed mt-1">
                          {alert.recommendation}
                        </p>
                      </div>
                    </div>

                    {/* Actions bar inside card */}
                    <div className="flex items-center gap-2 pt-3 border-t border-primary-100 dark:border-primary-800/40">
                      <button
                        onClick={() => handleOpenBTModal(alert)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                          isCrit
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : isWarn
                              ? 'bg-amber-500 hover:bg-amber-600 text-white'
                              : 'bg-primary-100 hover:bg-primary-200 dark:bg-primary-800 dark:hover:bg-primary-700 text-primary-700 dark:text-white'
                        }`}
                      >
                        <Wrench size={13} />
                        <span>Suggérer BT</span>
                      </button>

                      <button
                        onClick={() => handleOpenCounterModal(alert)}
                        className="p-2 bg-primary-50 hover:bg-primary-100 dark:bg-primary-800/40 dark:hover:bg-primary-800 text-primary-500 dark:text-primary-300 rounded-xl border border-primary-200 dark:border-primary-800 transition-colors cursor-pointer"
                        title="Enregistrer un nouveau relevé de compteur"
                      >
                        <Clock size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DEDICATED PREDICTIVE EXPLANATORY CARDS */}
          <div className="p-5 bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800 rounded-2xl flex flex-col sm:flex-row items-center gap-4 text-xs">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-500 rounded-xl shrink-0">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-primary-900 dark:text-white">Comment fonctionne l'analyse analytique ?</h4>
              <p className="text-primary-500 leading-relaxed max-w-4xl">
                Le système inspecte périodiquement les fiches de gammes préventives de type <strong>Compteur</strong> rattachées à vos machines. 
                Si aucun compteur de gamme n'est configuré, le moteur applique automatiquement des seuils d'usure standards spécifiques aux familles industrielles 
                (ex: presses hydrauliques, compresseurs tournants). La réévaluation est instantanée dès qu'un technicien met à jour les relevés.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PARETO PREVENTIVE BT MODAL PREVIEW */}
      {selectedParetoEqForBT && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:hidden">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white dark:bg-primary-900 w-full max-w-lg rounded-2xl shadow-2xl border border-primary-200 dark:border-primary-800 flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-primary-100 dark:border-primary-800 flex justify-between items-center bg-primary-50/50 dark:bg-primary-950/20 shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 rounded-xl">
                  <Layers size={18} />
                </span>
                <div>
                  <h3 className="font-display font-bold text-base text-primary-900 dark:text-white">
                    Planification Préventive Pareto (80/20)
                  </h3>
                  <p className="text-[11px] text-primary-400">Équipement critique : <strong className="text-primary-700 dark:text-white">{selectedParetoEqForBT.nom}</strong></p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedParetoEqForBT(null)} 
                className="p-1.5 hover:bg-primary-100 dark:hover:bg-primary-850 rounded-lg text-primary-400 hover:text-primary-600 dark:hover:text-primary-200 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-950/60 rounded-xl flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                  Cette machine concentre une part critique de vos pannes/coûts. 
                  L'émission de ce bon de travail préventif déclenchera une intervention technique pour auditer sa fiabilité et réduire durablement les arrêts.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-primary-400 uppercase">Priorité / Urgence</label>
                <select
                  value={paretoBtUrgence}
                  onChange={e => setParetoBtUrgence(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/10 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-white dark:bg-primary-950"
                >
                  <option value="Critique">Critique (A)</option>
                  <option value="Standard">Standard (B / C)</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-primary-400 uppercase">Instructions techniques personnalisées</label>
                <textarea
                  value={paretoBtDescription}
                  onChange={e => setParetoBtDescription(e.target.value)}
                  rows={8}
                  className="w-full text-xs font-semibold px-3 py-2 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/10 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-white font-mono leading-relaxed resize-none dark:bg-primary-950"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-5 border-t border-primary-100 dark:border-primary-800 flex justify-end gap-3 bg-primary-50/20 dark:bg-primary-950/10 shrink-0">
              <button
                onClick={() => setSelectedParetoEqForBT(null)}
                className="px-4 py-2 text-xs font-bold text-primary-500 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-850 rounded-xl transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateParetoPreventiveBT}
                className="px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Wrench size={14} />
                <span>Confirmer & Émettre le Bon</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* PREDICTIVE BT MODAL PREVIEW */}
      {selectedAlertForBT && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:hidden">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white dark:bg-primary-900 w-full max-w-lg rounded-2xl shadow-2xl border border-primary-200 dark:border-primary-800 flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-primary-100 dark:border-primary-800 flex justify-between items-center bg-primary-50/50 dark:bg-primary-950/20 shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-xl">
                  <Sparkles size={18} className="animate-pulse" />
                </span>
                <div>
                  <h3 className="font-display font-bold text-base text-primary-900 dark:text-white">
                    Générateur de Bon de Travail Prédictif
                  </h3>
                  <p className="text-[11px] text-primary-400">Équipement : <strong className="text-primary-700 dark:text-white">{selectedAlertForBT.equipementNom}</strong></p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAlertForBT(null)} 
                className="p-1.5 hover:bg-primary-100 dark:hover:bg-primary-850 rounded-lg text-primary-400 hover:text-primary-600 dark:hover:text-primary-200 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-primary-400 uppercase">Priorité / Urgence</label>
                <select
                  value={btUrgenceOverride}
                  onChange={e => setBtUrgenceOverride(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                >
                  <option value="Critique">Critique (A)</option>
                  <option value="Standard">Standard (B / C)</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-primary-400 uppercase">Description technique & Instruction de maintenance</label>
                <textarea
                  value={btDescriptionOverride}
                  onChange={e => setBtDescriptionOverride(e.target.value)}
                  rows={8}
                  className="w-full text-xs font-semibold px-3 py-2 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono leading-relaxed resize-none"
                />
              </div>

              <p className="text-[10px] text-primary-400 leading-relaxed italic bg-indigo-50/30 dark:bg-indigo-950/15 p-3 rounded-lg border border-indigo-100/50 dark:border-indigo-900/10">
                💡 En validant, un nouveau Bon de Travail (BT) au statut <strong>"En cours"</strong> sera directement injecté dans votre GMAO. Le technicien en charge pourra alors y accéder pour consigner son compte-rendu d'intervention.
              </p>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-primary-100 dark:border-primary-800 flex justify-end gap-3 bg-primary-50/50 dark:bg-primary-950/20">
              <button
                onClick={() => setSelectedAlertForBT(null)}
                className="px-4 py-2 bg-primary-200 hover:bg-primary-300 dark:bg-primary-800 dark:hover:bg-primary-700 text-primary-800 dark:text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleCreatePredictiveBT}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
              >
                <CheckCircle size={14} />
                <span>Confirmer la création du BT</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* UPDATE COUNTER DIALOG MODAL */}
      {updatingCounterEqId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:hidden">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white dark:bg-primary-900 w-full max-w-sm rounded-2xl shadow-2xl border border-primary-200 dark:border-primary-800 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-primary-100 dark:border-primary-800 flex justify-between items-center bg-primary-50/50 dark:bg-primary-950/20">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 rounded-xl">
                  <Clock size={18} />
                </span>
                <div>
                  <h3 className="font-display font-bold text-base text-primary-900 dark:text-white">
                    Mise à jour du Compteur
                  </h3>
                  <p className="text-[10px] text-primary-400">
                    Saisir une nouvelle valeur opérationnelle
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setUpdatingCounterEqId(null)} 
                className="p-1.5 hover:bg-primary-100 dark:hover:bg-primary-850 rounded-lg text-primary-400 hover:text-primary-600 dark:hover:text-primary-200 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="block text-[11px] font-bold text-primary-400 uppercase">Nouvelle Valeur</label>
                  <input
                    type="number"
                    value={newCounterValue}
                    onChange={e => setNewCounterValue(Number(e.target.value))}
                    className="w-full text-xs font-semibold px-3 py-2 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-primary-400 uppercase">Unité</label>
                  <select
                    value={newCounterUnit}
                    onChange={e => setNewCounterUnit(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  >
                    <option value="cycles">Cycles</option>
                    <option value="H">Heures (H)</option>
                    <option value="km">Kilomètres</option>
                  </select>
                </div>
              </div>

              <p className="text-[10px] text-primary-400 leading-relaxed italic">
                ℹ️ Le moteur d'analyse réévaluera immédiatement le pourcentage d'usure de l'équipement dès l'enregistrement de ce relevé de compteur.
              </p>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-primary-100 dark:border-primary-800 flex justify-end gap-3 bg-primary-50/50 dark:bg-primary-950/20">
              <button
                onClick={() => setUpdatingCounterEqId(null)}
                className="px-4 py-2 bg-primary-200 hover:bg-primary-300 dark:bg-primary-800 dark:hover:bg-primary-700 text-primary-800 dark:text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveCounter}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
              >
                <CheckCircle size={14} />
                <span>Enregistrer</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* INDIVIDUAL ASSET RELIABILITY DETAIL DRILL-DOWN MODAL */}
      {selectedAsset && selectedAssetPerformance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:hidden">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white dark:bg-primary-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-primary-200 dark:border-primary-800 flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-primary-100 dark:border-primary-800 flex justify-between items-center bg-primary-50/50 dark:bg-primary-950/20 shrink-0">
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-xl ${selectedAsset.critique ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400' : 'bg-primary-100 text-primary-600 dark:bg-primary-800 dark:text-primary-300'}`}>
                  <Activity size={20} className={selectedAsset.critique ? 'animate-pulse' : ''} />
                </span>
                <div>
                  <h3 className="font-display font-bold text-base text-primary-900 dark:text-white flex items-center gap-2">
                    <span>Fiche Fiabilité : <strong>{selectedAsset.nom}</strong></span>
                    {selectedAsset.critique && (
                      <span className="text-[10px] font-bold bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded uppercase">Critique</span>
                    )}
                  </h3>
                  <p className="text-xs text-primary-400">Atelier : <strong className="text-primary-600 dark:text-primary-300">{selectedAsset.atelier}</strong> | Identifiant : <strong className="font-mono">{selectedAsset.id}</strong></p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-1.5 text-primary-500 hover:text-primary-800 dark:hover:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg transition"
                  title="Imprimer cette analyse"
                >
                  <Printer size={16} />
                </button>
                <button
                  onClick={() => setSelectedAssetId(null)}
                  className="p-2 text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 hover:bg-primary-100 dark:hover:bg-primary-850 rounded-lg transition-colors cursor-pointer"
                  title="Fermer"
                >
                  <span className="font-mono text-base font-bold">×</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Grid 1: Key info & Specs cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Tech specifications */}
                <div className="bg-primary-50/30 dark:bg-primary-950/10 p-4 rounded-xl border border-primary-100/50 dark:border-primary-800/50 space-y-2">
                  <h4 className="text-xs font-bold text-primary-400 uppercase tracking-wider">Spécifications</h4>
                  <div className="space-y-1 text-xs">
                    <p className="text-primary-500">Marque : <strong className="text-primary-800 dark:text-primary-200">{selectedAsset.marque || 'N/A'}</strong></p>
                    <p className="text-primary-500">Modèle / Type : <strong className="text-primary-800 dark:text-primary-200">{selectedAsset.type || 'N/A'}</strong></p>
                    <p className="text-primary-500">Année Install. : <strong className="text-primary-800 dark:text-primary-200">{selectedAsset.annee || 'N/A'}</strong></p>
                    <p className="text-primary-500">Garantie : <strong className="text-primary-800 dark:text-primary-200">{selectedAsset.garantie || 'N/A'}</strong></p>
                  </div>
                </div>

                {/* Performance indicators */}
                <div className="bg-primary-50/30 dark:bg-primary-950/10 p-4 rounded-xl border border-primary-100/50 dark:border-primary-800/50 space-y-2">
                  <h4 className="text-xs font-bold text-primary-400 uppercase tracking-wider">Performance Globale</h4>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-primary-500">Disponibilité</span>
                        <span className={`font-mono font-bold ${selectedAssetPerformance.availability < 95 ? 'text-red-500' : 'text-emerald-500'}`}>{selectedAssetPerformance.availability.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-primary-100 dark:bg-primary-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${selectedAssetPerformance.availability < 95 ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${selectedAssetPerformance.availability}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-primary-500">Taux Préventif</span>
                        <span className="font-mono font-bold text-accent-orange">
                          {selectedAssetPerformance.interventionsCount > 0 
                            ? Math.round((selectedAssetPerformance.typeBreakdown.find(t => t.name === 'Préventif')?.value || 0) / selectedAssetPerformance.interventionsCount * 100)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-primary-50/30 dark:bg-primary-950/10 p-4 rounded-xl border border-primary-100/50 dark:border-primary-800/50 space-y-2">
                  <h4 className="text-xs font-bold text-primary-400 uppercase tracking-wider">Finances Asset</h4>
                  <div className="space-y-1 text-xs">
                    <p className="text-primary-500">Coût Total : <strong className="text-primary-900 dark:text-white font-mono font-bold">{Math.round(selectedAssetPerformance.totalCost).toLocaleString('fr-FR')} €</strong></p>
                    <p className="text-primary-500">Main d'Œuvre : <span className="font-mono text-primary-700 dark:text-primary-300">{Math.round(selectedAssetPerformance.laborCost)} €</span></p>
                    <p className="text-primary-500">Consommables : <span className="font-mono text-primary-700 dark:text-primary-300">{Math.round(selectedAssetPerformance.partsCost)} €</span></p>
                    <p className="text-[10px] text-primary-400 italic">Prix d'achat initial : {selectedAsset.prix?.toLocaleString('fr-FR')} €</p>
                  </div>
                </div>

              </div>

              {/* Grid 2: Mini reliability indicator row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center bg-primary-50/20 dark:bg-primary-950/10 p-3 rounded-xl">
                <div className="p-3 bg-white dark:bg-primary-850 rounded-xl border border-primary-100 dark:border-primary-800 shadow-sm">
                  <span className="text-[10px] text-primary-400 uppercase tracking-wide block">Disponibilité</span>
                  <span className={`text-xl font-mono font-extrabold ${selectedAssetPerformance.availability < 95 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {selectedAssetPerformance.availability.toFixed(1)}%
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-primary-850 rounded-xl border border-primary-100 dark:border-primary-800 shadow-sm">
                  <span className="text-[10px] text-primary-400 uppercase tracking-wide block">Nombre de Pannes</span>
                  <span className={`text-xl font-mono font-extrabold ${selectedAssetPerformance.failures >= 2 ? 'text-amber-500' : 'text-primary-700 dark:text-primary-300'}`}>
                    {selectedAssetPerformance.failures}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-primary-850 rounded-xl border border-primary-100 dark:border-primary-800 shadow-sm">
                  <span className="text-[10px] text-primary-400 uppercase tracking-wide block">MTBF Machine</span>
                  <span className="text-xl font-mono font-extrabold text-blue-600 dark:text-blue-400">
                    {Math.round(selectedAssetPerformance.mtbf)} h
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-primary-850 rounded-xl border border-primary-100 dark:border-primary-800 shadow-sm">
                  <span className="text-[10px] text-primary-400 uppercase tracking-wide block">MTTR Machine</span>
                  <span className="text-xl font-mono font-extrabold text-amber-500">
                    {selectedAssetPerformance.mttr.toFixed(1)} h
                  </span>
                </div>
              </div>

              {/* Main content: Timeline and Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Intervention History / Timeline (takes 2 cols) */}
                <div className="lg:col-span-2 space-y-3">
                  <h4 className="text-xs font-bold text-primary-800 dark:text-primary-200 flex items-center gap-1.5 uppercase font-display">
                    <FileText size={14} className="text-accent-orange" />
                    <span>Historique des Interventions ({selectedAssetPerformance.interventionsCount})</span>
                  </h4>
                  
                  {selectedAssetPerformance.sortedEqInts.length === 0 ? (
                    <p className="text-xs text-primary-400 italic p-4 bg-primary-50/30 dark:bg-primary-950/10 rounded-xl text-center">Aucune intervention enregistrée.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {selectedAssetPerformance.sortedEqInts.map((i) => {
                        return (
                          <div 
                            key={i.id}
                            className="p-3 bg-white dark:bg-primary-850 border border-primary-100 dark:border-primary-800 rounded-xl flex items-start justify-between gap-3 shadow-sm hover:shadow transition"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap text-[10px]">
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  i.typeDoc === 'Préventif' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                                }`}>
                                  {i.typeDoc}
                                </span>
                                <span className="font-mono font-bold text-primary-400">{i.numero}</span>
                                <span className="text-primary-400">{new Date(i.dateCreation).toLocaleDateString('fr-FR')}</span>
                                {i.urgence && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    i.urgence.toLowerCase().includes('critique') || i.urgence.toLowerCase().includes('arrêt')
                                      ? 'bg-red-500 text-white font-extrabold' : 'bg-primary-100 text-primary-500 dark:bg-primary-800'
                                  }`}>
                                    {i.urgence}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-primary-800 dark:text-primary-200 leading-normal">{i.typeProbleme || 'Inspection systématique'}</p>
                              <p className="text-xs text-primary-500 line-clamp-2 leading-relaxed">{i.description}</p>
                              {i.piecesConso && (
                                <p className="text-[10px] text-primary-400 leading-none mt-1">
                                  🔧 Pièces : <span className="font-mono text-emerald-600 font-bold dark:text-emerald-400">{i.piecesConso}</span>
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono font-bold text-[11px] block text-primary-700 dark:text-primary-300">{i.tempsPasse || '0.5 H'}</span>
                              <span className={`text-[10px] font-bold block mt-1 ${
                                i.statut === 'Soldé' || i.statut === 'Clôturé' ? 'text-emerald-500' : 'text-amber-500'
                              }`}>{i.statut}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Spare parts consumed list and charts (takes 1 col) */}
                <div className="space-y-4">
                  
                  {/* Types Pie Chart */}
                  <div className="p-4 bg-primary-50/20 dark:bg-primary-950/10 rounded-xl border border-primary-100/50 dark:border-primary-800/50">
                    <h4 className="text-[11px] font-bold text-primary-400 uppercase tracking-wide mb-2">Répartition BT</h4>
                    <div className="h-28 flex items-center justify-center relative">
                      {selectedAssetPerformance.typeBreakdown.length === 0 ? (
                        <p className="text-[10px] text-primary-400 italic">Aucun type enregistré</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={selectedAssetPerformance.typeBreakdown}
                              cx="50%"
                              cy="50%"
                              innerRadius={25}
                              outerRadius={40}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              <Cell fill="#ef4444" />
                              <Cell fill="#10b981" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                      <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
                        <span className="text-xs font-bold text-primary-800 dark:text-white">{selectedAssetPerformance.interventionsCount}</span>
                        <span className="text-[8px] text-primary-400 font-bold">Total</span>
                      </div>
                    </div>
                    <div className="flex justify-center gap-4 text-[9px] font-bold mt-1">
                      <span className="flex items-center gap-1 text-red-500"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Correctif</span>
                      <span className="flex items-center gap-1 text-emerald-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Préventif</span>
                    </div>
                  </div>

                  {/* Spare parts list */}
                  <div className="p-4 bg-primary-50/20 dark:bg-primary-950/10 rounded-xl border border-primary-100/50 dark:border-primary-800/50 space-y-2">
                    <h4 className="text-[11px] font-bold text-primary-400 uppercase tracking-wide">Pièces Rechange Consommées</h4>
                    {selectedAssetPerformance.consumedPartsList.length === 0 ? (
                      <p className="text-[10px] text-primary-400 italic">Aucune pièce consommée.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {selectedAssetPerformance.consumedPartsList.map((p) => (
                          <div key={p.codeArticle} className="flex justify-between items-center text-[10px] border-b border-primary-100/30 dark:border-primary-800/20 pb-1">
                            <div className="truncate pr-2">
                              <span className="font-bold text-primary-800 dark:text-primary-200 block truncate text-left">{p.designation}</span>
                              <span className="text-[9px] text-primary-400 font-mono font-normal block text-left">{p.codeArticle}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-primary-700 dark:text-primary-300">x{p.qty}</span>
                              <span className="font-mono text-[9px] text-emerald-500 font-bold block">{Math.round(p.totalCost)} €</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-primary-100 dark:border-primary-800 flex justify-end bg-primary-50/30 dark:bg-primary-950/10 shrink-0">
              <button
                onClick={() => setSelectedAssetId(null)}
                className="px-4 py-2 bg-primary-800 hover:bg-primary-900 text-white dark:bg-primary-200 dark:hover:bg-primary-100 dark:text-black rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fermer l'Analyse
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* RAPPORT D'AUDIT MODAL OVERLAY */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-primary-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-primary-900 rounded-2xl shadow-xl border border-primary-100 dark:border-primary-800 max-w-5xl w-full h-[85vh] flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-primary-100 dark:border-primary-800 flex justify-between items-center bg-primary-50/50 dark:bg-primary-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <ShieldAlert size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-primary-900 dark:text-white flex items-center gap-1.5">
                    Rapport d'Audit Technique & Écarts de Stocks
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded font-mono font-bold">CONSOLIDÉ</span>
                  </h3>
                  <p className="text-[11px] text-primary-500 mt-0.5">
                    Analyse globale de fiabilité mécanique, de disponibilité du parc et d'écart logistique magasin
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAuditPDFExport}
                  disabled={isExportingAuditPDF}
                  className="btn-primary bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs py-2 px-3.5 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExportingAuditPDF ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  <span>{isExportingAuditPDF ? "Génération PDF..." : "Télécharger PDF d'Audit"}</span>
                </button>
                <button
                  onClick={() => setIsAuditModalOpen(false)}
                  className="p-1.5 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg text-primary-400 dark:text-primary-500 hover:text-primary-800 transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-primary-100 dark:border-primary-800 bg-primary-50/20 dark:bg-primary-950/10 px-4 overflow-x-auto shrink-0 scrollbar-none">
              <button
                onClick={() => setActiveAuditTab('synthesis')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                  activeAuditTab === 'synthesis' ? 'border-indigo-600 text-indigo-600 dark:text-white dark:border-indigo-400' : 'border-transparent text-primary-400 hover:text-primary-700'
                }`}
              >
                📊 Synthèse de l'Audit
              </button>
              <button
                onClick={() => setActiveAuditTab('failures')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                  activeAuditTab === 'failures' ? 'border-indigo-600 text-indigo-600 dark:text-white dark:border-indigo-400' : 'border-transparent text-primary-400 hover:text-primary-700'
                }`}
              >
                🛠️ Statistiques de Pannes
              </button>
              <button
                onClick={() => setActiveAuditTab('availability')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                  activeAuditTab === 'availability' ? 'border-indigo-600 text-indigo-600 dark:text-white dark:border-indigo-400' : 'border-transparent text-primary-400 hover:text-primary-700'
                }`}
              >
                ⚙️ Disponibilité Machines
              </button>
              <button
                onClick={() => setActiveAuditTab('stocks')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                  activeAuditTab === 'stocks' ? 'border-indigo-600 text-indigo-600 dark:text-white dark:border-indigo-400' : 'border-transparent text-primary-400 hover:text-primary-700'
                }`}
              >
                📦 Écarts de Stocks
              </button>
              <button
                onClick={() => setActiveAuditTab('plan')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                  activeAuditTab === 'plan' ? 'border-indigo-600 text-indigo-600 dark:text-white dark:border-indigo-400' : 'border-transparent text-primary-400 hover:text-primary-700'
                }`}
              >
                📝 Plan Correctif d'Audit
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-primary-50/10 dark:bg-primary-900/5">
              
              {/* TAB 1: SYNTHESIS */}
              {activeAuditTab === 'synthesis' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Highlight Banner */}
                  <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-800/40 rounded-xl">
                    <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5 uppercase font-display tracking-wider mb-2">
                      <Sparkles size={14} className="text-indigo-500 animate-spin" />
                      Synthèse Exécutive de l'Auditeur
                    </h4>
                    <p className="text-xs text-primary-700 dark:text-primary-300 leading-relaxed font-semibold">
                      L'analyse croisée des interventions et du magasin démontre un besoin immédiat de réapprovisionnement de sécurité pour combler les écarts de stocks (<span className="text-indigo-600 dark:text-indigo-400">{auditReportData.discrepantPiecesList.length} articles en sous-seuil</span>) couplé à une intervention lourde sur les équipements affichant un taux de disponibilité défaillant. Le taux de disponibilité de l'usine est maintenu à <span className="text-indigo-600 dark:text-indigo-400">{auditReportData.avgAvailability.toFixed(2)}%</span> avec un coût cumulé de maintenance de <span className="text-indigo-600 dark:text-indigo-400">{Math.round(stats.totalCost)} €</span> sur la période.
                    </p>
                  </div>

                  {/* Core KPI cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Failure card */}
                    <div className="p-4 bg-white dark:bg-primary-850 rounded-xl border border-primary-100 dark:border-primary-800 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg shrink-0">
                        <AlertTriangle size={20} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-primary-400 tracking-wider">Volume de Pannes</span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-lg font-mono font-bold text-primary-800 dark:text-white">{auditReportData.totalBreakdowns}</span>
                          <span className="text-[10px] font-bold text-red-500">{auditReportData.openBreakdowns} actives</span>
                        </div>
                        <p className="text-[10px] text-primary-400 mt-1 truncate">MTTR moyen : {stats.mttr.toFixed(1)} heures</p>
                      </div>
                    </div>

                    {/* Availability card */}
                    <div className="p-4 bg-white dark:bg-primary-850 rounded-xl border border-primary-100 dark:border-primary-800 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                        <Activity size={20} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-primary-400 tracking-wider">Disponibilité Moyenne</span>
                        <div className="mt-0.5">
                          <span className="text-lg font-mono font-bold text-primary-800 dark:text-white">{auditReportData.avgAvailability.toFixed(2)} %</span>
                        </div>
                        <p className="text-[10px] text-primary-400 mt-1 truncate">Cible d'usine : &gt; 95.0 %</p>
                      </div>
                    </div>

                    {/* Stock discrepancies card */}
                    <div className="p-4 bg-white dark:bg-primary-850 rounded-xl border border-primary-100 dark:border-primary-800 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
                        <AlertCircle size={20} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-primary-400 tracking-wider">Discrépances Magasin</span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-lg font-mono font-bold text-primary-800 dark:text-white">{auditReportData.discrepantPiecesList.length}</span>
                          <span className="text-[10px] font-bold text-amber-500">en rupture/alerte</span>
                        </div>
                        <p className="text-[10px] text-primary-400 mt-1 truncate">Écart logistique : -{auditReportData.totalMissingItems} pièces</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick analysis blocks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-primary-850 rounded-xl p-5 border border-primary-100 dark:border-primary-800 space-y-3">
                      <h4 className="text-xs font-bold text-primary-700 dark:text-primary-200 uppercase font-display tracking-wider">Goulots Industriels Prioritaires</h4>
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-start text-xs border-b border-primary-50 dark:border-primary-850 pb-2">
                          <div>
                            <span className="font-bold text-primary-800 dark:text-primary-200">Pic de Défaillances</span>
                            <span className="text-[10px] text-primary-400 block mt-0.5">Équipement subissant le plus d'arrêts</span>
                          </div>
                          {eqPerformanceData.length > 0 ? (
                            <div className="text-right">
                              <span className="font-bold text-red-500 block">{[...eqPerformanceData].sort((a, b) => b.failures - a.failures)[0]?.nom || '-'}</span>
                              <span className="text-[10px] font-mono text-primary-400 font-bold">{[...eqPerformanceData].sort((a, b) => b.failures - a.failures)[0]?.failures} pannes</span>
                            </div>
                          ) : <span className="text-primary-400">-</span>}
                        </div>

                        <div className="flex justify-between items-start text-xs border-b border-primary-50 dark:border-primary-850 pb-2">
                          <div>
                            <span className="font-bold text-primary-800 dark:text-primary-200">Coût Logistique Élevé</span>
                            <span className="text-[10px] text-primary-400 block mt-0.5">Pièce requérant le plus de réapprovisionnement</span>
                          </div>
                          {auditReportData.piecesRestockDetails.length > 0 ? (
                            <div className="text-right">
                              <span className="font-bold text-indigo-500 block truncate max-w-[150px]">{auditReportData.piecesRestockDetails[0]?.designation}</span>
                              <span className="text-[10px] font-mono text-primary-400 font-bold">{Math.round(auditReportData.piecesRestockDetails[0]?.restockCost)} € de budget</span>
                            </div>
                          ) : <span className="text-primary-400">-</span>}
                        </div>

                        <div className="flex justify-between items-start text-xs">
                          <div>
                            <span className="font-bold text-primary-800 dark:text-primary-200">Indicateur de Disponibilité Minimum</span>
                            <span className="text-[10px] text-primary-400 block mt-0.5">Machine la plus instable du parc</span>
                          </div>
                          {eqPerformanceData.length > 0 ? (
                            <div className="text-right">
                              <span className="font-bold text-amber-500 block">{[...eqPerformanceData].sort((a, b) => a.availability - b.availability)[0]?.nom || '-'}</span>
                              <span className="text-[10px] font-mono text-primary-400 font-bold">{(([...eqPerformanceData].sort((a, b) => a.availability - b.availability)[0]?.availability) ?? 0).toFixed(1)} % dispo.</span>
                            </div>
                          ) : <span className="text-primary-400">-</span>}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-primary-850 rounded-xl p-5 border border-primary-100 dark:border-primary-800 space-y-3">
                      <h4 className="text-xs font-bold text-primary-700 dark:text-primary-200 uppercase font-display tracking-wider">État Consolidé du Stock de Sécurité</h4>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-primary-600 dark:text-primary-400">Écart Budgétaire Global</span>
                            <span className="font-mono text-primary-800 dark:text-white">{Math.round(auditReportData.totalReplenishmentCost)} €</span>
                          </div>
                          <div className="w-full bg-primary-100 dark:bg-primary-850 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full" 
                              style={{ width: `${Math.min(100, (auditReportData.totalStockValue / Math.max(1, auditReportData.totalTargetStockValue)) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-primary-400 font-bold">
                            <span>Valeur Actuelle : {Math.round(auditReportData.totalStockValue)} €</span>
                            <span>Valeur Cible Sécurité : {Math.round(auditReportData.totalTargetStockValue)} €</span>
                          </div>
                        </div>

                        <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/15 rounded-xl border border-indigo-100/30 dark:border-indigo-800/20 text-xs leading-relaxed text-primary-600 dark:text-primary-300">
                          <span className="font-bold">Alerte Réapprovisionnement :</span> Pour combler l'écart de stock de sécurité, un investissement de <span className="font-bold text-indigo-600 dark:text-indigo-400">{Math.round(auditReportData.totalReplenishmentCost)} €</span> est requis afin d'acheter les <span className="font-bold text-indigo-600 dark:text-indigo-400">{auditReportData.totalMissingItems} pièces manquantes</span> sur les <span className="font-bold text-indigo-600 dark:text-indigo-400">{auditReportData.discrepantPiecesList.length} articles</span> en rupture ou sous-seuil.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: FAILURES */}
              {activeAuditTab === 'failures' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="bg-white dark:bg-primary-850 p-5 rounded-xl border border-primary-100 dark:border-primary-800 space-y-4">
                    <h4 className="text-xs font-bold text-primary-700 dark:text-primary-200 uppercase font-display tracking-wider">Statistiques de Pannes & Diagnostic</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="p-3 bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-800 rounded-lg">
                        <span className="block text-lg font-mono font-bold text-red-500">{auditReportData.totalBreakdowns}</span>
                        <span className="text-[10px] text-primary-400 font-bold uppercase tracking-wider">Total Correctives (DI/BT)</span>
                      </div>
                      <div className="p-3 bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-800 rounded-lg">
                        <span className="block text-lg font-mono font-bold text-indigo-500">{Math.round(stats.preventiveRatio)} %</span>
                        <span className="text-[10px] text-primary-400 font-bold uppercase tracking-wider">Taux de Préventif</span>
                      </div>
                      <div className="p-3 bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-800 rounded-lg">
                        <span className="block text-lg font-mono font-bold text-amber-500">{stats.mtbf.toFixed(0)} H</span>
                        <span className="text-[10px] text-primary-400 font-bold uppercase tracking-wider">Moyenne MTBF</span>
                      </div>
                      <div className="p-3 bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-800 rounded-lg">
                        <span className="block text-lg font-mono font-bold text-blue-500">{stats.mttr.toFixed(1)} H</span>
                        <span className="text-[10px] text-primary-400 font-bold uppercase tracking-wider">Moyenne MTTR</span>
                      </div>
                    </div>

                    {/* Breakdown categories */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-primary-400 uppercase tracking-wider">Répartition Typologique des Pannes</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {auditReportData.formattedCategories.length === 0 ? (
                          <p className="text-xs text-primary-400 italic">Aucune donnée disponible</p>
                        ) : (
                          auditReportData.formattedCategories.map(cat => (
                            <div key={cat.name} className="flex justify-between items-center p-2.5 bg-primary-50/30 dark:bg-primary-950/10 border border-primary-100/40 dark:border-primary-800/30 rounded-lg text-xs">
                              <span className="font-bold text-primary-700 dark:text-primary-300">{cat.name}</span>
                              <span className="font-mono text-red-500 font-extrabold">{cat.value} arrêts</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Equipment failure ranks */}
                    <div className="space-y-2 border-t border-primary-100 dark:border-primary-800 pt-4">
                      <span className="text-[11px] font-bold text-primary-400 uppercase tracking-wider">Équipements avec Pannes Critiques Répétées</span>
                      <div className="overflow-x-auto border border-primary-100 dark:border-primary-800 rounded-lg">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-primary-100/50 dark:bg-primary-900 border-b border-primary-100 dark:border-primary-800 text-[10px] text-primary-400 font-bold">
                              <th className="p-2.5">Code Machine</th>
                              <th className="p-2.5">Équipement</th>
                              <th className="p-2.5">Atelier</th>
                              <th className="p-2.5 text-center">Pannes cumulées</th>
                              <th className="p-2.5 text-right">MTBF calculé (H)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-primary-50 dark:divide-primary-800 font-semibold text-primary-700 dark:text-primary-300">
                            {[...eqPerformanceData]
                              .sort((a, b) => b.failures - a.failures)
                              .slice(0, 5)
                              .map(eq => (
                                <tr key={eq.id}>
                                  <td className="p-2.5 font-mono text-[10px] text-primary-400">{eq.id}</td>
                                  <td className="p-2.5 text-primary-900 dark:text-white">{eq.nom}</td>
                                  <td className="p-2.5">{eq.atelier}</td>
                                  <td className="p-2.5 text-center font-mono text-red-500 font-bold">{eq.failures}</td>
                                  <td className="p-2.5 text-right font-mono">{eq.mtbf.toFixed(0)} H</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: AVAILABILITY */}
              {activeAuditTab === 'availability' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="bg-white dark:bg-primary-850 p-5 rounded-xl border border-primary-100 dark:border-primary-800 space-y-4">
                    <h4 className="text-xs font-bold text-primary-700 dark:text-primary-200 uppercase font-display tracking-wider">Analyse de Disponibilité du Parc Machines</h4>
                    
                    <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-primary-50/40 dark:bg-primary-950/20 rounded-xl border border-primary-100 dark:border-primary-800">
                      <div className="shrink-0 flex flex-col items-center">
                        <span className="text-[10px] uppercase font-bold text-primary-400">Taux Global Consolidé</span>
                        <span className={`text-2xl font-mono font-bold mt-1 ${auditReportData.avgAvailability >= 95 ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {auditReportData.avgAvailability.toFixed(2)} %
                        </span>
                        <span className="text-[9px] bg-primary-100 text-primary-600 dark:bg-primary-800 dark:text-primary-300 px-2 py-0.5 rounded font-bold mt-1.5">USINE NOMINALE</span>
                      </div>
                      <div className="flex-1 text-xs text-primary-500 leading-relaxed">
                        Le taux de disponibilité consolidé est un indicateur de performance critique. Il représente le ratio entre le temps théorique de fonctionnement (cible de 150 heures par machine par mois) et le temps réel après soustraction des heures cumulées d'arrêts critiques ou urgents.
                      </div>
                    </div>

                    {/* Workshop availability stats */}
                    <div className="space-y-2 border-t border-primary-100 dark:border-primary-800 pt-4">
                      <span className="text-[11px] font-bold text-primary-400 uppercase tracking-wider">Performance de Disponibilité par Atelier (Secteur)</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {auditReportData.formattedWorkshops.map(shop => (
                          <div key={shop.name} className="p-3.5 bg-primary-50/20 dark:bg-primary-950/10 border border-primary-100/50 dark:border-primary-800/40 rounded-xl flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-primary-800 dark:text-primary-200 block truncate max-w-[130px]">{shop.name}</span>
                              <span className="text-[10px] text-primary-400 font-bold">{shop.count} machines</span>
                            </div>
                            <span className={`font-mono font-bold text-sm ${shop.availability >= 95 ? 'text-emerald-500' : 'text-amber-500'}`}>
                              {shop.availability.toFixed(1)} %
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Equipment with low availability */}
                    <div className="space-y-2 border-t border-primary-100 dark:border-primary-800 pt-4">
                      <span className="text-[11px] font-bold text-primary-400 uppercase tracking-wider">Machines à Disponibilité Critique (&lt; 95%)</span>
                      {auditReportData.criticalEqsList.length === 0 ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl text-center border border-emerald-100 dark:border-emerald-900/40">
                          🎉 Félicitations ! Toutes les machines maintiennent un taux de disponibilité supérieur à 95%.
                        </p>
                      ) : (
                        <div className="overflow-x-auto border border-primary-100 dark:border-primary-800 rounded-lg">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-primary-100/50 dark:bg-primary-900 border-b border-primary-100 dark:border-primary-800 text-[10px] text-primary-400 font-bold">
                                <th className="p-2.5">Code</th>
                                <th className="p-2.5">Nom Équipement</th>
                                <th className="p-2.5">Secteur</th>
                                <th className="p-2.5 text-center">Disponibilité</th>
                                <th className="p-2.5 text-center">Pannes</th>
                                <th className="p-2.5 text-right">Coût Cumulé</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-primary-50 dark:divide-primary-800 font-semibold text-primary-700 dark:text-primary-300">
                              {auditReportData.criticalEqsList.map(eq => (
                                <tr key={eq.id}>
                                  <td className="p-2.5 font-mono text-[10px] text-primary-400">{eq.id}</td>
                                  <td className="p-2.5 text-primary-900 dark:text-white">{eq.nom}</td>
                                  <td className="p-2.5">{eq.atelier}</td>
                                  <td className="p-2.5 text-center font-mono text-amber-500 font-extrabold">{eq.availability.toFixed(1)} %</td>
                                  <td className="p-2.5 text-center font-mono">{eq.failures}</td>
                                  <td className="p-2.5 text-right font-mono text-primary-800 dark:text-white">{Math.round(eq.cost)} €</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: STOCKS */}
              {activeAuditTab === 'stocks' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="bg-white dark:bg-primary-850 p-5 rounded-xl border border-primary-100 dark:border-primary-800 space-y-4">
                    <h4 className="text-xs font-bold text-primary-700 dark:text-primary-200 uppercase font-display tracking-wider">Audit de Ruptures & Écarts de Stocks</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div className="p-3.5 bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-800 rounded-xl">
                        <span className="block text-xl font-mono font-bold text-amber-500">{auditReportData.discrepantPiecesList.length}</span>
                        <span className="text-[10px] text-primary-400 font-bold uppercase tracking-wider block mt-1">Articles Sous-Seuil</span>
                      </div>
                      <div className="p-3.5 bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-800 rounded-xl">
                        <span className="block text-xl font-mono font-bold text-red-500">{auditReportData.totalMissingItems}</span>
                        <span className="text-[10px] text-primary-400 font-bold uppercase tracking-wider block mt-1">Écart de Quantité (Déficit)</span>
                      </div>
                      <div className="p-3.5 bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-800 rounded-xl">
                        <span className="block text-xl font-mono font-bold text-indigo-500">{Math.round(auditReportData.totalReplenishmentCost)} €</span>
                        <span className="text-[10px] text-primary-400 font-bold uppercase tracking-wider block mt-1">Coût de Réassort Restant</span>
                      </div>
                    </div>

                    {/* Stock discrepancies details list */}
                    <div className="space-y-2 border-t border-primary-100 dark:border-primary-800 pt-4">
                      <span className="text-[11px] font-bold text-primary-400 uppercase tracking-wider">Détails des Discrépances Logistiques par Article</span>
                      {auditReportData.piecesRestockDetails.length === 0 ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl text-center border border-emerald-100 dark:border-emerald-900/40">
                          🎉 Aucune discrépance constatée. Tous les articles magasin respectent les seuils minimums de sécurité.
                        </p>
                      ) : (
                        <div className="overflow-x-auto border border-primary-100 dark:border-primary-800 rounded-lg">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-primary-100/50 dark:bg-primary-900 border-b border-primary-100 dark:border-primary-800 text-[10px] text-primary-400 font-bold">
                                <th className="p-2.5">Code Article</th>
                                <th className="p-2.5">Désignation</th>
                                <th className="p-2.5">Casier Empl.</th>
                                <th className="p-2.5 text-center">Stock Actuel</th>
                                <th className="p-2.5 text-center">Seuil Sécurité</th>
                                <th className="p-2.5 text-center text-amber-500">Écart (Déficit)</th>
                                <th className="p-2.5 text-right">Budget Restock</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-primary-50 dark:divide-primary-800 font-semibold text-primary-700 dark:text-primary-300">
                              {auditReportData.piecesRestockDetails.map(p => (
                                <tr key={p.id}>
                                  <td className="p-2.5 font-mono text-[10px] text-primary-400">{p.codeArticle}</td>
                                  <td className="p-2.5 text-primary-900 dark:text-white truncate max-w-[150px]">{p.designation}</td>
                                  <td className="p-2.5 font-mono text-[10px]">{p.emplacement || 'Non spécifié'}</td>
                                  <td className="p-2.5 text-center font-mono text-red-500">{p.quantite}</td>
                                  <td className="p-2.5 text-center font-mono text-primary-500">{p.seuil}</td>
                                  <td className="p-2.5 text-center font-mono text-amber-500 font-bold">-{p.deficiency}</td>
                                  <td className="p-2.5 text-right font-mono text-indigo-500 font-extrabold">{Math.round(p.restockCost)} €</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: CORRECTIVE PLAN */}
              {activeAuditTab === 'plan' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="bg-white dark:bg-primary-850 p-5 rounded-xl border border-primary-100 dark:border-primary-800 space-y-4">
                    <h4 className="text-xs font-bold text-primary-700 dark:text-primary-200 uppercase font-display tracking-wider">Directives d'Audit Technique & Actions Recommandées</h4>
                    
                    <div className="space-y-4">
                      {/* Action 1 */}
                      <div className="p-4 bg-primary-50/20 dark:bg-primary-950/10 border border-primary-100 dark:border-primary-800 rounded-xl flex gap-3.5 items-start">
                        <div className="p-2 bg-amber-500 text-white rounded-lg shrink-0 text-xs font-extrabold font-mono w-7 h-7 flex items-center justify-center">1</div>
                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-primary-800 dark:text-white">Sécuriser le stock de sécurité (Écart Zéro)</h5>
                          <p className="text-[11px] text-primary-500 leading-relaxed">
                            Lancer immédiatement une commande globale de réapprovisionnement pour les <span className="text-indigo-600 dark:text-indigo-400 font-bold">{auditReportData.discrepantPiecesList.length} articles défaillants</span>. Priorité absolue aux pièces critiques avec le plus gros écart de sécurité. Budget total estimé : <span className="text-indigo-600 dark:text-indigo-400 font-bold">{Math.round(auditReportData.totalReplenishmentCost)} €</span>.
                          </p>
                        </div>
                      </div>

                      {/* Action 2 */}
                      <div className="p-4 bg-primary-50/20 dark:bg-primary-950/10 border border-primary-100 dark:border-primary-800 rounded-xl flex gap-3.5 items-start">
                        <div className="p-2 bg-indigo-500 text-white rounded-lg shrink-0 text-xs font-extrabold font-mono w-7 h-7 flex items-center justify-center">2</div>
                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-primary-800 dark:text-white">Campagne préventive sur les machines instables</h5>
                          <p className="text-[11px] text-primary-500 leading-relaxed">
                            {auditReportData.criticalEqsList.length > 0 ? (
                              <span>Planifier un audit mécanique lourd sous 15 jours pour les machines avec une disponibilité inférieure à 95% : <span className="font-bold text-amber-500">{auditReportData.criticalEqsList.map(eq => eq.nom).join(', ')}</span>. L'objectif est de remplacer les composants d'usure avant l'arrêt complet.</span>
                            ) : (
                              <span>Le parc de machines affiche une excellente disponibilité générale. Continuer l'analyse préventive mensuelle sur les goulots de production.</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Action 3 */}
                      <div className="p-4 bg-primary-50/20 dark:bg-primary-950/10 border border-primary-100 dark:border-primary-800 rounded-xl flex gap-3.5 items-start">
                        <div className="p-2 bg-emerald-500 text-white rounded-lg shrink-0 text-xs font-extrabold font-mono w-7 h-7 flex items-center justify-center">3</div>
                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-primary-800 dark:text-white">Plan de réduction du MTTR moyen</h5>
                          <p className="text-[11px] text-primary-500 leading-relaxed">
                            Le MTTR actuel de <span className="font-bold text-primary-800 dark:text-white">{stats.mttr.toFixed(1)} heures</span> nécessite des actions. Recommandations : formaliser les procédures de remèdes sur les types de pannes récurrentes, optimiser l'étiquetage des casiers dans le magasin pour accélérer la recherche des pièces, et former l'équipe d'astreinte.
                          </p>
                        </div>
                      </div>

                      {/* Action 4 */}
                      <div className="p-4 bg-primary-50/20 dark:bg-primary-950/10 border border-primary-100 dark:border-primary-800 rounded-xl flex gap-3.5 items-start">
                        <div className="p-2 bg-purple-500 text-white rounded-lg shrink-0 text-xs font-extrabold font-mono w-7 h-7 flex items-center justify-center">4</div>
                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-primary-800 dark:text-white">Rééquilibrage budgétaire et stratégique (Objectif 60% Préventif)</h5>
                          <p className="text-[11px] text-primary-500 leading-relaxed">
                            Actuellement, votre taux d'interventions préventives se situe à <span className="font-bold text-primary-800 dark:text-white">{Math.round(stats.preventiveRatio)}%</span>. Atteindre le cap des 60% de préventif permettra de réduire drastiquement le nombre de bons de travail curatifs urgents, et ainsi de rentabiliser durablement la main d'œuvre.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-primary-100 dark:border-primary-800 flex justify-end bg-primary-50/50 dark:bg-primary-950/20 gap-3">
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 bg-primary-200 hover:bg-primary-300 dark:bg-primary-800 dark:hover:bg-primary-700 text-primary-800 dark:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fermer le Rapport
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* DEDICATED HIGH-RESOLUTION OFFSCREEN AUDIT PAGES FOR PERFECT A4 PRINTING & SCREENSHOTS */}
      {isAuditModalOpen && (
        <div className="absolute left-[-9999px] top-0 bg-primary-50 space-y-20 flex flex-col items-center">
          
          {/* PAGE 1: SYNTHESE EXECUTIVE & FAILURES */}
          <div 
            id="audit-pdf-page-1"
            className="bg-white text-slate-900 border border-slate-200"
            style={{ width: '200mm', minHeight: '280mm', padding: '20mm', boxSizing: 'border-box' }}
          >
            {/* Header / Brand */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <h1 className="text-2xl font-bold tracking-tight uppercase">Rapport de Synthèse d'Audit Industriel</h1>
              <p className="text-xs text-slate-500 uppercase font-mono mt-1">GMAO PRO • AUDIT SYSTÈME DE PRODUCTION</p>
            </div>

            <div className="space-y-6 text-xs text-slate-800">
              <p className="leading-relaxed">
                Ce rapport consolide les données analytiques calculées à partir de l'activité réelle de la maintenance de l'usine et de l'inventaire logistique des pièces de rechange. Il a pour but d'analyser les statistiques de pannes mécaniques, les taux de disponibilité du parc machines, et de chiffrer précisément les écarts de stocks.
              </p>

              {/* Section 1 */}
              <div>
                <h2 className="text-sm font-bold border-b border-slate-300 pb-1 mb-3 uppercase tracking-wide">1. Indicateurs de Fiabilité & Statistiques de Pannes</h2>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded mb-4">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Volume Total des Pannes (BT)</span>
                    <span className="text-lg font-mono font-bold text-slate-800">{auditReportData.totalBreakdowns} interventions</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Taux de Maintenance Préventive</span>
                    <span className="text-lg font-mono font-bold text-slate-800">{Math.round(stats.preventiveRatio)} %</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Temps Moyen Entre Pannes (MTBF)</span>
                    <span className="text-lg font-mono font-bold text-slate-800">{stats.mtbf.toFixed(0)} heures</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Temps Moyen de Réparation (MTTR)</span>
                    <span className="text-lg font-mono font-bold text-slate-800">{stats.mttr.toFixed(1)} heures</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-600 text-[11px] uppercase">Goulots Industriels (Top pannes)</h3>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-400">
                        <th className="py-1">Machine</th>
                        <th className="py-1 text-center">Nombre de Pannes</th>
                        <th className="py-1 text-right">MTBF calculé (H)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...eqPerformanceData]
                        .sort((a, b) => b.failures - a.failures)
                        .slice(0, 3)
                        .map(eq => (
                          <tr key={eq.id} className="border-b border-slate-100 text-[11px]">
                            <td className="py-1.5 font-bold">{eq.nom} ({eq.atelier})</td>
                            <td className="py-1.5 text-center font-mono text-red-600">{eq.failures}</td>
                            <td className="py-1.5 text-right font-mono">{eq.mtbf.toFixed(0)} H</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2 */}
              <div className="pt-4">
                <h2 className="text-sm font-bold border-b border-slate-300 pb-1 mb-2 uppercase tracking-wide">2. Répartition par Typologie d'Incidents</h2>
                <p className="mb-2">Densité d'incidents par technologie d'équipements :</p>
                <div className="grid grid-cols-2 gap-2">
                  {auditReportData.formattedCategories.slice(0, 4).map(cat => (
                    <div key={cat.name} className="flex justify-between p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="font-bold">{cat.name}</span>
                      <span className="font-mono text-slate-600">{cat.value} arrêts</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* PAGE 2: AVAILABILITY & PERFORMANCE */}
          <div 
            id="audit-pdf-page-2"
            className="bg-white text-slate-900 border border-slate-200"
            style={{ width: '200mm', minHeight: '280mm', padding: '20mm', boxSizing: 'border-box' }}
          >
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <h1 className="text-2xl font-bold tracking-tight uppercase">Diagnostic de Disponibilité du Parc</h1>
              <p className="text-xs text-slate-500 uppercase font-mono mt-1">GMAO PRO • AUDIT SYSTÈME DE PRODUCTION</p>
            </div>

            <div className="space-y-6 text-xs text-slate-800">
              <p className="leading-relaxed">
                Le taux moyen global de disponibilité de l'usine s'élève à <span className="font-bold">{auditReportData.avgAvailability.toFixed(2)} %</span>. Ce diagnostic étudie la régularité et la constance opérationnelle par atelier de production.
              </p>

              {/* Table of Workshops */}
              <div>
                <h2 className="text-sm font-bold border-b border-slate-300 pb-1 mb-3 uppercase tracking-wide">1. Performance par Secteur d'Activité</h2>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-400">
                      <th className="py-1.5">Atelier / Secteur</th>
                      <th className="py-1.5 text-center">Effectif Machines</th>
                      <th className="py-1.5 text-right">Taux de Disponibilité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditReportData.formattedWorkshops.map(shop => (
                      <tr key={shop.name} className="border-b border-slate-100">
                        <td className="py-2 font-bold">{shop.name}</td>
                        <td className="py-2 text-center font-mono">{shop.count}</td>
                        <td className={`py-2 text-right font-mono font-bold ${shop.availability >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {shop.availability.toFixed(2)} %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Critical machines table */}
              <div className="pt-4">
                <h2 className="text-sm font-bold border-b border-slate-300 pb-1 mb-3 uppercase tracking-wide">2. Liste des Organes Opérationnels Instables (&lt; 95%)</h2>
                {auditReportData.criticalEqsList.length === 0 ? (
                  <p className="italic bg-slate-50 p-3 rounded text-center">Aucune machine sous le seuil critique de 95%.</p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-400">
                        <th className="py-1.5">Machine</th>
                        <th className="py-1.5">Atelier</th>
                        <th className="py-1.5 text-center">Disponibilité</th>
                        <th className="py-1.5 text-center">Pannes</th>
                        <th className="py-1.5 text-right">Coût Cumulé</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditReportData.criticalEqsList.slice(0, 6).map(eq => (
                        <tr key={eq.id} className="border-b border-slate-100">
                          <td className="py-2 font-bold text-slate-900">{eq.nom}</td>
                          <td className="py-2 text-slate-500">{eq.atelier}</td>
                          <td className="py-2 text-center font-mono text-amber-600 font-bold">{eq.availability.toFixed(1)} %</td>
                          <td className="py-2 text-center font-mono">{eq.failures}</td>
                          <td className="py-2 text-right font-mono">{Math.round(eq.cost)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* PAGE 3: STOCKS & RECOMMENDATIONS */}
          <div 
            id="audit-pdf-page-3"
            className="bg-white text-slate-900 border border-slate-200"
            style={{ width: '200mm', minHeight: '280mm', padding: '20mm', boxSizing: 'border-box' }}
          >
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <h1 className="text-2xl font-bold tracking-tight uppercase">Audit des Écarts de Stocks & Plan d'Action</h1>
              <p className="text-xs text-slate-500 uppercase font-mono mt-1">GMAO PRO • AUDIT SYSTÈME DE PRODUCTION</p>
            </div>

            <div className="space-y-6 text-xs text-slate-800">
              <p className="leading-relaxed">
                Le contrôle logistique a identifié <span className="font-bold">{auditReportData.discrepantPiecesList.length} articles</span> en sous-seuil de sécurité critique, avec un déficit total de <span className="font-bold">{auditReportData.totalMissingItems} pièces</span> par rapport aux niveaux d'alerte configurés.
              </p>

              {/* Table of stock discrepancies */}
              <div>
                <h2 className="text-sm font-bold border-b border-slate-300 pb-1 mb-3 uppercase tracking-wide">1. Écarts Logistiques Majeurs (Articles critiques)</h2>
                {auditReportData.piecesRestockDetails.length === 0 ? (
                  <p className="italic bg-slate-50 p-3 rounded text-center">Aucun écart de stock constaté.</p>
                ) : (
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-300 text-[9px] font-bold text-slate-400">
                        <th className="py-1">Code Article</th>
                        <th className="py-1">Désignation</th>
                        <th className="py-1 text-center">Stock</th>
                        <th className="py-1 text-center">Seuil</th>
                        <th className="py-1 text-center text-amber-600">Déficit (Écart)</th>
                        <th className="py-1 text-right">Budget de réapprovisionnement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditReportData.piecesRestockDetails.slice(0, 5).map(p => (
                        <tr key={p.id} className="border-b border-slate-100">
                          <td className="py-1.5 font-mono text-[10px] text-slate-500">{p.codeArticle}</td>
                          <td className="py-1.5 font-bold">{p.designation}</td>
                          <td className="py-1.5 text-center font-mono text-red-600">{p.quantite}</td>
                          <td className="py-1.5 text-center font-mono text-slate-500">{p.seuil}</td>
                          <td className="py-1.5 text-center font-mono font-bold text-amber-600">-{p.deficiency}</td>
                          <td className="py-1.5 text-right font-mono text-indigo-600 font-bold">{Math.round(p.restockCost)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Recommendations directives checklist */}
              <div className="pt-4">
                <h2 className="text-sm font-bold border-b border-slate-300 pb-1 mb-3 uppercase tracking-wide">2. Directives d'Audit Correctif Recommendées</h2>
                <div className="space-y-3.5 leading-relaxed">
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-900">• Directives logistiques :</span>
                    <span>Lancer un réapprovisionnement urgent de <span className="font-bold">{Math.round(auditReportData.totalReplenishmentCost)} €</span> pour combler l'écart magasin et reconstituer le stock de sécurité de {auditReportData.totalMissingItems} pièces.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-900">• Plan d'overhaul préventif :</span>
                    <span>Intervenir d'urgence sous 15 jours sur les équipements instables pour prévenir les arrêts inopinés.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-900">• Standardisation du MTTR :</span>
                    <span>Structurer des checklists de diagnostic rapide, optimiser la géolocalisation des casiers de rechange pour accélérer la résolution de pannes.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-900">• Ratio préventif :</span>
                    <span>Viser l'objectif de 60% d'interventions planifiées afin de soulager le budget d'astreinte curative.</span>
                  </div>
                </div>
              </div>

              {/* Signatures block */}
              <div className="pt-10 flex justify-between text-[10px] text-slate-400">
                <div>
                  <p className="font-bold uppercase">Visa Responsable de Production</p>
                  <p className="italic mt-8">Signature et tampon</p>
                </div>
                <div className="text-right">
                  <p className="font-bold uppercase">Visa Auditeur Chef de Maintenance</p>
                  <p className="italic mt-8">Signature électronique validée</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* AUTOMATIC EMAIL SCHEDULING MODAL OVERLAY */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-primary-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-primary-900 rounded-2xl shadow-xl border border-primary-100 dark:border-primary-800 max-w-2xl w-full flex flex-col overflow-hidden max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-primary-100 dark:border-primary-800 flex justify-between items-center bg-primary-50/50 dark:bg-primary-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <Mail size={20} className={scheduleConfig.active ? "animate-pulse text-indigo-600 dark:text-indigo-400" : "text-primary-400"} />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-primary-900 dark:text-white flex items-center gap-1.5">
                    Planification des Rapports Auto.
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${scheduleConfig.active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-primary-100 text-primary-800 dark:bg-primary-850 dark:text-primary-350'}`}>
                      {scheduleConfig.active ? 'ACTIF' : 'INACTIF'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-primary-500 mt-0.5">
                    Configurez l'envoi hebdomadaire automatique du bilan de performance aux responsables techniques
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1.5 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg text-primary-400 dark:text-primary-500 hover:text-primary-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-primary-700 dark:text-primary-350">
              {scheduleStatusMessage && (
                <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold text-center">
                  {scheduleStatusMessage}
                </div>
              )}

              {/* Toggle switch */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-primary-50 dark:bg-primary-950 border border-primary-100 dark:border-primary-850">
                <div>
                  <span className="font-bold text-primary-900 dark:text-white text-sm block">Activer l'envoi automatique</span>
                  <span className="text-[11px] text-primary-400 block mt-0.5">Le système compilera et expédiera le bilan tous les {scheduleConfig.dayOfWeek.toLowerCase()} à {scheduleConfig.time}.</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveSchedule({ ...scheduleConfig, active: !scheduleConfig.active })}
                  className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${scheduleConfig.active ? 'bg-emerald-500' : 'bg-primary-300 dark:bg-primary-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${scheduleConfig.active ? 'transform translate-x-5' : ''}`} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recipients input */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[11px] font-bold text-primary-400 uppercase tracking-wider">Responsables Techniques (Emails séparés par des virgules)</label>
                  <input
                    type="text"
                    value={scheduleConfig.emails}
                    onChange={e => setScheduleConfig({ ...scheduleConfig, emails: e.target.value })}
                    className="w-full text-xs py-2 px-3 bg-white dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg text-primary-800 dark:text-primary-200 focus:outline-none focus:border-indigo-500 font-mono"
                    placeholder="ex: responsable.tech@entreprise.com, directeur@entreprise.com"
                  />
                </div>

                {/* Day of Week Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-primary-400 uppercase tracking-wider">Jour de l'envoi</label>
                  <select
                    value={scheduleConfig.dayOfWeek}
                    onChange={e => setScheduleConfig({ ...scheduleConfig, dayOfWeek: e.target.value })}
                    className="w-full text-xs py-2 px-3 bg-white dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg font-bold text-primary-800 dark:text-primary-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Lundi">Chaque Lundi</option>
                    <option value="Mardi">Chaque Mardi</option>
                    <option value="Mercredi">Chaque Mercredi</option>
                    <option value="Jeudi">Chaque Jeudi</option>
                    <option value="Vendredi">Chaque Vendredi</option>
                    <option value="Samedi">Chaque Samedi</option>
                    <option value="Dimanche">Chaque Dimanche</option>
                  </select>
                </div>

                {/* Time of Day */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-primary-400 uppercase tracking-wider">Heure de l'envoi</label>
                  <input
                    type="time"
                    value={scheduleConfig.time}
                    onChange={e => setScheduleConfig({ ...scheduleConfig, time: e.target.value })}
                    className="w-full text-xs py-1.5 px-3 bg-white dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg font-mono font-bold text-primary-800 dark:text-primary-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Sections to include */}
              <div className="space-y-2 text-left">
                <label className="text-[11px] font-bold text-primary-400 uppercase tracking-wider block">Sections à inclure dans le Rapport PDF</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 bg-primary-50 dark:bg-primary-950 rounded-lg border border-primary-100 dark:border-primary-850 cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900 transition text-left">
                    <input
                      type="checkbox"
                      checked={scheduleConfig.includeKpis}
                      onChange={e => setScheduleConfig({ ...scheduleConfig, includeKpis: e.target.checked })}
                      className="rounded border-primary-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-primary-800 dark:text-primary-200">Synthèse générale & KPI</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-primary-50 dark:bg-primary-950 rounded-lg border border-primary-100 dark:border-primary-850 cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900 transition text-left">
                    <input
                      type="checkbox"
                      checked={scheduleConfig.includeEquipments}
                      onChange={e => setScheduleConfig({ ...scheduleConfig, includeEquipments: e.target.checked })}
                      className="rounded border-primary-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-primary-800 dark:text-primary-200">Fiabilité équipements</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-primary-50 dark:bg-primary-950 rounded-lg border border-primary-100 dark:border-primary-850 cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900 transition text-left">
                    <input
                      type="checkbox"
                      checked={scheduleConfig.includeParts}
                      onChange={e => setScheduleConfig({ ...scheduleConfig, includeParts: e.target.checked })}
                      className="rounded border-primary-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-primary-800 dark:text-primary-200">Consommation pièces</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-primary-50 dark:bg-primary-950 rounded-lg border border-primary-100 dark:border-primary-850 cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900 transition text-left">
                    <input
                      type="checkbox"
                      checked={scheduleConfig.includePreventive}
                      onChange={e => setScheduleConfig({ ...scheduleConfig, includePreventive: e.target.checked })}
                      className="rounded border-primary-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-primary-800 dark:text-primary-200">Taux de conformité préventif</span>
                  </label>
                </div>
              </div>

              {/* Custom intro message */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[11px] font-bold text-primary-400 uppercase tracking-wider text-left">Message d'accompagnement de l'email</label>
                <textarea
                  rows={2}
                  value={scheduleConfig.customMessage}
                  onChange={e => setScheduleConfig({ ...scheduleConfig, customMessage: e.target.value })}
                  className="w-full text-xs py-2 px-3 bg-white dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg text-primary-800 dark:text-primary-200 focus:outline-none focus:border-indigo-500"
                  placeholder="Écrivez un message d'introduction..."
                />
              </div>

              {/* Logs / History of sends */}
              <div className="space-y-2 border-t border-primary-100 dark:border-primary-800 pt-4 text-left">
                <span className="text-[11px] font-bold text-primary-400 uppercase tracking-wider block">Historique récent d'envoi des bilans</span>
                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 text-left">
                  {scheduleConfig.history.map((log: any) => (
                    <div key={log.id} className="flex justify-between items-center p-2.5 bg-primary-50 dark:bg-primary-950 rounded-lg border border-primary-100 dark:border-primary-850 font-mono text-[10px]">
                      <div className="flex flex-col gap-0.5 text-left">
                        <span className="font-bold text-primary-800 dark:text-primary-200">
                          {new Date(log.date).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-primary-450 text-[9px] truncate max-w-[280px]" title={log.recipients}>
                          Destinataires : {log.recipients}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${log.trigger === 'Test' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400'}`}>
                          {log.trigger === 'Test' ? 'Test d\'essai' : 'Envoi auto.'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">
                          {log.status === 'Success' ? 'Envoyé ✓' : 'Échoué ✗'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-primary-100 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/20 flex flex-wrap gap-2 justify-between items-center">
              <button
                type="button"
                onClick={handleTestSend}
                disabled={isTestingSend || !scheduleConfig.emails}
                className="btn-primary bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isTestingSend ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Mail size={13} />
                )}
                <span>{isTestingSend ? "Compilation & Envoi..." : "Envoyer un Rapport Test"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="btn-secondary text-primary-700 bg-primary-100 hover:bg-primary-200 dark:bg-primary-800 dark:text-primary-200 hover:dark:bg-primary-750 font-bold rounded-xl text-xs py-2 px-4 transition cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveSchedule(scheduleConfig);
                    setIsScheduleModalOpen(false);
                  }}
                  className="btn-primary bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs py-2 px-4 transition shadow-sm cursor-pointer"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
