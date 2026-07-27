/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Columns,
  Search,
  Eye,
  Trash2,
  FileSpreadsheet,
  FileDown,
  MessageSquare,
  Lock,
  Unlock,
  CheckSquare,
  Send,
  User,
  AlertCircle,
  Activity,
  Plus,
  Compass,
  Paperclip,
  Check,
  CheckCircle,
  Printer,
  Award,
  Play,
  Lightbulb,
  X,
  Camera,
  Upload
} from 'lucide-react';
import { Intervention, Equipement, Piece, GlobalSettings, Commentaire, GammePreventive } from '../types';
import { SaisieVocale } from './SaisieVocale';
import { ModuleHelp } from './ModuleHelp';
import EquipmentTreeSelect from './EquipmentTreeSelect';
import { compressImage } from '../utils/imageCompressor';
import { hasPermission, PermissionsMatrix } from '../permissionsConfig';

interface InterventionsProps {
  currentRole: string;
  permissionsMatrix: PermissionsMatrix;
  interventions: Intervention[];
  equipements: Equipement[];
  pieces: Piece[];
  settings: GlobalSettings;
  gammes?: GammePreventive[];
  onUpdateIntervention: (id: string, payload: Partial<Intervention>) => void;
  onAddIntervention: (payload: Omit<Intervention, 'id' | 'dateCreation'>) => void;
  userRole?: string;
  selectedIdFromDashboard: string | null;
  onClearNavigationId: () => void;
  initialFilter?: string | null;
  onClearFilter?: () => void;
}

export default function Interventions({
  currentRole,
  permissionsMatrix,
  interventions,
  equipements,
  pieces,
  settings,
  gammes,
  onUpdateIntervention,
  onAddIntervention,
  userRole,
  selectedIdFromDashboard,
  onClearNavigationId,
  initialFilter,
  onClearFilter
}: InterventionsProps) {
  const canCreerBon = hasPermission(permissionsMatrix, currentRole, 'interventions', 'creer');
  const canTraiterBon = hasPermission(permissionsMatrix, currentRole, 'interventions', 'traiter');
  const canApprouverDI = hasPermission(permissionsMatrix, currentRole, 'interventions', 'approuver');
  const canReouvrirBon = hasPermission(permissionsMatrix, currentRole, 'interventions', 'reouvrir');
  const canCommenter = hasPermission(permissionsMatrix, currentRole, 'interventions', 'commenter');
  const [activeTab, setActiveTab] = useState<'kanban' | 'listes'>('kanban');
  const [viewMode, setViewMode] = useState<'standard' | 'swimlane' | 'workflow'>('standard');
  const [selectedIntId, setSelectedInterventionId] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printInt, setPrintInt] = useState<Intervention | null>(null);

  // Search/Filters states
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAtelier, setFilterAtelier] = useState('');
  const [filterTech, setFilterTech] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterCodeDefaut, setFilterCodeDefaut] = useState('');
  const [troubleShootCode, setTroubleShootCode] = useState('');

  // Spontaneous BT states
  const [showSpontaneousModal, setShowSpontaneousModal] = useState(false);
  const [btsEqId, setBtsEqId] = useState('');
  const [btsDemandeur, setBtsDemandeur] = useState('');
  const [btsUrgence, setBtsUrgence] = useState('');
  const [btsEffet, setBtsEffet] = useState('');
  const [btsDescription, setBtsDescription] = useState('');
  const [btsStatut, setBtsStatut] = useState<'Brouillon' | 'En cours'>('En cours');
  const [btsCodeDefaut, setBtsCodeDefaut] = useState('');

  // Editing codeDefaut state in modal
  const [isEditingCodeDefaut, setIsEditingCodeDefaut] = useState(false);
  const [tempCodeDefaut, setTempCodeDefaut] = useState('');

  const getRequiredSkillsForBT = (bt: Intervention): string[] => {
    let skills: string[] = [];
    
    // 1. Check matching preventative range (Gamme)
    if (bt.gammeId && gammes) {
      const matchingGamme = gammes.find(g => g.id === bt.gammeId);
      if (matchingGamme && matchingGamme.competencesRequises) {
        skills = [...matchingGamme.competencesRequises];
      }
    }
    
    // 2. Also detect keywords from description / typeProbleme / equipementNom
    const globalSkills = settings.competencesList || [];
    const searchStr = `${bt.description || ''} ${bt.typeProbleme || ''} ${bt.equipementNom || ''}`.toLowerCase();
    globalSkills.forEach(skill => {
      if (searchStr.includes(skill.toLowerCase()) && !skills.includes(skill)) {
        skills.push(skill);
      }
    });
    
    return skills;
  };

  // Treatment form states
  const [crActivite, setCrActivite] = useState('');
  const [crTechno, setCrTechno] = useState('');
  const [crCause, setCrCause] = useState('');
  const [crRemede, setCrRemede] = useState('');
  const [crOperateur, setCrOperateur] = useState('');
  const [crImputation, setCrImputation] = useState('');
  const [crText, setCrText] = useState('');
  const [crMo, setCrMo] = useState('');
  const [crArret, setCrArret] = useState('');
  const [crStatut, setCrStatut] = useState<'En attente' | 'En cours' | 'En attente de pièce' | 'Soldé' | 'Brouillon' | 'En attente de validation'>('En cours');
  const [crPhoto, setCrPhoto] = useState<string | null>(null);

  // Part consumption states
  const [partSearch, setPartSearch] = useState('');
  const [partQty, setPartQte] = useState(1);
  const [selectedParts, setSelectedParts] = useState<{ id: string; nom: string; qte: number }[]>([]);

  // Chat/Comments state
  const [chatInput, setChatInput] = useState('');
  const [localComments, setLocalComments] = useState<Commentaire[]>([]);

  // Signature pad states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Restore autosaved intervention form states and spontaneous BT states on mount
  useEffect(() => {
    const activeIntId = localStorage.getItem('gmao_active_int_id');
    if (activeIntId && interventions.some(i => i.id === activeIntId)) {
      setSelectedInterventionId(activeIntId);
      // Let's populate the edit states for this active intervention
      const item = interventions.find(i => i.id === activeIntId);
      if (item) {
        setIsEditingCodeDefaut(false);
        setTempCodeDefaut(item.codeDefaut || '');
        
        // Check if there is a saved draft for this intervention
        const savedDraftStr = localStorage.getItem(`gmao_draft_int_${activeIntId}`);
        if (savedDraftStr) {
          try {
            const draft = JSON.parse(savedDraftStr);
            setCrActivite(draft.crActivite || '');
            setCrTechno(draft.crTechno || '');
            setCrCause(draft.crCause || '');
            setCrRemede(draft.crRemede || '');
            setCrOperateur(draft.crOperateur || '');
            setCrImputation(draft.crImputation || '');
            setCrText(draft.crText || '');
            setCrMo(draft.crMo || '');
            setCrArret(draft.crArret || '');
            setCrStatut(draft.crStatut || 'En cours');
            setCrPhoto(draft.crPhoto || null);
            setSelectedParts(draft.selectedParts || []);
          } catch (e) {
            console.error("Failed to parse intervention draft on mount", e);
          }
        }
      }
    }

    // Restore spontaneous BT draft if any
    const savedBtsDraftStr = localStorage.getItem('gmao_draft_bts');
    if (savedBtsDraftStr) {
      try {
        const draft = JSON.parse(savedBtsDraftStr);
        setBtsEqId(draft.btsEqId || '');
        setBtsDemandeur(draft.btsDemandeur || '');
        setBtsUrgence(draft.btsUrgence || '');
        setBtsEffet(draft.btsEffet || '');
        setBtsDescription(draft.btsDescription || '');
        setBtsStatut(draft.btsStatut || 'En cours');
        setBtsCodeDefaut(draft.btsCodeDefaut || '');
        if (draft.showSpontaneousModal) {
          setShowSpontaneousModal(true);
        }
      } catch (e) {
        console.error("Failed to parse spontaneous BT draft on mount", e);
      }
    }
  }, []);

  // Save active intervention draft to localStorage as fields change
  useEffect(() => {
    if (selectedIntId) {
      const draft = {
        crActivite,
        crTechno,
        crCause,
        crRemede,
        crOperateur,
        crImputation,
        crText,
        crMo,
        crArret,
        crStatut,
        crPhoto,
        selectedParts
      };
      localStorage.setItem(`gmao_draft_int_${selectedIntId}`, JSON.stringify(draft));
      localStorage.setItem('gmao_active_int_id', selectedIntId);
    } else {
      localStorage.removeItem('gmao_active_int_id');
    }
  }, [
    selectedIntId,
    crActivite,
    crTechno,
    crCause,
    crRemede,
    crOperateur,
    crImputation,
    crText,
    crMo,
    crArret,
    crStatut,
    crPhoto,
    selectedParts
  ]);

  // Save spontaneous BT draft to localStorage as fields change
  useEffect(() => {
    const draft = {
      btsEqId,
      btsDemandeur,
      btsUrgence,
      btsEffet,
      btsDescription,
      btsStatut,
      btsCodeDefaut,
      showSpontaneousModal
    };
    localStorage.setItem('gmao_draft_bts', JSON.stringify(draft));
  }, [
    btsEqId,
    btsDemandeur,
    btsUrgence,
    btsEffet,
    btsDescription,
    btsStatut,
    btsCodeDefaut,
    showSpontaneousModal
  ]);

  useEffect(() => {
    if (selectedIdFromDashboard) {
      openInterventionDetail(selectedIdFromDashboard);
      onClearNavigationId();
    }
  }, [selectedIdFromDashboard]);

  useEffect(() => {
    if (initialFilter) {
      if (initialFilter === 'attente') {
        setFilterStatut('attente');
        setFilterType('');
        setActiveTab('listes');
      } else if (initialFilter === 'Préventif') {
        setFilterType('Préventif');
        setFilterStatut('');
        setActiveTab('listes');
      }
      if (onClearFilter) {
        onClearFilter();
      }
    }
  }, [initialFilter, onClearFilter]);

  const selectedInt = interventions.find(i => i.id === selectedIntId);

  // Handle open modal
  const openInterventionDetail = (id: string) => {
    setSelectedInterventionId(id);
    const item = interventions.find(i => i.id === id);
    if (item) {
      setIsEditingCodeDefaut(false);
      setTempCodeDefaut(item.codeDefaut || '');

      const savedDraftStr = localStorage.getItem(`gmao_draft_int_${id}`);
      if (savedDraftStr) {
        try {
          const draft = JSON.parse(savedDraftStr);
          setCrActivite(draft.crActivite || '');
          setCrTechno(draft.crTechno || '');
          setCrCause(draft.crCause || '');
          setCrRemede(draft.crRemede || '');
          setCrOperateur(draft.crOperateur || '');
          setCrImputation(draft.crImputation || '');
          setCrText(draft.crText || '');
          setCrMo(draft.crMo || '');
          setCrArret(draft.crArret || '');
          setCrStatut(draft.crStatut || 'En cours');
          setCrPhoto(draft.crPhoto || null);
          setSelectedParts(draft.selectedParts || []);
        } catch (e) {
          console.error("Failed to parse draft on manual open", e);
        }
      } else {
        setCrActivite(item.activite || settings.listes.activites[0] || '');
        setCrTechno(item.technologie || settings.listes.technologies[0] || '');
        setCrCause(item.cause || settings.listes.causes[0] || '');
        setCrRemede(item.remede || settings.listes.remedes[0] || '');
        setCrOperateur(item.operateur || settings.listes.operateurs[0] || '');
        setCrImputation(item.imputation || settings.listes.imputations[0] || '');
        setCrText(item.compteRendu || '');
        setCrMo(item.tempsPasse?.replace(/[^\d.]/g, '') || '');
        setCrArret(item.tempsArret?.replace(/[^\d.]/g, '') || '');
        if (item.statut === 'Brouillon') {
          setCrStatut('Brouillon');
        } else if (item.statut === 'En attente de validation') {
          setCrStatut('En attente de validation');
        } else if (item.statut === 'Clôturé' || item.statut === 'Soldé' || item.statut === 'Terminé') {
          setCrStatut('Soldé');
        } else {
          setCrStatut(item.statut as any || 'En cours');
        }
        setCrPhoto(item.photoUrl || null);
        setSelectedParts([]);
      }
      setPartSearch('');

      // Load simulated comments
      const savedComments = localStorage.getItem(`comments_${id}`);
      if (savedComments) {
        setLocalComments(JSON.parse(savedComments));
      } else {
        const dummyComments: Commentaire[] = [
          {
            id: 'c1',
            texte: "Signalement reçu en production. Ligne ralentie.",
            auteur: "Responsable Prod",
            timestamp: new Date(new Date(item.dateCreation).getTime() + 600000).toISOString()
          }
        ];
        localStorage.setItem(`comments_${id}`, JSON.stringify(dummyComments));
        setLocalComments(dummyComments);
      }
    }
  };

  const isClosed = (stat: string) => {
    return stat === 'Soldé' || stat === 'Clôturé' || stat === 'terminé' || stat === 'Terminé';
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const item = interventions.find(i => i.id === id);
    if (!item) return;

    if (targetCol === 'bt' && item.typeDoc === 'DI') {
      // Approve DI -> convert to BT
      const numBT = `BT-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      onUpdateIntervention(id, {
        typeDoc: 'BT',
        statut: 'En cours',
        numero: numBT
      });
    } else if (targetCol === 'soldes' && !isClosed(item.statut)) {
      openInterventionDetail(id);
    } else if (targetCol === 'wf-brouillon') {
      onUpdateIntervention(id, { statut: 'Brouillon' });
    } else if (targetCol === 'wf-encours') {
      onUpdateIntervention(id, { statut: 'En cours' });
    } else if (targetCol === 'wf-validation') {
      onUpdateIntervention(id, { statut: 'En attente de validation' });
    } else if (targetCol === 'wf-termine' && !isClosed(item.statut)) {
      openInterventionDetail(id);
    }
  };

  // Filter application
  const getFilteredInterventions = () => {
    return interventions.filter(m => {
      if (filterType && m.typeDoc !== filterType) return false;
      if (filterAtelier && m.atelier !== filterAtelier) return false;
      if (filterTech && m.operateur !== filterTech && m.technicienCloture !== filterTech) return false;
      if (filterCodeDefaut && (!m.codeDefaut || !m.codeDefaut.toUpperCase().includes(filterCodeDefaut.toUpperCase()))) return false;

      const dateStr = m.dateCloture || m.dateCreation;
      const refDate = new Date(dateStr).toISOString().split('T')[0];
      if (filterStart && refDate < filterStart) return false;
      if (filterEnd && refDate > filterEnd) return false;

      const closed = m.statut === 'Soldé' || m.statut === 'Clôturé' || m.statut === 'Terminé';
      if (filterStatut === 'attente' && closed) return false;
      if (filterStatut === 'clos' && !closed) return false;
      if (filterStatut === 'brouillon' && m.statut !== 'Brouillon') return false;
      if (filterStatut === 'validation' && m.statut !== 'En attente de validation') return false;
      if (filterStatut === 'encours' && m.statut !== 'En cours' && m.statut !== 'En attente de pièce') return false;

      return true;
    });
  };

  const filtered = getFilteredInterventions();
  const DIs = filtered.filter(m => m.typeDoc === 'DI' && !isClosed(m.statut));
  const BTs = filtered.filter(m => m.typeDoc === 'BT' && !isClosed(m.statut));
  const PREVs = filtered.filter(m => m.typeDoc === 'Préventif' && !isClosed(m.statut));
  const SOLDES = filtered.filter(m => isClosed(m.statut));

  const wfBrouillons = filtered.filter(m => m.typeDoc !== 'DI' && m.statut === 'Brouillon');
  const wfEnCours = filtered.filter(m => m.typeDoc !== 'DI' && (m.statut === 'En cours' || m.statut === 'En attente de pièce' || m.statut === 'En attente' || !m.statut));
  const wfAValider = filtered.filter(m => m.typeDoc !== 'DI' && m.statut === 'En attente de validation');
  const wfTermines = filtered.filter(m => m.typeDoc !== 'DI' && isClosed(m.statut));

  // Technicians map for Swimlanes
  const getTechniciansMap = () => {
    const map: Record<string, { di: Intervention[]; bt: Intervention[]; prev: Intervention[] }> = {};
    settings.listes.operateurs.forEach(tech => {
      map[tech] = { di: [], bt: [], prev: [] };
    });
    map['Non assigné'] = { di: [], bt: [], prev: [] };

    interventions.forEach(int => {
      if (isClosed(int.statut)) return;
      const assigned = int.operateur || int.technicienCloture || 'Non assigné';
      const targetTech = map[assigned] ? assigned : 'Non assigné';

      if (int.typeDoc === 'DI') map[targetTech].di.push(int);
      else if (int.typeDoc === 'Préventif') map[targetTech].prev.push(int);
      else map[targetTech].bt.push(int);
    });

    return Object.entries(map).filter(([_, data]) => data.di.length + data.bt.length + data.prev.length > 0);
  };

  const swimlanes = getTechniciansMap();

  // Spontaneous submit
  const handleCreateSpontaneous = (e: React.FormEvent) => {
    e.preventDefault();
    const eq = equipements.find(eq => eq.id === btsEqId);
    if (!eq) return;

    const numBT = `BT-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    onAddIntervention({
      typeDoc: 'BT',
      numero: numBT,
      equipementId: btsEqId,
      equipementNom: eq.nom,
      atelier: eq.atelier,
      urgence: btsUrgence,
      typeProbleme: btsEffet,
      demandeur: btsDemandeur,
      description: btsDescription,
      statut: btsStatut,
      source: 'BT Flash (Bureau)',
      codeDefaut: btsCodeDefaut.trim() || undefined
    });

    setShowSpontaneousModal(false);
    setBtsEqId('');
    setBtsDemandeur('');
    setBtsUrgence('');
    setBtsEffet('');
    setBtsDescription('');
    setBtsStatut('En cours');
    setBtsCodeDefaut('');
    localStorage.removeItem('gmao_draft_bts');
  };

  // Convert DI to BT
  const handleApproveDI = () => {
    if (!selectedInt) return;
    const numBT = `BT-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    onUpdateIntervention(selectedInt.id, {
      typeDoc: 'BT',
      statut: 'En cours',
      numero: numBT
    });
    setSelectedInterventionId(null);
  };

  // Add Comment/Chat
  const handleSendComment = () => {
    if (!chatInput.trim() || !selectedIntId) return;
    const newComm: Commentaire = {
      id: `C-${Date.now()}`,
      texte: chatInput,
      auteur: "Jean Dupont (Admin)",
      timestamp: new Date().toISOString()
    };
    const updated = [...localComments, newComm];
    setLocalComments(updated);
    localStorage.setItem(`comments_${selectedIntId}`, JSON.stringify(updated));
    setChatInput('');
  };

  // Reopen closed BT (bris de cadenas)
  const handleReopenIntervention = () => {
    if (!selectedInt) return;
    if (confirm("⚠️ Souhaitez-vous réouvrir ce Bon de Travail ? Le stock consommé ne sera pas automatiquement ré-injecté.")) {
      onUpdateIntervention(selectedInt.id, {
        statut: 'En cours',
        dateCloture: undefined
      });
      setSelectedInterventionId(null);
    }
  };

  // Treatment form saving
  const handleSaveTreatment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInt) return;

    const finalState = crStatut;
    const isFin = finalState === 'Soldé';

    let signatureData: string | undefined = undefined;
    if (isFin && canvasRef.current) {
      signatureData = canvasRef.current.toDataURL('image/png');
    }

    const payload: Partial<Intervention> = {
      activite: crActivite,
      technologie: crTechno,
      cause: crCause,
      remede: crRemede,
      operateur: crOperateur,
      imputation: crImputation,
      compteRendu: crText,
      statut: finalState === 'Soldé' ? 'Soldé' : crStatut,
      tempsPasse: `${crMo} H`,
      tempsArret: crArret ? `${crArret} H` : '0 H',
      technicienCloture: crOperateur,
      photoUrl: crPhoto || undefined
    };

    if (signatureData) payload.signatureTechnicien = signatureData;
    if (isFin) payload.dateCloture = new Date().toISOString();

    // Consume stock locally if parts are selected
    if (selectedParts.length > 0) {
      selectedParts.forEach(sel => {
        const piece = pieces.find(p => p.id === sel.id);
        if (piece) {
          piece.quantite = Math.max(piece.quantite - sel.qte, 0);
          localStorage.setItem('gmao_pieces', JSON.stringify(pieces));
        }
      });
      payload.piecesConso = selectedParts.map(s => `${s.nom} x${s.qte}`).join(', ');
    }

    onUpdateIntervention(selectedInt.id, payload);
    localStorage.removeItem(`gmao_draft_int_${selectedInt.id}`);
    localStorage.removeItem('gmao_active_int_id');
    setSelectedInterventionId(null);
  };

  // Signature canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.target.offsetHeight * (e.nativeEvent.offsetY / e.target.offsetHeight));
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // File download mock (Excel/PDF)
  const mockExport = (format: 'xls' | 'pdf', dataset: string) => {
    alert(`📥 Génération du rapport de l'ensemble "${dataset}" au format ${format.toUpperCase()} terminée avec succès ! Le téléchargement va démarrer.`);
  };

  // Render Kanban Card helper
  const renderKanbanCard = (item: Intervention, color: string) => {
    const isCrit = item.urgence && item.urgence.toLowerCase().includes('arrêt');
    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, item.id)}
        onClick={() => openInterventionDetail(item.id)}
        className="kanban-card border-l-4"
        style={{ borderLeftColor: color }}
      >
        <div className="flex justify-between items-center text-[10px] text-primary-400 font-mono mb-2">
          <span>{item.numero || 'DI'}</span>
          <div className="flex items-center gap-1.5">
            {item.statut === 'Brouillon' && (
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 dark:bg-slate-900/60 dark:text-slate-300 text-[8px] font-extrabold border border-slate-200 dark:border-slate-800 uppercase tracking-wider">Brouillon</span>
            )}
            {item.statut === 'En attente de validation' && (
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 text-[8px] font-extrabold border border-amber-200 dark:border-amber-800 uppercase tracking-wider animate-pulse">A Valider</span>
            )}
            <span>{new Date(item.dateCreation).toLocaleDateString('fr-FR')}</span>
          </div>
        </div>
        <h4 className="text-xs font-bold text-primary-900 dark:text-white truncate">
          {item.equipementNom}
        </h4>
        <p className="text-[11px] text-primary-500 dark:text-primary-400 mt-1 line-clamp-2">
          {item.effet || item.typeProbleme || item.description}
        </p>
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-primary-100 dark:border-primary-800">
          <span className="text-[10px] font-semibold text-primary-400">
            {item.demandeur.split(' ')[0]}
          </span>
          {isCrit && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
              ARRÊT
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER ACTION BAR */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary-900 dark:text-white flex items-center">
            Bons de Travaux & Kanban
            <ModuleHelp moduleId="interventions" />
          </h1>
          <p className="text-sm text-primary-500 dark:text-primary-400 mt-1">
            Gérez le flux de vos interventions correctives et préventives en temps réel.
          </p>
        </div>
{canCreerBon && (
        <button
          onClick={() => {
            setCrOperateur("Pierre Martin (Tech)");
            setShowSpontaneousModal(true);
          }}
          className="btn-primary flex items-center gap-1.5"
          style={{ backgroundColor: '#10B981' }}
        >
          <Plus size={16} />
          B.T Flash
        </button>
        )}
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-4 border-b border-primary-200 dark:border-primary-700">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`px-4 py-2 font-display text-sm font-bold border-b-2 transition ${activeTab === 'kanban' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-400 hover:text-primary-600'}`}
        >
          Tableau Kanban (Dnd)
        </button>
        <button
          onClick={() => setActiveTab('listes')}
          className={`px-4 py-2 font-display text-sm font-bold border-b-2 transition ${activeTab === 'listes' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-400 hover:text-primary-600'}`}
        >
          Moteur de Recherche & Archives
        </button>
      </div>

      {/* SUPER FILTERS DRAWER (For Listes or advanced sorting) */}
      {activeTab === 'listes' && (
        <div className="card bg-primary-50 dark:bg-primary-900 grid grid-cols-2 md:grid-cols-7 gap-4 p-4 items-end">
          <div>
            <label className="text-[10px] uppercase font-bold text-primary-500">Du</label>
            <input
              type="date"
              value={filterStart}
              onChange={e => setFilterStart(e.target.value)}
              className="bg-white dark:bg-primary-800 text-xs p-2"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-primary-500">Au</label>
            <input
              type="date"
              value={filterEnd}
              onChange={e => setFilterEnd(e.target.value)}
              className="bg-white dark:bg-primary-800 text-xs p-2"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-primary-500">Type</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-white dark:bg-primary-800 text-xs p-2"
            >
              <option value="">Tous</option>
              <option value="BT">BT</option>
              <option value="DI">DI</option>
              <option value="Préventif">Préventif</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-primary-500">Atelier</label>
            <select value={filterAtelier} onChange={e => setFilterAtelier(e.target.value)} className="p-2">
              <option value="">Tous</option>
              {[...settings.listes.ateliers].sort((a, b) => a.localeCompare(b)).map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-primary-500 uppercase">Technicien</label>
            <select value={filterTech} onChange={e => setFilterTech(e.target.value)} className="p-2">
              <option value="">Tous</option>
              {[...settings.listes.operateurs].sort((a, b) => a.localeCompare(b)).map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-primary-500 uppercase">Statut</label>
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className="p-2 bg-white dark:bg-primary-800 text-xs">
              <option value="">Tous les statuts</option>
              <option value="attente">Actifs uniquement (Tout sauf Clôturé)</option>
              <option value="brouillon">Brouillons uniquement</option>
              <option value="clos">Clôturés / Terminés uniquement</option>
              <option value="validation">En attente de validation</option>
              <option value="encours">En cours / Att. pièce</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-primary-500 uppercase">Code défaut</label>
            <input
              type="text"
              placeholder="Ex: E102..."
              value={filterCodeDefaut}
              onChange={e => setFilterCodeDefaut(e.target.value)}
              className="bg-white dark:bg-primary-800 text-xs p-2 rounded w-full border border-primary-200 dark:border-primary-700 text-primary-950 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* KANBAN BOARD WRAPPER */}
      {activeTab === 'kanban' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <select
              value={viewMode}
              onChange={e => setViewMode(e.target.value as 'standard' | 'swimlane' | 'workflow')}
              className="p-2 border border-primary-200 bg-white dark:bg-primary-800 text-xs font-semibold rounded-lg text-primary-800 dark:text-white"
            >
              <option value="standard">Vue Globale (Standard)</option>
              <option value="swimlane">Vue par Technicien (Swimlane)</option>
              <option value="workflow">Workflow de Validation (Brouillon ➔ validation ➔ Terminé)</option>
            </select>
          </div>

          {viewMode === 'standard' ? (
            <div className="kanban-board">
              {/* DI COLUMN */}
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'di')}
                className="card flex-1 min-w-[240px] bg-primary-100/50 dark:bg-primary-950 p-4 rounded-xl flex flex-col h-fit min-h-[180px] max-h-[550px]"
              >
                <h3 className="text-sm font-bold text-red-600 flex items-center justify-between border-b pb-2 mb-4 border-red-200">
                  <span className="flex items-center gap-2"><AlertCircle size={16} /> Demandes (DI)</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">{DIs.length}</span>
                </h3>
                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {DIs.map(item => renderKanbanCard(item, '#EF4444'))}
                </div>
              </div>

              {/* BT COLUMN */}
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'bt')}
                className="card flex-1 min-w-[240px] bg-primary-100/50 dark:bg-primary-950 p-4 rounded-xl flex flex-col h-fit min-h-[180px] max-h-[550px]"
              >
                <h3 className="text-sm font-bold text-sky-600 flex items-center justify-between border-b pb-2 mb-4 border-sky-200">
                  <span className="flex items-center gap-2"><Activity size={16} /> En Cours (BT)</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-sky-100 text-sky-800">{BTs.length}</span>
                </h3>
                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {BTs.map(item => renderKanbanCard(item, '#3B82F6'))}
                </div>
              </div>

              {/* PREVENTIVES COLUMN */}
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'prev')}
                className="card flex-1 min-w-[240px] bg-primary-100/50 dark:bg-primary-950 p-4 rounded-xl flex flex-col h-fit min-h-[180px] max-h-[550px]"
              >
                <h3 className="text-sm font-bold text-indigo-600 flex items-center justify-between border-b pb-2 mb-4 border-indigo-200">
                  <span className="flex items-center gap-2"><CheckSquare size={16} /> Préventifs</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-800">{PREVs.length}</span>
                </h3>
                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {PREVs.map(item => renderKanbanCard(item, '#8B5CF6'))}
                </div>
              </div>

              {/* SOLDES COLUMN */}
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'soldes')}
                className="card flex-1 min-w-[240px] bg-primary-100/50 dark:bg-primary-950 p-4 rounded-xl flex flex-col h-fit min-h-[180px] max-h-[550px]"
              >
                <h3 className="text-sm font-bold text-emerald-600 flex items-center justify-between border-b pb-2 mb-4 border-emerald-200">
                  <span className="flex items-center gap-2"><Check size={16} /> Clôturés (Soldé)</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800">{SOLDES.length}</span>
                </h3>
                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {SOLDES.slice(0, 12).map(item => renderKanbanCard(item, '#10B981'))}
                </div>
              </div>
            </div>
          ) : viewMode === 'workflow' ? (
            <div className="kanban-board">
              {/* WF BROUILLON COLUMN */}
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'wf-brouillon')}
                className="card flex-1 min-w-[240px] bg-primary-100/50 dark:bg-primary-950 p-4 rounded-xl flex flex-col h-fit min-h-[180px] max-h-[550px]"
                style={{ borderTop: '4px solid #64748B' }}
              >
                <h3 className="text-sm font-bold text-slate-500 flex items-center justify-between border-b pb-2 mb-4 border-slate-200">
                  <span className="flex items-center gap-2"><Lock size={16} /> 1. Brouillons</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">{wfBrouillons.length}</span>
                </h3>
                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {wfBrouillons.map(item => renderKanbanCard(item, '#64748B'))}
                </div>
              </div>

              {/* WF EN COURS COLUMN */}
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'wf-encours')}
                className="card flex-1 min-w-[240px] bg-primary-100/50 dark:bg-primary-950 p-4 rounded-xl flex flex-col h-fit min-h-[180px] max-h-[550px]"
                style={{ borderTop: '4px solid #3B82F6' }}
              >
                <h3 className="text-sm font-bold text-sky-600 flex items-center justify-between border-b pb-2 mb-4 border-sky-200">
                  <span className="flex items-center gap-2"><Activity size={16} /> 2. En cours / Attente</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200">{wfEnCours.length}</span>
                </h3>
                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {wfEnCours.map(item => renderKanbanCard(item, '#3B82F6'))}
                </div>
              </div>

              {/* WF ATTENTE VALIDATION COLUMN */}
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'wf-validation')}
                className="card flex-1 min-w-[240px] bg-primary-100/50 dark:bg-primary-950 p-4 rounded-xl flex flex-col h-fit min-h-[180px] max-h-[550px]"
                style={{ borderTop: '4px solid #F59E0B' }}
              >
                <h3 className="text-sm font-bold text-amber-600 flex items-center justify-between border-b pb-2 mb-4 border-amber-200 animate-pulse">
                  <span className="flex items-center gap-2"><CheckSquare size={16} /> 3. A Valider</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">{wfAValider.length}</span>
                </h3>
                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {wfAValider.map(item => renderKanbanCard(item, '#F59E0B'))}
                </div>
              </div>

              {/* WF TERMINE COLUMN */}
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'wf-termine')}
                className="card flex-1 min-w-[240px] bg-primary-100/50 dark:bg-primary-950 p-4 rounded-xl flex flex-col h-fit min-h-[180px] max-h-[550px]"
                style={{ borderTop: '4px solid #10B981' }}
              >
                <h3 className="text-sm font-bold text-emerald-600 flex items-center justify-between border-b pb-2 mb-4 border-emerald-200">
                  <span className="flex items-center gap-2"><CheckCircle size={16} /> 4. Terminés</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">{wfTermines.length}</span>
                </h3>
                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {wfTermines.map(item => renderKanbanCard(item, '#10B981'))}
                </div>
              </div>
            </div>
          ) : (
            // Swimlanes Render
            <div className="space-y-6">
              {swimlanes.map(([tech, data], idx) => {
                return (
                  <div key={idx} className="swimlane-row">
                    <div className="swimlane-tech-header">
                      <User className="text-primary-400" size={32} />
                      <span className="text-xs font-bold text-primary-800 dark:text-white mt-1 text-center truncate w-full">
                        {tech}
                      </span>
                    </div>
                    <div className="swimlane-cols">
                      <div className="kanban-column" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'di')}>
                        <div className="space-y-2">
                          {data.di.map(item => renderKanbanCard(item, '#EF4444'))}
                        </div>
                      </div>
                      <div className="kanban-column" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'bt')}>
                        <div className="space-y-2">
                          {data.bt.map(item => renderKanbanCard(item, '#3B82F6'))}
                        </div>
                      </div>
                      <div className="kanban-column" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'prev')}>
                        <div className="space-y-2">
                          {data.prev.map(item => renderKanbanCard(item, '#8B5CF6'))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // LISTES TABLE ROWS
        <div className="space-y-6">
          {/* ASSISTANCE DEPANNAGE PAR CODE ERREUR */}
          <div className="card bg-gradient-to-r from-red-500/10 via-amber-500/10 to-primary-500/10 border border-red-200 dark:border-red-900/30 p-5 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-950/40 rounded-xl text-red-600 dark:text-red-400">
                <Lightbulb size={24} className="animate-pulse" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-sm font-bold text-primary-900 dark:text-white flex items-center gap-1.5 font-display">
                  💡 Module d'Aide au Dépannage par Code Erreur / Code Défaut
                </h3>
                <p className="text-xs text-primary-500">
                  Recherchez un code défaut (ex: <code className="font-mono bg-white dark:bg-primary-850 px-1 py-0.5 rounded text-red-600 font-bold">E102</code>, <code className="font-mono bg-white dark:bg-primary-850 px-1 py-0.5 rounded text-red-600 font-bold">ERR_04</code>) pour consulter l'historique des pannes similaires, les causes réelles identifiées et les remèdes appliqués par vos techniciens.
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-3 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-primary-400" size={16} />
                <input
                  type="text"
                  placeholder="Saisissez un code défaut (ex: E102)..."
                  value={troubleShootCode}
                  onChange={e => setTroubleShootCode(e.target.value.toUpperCase())}
                  className="pl-9 pr-4 py-2 text-xs w-full bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 text-primary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/40"
                />
              </div>
              {troubleShootCode && (
                <button
                  onClick={() => setTroubleShootCode('')}
                  className="btn-secondary text-xs px-3"
                >
                  Effacer
                </button>
              )}
            </div>

            {troubleShootCode.trim() && (() => {
              const matches = interventions.filter(int => 
                int.codeDefaut && 
                int.codeDefaut.toUpperCase().includes(troubleShootCode.toUpperCase())
              );

              if (matches.length === 0) {
                return (
                  <div className="mt-4 p-4 bg-white dark:bg-primary-850 rounded-xl border border-primary-100 dark:border-primary-800 text-center animate-fade-in">
                    <p className="text-xs text-primary-500 italic">
                      Aucun historique de panne trouvé pour le code défaut <span className="font-bold text-red-500">"{troubleShootCode}"</span>.
                    </p>
                  </div>
                );
              }

              return (
                <div className="mt-4 space-y-3 animate-fade-in">
                  <div className="text-[11px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                    {matches.length} intervention{matches.length > 1 ? 's' : ''} trouvée{matches.length > 1 ? 's' : ''} pour le code <span className="text-red-500 font-mono">"{troubleShootCode}"</span> :
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {matches.map(match => {
                      const isSolved = match.statut === 'Soldé' || match.statut === 'Clôturé' || match.statut === 'Terminé';
                      return (
                        <div 
                          key={match.id} 
                          className="bg-white dark:bg-primary-850 p-4 rounded-xl border border-primary-200 dark:border-primary-800 hover:shadow-md transition cursor-pointer"
                          onClick={() => openInterventionDetail(match.id)}
                        >
                          <div className="flex justify-between items-start mb-2 border-b border-primary-100 dark:border-primary-800 pb-2">
                            <div>
                              <span className="text-[10px] font-bold text-red-600 font-mono uppercase bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded border border-red-200 dark:border-red-900/50 mr-2">
                                {match.codeDefaut}
                              </span>
                              <span className="text-xs font-bold text-primary-900 dark:text-white">
                                {match.equipementNom}
                              </span>
                            </div>
                            <span className="text-[10px] text-primary-400">
                              {new Date(match.dateCreation).toLocaleDateString('fr-FR')}
                            </span>
                          </div>

                          <div className="space-y-2 text-xs text-primary-800 dark:text-primary-200">
                            <p className="text-primary-500 italic">
                              <strong>Description :</strong> "{match.description}"
                            </p>
                            
                            {isSolved ? (
                              <div className="bg-emerald-500/5 border border-emerald-100 dark:border-emerald-950 p-2.5 rounded-lg space-y-1 text-[11px]">
                                <p className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                  ✅ Solution appliquée :
                                </p>
                                <p><strong className="text-primary-600 dark:text-primary-400">Cause :</strong> {match.cause || 'Non spécifié'}</p>
                                <p><strong className="text-primary-600 dark:text-primary-400">Remède :</strong> {match.remede || 'Non spécifié'}</p>
                                <p><strong className="text-primary-600 dark:text-primary-400">Rapport :</strong> {match.compteRendu || 'Non spécifié'}</p>
                              </div>
                            ) : (
                              <div className="bg-amber-500/5 border border-amber-100 dark:border-amber-950 p-2.5 rounded-lg text-[11px] text-amber-700 dark:text-amber-400 font-bold italic">
                                ⏳ Intervention en cours (résolution non renseignée)...
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Active DIs Table */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-red-600"><AlertCircle className="inline mr-1" size={16} /> DI en attente d'approbation</h3>
              <button onClick={() => mockExport('xls', 'Demandes en attente')} className="btn-secondary text-xs flex items-center gap-1 py-1"><FileSpreadsheet size={12} /> Excel</button>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Équipement</th>
                    <th>Symptôme</th>
                    <th>Demandeur</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {DIs.map(di => (
                    <tr
                      key={di.id}
                      onClick={() => openInterventionDetail(di.id)}
                      className="cursor-pointer hover:bg-primary-100/80 dark:hover:bg-primary-800/80 hover:shadow-xs transition duration-150 active:scale-[0.995]"
                      title="Cliquez pour consulter cette demande d'intervention"
                    >
                      <td>{new Date(di.dateCreation).toLocaleDateString('fr-FR')}</td>
                      <td className="font-bold">
                        {di.equipementNom}
                        {di.codeDefaut && (
                          <span className="ml-2 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase rounded bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300">
                            {di.codeDefaut}
                          </span>
                        )}
                      </td>
                      <td>{di.effet || di.typeProbleme}</td>
                      <td>{di.demandeur}</td>
                      <td className="text-right flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openInterventionDetail(di.id);
                          }}
                          className="btn-icon bg-primary-100 hover:bg-red-500 hover:text-white rounded-lg"
                          title="Consulter"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrintInt(di);
                            setShowPrintPreview(true);
                          }}
                          className="btn-icon bg-primary-50 text-primary-600 hover:bg-primary-500 hover:text-white rounded-lg"
                          title="Imprimer / PDF"
                        >
                          <Printer size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active BTs */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-sky-600"><Activity className="inline mr-1" size={16} /> Bons de Travail en Cours</h3>
              <button onClick={() => mockExport('xls', 'Bons en cours')} className="btn-secondary text-xs flex items-center gap-1 py-1"><FileSpreadsheet size={12} /> Excel</button>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>BT Référence</th>
                    <th>Équipement</th>
                    <th>Description</th>
                    <th>Statut</th>
                    <th className="text-right">Traitement</th>
                  </tr>
                </thead>
                <tbody>
                  {BTs.map(bt => (
                    <tr
                      key={bt.id}
                      onClick={() => openInterventionDetail(bt.id)}
                      className="cursor-pointer hover:bg-primary-100/80 dark:hover:bg-primary-800/80 hover:shadow-xs transition duration-150 active:scale-[0.995]"
                      title="Cliquez pour traiter ou consulter ce bon de travail"
                    >
                      <td className="font-mono text-xs font-bold text-sky-600">{bt.numero}</td>
                      <td className="font-bold">
                        {bt.equipementNom}
                        {bt.codeDefaut && (
                          <span className="ml-2 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase rounded bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300">
                            {bt.codeDefaut}
                          </span>
                        )}
                      </td>
                      <td className="max-w-xs truncate">{bt.description}</td>
                      <td>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {bt.statut}
                        </span>
                      </td>
                      <td className="text-right flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openInterventionDetail(bt.id);
                          }}
                          className="btn-icon bg-sky-100 text-sky-700 hover:bg-sky-500 hover:text-white rounded-lg"
                          title="Traiter"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrintInt(bt);
                            setShowPrintPreview(true);
                          }}
                          className="btn-icon bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white rounded-lg"
                          title="Imprimer / PDF"
                        >
                          <Printer size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Past Archives */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-emerald-600"><Check className="inline mr-1" size={16} /> Archives Clôturées</h3>
              <button onClick={() => mockExport('xls', 'Archives Clôturées')} className="btn-secondary text-xs flex items-center gap-1 py-1"><FileSpreadsheet size={12} /> Excel</button>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table w-full text-xs">
                <thead>
                  <tr>
                    <th>Clôturé le</th>
                    <th>BT Référence</th>
                    <th>Équipement</th>
                    <th>Type</th>
                    <th>Action Clôture</th>
                    <th>Intervenant</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {SOLDES.slice(0, 30).map(sol => (
                    <tr
                      key={sol.id}
                      onClick={() => openInterventionDetail(sol.id)}
                      className="cursor-pointer hover:bg-primary-100/80 dark:hover:bg-primary-800/80 hover:shadow-xs transition duration-150 active:scale-[0.995]"
                      title="Cliquez pour consulter cette archive d'intervention"
                    >
                      <td>{sol.dateCloture ? new Date(sol.dateCloture).toLocaleDateString('fr-FR') : '-'}</td>
                      <td className="font-mono text-emerald-600 font-bold">{sol.numero}</td>
                      <td className="font-bold">
                        {sol.equipementNom}
                        {sol.codeDefaut && (
                          <span className="ml-2 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase rounded bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300">
                            {sol.codeDefaut}
                          </span>
                        )}
                      </td>
                      <td>{sol.typeDoc}</td>
                      <td>{sol.remede || sol.compteRendu?.substring(0, 30)}</td>
                      <td>{sol.technicienCloture}</td>
                      <td className="text-right flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openInterventionDetail(sol.id);
                          }}
                          className="btn-icon bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white rounded-lg"
                          title="Consulter"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrintInt(sol);
                            setShowPrintPreview(true);
                          }}
                          className="btn-icon bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg"
                          title="Imprimer / PDF"
                        >
                          <Printer size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TREATMENT REPORT AND VALIDATION MODAL */}
      <AnimatePresence>
        {selectedInt && (
          <div className="modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content"
              style={{ maxWidth: '900px', width: '95%' }}
            >
              <span onClick={() => setSelectedInterventionId(null)} className="close-modal">&times;</span>
              <div className="flex justify-between items-center border-b border-primary-200 dark:border-primary-700 pb-3 mb-4 mr-6">
                <h2 className="text-lg font-display font-bold text-primary-900 dark:text-white">
                  Intervention : {selectedInt.numero || "Fiche DI"}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setPrintInt(selectedInt);
                    setShowPrintPreview(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary-100 hover:bg-primary-200 dark:bg-primary-800 dark:hover:bg-primary-750 text-primary-750 dark:text-primary-200 rounded-lg transition"
                  title="Imprimer / Exporter en PDF"
                >
                  <Printer size={14} />
                  <span>Imprimer / PDF</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start max-h-[75vh] overflow-y-auto pr-1">
                {/* Specs Info / Chat */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="p-4 bg-primary-50 dark:bg-primary-900 rounded-lg space-y-3 text-xs">
                    <p><strong>Équipement :</strong> {selectedInt.equipementNom}</p>
                    <p><strong>Demandeur :</strong> {selectedInt.demandeur}</p>
                    <p><strong>Atelier :</strong> {selectedInt.atelier}</p>
                    <p><strong>Urgence :</strong> {selectedInt.urgence}</p>
                    <p><strong>Symptôme :</strong> {selectedInt.effet || selectedInt.typeProbleme}</p>
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-primary-100 dark:border-primary-800">
                      <strong>Code défaut :</strong>
                      {isEditingCodeDefaut ? (
                        <div className="flex gap-1 items-center">
                          <input
                            type="text"
                            value={tempCodeDefaut}
                            onChange={e => setTempCodeDefaut(e.target.value.toUpperCase())}
                            className="p-1 text-xs border rounded bg-white dark:bg-primary-800 text-primary-900 dark:text-white font-mono uppercase w-28"
                            placeholder="Ex: E102..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateIntervention(selectedInt.id, { codeDefaut: tempCodeDefaut.trim() || undefined });
                              setIsEditingCodeDefaut(false);
                            }}
                            className="px-1.5 py-0.5 bg-green-500 hover:bg-green-600 text-white rounded text-[10px] font-bold"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingCodeDefaut(false)}
                            className="px-1.5 py-0.5 bg-gray-300 hover:bg-gray-400 text-primary-800 rounded text-[10px]"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1">
                          <span className="font-mono bg-red-100/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/40 text-xs uppercase">
                            {selectedInt.codeDefaut || 'Non spécifié'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setTempCodeDefaut(selectedInt.codeDefaut || '');
                              setIsEditingCodeDefaut(true);
                            }}
                            className="text-[10px] text-accent-orange hover:underline ml-1 font-semibold"
                          >
                            Modifier
                          </button>
                        </span>
                      )}
                    </div>
                    <p className="border-t border-primary-200 dark:border-primary-800 pt-2 font-semibold">Description initiale :</p>
                    <p className="italic text-primary-600 dark:text-primary-300 bg-white dark:bg-primary-950 p-2 rounded border border-primary-100 dark:border-primary-900">
                      {selectedInt.description}
                    </p>
                    {selectedInt.photoUrl && (
                      <div className="mt-2">
                        <span className="block font-semibold mb-1">Photo :</span>
                        <img src={selectedInt.photoUrl} alt="Panne" className="max-h-24 w-full object-cover rounded border" />
                      </div>
                    )}
                  </div>

                  {/* REAL-TIME CHAT */}
                  <div className="border border-primary-200 dark:border-primary-700 rounded-xl p-3 bg-white dark:bg-primary-950 flex flex-col h-72 justify-between">
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400 pb-2 border-b flex items-center gap-1.5"><MessageSquare size={14} /> Notes Collaboratives</span>
                    <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
                      {localComments.map((com, cIdx) => {
                        const isMe = com.auteur === "Jean Dupont (Admin)";
                        return (
                          <div key={cIdx} className={`chat-msg ${isMe ? 'msg-mine' : 'msg-other'} text-[11px]`}>
                            <span className="block font-bold text-[9px] opacity-75">{com.auteur}</span>
                            <span>{com.texte}</span>
                            <span className="text-[8px] opacity-60 block mt-1">
                              {new Date(com.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 border-t pt-2 mt-2">
                      <input
                        type="text"
                        placeholder="Ajouter une note..."
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        className="flex-1 p-2 text-xs bg-primary-50 dark:bg-primary-900 border-none rounded-lg text-primary-800 dark:text-white outline-none"
                      />
{canCommenter && (
                      <button
                        onClick={handleSendComment}
                        className="bg-accent-orange text-white p-2 rounded-lg hover:bg-accent-orange-hover transition"
                      >
                        <Send size={12} />
                      </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* FORM / READ ONLY ACCORDING TO STATE */}
                <div className="lg:col-span-2">
                  {selectedInt.typeDoc === 'DI' && !isClosed(selectedInt.statut) ? (
                    // DI Approving
                    <div className="space-y-4 py-4 text-center">
                      <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-primary-900 dark:text-white">Valider la Demande d'Intervention</h3>
                      <p className="text-xs text-primary-500 max-w-md mx-auto">
                        Cette demande est en attente d'approbation technique. En l'approuvant, elle sera automatiquement assignée au flux correctif BT (Bon de Travail) et passera au statut "En cours".
                      </p>
{canApprouverDI && (
                      <button
                        onClick={handleApproveDI}
                        className="btn-large flex items-center justify-center gap-2"
                        style={{ backgroundColor: '#EF4444' }}
                      >
                        <CheckCircle size={18} />
                        Approuver et convertir en BT
                      </button>
                      )}
                    </div>
                  ) : isClosed(selectedInt.statut) ? (
                    // ARCHIVED READ-ONLY
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl space-y-3 text-xs leading-relaxed">
                        <h4 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5"><Lock size={14} /> BT Clôturé en Lecture Seule</h4>
                        <p><strong>Activité :</strong> {selectedInt.activite || '-'}</p>
                        <p><strong>Technologie :</strong> {selectedInt.technologie || '-'}</p>
                        <p><strong>Imputation :</strong> {selectedInt.imputation || '-'}</p>
                        <p><strong>Cause :</strong> {selectedInt.cause || '-'}</p>
                        <p><strong>Remède :</strong> {selectedInt.remede || '-'}</p>
                        <p><strong>Intervenant :</strong> {selectedInt.technicienCloture || '-'}</p>
                        <p><strong>Temps passé :</strong> {selectedInt.tempsPasse || '-'}</p>
                        <p><strong>Temps d'arrêt machine :</strong> {selectedInt.tempsArret || '0 H'}</p>
                        <p><strong>Consommables magasin :</strong> {selectedInt.piecesConso || 'Aucune'}</p>
                        <div className="border-t pt-2">
                          <p className="font-semibold">Compte-rendu final :</p>
                          <p className="italic bg-white dark:bg-primary-900 p-2 rounded border border-emerald-100 dark:border-primary-850 mt-1">{selectedInt.compteRendu}</p>
                        </div>
                        {selectedInt.signatureTechnicien && (
                          <div className="border-t pt-2 text-center">
                            <p className="font-semibold text-left mb-1">Visa de signature :</p>
                            <img src={selectedInt.signatureTechnicien} alt="Visa Signature" className="max-h-24 inline bg-white rounded border border-emerald-100" />
                          </div>
                        )}
                      </div>
                      
{canReouvrirBon && (
                      <button
                        onClick={handleReopenIntervention}
                        className="btn-large flex items-center justify-center gap-2 border border-red-200 text-red-500 hover:bg-red-500 hover:text-white"
                        style={{ background: 'transparent' }}
                      >
                        <Unlock size={16} />
                        Bris de cadenas (Réouvrir le BT)
                      </button>
                      )}
                    </div>
                  ) : selectedInt.statut === 'Brouillon' ? (
                    // BROUILLON MODE
                    <div className="space-y-4 p-5 bg-slate-100/50 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                        <Lock className="text-slate-500" size={18} />
                        <span className="font-extrabold text-sm uppercase tracking-wider">Bon de Travail en mode Brouillon</span>
                      </div>
                      <p className="text-xs text-primary-500 leading-relaxed">
                        Ce bon de travail est un brouillon en cours de planification. Vous pouvez modifier les informations d'assignation ou le lancer officiellement pour exécution sur le terrain.
                      </p>
                      
                      <div className="space-y-3 pt-2">
                        <label className="font-bold text-primary-700 dark:text-primary-300 block">Opérateur chargé de la maintenance :</label>
                        <select
                          className="p-2 border rounded-lg w-full bg-white dark:bg-primary-800 text-xs text-primary-800 dark:text-white"
                          value={crOperateur}
                          onChange={e => {
                            setCrOperateur(e.target.value);
                            onUpdateIntervention(selectedInt.id, { operateur: e.target.value });
                          }}
                        >
                          <option value="">Non assigné</option>
                          {[...settings.listes.operateurs].sort((a,b) => a.localeCompare(b)).map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t">
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateIntervention(selectedInt.id, { statut: 'En cours' });
                            setCrStatut('En cours');
                            setSelectedInterventionId(null);
                            alert("🚀 Le Bon de Travail a été lancé avec succès ! Il est maintenant visible par les techniciens sur le terrain.");
                          }}
                          className="flex-1 btn-primary bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition"
                        >
                          <Play size={16} />
                          <span>Lancer l'Intervention (En cours)</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateIntervention(selectedInt.id, { statut: 'En attente de validation' });
                            setCrStatut('En attente de validation');
                            setSelectedInterventionId(null);
                            alert("📤 Le Bon de Travail a été soumis directement pour validation finale.");
                          }}
                          className="flex-1 btn-secondary bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition"
                        >
                          <Send size={16} />
                          <span>Soumettre pour Validation</span>
                        </button>
                      </div>
                    </div>
                  ) : selectedInt.statut === 'En attente de validation' ? (
                    // EN ATTENTE DE VALIDATION MODE
                    <div className="space-y-4 p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                        <CheckSquare className="animate-pulse" size={18} />
                        <span className="font-extrabold text-sm uppercase tracking-wider">Intervention en attente de validation</span>
                      </div>
                      
                      <div className="p-4 bg-white dark:bg-primary-950 rounded-xl border border-amber-100 dark:border-primary-900 space-y-3 text-xs">
                        <h4 className="font-bold border-b pb-1 text-primary-800 dark:text-primary-200">Résumé des travaux déclarés</h4>
                        <p><strong>Activité :</strong> {selectedInt.activite || '-'}</p>
                        <p><strong>Technologie :</strong> {selectedInt.technologie || '-'}</p>
                        <p><strong>Imputation :</strong> {selectedInt.imputation || '-'}</p>
                        <p><strong>Cause :</strong> {selectedInt.cause || '-'}</p>
                        <p><strong>Remède :</strong> {selectedInt.remede || '-'}</p>
                        <p><strong>Intervenant :</strong> {selectedInt.operateur || '-'}</p>
                        <p><strong>Temps passé :</strong> {selectedInt.tempsPasse || '-'}</p>
                        <p><strong>Temps d'arrêt machine :</strong> {selectedInt.tempsArret || '0 H'}</p>
                        <p><strong>Consommables magasin :</strong> {selectedInt.piecesConso || 'Aucune'}</p>
                        <div className="border-t pt-2">
                          <p className="font-semibold">Compte-rendu saisi :</p>
                          <p className="italic bg-slate-50 dark:bg-primary-900 p-2 rounded border border-slate-100 dark:border-primary-800 mt-1">{selectedInt.compteRendu}</p>
                        </div>
                      </div>

			{!canTraiterBon ? (
                        <p className="text-xs text-amber-600 font-semibold bg-amber-100/50 dark:bg-amber-900/30 p-3 rounded-lg">
                          🔒 Ce bon de travail est verrouillé en attente de signature par le Responsable Technique. Vous serez notifié une fois validé.
                        </p>
                      ) : (
<div className="space-y-3 pt-3 border-t">
                          {canTraiterBon && (
                          <>
                          <p className="text-xs text-primary-500 font-bold">Actions d'approbation (Rôle : {userRole || 'Manager/Responsable'}) :</p>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateIntervention(selectedInt.id, {
                                  statut: 'Terminé',
                                  dateCloture: new Date().toISOString(),
                                  technicienCloture: selectedInt.operateur || 'Responsable Technique'
                                });
                                setCrStatut('Soldé');
                                setSelectedInterventionId(null);
                                alert("✅ Le bon de travail a été validé et clôturé avec succès !");
                              }}
                              className="flex-1 btn-primary bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition"
                            >
                              <CheckCircle size={16} />
                              <span>Valider et Clôturer (Terminé)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const raison = prompt("Saisissez le motif de renvoi en correction pour le technicien :");
                                if (raison) {
                                  onUpdateIntervention(selectedInt.id, {
                                    statut: 'En cours',
                                    compteRendu: `${selectedInt.compteRendu || ''}\n\n[RENVOI EN CORRECTION par ${userRole || 'Responsable'}] : ${raison}`
                                  });
                                  setCrStatut('En cours');
                                  setSelectedInterventionId(null);
                                  alert("📤 Le bon de travail a été renvoyé en correction.");
                                }
                              }}
                              className="flex-1 btn-secondary bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition"
                            >
                              <X size={16} />
                              <span>Renvoyer en correction</span>
                            </button>
                          </div>
                          </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleSaveTreatment} className="grid-form text-xs">
                      <div>
                        <label className="flex items-center gap-1.5 font-semibold">
                          <span>Activité</span>
                          <span className="text-red-500">*</span>
                          {crActivite ? (
                            <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" title="Saisie valide" />
                          ) : null}
                        </label>
                        <select required value={crActivite} onChange={e => setCrActivite(e.target.value)}>
                          {[...settings.listes.activites].sort((a,b) => a.localeCompare(b)).map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      
                      <div>
                        <label className="flex items-center gap-1.5 font-semibold">
                          <span>Technologie</span>
                          <span className="text-red-500">*</span>
                          {crTechno ? (
                            <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" title="Saisie valide" />
                          ) : null}
                        </label>
                        <select required value={crTechno} onChange={e => setCrTechno(e.target.value)}>
                          {[...settings.listes.technologies].sort((a,b) => a.localeCompare(b)).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 font-semibold">
                          <span>Cause panne</span>
                          <span className="text-red-500">*</span>
                          {crCause ? (
                            <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" title="Saisie valide" />
                          ) : null}
                        </label>
                        <select required value={crCause} onChange={e => setCrCause(e.target.value)}>
                          {[...settings.listes.causes].sort((a,b) => a.localeCompare(b)).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 font-semibold">
                          <span>Remède apporté</span>
                          <span className="text-red-500">*</span>
                          {crRemede ? (
                            <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" title="Saisie valide" />
                          ) : null}
                        </label>
                        <select required value={crRemede} onChange={e => setCrRemede(e.target.value)}>
                          {[...settings.listes.remedes].sort((a,b) => a.localeCompare(b)).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-1.5">
                          <span>Opérateur chargé</span>
                          <span className="text-red-500">*</span>
                          {crOperateur ? (
                            <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" title="Saisie valide" />
                          ) : null}
                        </label>
                        <select required value={crOperateur} onChange={e => setCrOperateur(e.target.value)}>
                          <option value="">Sélectionner un opérateur...</option>
                          {[...settings.listes.operateurs].sort((a,b) => a.localeCompare(b)).map(o => <option key={o} value={o}>{o}</option>)}
                        </select>

                        {/* Smart Suggestions Engine */}
                        {selectedInt && (() => {
                          const reqSkills = getRequiredSkillsForBT(selectedInt);
                          if (reqSkills.length > 0) {
                            const suggestions = settings.listes.operateurs.map(techName => {
                              const techSkills = settings.competencesTechniciens?.[techName] || [];
                              const matches = reqSkills.filter(s => techSkills.includes(s));
                              return {
                                name: techName,
                                matches,
                                score: matches.length
                              };
                            }).sort((a, b) => b.score - a.score);

                            const topSuggestions = suggestions.filter(s => s.score > 0);

                            return (
                              <div className="mt-2.5 p-2.5 bg-amber-50/30 dark:bg-amber-950/15 rounded-lg border border-amber-200/40 dark:border-amber-900/30 space-y-1.5 animate-fade-in">
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block flex items-center gap-1">
                                  <Award size={12} className="text-amber-500 animate-pulse" />
                                  Suggestions de techniciens qualifiés :
                                </span>
                                <p className="text-[9px] text-primary-400">
                                  Compétences requises identifiées : <span className="font-semibold text-primary-600 dark:text-primary-300">{reqSkills.join(', ')}</span>
                                </p>

                                {topSuggestions.length === 0 ? (
                                  <p className="text-[9px] text-amber-600 dark:text-amber-400 italic">
                                    ⚠️ Aucun technicien ne possède ces compétences dans la Configuration.
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {topSuggestions.map(s => (
                                      <button
                                        key={s.name}
                                        type="button"
                                        onClick={() => setCrOperateur(s.name)}
                                        className={`text-[10px] py-1 px-2.5 rounded-full border transition flex items-center gap-1 ${
                                          crOperateur === s.name
                                            ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800 font-bold"
                                            : "bg-white dark:bg-primary-850 hover:bg-amber-50 dark:hover:bg-primary-800 text-primary-700 dark:text-primary-200 border-primary-200 dark:border-primary-700"
                                        }`}
                                        title={`Assigner ${s.name} (${s.score}/${reqSkills.length} compétences validées)`}
                                      >
                                        <span className="font-bold">{s.name}</span>
                                        <span className="text-[8px] px-1 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900 text-amber-800 dark:text-amber-300 font-bold">
                                          {Math.round((s.score / reqSkills.length) * 100)}%
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 font-semibold">
                          <span>Budget imputé</span>
                          <span className="text-red-500">*</span>
                          {crImputation ? (
                            <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" title="Saisie valide" />
                          ) : null}
                        </label>
                        <select required value={crImputation} onChange={e => setCrImputation(e.target.value)}>
                          {[...settings.listes.imputations].sort((a,b) => a.localeCompare(b)).map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="m-0 flex items-center gap-1.5 font-semibold">
                            <span>Compte-rendu d'intervention</span>
                            <span className="text-red-500">*</span>
                            {crText.trim() ? (
                              <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" title="Saisie valide" />
                            ) : null}
                          </label>
                          <SaisieVocale
                            compact
                            onTranscript={(text) => {
                              setCrText(prev => prev ? `${prev} ${text}` : text);
                            }}
                          />
                        </div>
                        <textarea required value={crText} onChange={e => setCrText(e.target.value)} rows={3} placeholder="Détaillez les actions réalisées..." />
                      </div>

                      {/* PARTS AUTOCOMPLETE IN REPORT */}
                      <div className="col-span-2 p-3 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-xl space-y-2">
                        <label className="text-primary-700 dark:text-primary-300 font-bold"><Paperclip size={14} className="inline mr-1" /> Pièces consommées du magasin</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="🔍 Taper pour rechercher dans l'inventaire..."
                            value={partSearch}
                            onChange={e => {
                              setPartSearch(e.target.value);
                            }}
                          />
                          {partSearch.trim() && (
                            <ul className="absolute left-0 right-0 bg-white dark:bg-primary-800 border border-primary-200 dark:border-primary-700 rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">
                              {pieces
                                .filter(p => p.designation.toLowerCase().includes(partSearch.toLowerCase()) || p.reference.toLowerCase().includes(partSearch.toLowerCase()))
                                .slice(0, 5)
                                .map(p => (
                                  <li
                                    key={p.id}
                                    onClick={() => {
                                      if (!selectedParts.some(x => x.id === p.id)) {
                                        setSelectedParts([...selectedParts, { id: p.id, nom: p.designation, qte: 1 }]);
                                      }
                                      setPartSearch('');
                                    }}
                                    className="p-2 text-xs hover:bg-primary-50 dark:hover:bg-primary-900 cursor-pointer border-b last:border-b-0 dark:border-primary-700"
                                  >
                                    <strong>{p.designation}</strong> - Stock dispo: {p.quantite} (Réf: {p.reference})
                                  </li>
                                ))}
                            </ul>
                          )}
                        </div>

                        {selectedParts.length > 0 && (
                          <div className="selected-pieces-container">
                            {selectedParts.map(sel => (
                              <div key={sel.id} className="piece-chip bg-white dark:bg-primary-950">
                                <span className="truncate max-w-[200px]">{sel.nom}</span>
                                <div className="flex items-center gap-2">
                                  <label className="text-[10px] m-0">Qté :</label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={sel.qte}
                                    onChange={e => {
                                      const val = parseInt(e.target.value) || 1;
                                      setSelectedParts(selectedParts.map(x => x.id === sel.id ? { ...x, qte: val } : x));
                                    }}
                                    className="p-1 w-12 text-center"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setSelectedParts(selectedParts.filter(x => x.id !== sel.id))}
                                    className="btn-remove-piece"
                                  >
                                    Retirer
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label>Statut d'intervention <span className="text-red-500">*</span></label>
                        <select value={crStatut} onChange={e => setCrStatut(e.target.value as any)}>
                          <option value="En attente de pièce">En attente de pièce</option>
                          <option value="En attente de validation">Soumettre pour Validation (Responsable)</option>
                          <option value="En cours">Toujours en cours</option>
                          <option value="Soldé">Soldé (Clôture définitive)</option>
                        </select>
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 font-semibold">
                          <span>Temps passé de maintenance (Heures)</span>
                          <span className="text-red-500">*</span>
                          {crMo ? (
                            <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" title="Saisie valide" />
                          ) : null}
                        </label>
                        <input type="number" step="0.1" required value={crMo} onChange={e => setCrMo(e.target.value)} placeholder="Ex: 1.5" />
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 font-semibold">
                          <span>Temps d'arrêt machine (Heures)</span>
                          {crArret ? (
                            <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" title="Saisie valide" />
                          ) : null}
                        </label>
                        <input type="number" step="0.1" value={crArret} onChange={e => setCrArret(e.target.value)} placeholder="Ex: 2.0 (Optionnel)" />
                      </div>

                      {/* PHOTO ATTACHMENT */}
                      <div className="col-span-2 space-y-2 border-t pt-4">
                        <label className="font-semibold text-xs text-primary-700 dark:text-primary-300 flex items-center gap-1">
                          <Camera size={14} className="text-blue-500" />
                          <span>Photos de l'intervention (Terrain) :</span>
                        </label>
                        <div className="p-3 bg-gray-50 dark:bg-primary-900/40 rounded-xl border border-gray-200 dark:border-primary-800 flex flex-col sm:flex-row gap-4 items-center">
                          {crPhoto ? (
                            <div className="relative group shrink-0 w-28 h-20 bg-black rounded-lg overflow-hidden border">
                              <img src={crPhoto} alt="Panne" className="max-w-full max-h-full mx-auto object-contain" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setCrPhoto(null)}
                                  className="p-1 bg-red-600 rounded text-white text-[10px] font-bold"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="shrink-0 w-28 h-20 border border-dashed rounded-lg bg-white/50 dark:bg-primary-950/20 flex flex-col items-center justify-center text-gray-400">
                              <Camera size={20} />
                              <span className="text-[9px] mt-1">Aucune photo</span>
                            </div>
                          )}

                          <div className="flex-1 space-y-2 w-full text-left">
                            <p className="text-[10px] text-gray-400 leading-tight">
                              Ajoutez une photo pour documenter l'intervention. Appuyez sur Caméra pour prendre une photo en direct ou Galerie pour téléverser un fichier existant.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <label className="flex items-center gap-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-semibold cursor-pointer transition">
                                <Camera size={11} /> Caméra
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        const compressed = await compressImage(file, 1.0);
                                        setCrPhoto(compressed);
                                      } catch (error: any) {
                                        alert("Erreur lors du traitement de la photo : " + (error.message || error));
                                      }
                                    }
                                  }}
                                />
                              </label>

                              <label className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-gray-100 text-gray-700 dark:bg-primary-800 dark:text-gray-200 rounded text-xs font-semibold cursor-pointer border transition">
                                <Upload size={11} /> Galerie
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        const compressed = await compressImage(file, 1.0);
                                        setCrPhoto(compressed);
                                      } catch (error: any) {
                                        alert("Erreur lors du traitement de la photo : " + (error.message || error));
                                      }
                                    }
                                  }}
                                />
                              </label>

                              <input
                                type="text"
                                placeholder="Ou URL d'image en ligne..."
                                value={crPhoto?.startsWith('data:') ? '' : crPhoto || ''}
                                onChange={(e) => setCrPhoto(e.target.value)}
                                className="flex-1 text-xs py-1 px-2 border rounded dark:bg-primary-900 text-primary-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SIGNATURE PAD FOR CLOTURE */}
                      {crStatut === 'Soldé' && (
                        <div className="col-span-2 space-y-2">
                          <label>Signature obligatoire de clôture (Visa) <span className="text-red-500">*</span></label>
                          <div className="border border-dashed border-primary-300 dark:border-primary-700 bg-white rounded-lg overflow-hidden">
                            <canvas
                              ref={canvasRef}
                              height={120}
                              onMouseDown={startDrawing}
                              onMouseMove={draw}
                              onMouseUp={stopDrawing}
                              onMouseLeave={stopDrawing}
                              className="w-full cursor-crosshair block"
                            ></canvas>
                          </div>
                          <button
                            type="button"
                            onClick={clearSignature}
                            className="btn-secondary text-[10px] py-1 px-3"
                          >
                            Effacer la signature
                          </button>
                        </div>
                      )}

                      <div className="col-span-2 flex justify-end gap-3 mt-4 border-t pt-4">
                        <button type="button" onClick={() => setSelectedInterventionId(null)} className="btn-secondary">Annuler</button>
                        <button type="submit" className="btn-primary" style={{ backgroundColor: '#3B82F6' }}>Enregistrer</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SPONTANEOUS BT / QUICK CREATOR MODAL */}
      <AnimatePresence>
        {showSpontaneousModal && (
          <div className="modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content"
            >
              <span onClick={() => setShowSpontaneousModal(false)} className="close-modal">&times;</span>
              <h2 className="text-lg font-display font-bold text-primary-900 dark:text-white border-b pb-3 mb-4 flex items-center gap-1.5"><Plus size={18} /> Créer un B.T Flash Direct</h2>
              <form onSubmit={handleCreateSpontaneous} className="grid-form text-xs">
                <div className="col-span-2">
                  <label className="flex items-center gap-1.5 font-semibold">
                    <span>Équipement concerné</span>
                    <span className="text-red-500">*</span>
                    {btsEqId ? (
                      <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" title="Saisie valide" />
                    ) : null}
                  </label>
                  <EquipmentTreeSelect
                    equipements={equipements}
                    selectedId={btsEqId}
                    onSelect={setBtsEqId}
                    required
                    placeholder="Choisir l'équipement dans l'arborescence..."
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 font-semibold">
                    <span>Technicien / Demandeur</span>
                    <span className="text-red-500">*</span>
                    {btsDemandeur.trim() ? (
                      <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" title="Saisie valide" />
                    ) : null}
                  </label>
                  <input
                    type="text"
                    required
                    value={btsDemandeur}
                    onChange={e => setBtsDemandeur(e.target.value)}
                    placeholder="Entrer votre identité..."
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 font-semibold">
                    <span>Urgence</span>
                    <span className="text-red-500">*</span>
                    {btsUrgence ? (
                      <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" title="Saisie valide" />
                    ) : null}
                  </label>
                  <select required value={btsUrgence} onChange={e => setBtsUrgence(e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {[...settings.listes.urgences].sort((a,b) => a.localeCompare(b)).map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="flex items-center gap-1.5 font-semibold">
                    <span>Phénomène / Symptôme</span>
                    <span className="text-red-500">*</span>
                    {btsEffet ? (
                      <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" title="Saisie valide" />
                    ) : null}
                  </label>
                  <select required value={btsEffet} onChange={e => setBtsEffet(e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {[...settings.listes.effets].sort((a,b) => a.localeCompare(b)).map(ef => <option key={ef} value={ef}>{ef}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="flex items-center gap-1">
                    <AlertCircle size={12} className="text-red-500" />
                    Code défaut / Code erreur (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={btsCodeDefaut}
                    onChange={e => setBtsCodeDefaut(e.target.value.toUpperCase())}
                    placeholder="Ex: E102, ERR_04, ALARM_HIGH, OVERTEMP..."
                    className="w-full p-2 border rounded-lg bg-white dark:bg-primary-800 text-xs text-primary-900 dark:text-white"
                  />
                </div>

                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="m-0 flex items-center gap-1.5 font-semibold">
                      <span>Description détaillée</span>
                      <span className="text-red-500">*</span>
                      {btsDescription.trim() ? (
                        <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" title="Saisie valide" />
                      ) : null}
                    </label>
                    <SaisieVocale
                      compact
                      onTranscript={(text) => {
                        setBtsDescription(prev => prev ? `${prev} ${text}` : text);
                      }}
                    />
                  </div>
                  <textarea
                    required
                    value={btsDescription}
                    onChange={e => setBtsDescription(e.target.value)}
                    rows={3}
                    placeholder="Saisissez les observations..."
                  />
                </div>

                <div className="col-span-2">
                  <label>Statut Initial de Création <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={btsStatut}
                    onChange={e => setBtsStatut(e.target.value as any)}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-primary-800 text-xs text-primary-800 dark:text-white"
                  >
                    <option value="Brouillon">Créer comme Brouillon (Draft)</option>
                    <option value="En cours">Lancer directement (En cours)</option>
                  </select>
                </div>

                <div className="col-span-2 flex justify-end gap-3 mt-4 border-t pt-4">
                  <button type="button" onClick={() => setShowSpontaneousModal(false)} className="btn-secondary">Annuler</button>
                  <button type="submit" className="btn-primary" style={{ backgroundColor: '#10B981' }}>Créer le BT</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRINT PREVIEW / PDF GENERATION MODAL */}
      <AnimatePresence>
        {showPrintPreview && printInt && (
          <div className="modal z-[110] no-print">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content text-left overflow-y-auto max-h-[95vh] bg-primary-100 dark:bg-primary-950 p-0 shadow-2xl"
              style={{ maxWidth: '850px', width: '95%' }}
            >
              {/* Toolbar in modal - hidden on print */}
              <div className="p-4 bg-white dark:bg-primary-900 border-b border-primary-200 dark:border-primary-800 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <Printer size={18} className="text-accent-orange" />
                  <span className="font-display font-bold text-sm text-primary-800 dark:text-white">Aperçu avant impression (Bon de Travail)</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setTimeout(() => {
                        window.print();
                      }, 100);
                    }}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-accent-orange hover:bg-accent-orange-hover text-white rounded-lg"
                  >
                    <Printer size={14} />
                    <span>Imprimer / PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowPrintPreview(false);
                      setPrintInt(null);
                    }}
                    className="btn-secondary text-xs py-1.5 px-3 rounded-lg"
                  >
                    Fermer
                  </button>
                </div>
              </div>

              {/* The printable sheet itself */}
              <div className="p-4 md:p-8 flex justify-center">
                <div
                  className="gmao-print-sheet bg-white text-black p-8 md:p-12 w-full max-w-[210mm] shadow-lg border border-primary-200 text-xs font-sans rounded-sm leading-relaxed"
                  style={{ color: '#000000', backgroundColor: '#ffffff' }}
                >
                  {/* Top Header */}
                  <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                    <div>
                      <h1 className="text-base font-extrabold tracking-wider text-black uppercase">GMAO PRO INDUSTRIE</h1>
                      <p className="text-[10px] text-gray-600 font-medium">Département Maintenance & Infrastructures • Service Technique</p>
                      <p className="text-[9px] text-gray-500 mt-1">Généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="px-3 py-1 border border-black font-extrabold text-sm uppercase mb-2">
                        {printInt.typeDoc === 'DI' ? "Demande d'Intervention" : "Bon de Travail"}
                      </div>
                      <BarcodeSim value={printInt.numero} />
                    </div>
                  </div>

                  {/* Document Title & Reference Banner */}
                  <div className="bg-gray-100 p-3 border border-black flex justify-between items-center mb-6">
                    <div>
                      <span className="text-[10px] uppercase text-gray-600 font-bold block">Référence Document</span>
                      <span className="text-sm font-mono font-bold text-black">{printInt.numero}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-gray-600 font-bold block">Type d'Ordre</span>
                      <span className="text-xs font-bold text-black">{printInt.typeDoc}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-gray-600 font-bold block">Statut Actuel</span>
                      <span className="text-xs font-bold text-black uppercase">{printInt.statut}</span>
                    </div>
                  </div>

                  {/* Section 1: Machine Characteristics */}
                  <div className="mb-6">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider bg-black text-white px-2 py-1 mb-2">I. CARACTÉRISTIQUES DE L'ÉQUIPEMENT</h3>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-6 border border-gray-300 p-3 rounded bg-gray-50/50">
                      <div>
                        <p className="text-gray-600"><strong>Désignation Machine :</strong></p>
                        <p className="text-sm font-bold text-black">{printInt.equipementNom}</p>
                      </div>
                      <div>
                        <p className="text-gray-600"><strong>Code Inventaire / Réf :</strong></p>
                        <p className="font-mono text-black font-semibold">{printInt.equipementId}</p>
                      </div>
                      <div className="border-t border-gray-200 pt-1.5 mt-1">
                        <p className="text-gray-600"><strong>Atelier / Secteur :</strong></p>
                        <p className="text-black font-semibold">{printInt.atelier}</p>
                      </div>
                      <div className="border-t border-gray-200 pt-1.5 mt-1">
                        <p className="text-gray-600"><strong>Degré d'Urgence :</strong></p>
                        <p className="text-black font-bold uppercase">{printInt.urgence}</p>
                      </div>
                      {equipements.find(e => e.id === printInt.equipementId) && (
                        <>
                          <div className="border-t border-gray-200 pt-1.5 mt-1 col-span-2 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-gray-600"><strong>Constructeur / Type :</strong></p>
                              <p className="text-black font-semibold">
                                {equipements.find(e => e.id === printInt.equipementId)?.marque || 'N/A'} - {equipements.find(e => e.id === printInt.equipementId)?.type || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600"><strong>Numéro de Série :</strong></p>
                              <p className="font-mono text-black font-semibold">
                                {equipements.find(e => e.id === printInt.equipementId)?.serie || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Problem Description */}
                  <div className="mb-6">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider bg-black text-white px-2 py-1 mb-2">II. SIGNALEMENT ET SYMPTÔMES</h3>
                    <div className="border border-gray-300 p-3 rounded space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <p><strong>Émis par :</strong> <span className="text-black">{printInt.demandeur}</span></p>
                        <p><strong>Déclaré le :</strong> <span className="text-black">{new Date(printInt.dateCreation).toLocaleDateString('fr-FR')} {new Date(printInt.dateCreation).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span></p>
                      </div>
                      <p className="border-t pt-1.5"><strong>Symptôme / Phénomène constaté :</strong></p>
                      <p className="text-black font-semibold bg-gray-50 p-2 rounded border border-gray-200">{printInt.effet || printInt.typeProbleme || 'Non spécifié'}</p>
                      <p className="pt-1"><strong>Description détaillée de l'anomalie :</strong></p>
                      <p className="text-black bg-gray-50 p-2 rounded border border-gray-200 italic leading-relaxed whitespace-pre-wrap">{printInt.description}</p>
                    </div>
                  </div>

                  {/* Section 3: Technical Report */}
                  <div className="mb-6">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider bg-black text-white px-2 py-1 mb-2">III. RAPPORT DE TRAVAUX DE MAINTENANCE</h3>
                    {printInt.statut !== 'Soldé' && printInt.statut !== 'Clôturé' ? (
                      <div className="border border-dashed border-gray-400 p-6 rounded text-center text-gray-500 italic">
                        Ce Bon de Travail est actuellement EN COURS de traitement.<br />Le rapport de clôture sera généré automatiquement une fois le bon soldé par le technicien.
                      </div>
                    ) : (
                      <div className="border border-gray-300 p-3 rounded space-y-3">
                        <div className="grid grid-cols-4 gap-3 bg-gray-50 p-2 border border-gray-200 rounded">
                          <div>
                            <p className="text-gray-500 text-[10px] uppercase font-bold">Activité</p>
                            <p className="text-black font-bold">{printInt.activite || 'Correctif'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[10px] uppercase font-bold">Technologie</p>
                            <p className="text-black font-bold">{printInt.technologie || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[10px] uppercase font-bold">Temps Passé</p>
                            <p className="text-black font-bold">{printInt.tempsPasse || 'Non spécifié'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[10px] uppercase font-bold">Temps d'Arrêt</p>
                            <p className="text-black font-bold">{printInt.tempsArret || '0 H'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t pt-2">
                          <div>
                            <p><strong>Cause de la défaillance :</strong></p>
                            <p className="text-black font-semibold bg-gray-50 p-1.5 rounded border">{printInt.cause || 'N/A'}</p>
                          </div>
                          <div>
                            <p><strong>Remède / Action réalisée :</strong></p>
                            <p className="text-black font-semibold bg-gray-50 p-1.5 rounded border">{printInt.remede || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="border-t pt-2">
                          <p><strong>Compte-rendu technique détaillé :</strong></p>
                          <p className="text-black bg-gray-50 p-2 rounded border leading-relaxed whitespace-pre-wrap font-medium">{printInt.compteRendu || 'Aucun compte rendu rédigé.'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t pt-2 text-[10px]">
                          <p><strong>Technicien intervenant :</strong> <span className="text-black font-semibold">{printInt.technicienCloture || printInt.operateur || 'N/A'}</span></p>
                          <p><strong>Budget d'imputation :</strong> <span className="text-black font-semibold">{printInt.imputation || 'N/A'}</span></p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 4: Consumed Spare Parts */}
                  <div className="mb-6">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider bg-black text-white px-2 py-1 mb-2">IV. PIÈCES DE RECHANGE CONSOMMÉES</h3>
                    {!printInt.piecesConso ? (
                      <div className="border border-gray-300 p-3 rounded text-center text-gray-500 italic bg-gray-50/50">
                        Aucune pièce détachée n'a été prélevée du stock pour cette intervention.
                      </div>
                    ) : (
                      <table className="w-full border-collapse border border-gray-300 text-left text-black">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 p-2 font-bold text-[10px] uppercase w-12 text-center">N°</th>
                            <th className="border border-gray-300 p-2 font-bold text-[10px] uppercase">Désignation de la pièce</th>
                            <th className="border border-gray-300 p-2 font-bold text-[10px] uppercase w-24 text-right">Quantité</th>
                          </tr>
                        </thead>
                        <tbody>
                          {printInt.piecesConso.split(',').map((partStr, index) => {
                            const trimmed = partStr.trim();
                            const match = trimmed.match(/(.*?)\s+x\s*(\d+)$/i);
                            const nom = match ? match[1] : trimmed;
                            const qte = match ? match[2] : '1';
                            return (
                              <tr key={index}>
                                <td className="border border-gray-300 p-2 text-center font-medium">{index + 1}</td>
                                <td className="border border-gray-300 p-2 font-bold text-black">{nom}</td>
                                <td className="border border-gray-300 p-2 text-right font-bold font-mono text-black">{qte}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Section 4.5: Photos de l'intervention (Terrain) */}
                  {printInt.photoUrl && (
                    <div className="mb-6">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider bg-black text-white px-2 py-1 mb-2">V. PHOTOS DE L'INTERVENTION (TERRAIN)</h3>
                      <div className="border border-gray-300 p-4 rounded bg-gray-50/50 flex flex-col items-center justify-center">
                        <img 
                          src={printInt.photoUrl} 
                          alt="Photo terrain" 
                          className="max-h-64 max-w-full object-contain rounded border border-gray-300 bg-white p-1 shadow-xs" 
                        />
                        <p className="text-[9px] text-gray-500 mt-1.5 italic text-center">Cliché photographique joint par le technicien lors de la clôture des travaux</p>
                      </div>
                    </div>
                  )}

                  {/* Section 5: Signatures / Visas */}
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="border border-black p-3 h-32 rounded flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-gray-600">Visa Production / Exploitant</span>
                        <p className="text-[9px] text-gray-400 mt-1">"Bon pour fonctionnement & réception de la machine"</p>
                      </div>
                      <div className="border-t border-dashed border-gray-300 pt-1 text-[9px] text-gray-500 flex justify-between">
                        <span>Date : ____/____/________</span>
                        <span className="pr-4">Signature :</span>
                      </div>
                    </div>
                    <div className="border border-black p-3 h-32 rounded flex flex-col justify-between items-stretch">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-gray-600">Visa Service Maintenance (Intervenant)</span>
                        <p className="text-[9px] text-gray-400 mt-1">"Travaux finalisés conformément aux règles de l'art"</p>
                      </div>
                      {printInt.signatureTechnicien ? (
                        <div className="flex-1 flex items-center justify-center p-1 bg-white border rounded border-gray-200 my-1 overflow-hidden h-14">
                          <img src={printInt.signatureTechnicien} alt="Visa Technicien" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                        </div>
                      ) : (
                        <div className="flex-1 border border-dashed border-gray-200 my-1 flex items-center justify-center text-[9px] text-gray-300 font-medium">
                          Cadre Signature Technicien
                        </div>
                      )}
                      <div className="border-t border-dashed border-gray-300 pt-1 text-[9px] text-gray-500 flex justify-between">
                        <span>Date : {printInt.dateCloture ? new Date(printInt.dateCloture).toLocaleDateString('fr-FR') : '____/____/________'}</span>
                        <span className="pr-4">Signature / Visa :</span>
                      </div>
                    </div>
                  </div>

                  {/* Absolute Footer inside the A4 sheet */}
                  <div className="mt-8 flex justify-between items-center text-[8px] text-gray-400 border-t border-gray-100 pt-2 font-mono">
                    <span>DOCUMENT MAINTENANCE INDUSTRIELLE • CONFIDENTIEL INTERNE</span>
                    <span>GMAO PRO SYSTEM • PAGE 1 / 1</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PORTAL FOR PERFECT PRINTING DIRECTLY ON BODY */}
      {showPrintPreview && printInt && createPortal(
        <div
          id="printable-bt-body-portal"
          className="gmao-print-sheet hidden print:block bg-white text-black p-10 w-full font-sans text-xs"
          style={{ color: '#000000', backgroundColor: '#ffffff' }}
        >
          {/* Action button inside portal, visible on screen, hidden on print */}
          <div className="no-print print:hidden mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (confirm("Voulez-vous vraiment réinitialiser le formulaire d'intervention et vider tous les champs de saisie ?")) {
                  setCrText('');
                  setCrMo('');
                  setCrPhoto(null);
                  setSelectedParts([]);
                  setPartSearch('');
                  setCrOperateur('');
                  setCrActivite('');
                  setCrTechno('');
                  setCrCause('');
                  setCrRemede('');
                  setCrImputation('');
                  setCrStatut('En cours');
                  // Spontaneous fields
                  setBtsEqId('');
                  setBtsDemandeur('');
                  setBtsUrgence('');
                  setBtsEffet('');
                  setBtsDescription('');
                  setBtsCodeDefaut('');
                  // Clear signature if any
                  clearSignature();

                  // Clear draft from localStorage
                  localStorage.removeItem('gmao_draft_bts');
                  if (printInt) {
                    localStorage.removeItem(`gmao_draft_int_${printInt.id}`);
                  }
                  localStorage.removeItem('gmao_active_int_id');

                  alert("Formulaire réinitialisé avec succès.");
                }
              }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs transition flex items-center gap-1 cursor-pointer"
            >
              Réinitialiser le formulaire
            </button>
          </div>

          {/* Top Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
            <div>
              <h1 className="text-xl font-extrabold tracking-wider text-black uppercase">GMAO PRO INDUSTRIE</h1>
              <p className="text-[10px] text-gray-600 font-medium">Département Maintenance & Infrastructures • Service Technique</p>
              <p className="text-[9px] text-gray-500 mt-1">Généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="px-3 py-1 border border-black font-extrabold text-sm uppercase mb-2">
                {printInt.typeDoc === 'DI' ? "Demande d'Intervention" : "Bon de Travail"}
              </div>
              <BarcodeSim value={printInt.numero} />
            </div>
          </div>

          {/* Banner */}
          <div className="bg-gray-100 p-3 border border-black flex justify-between items-center mb-6 text-black">
            <div>
              <span className="text-[10px] uppercase text-gray-600 font-bold block">Référence Document</span>
              <span className="text-sm font-mono font-bold">{printInt.numero}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-gray-600 font-bold block">Type d'Ordre</span>
              <span className="text-xs font-bold">{printInt.typeDoc}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-gray-600 font-bold block">Statut Actuel</span>
              <span className="text-xs font-bold uppercase">{printInt.statut}</span>
            </div>
          </div>

          {/* Section 1 */}
          <div className="mb-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider bg-black text-white px-2 py-1 mb-2">I. CARACTÉRISTIQUES DE L'ÉQUIPEMENT</h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-6 border border-gray-300 p-3 rounded bg-gray-50/50">
              <div>
                <p className="text-gray-600"><strong>Désignation Machine :</strong></p>
                <p className="text-sm font-bold">{printInt.equipementNom}</p>
              </div>
              <div>
                <p className="text-gray-600"><strong>Code Inventaire / Réf :</strong></p>
                <p className="font-mono font-semibold">{printInt.equipementId}</p>
              </div>
              <div className="border-t border-gray-200 pt-1.5 mt-1">
                <p className="text-gray-600"><strong>Atelier / Secteur :</strong></p>
                <p className="font-semibold">{printInt.atelier}</p>
              </div>
              <div className="border-t border-gray-200 pt-1.5 mt-1">
                <p className="text-gray-600"><strong>Degré d'Urgence :</strong></p>
                <p className="font-bold uppercase">{printInt.urgence}</p>
              </div>
              {equipements.find(e => e.id === printInt.equipementId) && (
                <>
                  <div className="border-t border-gray-200 pt-1.5 mt-1 col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600"><strong>Constructeur / Type :</strong></p>
                      <p className="font-semibold">
                        {equipements.find(e => e.id === printInt.equipementId)?.marque || 'N/A'} - {equipements.find(e => e.id === printInt.equipementId)?.type || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Numéro de Série :</strong></p>
                      <p className="font-mono font-semibold">
                        {equipements.find(e => e.id === printInt.equipementId)?.serie || 'N/A'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section 2 */}
          <div className="mb-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider bg-black text-white px-2 py-1 mb-2">II. SIGNALEMENT ET SYMPTÔMES</h3>
            <div className="border border-gray-300 p-3 rounded space-y-2 text-black">
              <div className="grid grid-cols-2 gap-4">
                <p><strong>Émis par :</strong> <span>{printInt.demandeur}</span></p>
                <p><strong>Déclaré le :</strong> <span>{new Date(printInt.dateCreation).toLocaleDateString('fr-FR')} {new Date(printInt.dateCreation).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span></p>
              </div>
              <p className="border-t pt-1.5"><strong>Symptôme / Phénomène constaté :</strong></p>
              <p className="font-semibold bg-gray-50 p-2 rounded border border-gray-200">{printInt.effet || printInt.typeProbleme || 'Non spécifié'}</p>
              <p className="pt-1"><strong>Description détaillée de l'anomalie :</strong></p>
              <p className="bg-gray-50 p-2 rounded border border-gray-200 italic leading-relaxed whitespace-pre-wrap">{printInt.description}</p>
            </div>
          </div>

          {/* Section 3 */}
          <div className="mb-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider bg-black text-white px-2 py-1 mb-2">III. RAPPORT DE TRAVAUX DE MAINTENANCE</h3>
            {(() => {
              const isEditingThisInt = selectedInt && printInt && selectedInt.id === printInt.id;
              const liveActivite = isEditingThisInt ? crActivite : (printInt.activite || 'Correctif');
              const liveTechno = isEditingThisInt ? crTechno : (printInt.technologie || 'N/A');
              const liveTemps = isEditingThisInt ? crMo : (printInt.tempsPasse || 'Non spécifié');
              const liveArret = isEditingThisInt ? crArret : (printInt.tempsArret?.replace(/[^\d.]/g, '') || '');
              const liveCause = isEditingThisInt ? crCause : (printInt.cause || 'N/A');
              const liveRemede = isEditingThisInt ? crRemede : (printInt.remede || 'N/A');
              const liveCompteRendu = isEditingThisInt ? crText : (printInt.compteRendu || 'Aucun compte rendu rédigé.');
              const liveOperateur = isEditingThisInt ? crOperateur : (printInt.technicienCloture || printInt.operateur || 'N/A');
              const liveImputation = isEditingThisInt ? crImputation : (printInt.imputation || 'N/A');

              if (printInt.statut !== 'Soldé' && printInt.statut !== 'Clôturé' && !isEditingThisInt) {
                return (
                  <div className="border border-dashed border-gray-400 p-6 rounded text-center text-gray-500 italic">
                    Ce Bon de Travail est actuellement EN COURS de traitement.<br />Le rapport de clôture sera généré automatiquement une fois le bon soldé par le technicien.
                  </div>
                );
              }

              return (
                <div className="border border-gray-300 p-3 rounded space-y-3 text-black">
                  <div className="grid grid-cols-4 gap-3 bg-gray-50 p-2 border border-gray-200 rounded">
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase font-bold flex items-center gap-1">
                        <span>Activité</span>
                        {liveActivite ? (
                          <CheckCircle size={10} className="text-emerald-500 no-print print:hidden shrink-0 animate-fade-in" />
                        ) : null}
                      </p>
                      <p className="font-bold">{liveActivite}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase font-bold flex items-center gap-1">
                        <span>Technologie</span>
                        {liveTechno ? (
                          <CheckCircle size={10} className="text-emerald-500 no-print print:hidden shrink-0 animate-fade-in" />
                        ) : null}
                      </p>
                      <p className="font-bold">{liveTechno}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase font-bold flex items-center gap-1">
                        <span>Temps Passé</span>
                        {liveTemps ? (
                          <CheckCircle size={10} className="text-emerald-500 no-print print:hidden shrink-0 animate-fade-in" />
                        ) : null}
                      </p>
                      <p className="font-bold">{liveTemps ? (liveTemps.includes('H') || liveTemps.includes('h') ? liveTemps : `${liveTemps} H`) : 'Non spécifié'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase font-bold flex items-center gap-1">
                        <span>Temps d'Arrêt</span>
                        {liveArret ? (
                          <CheckCircle size={10} className="text-emerald-500 no-print print:hidden shrink-0 animate-fade-in" />
                        ) : null}
                      </p>
                      <p className="font-bold">{liveArret ? (liveArret.includes('H') || liveArret.includes('h') ? liveArret : `${liveArret} H`) : 'Aucun'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t pt-2">
                    <div>
                      <p className="flex items-center gap-1">
                        <strong>Cause de la défaillance :</strong>
                        {liveCause ? (
                          <CheckCircle size={10} className="text-emerald-500 no-print print:hidden shrink-0 animate-fade-in" />
                        ) : null}
                      </p>
                      <p className="font-semibold bg-gray-50 p-1.5 rounded border">{liveCause}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1">
                        <strong>Remède / Action réalisée :</strong>
                        {liveRemede ? (
                          <CheckCircle size={10} className="text-emerald-500 no-print print:hidden shrink-0 animate-fade-in" />
                        ) : null}
                      </p>
                      <p className="font-semibold bg-gray-50 p-1.5 rounded border">{liveRemede}</p>
                    </div>
                  </div>

                  <div className="border-t pt-2">
                    <p className="flex items-center gap-1">
                      <strong>Compte-rendu technique détaillé :</strong>
                      {liveCompteRendu && liveCompteRendu !== 'Aucun compte rendu rédigé.' ? (
                        <CheckCircle size={10} className="text-emerald-500 no-print print:hidden shrink-0 animate-fade-in" />
                      ) : null}
                    </p>
                    <p className="bg-gray-50 p-2 rounded border leading-relaxed whitespace-pre-wrap font-medium">{liveCompteRendu}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t pt-2 text-[10px]">
                    <p className="flex items-center gap-1">
                      <strong>Technicien intervenant :</strong> <span className="font-semibold">{liveOperateur}</span>
                      {liveOperateur ? (
                        <CheckCircle size={10} className="text-emerald-500 no-print print:hidden shrink-0 animate-fade-in" />
                      ) : null}
                    </p>
                    <p className="flex items-center gap-1">
                      <strong>Budget d'imputation :</strong> <span className="font-semibold">{liveImputation}</span>
                      {liveImputation ? (
                        <CheckCircle size={10} className="text-emerald-500 no-print print:hidden shrink-0 animate-fade-in" />
                      ) : null}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Section 4 */}
          <div className="mb-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider bg-black text-white px-2 py-1 mb-2">IV. PIÈCES DE RECHANGE CONSOMMÉES</h3>
            {printInt.piecesConso ? (
              <table className="w-full border-collapse border border-gray-300 text-left text-black">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 font-bold text-[10px] uppercase w-12 text-center">N°</th>
                    <th className="border border-gray-300 p-2 font-bold text-[10px] uppercase">Désignation de la pièce</th>
                    <th className="border border-gray-300 p-2 font-bold text-[10px] uppercase w-24 text-right">Quantité</th>
                  </tr>
                </thead>
                <tbody>
                  {printInt.piecesConso.split(',').map((partStr, index) => {
                    const trimmed = partStr.trim();
                    const match = trimmed.match(/(.*?)\s+x\s*(\d+)$/i);
                    const nom = match ? match[1] : trimmed;
                    const qte = match ? match[2] : '1';
                    return (
                      <tr key={index}>
                        <td className="border border-gray-300 p-2 text-center font-medium">{index + 1}</td>
                        <td className="border border-gray-300 p-2 font-bold">{nom}</td>
                        <td className="border border-gray-300 p-2 text-right font-bold font-mono">{qte}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="border border-gray-300 p-3 rounded text-center text-gray-500 italic bg-gray-50/50">
                Aucune pièce détachée n'a été prélevée du stock pour cette intervention.
              </div>
            )}
          </div>

          {/* Section 4.5: Photos de l'intervention (Terrain) */}
          {printInt.photoUrl && (
            <div className="mb-6">
              <h3 className="text-[11px] font-bold uppercase tracking-wider bg-black text-white px-2 py-1 mb-2">V. PHOTOS DE L'INTERVENTION (TERRAIN)</h3>
              <div className="border border-gray-300 p-4 rounded bg-gray-50/50 flex flex-col items-center justify-center">
                <img 
                  src={printInt.photoUrl} 
                  alt="Photo terrain" 
                  className="max-h-64 max-w-full object-contain rounded border border-gray-300 bg-white p-1 shadow-xs" 
                />
                <p className="text-[9px] text-gray-500 mt-1.5 italic text-center">Cliché photographique joint par le technicien lors de la clôture des travaux</p>
              </div>
            </div>
          )}

          {/* Section 5 */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="border border-black p-3 h-32 rounded flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-600">Visa Production / Exploitant</span>
                <p className="text-[9px] text-gray-400 mt-1">"Bon pour fonctionnement & réception de la machine"</p>
              </div>
              <div className="border-t border-dashed border-gray-300 pt-1 text-[9px] text-gray-500 flex justify-between">
                <span>Date : ____/____/________</span>
                <span>Signature :</span>
              </div>
            </div>
            <div className="border border-black p-3 h-32 rounded flex flex-col justify-between items-stretch">
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-600">Visa Service Maintenance (Intervenant)</span>
                <p className="text-[9px] text-gray-400 mt-1">"Travaux finalisés conformément aux règles de l'art"</p>
              </div>
              {printInt.signatureTechnicien ? (
                <div className="flex-1 flex items-center justify-center p-1 bg-white border rounded border-gray-200 my-1 overflow-hidden h-14">
                  <img src={printInt.signatureTechnicien} alt="Visa Technicien" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                </div>
              ) : (
                <div className="flex-1 border border-dashed border-gray-200 my-1 flex items-center justify-center text-[9px] text-gray-300 font-medium">
                  Cadre Signature Technicien
                </div>
              )}
              <div className="border-t border-dashed border-gray-300 pt-1 text-[9px] text-gray-500 flex justify-between">
                <span>Date : {printInt.dateCloture ? new Date(printInt.dateCloture).toLocaleDateString('fr-FR') : '____/____/________'}</span>
                <span>Signature / Visa :</span>
              </div>
            </div>
          </div>

          {/* Absolute Footer */}
          <div className="mt-8 flex justify-between items-center text-[8px] text-gray-400 border-t border-gray-100 pt-2 font-mono">
            <span>DOCUMENT MAINTENANCE INDUSTRIELLE • CONFIDENTIEL INTERNE</span>
            <span>GMAO PRO SYSTEM • PAGE 1 / 1</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// SIMULATED BARCODE COMPONENT FOR INDUSTRIAL PRINT VALUE
const BarcodeSim = ({ value }: { value: string }) => {
  return (
    <div className="flex flex-col items-center select-none bg-white">
      <div className="flex items-stretch h-6 bg-white py-0.5">
        {Array.from({ length: 30 }).map((_, idx) => {
          const isBar = (idx * 17 + 3) % 5 !== 0;
          const isWide = idx % 7 === 0 || idx % 11 === 0;
          return (
            <div
              key={idx}
              className="bg-black"
              style={{
                width: isBar ? (isWide ? '3px' : '1px') : '0px',
                marginRight: isBar ? '1px' : '3px',
              }}
            />
          );
        })}
      </div>
      <span className="text-[9px] font-mono tracking-widest text-black mt-0.5">{value}</span>
    </div>
  );
};

export { KEYS } from '../data';
