/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, FormEvent, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GammePreventive,
  Compteur,
  Equipement,
  GlobalSettings,
  Intervention,
  Utilisateur
} from '../types';
import { ModuleHelp } from './ModuleHelp';
import EquipmentTreeSelect from './EquipmentTreeSelect';
import { hasPermission, PermissionsMatrix } from '../permissionsConfig';
import {
  Calendar,
  ClipboardList,
  Plus,
  Trash2,
  PenTool,
  Printer,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gauge,
  CheckCircle,
  FileText,
  Filter,
  AlertTriangle,
  Search,
  User,
  Check,
  CalendarDays,
  Bell,
  Mail,
  Award,
  ShieldAlert,
  MessageSquare,
  Smartphone
} from 'lucide-react';

interface PlanningProps {
  currentRole: string;
  permissionsMatrix: PermissionsMatrix;
  gammes: GammePreventive[];
  compteurs: Compteur[];
  equipements: Equipement[];
  settings: GlobalSettings;
  interventions: Intervention[];
  onAddGamme: (payload: Omit<GammePreventive, 'id'>) => void;
  onEditGamme: (id: string, payload: Partial<GammePreventive>) => void;
  onDeleteGamme: (id: string) => void;
  onAddCompteur: (payload: Omit<Compteur, 'id' | 'dateReleve'>) => void;
  onEditIntervention?: (id: string, payload: Partial<Intervention>) => void;
  onAddIntervention?: (payload: Omit<Intervention, 'id' | 'dateCreation'>) => void;
  userRole?: string;
  utilisateurs?: Utilisateur[];
}

export default function Planning({
  currentRole,
  permissionsMatrix,
  gammes,
  compteurs,
  equipements,
  settings,
  interventions,
  onAddGamme,
  onEditGamme,
  onDeleteGamme,
  onAddCompteur,
  onEditIntervention,
  onAddIntervention,
  userRole,
  utilisateurs = []
}: PlanningProps) {
const canCreerModifierGamme = hasPermission(permissionsMatrix, currentRole, 'planning', 'creerModifierGamme');
  const canSupprimerGamme = hasPermission(permissionsMatrix, currentRole, 'planning', 'supprimerGamme');
  const canReleveCompteur = hasPermission(permissionsMatrix, currentRole, 'planning', 'releveCompteur');
  const [activeTab, setActiveTab] = useState<'calendrier' | 'gammes' | 'compteurs'>('calendrier');
  const [selectedGammeId, setSelectedGammeId] = useState<string | null>(null);
  const [showGammeForm, setShowGammeForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Calendar Navigation
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Enhanced Calendar & Weekly View states
  const [viewMode, setViewMode] = useState<'mois' | 'semaine' | 'gantt'>('mois');
  const [filterType, setFilterType] = useState<'all' | 'DI' | 'BT' | 'Preventif' | 'Previsionnel'>('all');
  const [filterUrgency, setFilterUrgency] = useState<'all' | 'mineur' | 'moyen' | 'critique'>('all');
  const [filterAtelier, setFilterAtelier] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [assignedTech, setAssignedTech] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Update detail form states when event is selected
  useEffect(() => {
    if (selectedEvent) {
      setRescheduleDate(selectedEvent.date);
      setAssignedTech(selectedEvent.technician || 'Non assigné');
      setSelectedStatus(selectedEvent.status || 'En attente');
    }
  }, [selectedEvent]);

  // Form states for Gammes (FMP)
  const [formEqId, setFormEqId] = useState('');
  const [formTitre, setFormTitre] = useState('');
  const [formTypeDecl, setFormTypeDecl] = useState<'Jours' | 'Mois' | 'Compteur'>('Mois');
  const [formValDecl, setFormValeurDecl] = useState<number>(6);
  const [formMo, setFormMo] = useState<number>(2);
  const [formSteps, setFormSteps] = useState<string[]>(['']);
  const [formDateRef, setFormDateRef] = useState(new Date().toISOString().split('T')[0]);
  const [formAlerteActive, setFormAlerteActive] = useState<boolean>(false);
  const [formTypeAlerte, setFormTypeAlerte] = useState<'email' | 'push' | 'both' | 'sms' | 'all'>('push');
  const [formDelaiAlerteHeures, setFormDelaiAlerteHeures] = useState<number>(48);
  const [formDestinataireAlerte, setFormDestinataireAlerte] = useState<string>('');
  const [formCompetencesRequises, setFormCompetencesRequises] = useState<string[]>([]);
  const [formNotifierSiPasDeBt, setFormNotifierSiPasDeBt] = useState<boolean>(false);
  const [formToleranceJoursPasDeBt, setFormToleranceJoursPasDeBt] = useState<number>(7);

  // Form states for Compteurs
  const [cptEqId, setCptEqId] = useState('');
  const [cptValeur, setCptValeur] = useState<number>(0);
  const [cptUnite, setCptUnite] = useState('Heures');

  // Handle Gamme Editing
  const handleStartEdit = (g: GammePreventive) => {
    setSelectedGammeId(g.id);
    setFormEqId(g.equipementId);
    setFormTitre(g.titre);
    setFormTypeDecl(g.typeDeclencheur);
    setFormValeurDecl(g.valeurDeclencheur);
    setFormMo(g.moPrevue);
    setFormSteps(g.checklist && g.checklist.length > 0 ? g.checklist : ['']);
    setFormDateRef(g.dateReference);
    setFormAlerteActive(!!g.alerteActive);
    setFormTypeAlerte(g.typeAlerte || 'push');
    setFormDelaiAlerteHeures(g.delaiAlerteHeures || 48);
    setFormDestinataireAlerte(g.destinataireAlerte || '');
    setFormCompetencesRequises(g.competencesRequises || []);
    setFormNotifierSiPasDeBt(!!g.notifierSiPasDeBt);
    setFormToleranceJoursPasDeBt(g.toleranceJoursPasDeBt || 7);
    setIsEditing(true);
    setShowGammeForm(true);
  };

  const handleStartCreate = () => {
    setSelectedGammeId(null);
    setFormEqId(equipements[0]?.id || '');
    setFormTitre('');
    setFormTypeDecl('Mois');
    setFormValeurDecl(6);
    setFormMo(2);
    setFormSteps(['']);
    setFormDateRef(new Date().toISOString().split('T')[0]);
    setFormAlerteActive(false);
    setFormTypeAlerte('push');
    setFormDelaiAlerteHeures(48);
    setFormDestinataireAlerte('');
    setFormCompetencesRequises([]);
    setFormNotifierSiPasDeBt(false);
    setFormToleranceJoursPasDeBt(7);
    setIsEditing(false);
    setShowGammeForm(true);
  };

  const handleAddStep = () => {
    setFormSteps([...formSteps, '']);
  };

  const handleRemoveStep = (idx: number) => {
    setFormSteps(formSteps.filter((_, i) => i !== idx));
  };

  const handleStepChange = (val: string, idx: number) => {
    setFormSteps(formSteps.map((s, i) => i === idx ? val : s));
  };

  const handleSubmitGamme = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEq = equipements.find(x => x.id === formEqId);
    if (!targetEq) return;

    const payload = {
      equipementId: formEqId,
      equipementNom: targetEq.nom,
      titre: formTitre,
      typeDeclencheur: formTypeDecl,
      valeurDeclencheur: Number(formValDecl),
      moPrevue: Number(formMo),
      checklist: formSteps.filter(s => s.trim() !== ''),
      dateReference: formDateRef,
      valeurCompteurReference: 0,
      alerteActive: formAlerteActive,
      typeAlerte: formTypeAlerte,
      delaiAlerteHeures: Number(formDelaiAlerteHeures),
      destinataireAlerte: formDestinataireAlerte,
      competencesRequises: formCompetencesRequises,
      notifierSiPasDeBt: formNotifierSiPasDeBt,
      toleranceJoursPasDeBt: Number(formToleranceJoursPasDeBt)
    };

    if (isEditing && selectedGammeId) {
      onEditGamme(selectedGammeId, payload);
    } else {
      onAddGamme(payload);
    }

    setShowGammeForm(false);
  };

const handleDeleteGamme = (id: string) => {
    if (!canSupprimerGamme) {
      alert("🔐 Accès refusé : vous n'avez pas la permission de supprimer des gammes de maintenance.");
      return;
    }
    if (confirm("⚠️ Souhaitez-vous supprimer définitivement cette gamme de maintenance préventive ?")) {
      onDeleteGamme(id);
    }
  };

  // Submit meter reading
  const handleSubmitCompteur = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEq = equipements.find(x => x.id === cptEqId);
    if (!targetEq) return;

    onAddCompteur({
      equipementId: cptEqId,
      equipementNom: targetEq.nom,
      valeur: Number(cptValeur),
      unite: cptUnite
    });

    setCptEqId('');
    setCptValeur(0);
    alert(`Relevé de compteur validé pour : ${targetEq.nom}`);
  };

  // Simulate PDF Printout
  const simulatePrintFmp = (g: GammePreventive) => {
    alert(`📄 FICHE TECHNIQUE IMPRIMÉE :\n\n` +
      `Gamme : ${g.titre}\n` +
      `Équipement cible : ${g.equipementNom}\n` +
      `Périodicité : Tous les ${g.valeurDeclencheur} ${g.typeDeclencheur}\n` +
      `Temps d'arrêt estimé : ${g.moPrevue} heures\n\n` +
      `GAMME OPÉRATOIRE :\n` +
      `${g.checklist.map((step, idx) => `[ ] Étape ${idx + 1}: ${step}`).join('\n')}\n\n` +
      `Le bon d'accompagnement de travail terrain a été préparé.`);
  };

  // Helper to parse hours from strings like "2.5 H" or numbers
  const parseHours = (t: string | undefined | number): number => {
    if (t === undefined || t === null) return 1.5;
    if (typeof t === 'number') return t;
    const cleaned = t.replace(/[hH]/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 1.5 : num;
  };

  // Forecast Engine: Projects simulated FMP events dynamically over next 12 months with enriched attributes
  const getCalendarEvents = () => {
    const events: any[] = [];
    
    // Add real active/pending interventions
    interventions.forEach(int => {
      if (int.statut === 'Soldé' || int.statut === 'Clôturé') return;
      const dStr = int.datePrevue || int.dateCreation;
      const refDate = dStr.split('T')[0];
      events.push({
        id: int.id,
        title: `[${int.typeDoc}] ${int.equipementNom}`,
        date: refDate,
        isPrevisionnel: false,
        type: int.typeDoc,
        urgency: int.urgence,
        status: int.statut,
        equipmentId: int.equipementId,
        equipmentNom: int.equipementNom,
        atelier: int.atelier,
        description: int.description,
        problemType: int.typeProbleme,
        technician: int.technicienCloture || 'Non assigné',
        duration: int.tempsPasse || '1.5 H',
        numero: int.numero
      });
    });

    // Project Gammes temporarily
    const today = new Date();
    const endProjection = new Date();
    endProjection.setFullYear(endProjection.getFullYear() + 1);

    gammes.forEach(g => {
      if (g.typeDeclencheur === 'Jours' || g.typeDeclencheur === 'Mois') {
        let simulatedDate = new Date(g.dateReference);
        let steps = 0;
        while (simulatedDate < endProjection && steps < 6) {
          if (g.typeDeclencheur === 'Jours') {
            simulatedDate.setDate(simulatedDate.getDate() + g.valeurDeclencheur);
          } else {
            simulatedDate.setMonth(simulatedDate.getMonth() + g.valeurDeclencheur);
          }

          if (simulatedDate > today && simulatedDate < endProjection) {
            const eq = equipements.find(eq => eq.id === g.equipementId);
            events.push({
              id: `sim-${g.id}-${steps}`,
              title: `[PREV] ${g.equipementNom}`,
              date: simulatedDate.toISOString().split('T')[0],
              isPrevisionnel: true,
              type: 'Prévision',
              urgency: eq && eq.critique ? 'Critique' : 'Moyenne',
              status: 'Planifié',
              equipmentId: g.equipementId,
              equipmentNom: g.equipementNom,
              atelier: eq?.atelier || 'N/A',
              description: g.titre,
              problemType: 'Maintenance Préventive Planifiée',
              technician: 'Équipe Préventif',
              duration: `${g.moPrevue} H`,
              gammeId: g.id,
              checklist: g.checklist,
              numero: `FMP-${g.id}`
            });
          }
          steps++;
        }
      }
    });

    return events.sort((a, b) => a.date.localeCompare(b.date));
  };

  const allEvents = useMemo(() => getCalendarEvents(), [interventions, gammes, equipements]);

  // Apply filters on the calendar events
  const filteredEvents = useMemo(() => {
    return allEvents.filter(e => {
      // Filter by Type
      if (filterType !== 'all') {
        if (filterType === 'DI' && e.type !== 'DI') return false;
        if (filterType === 'BT' && e.type !== 'BT') return false;
        if (filterType === 'Preventif' && e.type !== 'Préventif') return false;
        if (filterType === 'Previsionnel' && e.type !== 'Prévision') return false;
      }
      
      // Filter by Urgency
      if (filterUrgency !== 'all') {
        const uLower = e.urgency?.toLowerCase() || '';
        if (filterUrgency === 'mineur' && !uLower.includes('min')) return false;
        if (filterUrgency === 'moyen' && !uLower.includes('moy')) return false;
        if (filterUrgency === 'critique' && !(uLower.includes('crit') || uLower.includes('arr'))) return false;
      }

      // Filter by Atelier
      if (filterAtelier && e.atelier !== filterAtelier) return false;

      // Filter by Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const titleMatch = e.title.toLowerCase().includes(q);
        const equipMatch = e.equipmentNom.toLowerCase().includes(q);
        const descMatch = e.description?.toLowerCase().includes(q);
        if (!titleMatch && !equipMatch && !descMatch) return false;
      }

      return true;
    });
  }, [allEvents, filterType, filterUrgency, filterAtelier, searchQuery]);

  // Get events in the current monthly view scope
  const currentMonthEvents = useMemo(() => {
    const curYear = calendarDate.getFullYear();
    const curMonth = calendarDate.getMonth();
    return filteredEvents.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === curYear && d.getMonth() === curMonth;
    });
  }, [filteredEvents, calendarDate]);

  // Days of the week helper for weekly view
  const getDaysOfWeek = (refDate: Date) => {
    const temp = new Date(refDate);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1); // Monday adjustment
    const monday = new Date(temp.setDate(diff));
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      days.push(nextDay);
    }
    return days;
  };

  const weekDays = useMemo(() => getDaysOfWeek(calendarDate), [calendarDate]);

  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    return `Semaine du ${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} au ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
  }, [weekDays]);

  // KPI calculations
  const backlogCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return interventions.filter(int => {
      if (int.statut === 'Soldé' || int.statut === 'Clôturé') return false;
      const dStr = int.datePrevue || int.dateCreation;
      const refDate = dStr.split('T')[0];
      return refDate < todayStr;
    }).length;
  }, [interventions]);

  const completionRate = useMemo(() => {
    const curYear = calendarDate.getFullYear();
    const curMonth = calendarDate.getMonth();
    const monthlyInts = interventions.filter(i => {
      const d = new Date(i.datePrevue || i.dateCreation);
      return d.getFullYear() === curYear && d.getMonth() === curMonth;
    });
    const prevInts = monthlyInts.filter(i => i.typeDoc === 'Préventif');
    const closedPrev = prevInts.filter(i => i.statut === 'Soldé' || i.statut === 'Clôturé').length;
    return prevInts.length > 0 ? Math.round((closedPrev / prevInts.length) * 100) : 100;
  }, [interventions, calendarDate]);

  const currentMonthWorkload = useMemo(() => {
    return currentMonthEvents.reduce((acc, e) => acc + parseHours(e.duration), 0);
  }, [currentMonthEvents]);

  const plannedEquipmentsCount = useMemo(() => {
    const uniqIds = new Set(currentMonthEvents.map(e => e.equipmentId));
    return uniqIds.size;
  }, [currentMonthEvents]);

  const changeMonth = (offset: number) => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const changeWeek = (offset: number) => {
    setCalendarDate(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + offset * 7);
      return next;
    });
  };

  // Drag & drop handlers and Gantt helpers
  const handleDragStart = (ev: React.DragEvent, e: any) => {
    ev.dataTransfer.setData('text/plain', JSON.stringify({
      eventId: e.id,
      isPrevisionnel: e.isPrevisionnel,
      originDate: e.date,
      originEqId: e.equipmentId,
      gammeId: e.gammeId,
      title: e.title,
      description: e.description,
      duration: e.duration,
      atelier: e.atelier,
      checklist: e.checklist
    }));
  };

  const handleDropOnCell = (dragDataStr: string, targetDate: string, targetEqId?: string) => {
    try {
      const dragData = JSON.parse(dragDataStr);
      const { eventId, isPrevisionnel, originDate, originEqId } = dragData;

      // Check if anything actually changed
      if (originDate === targetDate && (!targetEqId || originEqId === targetEqId)) {
        return; // No change
      }

      // Target equipment details if targetEqId is provided
      let finalEqId = targetEqId || originEqId;
      let finalEqNom = '';
      let finalAtelier = '';
      const targetEq = equipements.find(eq => eq.id === finalEqId);
      if (targetEq) {
        finalEqNom = targetEq.nom;
        finalAtelier = targetEq.atelier;
      }

      if (isPrevisionnel) {
        // It's a previsionnel event. Let's create a real BT on this day!
        if (!onAddIntervention) return;
        
        const checklistStr = dragData.checklist && dragData.checklist.length > 0 
          ? "\n\nGAMME OPERATOIRE PREVUE :\n" + dragData.checklist.map((step: string, idx: number) => `[ ] Étape ${idx+1}: ${step}`).join('\n') 
          : "";

        // Find suggested operator
        let suggestedOp = '';
        if (dragData.gammeId) {
          const matchingGamme = gammes.find(g => g.id === dragData.gammeId);
          if (matchingGamme && matchingGamme.competencesRequises && matchingGamme.competencesRequises.length > 0) {
            const reqSkills = matchingGamme.competencesRequises;
            const bestTech = settings.listes.operateurs.map(techName => {
              const techSkills = settings.competencesTechniciens?.[techName] || [];
              const score = reqSkills.filter(s => techSkills.includes(s)).length;
              return { name: techName, score };
            }).sort((a, b) => b.score - a.score)[0];

            if (bestTech && bestTech.score > 0) {
              suggestedOp = bestTech.name;
            }
          }
        }
        const finalOp = suggestedOp || settings.listes.operateurs[0] || '';

        onAddIntervention({
          typeDoc: 'Préventif',
          numero: `BT-PRV-${Math.floor(10000 + Math.random() * 90000)}`,
          equipementId: finalEqId,
          equipementNom: finalEqNom || dragData.equipmentNom || 'Équipement',
          atelier: finalAtelier || dragData.atelier || 'N/A',
          urgence: 'Moyenne',
          typeProbleme: dragData.description || 'Maintenance Préventive',
          demandeur: 'Planificateur Gantt GMAO',
          description: `Bon de Travail Préventif généré par glisser-déposer depuis le calendrier.\nDate planifiée : ${targetDate}${checklistStr}${suggestedOp ? `\n\n[Suggestion Système] Affectation recommandée à : ${suggestedOp} (Technicien certifié)` : ''}`,
          statut: 'En attente',
          datePrevue: targetDate,
          gammeId: dragData.gammeId,
          operateur: finalOp
        });

        alert(`✅ FMP planifiée convertie en Bon de Travail Réel pour le ${targetDate} !`);
      } else {
        // Real intervention: update datePrevue and target equipment if applicable
        if (!onEditIntervention) return;

        const updatePayload: Partial<Intervention> = {
          datePrevue: targetDate
        };

        if (targetEqId && targetEqId !== originEqId && targetEq) {
          updatePayload.equipementId = targetEq.id;
          updatePayload.equipementNom = targetEq.nom;
          updatePayload.atelier = targetEq.atelier;
        }

        onEditIntervention(eventId, updatePayload);
        alert(`✅ Intervention replanifiée avec succès au ${targetDate} !`);
      }
    } catch (err) {
      console.error("Error processing drag and drop:", err);
    }
  };

  const ganttEquipements = useMemo(() => {
    return equipements.filter(eq => {
      if (filterAtelier && eq.atelier !== filterAtelier) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return eq.nom.toLowerCase().includes(q) || eq.id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [equipements, filterAtelier, searchQuery]);

  return (
    <div className="space-y-6">
      {/* MODULE HEADER BAR */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary-900 dark:text-white flex items-center">
            Planning Préventif
            <ModuleHelp moduleId="planning" />
          </h1>
          <p className="text-sm text-primary-500 dark:text-primary-400 mt-1">
            Gérez vos gammes de maintenance, le planning prévisionnel annuel, et les compteurs d'exploitation.
          </p>
        </div>

{activeTab === 'gammes' && canCreerModifierGamme && (
          <button
            onClick={handleStartCreate}
            className="btn-primary"
          >
            <Plus size={16} />
            Créer une Gamme
          </button>
        )}
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-4 border-b border-primary-200 dark:border-primary-700">
        <button
          onClick={() => setActiveTab('calendrier')}
          className={`px-4 py-2 font-display text-sm font-bold border-b-2 transition ${activeTab === 'calendrier' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-400 hover:text-primary-600'}`}
        >
          Planning Annuel (Agenda)
        </button>
        <button
          onClick={() => setActiveTab('gammes')}
          className={`px-4 py-2 font-display text-sm font-bold border-b-2 transition ${activeTab === 'gammes' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-400 hover:text-primary-600'}`}
        >
          Gammes & FMP
        </button>
        <button
          onClick={() => setActiveTab('compteurs')}
          className={`px-4 py-2 font-display text-sm font-bold border-b-2 transition ${activeTab === 'compteurs' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-400 hover:text-primary-600'}`}
        >
          Compteurs & Relevés
        </button>
      </div>

      {/* TAB 1: CALENDAR VIEW */}
      {activeTab === 'calendrier' && (
        <div className="space-y-6">
          {/* STATS OVERVIEW SECTION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-white dark:bg-primary-900 rounded-2xl border border-primary-100 dark:border-primary-800 flex items-center gap-4 shadow-sm"
            >
              <div className="p-3 bg-accent-orange/10 text-accent-orange rounded-xl">
                <Clock size={22} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-primary-400">Charge {viewMode === 'mois' ? 'Mensuelle' : 'Hebdomadaire'}</span>
                <h4 className="text-xl font-display font-bold text-primary-900 dark:text-white">
                  {currentMonthWorkload.toFixed(1)} H
                </h4>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="p-4 bg-white dark:bg-primary-900 rounded-2xl border border-primary-100 dark:border-primary-800 flex items-center gap-4 shadow-sm"
            >
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <CheckCircle size={22} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-primary-400">Taux Réalisation Préventif</span>
                <h4 className="text-xl font-display font-bold text-primary-900 dark:text-white">
                  {completionRate}%
                </h4>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 bg-white dark:bg-primary-900 rounded-2xl border border-primary-100 dark:border-primary-800 flex items-center gap-4 shadow-sm"
            >
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
                <AlertTriangle size={22} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-primary-400">Bons en Retard</span>
                <h4 className={`text-xl font-display font-bold ${backlogCount > 0 ? 'text-rose-500 font-black animate-pulse' : 'text-primary-900 dark:text-white'}`}>
                  {backlogCount}
                </h4>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-4 bg-white dark:bg-primary-900 rounded-2xl border border-primary-100 dark:border-primary-800 flex items-center gap-4 shadow-sm"
            >
              <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
                <Gauge size={22} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-primary-400">Équipements Planifiés</span>
                <h4 className="text-xl font-display font-bold text-primary-900 dark:text-white">
                  {plannedEquipmentsCount}
                </h4>
              </div>
            </motion.div>
          </div>

          {/* ADVANCED MULTI-CRITERIA FILTER BAR */}
          <div className="p-4 bg-white dark:bg-primary-900 rounded-2xl border border-primary-100 dark:border-primary-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-primary-50 dark:border-primary-850">
              <Filter size={14} className="text-accent-orange" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">Filtres du Planning</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary-400" size={14} />
                <input
                  type="text"
                  placeholder="Rechercher équipement, titre..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 py-1.5 text-xs bg-primary-50 dark:bg-primary-950 rounded-xl border border-primary-100 dark:border-primary-800 w-full"
                />
              </div>

              {/* Work Type selector */}
              <div>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as any)}
                  className="py-1.5 text-xs bg-primary-50 dark:bg-primary-950 rounded-xl border border-primary-100 dark:border-primary-800 w-full font-bold"
                >
                  <option value="all">Type : Tous les travaux</option>
                  <option value="DI">Type : Demandes d'Intervention (DI)</option>
                  <option value="BT">Type : Bons de Travail Correctifs (BT)</option>
                  <option value="Preventif">Type : Bons de Travail Préventifs</option>
                  <option value="Previsionnel">Type : Prévisionnel (FMP)</option>
                </select>
              </div>

              {/* Urgency selector */}
              <div>
                <select
                  value={filterUrgency}
                  onChange={e => setFilterUrgency(e.target.value as any)}
                  className="py-1.5 text-xs bg-primary-50 dark:bg-primary-950 rounded-xl border border-primary-100 dark:border-primary-800 w-full font-bold"
                >
                  <option value="all">Criticité : Toutes</option>
                  <option value="mineur">Criticité : Mineure</option>
                  <option value="moyen">Criticité : Moyenne</option>
                  <option value="critique">Criticité : Critique / Arrêt</option>
                </select>
              </div>

              {/* Atelier selector */}
              <div>
                <select
                  value={filterAtelier}
                  onChange={e => setFilterAtelier(e.target.value)}
                  className="py-1.5 text-xs bg-primary-50 dark:bg-primary-950 rounded-xl border border-primary-100 dark:border-primary-800 w-full font-bold"
                >
                  <option value="">Atelier : Tous les ateliers</option>
                  {(settings.listes.ateliers || []).map(a => (
                    <option key={a} value={a}>Atelier : {a}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* MAIN CALENDAR STAGE */}
          <div className="p-5 bg-white dark:bg-primary-900 rounded-2xl border border-primary-100 dark:border-primary-800 shadow-sm space-y-4">
            {/* Header controls and switches */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-primary-100 dark:border-primary-800">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-primary-50 dark:bg-primary-950 text-accent-orange rounded-xl">
                  {viewMode === 'mois' ? <Calendar size={18} /> : <CalendarDays size={18} />}
                </span>
                <div>
                  <h3 className="font-display font-extrabold text-base text-primary-900 dark:text-white capitalize">
                    {viewMode === 'mois' 
                      ? calendarDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                      : weekLabel}
                  </h3>
                  <p className="text-[10px] text-primary-400 font-bold uppercase tracking-tight">
                    {filteredEvents.length} événements correspondent aux filtres
                  </p>
                </div>
              </div>

              {/* View switches and navigation */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {/* Mode Selector */}
                <div className="flex rounded-xl bg-primary-50 dark:bg-primary-950 p-1 mr-2 text-xs font-bold border border-primary-100 dark:border-primary-850">
                  <button
                    onClick={() => setViewMode('mois')}
                    className={`px-3 py-1 rounded-lg transition-all ${viewMode === 'mois' ? 'bg-white dark:bg-primary-900 text-primary-800 dark:text-white shadow-sm' : 'text-primary-400 hover:text-primary-600'}`}
                  >
                    Mois
                  </button>
                  <button
                    onClick={() => setViewMode('semaine')}
                    className={`px-3 py-1 rounded-lg transition-all ${viewMode === 'semaine' ? 'bg-white dark:bg-primary-900 text-primary-800 dark:text-white shadow-sm' : 'text-primary-400 hover:text-primary-600'}`}
                  >
                    Semaine
                  </button>
                  <button
                    onClick={() => setViewMode('gantt')}
                    className={`px-3 py-1 rounded-lg transition-all ${viewMode === 'gantt' ? 'bg-white dark:bg-primary-900 text-primary-800 dark:text-white shadow-sm' : 'text-primary-400 hover:text-primary-600'}`}
                  >
                    Planning Gantt
                  </button>
                </div>

                {/* Date Controls */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => viewMode === 'mois' ? changeMonth(-1) : changeWeek(-1)}
                    className="p-1.5 rounded-xl border border-primary-100 dark:border-primary-800 hover:bg-primary-50 dark:hover:bg-primary-950 text-primary-500 transition"
                    title="Précédent"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCalendarDate(new Date())}
                    className="px-3 py-1.5 text-xs font-bold bg-primary-50 dark:bg-primary-950 hover:bg-primary-100 dark:hover:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-xl border border-primary-100 dark:border-primary-800 transition"
                  >
                    Aujourd'hui
                  </button>
                  <button
                    onClick={() => viewMode === 'mois' ? changeMonth(1) : changeWeek(1)}
                    className="p-1.5 rounded-xl border border-primary-100 dark:border-primary-800 hover:bg-primary-50 dark:hover:bg-primary-950 text-primary-500 transition"
                    title="Suivant"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* VIEW MODE 1: MONTHLY VIEW */}
            {viewMode === 'mois' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* List side display for selected month */}
                <div className="lg:col-span-1 lg:border-r lg:pr-4 border-dashed border-primary-100 dark:border-primary-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary-400 flex items-center justify-between">
                    <span>Événements de ce mois</span>
                    <span className="bg-primary-100 dark:bg-primary-950 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-primary-600 dark:text-primary-400">
                      {currentMonthEvents.length}
                    </span>
                  </h4>
                  
                  <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
                    {currentMonthEvents.length === 0 ? (
                      <div className="text-center py-10 border border-dashed border-primary-50 dark:border-primary-850 rounded-2xl">
                        <p className="text-xs text-primary-400 italic">Aucune opération planifiée.</p>
                      </div>
                    ) : (
                      currentMonthEvents.map(e => {
                        const date = new Date(e.date);
                        return (
                          <div
                            key={e.id}
                            draggable={true}
                            onDragStart={(ev) => handleDragStart(ev, e)}
                            onClick={() => setSelectedEvent(e)}
                            className={`p-3 rounded-xl border text-left cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-150 ${
                              e.isPrevisionnel 
                                ? 'border-dashed border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/30' 
                                : e.type === 'Préventif'
                                  ? 'border-emerald-100 dark:border-emerald-950/50 bg-emerald-500/[0.03] text-emerald-800 dark:text-emerald-300'
                                  : 'border-rose-100 dark:border-rose-950/50 bg-rose-500/[0.03] text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-mono text-[9px] font-black text-primary-400 bg-primary-100 dark:bg-primary-950 px-1.5 py-0.2 rounded">
                                {date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                                e.isPrevisionnel 
                                  ? 'bg-primary-100 text-primary-700' 
                                  : e.type === 'Préventif'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              }`}>
                                {e.isPrevisionnel ? 'FMP' : e.type}
                              </span>
                            </div>
                            <p className="font-bold text-xs text-primary-900 dark:text-white truncate">
                              {e.title.replace(/\[.*?\]/, '').trim()}
                            </p>
                            <p className="text-[10px] text-primary-400 mt-1 font-bold">
                              {e.atelier} • Durée: {e.duration}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Grid display for the month */}
                <div className="lg:col-span-3 space-y-1">
                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] uppercase tracking-wider pb-2 border-b text-primary-400">
                    <div>Lun</div><div>Mar</div><div>Mer</div><div>Jeu</div><div>Ven</div><div>Sam</div><div>Dim</div>
                  </div>

                  {/* Monthly matrix grid */}
                  <div className="grid grid-cols-7 gap-1 mt-1">
                    {Array.from({ length: 35 }).map((_, idx) => {
                      const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();
                      const startOffset = firstDay === 0 ? 6 : firstDay - 1;
                      const dayVal = idx + 1 - startOffset;
                      const maxDays = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();

                      const isValid = dayVal > 0 && dayVal <= maxDays;
                      const curDayDate = isValid ? new Date(calendarDate.getFullYear(), calendarDate.getMonth(), dayVal) : null;
                      const formattedDate = curDayDate ? curDayDate.toISOString().split('T')[0] : '';
                      const dayEvents = isValid ? currentMonthEvents.filter(e => e.date === formattedDate) : [];

                      return (
                        <div
                          key={idx}
                          onDragOver={(ev) => isValid && ev.preventDefault()}
                          onDrop={(ev) => {
                            if (isValid) {
                              ev.preventDefault();
                              const dragDataStr = ev.dataTransfer.getData('text/plain');
                              if (dragDataStr) {
                                handleDropOnCell(dragDataStr, formattedDate);
                              }
                            }
                          }}
                          className={`h-28 p-1.5 border border-primary-50 dark:border-primary-850/50 flex flex-col justify-between rounded-xl transition-all duration-150 ${
                            isValid 
                              ? curDayDate?.toDateString() === new Date().toDateString()
                                ? 'bg-orange-50/20 dark:bg-orange-950/10 border-orange-200 dark:border-orange-950 ring-1 ring-orange-200 dark:ring-orange-900/30'
                                : 'bg-white dark:bg-primary-950' 
                              : 'bg-primary-50/20 dark:bg-primary-900/10 opacity-40'
                          }`}
                        >
                          <span className={`font-mono text-[10px] font-bold ${
                            isValid 
                              ? curDayDate?.toDateString() === new Date().toDateString()
                                ? 'text-orange-500 font-extrabold'
                                : 'text-primary-700 dark:text-primary-300' 
                              : 'text-primary-300 dark:text-primary-700'
                          }`}>
                            {isValid ? dayVal : ''}
                          </span>
                          {isValid && dayEvents.length > 0 && (
                            <div className="space-y-1 max-h-20 overflow-y-auto pr-0.5 scrollbar-thin">
                              {dayEvents.map(e => (
                                <div
                                  key={e.id}
                                  draggable={true}
                                  onDragStart={(ev) => handleDragStart(ev, e)}
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setSelectedEvent(e);
                                  }}
                                  className={`px-1.5 py-0.5 text-[8px] truncate rounded-lg border font-bold transition cursor-pointer hover:shadow-md hover:scale-[1.01] ${
                                    e.isPrevisionnel 
                                      ? 'border-dashed border-primary-200 bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-400' 
                                      : e.type === 'Préventif'
                                        ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' 
                                        : 'border-rose-200 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400'
                                  }`}
                                  title={e.title}
                                >
                                  {e.title.replace(/\[.*?\]/, '').trim()}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW MODE 2: WEEKLY VIEW */}
            {viewMode === 'semaine' && (
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {weekDays.map((day, dIdx) => {
                  const dStr = day.toISOString().split('T')[0];
                  const dayEvents = filteredEvents.filter(e => e.date === dStr);
                  const dayWorkload = dayEvents.reduce((acc, e) => acc + parseHours(e.duration), 0);
                  const workloadPercentage = Math.min(100, (dayWorkload / 8) * 100);
                  
                  // Choose workload progress bar color
                  let progressColor = 'bg-emerald-500';
                  if (dayWorkload > 8) progressColor = 'bg-red-500 animate-pulse';
                  else if (dayWorkload > 4) progressColor = 'bg-amber-500';

                  const isToday = day.toDateString() === new Date().toDateString();

                  return (
                    <div 
                      key={dIdx} 
                      onDragOver={(ev) => ev.preventDefault()}
                      onDrop={(ev) => {
                        ev.preventDefault();
                        const dragDataStr = ev.dataTransfer.getData('text/plain');
                        if (dragDataStr) {
                          handleDropOnCell(dragDataStr, dStr);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border flex flex-col min-h-[420px] transition-all duration-250 ${
                        isToday 
                          ? 'bg-orange-500/[0.02] dark:bg-orange-950/[0.04] border-orange-200 dark:border-orange-900/50 shadow-md shadow-orange-500/5' 
                          : 'bg-white dark:bg-primary-950 border-primary-50 dark:border-primary-850'
                      }`}
                    >
                      {/* Day Header */}
                      <div className="border-b border-primary-50 dark:border-primary-850 pb-2 mb-3">
                        <div className="flex justify-between items-baseline">
                          <h4 className={`font-display font-black text-xs uppercase tracking-wider ${isToday ? 'text-orange-500' : 'text-primary-800 dark:text-primary-100'}`}>
                            {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                          </h4>
                          <span className={`font-mono text-[10px] font-bold ${isToday ? 'text-orange-500 font-extrabold' : 'text-primary-400'}`}>
                            {day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        </div>
                        
                        {/* Daily Workload Meter */}
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-[9px] font-extrabold text-primary-400">
                            <span>Charge : {dayWorkload.toFixed(1)}h</span>
                            <span>Cap: 8h</span>
                          </div>
                          <div className="w-full bg-primary-100 dark:bg-primary-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
                              style={{ width: `${workloadPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Day Events List */}
                      <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[350px] pr-1 scrollbar-thin">
                        {dayEvents.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-primary-50 dark:border-primary-850 rounded-xl">
                            <span className="text-[10px] text-primary-300 italic">Aucun travail</span>
                          </div>
                        ) : (
                          dayEvents.map(e => (
                            <div
                              key={e.id}
                              draggable={true}
                              onDragStart={(ev) => handleDragStart(ev, e)}
                              onClick={() => setSelectedEvent(e)}
                              className={`p-3 rounded-xl border text-left cursor-pointer hover:shadow-md hover:scale-[1.03] transition-all duration-150 ${
                                e.isPrevisionnel 
                                  ? 'border-dashed border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300' 
                                  : e.type === 'Préventif'
                                    ? 'border-emerald-200 dark:border-emerald-950/30 bg-emerald-500/[0.04] text-emerald-800 dark:text-emerald-300'
                                    : 'border-rose-200 dark:border-rose-950/30 bg-rose-500/[0.04] text-rose-800 dark:text-rose-300'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1 gap-1">
                                <span className={`text-[8px] font-black px-1.5 py-0.2 rounded shrink-0 ${
                                  e.isPrevisionnel 
                                    ? 'bg-primary-100 text-primary-600 dark:bg-primary-800' 
                                    : e.type === 'Préventif'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                  {e.isPrevisionnel ? 'PREV' : e.type}
                                </span>
                                
                                <span className="text-[9px] font-mono text-primary-400 font-bold tracking-tight">
                                  {e.duration}
                                </span>
                              </div>
                              
                              <h5 className="font-bold text-xs truncate text-primary-900 dark:text-white leading-snug">
                                {e.title.replace(/\[.*?\]/, '').trim()}
                              </h5>
                              
                              <div className="flex items-center gap-1 mt-1.5 text-[9px] text-primary-400 font-bold uppercase tracking-tight">
                                <span className="truncate max-w-[80px]">{e.atelier}</span>
                                <span>•</span>
                                <span className={`truncate max-w-[80px] ${
                                  e.urgency?.toLowerCase().includes('crit') || e.urgency?.toLowerCase().includes('arr') 
                                    ? 'text-red-500 font-extrabold' 
                                    : ''
                                }`}>{e.urgency}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'gantt' && (
              <div className="overflow-x-auto rounded-2xl border border-primary-100 dark:border-primary-850 shadow-sm bg-white dark:bg-primary-900">
                <div className="min-w-[1000px] divide-y divide-primary-100 dark:divide-primary-800 animate-fadeIn">
                  {/* Gantt Header: Left column is "Équipements", right is week days */}
                  <div className="flex bg-primary-50 dark:bg-primary-950 font-bold text-xs uppercase tracking-wider text-primary-500 py-3 divide-x divide-primary-100 dark:divide-primary-800">
                    <div className="w-64 px-4 flex items-center justify-between">
                      <span className="font-display font-extrabold text-primary-700 dark:text-primary-300">Équipements</span>
                      <span className="text-[10px] bg-primary-200 dark:bg-primary-800 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">
                        {ganttEquipements.length}
                      </span>
                    </div>
                    {weekDays.map((day, dIdx) => {
                      const isToday = day.toDateString() === new Date().toDateString();
                      return (
                        <div 
                          key={dIdx} 
                          className={`flex-1 text-center py-1 px-2 flex flex-col items-center justify-center ${
                            isToday ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : ''
                          }`}
                        >
                          <span className="text-[10px] font-black">{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                          <span className="font-mono text-xs font-bold">{day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Gantt Rows: Each Row is an Equipment */}
                  {ganttEquipements.length === 0 ? (
                    <div className="p-12 text-center text-primary-400 italic text-sm">
                      Aucun équipement ne correspond aux filtres.
                    </div>
                  ) : (
                    ganttEquipements.map(eq => {
                      return (
                        <div key={eq.id} className="flex hover:bg-primary-50/30 dark:hover:bg-primary-950/10 divide-x divide-primary-100 dark:divide-primary-800 min-h-[96px] transition-colors">
                          {/* Left column: Equipment Info */}
                          <div className="w-64 p-3.5 flex flex-col justify-between bg-primary-50/10 dark:bg-primary-950/5 shrink-0">
                            <div>
                              <div className="flex items-start justify-between gap-1">
                                <h5 className="font-display font-black text-xs text-primary-900 dark:text-white leading-tight hover:underline cursor-pointer">
                                  {eq.nom}
                                </h5>
                                {eq.critique && (
                                  <span className="shrink-0 bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-[8px] font-extrabold px-1.5 py-0.2 rounded-full border border-red-200/50">
                                    CRITIQUE
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-primary-400 font-mono mt-0.5">{eq.id}</p>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-primary-400 font-bold uppercase tracking-wider mt-2 pt-2 border-t border-primary-50 dark:border-primary-850">
                              <span>{eq.atelier}</span>
                              <span className="bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300 px-1.5 py-0.2 rounded">
                                {eq.metier}
                              </span>
                            </div>
                          </div>

                          {/* Right columns: Day columns */}
                          {weekDays.map((day, dIdx) => {
                            const dStr = day.toISOString().split('T')[0];
                            const dayEvents = filteredEvents.filter(e => e.equipmentId === eq.id && e.date === dStr);
                            const isToday = day.toDateString() === new Date().toDateString();

                            return (
                              <div
                                key={dIdx}
                                onDragOver={(ev) => ev.preventDefault()}
                                onDrop={(ev) => {
                                  ev.preventDefault();
                                  const dragDataStr = ev.dataTransfer.getData('text/plain');
                                  if (dragDataStr) {
                                    handleDropOnCell(dragDataStr, dStr, eq.id);
                                  }
                                }}
                                className={`flex-1 p-2 flex flex-col gap-1.5 min-h-[96px] transition-all relative group ${
                                  isToday 
                                    ? 'bg-orange-500/[0.01] dark:bg-orange-950/[0.02]' 
                                    : 'hover:bg-primary-50/50 dark:hover:bg-primary-950/20'
                                }`}
                              >
                                {dayEvents.length === 0 ? (
                                  <div className="flex-1 flex items-center justify-center border border-dashed border-transparent group-hover:border-primary-200 dark:group-hover:border-primary-800 rounded-xl transition-all">
                                    <span className="text-[9px] text-primary-300 dark:text-primary-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-bold">
                                      + Glisser ici
                                    </span>
                                  </div>
                                ) : (
                                  dayEvents.map(e => (
                                    <div
                                      key={e.id}
                                      draggable={true}
                                      onDragStart={(ev) => handleDragStart(ev, e)}
                                      onClick={(ev) => {
                                        ev.stopPropagation();
                                        setSelectedEvent(e);
                                      }}
                                      className={`p-2 rounded-xl border text-left cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 relative group/card ${
                                        e.isPrevisionnel 
                                          ? 'border-dashed border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300' 
                                          : e.type === 'Préventif'
                                            ? 'border-emerald-200 dark:border-emerald-950/30 bg-emerald-500/[0.05] text-emerald-800 dark:text-emerald-300'
                                            : 'border-rose-200 dark:border-rose-950/30 bg-rose-500/[0.05] text-rose-800 dark:text-rose-300'
                                      }`}
                                    >
                                      <div className="flex justify-between items-center mb-1 gap-1">
                                        <span className={`text-[7px] font-black px-1 py-0.2 rounded shrink-0 ${
                                          e.isPrevisionnel 
                                            ? 'bg-primary-100 text-primary-600 dark:bg-primary-800' 
                                            : e.type === 'Préventif'
                                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                        }`}>
                                          {e.isPrevisionnel ? 'PREV' : e.type}
                                        </span>
                                        <span className="text-[8px] font-mono text-primary-400 font-bold">
                                          {e.duration}
                                        </span>
                                      </div>
                                      <h6 className="font-bold text-[10px] truncate text-primary-900 dark:text-white leading-tight">
                                        {e.title.replace(/\[.*?\]/, '').trim()}
                                      </h6>
                                      {/* Tiny drag indicator handle on hover */}
                                      <div className="absolute right-1.5 bottom-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                        <span className="text-[8px] font-bold text-primary-300 dark:text-primary-600 font-mono">☰ Déplacer</span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* EVENT DETAIL CONTROLLER DIALOG */}
          <AnimatePresence>
            {selectedEvent && (
              <div className="modal">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="modal-content"
                  style={{ maxWidth: '550px', width: '100%' }}
                >
                  <span onClick={() => setSelectedEvent(null)} className="close-modal">&times;</span>
                  
                  <div className="border-b pb-3 mb-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase ${
                        selectedEvent.isPrevisionnel 
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-800' 
                          : selectedEvent.type === 'Préventif'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {selectedEvent.isPrevisionnel ? 'Simulé Prévisionnel FMP' : `BT Réel - ${selectedEvent.type}`}
                      </span>
                      <span className="font-mono text-xs font-bold text-primary-400">{selectedEvent.numero}</span>
                    </div>
                    <h2 className="text-xl font-display font-black text-primary-900 dark:text-white leading-snug">
                      {selectedEvent.title.replace(/\[.*?\]/, '').trim()}
                    </h2>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Basic specs layout */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-primary-50 dark:bg-primary-950 rounded-xl border border-primary-100 dark:border-primary-850">
                      <div>
                        <span className="text-[10px] text-primary-400 uppercase font-bold block">Équipement</span>
                        <span className="font-bold text-primary-800 dark:text-primary-100">{selectedEvent.equipmentNom}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-primary-400 uppercase font-bold block">Atelier</span>
                        <span className="font-bold text-primary-800 dark:text-primary-100">{selectedEvent.atelier}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-primary-400 uppercase font-bold block">Criticité / Urgence</span>
                        <span className={`font-bold ${
                          selectedEvent.urgency?.toLowerCase().includes('crit') || selectedEvent.urgency?.toLowerCase().includes('arr')
                            ? 'text-red-500 font-extrabold'
                            : 'text-primary-800 dark:text-primary-100'
                        }`}>{selectedEvent.urgency}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-primary-400 uppercase font-bold block">Durée Allouée</span>
                        <span className="font-bold text-primary-800 dark:text-primary-100">{selectedEvent.duration}</span>
                      </div>
                    </div>

                    {/* Description of operations */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-primary-400 uppercase font-bold block">Travaux à réaliser :</span>
                      <div className="p-3 bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800 rounded-xl max-h-40 overflow-y-auto font-medium text-primary-600 dark:text-primary-300">
                        <p className="whitespace-pre-line leading-relaxed">{selectedEvent.description || 'Aucune consigne spécifique.'}</p>
                        
                        {/* If checklist steps exist, list them */}
                        {selectedEvent.checklist && selectedEvent.checklist.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-dashed border-primary-100 dark:border-primary-800 space-y-1.5">
                            <span className="font-bold text-primary-800 dark:text-white flex items-center gap-1"><FileText size={12} /> Étapes opérationnelles :</span>
                            {selectedEvent.checklist.map((step: string, idx: number) => (
                              <div key={idx} className="flex gap-2 items-start text-[11px] py-0.5">
                                <span className="font-mono text-[10px] font-bold text-primary-400 shrink-0">#{idx+1}</span>
                                <span>[ ] {step}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* INTERACTIVE CONTROLS FOR RESCHEDULING / MANAGING */}
                    <div className="border-t border-dashed border-primary-100 dark:border-primary-800 pt-3 space-y-3">
                      <span className="text-[10px] text-primary-400 uppercase font-bold block flex items-center gap-1">
                        <PenTool size={11} className="text-accent-orange" /> Planification & Gestion
                      </span>

                      {/* Date Rescheduler input */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold block mb-1">Date d'intervention</label>
                          <input
                            type="date"
                            value={rescheduleDate}
                            onChange={e => setRescheduleDate(e.target.value)}
                            className="text-xs w-full py-1"
                          />
                        </div>

                        {/* Quick Reschedule buttons */}
                        <div className="flex flex-col justify-end">
                          <span className="text-[9px] font-bold text-primary-400 mb-1">Décalage rapide :</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const next = new Date(rescheduleDate || selectedEvent.date);
                                next.setDate(next.getDate() + 1);
                                setRescheduleDate(next.toISOString().split('T')[0]);
                              }}
                              className="px-2 py-1 bg-primary-100 dark:bg-primary-950 text-[10px] font-bold rounded hover:bg-primary-200 transition text-primary-700 dark:text-primary-300 flex-1"
                            >
                              +1 Jour
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = new Date(rescheduleDate || selectedEvent.date);
                                next.setDate(next.getDate() + 7);
                                setRescheduleDate(next.toISOString().split('T')[0]);
                              }}
                              className="px-2 py-1 bg-primary-100 dark:bg-primary-950 text-[10px] font-bold rounded hover:bg-primary-200 transition text-primary-700 dark:text-primary-300 flex-1"
                            >
                              +1 Semaine
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Status and Technician assignee - ONLY if not Previsionnel */}
                      {!selectedEvent.isPrevisionnel ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold block mb-1">Statut d'exécution</label>
                            <select
                              value={selectedStatus}
                              onChange={e => setSelectedStatus(e.target.value)}
                              className="text-xs w-full py-1 font-bold"
                            >
                              <option value="En attente">En attente</option>
                              <option value="En cours">En cours</option>
                              <option value="En attente de pièce">En attente de pièce</option>
                              <option value="Soldé">Soldé (Réalisé)</option>
                              <option value="Clôturé">Clôturé (Archivé)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold block mb-1">Technicien assigné</label>
                            <input
                              type="text"
                              value={assignedTech}
                              onChange={e => setAssignedTech(e.target.value)}
                              placeholder="Ex: Martin, Dupuis..."
                              className="text-xs w-full py-1"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* MODAL ACTION FOOTER BUTTONS */}
                    <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(null)}
                        className="btn-secondary text-xs"
                      >
                        Fermer
                      </button>

                      {/* IF REAL BT: SAVE EDITS */}
                      {!selectedEvent.isPrevisionnel && onEditIntervention ? (
                        <button
                          type="button"
                          onClick={() => {
                            onEditIntervention(selectedEvent.id, {
                              datePrevue: rescheduleDate,
                              statut: selectedStatus as any,
                              technicienCloture: assignedTech
                            });
                            alert(`✅ Le Bon de Travail ${selectedEvent.numero} a été mis à jour et replanifié !`);
                            setSelectedEvent(null);
                          }}
                          className="btn-primary text-xs flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
                        >
                          <Check size={14} /> Enregistrer Replanification
                        </button>
                      ) : null}

                      {/* IF PREVISIONNEL: CONVERT TO REAL BT */}
                      {selectedEvent.isPrevisionnel && onAddIntervention ? (
                        <button
                          type="button"
                          onClick={() => {
                            const checklistStr = selectedEvent.checklist && selectedEvent.checklist.length > 0 
                              ? "\n\nGAMME OPERATOIRE PREVUE :\n" + selectedEvent.checklist.map((step: string, idx: number) => `[ ] Étape ${idx+1}: ${step}`).join('\n') 
                              : "";

                            // Find best qualified technician based on required skills
                            let suggestedOp = '';
                            if (selectedEvent.gammeId) {
                              const matchingGamme = gammes.find(g => g.id === selectedEvent.gammeId);
                              if (matchingGamme && matchingGamme.competencesRequises && matchingGamme.competencesRequises.length > 0) {
                                const reqSkills = matchingGamme.competencesRequises;
                                const bestTech = settings.listes.operateurs.map(techName => {
                                  const techSkills = settings.competencesTechniciens?.[techName] || [];
                                  const score = reqSkills.filter(s => techSkills.includes(s)).length;
                                  return { name: techName, score };
                                }).sort((a, b) => b.score - a.score)[0];

                                if (bestTech && bestTech.score > 0) {
                                  suggestedOp = bestTech.name;
                                }
                              }
                            }

                            const finalOp = suggestedOp || settings.listes.operateurs[0] || '';

                            onAddIntervention({
                              typeDoc: 'Préventif',
                              numero: `BT-PRV-${Math.floor(10000 + Math.random() * 90000)}`,
                              equipementId: selectedEvent.equipmentId,
                              equipementNom: selectedEvent.equipmentNom,
                              atelier: selectedEvent.atelier,
                              urgence: 'Moyenne',
                              typeProbleme: selectedEvent.description || 'Maintenance Préventive',
                              demandeur: 'Planificateur Hebdo GMAO',
                              description: `Bon de Travail Préventif généré depuis le calendrier de planification prévisionnelle FMP.\nDate cible planifiée : ${rescheduleDate || selectedEvent.date}${checklistStr}${suggestedOp ? `\n\n[Suggestion Système] Affectation recommandée à : ${suggestedOp} (Technicien certifié)` : ''}`,
                              statut: 'En attente',
                              datePrevue: rescheduleDate || selectedEvent.date,
                              gammeId: selectedEvent.gammeId,
                              operateur: finalOp
                            });

                            alert(`🚀 Succès ! Le Bon de Travail Préventif Réel a été créé et assigné automatiquement à ${finalOp} (qualifié).`);
                            setSelectedEvent(null);
                          }}
                          className="btn-primary text-xs flex items-center gap-1.5 bg-accent-orange text-white"
                        >
                          <Plus size={14} /> Générer Bon de Travail Réel (BT)
                        </button>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* TAB 2: GAMMES & FMP */}
      {activeTab === 'gammes' && (
        <div className="space-y-6">
          {/* FMP LIST */}
          <div className="card">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary-800 dark:text-primary-200 mb-4">
              <ClipboardList className="text-accent-orange inline mr-1.5" size={18} />
              Catalogue des Gammes Préventives Actives
            </h3>

            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Équipement</th>
                    <th>Opération</th>
                    <th>Périodicité</th>
                    <th>Temps MO</th>
                    <th>Alertes & Prévention</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {gammes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-primary-500 text-sm">
                        Aucune gamme de maintenance paramétrée.
                      </td>
                    </tr>
                  ) : (
                    gammes.map(g => (
                      <tr key={g.id} className="hover:bg-primary-50 dark:hover:bg-primary-800 transition">
                        <td className="font-bold">{g.equipementNom}</td>
                        <td>
                          <span className="font-semibold text-primary-800 dark:text-white block">{g.titre}</span>
                          <span className="text-[10px] text-primary-400">Ref: FMP-{g.id}</span>
                          {g.competencesRequises && g.competencesRequises.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {g.competencesRequises.map(skill => (
                                <span
                                  key={skill}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40"
                                >
                                  <Award size={9} />
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="px-2 py-0.5 rounded text-xs bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-indigo-900">
                            Tous les {g.valeurDeclencheur} {g.typeDeclencheur}
                          </span>
                        </td>
                        <td>{g.moPrevue} H</td>
                        <td>
                          <div className="space-y-1">
                            {g.alerteActive ? (
                              <div className="flex flex-col gap-0.5" title={`${g.delaiAlerteHeures || 48}h avant l'échéance`}>
                                <span className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/40 w-fit">
                                  {g.typeAlerte === 'email' ? (
                                    <Mail size={10} className="text-indigo-500" />
                                  ) : g.typeAlerte === 'sms' ? (
                                    <MessageSquare size={10} className="text-indigo-500" />
                                  ) : g.typeAlerte === 'push' ? (
                                    <Bell size={10} className="text-indigo-500" />
                                  ) : g.typeAlerte === 'both' ? (
                                    <Bell size={10} className="text-indigo-500" />
                                  ) : (
                                    <Smartphone size={10} className="text-indigo-500" />
                                  )}
                                  {g.typeAlerte === 'email' ? 'Alerte Email' : 
                                   g.typeAlerte === 'push' ? 'Notification Push' : 
                                   g.typeAlerte === 'sms' ? 'Alerte SMS' :
                                   g.typeAlerte === 'both' ? 'Email & Push' : 'Tous les canaux'}
                                </span>
                                {g.destinataireAlerte && (
                                  <span className="text-[9px] text-primary-400 font-mono truncate max-w-[150px]">{g.destinataireAlerte}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-primary-400 italic block">Alertes désactivées</span>
                            )}
                            
                            {g.notifierSiPasDeBt ? (
                              <div className="flex items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded border border-orange-100 dark:border-orange-900/40 w-fit mt-1" title={`Alerte si aucun BT créé après ${g.toleranceJoursPasDeBt || 7} jours`}>
                                <ShieldAlert size={10} className="text-orange-500" />
                                Anti-oubli : {g.toleranceJoursPasDeBt || 7} j
                              </div>
                            ) : (
                              <span className="text-[9px] text-primary-400/70 italic block">Anti-oubli : Inactif</span>
                            )}
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => simulatePrintFmp(g)}
                              className="btn-icon bg-primary-100 hover:bg-indigo-600 hover:text-white"
                              title="Imprimer gamme opératoire"
                            >
                              <Printer size={14} />
                            </button>
{canCreerModifierGamme && (
                            <button
                              onClick={() => handleStartEdit(g)}
                              className="btn-icon bg-primary-100 hover:bg-sky-500 hover:text-white"
                              title="Modifier"
                            >
                              <PenTool size={14} />
                            </button>
                            )}
                            {canSupprimerGamme && (
                            <button
                              onClick={() => handleDeleteGamme(g.id)}
                              className="btn-icon bg-primary-100 hover:bg-red-500 hover:text-white"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPTEURS */}
      {activeTab === 'compteurs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Relevé Form */}
          <div className="card lg:col-span-1 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary-800 dark:text-primary-200 border-b pb-2 flex items-center gap-1.5">
              <Gauge className="text-accent-orange" size={18} />
              Nouveau Relevé
            </h3>

            <form onSubmit={handleSubmitCompteur} className="space-y-4 text-xs">
              <div>
                <label>Équipement cible <span className="text-red-500">*</span></label>
                <EquipmentTreeSelect
                  equipements={equipements}
                  selectedId={cptEqId}
                  onSelect={setCptEqId}
                  required
                  placeholder="Choisir l'équipement dans l'arborescence..."
                />
              </div>

              <div>
                <label>Valeur relevée (Absolue) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  required
                  min={0}
                  value={cptValeur || ''}
                  onChange={e => setCptValeur(Number(e.target.value))}
                  placeholder="Ex: 8500"
                />
              </div>

              <div>
                <label>Unité d'acquisition <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={cptUnite}
                  onChange={e => setCptUnite(e.target.value)}
                  placeholder="Heures, Cycles, Kms..."
                />
              </div>

{canReleveCompteur && (
              <button
                type="submit"
                className="btn-primary w-full justify-center"
              >
                Valider Relevé
              </button>
              )}
            </form>
          </div>

          {/* Ledger historical counts */}
          <div className="card lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary-800 dark:text-primary-200 border-b pb-2 flex items-center gap-1.5">
              <Clock className="text-primary-400" size={18} />
              Historique des relevés d'exploitation
            </h3>

            <div className="overflow-x-auto">
              <table className="data-table w-full text-xs">
                <thead>
                  <tr>
                    <th>Date d'acquisition</th>
                    <th>Équipement</th>
                    <th>Valeur lue</th>
                    <th>Unité</th>
                    <th>État</th>
                  </tr>
                </thead>
                <tbody>
                  {compteurs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-primary-500">
                        Aucun relevé enregistré.
                      </td>
                    </tr>
                  ) : (
                    compteurs
                      .sort((a, b) => b.dateReleve.localeCompare(a.dateReleve))
                      .map(c => (
                        <tr key={c.id}>
                          <td>{new Date(c.dateReleve).toLocaleString('fr-FR')}</td>
                          <td className="font-bold">{c.equipementNom}</td>
                          <td className="font-mono font-bold text-accent-orange">{c.valeur.toLocaleString()}</td>
                          <td>{c.unite}</td>
                          <td>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                              <CheckCircle size={10} /> Validé
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CRUD GAMME FORM (FMP) */}
      <AnimatePresence>
        {showGammeForm && (
          <div className="modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content"
              style={{ maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <span onClick={() => setShowGammeForm(false)} className="close-modal">&times;</span>
              <h2 className="text-lg font-display font-bold text-primary-900 dark:text-white border-b pb-3 mb-4">
                {isEditing ? "Modifier la Fiche FMP" : "Créer une Gamme Opératoire (FMP)"}
              </h2>

              <form onSubmit={handleSubmitGamme} className="grid-form text-xs">
                <div>
                  <label>Équipement ciblé <span className="text-red-500">*</span></label>
                  <EquipmentTreeSelect
                    equipements={equipements}
                    selectedId={formEqId}
                    onSelect={setFormEqId}
                    required
                    placeholder="Choisir l'équipement dans l'arborescence..."
                  />
                </div>

                <div>
                  <label>Titre de l'Opération <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formTitre}
                    onChange={e => setFormTitre(e.target.value)}
                    placeholder="Ex: Remplacement cartouche et vidange..."
                  />
                </div>

                <div>
                  <label>Déclencheur planifié <span className="text-red-500">*</span></label>
                  <select value={formTypeDecl} onChange={e => setFormTypeDecl(e.target.value as any)}>
                    <option value="Jours">Temps d'opération (Jours)</option>
                    <option value="Mois">Temps d'opération (Mois)</option>
                    <option value="Compteur">Valeur Compteur (Compteur Heures)</option>
                  </select>
                </div>

                <div>
                  <label>Périodicité / Valeur seuil <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formValDecl}
                    onChange={e => setFormValeurDecl(Number(e.target.value))}
                    placeholder="Ex: 6 (mois)"
                  />
                </div>

                <div>
                  <label>Temps d'arrêt alloué prévu (Heures) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formMo}
                    onChange={e => setFormMo(Number(e.target.value))}
                    placeholder="Ex: 2.5"
                  />
                </div>

                <div>
                  <label>Date de dernière exécution <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={formDateRef}
                    onChange={e => setFormDateRef(e.target.value)}
                  />
                </div>

                {/* ALERT CONFIGURATION SECTION */}
                <div className="col-span-2 p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/40 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold flex items-center gap-2 cursor-pointer text-primary-800 dark:text-primary-200">
                      <input
                        type="checkbox"
                        checked={formAlerteActive}
                        onChange={e => setFormAlerteActive(e.target.checked)}
                        className="rounded border-primary-300 dark:border-primary-700 text-indigo-600 focus:ring-indigo-500 mr-1"
                      />
                      <Bell size={15} className="text-indigo-500" /> Activer les alertes préventives automatisées
                    </label>
                  </div>
                  {formAlerteActive && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-indigo-100/50 dark:border-indigo-900/30 text-xs"
                    >
                      <div>
                        <label className="block mb-1 font-bold text-primary-600 dark:text-primary-400">Canal d'alerte :</label>
                        <select
                          value={formTypeAlerte}
                          onChange={e => setFormTypeAlerte(e.target.value as any)}
                          className="w-full bg-white dark:bg-primary-850 border border-primary-200 dark:border-primary-700 rounded-lg py-1 px-2 text-xs"
                        >
                          <option value="push">🔔 Notification Push (In-App)</option>
                          <option value="email">📧 Alerte Email</option>
                          <option value="sms">💬 Alerte SMS</option>
                          <option value="both">🔄 Email & Notification Push</option>
                          <option value="all">📱 Tous les canaux (Email, Push, SMS)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block mb-1 font-bold text-primary-600 dark:text-primary-400">
                          {formTypeAlerte === 'sms' ? 'Numéro de Mobile ou Destinataire :' : 'Destinataire de l\'alerte :'}
                        </label>
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            required={formAlerteActive && (formTypeAlerte === 'email' || formTypeAlerte === 'both' || formTypeAlerte === 'sms' || formTypeAlerte === 'all')}
                            value={formDestinataireAlerte}
                            onChange={e => setFormDestinataireAlerte(e.target.value)}
                            placeholder={formTypeAlerte === 'sms' ? "Ex: +33612345678" : "Ex: technique@entreprise.com"}
                            className="w-full bg-white dark:bg-primary-850 border border-primary-200 dark:border-primary-700 rounded-lg py-1 px-2 text-xs"
                          />
                          {(formTypeAlerte === 'sms' || formTypeAlerte === 'all') && utilisateurs.some(u => u.telephone) && (
                            <select
                              onChange={e => {
                                if (e.target.value) {
                                  setFormDestinataireAlerte(e.target.value);
                                }
                              }}
                              className="w-full bg-orange-50/50 dark:bg-primary-800 border border-orange-200 dark:border-primary-700 rounded-lg py-1 px-2 text-[11px]"
                              value={utilisateurs.find(u => u.telephone === formDestinataireAlerte)?.telephone || ''}
                            >
                              <option value="">-- Choisir le mobile d'un utilisateur --</option>
                              {utilisateurs
                                .filter(u => u.telephone)
                                .map(u => (
                                  <option key={u.id} value={u.telephone}>
                                    👤 {u.prenom} {u.nom} ({u.telephone})
                                  </option>
                                ))
                              }
                            </select>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block mb-1 font-bold text-primary-600 dark:text-primary-400">Délai d'alerte avant échéance :</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            required
                            value={formDelaiAlerteHeures}
                            onChange={e => setFormDelaiAlerteHeures(Number(e.target.value))}
                            className="w-20 bg-white dark:bg-primary-850 border border-primary-200 dark:border-primary-700 rounded-lg py-1 px-2 text-center text-xs"
                          />
                          <span className="text-primary-500 font-semibold text-[11px]">heures (Recommandé : 48h avant la date d'échéance)</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* FORGOTTEN MAINTENANCE PREVENTION CONFIGURATION */}
                <div className="col-span-2 p-4 bg-orange-50/20 dark:bg-orange-950/10 border border-orange-200/40 dark:border-orange-900/30 rounded-xl space-y-3" id="forgotten-maintenance-config">
                  <div className="flex items-center justify-between">
                    <label className="font-bold flex items-center gap-2 cursor-pointer text-primary-800 dark:text-primary-200">
                      <input
                        type="checkbox"
                        checked={formNotifierSiPasDeBt}
                        onChange={e => setFormNotifierSiPasDeBt(e.target.checked)}
                        className="rounded border-primary-300 dark:border-primary-700 text-orange-600 focus:ring-orange-500 mr-1"
                        id="formNotifierSiPasDeBt"
                      />
                      <ShieldAlert size={15} className="text-orange-500" /> Prévenir l'oubli de maintenance (Relance automatique)
                    </label>
                  </div>
                  <p className="text-[10px] text-primary-400">
                    Activez cette option pour recevoir une alerte automatique si aucun Bon de Travail (BT) n'a été planifié ou créé pour cette gamme préventive après une période de tolérance définie.
                  </p>
                  {formNotifierSiPasDeBt && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid grid-cols-1 gap-4 pt-2 border-t border-orange-100/50 dark:border-orange-900/30 text-xs"
                    >
                      <div>
                        <label className="block mb-1 font-bold text-primary-600 dark:text-primary-400" htmlFor="formToleranceJoursPasDeBt">Période de tolérance après échéance :</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            required={formNotifierSiPasDeBt}
                            id="formToleranceJoursPasDeBt"
                            value={formToleranceJoursPasDeBt}
                            onChange={e => setFormToleranceJoursPasDeBt(Number(e.target.value))}
                            className="w-20 bg-white dark:bg-primary-850 border border-primary-200 dark:border-primary-700 rounded-lg py-1 px-2 text-center text-xs"
                          />
                          <span className="text-primary-500 font-semibold text-[11px]">jours de dépassement tolérés avant le déclenchement de l'alerte</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* REQUIRED SKILLS FOR THE GAMME */}
                <div className="col-span-2 p-4 bg-amber-50/20 dark:bg-amber-950/10 border border-amber-200/40 dark:border-amber-900/30 rounded-xl space-y-3">
                  <label className="font-bold flex items-center gap-1.5 text-primary-800 dark:text-primary-200">
                    <Award size={15} className="text-amber-500 animate-pulse" />
                    <span>Compétences requises pour réaliser cette opération :</span>
                  </label>
                  <p className="text-[10px] text-primary-400">
                    Sélectionnez les compétences exigées pour cette gamme. Les techniciens possédant ces qualifications seront suggérés en priorité lors de la planification des Bons de Travail (BT) issus de cette fiche.
                  </p>
                  
                  {(!settings.competencesList || settings.competencesList.length === 0) ? (
                    <p className="text-[10px] text-primary-400 italic font-medium">
                      ⚠️ Aucune compétence définie dans la Configuration. Rendez-vous dans "Configuration &gt; Compétences" pour en créer.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {settings.competencesList.map(skill => {
                        const isSelected = formCompetencesRequises.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setFormCompetencesRequises(formCompetencesRequises.filter(s => s !== skill));
                              } else {
                                setFormCompetencesRequises([...formCompetencesRequises, skill]);
                              }
                            }}
                            className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition border flex items-center gap-1 ${
                              isSelected
                                ? "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-900/40 font-bold"
                                : "bg-white dark:bg-primary-800 text-primary-400 dark:text-primary-500 border-primary-200 dark:border-primary-700/60 hover:bg-primary-50 dark:hover:bg-primary-900/40"
                            }`}
                          >
                            <span>{skill}</span>
                            {isSelected && <Check size={11} className="stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="col-span-2 p-4 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-xl space-y-3">
                  <label className="font-bold flex items-center gap-1.5"><FileText size={14} className="text-accent-orange" /> Étapes de la gamme opératoire :</label>
                  <div className="space-y-2">
                    {formSteps.map((step, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <span className="font-mono text-xs font-bold text-primary-400 w-4">#{idx+1}</span>
                        <input
                          type="text"
                          required
                          value={step}
                          onChange={e => handleStepChange(e.target.value, idx)}
                          placeholder={`Décrire l'étape ${idx+1}...`}
                          className="flex-1 text-xs"
                        />
                        {formSteps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(idx)}
                            className="text-red-500 hover:text-red-700 font-bold px-2 py-1 text-xs"
                          >
                            Retirer
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="btn-secondary text-[10px] py-1 px-3 mt-1"
                  >
                    + Ajouter une étape opératoire
                  </button>
                </div>

                <div className="col-span-2 flex justify-end gap-3 mt-4 border-t pt-4">
                  <button type="button" onClick={() => setShowGammeForm(false)} className="btn-secondary">Annuler</button>
                  <button type="submit" className="btn-primary">Enregistrer la FMP</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
export { KEYS } from '../data';
