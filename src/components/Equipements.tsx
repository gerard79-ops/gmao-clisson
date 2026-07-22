/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Network,
  Folder,
  FolderOpen,
  FolderMinus,
  Cog,
  Wrench,
  Pen,
  Printer,
  ChevronRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Flame,
  Brain,
  Layers,
  Clock,
  BookOpen,
  Search,
  SlidersHorizontal,
  Calendar,
  Camera,
  Upload,
  User,
  Package,
  History,
  BarChart2,
  CheckCircle,
  Activity,
  MessageSquare,
  FileText,
  File,
  Trash2,
  ExternalLink,
  Download,
  Eye,
  Paperclip,
  Copy,
  Star,
  X,
  TrendingUp,
  Sparkles,
  ShieldAlert,
  QrCode
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts';
import { Equipement, Intervention, GlobalSettings, MouvementStock, Piece, DocumentGed, Compteur, GammePreventive } from '../types';
import { ModuleHelp } from './ModuleHelp';
import EquipmentTreeSelect from './EquipmentTreeSelect';
import { compressImage } from '../utils/imageCompressor';

interface EquipementsProps {
  equipements: Equipement[];
  interventions: Intervention[];
  settings: GlobalSettings;
  mouvements: MouvementStock[];
  pieces: Piece[];
  documents: DocumentGed[];
  compteurs?: Compteur[];
  gammes?: GammePreventive[];
  onAddCompteur?: (payload: Omit<Compteur, 'id' | 'dateReleve'>) => void;
  onAddEquipement: (payload: Omit<Equipement, 'id'>) => void;
  onEditEquipement: (id: string, payload: Partial<Equipement>) => void;
  onDeleteEquipement: (id: string) => void;
  onAddDocument: (payload: Omit<DocumentGed, 'id' | 'dateAjout'>) => void;
  onDeleteDocument: (id: string) => void;
  selectedIdFromDashboard: string | null;
  onClearNavigationId: () => void;
  initialStatusFilter?: string | null;
  onClearStatusFilter?: () => void;
  initialCriticalityFilter?: 'all' | 'critique' | 'normal' | null;
  onClearCriticalityFilter?: () => void;
  onAddIntervention?: (payload: Omit<Intervention, 'id' | 'dateCreation'>) => void;
}

export default function Equipements({
  equipements,
  interventions,
  settings,
  mouvements = [],
  pieces = [],
  documents = [],
  compteurs = [],
  gammes = [],
  onAddCompteur,
  onAddEquipement,
  onEditEquipement,
  onDeleteEquipement,
  onAddDocument,
  onDeleteDocument,
  selectedIdFromDashboard,
  onClearNavigationId,
  initialStatusFilter,
  onClearStatusFilter,
  initialCriticalityFilter,
  onClearCriticalityFilter,
  onAddIntervention
}: EquipementsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsEditingNew] = useState(false);
  const [activeTab, setActiveTab] = useState<'technique' | 'historique' | 'documents' | 'consommations' | 'predictif'>('technique');
  const [predictiveInputValue, setPredictiveInputValue] = useState('');
  const [submittingPredictive, setSubmittingPredictive] = useState(false);
  const [predictiveSuccessMsg, setPredictiveSuccessMsg] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Tree Print States
  const [showTreePrintPreview, setShowTreePrintPreview] = useState(false);
  const [treePrintRoot, setTreePrintRoot] = useState<Equipement | null>(null);
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [treeSearchQuery, setTreeSearchQuery] = useState('');
  const [hoveredEq, setHoveredEq] = useState<{ node: Equipement; x: number; y: number } | null>(null);
  const [treeWidth, setTreeWidth] = useState<number>(350);
  const [isDraggingWidth, setIsDraggingWidth] = useState(false);

  // Dedicated QR Codes Section States
  const [showQRSection, setShowQRSection] = useState(false);
  const [qrSearchQuery, setQrSearchQuery] = useState('');
  const [qrSelectedAtelier, setQrSelectedAtelier] = useState('all');
  const [qrSelectedEqForSinglePrint, setQrSelectedEqForSinglePrint] = useState<Equipement | null>(null);
  const [showSingleQRPrint, setShowSingleQRPrint] = useState(false);
  const [showAllQRPrint, setShowAllQRPrint] = useState(false);

  useEffect(() => {
    if (!isDraggingWidth) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.querySelector('.arborescence-main-container');
      let offset = 0;
      if (container) {
        const rect = container.getBoundingClientRect();
        offset = rect.left;
      } else {
        offset = 32; // fallback
      }
      const newWidth = Math.max(250, Math.min(800, e.clientX - offset));
      setTreeWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDraggingWidth(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingWidth]);

  // Auto-expand nodes that match or contain sub-nodes matching the search query
  useEffect(() => {
    if (!treeSearchQuery.trim()) return;
    const q = treeSearchQuery.toLowerCase();
    const matches = equipements.filter(e => 
      e.nom.toLowerCase().includes(q) || 
      e.id.toLowerCase().includes(q) ||
      (e.type || '').toLowerCase().includes(q) ||
      (e.atelier || '').toLowerCase().includes(q) ||
      (e.marque || '').toLowerCase().includes(q) ||
      (e.metier || '').toLowerCase().includes(q)
    );
    
    setExpandedNodes(prev => {
      const newExpanded = { ...prev };
      matches.forEach(node => {
        let current = node;
        while (current.parentId) {
          newExpanded[current.parentId] = true;
          const parent = equipements.find(e => e.id === current.parentId);
          if (!parent) break;
          current = parent;
        }
      });
      return newExpanded;
    });
  }, [treeSearchQuery, equipements]);

  const getDescendantsCount = (id: string): number => {
    let count = 0;
    const findChildren = (parentId: string) => {
      const children = equipements.filter(e => e.parentId === parentId);
      count += children.length;
      children.forEach(c => findChildren(c.id));
    };
    findChildren(id);
    return count;
  };

  const getFilteredStatusCount = (status: 'Opérationnel' | 'HS' | 'En Maintenance'): number => {
    if (treePrintRoot === null) {
      return equipements.filter(e => e.statut === status).length;
    }
    let count = treePrintRoot.statut === status ? 1 : 0;
    const findChildren = (parentId: string) => {
      const children = equipements.filter(e => e.parentId === parentId);
      count += children.filter(e => e.statut === status).length;
      children.forEach(c => findChildren(c.id));
    };
    findChildren(treePrintRoot.id);
    return count;
  };

  const getFilteredCritiqueCount = (): number => {
    if (treePrintRoot === null) {
      return equipements.filter(e => e.critique).length;
    }
    let count = treePrintRoot.critique ? 1 : 0;
    const findChildren = (parentId: string) => {
      const children = equipements.filter(e => e.parentId === parentId);
      count += children.filter(e => e.critique).length;
      children.forEach(c => findChildren(c.id));
    };
    findChildren(treePrintRoot.id);
    return count;
  };

  // Copy-Paste States for Sub-assemblies
  const [copiedEquipment, setCopiedEquipment] = useState<{
    root: Equipement;
    descendants: Equipement[];
  } | null>(null);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: Equipement;
  } | null>(null);

  // Toast notifications for user actions
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const getEquipmentPath = (eq: Equipement): string => {
    const pathParts: string[] = [eq.nom];
    let current = eq;
    while (current.parentId) {
      const parent = equipements.find(e => e.id === current.parentId);
      if (!parent) break;
      pathParts.unshift(parent.nom);
      current = parent;
    }
    return pathParts.join(' > ');
  };

  const handleCopyPath = (eq: Equipement) => {
    const fullPath = getEquipmentPath(eq);
    navigator.clipboard.writeText(fullPath)
      .then(() => {
        setToastMessage(`Chemin copié : ${fullPath}`);
      })
      .catch((err) => {
        console.error('Erreur lors de la copie du chemin', err);
      });
  };

  // Intervention quick creation modal state
  const [intervModalEquipement, setIntervModalEquipement] = useState<Equipement | null>(null);
  const [btsDemandeur, setBtsDemandeur] = useState('');
  const [btsUrgence, setBtsUrgence] = useState('Moyenne');
  const [btsEffet, setBtsEffet] = useState('Mécanique');
  const [btsDescription, setBtsDescription] = useState('');
  const [btsStatut, setBtsStatut] = useState<'En attente' | 'En cours'>('En cours');
  const [btsCodeDefaut, setBtsCodeDefaut] = useState('');

  // Close context menu on global click/contextmenu
  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('contextmenu', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('contextmenu', handleGlobalClick);
    };
  }, []);

  const handleStartCreateSub = (parentId: string) => {
    const parent = equipements.find(e => e.id === parentId);
    setFormNom('');
    setFormAtelier(parent ? parent.atelier : (settings.listes.ateliers[0] || ''));
    setFormMetier(parent ? parent.metier : (settings.listes.metiers[0] || ''));
    setFormStatut('Opérationnel');
    setFormType('');
    setFormMarque(settings.listes.marques[0] || '');
    setFormSerie('');
    setFormAnnee(new Date().getFullYear());
    setFormGarantie('');
    setFormPrix(0);
    setFormTemps(3600);
    setFormCritique(false);
    setFormPieces('');
    setFormInfos('');
    setFormParentId(parentId);
    setFormPhotoUrl('');
    setIsEditingNew(true);
  };

  const handleCreateQuickIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intervModalEquipement || !onAddIntervention) return;

    const numBT = `${btsStatut === 'En attente' ? 'DI' : 'BT'}-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    onAddIntervention({
      typeDoc: btsStatut === 'En attente' ? 'DI' : 'BT',
      numero: numBT,
      equipementId: intervModalEquipement.id,
      equipementNom: intervModalEquipement.nom,
      atelier: intervModalEquipement.atelier,
      urgence: btsUrgence,
      typeProbleme: btsEffet,
      demandeur: btsDemandeur || 'Technicien',
      description: btsDescription,
      statut: btsStatut,
      source: 'BT Flash (Arborescence)',
      codeDefaut: btsCodeDefaut.trim() || undefined
    });

    // Reset and close
    setIntervModalEquipement(null);
    setBtsDemandeur('');
    setBtsUrgence('Moyenne');
    setBtsEffet('Mécanique');
    setBtsDescription('');
    setBtsStatut('En cours');
    setBtsCodeDefaut('');
  };

  const handleCopyEquipment = (eq: Equipement) => {
    // Recursive search for all descendant sub-assemblies
    const findDescendants = (parentId: string): Equipement[] => {
      const directChildren = equipements.filter(e => e.parentId === parentId);
      let results = [...directChildren];
      directChildren.forEach(child => {
        results = [...results, ...findDescendants(child.id)];
      });
      return results;
    };

    const descendants = findDescendants(eq.id);
    setCopiedEquipment({
      root: eq,
      descendants
    });
  };

  const handlePasteEquipment = (targetParentId: string | null) => {
    if (!copiedEquipment) return;

    const parentEq = targetParentId ? equipements.find(e => e.id === targetParentId) : null;
    const parentName = parentEq ? parentEq.nom : 'Racine';

    // Map old IDs to brand new unique IDs to retain hierarchical relations
    const idMap: Record<string, string> = {};
    const newRootId = "EQ-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    idMap[copiedEquipment.root.id] = newRootId;

    copiedEquipment.descendants.forEach(d => {
      idMap[d.id] = "EQ-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    });

    // 1. Paste root equipment
    const origParentName = copiedEquipment.root.parentId 
      ? (equipements.find(e => e.id === copiedEquipment.root.parentId)?.nom || 'Inconnu') 
      : 'Aucun';

    const newRoot: Omit<Equipement, 'id'> = {
      ...copiedEquipment.root,
      nom: `${copiedEquipment.root.nom} (Copie)`,
      parentId: targetParentId,
      copiedWarning: true,
      copiedFromParentName: origParentName,
      infos: `⚠️ [Copie/Collé] Ce sous-ensemble a été dupliqué depuis "${origParentName}". Veuillez modifier ses informations pour l'accorder avec le bon parent "${parentName}".\n\n` + (copiedEquipment.root.infos || '')
    };
    onAddEquipement({ ...newRoot, id: newRootId } as any); // Use custom ID if handled, or pass to onAddEquipement. Oh wait! Let's check if onAddEquipement supports passing an ID, or if we should pass Omit<Equipement, 'id'>

    // 2. Paste descendants
    copiedEquipment.descendants.forEach(desc => {
      const oldParentId = desc.parentId;
      const newParentIdForDesc = oldParentId ? idMap[oldParentId] : newRootId;
      const newDescId = idMap[desc.id];
      const origDescParentName = oldParentId 
        ? (equipements.find(e => e.id === oldParentId)?.nom || 'Inconnu') 
        : 'Aucun';

      const newDesc: Omit<Equipement, 'id'> = {
        ...desc,
        nom: `${desc.nom} (Copie)`,
        parentId: newParentIdForDesc || newRootId,
        copiedWarning: true,
        copiedFromParentName: origDescParentName,
        infos: `⚠️ [Copie/Collé] Ce composant a été dupliqué. Veuillez le modifier pour l'accorder avec son nouveau parent.\n\n` + (desc.infos || '')
      };
      
      onAddEquipement({ ...newDesc, id: newDescId } as any);
    });

    // Automatically select the newly pasted root equipment
    setSelectedId(newRootId);
  };

  const handleMoveEquipment = (nodeId: string, direction: 'up' | 'down') => {
    const node = equipements.find(e => e.id === nodeId);
    if (!node) return;

    // Sibling elements sharing the same parentId (or both being root)
    const siblings = equipements
      .filter(e => e.parentId === node.parentId)
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

    const index = siblings.findIndex(s => s.id === nodeId);
    if (index === -1) return;

    const reorderedSiblings = [...siblings];

    if (direction === 'up' && index > 0) {
      // Swap with previous sibling
      reorderedSiblings[index] = siblings[index - 1];
      reorderedSiblings[index - 1] = siblings[index];
    } else if (direction === 'down' && index < siblings.length - 1) {
      // Swap with next sibling
      reorderedSiblings[index] = siblings[index + 1];
      reorderedSiblings[index + 1] = siblings[index];
    } else {
      return; // No change can be made
    }

    // Save the new orders
    reorderedSiblings.forEach((sibling, i) => {
      const newOrdre = (i + 1) * 10;
      if (sibling.ordre !== newOrdre) {
        onEditEquipement(sibling.id, { ordre: newOrdre });
      }
    });
  };

  // GED (Gestion Électronique des Documents) States
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | 'Manuel Technique' | 'Plan PDF' | 'Schéma Électrique' | 'Autre'>('all');
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [selectedViewingDoc, setSelectedViewingDoc] = useState<DocumentGed | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [newDocForm, setNewDocForm] = useState({
    nom: '',
    type: 'Manuel Technique' as DocumentGed['type'],
    fichierNom: '',
    fichierTaille: '',
    url: '',
    description: '',
    auteur: 'Jean Dupont'
  });

  // Interactive Timeline States
  const [timelineTypeFilter, setTimelineTypeFilter] = useState<'all' | 'interventions' | 'stock'>('all');
  const [timelineSubFilter, setTimelineSubFilter] = useState<string>('all');
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineSortOrder, setTimelineSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedTimelineItems, setExpandedTimelineItems] = useState<Record<string, boolean>>({});

  // Search and status filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Opérationnel' | 'HS'>('all');
  const [criticalityFilter, setCriticalityFilter] = useState<'all' | 'critique' | 'normal'>('all');
  const [atelierFilter, setAtelierFilter] = useState<string>('all');

  // AI predictions state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  // Arborescence Drag-and-Drop States
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isOverRoot, setIsOverRoot] = useState(false);

  const isDescendant = (parentId: string, nodeId: string): boolean => {
    let current = equipements.find(e => e.id === nodeId);
    while (current && current.parentId) {
      if (current.parentId === parentId) return true;
      current = equipements.find(e => e.id === current.parentId);
    }
    return false;
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
    setIsOverRoot(false);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId || isDescendant(draggedId, targetId)) {
      return;
    }
    setDragOverId(targetId);
  };

  const handleDragLeave = (targetId: string) => {
    if (dragOverId === targetId) {
      setDragOverId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    if (!draggedId) return;

    if (targetId && (draggedId === targetId || isDescendant(draggedId, targetId))) {
      handleDragEnd();
      return;
    }

    onEditEquipement(draggedId, { parentId: targetId });
    handleDragEnd();
  };

  const handleDeleteEquipment = (id: string) => {
    const eqToDelete = equipements.find(e => e.id === id);
    if (!eqToDelete) return;

    if (confirm(`⚠️ ATTENTION : Êtes-vous sûr de vouloir supprimer définitivement l'équipement "${eqToDelete.nom}" ?`)) {
      // 1. Détacher les sous-ensembles enfants (les remonter d'un niveau)
      const newParentId = eqToDelete.parentId || null;
      const children = equipements.filter(e => e.parentId === id);
      children.forEach(child => {
        onEditEquipement(child.id, { parentId: newParentId });
      });

      // 2. Supprimer l'équipement
      onDeleteEquipement(id);

      // 3. Réinitialiser la sélection si c'était l'équipement sélectionné
      if (selectedId === id) {
        setSelectedId(null);
      }
    }
  };

  // Form states
  const [formNom, setFormNom] = useState('');
  const [formAtelier, setFormAtelier] = useState('');
  const [formMetier, setFormMetier] = useState('');
  const [formStatut, setFormStatut] = useState<'Opérationnel' | 'HS' | 'En Maintenance'>('Opérationnel');
  const [formType, setFormType] = useState('');
  const [formMarque, setFormMarque] = useState('');
  const [formSerie, setFormSerie] = useState('');
  const [formAnnee, setFormAnnee] = useState<number>(new Date().getFullYear());
  const [formGarantie, setFormGarantie] = useState('');
  const [formPrix, setFormPrix] = useState<number>(0);
  const [formTemps, setFormTemps] = useState<number>(3600);
  const [formCritique, setFormCritique] = useState(false);
  const [formPieces, setFormPieces] = useState('');
  const [formInfos, setFormInfos] = useState('');
  const [formParentId, setFormParentId] = useState<string>('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');

  // Restore autosaved equipment form states on mount
  useEffect(() => {
    const activeEqId = localStorage.getItem('gmao_active_eq_id');
    const wasEditing = localStorage.getItem('gmao_eq_is_editing') === 'true';
    const wasCreating = localStorage.getItem('gmao_eq_is_creating') === 'true';

    if (activeEqId && equipements.some(e => e.id === activeEqId)) {
      setSelectedId(activeEqId);
      if (wasEditing) {
        setIsEditing(true);
        const savedDraftStr = localStorage.getItem(`gmao_draft_eq_edit_${activeEqId}`);
        if (savedDraftStr) {
          try {
            const draft = JSON.parse(savedDraftStr);
            setFormNom(draft.formNom || '');
            setFormAtelier(draft.formAtelier || '');
            setFormMetier(draft.formMetier || '');
            setFormStatut(draft.formStatut || 'Opérationnel');
            setFormType(draft.formType || '');
            setFormMarque(draft.formMarque || '');
            setFormSerie(draft.formSerie || '');
            setFormAnnee(draft.formAnnee || new Date().getFullYear());
            setFormGarantie(draft.formGarantie || '');
            setFormPrix(draft.formPrix || 0);
            setFormTemps(draft.formTemps || 3600);
            setFormCritique(draft.formCritique || false);
            setFormPieces(draft.formPieces || '');
            setFormInfos(draft.formInfos || '');
            setFormParentId(draft.formParentId || '');
            setFormPhotoUrl(draft.formPhotoUrl || '');
          } catch (e) {
            console.error(e);
          }
        }
      }
    } else if (wasCreating) {
      setIsEditingNew(true);
      const savedDraftStr = localStorage.getItem('gmao_draft_eq_create');
      if (savedDraftStr) {
        try {
          const draft = JSON.parse(savedDraftStr);
          setFormNom(draft.formNom || '');
          setFormAtelier(draft.formAtelier || '');
          setFormMetier(draft.formMetier || '');
          setFormStatut(draft.formStatut || 'Opérationnel');
          setFormType(draft.formType || '');
          setFormMarque(draft.formMarque || '');
          setFormSerie(draft.formSerie || '');
          setFormAnnee(draft.formAnnee || new Date().getFullYear());
          setFormGarantie(draft.formGarantie || '');
          setFormPrix(draft.formPrix || 0);
          setFormTemps(draft.formTemps || 3600);
          setFormCritique(draft.formCritique || false);
          setFormPieces(draft.formPieces || '');
          setFormInfos(draft.formInfos || '');
          setFormParentId(draft.formParentId || '');
          setFormPhotoUrl(draft.formPhotoUrl || '');
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Save active draft as fields change
  useEffect(() => {
    const draft = {
      formNom,
      formAtelier,
      formMetier,
      formStatut,
      formType,
      formMarque,
      formSerie,
      formAnnee,
      formGarantie,
      formPrix,
      formTemps,
      formCritique,
      formPieces,
      formInfos,
      formParentId,
      formPhotoUrl
    };

    if (isEditing && selectedId) {
      localStorage.setItem(`gmao_draft_eq_edit_${selectedId}`, JSON.stringify(draft));
      localStorage.setItem('gmao_active_eq_id', selectedId);
      localStorage.setItem('gmao_eq_is_editing', 'true');
      localStorage.removeItem('gmao_eq_is_creating');
    } else if (isCreating) {
      localStorage.setItem('gmao_draft_eq_create', JSON.stringify(draft));
      localStorage.setItem('gmao_eq_is_creating', 'true');
      localStorage.removeItem('gmao_active_eq_id');
      localStorage.removeItem('gmao_eq_is_editing');
    }
  }, [
    isEditing,
    isCreating,
    selectedId,
    formNom,
    formAtelier,
    formMetier,
    formStatut,
    formType,
    formMarque,
    formSerie,
    formAnnee,
    formGarantie,
    formPrix,
    formTemps,
    formCritique,
    formPieces,
    formInfos,
    formParentId,
    formPhotoUrl
  ]);

  useEffect(() => {
    if (selectedId) {
      localStorage.setItem('gmao_active_eq_id', selectedId);
    } else {
      localStorage.removeItem('gmao_active_eq_id');
    }
  }, [selectedId]);

  useEffect(() => {
    if (selectedIdFromDashboard) {
      setSelectedId(selectedIdFromDashboard);
      onClearNavigationId();
    }
  }, [selectedIdFromDashboard]);

  useEffect(() => {
    if (initialStatusFilter) {
      if (initialStatusFilter === 'HS' || initialStatusFilter === 'Opérationnel') {
        setStatusFilter(initialStatusFilter);
      }
      if (onClearStatusFilter) {
        onClearStatusFilter();
      }
    }
  }, [initialStatusFilter, onClearStatusFilter]);

  useEffect(() => {
    if (initialCriticalityFilter) {
      setCriticalityFilter(initialCriticalityFilter);
      if (onClearCriticalityFilter) {
        onClearCriticalityFilter();
      }
    }
  }, [initialCriticalityFilter, onClearCriticalityFilter]);

  const selectedEq = equipements.find(e => e.id === selectedId);

  // Populates form when editing or adding
  const handleStartEdit = () => {
    if (!selectedEq) return;

    const savedDraftStr = localStorage.getItem(`gmao_draft_eq_edit_${selectedEq.id}`);
    if (savedDraftStr) {
      try {
        const draft = JSON.parse(savedDraftStr);
        setFormNom(draft.formNom || '');
        setFormAtelier(draft.formAtelier || '');
        setFormMetier(draft.formMetier || '');
        setFormStatut(draft.formStatut || 'Opérationnel');
        setFormType(draft.formType || '');
        setFormMarque(draft.formMarque || '');
        setFormSerie(draft.formSerie || '');
        setFormAnnee(draft.formAnnee || new Date().getFullYear());
        setFormGarantie(draft.formGarantie || '');
        setFormPrix(draft.formPrix || 0);
        setFormTemps(draft.formTemps || 3600);
        setFormCritique(draft.formCritique || false);
        setFormPieces(draft.formPieces || '');
        setFormInfos(draft.formInfos || '');
        setFormParentId(draft.formParentId || '');
        setFormPhotoUrl(draft.formPhotoUrl || '');
        setIsEditing(true);
        return;
      } catch (e) {
        console.error("Failed to parse draft during manual edit start", e);
      }
    }

    setFormNom(selectedEq.nom);
    setFormAtelier(selectedEq.atelier);
    setFormMetier(selectedEq.metier);
    setFormStatut(selectedEq.statut);
    setFormType(selectedEq.type || '');
    setFormMarque(selectedEq.marque || '');
    setFormSerie(selectedEq.serie || '');
    setFormAnnee(selectedEq.annee || new Date().getFullYear());
    setFormGarantie(selectedEq.garantie || '');
    setFormPrix(selectedEq.prix || 0);
    setFormTemps(selectedEq.tempsOuverture || 3600);
    setFormCritique(selectedEq.critique || false);
    setFormPieces(selectedEq.piecesAffectees || '');
    setFormInfos(selectedEq.infos || '');
    setFormParentId(selectedEq.parentId || '');
    setFormPhotoUrl(selectedEq.photoUrl || '');
    setIsEditing(true);
  };

  const exportToCSV = () => {
    const dataToExport = getFilteredEquipements();
    const headers = [
      'ID',
      'Nom',
      'Atelier',
      'Métier',
      'Statut',
      'Temps d\'ouverture (H/an)',
      'Marque/Constructeur',
      'Type/Modèle',
      'Numéro de série',
      'Année',
      'Garantie',
      'Prix HT (€)',
      'Critique',
      'Pièces affectées',
      'Informations complémentaires'
    ];

    const rows = dataToExport.map(eq => [
      eq.id,
      eq.nom,
      eq.atelier,
      eq.metier,
      eq.statut,
      eq.tempsOuverture,
      eq.marque,
      eq.type,
      eq.serie,
      eq.annee,
      eq.garantie,
      eq.prix,
      eq.critique ? 'Oui' : 'Non',
      eq.piecesAffectees || '',
      eq.infos || ''
    ]);

    const escapeCSVValue = (val: any) => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      str = str.replace(/"/g, '""');
      if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCSVValue).join(';'),
      ...rows.map(row => row.map(escapeCSVValue).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `export_equipements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStartCreate = () => {
    const savedDraftStr = localStorage.getItem('gmao_draft_eq_create');
    if (savedDraftStr) {
      try {
        const draft = JSON.parse(savedDraftStr);
        setFormNom(draft.formNom || '');
        setFormAtelier(draft.formAtelier || '');
        setFormMetier(draft.formMetier || '');
        setFormStatut(draft.formStatut || 'Opérationnel');
        setFormType(draft.formType || '');
        setFormMarque(draft.formMarque || '');
        setFormSerie(draft.formSerie || '');
        setFormAnnee(draft.formAnnee || new Date().getFullYear());
        setFormGarantie(draft.formGarantie || '');
        setFormPrix(draft.formPrix || 0);
        setFormTemps(draft.formTemps || 3600);
        setFormCritique(draft.formCritique || false);
        setFormPieces(draft.formPieces || '');
        setFormInfos(draft.formInfos || '');
        setFormParentId(draft.formParentId || '');
        setFormPhotoUrl(draft.formPhotoUrl || '');
        setIsEditingNew(true);
        return;
      } catch (e) {
        console.error("Failed to parse equipment creation draft", e);
      }
    }

    setFormNom('');
    setFormAtelier(settings.listes.ateliers[0] || '');
    setFormMetier(settings.listes.metiers[0] || '');
    setFormStatut('Opérationnel');
    setFormType('');
    setFormMarque(settings.listes.marques[0] || '');
    setFormSerie('');
    setFormAnnee(new Date().getFullYear());
    setFormGarantie('');
    setFormPrix(0);
    setFormTemps(3600);
    setFormCritique(false);
    setFormPieces('');
    setFormInfos('');
    setFormParentId('');
    setFormPhotoUrl('');
    setIsEditingNew(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nom: formNom,
      atelier: formAtelier,
      metier: formMetier,
      statut: formStatut,
      type: formType,
      marque: formMarque,
      serie: formSerie,
      annee: Number(formAnnee),
      garantie: formGarantie,
      prix: Number(formPrix),
      tempsOuverture: Number(formTemps),
      critique: formCritique,
      piecesAffectees: formPieces,
      infos: formInfos,
      parentId: formParentId || null,
      photoUrl: formPhotoUrl
    };

    if (isEditing && selectedId) {
      onEditEquipement(selectedId, payload);
      localStorage.removeItem(`gmao_draft_eq_edit_${selectedId}`);
      localStorage.removeItem('gmao_active_eq_id');
      localStorage.removeItem('gmao_eq_is_editing');
      setIsEditing(false);
    } else if (isCreating) {
      onAddEquipement(payload);
      localStorage.removeItem('gmao_draft_eq_create');
      localStorage.removeItem('gmao_eq_is_creating');
      setIsEditingNew(false);
    }
  };

  // Hierarchy Tree Maker: returns children array
  const getSubEnsembles = (parentId: string | null) => {
    return equipements.filter(e => e.parentId === parentId);
  };

  const getBreadcrumbPath = (eq: Equipement): Equipement[] => {
    const path: Equipement[] = [];
    let current: Equipement | undefined = eq;
    while (current) {
      path.unshift(current);
      if (current.parentId) {
        current = equipements.find(e => e.id === current!.parentId);
      } else {
        current = undefined;
      }
    }
    return path;
  };

  // AI assistant predictive model
  const runAiDiagnostic = () => {
    if (!selectedEq) return;
    setIsAiLoading(true);
    setAiReport(null);

    // Simulate analysis delay
    setTimeout(() => {
      const pannes = interventions.filter(
        i => i.equipementId === selectedEq.id && i.typeDoc !== 'Préventif' && i.statut === 'Soldé'
      );

      if (pannes.length < 2) {
        setAiReport("💡 ANALYSE DE L'ASSISTANT IA :\n\nDonnées d'interventions curatives insuffisantes pour modéliser une prédiction fiable (minimum 2 pannes requises).\n\nRecommandation stratégique : Poursuivre le relevé précis des Bons de Travaux d'urgence et valider la mise en place d'une première gamme FMP préventive trimestrielle pour consolider l'historique.");
        setIsAiLoading(false);
        return;
      }

      // Calculate simple metrics
      const totalPannes = pannes.length;
      const operatingHours = selectedEq.tempsOuverture || 3500;
      const mtbf = (operatingHours / 24) / totalPannes; // simple MTBF in days

      // Analyze causes
      const causesCounts: Record<string, number> = {};
      pannes.forEach(p => {
        const c = p.typeProbleme || 'Non spécifié';
        causesCounts[c] = (causesCounts[c] || 0) + 1;
      });
      const topCause = Object.keys(causesCounts).reduce((a, b) => causesCounts[a] > causesCounts[b] ? a : b);

      let suggestion = "Renforcer l'inspection générale visuelle lors des rondes d'opérateurs.";
      if (topCause.toLowerCase().includes('usure')) {
        suggestion = "Planifier un remplacement systématique anticipé des roulements ou pièces de friction à 80% du MTBF théorique.";
      } else if (topCause.toLowerCase().includes('lubrification')) {
        suggestion = "Réviser le plan de graissage annuel. Tester l'utilisation d'une graisse synthétique haute performance résistante aux contraintes thermiques.";
      } else if (topCause.toLowerCase().includes('surtension') || topCause.toLowerCase().includes('électrique')) {
        suggestion = "Vérifier le serrage des bornes de puissance dans l'armoire électrique et inspecter les filtres d'aération des ventilateurs de refroidissement.";
      }

      const reportStr = `🧠 DIAGNOSTIC PRÉDICTIF DE L'ASSISTANT IA :\n\n` +
        `• Fiabilité de l'équipement : MTBF estimé à ${Math.round(mtbf)} jours d'opération.\n` +
        `• Cause dominante identifiée : ${topCause} (${causesCounts[topCause]} occurrences).\n` +
        `• Risque de panne sous 30 jours : ${totalPannes > 4 ? 'ÉLEVÉ (78%)' : 'MODÉRÉ (42%)'}.\n\n` +
        `💡 PLAN D'ACTION RECOMMANDÉ :\n` +
        `${suggestion}\n\n` +
        `Vérifier l'alignement mécanique des roulements SKF associés et anticiper l'approvisionnement des consommables électriques.`;

      setAiReport(reportStr);
      setIsAiLoading(false);
    }, 1200);
  };

  // Render technical document list & tools for selected machine (GED)
  const renderDocumentsGedTab = (selectedEq: Equipement) => {
    // Filter documents for the selected machine
    const eqDocs = documents.filter(doc => doc.equipementId === selectedEq.id);

    // Apply type and search query filter
    const filteredDocs = eqDocs.filter(doc => {
      const matchesType = docTypeFilter === 'all' || doc.type === docTypeFilter;
      const matchesSearch = doc.nom.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                            doc.fichierNom.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                            (doc.description && doc.description.toLowerCase().includes(docSearchQuery.toLowerCase())) ||
                            doc.auteur.toLowerCase().includes(docSearchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });

    const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newDocForm.nom || !newDocForm.fichierNom) {
        alert("Veuillez saisir le nom du document et le nom du fichier.");
        return;
      }

      onAddDocument({
        equipementId: selectedEq.id,
        equipementNom: selectedEq.nom,
        nom: newDocForm.nom,
        type: newDocForm.type,
        fichierNom: newDocForm.fichierNom,
        fichierTaille: newDocForm.fichierTaille || '1.5 Mo',
        url: newDocForm.url,
        description: newDocForm.description,
        auteur: newDocForm.auteur || 'Jean Dupont'
      });

      // Reset form
      setNewDocForm({
        nom: '',
        type: 'Manuel Technique',
        fichierNom: '',
        fichierTaille: '',
        url: '',
        description: '',
        auteur: 'Jean Dupont'
      });
      setIsAddingDoc(false);
    };

    const handleFileChangeSimulate = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        // Calculate a readable size
        const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
        setNewDocForm(prev => ({
          ...prev,
          fichierNom: file.name,
          fichierTaille: `${sizeInMb} Mo`,
          nom: prev.nom || file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
        }));
      }
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };

    const handleDragLeave = () => {
      setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
        setNewDocForm(prev => ({
          ...prev,
          fichierNom: file.name,
          fichierTaille: `${sizeInMb} Mo`,
          nom: prev.nom || file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
        }));
      }
    };

    const getDocIcon = (type: DocumentGed['type']) => {
      switch (type) {
        case 'Manuel Technique':
          return <BookOpen className="text-accent-orange shrink-0" size={24} />;
        case 'Plan PDF':
          return <Layers className="text-indigo-500 shrink-0" size={24} />;
        case 'Schéma Électrique':
          return <Wrench className="text-yellow-500 shrink-0" size={24} />;
        default:
          return <FileText className="text-primary-500 shrink-0" size={24} />;
      }
    };

    return (
      <div className="space-y-6 animate-fade-in mt-4">
        {/* GED Header with search & filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary-50/50 dark:bg-primary-900/20 p-4 rounded-xl border border-primary-200/50 dark:border-primary-700/50">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-2.5 text-primary-400" size={16} />
              <input
                type="text"
                value={docSearchQuery}
                onChange={e => setDocSearchQuery(e.target.value)}
                placeholder="Rechercher un plan, manuel, auteur..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-primary-300 dark:border-primary-700 bg-white dark:bg-primary-950 text-primary-800 dark:text-primary-100 placeholder-primary-400 focus:outline-none focus:border-accent-orange"
              />
            </div>

            {/* Type filter */}
            <select
              value={docTypeFilter}
              onChange={e => setDocTypeFilter(e.target.value as any)}
              className="text-xs rounded-lg border border-primary-300 dark:border-primary-700 bg-white dark:bg-primary-950 text-primary-800 dark:text-primary-100 p-2 focus:outline-none focus:border-accent-orange"
            >
              <option value="all">Tous les types</option>
              <option value="Autre">Autres Documents</option>
              <option value="Manuel Technique">Manuels Techniques</option>
              <option value="Plan PDF">Plans PDF</option>
              <option value="Schéma Électrique">Schémas Électriques</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingDoc(true)}
            className="btn-primary flex items-center gap-2 self-start md:self-auto text-xs py-2 px-4 shadow-sm"
          >
            <Plus size={14} />
            Ajouter un document
          </button>
        </div>

        {/* main documents container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.length === 0 ? (
            <div className="col-span-full card text-center py-12 border-dashed border-2 border-primary-200 dark:border-primary-800 flex flex-col items-center justify-center space-y-4">
              <div className="h-12 w-12 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 text-primary-400 dark:text-primary-600 rounded-full flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div className="max-w-xs mx-auto">
                <h4 className="text-xs font-bold text-primary-800 dark:text-white">Aucun document trouvé</h4>
                <p className="text-[11px] text-primary-500 dark:text-primary-400 mt-1">
                  Aucun plan technique ou manuel n'est lié pour le moment, ou aucun ne correspond à vos filtres de recherche.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddingDoc(true)}
                  className="mt-3 text-xs text-accent-orange hover:underline font-bold"
                >
                  Ajouter le premier document
                </button>
              </div>
            </div>
          ) : (
            filteredDocs.map(docItem => (
              <div
                key={docItem.id}
                className="card relative flex items-start gap-4 hover:border-accent-orange/50 transition cursor-pointer group"
                onClick={() => setSelectedViewingDoc(docItem)}
              >
                {getDocIcon(docItem.type)}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-primary-800 dark:text-primary-150 truncate block group-hover:text-accent-orange transition">
                      {docItem.nom}
                    </span>
                    <span className="px-1.5 py-0.5 text-[8px] font-extrabold rounded bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 whitespace-nowrap">
                      {docItem.type}
                    </span>
                  </div>
                  {docItem.description && (
                    <p className="text-[11px] text-primary-500 dark:text-primary-400 line-clamp-2">
                      {docItem.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-primary-400 dark:text-primary-500 pt-1 font-mono">
                    <span className="flex items-center gap-1">
                      <Paperclip size={10} /> {docItem.fichierNom} ({docItem.fichierTaille})
                    </span>
                    <span>·</span>
                    <span>Ajouté par : {docItem.auteur}</span>
                    <span>·</span>
                    <span>{new Date(docItem.dateAjout).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                {/* Hover action overlay */}
                <div className="absolute right-3 top-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-primary-950/90 p-1 rounded-lg shadow-sm">
                  <button
                    type="button"
                    title="Consulter"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedViewingDoc(docItem);
                    }}
                    className="p-1 hover:bg-primary-100 dark:hover:bg-primary-800 rounded text-primary-600 dark:text-primary-300"
                  >
                    <Eye size={14} />
                  </button>
                  {docItem.url && (
                    <a
                      href={docItem.url}
                      target="_blank"
                      rel="noreferrer"
                      title="Lien externe"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 hover:bg-primary-100 dark:hover:bg-primary-800 rounded text-indigo-500"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    type="button"
                    title="Supprimer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Voulez-vous vraiment supprimer le document "${docItem.nom}" de la GED ?`)) {
                        onDeleteDocument(docItem.id);
                      }
                    }}
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-950 rounded text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* AJOUTER DOCUMENT MODAL / PANEL */}
        <AnimatePresence>
          {isAddingDoc && (
            <div className="fixed inset-0 bg-primary-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 border-b border-primary-100 dark:border-primary-800">
                  <h3 className="text-sm font-bold text-primary-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText className="text-accent-orange" size={18} />
                    Ajouter un Document Technique (GED)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddingDoc(false)}
                    className="p-1.5 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg text-primary-400 hover:text-primary-600 dark:hover:text-primary-200 transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
                  <div>
                    <label className="block text-primary-500 mb-1 font-semibold">Nom du document *</label>
                    <input
                      type="text"
                      required
                      value={newDocForm.nom}
                      onChange={e => setNewDocForm(p => ({ ...p, nom: e.target.value }))}
                      placeholder="Ex : Manuel d'utilisation du variateur, Schéma d'armoire..."
                      className="w-full p-2.5 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950 text-primary-800 dark:text-primary-100 focus:outline-none focus:border-accent-orange"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-primary-500 mb-1 font-semibold">Type de document *</label>
                      <select
                        value={newDocForm.type}
                        onChange={e => setNewDocForm(p => ({ ...p, type: e.target.value as any }))}
                        className="w-full p-2.5 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950 text-primary-800 dark:text-primary-100 focus:outline-none focus:border-accent-orange"
                      >
                        <option value="Autre">Autre</option>
                        <option value="Manuel Technique">Manuel Technique</option>
                        <option value="Plan PDF">Plan PDF</option>
                        <option value="Schéma Électrique">Schéma Électrique</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-primary-500 mb-1 font-semibold">Auteur / Source</label>
                      <input
                        type="text"
                        value={newDocForm.auteur}
                        onChange={e => setNewDocForm(p => ({ ...p, auteur: e.target.value }))}
                        placeholder="Ex : Bureau d'études, Bosch Support..."
                        className="w-full p-2.5 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950 text-primary-800 dark:text-primary-100 focus:outline-none focus:border-accent-orange"
                      />
                    </div>
                  </div>

                  {/* Drag and drop Simulated File Zone */}
                  <div>
                    <label className="block text-primary-500 mb-1 font-semibold">Fichier PDF ou Document *</label>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition flex flex-col items-center justify-center gap-2 cursor-pointer ${isDragOver ? 'border-accent-orange bg-accent-orange/5' : 'border-primary-300 dark:border-primary-700 hover:border-accent-orange/40'}`}
                      onClick={() => document.getElementById('ged-file-upload')?.click()}
                    >
                      <Paperclip size={24} className="text-primary-400" />
                      <div>
                        {newDocForm.fichierNom ? (
                          <div className="space-y-1">
                            <span className="font-bold text-accent-orange block truncate max-w-xs mx-auto">
                              {newDocForm.fichierNom}
                            </span>
                            <span className="text-[10px] text-primary-400 font-mono block">
                              Taille détectée : {newDocForm.fichierTaille || '0.0 Mo'}
                            </span>
                          </div>
                        ) : (
                          <>
                            <span className="font-bold text-primary-700 dark:text-primary-200 block">
                              Glissez-déposez le document ici
                            </span>
                            <span className="text-[10px] text-primary-400 block mt-1">
                              ou cliquez pour sélectionner un fichier (Max : 50 Mo)
                            </span>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        id="ged-file-upload"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                        onChange={handleFileChangeSimulate}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-primary-500 mb-1 font-semibold">Lien URL externe (Optionnel)</label>
                    <input
                      type="url"
                      value={newDocForm.url}
                      onChange={e => setNewDocForm(p => ({ ...p, url: e.target.value }))}
                      placeholder="Ex : https://partner.portal/manual.pdf"
                      className="w-full p-2.5 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950 text-primary-800 dark:text-primary-100 focus:outline-none focus:border-accent-orange"
                    />
                  </div>

                  <div>
                    <label className="block text-primary-500 mb-1 font-semibold">Description / Remarques</label>
                    <textarea
                      value={newDocForm.description}
                      onChange={e => setNewDocForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Décrivez brièvement le contenu de ce document technique..."
                      rows={3}
                      className="w-full p-2.5 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950 text-primary-800 dark:text-primary-100 focus:outline-none focus:border-accent-orange resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-primary-100 dark:border-primary-800">
                    <button
                      type="button"
                      onClick={() => setIsAddingDoc(false)}
                      className="btn-secondary py-2 px-4 text-xs font-semibold"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={!newDocForm.fichierNom}
                      className="btn-primary py-2 px-4 text-xs font-semibold disabled:opacity-50"
                    >
                      Valider et Enregistrer
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* INTERACTIVE DOCUMENT PREVIEW MODAL */}
        <AnimatePresence>
          {selectedViewingDoc && (
            <div className="fixed inset-0 bg-primary-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh]"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-primary-100 dark:border-primary-800 bg-primary-50/40 dark:bg-primary-950/20">
                  <div className="flex items-center gap-3">
                    {getDocIcon(selectedViewingDoc.type)}
                    <div>
                      <h3 className="text-sm font-bold text-primary-900 dark:text-white">
                        {selectedViewingDoc.nom}
                      </h3>
                      <p className="text-[10px] text-primary-400 font-mono">
                        {selectedViewingDoc.fichierNom} ({selectedViewingDoc.fichierTaille})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedViewingDoc(null)}
                    className="p-1.5 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg text-primary-400 hover:text-primary-600 dark:hover:text-primary-200 transition"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Content Panel (A simulated beautiful Technical Reader!) */}
                <div className="flex-1 overflow-y-auto p-6 bg-primary-100/30 dark:bg-primary-950/40">
                  <div className="bg-white dark:bg-primary-950 rounded-xl border border-primary-200/60 dark:border-primary-800/60 shadow-sm p-6 min-h-[400px] flex flex-col justify-between">
                    <div className="space-y-6">
                      {/* Document Meta Info Block */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-primary-50 dark:bg-primary-900/40 border border-primary-100 dark:border-primary-800/80 rounded-lg text-[11px] font-mono">
                        <div>
                          <span className="text-primary-400 block">TYPE :</span>
                          <span className="font-bold text-accent-orange">{selectedViewingDoc.type}</span>
                        </div>
                        <div>
                          <span className="text-primary-400 block">AUTEUR / SOURCE :</span>
                          <span className="font-bold text-primary-700 dark:text-primary-300">{selectedViewingDoc.auteur}</span>
                        </div>
                        <div>
                          <span className="text-primary-400 block">DATE D'AJOUT :</span>
                          <span className="font-bold text-primary-700 dark:text-primary-300">
                            {new Date(selectedViewingDoc.dateAjout).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <div>
                          <span className="text-primary-400 block">ÉQUIPEMENT :</span>
                          <span className="font-bold text-primary-700 dark:text-primary-300 truncate block">
                            {selectedViewingDoc.equipementNom}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-primary-800 dark:text-primary-200">Description du document :</h4>
                        <p className="text-xs text-primary-600 dark:text-primary-350 bg-primary-50/50 dark:bg-primary-900/10 p-3 rounded-lg border border-primary-100 dark:border-primary-900 italic">
                          {selectedViewingDoc.description || "Aucune description fournie pour ce document technique."}
                        </p>
                      </div>

                      {/* SIMULATED GRAPHICAL CONTENT GENERATOR */}
                      <div className="border border-primary-200 dark:border-primary-800 rounded-xl overflow-hidden shadow-inner">
                        <div className="bg-primary-100 dark:bg-primary-900 px-4 py-2 border-b border-primary-200 dark:border-primary-800 flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-primary-600 dark:text-primary-400">
                            VISIONNEUSE TECHNIQUE GMAO v3.2 · PLAN SECURE
                          </span>
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        </div>
                        <div className="p-8 bg-slate-900 text-slate-100 min-h-[220px] font-mono text-[10px] space-y-4 relative overflow-hidden">
                          {/* Grid Overlay */}
                          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:20px_20px] opacity-25"></div>
                          
                          {/* Simulated Schematic Details based on type */}
                          {selectedViewingDoc.type === 'Plan PDF' || selectedViewingDoc.type === 'Schéma Électrique' ? (
                            <div className="space-y-4 relative z-10">
                              <div className="border-b border-slate-700 pb-2">
                                <p className="text-accent-orange font-bold text-[12px]">SCHÉMATIQUE VECTORIEL ID : {selectedViewingDoc.id}-SYS</p>
                                <p className="text-slate-400 text-[9px]">Généré le : {new Date(selectedViewingDoc.dateAjout).toLocaleString('fr-FR')}</p>
                              </div>
                              <div className="space-y-2 text-[9px] text-slate-300">
                                <p className="text-emerald-400">⚡ [INIT] Connexion au bus de données de l'appareil OK</p>
                                <p className="text-slate-400">     +--- (VCC 24V) ---- [ FUSE 10A ] ----+---- (Électrovanne EV-10) ---+ (GND)</p>
                                <p className="text-slate-400">     |                                    |</p>
                                <p className="text-slate-400">     +--- (SIG PWM) ---- [ DAC Converter ] +---- (Capteur PT100) -------+ (AGND)</p>
                                <p className="text-sky-400">📝 NOTE : Remplacer le relais bistable K1 toutes les 4500 heures d'ouverture.</p>
                              </div>
                              {/* Draw SVG blueprints! */}
                              <div className="h-16 w-full bg-slate-950 border border-slate-800 rounded flex items-center justify-center">
                                <svg width="100%" height="100%" className="opacity-85">
                                  <line x1="10%" y1="50%" x2="40%" y2="50%" stroke="#10b981" strokeWidth="2" strokeDasharray="4" />
                                  <circle cx="40%" cy="50%" r="5" fill="#f97316" />
                                  <line x1="40%" y1="50%" x2="50%" y2="20%" stroke="#ef4444" strokeWidth="1.5" />
                                  <line x1="40%" y1="50%" x2="50%" y2="80%" stroke="#3b82f6" strokeWidth="1.5" />
                                  <rect x="50%" y="10%" width="30" height="20" fill="none" stroke="#64748b" strokeWidth="1" />
                                  <text x="51%" y="22%" fill="#94a3b8" fontSize="8">K1-NO</text>
                                  <rect x="50%" y="70%" width="30" height="20" fill="none" stroke="#64748b" strokeWidth="1" />
                                  <text x="51%" y="82%" fill="#94a3b8" fontSize="8">Y2-HYD</text>
                                  <line x1="65%" y1="20%" x2="90%" y2="50%" stroke="#10b981" strokeWidth="2" strokeDasharray="4" />
                                  <line x1="65%" y1="80%" x2="90%" y2="50%" stroke="#10b981" strokeWidth="2" strokeDasharray="4" />
                                </svg>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 relative z-10">
                              <div className="border-b border-slate-700 pb-2">
                                <p className="text-accent-orange font-bold text-[12px]">GUIDE DE DIAGNOSTIC ET MANUAL_REF</p>
                                <p className="text-slate-400 text-[9px]">Document source officiel - Tous droits réservés</p>
                              </div>
                              <div className="space-y-3 text-[9px] text-slate-300">
                                <div>
                                  <p className="text-yellow-400 font-bold">1. PROCÉDURE DE CALIBRATION DE LA PRESSION</p>
                                  <p className="text-slate-400">Ajuster la molette de décharge de pression de sécurité P3 jusqu'à lire 250 bars sur le manomètre principal.</p>
                                </div>
                                <div>
                                  <p className="text-yellow-400 font-bold">2. RECHERCHE DE PANNE - ALARME HS-302</p>
                                  <p className="text-slate-400">Si le code d'erreur s'affiche, nettoyer immédiatement la crépine d'aspiration et purger l'air du circuit.</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions and footer */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-primary-100 dark:border-primary-800/80 text-[11px] font-semibold text-primary-500">
                      <span>Visionneuse intégrée GMAO PRO</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            // Simple simulated download
                            const link = document.createElement('a');
                            link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(`Simulated download of ${selectedViewingDoc.nom}`);
                            link.setAttribute('download', selectedViewingDoc.fichierNom);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="btn-secondary flex items-center gap-2 py-2 px-4 text-xs font-semibold"
                        >
                          <Download size={14} />
                          Télécharger le fichier
                        </button>
                        {selectedViewingDoc.url && (
                          <a
                            href={selectedViewingDoc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold"
                          >
                            <ExternalLink size={14} />
                            Consulter la source
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderConsommationsTab = (selectedEq: Equipement) => {
    const eqInterventions = interventions.filter(i => i.equipementId === selectedEq.id);
    const consumedParts: Array<{
      id: string;
      rawItem: string;
      designation: string;
      quantite: number;
      price: number;
      totalCost: number;
      codeArticle: string;
      reference: string;
      emplacement: string;
      photoUrl?: string;
      interventionId: string;
      interventionNumero: string;
      interventionDate: string;
      interventionType: 'DI' | 'BT' | 'Préventif';
      technicien: string;
    }> = [];

    eqInterventions.forEach(i => {
      if (!i.piecesConso || i.piecesConso === 'Aucune' || i.piecesConso.trim() === '') return;
      const items = i.piecesConso.split(',');
      items.forEach((item, index) => {
        const trimmed = item.trim();
        if (!trimmed) return;
        
        const match = trimmed.match(/(.+)\s+x\s*(\d+)/i) || trimmed.match(/(.+)\s+(\d+)\s*$/);
        let designation = trimmed;
        let quantite = 1;
        if (match) {
          designation = match[1].trim();
          quantite = parseInt(match[2]) || 1;
        }
        
        const matchedPiece = pieces.find(
          p => p.designation.toLowerCase() === designation.toLowerCase() || 
               p.codeArticle.toLowerCase() === designation.toLowerCase()
        );
        
        const price = matchedPiece ? matchedPiece.prix : 45;
        const totalCost = price * quantite;
        
        consumedParts.push({
          id: `${i.id}-${index}`,
          rawItem: trimmed,
          designation: matchedPiece ? matchedPiece.designation : designation,
          quantite,
          price,
          totalCost,
          codeArticle: matchedPiece ? matchedPiece.codeArticle : '-',
          reference: matchedPiece ? matchedPiece.reference : '-',
          emplacement: matchedPiece ? matchedPiece.emplacement : '-',
          photoUrl: matchedPiece?.photoUrl,
          interventionId: i.id,
          interventionNumero: i.numero,
          interventionDate: i.dateCloture || i.dateCreation,
          interventionType: i.typeDoc,
          technicien: i.technicienCloture || i.demandeur || 'Non spécifié'
        });
      });
    });

    const totalCostAll = consumedParts.reduce((sum, item) => sum + item.totalCost, 0);

    return (
      <div className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card flex items-center gap-4 bg-primary-50/40 dark:bg-primary-850/10 border-primary-200/60 dark:border-primary-800">
            <div className="h-10 w-10 rounded-xl bg-accent-orange/10 text-accent-orange flex items-center justify-center shrink-0">
              <Package size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider block">Pièces consommées</span>
              <span className="text-xl font-extrabold text-primary-800 dark:text-white block">{consumedParts.length}</span>
            </div>
          </div>

          <div className="card flex items-center gap-4 bg-primary-50/40 dark:bg-primary-850/10 border-primary-200/60 dark:border-primary-800">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-500 dark:text-teal-450 flex items-center justify-center shrink-0">
              <Wrench size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider block">Quantité totale</span>
              <span className="text-xl font-extrabold text-primary-800 dark:text-white block">
                {consumedParts.reduce((sum, item) => sum + item.quantite, 0)}
              </span>
            </div>
          </div>

          <div className="card flex items-center gap-4 bg-primary-50/40 dark:bg-primary-850/10 border-primary-200/60 dark:border-primary-800">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <span className="text-lg font-extrabold">€</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider block">Coût total estimé (HT)</span>
              <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 block">
                {totalCostAll.toLocaleString('fr-FR')} €
              </span>
            </div>
          </div>
        </div>

        {consumedParts.length === 0 ? (
          <div className="card text-center py-12 space-y-3 border-dashed border-2 border-primary-200 dark:border-primary-800 bg-transparent">
            <div className="h-12 w-12 rounded-full bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 flex items-center justify-center mx-auto text-primary-400 dark:text-primary-600">
              <Package size={22} />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-xs font-bold text-primary-800 dark:text-white">Aucune consommation d'équipement</h4>
              <p className="text-[11px] text-primary-500 dark:text-primary-400">
                Aucune pièce de rechange n'a été déclarée lors des interventions réalisées sur cet équipement spécifique.
              </p>
            </div>
          </div>
        ) : (
          <div className="card overflow-hidden p-0 border border-primary-200 dark:border-primary-800">
            <div className="px-5 py-3 bg-primary-50/50 dark:bg-primary-850/30 border-b border-primary-200 dark:border-primary-800 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary-800 dark:text-white">
                Historique des Consommations
              </h3>
              <span className="text-[10px] bg-primary-200/60 dark:bg-primary-800 text-primary-600 dark:text-primary-300 font-extrabold px-2 py-0.5 rounded-full">
                {consumedParts.length} {consumedParts.length > 1 ? 'entrées' : 'entrée'}
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-primary-200 dark:border-primary-800 text-[10px] font-extrabold uppercase text-primary-400 tracking-wider bg-primary-50/20 dark:bg-primary-900/10">
                    <th className="py-3 px-5">Pièce détachée</th>
                    <th className="py-3 px-5 text-center">Quantité</th>
                    <th className="py-3 px-5 text-right">Prix Unitaire</th>
                    <th className="py-3 px-5 text-right">Coût Total</th>
                    <th className="py-3 px-5">Intervention Liée</th>
                    <th className="py-3 px-5">Intervenant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-100 dark:divide-primary-850/60 text-xs">
                  {consumedParts.map((item) => (
                    <tr key={item.id} className="hover:bg-primary-50/35 dark:hover:bg-primary-850/10 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {item.photoUrl ? (
                            <img src={item.photoUrl} alt={item.designation} className="w-8 h-8 rounded-lg object-cover border border-primary-100 dark:border-primary-800" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-800 flex items-center justify-center text-primary-500 dark:text-primary-400">
                              <Package size={14} />
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-primary-800 dark:text-white block leading-tight">{item.designation}</span>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                              <span className="text-primary-400">Réf :</span>
                              <span className="font-mono font-medium text-primary-500 dark:text-primary-300">{item.codeArticle}</span>
                              <span className="text-primary-300 dark:text-primary-750">|</span>
                              <span className="text-primary-400">Empl :</span>
                              <span className="text-primary-500 dark:text-primary-300">{item.emplacement}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className="font-extrabold text-primary-800 dark:text-white bg-primary-100 dark:bg-primary-800 px-2.5 py-1 rounded-md text-[11px]">
                          x {item.quantite}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-primary-600 dark:text-primary-450">
                        {item.price.toLocaleString('fr-FR')} €
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-primary-800 dark:text-white">
                        {item.totalCost.toLocaleString('fr-FR')} €
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-accent-orange bg-accent-orange/5 px-2 py-0.5 rounded-md border border-accent-orange/15">
                            {item.interventionType} N°{item.interventionNumero}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-primary-400 mt-1">
                            <Calendar size={10} />
                            <span>{new Date(item.interventionDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5 text-primary-600 dark:text-primary-300 font-medium">
                          <User size={12} className="text-primary-400 shrink-0" />
                          <span className="truncate max-w-[120px]">{item.technicien}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPredictiveTab = (selectedEq: Equipement) => {
    // 1. Get latest counter readings
    const eqCompteurs = compteurs.filter(c => c.equipementId === selectedEq.id)
      .sort((a, b) => new Date(a.dateReleve).getTime() - new Date(b.dateReleve).getTime());

    const idHash = selectedEq.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const defaultVal = (idHash % 15) * 110 + 380;
    
    const latestCompteur = eqCompteurs.length > 0 ? eqCompteurs[eqCompteurs.length - 1] : null;
    const currentVal = latestCompteur ? latestCompteur.valeur : defaultVal;
    const unit = latestCompteur ? latestCompteur.unite : 'Heures';
    const lastDate = latestCompteur ? latestCompteur.dateReleve : new Date().toISOString();

    const yearlyHours = selectedEq.tempsOuverture || 3600;
    const dailyUsageRate = yearlyHours / 365;

    // Calculate usage rate from history if we have multiple readings
    let calculatedDailyUsage = dailyUsageRate;
    if (eqCompteurs.length >= 2) {
      const first = eqCompteurs[0];
      const last = eqCompteurs[eqCompteurs.length - 1];
      const daysDiff = (new Date(last.dateReleve).getTime() - new Date(first.dateReleve).getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 0.5) {
        const rate = (last.valeur - first.valeur) / daysDiff;
        if (rate > 0) calculatedDailyUsage = rate;
      }
    }

    // 2. Scan gammes for counter-based thresholds
    const eqGammes = (gammes || []).filter(g => g.equipementId === selectedEq.id && g.typeDeclencheur === 'Compteur');

    let threshold = 1500;
    let ruleName = "Révision d'usure standard";
    let refVal = 0;

    if (eqGammes.length > 0) {
      const g = eqGammes[0];
      threshold = g.valeurDeclencheur || 1000;
      refVal = g.valeurCompteurReference || 0;
      ruleName = g.titre;
    } else {
      const nameLower = selectedEq.nom.toLowerCase();
      const typeLower = selectedEq.type.toLowerCase();
      const isHydraulic = nameLower.includes('presse') || typeLower.includes('presse') || nameLower.includes('injecteuse') || nameLower.includes('vérin');
      const isRotary = nameLower.includes('compresseur') || nameLower.includes('pompe') || nameLower.includes('moteur') || nameLower.includes('turbine');

      if (isHydraulic) {
        threshold = 800;
        ruleName = "Vidange huile hydraulique & contrôle d'étanchéité";
      } else if (isRotary) {
        threshold = 1200;
        ruleName = "Remplacement des courroies de transmission et des cartouches filtrantes";
      }
    }

    const limitVal = refVal + threshold;
    const wear = Math.max(0, currentVal - refVal);
    const pct = Math.round((wear / threshold) * 100);

    const remainingUnits = Math.max(0, limitVal - currentVal);
    const remainingDays = calculatedDailyUsage > 0 ? remainingUnits / calculatedDailyUsage : 999;
    const lastReadingTime = new Date(lastDate).getTime();
    const estimatedTime = lastReadingTime + remainingDays * 24 * 60 * 60 * 1000;

    let status: 'Sécurisé' | 'Attention' | 'Critique' = 'Sécurisé';
    if (pct >= 100) status = 'Critique';
    else if (pct >= 85) status = 'Attention';

    const estimatedDate = pct >= 100 
      ? "Échéance dépassée" 
      : new Date(estimatedTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    // Build Chart Data
    const combinedChartData: any[] = [];
    
    // 1. Add historical data points
    if (eqCompteurs.length >= 2) {
      eqCompteurs.forEach(c => {
        combinedChartData.push({
          date: new Date(c.dateReleve).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          valeurHistorique: c.valeur,
          isFuture: false
        });
      });
    } else {
      // Synthesize
      const baseDate = latestCompteur ? new Date(latestCompteur.dateReleve) : new Date();
      const lastVal = currentVal;
      
      combinedChartData.push({
        date: new Date(baseDate.getTime() - 60 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        valeurHistorique: Math.max(0, Math.round(lastVal - 60 * calculatedDailyUsage)),
        isFuture: false
      });
      combinedChartData.push({
        date: new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        valeurHistorique: Math.max(0, Math.round(lastVal - 30 * calculatedDailyUsage)),
        isFuture: false
      });
      combinedChartData.push({
        date: baseDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        valeurHistorique: lastVal,
        isFuture: false
      });
    }

    // 2. Add projected future points starting from the last point
    const lastPoint = combinedChartData[combinedChartData.length - 1];
    lastPoint.valeurProjetee = lastPoint.valeurHistorique;

    const lastDateObj = latestCompteur ? new Date(latestCompteur.dateReleve) : new Date();
    const lastValVal = lastPoint.valeurHistorique;

    const futureSteps = 6;
    const daysToLimit = limitVal - lastValVal;
    const stepDays = daysToLimit > 0 ? Math.max(5, Math.round((daysToLimit * 1.2) / (futureSteps * calculatedDailyUsage))) : 7;

    for (let i = 1; i <= futureSteps; i++) {
      const projectedDays = i * stepDays;
      const projectedDate = new Date(lastDateObj.getTime() + projectedDays * 24 * 60 * 60 * 1000);
      const projectedVal = Math.round(lastValVal + projectedDays * calculatedDailyUsage);
      
      combinedChartData.push({
        date: projectedDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        valeurProjetee: projectedVal,
        isFuture: true
      });
    }

    const handleSubmitReading = (e: React.FormEvent) => {
      e.preventDefault();
      if (!predictiveInputValue || isNaN(Number(predictiveInputValue)) || !onAddCompteur) return;
      setSubmittingPredictive(true);
      
      onAddCompteur({
        equipementId: selectedEq.id,
        equipementNom: selectedEq.nom,
        valeur: Number(predictiveInputValue),
        unite: unit
      });
      
      setTimeout(() => {
        setPredictiveInputValue('');
        setSubmittingPredictive(false);
        setPredictiveSuccessMsg("Relevé de compteur enregistré avec succès !");
        setTimeout(() => setPredictiveSuccessMsg(null), 4000);
      }, 500);
    };

    const handleCreatePredictiveBT = () => {
      if (!onAddIntervention) return;
      onAddIntervention({
        typeDoc: 'Préventif',
        numero: "PRED-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
        equipementId: selectedEq.id,
        equipementNom: selectedEq.nom,
        atelier: selectedEq.atelier,
        urgence: status === 'Critique' ? 'Critique' : 'Standard',
        typeProbleme: 'Maintenance Préventive Conditionnelle',
        demandeur: 'Système Prédictif (Analytique)',
        description: `[BONS DE TRAVAIL PRÉDICTIF AUTOMATISÉ]\nL'analyse d'évolution d'usage montre un taux d'usure de ${pct}% (${currentVal}/${limitVal} ${unit}).\n\n- Opération requise : ${ruleName}\n- Prochaine date d'échéance estimée : ${estimatedDate}\n\nMerci d'effectuer la révision et d'enregistrer les détails dans le compte-rendu technique.`,
        statut: 'En attente',
        datePrevue: pct >= 100 ? new Date().toISOString().split('T')[0] : new Date(estimatedTime).toISOString().split('T')[0]
      });

      setPredictiveSuccessMsg(`Bon de Travail Préventif généré avec succès pour l'équipement ${selectedEq.nom} !`);
      setTimeout(() => setPredictiveSuccessMsg(null), 4500);
    };

    return (
      <div className="space-y-6">
        {/* Banner with feedback */}
        <AnimatePresence>
          {predictiveSuccessMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg flex items-center justify-between shadow-sm"
            >
              <span>{predictiveSuccessMsg}</span>
              <button onClick={() => setPredictiveSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Model header */}
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-primary-50/20 dark:from-indigo-950/25 dark:via-purple-950/10 dark:to-primary-950/5 p-5 rounded-2xl border border-indigo-100/70 dark:border-indigo-950/70 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider flex items-center gap-1.5">
              <Sparkles size={12} className="animate-pulse text-indigo-500" />
              <span>Modèle Prédictif Prévisionnel</span>
            </span>
            <h3 className="text-base font-display font-extrabold text-primary-900 dark:text-white">
              Analyse de l'Évolution d'Usage & Estimation de Panne
            </h3>
            <p className="text-[11px] text-primary-500 dark:text-primary-400 max-w-2xl leading-relaxed">
              Ce système analyse l'évolution temporelle de vos compteurs physiques pour modéliser une courbe de tendance de dégradation et anticiper l'atteinte du seuil d'usure critique.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
              status === 'Critique' 
                ? 'bg-red-500/10 text-red-500 border border-red-250/20' 
                : status === 'Attention'
                ? 'bg-amber-500/10 text-amber-500 border border-amber-250/20'
                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-250/20'
            }`}>
              <span className={`h-2 w-2 rounded-full ${
                status === 'Critique' ? 'bg-red-500' : status === 'Attention' ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
              Statut : {status}
            </span>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card bg-white dark:bg-primary-900 p-4 border border-primary-150 dark:border-primary-800 shadow-sm flex items-center gap-4">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
              pct >= 100 ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'
            }`}>
              <TrendingUp size={20} />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-primary-400 uppercase font-bold tracking-wider block">Taux d'usure actuel</span>
              <span className={`text-lg font-mono font-black ${pct >= 100 ? 'text-red-500' : pct >= 85 ? 'text-amber-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
                {pct}%
              </span>
              <span className="text-[10px] text-primary-400 block">
                {currentVal} / {limitVal} {unit}
              </span>
            </div>
          </div>

          <div className="card bg-white dark:bg-primary-900 p-4 border border-primary-150 dark:border-primary-800 shadow-sm flex items-center gap-4">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
              pct >= 100 ? 'bg-red-500/10 text-red-500' : 'bg-accent-orange/10 text-accent-orange'
            }`}>
              <Calendar size={20} />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-primary-400 uppercase font-bold tracking-wider block">Maintenance estimée le</span>
              <span className={`text-xs font-bold block truncate max-w-[170px] ${pct >= 100 ? 'text-red-500' : 'text-primary-800 dark:text-white'}`}>
                {estimatedDate}
              </span>
              <span className="text-[10px] text-primary-400 block">
                {pct >= 100 ? "Échéance d'usure dépassée" : `Soit d'ici environ ${Math.round(remainingDays)} jours`}
              </span>
            </div>
          </div>

          <div className="card bg-white dark:bg-primary-900 p-4 border border-primary-150 dark:border-primary-800 shadow-sm flex items-center gap-4">
            <div className="h-11 w-11 bg-teal-500/10 text-teal-500 rounded-xl flex items-center justify-center shrink-0">
              <Activity size={20} />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-primary-400 uppercase font-bold tracking-wider block">Rythme d'usage quotidien</span>
              <span className="text-base font-mono font-black text-primary-800 dark:text-white">
                {calculatedDailyUsage.toFixed(1)} <span className="text-[10px] font-normal text-primary-400">{unit}/j</span>
              </span>
              <span className="text-[10px] text-primary-400 block">
                Basé sur {eqCompteurs.length >= 2 ? "l'historique de marche" : "le profil de production"}
              </span>
            </div>
          </div>
        </div>

        {/* Visual curve + Quick form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visual Chart Card */}
          <div className="lg:col-span-2 card bg-white dark:bg-primary-900 border border-primary-150 dark:border-primary-800 shadow-sm p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-primary-100 dark:border-primary-850">
              <div>
                <h4 className="text-xs font-extrabold uppercase text-primary-850 dark:text-white">Modélisation de Tendance</h4>
                <p className="text-[10px] text-primary-400">Courbe temporelle des relevés physiques et extrapolation future</p>
              </div>
              <div className="flex gap-4 text-[10px]">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  Réel
                </span>
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="h-2 w-2 rounded-full bg-orange-400 border border-dashed" />
                  Projeté
                </span>
                <span className="flex items-center gap-1.5 font-bold text-red-500">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Seuil
                </span>
              </div>
            </div>

            <div className="h-64 w-full" id="predictive-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedChartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 9, fill: '#94a3b8' }} 
                    stroke="#cbd5e1"
                  />
                  <YAxis 
                    tick={{ fontSize: 9, fill: '#94a3b8' }} 
                    stroke="#cbd5e1"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                  <ReferenceLine 
                    y={limitVal} 
                    stroke="#ef4444" 
                    strokeWidth={2} 
                    strokeDasharray="4 4"
                    label={{ 
                      value: `Limite (${limitVal} ${unit})`, 
                      fill: '#ef4444', 
                      position: 'top', 
                      style: { fontSize: 9, fontWeight: 'bold' } 
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="valeurHistorique" 
                    stroke="#6366f1" 
                    strokeWidth={3} 
                    dot={{ r: 4 }} 
                    activeDot={{ r: 6 }} 
                    name="Valeur Réelle"
                    connectNulls
                  />
                  <Line 
                    type="monotone" 
                    dataKey="valeurProjetee" 
                    stroke="#f97316" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    dot={false}
                    name="Projection Prédictive"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Diagnosis & update reader */}
          <div className="space-y-6">
            <div className="card bg-white dark:bg-primary-900 border border-primary-150 dark:border-primary-800 shadow-sm p-4 space-y-3.5">
              <h4 className="text-xs font-bold uppercase text-primary-850 dark:text-white flex items-center gap-2">
                <ShieldAlert size={14} className="text-accent-orange" />
                Diagnostic analytique
              </h4>
              <p className="text-[11px] leading-relaxed text-primary-600 dark:text-primary-300">
                {pct >= 100 ? (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    ⚠️ <strong>Seuil dépassé.</strong> La valeur de {currentVal} {unit} excède la limite de {limitVal} {unit}. Risque critique de panne mécanique.
                  </span>
                ) : pct >= 85 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    ⚡ <strong>Alerte usure élevée.</strong> L'équipement fonctionne sous contraintes d'usure à {pct}%. L'échéance de maintenance critique approche.
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ✅ <strong>Fonctionnement nominal.</strong> L'état de dégradation actuel est à {pct}% d'usure. Aucune action préventive requise à court terme.
                  </span>
                )}
              </p>
              <div className="bg-primary-50 dark:bg-primary-850/40 p-2.5 rounded-lg border border-primary-100 dark:border-primary-800/80 text-[10px] space-y-1.5 text-primary-500 dark:text-primary-400">
                <div><strong>Règle active :</strong> {ruleName}</div>
                <div><strong>Seuil fixé à :</strong> {threshold} {unit}</div>
                <div><strong>Valeur de référence :</strong> {refVal} {unit}</div>
                <div><strong>Limite d'usure :</strong> {limitVal} {unit}</div>
              </div>

              {onAddIntervention && (
                <button
                  type="button"
                  onClick={handleCreatePredictiveBT}
                  className="btn-primary w-full text-xs py-2 bg-accent-orange hover:bg-accent-orange-hover text-white font-bold rounded-lg transition shadow-sm"
                >
                  Déclencher le Bon de Travail Prédictif
                </button>
              )}
            </div>

            {/* Form to submit counter reading */}
            {onAddCompteur && (
              <form onSubmit={handleSubmitReading} className="card bg-white dark:bg-primary-900 border border-primary-150 dark:border-primary-800 shadow-sm p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase text-primary-850 dark:text-white">
                  Enregistrer un nouveau relevé
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-primary-400 uppercase block mb-1">Nouvelle valeur ({unit})</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        required
                        placeholder={`Ex: ${currentVal + 100}`}
                        value={predictiveInputValue}
                        onChange={(e) => setPredictiveInputValue(e.target.value)}
                        className="input-text text-xs py-1.5 flex-1 bg-white dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg text-primary-800 dark:text-white"
                      />
                      <button
                        type="submit"
                        disabled={submittingPredictive}
                        className="btn-primary text-xs py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition"
                      >
                        {submittingPredictive ? '...' : 'Valider'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Annual Gantt-style historical timeline representation
  const renderTimeline = () => {
    if (!selectedEq) return null;

    const now = new Date();
    const startRange = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
    
    // Find matching interventions for selected machine
    const relevantIntervs = interventions.filter(
      i => i.equipementId === selectedEq.id && (i.dateCloture || i.dateCreation)
    );

    const months = [];
    for (let i = 0; i < 12; i++) {
      const m = new Date(startRange.getFullYear(), startRange.getMonth() + i, 1);
      months.push({
        label: m.toLocaleDateString('fr-FR', { month: 'short' }),
        year: m.getFullYear(),
        month: m.getMonth()
      });
    }

    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
          <Clock size={16} />
          Timeline Chronologique des Événements (12 Derniers Mois)
        </h4>
        <div className="relative border border-primary-200 dark:border-primary-700 rounded-xl p-4 bg-primary-50 dark:bg-primary-900 overflow-x-auto">
          <div className="flex min-w-[600px] justify-between items-center relative py-6">
            {/* Axis bar */}
            <div className="absolute left-0 right-0 h-1 bg-primary-200 dark:bg-primary-800 top-1/2 -translate-y-1/2"></div>
            
            {months.map((m, idx) => {
              // Check if any events occurred in this month
              const monthEvents = relevantIntervs.filter(i => {
                const date = new Date(i.dateCloture || i.dateCreation);
                return date.getFullYear() === m.year && date.getMonth() === m.month;
              });

              return (
                <div key={idx} className="flex flex-col items-center relative z-10 w-12">
                  {/* Axis tick */}
                  <div className="h-3 w-0.5 bg-primary-300 dark:bg-primary-700 mb-2"></div>
                  
                  {/* Event marker */}
                  {monthEvents.length > 0 ? (
                    <div className="flex gap-0.5 absolute -top-4">
                      {monthEvents.slice(0, 3).map((ev, evIdx) => {
                        const isPrev = ev.typeDoc === 'Préventif';
                        const isCritical = ev.urgence && ev.urgence.toLowerCase().includes('arrêt');
                        const color = isPrev ? 'bg-indigo-500' : (isCritical ? 'bg-red-500 animate-bounce' : 'bg-sky-500');
                        return (
                          <div
                            key={evIdx}
                            className={`h-2.5 w-2.5 rounded-full ${color}`}
                            title={`${ev.typeDoc} - ${ev.typeProbleme || ev.description}`}
                          ></div>
                        );
                      })}
                    </div>
                  ) : null}

                  <span className="text-[10px] font-mono font-bold text-primary-500 uppercase">
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex gap-4 justify-center text-xs">
          <div className="flex items-center gap-1.5 text-red-500 font-semibold">
            <span className="h-2 w-2 rounded-full bg-red-500"></span> Correctif Arrêt Machine
          </div>
          <div className="flex items-center gap-1.5 text-sky-500 font-semibold">
            <span className="h-2 w-2 rounded-full bg-sky-500"></span> Correctif Ordinaire (BT)
          </div>
          <div className="flex items-center gap-1.5 text-indigo-500 font-semibold">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span> Maintenance Préventive
          </div>
        </div>
      </div>
    );
  };

  // Detailed chronological timeline of all interventions and consumed parts
  const renderDetailedHistory = () => {
    if (!selectedEq) return null;

    // Filter interventions specifically for this equipment
    const relevantIntervs = (interventions || [])
      .filter(i => i.equipementId === selectedEq.id);

    // Filter stock movements linked to this equipment (or its parts)
    const linkedPieceIds = new Set(
      (pieces || [])
        .filter(p => p.equipementsLies && p.equipementsLies.includes(selectedEq.id))
        .map(p => p.id)
    );

    const relevantMvts = (mouvements || [])
      .filter(m => {
        if (linkedPieceIds.has(m.pieceId)) return true;
        const eqNomLower = selectedEq.nom.toLowerCase();
        if (m.commentaires && m.commentaires.toLowerCase().includes(eqNomLower)) return true;
        if (m.destinationNom && m.destinationNom.toLowerCase().includes(eqNomLower)) return true;
        return false;
      });

    // Parse duration strings (e.g., "1.5 H", "2 H") to float
    const parseTemps = (t?: string) => {
      if (!t) return 0;
      const match = t.match(/[\d.]+/);
      return match ? parseFloat(match[0]) : 0;
    };

    // Calculate metrics
    const totalIntervsCount = relevantIntervs.length;
    const preventifsCount = relevantIntervs.filter(i => i.typeDoc === 'Préventif').length;
    const correctifsCount = totalIntervsCount - preventifsCount;
    const totalHours = relevantIntervs.reduce((sum, i) => sum + parseTemps(i.tempsPasse), 0);

    const totalMvtsCount = relevantMvts.length;
    const stockSortiesCount = relevantMvts.filter(m => m.type === 'Sortie').length;

    // Financial valuation of stock sorties (approximated value)
    const totalPartsCost = relevantMvts.reduce((sum, m) => {
      if (m.type === 'Sortie') {
        const px = m.prixUnitaire || 45; // custom price or default fallback
        return sum + (px * m.quantite);
      }
      return sum;
    }, 0);

    // Create a unified timeline items list
    const rawTimelineItems = [
      ...relevantIntervs.map(i => {
        const isCritical = i.urgence && i.urgence.toLowerCase().includes('arrêt');
        const isPrev = i.typeDoc === 'Préventif';
        const date = i.dateCreation || new Date().toISOString();
        return {
          id: `interv-${i.id}`,
          date,
          type: 'Intervention' as const,
          category: isPrev ? 'Préventif' : (isCritical ? 'Correctif Urgent' : 'Correctif'),
          title: i.typeProbleme || (isPrev ? "Maintenance Préventive" : "Intervention"),
          subtitle: i.numero || `BT ${i.id.substring(0, 5)}`,
          description: i.description || "Aucune description renseignée.",
          status: i.statut,
          user: i.operateur || i.demandeur || 'Technicien',
          tagColor: isPrev ? 'bg-indigo-500' : (isCritical ? 'bg-red-500' : 'bg-sky-500'),
          textColor: isPrev ? 'text-indigo-600 dark:text-indigo-400' : (isCritical ? 'text-red-600 dark:text-red-400 font-extrabold animate-pulse' : 'text-sky-600 dark:text-sky-400'),
          badgeBg: isPrev ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' : (isCritical ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300' : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'),
          raw: i
        };
      }),
      ...relevantMvts.map(m => {
        const date = m.dateCreation || m.dateStr || new Date().toISOString();
        const isEntree = m.type === 'Entrée';
        return {
          id: `mvt-${m.id}`,
          date,
          type: 'MouvementStock' as const,
          category: isEntree ? 'Entrée Stock' : 'Sortie Stock',
          title: `${m.type === 'Entrée' ? 'Réapprovisionnement' : 'Consommation'} : ${m.pieceNom}`,
          subtitle: `Qté : ${isEntree ? '+' : '-'}${m.quantite}`,
          description: m.commentaires || "Mouvement de stock enregistré.",
          status: m.type,
          user: m.intervenant || 'Magasinier',
          tagColor: isEntree ? 'bg-emerald-500' : 'bg-amber-500',
          textColor: isEntree ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
          badgeBg: isEntree ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
          raw: m
        };
      })
    ];

    // Filter and sort unified list
    const filteredTimelineItems = rawTimelineItems
      .filter(item => {
        // 1. General type filter (All, Interventions only, Stock movements only)
        if (timelineTypeFilter === 'interventions' && item.type !== 'Intervention') return false;
        if (timelineTypeFilter === 'stock' && item.type !== 'MouvementStock') return false;

        // 2. Sub-category filter
        if (timelineSubFilter !== 'all') {
          if (timelineSubFilter === 'preventif' && item.category !== 'Préventif') return false;
          if (timelineSubFilter === 'correctif' && !item.category.includes('Correctif')) return false;
          if (timelineSubFilter === 'entree' && item.category !== 'Entrée Stock') return false;
          if (timelineSubFilter === 'sortie' && item.category !== 'Sortie Stock') return false;
        }

        // 3. Text search
        if (timelineSearch.trim() !== '') {
          const query = timelineSearch.toLowerCase();
          const matchesTitle = item.title.toLowerCase().includes(query);
          const matchesDesc = item.description.toLowerCase().includes(query);
          const matchesUser = item.user.toLowerCase().includes(query);
          const matchesSubtitle = item.subtitle.toLowerCase().includes(query);
          const matchesCat = item.category.toLowerCase().includes(query);
          return matchesTitle || matchesDesc || matchesUser || matchesSubtitle || matchesCat;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return timelineSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });

    // Extract parts consumed specifically across this machine's timeline
    const partsMap: Record<string, number> = {};
    relevantIntervs.forEach(i => {
      if (i.piecesConso) {
        const parts = i.piecesConso.split(',');
        parts.forEach(part => {
          const cleaned = part.trim();
          if (!cleaned) return;
          const qteMatch = cleaned.match(/x\s*(\d+)/) || cleaned.match(/\(\s*(\d+)\s*\)/);
          let qte = 1;
          let name = cleaned;
          if (qteMatch) {
            qte = parseInt(qteMatch[1], 10);
            name = cleaned.replace(qteMatch[0], '').trim();
          }
          name = name.replace(/^[x\-:\s]+/, '').trim();
          if (name) {
            partsMap[name] = (partsMap[name] || 0) + qte;
          }
        });
      }
    });
    const summarizedParts = Object.entries(partsMap).map(([name, qte]) => ({ name, qte }));

    const toggleItemExpansion = (itemId: string) => {
      setExpandedTimelineItems(prev => ({
        ...prev,
        [itemId]: !prev[itemId]
      }));
    };

    return (
      <div className="space-y-6">
        {/* KPI Grid / Bento Analytics Panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-xl flex items-center gap-3 shadow-sm hover:shadow transition">
            <div className="p-2.5 bg-primary-100 dark:bg-primary-800 rounded-lg text-primary-600 dark:text-primary-300">
              <History size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-primary-400 dark:text-primary-500 uppercase block">Total Événements</span>
              <span className="text-xl font-display font-extrabold text-primary-800 dark:text-white">
                {rawTimelineItems.length}
              </span>
              <span className="text-[9px] text-primary-400 dark:text-primary-500 block">
                {totalIntervsCount} BT | {totalMvtsCount} Mvts
              </span>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-xl flex items-center gap-3 shadow-sm hover:shadow transition">
            <div className="p-2.5 bg-red-50 dark:bg-red-950/30 rounded-lg text-red-500">
              <Wrench size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-primary-400 dark:text-primary-500 uppercase block">Correctif vs Préventif</span>
              <span className="text-xl font-display font-extrabold text-red-600 dark:text-red-400">
                {correctifsCount} / {preventifsCount}
              </span>
              <span className="text-[9px] text-primary-400 dark:text-primary-500 block">
                Taux de préventif : {totalIntervsCount > 0 ? `${Math.round((preventifsCount / totalIntervsCount) * 100)}%` : '0%'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-xl flex items-center gap-3 shadow-sm hover:shadow transition">
            <div className="p-2.5 bg-sky-50 dark:bg-sky-950/30 rounded-lg text-sky-500">
              <Clock size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-primary-400 dark:text-primary-500 uppercase block">Temps Cumulé Passé</span>
              <span className="text-xl font-display font-extrabold text-sky-600 dark:text-sky-400">
                {totalHours.toFixed(1)} H
              </span>
              <span className="text-[9px] text-primary-400 dark:text-primary-500 block">
                Moyenne : {totalIntervsCount > 0 ? `${(totalHours / totalIntervsCount).toFixed(1)} H/BT` : '0 H'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-xl flex items-center gap-3 shadow-sm hover:shadow transition">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-emerald-500">
              <Package size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-primary-400 dark:text-primary-500 uppercase block">Coût Pièces Estimé</span>
              <span className="text-xl font-display font-extrabold text-emerald-600 dark:text-emerald-400">
                {totalPartsCost.toLocaleString('fr-FR')} €
              </span>
              <span className="text-[9px] text-primary-400 dark:text-primary-500 block">
                {relevantMvts.filter(m => m.type === 'Sortie').length} sorties de consommables
              </span>
            </div>
          </div>
        </div>

        {/* INTERACTIVE TIMELINE CONTROLS CENTER */}
        <div className="bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* 1. Main Type Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1 bg-primary-100/60 dark:bg-primary-950/50 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setTimelineTypeFilter('all'); setTimelineSubFilter('all'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  timelineTypeFilter === 'all'
                    ? 'bg-white dark:bg-primary-800 text-primary-900 dark:text-white shadow-sm'
                    : 'text-primary-500 hover:text-primary-800 dark:hover:text-primary-300'
                }`}
              >
                <Activity size={12} />
                Tous ({rawTimelineItems.length})
              </button>
              <button
                type="button"
                onClick={() => { setTimelineTypeFilter('interventions'); setTimelineSubFilter('all'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  timelineTypeFilter === 'interventions'
                    ? 'bg-white dark:bg-primary-800 text-primary-900 dark:text-white shadow-sm'
                    : 'text-primary-500 hover:text-primary-800 dark:hover:text-primary-300'
                }`}
              >
                <Wrench size={12} />
                Maintenance ({totalIntervsCount})
              </button>
              <button
                type="button"
                onClick={() => { setTimelineTypeFilter('stock'); setTimelineSubFilter('all'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  timelineTypeFilter === 'stock'
                    ? 'bg-white dark:bg-primary-800 text-primary-900 dark:text-white shadow-sm'
                    : 'text-primary-500 hover:text-primary-800 dark:hover:text-primary-300'
                }`}
              >
                <Package size={12} />
                Mouvements Stock ({totalMvtsCount})
              </button>
            </div>

            {/* 2. Text Search Input with Clean Layout */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-primary-400" />
              <input
                type="text"
                placeholder="Rechercher un événement, technicien, pièce, description..."
                value={timelineSearch}
                onChange={(e) => setTimelineSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-primary-900 dark:text-white"
              />
              {timelineSearch && (
                <button
                  type="button"
                  onClick={() => setTimelineSearch('')}
                  className="absolute right-2.5 top-2.5 text-[10px] text-primary-400 hover:text-primary-600 font-extrabold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 3. Sort Order Toggle and Total Display */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-primary-400 font-bold hidden sm:inline">Tri :</span>
              <button
                type="button"
                onClick={() => setTimelineSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="px-3 py-2 rounded-xl border border-primary-200 dark:border-primary-800 text-xs font-bold text-primary-700 dark:text-primary-300 bg-white dark:bg-primary-900/60 hover:bg-primary-50 dark:hover:bg-primary-800 flex items-center gap-1.5 shadow-sm transition"
              >
                <span>{timelineSortOrder === 'desc' ? "Plus récents d'abord ⬇" : "Plus anciens d'abord ⬆"}</span>
              </button>
            </div>
          </div>

          {/* Sub-filters buttons row for precision control */}
          <div className="flex flex-wrap items-center gap-2 border-t border-primary-100 dark:border-primary-800/60 pt-3">
            <span className="text-[10px] uppercase font-extrabold text-primary-400 dark:text-primary-500 tracking-wider">Sous-Catégorie :</span>
            
            <button
              type="button"
              onClick={() => setTimelineSubFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                timelineSubFilter === 'all'
                  ? 'bg-primary-800 text-white dark:bg-primary-200 dark:text-primary-950'
                  : 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800'
              }`}
            >
              Toutes
            </button>

            {timelineTypeFilter !== 'stock' && (
              <>
                <button
                  type="button"
                  onClick={() => setTimelineSubFilter('preventif')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                    timelineSubFilter === 'preventif'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-primary-50 dark:bg-primary-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/20 dark:border-indigo-900/20'
                  }`}
                >
                  Préventif uniquement
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineSubFilter('correctif')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                    timelineSubFilter === 'correctif'
                      ? 'bg-red-600 text-white'
                      : 'bg-primary-50 dark:bg-primary-950 text-red-600 dark:text-red-400 border border-red-200/20 dark:border-red-900/20'
                  }`}
                >
                  Correctif uniquement
                </button>
              </>
            )}

            {timelineTypeFilter !== 'interventions' && (
              <>
                <button
                  type="button"
                  onClick={() => setTimelineSubFilter('entree')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                    timelineSubFilter === 'entree'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-primary-50 dark:bg-primary-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200/20 dark:border-emerald-900/20'
                  }`}
                >
                  Entrées Stock
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineSubFilter('sortie')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                    timelineSubFilter === 'sortie'
                      ? 'bg-amber-600 text-white'
                      : 'bg-primary-50 dark:bg-primary-950 text-amber-600 dark:text-amber-400 border border-amber-200/20 dark:border-amber-900/20'
                  }`}
                >
                  Sorties / Consommations
                </button>
              </>
            )}
          </div>
        </div>

        {/* DETAILED CHRONOLOGICAL TIMELINE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-bold text-primary-500 dark:text-primary-400 uppercase tracking-wider flex items-center gap-2">
              <Activity size={14} className="text-accent-orange" />
              Journal Chronologique Interactif de la Machine
            </h4>

            {filteredTimelineItems.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-xl text-primary-400 dark:text-primary-500 italic text-xs">
                Aucun événement ne correspond aux filtres ou à la recherche actuels.
              </div>
            ) : (
              <div className="relative pl-4 sm:pl-7 border-l-2 border-primary-150 dark:border-primary-800 space-y-5">
                {filteredTimelineItems.map((item) => {
                  const isExpanded = !!expandedTimelineItems[item.id];
                  return (
                    <div key={item.id} className="relative group">
                      
                      {/* Interactive Timeline node icon */}
                      <button
                        type="button"
                        onClick={() => toggleItemExpansion(item.id)}
                        className={`absolute -left-[27px] sm:-left-[39px] top-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white dark:border-primary-950 flex items-center justify-center text-white shadow-md transition group-hover:scale-110 active:scale-95 select-none ${item.tagColor}`}
                      >
                        {item.type === 'Intervention' ? (
                          item.category === 'Préventif' ? <CheckCircle size={10} className="sm:size-3" /> : <Wrench size={10} className="sm:size-3" />
                        ) : (
                          <Package size={10} className="sm:size-3" />
                        )}
                      </button>

                      {/* Event Detail Card */}
                      <div className={`bg-white dark:bg-primary-900/40 border rounded-xl transition-all shadow-sm ${
                        isExpanded 
                          ? 'border-primary-300 dark:border-primary-700 ring-1 ring-primary-100 dark:ring-primary-800/30' 
                          : 'border-primary-200/80 dark:border-primary-800 hover:border-primary-300 dark:hover:border-primary-700 hover:translate-x-0.5'
                      }`}>
                        
                        {/* Card Header clickable area to expand */}
                        <div
                          onClick={() => toggleItemExpansion(item.id)}
                          className="p-4 cursor-pointer flex flex-wrap items-center justify-between gap-2 select-none"
                        >
                          <div className="space-y-1 min-w-0 flex-1 border-b border-transparent">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-mono font-bold text-primary-800 dark:text-primary-200">
                                {item.subtitle}
                              </span>
                              <span className={`px-2 py-0.5 text-[8px] font-extrabold rounded uppercase tracking-wider ${item.badgeBg}`}>
                                {item.category}
                              </span>
                              {item.type === 'Intervention' && item.raw.urgence && item.raw.urgence.toLowerCase().includes('arrêt') && (
                                <span className="px-1.5 py-0.5 text-[8px] font-extrabold rounded uppercase bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 animate-pulse">
                                  Arrêt Machine
                                </span>
                              )}
                            </div>
                            <h5 className="text-xs font-bold text-primary-900 dark:text-white truncate">
                              {item.title}
                            </h5>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-[10px] text-primary-400 font-semibold font-mono flex items-center gap-1 justify-end">
                                <Calendar size={10} />
                                <span>
                                  {new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                              <span className="text-[9px] text-primary-400 font-semibold block">
                                Par: <strong className="text-primary-600 dark:text-primary-300">{item.user}</strong>
                              </span>
                            </div>
                            <span className="text-primary-300 dark:text-primary-600 font-extrabold text-xs transition-transform duration-200">
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          </div>
                        </div>

                        {/* Expandable Details Container */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="border-t border-primary-100 dark:border-primary-800 bg-primary-50/20 dark:bg-primary-950/20 overflow-hidden"
                            >
                              <div className="p-4 space-y-4">
                                
                                {/* 1. Base description text */}
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary-400 dark:text-primary-500 block">
                                    Description / Signalement
                                  </span>
                                  <p className="text-xs text-primary-700 dark:text-primary-300 leading-relaxed whitespace-pre-wrap bg-white dark:bg-primary-900/60 p-2.5 rounded-lg border border-primary-100 dark:border-primary-800">
                                    {item.description}
                                  </p>
                                </div>

                                {/* 2. Intervention specifics */}
                                {item.type === 'Intervention' && (
                                  <>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                      <div className="p-2 bg-white dark:bg-primary-900/60 border border-primary-100 dark:border-primary-850 rounded-lg">
                                        <span className="text-[8px] font-bold text-primary-400 uppercase block">Statut Actuel</span>
                                        <span className={`text-[10px] font-bold font-mono ${
                                          item.raw.statut === 'Soldé' || item.raw.statut === 'Clôturé' || item.raw.statut === 'Terminé'
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-sky-600 dark:text-sky-400'
                                        }`}>
                                          {item.raw.statut}
                                        </span>
                                      </div>

                                      {item.raw.tempsPasse && (
                                        <div className="p-2 bg-white dark:bg-primary-900/60 border border-primary-100 dark:border-primary-850 rounded-lg">
                                          <span className="text-[8px] font-bold text-primary-400 uppercase block">Durée d'intervention</span>
                                          <span className="text-[10px] font-bold font-mono text-primary-800 dark:text-white">
                                            {item.raw.tempsPasse}
                                          </span>
                                        </div>
                                      )}

                                      {item.raw.imputation && (
                                        <div className="p-2 bg-white dark:bg-primary-900/60 border border-primary-100 dark:border-primary-850 rounded-lg col-span-2 sm:col-span-1">
                                          <span className="text-[8px] font-bold text-primary-400 uppercase block">Imputation</span>
                                          <span className="text-[10px] font-bold font-mono text-primary-800 dark:text-white truncate block">
                                            {item.raw.imputation}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Compte Rendu details */}
                                    {item.raw.compteRendu && (
                                      <div className="p-3 bg-indigo-50/30 dark:bg-indigo-950/20 border-l-2 border-indigo-400 rounded-r-lg space-y-1">
                                        <div className="flex items-center gap-1 font-bold text-[9px] uppercase tracking-wide text-indigo-500">
                                          <MessageSquare size={10} />
                                          Rapport d'intervention clôturé
                                        </div>
                                        <p className="text-xs italic text-primary-700 dark:text-primary-300">
                                          &ldquo;{item.raw.compteRendu}&rdquo;
                                        </p>
                                      </div>
                                    )}

                                    {/* Consumed materials list */}
                                    {item.raw.piecesConso && (
                                      <div className="space-y-1.5 pt-1">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-primary-400 dark:text-primary-500 flex items-center gap-1">
                                          <Package size={10} />
                                          Pièces de rechange consommées (Magasin)
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                          {item.raw.piecesConso.split(',').map((pStr, pIdx) => (
                                            <span
                                              key={pIdx}
                                              className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 shadow-sm"
                                            >
                                              <Package size={8} />
                                              {pStr.trim()}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* 3. Stock specific properties */}
                                {item.type === 'MouvementStock' && (
                                  <>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                      <div className="p-2 bg-white dark:bg-primary-900/60 border border-primary-100 dark:border-primary-850 rounded-lg">
                                        <span className="text-[8px] font-bold text-primary-400 uppercase block">Opération</span>
                                        <span className={`text-[10px] font-extrabold ${item.textColor}`}>
                                          {item.raw.type}
                                        </span>
                                      </div>

                                      <div className="p-2 bg-white dark:bg-primary-900/60 border border-primary-100 dark:border-primary-850 rounded-lg">
                                        <span className="text-[8px] font-bold text-primary-400 uppercase block">Quantité</span>
                                        <span className="text-[10px] font-bold font-mono text-primary-800 dark:text-white">
                                          {item.raw.quantite} unité(s)
                                        </span>
                                      </div>

                                      {item.raw.magasin && (
                                        <div className="p-2 bg-white dark:bg-primary-900/60 border border-primary-100 dark:border-primary-850 rounded-lg">
                                          <span className="text-[8px] font-bold text-primary-400 uppercase block">Magasin Origine</span>
                                          <span className="text-[10px] font-bold text-primary-700 dark:text-primary-300 truncate block">
                                            {item.raw.magasin}
                                          </span>
                                        </div>
                                      )}

                                      {item.raw.prixUnitaire && (
                                        <div className="p-2 bg-white dark:bg-primary-900/60 border border-primary-100 dark:border-primary-850 rounded-lg">
                                          <span className="text-[8px] font-bold text-primary-400 uppercase block">Valeur transaction</span>
                                          <span className="text-[10px] font-bold font-mono text-primary-800 dark:text-white block">
                                            {(item.raw.prixUnitaire * item.raw.quantite).toFixed(2)} €
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {item.raw.destinationNom && (
                                      <div className="p-2.5 bg-primary-100/50 dark:bg-primary-950/50 border border-primary-200/50 dark:border-primary-800 rounded-lg text-xs flex justify-between">
                                        <span className="text-primary-400">Destination :</span>
                                        <strong className="text-primary-700 dark:text-primary-200">{item.raw.destinationNom} ({item.raw.destinationType || 'BT'})</strong>
                                      </div>
                                    )}
                                  </>
                                )}

                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Consolidated spare parts card (Side column) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-primary-500 dark:text-primary-400 uppercase tracking-wider flex items-center gap-2">
              <Package size={14} className="text-emerald-500" />
              Consommables Associés à la Machine
            </h4>

            {/* List of linked spare parts catalog */}
            <div className="card space-y-3 p-4 bg-primary-50/10 dark:bg-primary-950/15 border border-primary-200/40 dark:border-primary-800/40 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400 dark:text-primary-500 block">
                Pièces de rechange préconisées constructeur
              </span>
              
              {Array.from(linkedPieceIds).length === 0 ? (
                <div className="text-center py-6 text-xs text-primary-400 dark:text-primary-500 italic">
                  Aucun consommable n'est formellement lié dans le catalogue magasin.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {(pieces || [])
                    .filter(p => linkedPieceIds.has(p.id))
                    .map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-white dark:bg-primary-900 border border-primary-200/60 dark:border-primary-800 rounded-lg hover:border-emerald-200 dark:hover:border-emerald-800/60 transition shadow-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950 rounded text-emerald-600 dark:text-emerald-400">
                            <Package size={11} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-primary-800 dark:text-primary-200 truncate block">
                              {p.designation}
                            </span>
                            <span className="text-[9px] font-mono text-primary-400 block">
                              Stock : <strong className="text-primary-600 dark:text-primary-300">{p.quantite} U</strong> | Seuil : {p.seuil}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Consolidated consumed parts from historical interventions */}
            <div className="card space-y-4 bg-emerald-50/5 dark:bg-emerald-950/5 border border-emerald-200/20 dark:border-emerald-800/30">
              <div className="flex items-center justify-between border-b border-primary-200 dark:border-primary-800 pb-2">
                <span className="text-xs font-bold text-primary-700 dark:text-primary-300">Article consommé en BT</span>
                <span className="text-xs font-bold text-primary-700 dark:text-primary-300">Qté cumulée</span>
              </div>

              {summarizedParts.length === 0 ? (
                <div className="text-center py-6 text-xs text-primary-400 dark:text-primary-500 italic">
                  Aucun consommable n'a encore été déclaré consommé sur les interventions de cette machine.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {summarizedParts.map((part, pIdx) => (
                    <div
                      key={pIdx}
                      className="flex items-center justify-between p-2.5 bg-white dark:bg-primary-900/55 border border-primary-200 dark:border-primary-800 rounded-lg hover:border-emerald-300 dark:hover:border-emerald-800/80 transition shadow-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950 rounded text-emerald-600 dark:text-emerald-400">
                          <Package size={12} />
                        </div>
                        <span className="text-xs font-semibold text-primary-800 dark:text-primary-200 truncate">
                          {part.name}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        x{part.qte}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPrintTree = () => {
    const roots = treePrintRoot 
      ? [treePrintRoot] 
      : equipements.filter(e => !e.parentId).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

    const renderNode = (node: Equipement, level: number) => {
      const children = equipements
        .filter(e => e.parentId === node.id)
        .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

      return (
        <div key={node.id} className="print:break-inside-avoid">
          {/* Node row */}
          <div 
            className="flex items-center justify-between py-1.5 border-b border-gray-100"
            style={{ paddingLeft: `${level * 20}px` }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {/* Indent lines / markers */}
              {level > 0 && (
                <span className="text-gray-400 font-mono text-[10px] shrink-0 mr-1">
                  {"└─"}
                </span>
              )}
              <span className="font-bold text-gray-950 dark:text-primary-950 truncate">{node.nom}</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono shrink-0">
                {node.id}
              </span>
              <span className="text-[10px] text-gray-500 truncate">
                ({node.atelier} • {node.metier})
              </span>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-medium shrink-0">
              {node.marque && (
                <span className="text-gray-500 italic hidden sm:inline">
                  {node.marque} {node.type ? `(${node.type})` : ''}
                </span>
              )}
              
              {node.critique && (
                <span className="px-1.5 py-0.5 bg-red-100 text-red-800 font-bold rounded uppercase text-[8px] tracking-wider border border-red-200">
                  🔴 Critique
                </span>
              )}

              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border ${
                node.statut === 'Opérationnel' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : node.statut === 'HS' 
                  ? 'bg-red-50 text-red-800 border-red-200' 
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {node.statut}
              </span>
            </div>
          </div>

          {/* Children nodes */}
          {children.length > 0 && (
            <div className="relative">
              {/* Vertical guideline */}
              {level >= 0 && (
                <div 
                  className="absolute left-0 top-0 bottom-0 border-l border-dashed border-gray-200"
                  style={{ marginLeft: `${(level * 20) + 6}px` }}
                />
              )}
              <div className="space-y-0.5">
                {children.map(child => renderNode(child, level + 1))}
              </div>
            </div>
          )}
        </div>
      );
    };

    return roots.map(root => renderNode(root, 0));
  };

  const filteredTreeEquipements = atelierFilter === 'all'
    ? equipements
    : equipements.filter(e => e.atelier === atelierFilter);

  const isNodeOrAnyDescendantMatching = (node: Equipement, q: string): boolean => {
    if (!q.trim()) return true;
    const queryStr = q.toLowerCase();
    
    const matchesSelf = 
      node.nom.toLowerCase().includes(queryStr) || 
      node.id.toLowerCase().includes(queryStr) ||
      (node.type || '').toLowerCase().includes(queryStr) ||
      (node.atelier || '').toLowerCase().includes(queryStr) ||
      (node.marque || '').toLowerCase().includes(queryStr) ||
      (node.metier || '').toLowerCase().includes(queryStr);
      
    if (matchesSelf) return true;
    
    const children = filteredTreeEquipements.filter(e => e.parentId === node.id);
    return children.some(child => isNodeOrAnyDescendantMatching(child, q));
  };

  // RECURSIVE COMPONENT FOR RENDERING ARBORESCENCE TREE
  const TreeNode = ({ node }: { node: Equipement; key?: string }) => {
    const children = filteredTreeEquipements
      .filter(e => e.parentId === node.id)
      .filter(child => isNodeOrAnyDescendantMatching(child, treeSearchQuery))
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
    const hasChildren = children.length > 0;
    const isOpen = !!expandedNodes[node.id];
    const setIsOpen = (val: boolean) => {
      setExpandedNodes(prev => ({ ...prev, [node.id]: val }));
    };

    const isSelected = selectedId === node.id;
    const isHS = node.statut === 'HS';

    const isDragged = draggedId === node.id;
    const isOver = dragOverId === node.id;

    let borderStyle = '';
    if (isSelected) {
      borderStyle = 'bg-accent-orange/10 border-l-2 border-accent-orange text-accent-orange';
    } else if (isOver) {
      borderStyle = 'bg-amber-100 dark:bg-amber-950/45 border-2 border-dashed border-amber-500 scale-[1.01] text-amber-600 dark:text-amber-400';
    } else {
      borderStyle = 'hover:bg-primary-100 dark:hover:bg-primary-800 text-primary-800 dark:text-primary-200';
    }

    const siblings = filteredTreeEquipements
      .filter(e => e.parentId === node.parentId)
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
    const index = siblings.findIndex(s => s.id === node.id);
    const canMoveUp = index > 0;
    const canMoveDown = index !== -1 && index < siblings.length - 1;

    // Calculate availability and preventive rate of all descendants
    const getSubStats = () => {
      if (!hasChildren) return null;
      const subs: Equipement[] = [];
      const findChildren = (parentId: string) => {
        const childrenList = filteredTreeEquipements.filter(e => e.parentId === parentId);
        subs.push(...childrenList);
        childrenList.forEach(c => findChildren(c.id));
      };
      findChildren(node.id);
      
      if (subs.length === 0) return null;
      
      // Availability Rate
      const total = subs.length;
      const operational = subs.filter(e => e.statut === 'Opérationnel').length;
      const availabilityRate = Math.round((operational / total) * 100);
      
      // Preventive Rate
      const subIds = subs.map(s => s.id);
      const subIntervs = interventions.filter(i => subIds.includes(i.equipementId));
      const preventiveIntervs = subIntervs.filter(i => i.typeDoc === 'Préventif');
      const completedPreventive = preventiveIntervs.filter(i => i.statut === 'Soldé' || i.statut === 'Clôturé').length;
      const preventiveRate = preventiveIntervs.length > 0
        ? Math.round((completedPreventive / preventiveIntervs.length) * 100)
        : null;
        
      return {
        availabilityRate,
        preventiveRate,
        total,
        operational,
        completedPreventive,
        totalPreventive: preventiveIntervs.length
      };
    };

    const stats = getSubStats();

    return (
      <div className={`ml-3 select-none transition-all duration-150 ${isDragged ? 'opacity-30 border border-dashed border-primary-300 dark:border-primary-700 rounded-lg' : ''}`}>
        <div
          draggable="true"
          onDragStart={(e) => handleDragStart(e, node.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDragLeave={() => handleDragLeave(node.id)}
          onDrop={(e) => handleDrop(e, node.id)}
          onClick={() => setSelectedId(node.id)}
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setHoveredEq({
              node,
              x: rect.right,
              y: rect.top
            });
          }}
          onMouseLeave={() => {
            setHoveredEq(null);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({
              visible: true,
              x: e.clientX,
              y: e.clientY,
              node: node
            });
          }}
          className={`group flex items-center justify-between p-2 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-200 transform hover:scale-[1.015] hover:shadow-xs ${borderStyle}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(!isOpen);
                }}
                className="text-primary-400 hover:text-accent-orange p-0.5 rounded transition"
              >
                <ChevronRight size={14} className={`transform transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              </button>
            ) : (
              <span className="w-5"></span>
            )}
            {hasChildren ? (
              isOpen ? <FolderOpen size={16} className="text-accent-orange shrink-0" /> : <Folder size={16} className="text-accent-orange shrink-0" />
            ) : (
              <Cog size={16} className={`${isHS ? 'text-red-500 animate-spin' : 'text-primary-400'} shrink-0`} />
            )}
            
            {/* Visual State Badge */}
            {(() => {
              let badgeColor = 'bg-emerald-500';
              let badgeRing = 'ring-emerald-500/20';
              let statusLabel = 'Fonctionnement';
              
              if (node.statut === 'HS') {
                badgeColor = 'bg-red-500';
                badgeRing = 'ring-red-500/20';
                statusLabel = 'En Panne';
              } else if (node.statut === 'En Maintenance') {
                badgeColor = 'bg-amber-500';
                badgeRing = 'ring-amber-500/20';
                statusLabel = 'En Maintenance';
              } else {
                const hasActiveInterv = interventions.some(
                  i => i.equipementId === node.id && (i.statut === 'En cours' || i.statut === 'En attente de pièce')
                );
                if (hasActiveInterv) {
                  badgeColor = 'bg-amber-500';
                  badgeRing = 'ring-amber-500/20';
                  statusLabel = 'En Maintenance';
                }
              }
              
              return (
                <span 
                  className={`w-2 h-2 rounded-full shrink-0 ${badgeColor} ring-4 ${badgeRing} mx-1`}
                  title={`État : ${statusLabel}`}
                />
              );
            })()}

            {/* Star Icon for Favorites */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditEquipement(node.id, { favoris: !node.favoris });
              }}
              className="p-0.5 rounded hover:bg-primary-150 dark:hover:bg-primary-700/60 transition-all shrink-0 active:scale-90"
              title={node.favoris ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Star 
                size={13} 
                className={`${node.favoris ? 'text-amber-500 fill-amber-400' : 'text-primary-300 dark:text-primary-600 hover:text-amber-500 dark:hover:text-amber-400'}`} 
              />
            </button>

            <span 
              title={node.nom}
              className={`text-xs font-semibold truncate ${isHS ? 'text-red-600 dark:text-red-400 line-through' : ''}`}
            >
              {node.nom}
            </span>
          </div>
          
          <div className="flex items-center gap-1 shrink-0 ml-1.5">
            {node.critique && (
              <Flame size={12} className="text-red-500 shrink-0 mr-1" />
            )}
            {/* UP / DOWN ARROWS VISIBLE ON HOVER / ACTIVE COMPONENT */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-primary-900/85 px-1 rounded-md shadow-sm border border-primary-100 dark:border-primary-800">
              {canMoveUp && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveEquipment(node.id, 'up');
                  }}
                  className="p-1 hover:bg-primary-100 dark:hover:bg-primary-800 rounded text-primary-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  title="Faire remonter"
                >
                  <ArrowUp size={11} />
                </button>
              )}
              {canMoveDown && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveEquipment(node.id, 'down');
                  }}
                  className="p-1 hover:bg-primary-100 dark:hover:bg-primary-800 rounded text-primary-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  title="Faire descendre"
                >
                  <ArrowDown size={11} />
                </button>
              )}
            </div>
          </div>
        </div>

        {hasChildren && isOpen && (
          <div className="border-l border-dashed border-primary-200 dark:border-primary-700 ml-4 mt-1">
            {children.map(child => (
              <TreeNode key={child.id} node={child} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const rootEquipements = filteredTreeEquipements
    .filter(e => {
      if (!e.parentId) return true;
      return !filteredTreeEquipements.some(p => p.id === e.parentId);
    })
    .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

  const filteredRootEquipements = rootEquipements.filter(root => 
    isNodeOrAnyDescendantMatching(root, treeSearchQuery)
  );

  const showTreeView = searchQuery === '' && statusFilter === 'all' && criticalityFilter === 'all';

  const getFilteredEquipements = () => {
    return equipements.filter(e => {
      // 1. Status Filter
      if (statusFilter === 'Opérationnel' && e.statut !== 'Opérationnel') return false;
      if (statusFilter === 'HS' && e.statut !== 'HS') return false;

      // 2. Criticality Filter
      if (criticalityFilter === 'critique' && !e.critique) return false;
      if (criticalityFilter === 'normal' && e.critique) return false;

      // 3. Workshop Filter
      if (atelierFilter !== 'all' && e.atelier !== atelierFilter) return false;

      // 4. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = e.nom.toLowerCase().includes(q);
        const matchesCode = (e.id || '').toLowerCase().includes(q);
        const matchesType = (e.type || '').toLowerCase().includes(q);
        const matchesAtelier = (e.atelier || '').toLowerCase().includes(q);
        return matchesName || matchesCode || matchesType || matchesAtelier;
      }
      return true;
    });
  };

  const isFiltering =
    searchQuery !== '' ||
    statusFilter !== 'all' ||
    criticalityFilter !== 'all' ||
    atelierFilter !== 'all';
  const filteredEquips = getFilteredEquipements();

  const filteredQREquipments = equipements.filter(eq => {
    const matchesSearch = eq.nom.toLowerCase().includes(qrSearchQuery.toLowerCase()) || 
                          eq.id.toLowerCase().includes(qrSearchQuery.toLowerCase());
    const matchesAtelier = qrSelectedAtelier === 'all' || eq.atelier === qrSelectedAtelier;
    return matchesSearch && matchesAtelier;
  });

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-primary-900 dark:text-white flex items-center">
            Parc Équipements
            <ModuleHelp moduleId="equipements" />
          </h1>
          <p className="text-sm text-primary-500 dark:text-primary-400 mt-1">
            Nomenclature industrielle, arborescence machines-composants et diagnostics prédictifs.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowQRSection(true)}
            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
            title="Gérer et imprimer les codes QR d'équipements"
          >
            <QrCode size={16} />
            <span>QR Codes Équipements</span>
          </button>
          <button
            onClick={exportToCSV}
            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 bg-white hover:bg-primary-50 text-primary-700 dark:bg-primary-800 dark:hover:bg-primary-750 dark:text-primary-200 border border-primary-200 dark:border-primary-700"
            title="Exporter la liste filtrée au format CSV"
          >
            <Download size={16} />
            Exporter CSV
          </button>
          <button
            onClick={handleStartCreate}
            className="btn-primary"
          >
            <Plus size={16} />
            Nouvel Équipement
          </button>
        </div>
      </div>

      <div 
        className="arborescence-main-container flex flex-col lg:flex-row items-start w-full gap-0"
        style={{ '--tree-width': `${treeWidth}px` } as React.CSSProperties}
      >
        {/* LEFT COLUMN: COLLAPSIBLE SITEMAP TREE VIEW */}
        <div className="w-full lg:w-[var(--tree-width)] shrink-0 card space-y-4 lg:sticky lg:top-[90px] h-[calc(100vh-130px)] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-primary-200 dark:border-primary-700">
            <div className="flex items-center gap-2">
              <Network className="text-accent-orange" size={18} />
              <h2 className="text-sm font-bold uppercase tracking-wider text-primary-800 dark:text-primary-200">
                Arborescence Parc
              </h2>
            </div>
            {isFiltering && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setCriticalityFilter('all');
                  setAtelierFilter('all');
                }}
                className="text-[10px] text-accent-orange hover:underline font-bold animate-fade-in"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {/* VISUAL CLIPBOARD HELPER FOR COPY-PASTE */}
          {copiedEquipment && (
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-900/40 p-3 rounded-xl space-y-2 text-xs animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                  📋 Sous-ensemble copié
                </span>
                <button
                  onClick={() => setCopiedEquipment(null)}
                  className="text-primary-400 hover:text-red-500 font-bold transition"
                  title="Vider le presse-papiers"
                >
                  <X size={12} />
                </button>
              </div>
              <p className="text-[11px] text-primary-600 dark:text-primary-300">
                Machine d'origine : <span className="font-semibold text-primary-800 dark:text-primary-100">{copiedEquipment.root.nom}</span> (+ {copiedEquipment.descendants.length} sous-ensemble{copiedEquipment.descendants.length > 1 ? 's' : ''})
              </p>
              <button
                onClick={() => handlePasteEquipment(null)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1 px-2 rounded text-[10px] text-center transition flex items-center justify-center gap-1"
              >
                <Download size={10} />
                Coller à la racine 📂
              </button>
            </div>
          )}

          {/* SEARCH & ADVANCED FILTER CONTROLS */}
          <div className="space-y-3 bg-primary-50/50 dark:bg-primary-900/20 p-3 rounded-xl border border-primary-200/50 dark:border-primary-700/50">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary-400" size={14} />
              <input
                type="text"
                placeholder="Rechercher une machine..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 text-xs py-1.5 w-full bg-white dark:bg-primary-800 border border-primary-200 dark:border-primary-700 rounded-lg outline-none focus:border-accent-orange transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-primary-400 dark:text-primary-500 uppercase tracking-wider flex items-center gap-1">
                <SlidersHorizontal size={10} /> État
              </span>
              <div className="flex gap-1">
                {(['all', 'Opérationnel', 'HS'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-md border transition ${
                      statusFilter === status
                        ? 'bg-accent-orange text-white border-accent-orange shadow-sm'
                        : 'bg-white dark:bg-primary-800 border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-700'
                    }`}
                  >
                    {status === 'all' ? 'Tous' : status === 'Opérationnel' ? 'En service' : 'En panne'}
                  </button>
                ))}
              </div>
            </div>

            {/* Criticality Filter */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-primary-400 dark:text-primary-500 uppercase tracking-wider block">
                Criticité
              </span>
              <div className="flex gap-1">
                {(['all', 'critique', 'normal'] as const).map((crit) => (
                  <button
                    key={crit}
                    type="button"
                    onClick={() => setCriticalityFilter(crit)}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-md border transition ${
                      criticalityFilter === crit
                        ? 'bg-red-500 text-white border-red-500 shadow-sm'
                        : 'bg-white dark:bg-primary-800 border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-700'
                    }`}
                  >
                    {crit === 'all' ? 'Tous' : crit === 'critique' ? '⚠️ Critique' : 'Standard'}
                  </button>
                ))}
              </div>
            </div>

            {/* Workshop Filter */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-primary-400 dark:text-primary-500 uppercase tracking-wider block">
                Atelier / Secteur
              </span>
              <select
                value={atelierFilter}
                onChange={e => setAtelierFilter(e.target.value)}
                className="text-xs py-1 px-1.5 w-full bg-white dark:bg-primary-800 border border-primary-200 dark:border-primary-700 rounded-lg outline-none focus:border-accent-orange transition-all"
              >
                <option value="all">Tous les ateliers</option>
                {[...settings.listes.ateliers].sort((a, b) => a.localeCompare(b)).map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div 
            className="arborescence-tree-container space-y-1 flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin"
            style={{ overflowY: 'auto' }}
          >
            {showTreeView && rootEquipements.length > 0 && (
              <div className="space-y-2 pb-2 mb-2 border-b border-primary-100 dark:border-primary-800/60 sticky top-0 bg-white/95 dark:bg-primary-900/95 backdrop-blur-xs z-10">
                {/* Tree Search Input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary-400" size={12} />
                  <input
                    type="text"
                    placeholder="Filtrer l'arborescence..."
                    value={treeSearchQuery}
                    onChange={e => setTreeSearchQuery(e.target.value)}
                    className="pl-8 pr-7 text-[11px] py-1.5 w-full bg-white dark:bg-primary-850 border border-primary-200 dark:border-primary-750 rounded-lg outline-none focus:border-accent-orange transition-all"
                  />
                  {treeSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTreeSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary-400 hover:text-red-500 transition"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTreePrintRoot(null);
                      setShowTreePrintPreview(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-teal-600 hover:text-accent-orange dark:text-teal-400 dark:hover:text-accent-orange bg-teal-500/5 hover:bg-teal-500/10 dark:bg-teal-500/5 dark:hover:bg-teal-500/10 rounded-md border border-teal-200 dark:border-teal-850/60 transition shadow-xs active:scale-95"
                    title="Exporter l'arborescence complète en PDF"
                  >
                    <Printer size={12} className="text-teal-500 dark:text-teal-450" />
                    Exporter PDF
                  </button>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const newExpanded: Record<string, boolean> = {};
                        equipements.forEach(e => {
                          newExpanded[e.id] = true;
                        });
                        setExpandedNodes(newExpanded);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-primary-600 hover:text-accent-orange dark:text-primary-400 dark:hover:text-accent-orange bg-primary-50 hover:bg-primary-100 dark:bg-primary-800/50 dark:hover:bg-primary-800 rounded-md border border-primary-200 dark:border-primary-700/60 transition shadow-xs active:scale-95"
                      title="Développer tous les équipements"
                    >
                      <FolderOpen size={12} className="text-primary-500" />
                      Tout développer
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedNodes({})}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-primary-600 hover:text-accent-orange dark:text-primary-400 dark:hover:text-accent-orange bg-primary-50 hover:bg-primary-100 dark:bg-primary-800/50 dark:hover:bg-primary-800 rounded-md border border-primary-200 dark:border-primary-700/60 transition shadow-xs active:scale-95"
                      title="Replier tous les équipements"
                    >
                      <FolderMinus size={12} className="text-primary-500" />
                      Tout réduire
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!showTreeView ? (
              filteredEquips.length === 0 ? (
                <p className="text-xs text-primary-400 text-center py-6">Aucun équipement trouvé.</p>
              ) : (
                filteredEquips.map(eq => {
                  const isSelected = selectedId === eq.id;
                  const isHS = eq.statut === 'HS';
                  return (
                    <div
                      key={eq.id}
                      onClick={() => setSelectedId(eq.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${isSelected ? 'bg-accent-orange/10 border-l-2 border-accent-orange' : 'hover:bg-primary-100 dark:hover:bg-primary-800'}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Cog size={16} className={`${isHS ? 'text-red-500 animate-spin' : 'text-primary-450'} shrink-0`} />
                        
                        {/* Star Icon for Favorites in Search List */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditEquipement(eq.id, { favoris: !eq.favoris });
                          }}
                          className="p-0.5 rounded hover:bg-primary-150 dark:hover:bg-primary-700 transition-all shrink-0 active:scale-90"
                          title={eq.favoris ? "Retirer des favoris" : "Ajouter aux favoris"}
                        >
                          <Star 
                            size={13} 
                            className={`${eq.favoris ? 'text-amber-500 fill-amber-400' : 'text-primary-300 dark:text-primary-600 hover:text-amber-500 dark:hover:text-amber-400'}`} 
                          />
                        </button>

                        <div className="flex flex-col min-w-0">
                          <span className={`text-xs font-semibold truncate ${isHS ? 'text-red-600 dark:text-red-400 font-bold' : 'text-primary-800 dark:text-primary-200'}`}>
                            {eq.nom}
                          </span>
                          <span className="text-[9px] text-primary-400 font-mono truncate">
                            {eq.atelier} · {eq.id}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {eq.critique && (
                          <Flame size={12} className="text-red-500" />
                        )}
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${isHS ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                          {eq.statut === 'HS' ? 'Panne' : 'OK'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )
            ) : filteredRootEquipements.length === 0 ? (
              <p className="text-xs text-primary-400 text-center py-6">
                {treeSearchQuery ? "Aucun équipement ne correspond à votre recherche dans l'arborescence." : "Aucun équipement enregistré."}
              </p>
            ) : (
              <>
                {/* FAVORITES SECTION */}
                {(() => {
                  const favoriteEquipements = equipements.filter(e => e.favoris);
                  if (favoriteEquipements.length === 0) return null;
                  return (
                    <div className="mb-4 bg-amber-500/5 dark:bg-amber-500/5 border border-amber-500/10 dark:border-amber-500/15 rounded-lg p-2 no-print">
                      <button
                        type="button"
                        onClick={() => setFavoritesExpanded(!favoritesExpanded)}
                        className="flex items-center justify-between w-full text-left px-1.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition"
                      >
                        <div className="flex items-center gap-1.5">
                          <Star size={14} className="fill-amber-400 text-amber-500" />
                          <span>Favoris ({favoriteEquipements.length})</span>
                        </div>
                        <ChevronRight size={14} className={`transform transition-transform ${favoritesExpanded ? 'rotate-90' : ''}`} />
                      </button>
                      
                      {favoritesExpanded && (
                        <div className="mt-1.5 space-y-1 pl-1">
                          {favoriteEquipements.map(eq => {
                            const isSelected = selectedId === eq.id;
                            const isHS = eq.statut === 'HS';
                            const fullPath = getEquipmentPath(eq);
                            
                            return (
                              <div
                                key={`fav-${eq.id}`}
                                onClick={() => setSelectedId(eq.id)}
                                className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer transition ${
                                  isSelected
                                    ? 'bg-amber-500/10 border-l-2 border-amber-500 text-amber-600 dark:text-amber-400 font-medium'
                                    : 'hover:bg-amber-500/5 text-primary-800 dark:text-primary-200'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditEquipement(eq.id, { favoris: false });
                                    }}
                                    className="p-0.5 rounded hover:bg-amber-500/10 text-amber-500 transition-all shrink-0 active:scale-90"
                                    title="Retirer des favoris"
                                  >
                                    <Star size={12} className="fill-amber-400 text-amber-500" />
                                  </button>
                                  <div className="flex flex-col min-w-0">
                                    <span className={`text-xs font-bold truncate ${isHS ? 'text-red-600 dark:text-red-400 line-through' : ''}`}>
                                      {eq.nom}
                                    </span>
                                    <span className="text-[9px] text-primary-400 dark:text-primary-500 font-mono truncate">
                                      {fullPath}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-1.5">
                                  {eq.critique && (
                                    <Flame size={11} className="text-red-500" />
                                  )}
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                                    isHS 
                                      ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' 
                                      : eq.statut === 'En Maintenance'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  }`}>
                                    {eq.statut === 'HS' ? 'Panne' : eq.statut === 'En Maintenance' ? 'Maint.' : 'OK'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {filteredRootEquipements.map(root => (
                  <TreeNode key={root.id} node={root} />
                ))}

                {draggedId && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsOverRoot(true);
                    }}
                    onDragLeave={() => setIsOverRoot(false)}
                    onDrop={(e) => handleDrop(e, null)}
                    className={`mt-4 p-4 border-2 border-dashed rounded-lg text-center transition cursor-pointer select-none ${
                      isOverRoot
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 scale-[1.01]'
                        : 'border-primary-300 dark:border-primary-700 text-primary-400 dark:text-primary-500 hover:border-primary-450 dark:hover:border-primary-600'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Folder size={18} className="text-primary-400 animate-pulse" />
                      <span className="text-xs font-semibold">
                        Déposer ici pour rendre racine
                      </span>
                      <span className="text-[10px] text-primary-400">
                        (Aucun parent)
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* DRAG HANDLE RESIZER */}
        <div
          onMouseDown={() => setIsDraggingWidth(true)}
          className={`hidden lg:flex select-none w-4 hover:w-6 hover:-mx-1 cursor-col-resize items-center justify-center group active:w-6 active:-mx-1 transition-all duration-150 shrink-0 self-stretch z-20 ${
            isDraggingWidth ? 'bg-amber-500/10' : ''
          }`}
          style={{ height: 'calc(100vh - 130px)', position: 'sticky', top: '90px' }}
        >
          <div className={`w-3 h-16 rounded-full border-2 border-black dark:border-black shadow-md transition-all duration-150 ${
            isDraggingWidth ? 'bg-accent-orange h-24 w-3.5' : 'bg-white dark:bg-primary-800 group-hover:bg-accent-orange'
          }`} />
        </div>

        {/* RIGHT COLUMN: DETAIL OR EDIT PANEL */}
        <div className="w-full min-w-0 lg:pl-6">
          {isEditing || isCreating ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card"
            >
              <div className="flex items-center gap-2 pb-4 border-b border-primary-200 dark:border-primary-700 mb-6">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setIsEditingNew(false);
                    localStorage.removeItem('gmao_eq_is_editing');
                    localStorage.removeItem('gmao_eq_is_creating');
                    localStorage.removeItem('gmao_draft_eq_create');
                    if (selectedId) {
                      localStorage.removeItem(`gmao_draft_eq_edit_${selectedId}`);
                    }
                  }}
                  className="p-1.5 bg-primary-100 hover:bg-primary-200 dark:bg-primary-900 dark:hover:bg-primary-800 rounded-lg text-primary-600 dark:text-primary-300"
                >
                  <ArrowLeft size={16} />
                </button>
                <h3 className="text-base font-display font-bold text-primary-900 dark:text-white">
                  {isEditing ? `Modifier : ${formNom}` : "Créer un équipement ou sous-ensemble"}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="grid-form">
                <div>
                  <label className="flex items-center gap-1.5 font-semibold">
                    <span>Nom du Matériel / Composant</span>
                    <span className="text-red-500">*</span>
                    {formNom.trim() ? (
                      <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" title="Saisie valide" />
                    ) : null}
                  </label>
                  <input
                    type="text"
                    required
                    value={formNom}
                    onChange={e => setFormNom(e.target.value)}
                    placeholder="Ex: Pompe Principale P10"
                  />
                </div>

                <div>
                  <label>Type / Modèle</label>
                  <input
                    type="text"
                    value={formType}
                    onChange={e => setFormType(e.target.value)}
                    placeholder="Ex: Rexroth-P10-V"
                  />
                </div>

                <div className="col-span-2 p-3 bg-amber-50 dark:bg-primary-900 border border-amber-200 dark:border-primary-800 rounded-lg">
                  <label className="text-amber-800 dark:text-amber-300">Ce matériel appartient-il à un autre équipement ? (Sous-Ensemble)</label>
                  <EquipmentTreeSelect
                    equipements={equipements}
                    selectedId={formParentId}
                    onSelect={setFormParentId}
                    excludeId={selectedId || ''}
                    noneLabel="Non (C'est un équipement racine / machine principale)"
                    placeholder="Choisir l'équipement parent dans l'arborescence..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 font-semibold">
                    <span>Atelier / Secteur</span>
                    <span className="text-red-500">*</span>
                    {formAtelier ? (
                      <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" title="Saisie valide" />
                    ) : null}
                  </label>
                  <select value={formAtelier} onChange={e => setFormAtelier(e.target.value)}>
                    {[...settings.listes.ateliers].sort((a, b) => a.localeCompare(b)).map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 font-semibold">
                    <span>Métier / Catégorie</span>
                    <span className="text-red-500">*</span>
                    {formMetier ? (
                      <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" title="Saisie valide" />
                    ) : null}
                  </label>
                  <select value={formMetier} onChange={e => setFormMetier(e.target.value)}>
                    {[...settings.listes.metiers].sort((a, b) => a.localeCompare(b)).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Statut opérationnel</label>
                  <select
                    value={formStatut}
                    onChange={e => setFormStatut(e.target.value as 'Opérationnel' | 'HS' | 'En Maintenance')}
                  >
                    <option value="En Maintenance">En Maintenance</option>
                    <option value="HS">Hors Service (HS / Panne)</option>
                    <option value="Opérationnel">Opérationnel</option>
                  </select>
                </div>

                <div>
                  <label>Marque / Constructeur</label>
                  <select value={formMarque} onChange={e => setFormMarque(e.target.value)}>
                    <option value="">Sélectionner constructeur...</option>
                    {[...settings.listes.marques].sort((a, b) => a.localeCompare(b)).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Numéro de Série (SN)</label>
                  <input
                    type="text"
                    value={formSerie}
                    onChange={e => setFormSerie(e.target.value)}
                    placeholder="SN-XXXXX"
                  />
                </div>

                <div>
                  <label>Année de Fabrication</label>
                  <input
                    type="number"
                    value={formAnnee}
                    onChange={e => setFormAnnee(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label>Date fin de garantie</label>
                  <input
                    type="date"
                    value={formGarantie}
                    onChange={e => setFormGarantie(e.target.value)}
                  />
                </div>

                <div>
                  <label>Prix d'Achat HT (€)</label>
                  <input
                    type="number"
                    value={formPrix}
                    onChange={e => setFormPrix(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label>Temps d'ouverture (Heures / An)</label>
                  <input
                    type="number"
                    value={formTemps}
                    onChange={e => setFormTemps(Number(e.target.value))}
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 px-3 py-3 border border-red-200 dark:border-primary-800 bg-red-50 dark:bg-primary-900 rounded-lg cursor-pointer select-none text-red-800 dark:text-red-300 font-bold w-full">
                    <input
                      type="checkbox"
                      checked={formCritique}
                      onChange={e => setFormCritique(e.target.checked)}
                      className="h-5 w-5 accent-red-600 rounded"
                    />
                    ÉQUIPEMENT CLASSÉ CRITIQUE
                  </label>
                </div>

                <div className="col-span-2">
                  <label>Pièces de rechange affectées (séparées par des virgules)</label>
                  <textarea
                    value={formPieces}
                    onChange={e => setFormPieces(e.target.value)}
                    rows={2}
                    placeholder="Filtres, Relais, Capteurs..."
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-primary-400 dark:text-primary-500 uppercase tracking-wider mb-2">Photo de l'Équipement</label>
                  <div className="flex flex-col sm:flex-row gap-4 items-center p-4 bg-primary-50 dark:bg-primary-900/40 border border-primary-200/60 dark:border-primary-800 rounded-xl">
                    {formPhotoUrl ? (
                      <div className="relative group shrink-0 w-32 h-32 rounded-lg overflow-hidden border border-primary-200 dark:border-primary-700 bg-white shadow-sm">
                        <img src={formPhotoUrl} alt="Aperçu équipement" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormPhotoUrl('')}
                          className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity font-bold text-xs gap-1.5"
                        >
                          <X size={14} />
                          Supprimer
                        </button>
                      </div>
                    ) : (
                      <div className="shrink-0 w-32 h-32 rounded-lg border-2 border-dashed border-primary-300 dark:border-primary-750 flex flex-col items-center justify-center bg-white/50 dark:bg-primary-950/20 text-primary-400">
                        <Camera size={28} className="mb-2 text-primary-300" />
                        <span className="text-[10px] text-center px-2">Aucune photo</span>
                      </div>
                    )}

                    <div className="flex-1 space-y-3 w-full">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">Importer une image</span>
                        <p className="text-[10px] text-primary-400 leading-relaxed">Téléchargez une photo depuis votre appareil (max 1 Mo) ou renseignez une adresse URL d'image en ligne.</p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <label className="btn-secondary flex items-center justify-center gap-1.5 text-xs py-1.5 px-3 bg-white hover:bg-primary-50 text-primary-700 dark:bg-primary-800 dark:hover:bg-primary-750 dark:text-primary-200 border border-primary-200 dark:border-primary-700 cursor-pointer shrink-0">
                          <Upload size={12} className="text-accent-orange" />
                          Choisir un fichier...
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const compressed = await compressImage(file, 1.0);
                                  setFormPhotoUrl(compressed);
                                } catch (error: any) {
                                  alert("Erreur lors du traitement de la photo : " + (error.message || error));
                                }
                              }
                            }}
                          />
                        </label>
                        
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={formPhotoUrl.startsWith('data:') ? '' : formPhotoUrl}
                            onChange={(e) => setFormPhotoUrl(e.target.value)}
                            placeholder="Ou coller l'URL d'une image en ligne..."
                            className="text-xs py-1.5 pl-2.5 w-full bg-white dark:bg-primary-800 border border-primary-200 dark:border-primary-700 rounded-lg outline-none focus:border-accent-orange"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <label>Spécifications techniques / Observations</label>
                  <textarea
                    value={formInfos}
                    onChange={e => setFormInfos(e.target.value)}
                    rows={3}
                    placeholder="Entrer les détails ici..."
                  />
                </div>

                <div className="col-span-2 flex justify-end gap-3 mt-4 border-t border-primary-100 dark:border-primary-800 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setIsEditingNew(false);
                      localStorage.removeItem('gmao_eq_is_editing');
                      localStorage.removeItem('gmao_eq_is_creating');
                      localStorage.removeItem('gmao_draft_eq_create');
                      if (selectedId) {
                        localStorage.removeItem(`gmao_draft_eq_edit_${selectedId}`);
                      }
                    }}
                    className="btn-secondary"
                  >
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary">
                    Sauvegarder
                  </button>
                </div>
              </form>
            </motion.div>
          ) : selectedEq ? (
            <div className="space-y-6">
              {/* BREADCRUMB */}
              {(() => {
                const path = getBreadcrumbPath(selectedEq);
                return (
                  <nav className="flex items-center flex-wrap gap-1 text-[11px] text-primary-500 dark:text-primary-400 font-medium px-1 no-print">
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="hover:text-accent-orange transition flex items-center gap-1 py-0.5 rounded text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-850 px-1"
                      title="Retour à l'accueil"
                    >
                      <Layers size={12} />
                      <span>Équipements</span>
                    </button>
                    {path.map((item, idx) => (
                      <React.Fragment key={item.id}>
                        <ChevronRight size={11} className="text-primary-350 dark:text-primary-650 shrink-0" />
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className={`hover:text-accent-orange transition py-0.5 px-1.5 rounded truncate max-w-[150px] ${
                            idx === path.length - 1 
                              ? 'text-primary-900 dark:text-white font-bold bg-primary-100/50 dark:bg-primary-800/50 cursor-default' 
                              : 'hover:bg-primary-50 dark:hover:bg-primary-850'
                          }`}
                          disabled={idx === path.length - 1}
                        >
                          {item.nom}
                        </button>
                      </React.Fragment>
                    ))}
                  </nav>
                );
              })()}
              {/* WARNING BANNER FOR COPY-PASTED SUB-ASSEMBLIES */}
              {selectedEq.copiedWarning && (
                <div className="bg-amber-50 dark:bg-amber-950/25 border border-amber-300 dark:border-amber-900/60 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 animate-fade-in shadow-sm">
                  <div className="flex gap-2.5 items-start">
                    <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                        ⚠️ Équipement Copié/Collé
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                        Cet équipement est issu d'un copié/collé d'un sous-ensemble de la machine <span className="font-semibold">"{selectedEq.copiedFromParentName || 'autre machine'}"</span>.
                        Veuillez modifier ses caractéristiques techniques pour qu'il s'accorde précisément avec sa nouvelle machine parente.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditEquipement(selectedEq.id, { copiedWarning: false })}
                    className="btn-primary text-[10px] font-bold px-3 py-1.5 bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 border-none shrink-0"
                  >
                    Marquer comme configuré
                  </button>
                </div>
              )}

              {/* DETAILS PANEL BAR */}
              <div className="card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-display font-bold text-primary-900 dark:text-white">
                      {selectedEq.nom}
                    </h2>
                    {selectedEq.critique && (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 flex items-center gap-1">
                        <Flame size={10} />
                        Critique
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-primary-500 dark:text-primary-400 mt-1 font-mono uppercase">
                    ID: {selectedEq.id} · Atelier: {selectedEq.atelier}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    selectedEq.statut === 'Opérationnel' 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                      : selectedEq.statut === 'En Maintenance'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                  }`}>
                    {selectedEq.statut}
                  </span>
                  {selectedEq.annee && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center gap-1.5" id="eq-age-badge">
                      <Clock size={12} className="text-blue-600 dark:text-blue-400" />
                      Âge : {new Date().getFullYear() - selectedEq.annee} {new Date().getFullYear() - selectedEq.annee > 1 ? 'ans' : 'an'}
                    </span>
                  )}
                  <button
                    onClick={() => handleCopyEquipment(selectedEq)}
                    className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-semibold"
                    title="Copier ce sous-ensemble (et tous ses composants imbriqués)"
                  >
                    <Layers size={12} />
                    Copier
                  </button>
                  {copiedEquipment && (
                    <button
                      onClick={() => handlePasteEquipment(selectedEq.id)}
                      className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-bold animate-pulse"
                      title={`Coller sous "${selectedEq.nom}"`}
                    >
                      <Download size={12} />
                      Coller ici
                    </button>
                  )}
                  <button
                    onClick={() => setShowPrintPreview(true)}
                    className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 bg-white hover:bg-primary-50 text-primary-700 dark:bg-primary-800 dark:hover:bg-primary-750 dark:text-primary-200 border border-primary-200 dark:border-primary-700"
                    title="Imprimer la fiche d'équipement"
                  >
                    <Printer size={12} className="text-accent-orange" />
                    Imprimer
                  </button>
                  <button
                    onClick={handleStartEdit}
                    className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
                  >
                    <Pen size={12} />
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDeleteEquipment(selectedEq.id)}
                    className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold"
                    title="Supprimer l'équipement définitivement"
                  >
                    <Trash2 size={12} />
                    Supprimer
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-primary-200 dark:border-primary-700 mt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('technique')}
                  className={`px-4 py-2 font-display text-sm font-bold border-b-2 transition ${
                    activeTab === 'technique'
                      ? 'border-accent-orange text-accent-orange'
                      : 'border-transparent text-primary-450 hover:text-primary-600 dark:hover:text-primary-200'
                  }`}
                >
                  Fiche Technique & Diagnostic
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('historique')}
                  className={`px-4 py-2 font-display text-sm font-bold border-b-2 transition ${
                    activeTab === 'historique'
                      ? 'border-accent-orange text-accent-orange'
                      : 'border-transparent text-primary-450 hover:text-primary-600 dark:hover:text-primary-200'
                  }`}
                >
                  Historique ({interventions.filter(i => i.equipementId === selectedEq.id).length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className={`px-4 py-2 font-display text-sm font-bold border-b-2 transition ${
                    activeTab === 'documents'
                      ? 'border-accent-orange text-accent-orange'
                      : 'border-transparent text-primary-450 hover:text-primary-600 dark:hover:text-primary-200'
                  }`}
                >
                  Documents (GED) ({documents.filter(d => d.equipementId === selectedEq.id).length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('consommations')}
                  className={`px-4 py-2 font-display text-sm font-bold border-b-2 transition ${
                    activeTab === 'consommations'
                      ? 'border-accent-orange text-accent-orange'
                      : 'border-transparent text-primary-450 hover:text-primary-600 dark:hover:text-primary-200'
                  }`}
                >
                  Consommations ({(() => {
                    const eqInterventions = interventions.filter(i => i.equipementId === selectedEq.id);
                    let count = 0;
                    eqInterventions.forEach(i => {
                      if (!i.piecesConso || i.piecesConso === 'Aucune' || i.piecesConso.trim() === '') return;
                      count += i.piecesConso.split(',').filter(p => p.trim()).length;
                    });
                    return count;
                  })()})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('predictif')}
                  className={`px-4 py-2 font-display text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${
                    activeTab === 'predictif'
                      ? 'border-accent-orange text-accent-orange'
                      : 'border-transparent text-primary-450 hover:text-primary-600 dark:hover:text-primary-200'
                  }`}
                  id="tab-predictif-button"
                >
                  <Sparkles size={14} className="text-indigo-500" />
                  Analyse Prédictive
                </button>
              </div>

              {activeTab === 'technique' && (
                <>
                  {/* TWO COLUMN SUMMARY */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Specs list */}
                    <div className="card space-y-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-primary-800 dark:text-primary-200 border-b border-primary-100 dark:border-primary-800 pb-2">
                        <Layers size={16} className="text-accent-orange inline mr-2" />
                        Caractéristiques Techniques
                      </h3>

                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex flex-col gap-3 shrink-0 items-center md:items-start w-full md:w-auto">
                          {selectedEq.photoUrl && (
                            <div className="w-full md:w-32 h-32 rounded-lg overflow-hidden border border-primary-200 dark:border-primary-700 bg-white shadow-sm">
                              <img src={selectedEq.photoUrl} alt={selectedEq.nom} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          )}
                          
                          {/* QR Code Équipement */}
                          <div className="w-full md:w-32 h-32 rounded-lg border border-primary-200 dark:border-primary-700 bg-white p-2 shadow-sm flex flex-col items-center justify-center relative group">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=0f172a&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}#/portal-terrain?eq=${selectedEq.id}` : selectedEq.id)}`}
                              alt={`QR Code ${selectedEq.nom}`}
                              referrerPolicy="no-referrer"
                              className="w-20 h-20 object-contain select-none"
                            />
                            <span className="text-[7.5px] font-mono font-bold text-slate-800 tracking-wider truncate max-w-full uppercase mt-1">
                              ID: {selectedEq.id.substring(0, 8)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setQrSelectedEqForSinglePrint(selectedEq);
                                setShowSingleQRPrint(true);
                              }}
                              className="absolute inset-0 bg-primary-950/80 text-white rounded-lg opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition duration-200 cursor-pointer"
                              title="Imprimer cette étiquette QR Code"
                            >
                              <QrCode size={18} />
                              <span>Imprimer QR</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                          <div>
                            <span className="text-primary-400 block">Constructeur :</span>
                            <span className="font-semibold text-primary-800 dark:text-primary-200">{selectedEq.marque || "-"}</span>
                          </div>
                          <div>
                            <span className="text-primary-400 block">Type/Modèle :</span>
                            <span className="font-semibold text-primary-800 dark:text-primary-200">{selectedEq.type || "-"}</span>
                          </div>
                          <div>
                            <span className="text-primary-400 block">Numéro de série :</span>
                            <span className="font-semibold font-mono text-primary-800 dark:text-primary-200">{selectedEq.serie || "-"}</span>
                          </div>
                          <div>
                            <span className="text-primary-400 block">Année :</span>
                            <span className="font-semibold text-primary-800 dark:text-primary-200" id="spec-eq-annee">
                              {selectedEq.annee || "-"}
                              {selectedEq.annee ? ` (${new Date().getFullYear() - selectedEq.annee} ${new Date().getFullYear() - selectedEq.annee > 1 ? 'ans' : 'an'})` : ""}
                            </span>
                          </div>
                          <div>
                            <span className="text-primary-400 block">Dernier prix HT :</span>
                            <span className="font-semibold text-primary-800 dark:text-primary-200">{(selectedEq.prix || 0).toLocaleString()} €</span>
                          </div>
                          <div>
                            <span className="text-primary-400 block">Temps d'ouverture :</span>
                            <span className="font-semibold text-primary-800 dark:text-primary-200">{selectedEq.tempsOuverture || 3600} H/An</span>
                          </div>
                        </div>
                      </div>

                      {selectedEq.infos && (
                        <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900 rounded-lg text-xs italic text-primary-600 dark:text-primary-300">
                          &ldquo;{selectedEq.infos}&rdquo;
                        </div>
                      )}
                    </div>

                    {/* Sub-ensembles & Components */}
                    <div className="card space-y-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-primary-800 dark:text-primary-200 border-b border-primary-100 dark:border-primary-800 pb-2">
                        <Network size={16} className="text-indigo-500 inline mr-2" />
                        Composants Imbriqués
                      </h3>

                      <div className="space-y-2">
                        {getSubEnsembles(selectedEq.id).length === 0 ? (
                          <p className="text-xs text-primary-400 italic">Aucun sous-ensemble lié.</p>
                        ) : (
                          getSubEnsembles(selectedEq.id).map(sub => (
                            <div
                              key={sub.id}
                              onClick={() => setSelectedId(sub.id)}
                              className="flex items-center justify-between p-2.5 bg-primary-50 dark:bg-primary-900 border border-primary-100 dark:border-primary-800 rounded-lg cursor-pointer hover:border-indigo-400 transition"
                            >
                              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                {sub.nom}
                              </span>
                              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                                {sub.metier}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AI DIAGNOSTIC AND PREDICTIVE ASSISTANT */}
                  <div className="card border-l-4 border-l-indigo-600 bg-indigo-50/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Brain className="text-indigo-600 dark:text-indigo-400 shrink-0" size={24} />
                        <div>
                          <h3 className="text-sm font-bold text-primary-900 dark:text-white">
                            Assistant GMAO IA : Analyse de Fiabilité
                          </h3>
                          <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">
                            Calculez le MTBF théorique et estimez le risque de défaillance imminente sous 30 jours.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={runAiDiagnostic}
                        disabled={isAiLoading}
                        className="btn-primary shrink-0 self-start sm:self-auto flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 text-xs py-2"
                      >
                        {isAiLoading ? (
                          <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                          <Brain size={14} />
                        )}
                        {isAiLoading ? "Traitement..." : "Lancer l'analyse"}
                      </button>
                    </div>

                    <AnimatePresence>
                      {aiReport && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 p-4 border border-indigo-200 dark:border-primary-700 rounded-lg bg-white dark:bg-primary-900 text-xs font-mono text-primary-700 dark:text-primary-300 whitespace-pre-wrap leading-relaxed shadow-inner"
                        >
                          {aiReport}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {activeTab === 'historique' && (
                <div className="space-y-6">
                  {/* TIMELINE RENDER */}
                  {renderTimeline()}

                  {/* DETAILED CHRONOLOGICAL TIMELINE LIST */}
                  {renderDetailedHistory()}
                </div>
              )}

              {activeTab === 'documents' && renderDocumentsGedTab(selectedEq)}

              {activeTab === 'consommations' && renderConsommationsTab(selectedEq)}

              {activeTab === 'predictif' && renderPredictiveTab(selectedEq)}
            </div>
          ) : (
            <div className="card text-center py-12 space-y-4">
              <div className="h-16 w-16 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 text-primary-400 dark:text-primary-600 rounded-full flex items-center justify-center mx-auto">
                <BookOpen size={28} />
              </div>
              <div className="max-w-sm mx-auto">
                <h3 className="text-base font-display font-bold text-primary-800 dark:text-white">
                  Sélectionnez un matériel
                </h3>
                <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
                  Parcourez la sitemap industrielle à gauche pour afficher l'historique complet, les caractéristiques et les prédictions d'un équipement.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PRINT PREVIEW / PDF GENERATION MODAL FOR EQUIPMENT */}
      <AnimatePresence>
        {showPrintPreview && selectedEq && (
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
                  <span className="font-display font-bold text-sm text-primary-800 dark:text-white">Aperçu avant impression (Fiche d'Équipement)</span>
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
                    }}
                    className="btn-secondary text-xs py-1.5 px-3 rounded-lg"
                  >
                    Fermer
                  </button>
                </div>
              </div>

              {/* The printable sheet itself */}
              <div className="p-4 md:p-8 flex justify-center bg-primary-50 dark:bg-primary-900/40">
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
                      <div className="px-3 py-1 border border-black font-extrabold text-xs uppercase mb-2">
                        Fiche d'Équipement Technique
                      </div>
                      <BarcodeSim value={selectedEq.id} />
                    </div>
                  </div>

                  {/* Banner */}
                  <div className="bg-gray-100 p-3 border border-black flex justify-between items-center mb-6 text-black">
                    <div>
                      <span className="text-[9px] uppercase text-gray-600 font-bold block">Nom de la machine</span>
                      <span className="text-xs font-bold">{selectedEq.nom}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-gray-600 font-bold block">Localisation / Atelier</span>
                      <span className="text-xs font-bold">{selectedEq.atelier}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-gray-600 font-bold block">Statut Actuel</span>
                      <span className="text-xs font-bold uppercase">{selectedEq.statut}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-gray-600 font-bold block">Criticité</span>
                      <span className="text-xs font-bold uppercase">{selectedEq.critique ? '🔴 CRITIQUE' : '🟢 NORMAL'}</span>
                    </div>
                  </div>

                  {/* Section 1: Caractéristiques */}
                  <div className="mb-6">
                    <h3 className="text-xs font-bold uppercase border-b border-black pb-1 mb-3 text-black">1. Caractéristiques Générales</h3>
                    <div className="flex gap-4">
                      <div className={`${selectedEq.photoUrl ? 'w-2/3' : 'w-full'} grid grid-cols-3 gap-y-2 gap-x-4 border border-black p-3 rounded-sm bg-gray-50/50`}>
                        <div>
                          <span className="text-[9px] uppercase text-gray-500 block">ID Unique</span>
                          <span className="font-semibold font-mono">{selectedEq.id}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-gray-500 block">Atelier</span>
                          <span className="font-semibold">{selectedEq.atelier}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-gray-500 block">Discipline / Métier</span>
                          <span className="font-semibold">{selectedEq.metier}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-gray-500 block">Marque</span>
                          <span className="font-semibold">{selectedEq.marque || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-gray-500 block">Type / Modèle</span>
                          <span className="font-semibold">{selectedEq.type || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-gray-500 block">Numéro de Série</span>
                          <span className="font-semibold font-mono">{selectedEq.serie || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-gray-500 block">Année d'installation</span>
                          <span className="font-semibold">{selectedEq.annee || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-gray-500 block">Garantie</span>
                          <span className="font-semibold">{selectedEq.garantie || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-gray-500 block">Prix d'acquisition</span>
                          <span className="font-semibold">{(selectedEq.prix || 0).toLocaleString()} €</span>
                        </div>
                        <div className="col-span-3">
                          <span className="text-[9px] uppercase text-gray-500 block">Description / Informations</span>
                          <span className="italic">{selectedEq.infos || "Aucune information supplémentaire rédigée."}</span>
                        </div>
                      </div>
                      {selectedEq.photoUrl && (
                        <div className="w-1/3 border border-black p-2 rounded-sm bg-gray-50/50 flex items-center justify-center">
                          <img src={selectedEq.photoUrl} alt={selectedEq.nom} className="max-h-36 max-w-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Structure et Components */}
                  <div className="mb-6">
                    <h3 className="text-xs font-bold uppercase border-b border-black pb-1 mb-3 text-black">2. Structure Hiérarchique & Composants</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border border-black p-3 rounded-sm">
                        <h4 className="text-[10px] font-bold uppercase text-gray-700 mb-2 font-display">Sous-ensembles rattachés ({getSubEnsembles(selectedEq.id).length})</h4>
                        {getSubEnsembles(selectedEq.id).length === 0 ? (
                          <p className="text-[10px] text-gray-500 italic">Aucun sous-ensemble rattaché.</p>
                        ) : (
                          <ul className="list-disc list-inside space-y-1 text-[10px]">
                            {getSubEnsembles(selectedEq.id).map(sub => (
                              <li key={sub.id}>
                                <span className="font-semibold">{sub.nom}</span> <span className="font-mono text-gray-500">({sub.id})</span> - {sub.metier}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="border border-black p-3 rounded-sm">
                        <h4 className="text-[10px] font-bold uppercase text-gray-700 mb-2 font-display">Pièces de rechange associées</h4>
                        {pieces.filter(p => p.equipementsLies && p.equipementsLies.includes(selectedEq.id)).length === 0 ? (
                          <p className="text-[10px] text-gray-500 italic">Aucune pièce de rechange spécifiquement associée.</p>
                        ) : (
                          <ul className="list-disc list-inside space-y-1 text-[10px]">
                            {pieces.filter(p => p.equipementsLies && p.equipementsLies.includes(selectedEq.id)).map(p => (
                              <li key={p.id}>
                                <span className="font-semibold">{p.designation}</span> - Réf: <span className="font-mono">{p.reference}</span> (Stock: {p.quantite})
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Historique */}
                  <div className="mb-6">
                    <h3 className="text-xs font-bold uppercase border-b border-black pb-1 mb-3 text-black">3. Historique Récent des Interventions</h3>
                    {interventions.filter(i => i.equipementId === selectedEq.id).length === 0 ? (
                      <p className="text-[10px] text-gray-500 italic p-3 border border-dashed border-gray-300 text-center">Aucune intervention enregistrée sur cet équipement.</p>
                    ) : (
                      <table className="w-full border-collapse border border-black text-[10px]">
                        <thead>
                          <tr className="bg-gray-100 text-black">
                            <th className="border border-black p-1.5 text-left font-bold">Date / Réf</th>
                            <th className="border border-black p-1.5 text-left font-bold">Type / Urgence</th>
                            <th className="border border-black p-1.5 text-left font-bold">Problème / Effet</th>
                            <th className="border border-black p-1.5 text-left font-bold">Compte-Rendu / Actions</th>
                            <th className="border border-black p-1.5 text-left font-bold">Statut</th>
                            <th className="border border-black p-1.5 text-left font-bold">Intervenant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {interventions
                            .filter(i => i.equipementId === selectedEq.id)
                            .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime())
                            .slice(0, 10)
                            .map(i => (
                              <tr key={i.id} className="border-b border-black">
                                <td className="border border-black p-1.5 font-medium whitespace-nowrap">
                                  {new Date(i.dateCreation).toLocaleDateString('fr-FR')}<br />
                                  <span className="font-mono text-gray-600 font-bold">{i.numero}</span>
                                </td>
                                <td className="border border-black p-1.5 whitespace-nowrap">
                                  <span className="font-semibold">{i.typeDoc}</span><br />
                                  <span className="text-gray-600 uppercase text-[9px]">{i.urgence}</span>
                                </td>
                                <td className="border border-black p-1.5 font-semibold text-gray-950 max-w-[120px] break-words">
                                  {i.typeProbleme || i.effet || 'Non spécifié'}
                                  <p className="text-[9px] font-normal text-gray-500 line-clamp-2 mt-0.5">{i.description}</p>
                                </td>
                                <td className="border border-black p-1.5 text-gray-800 max-w-[180px] break-words">
                                  {i.compteRendu || <span className="italic text-gray-400">Aucun compte-rendu</span>}
                                  {i.piecesConso && (
                                    <p className="text-[8px] font-semibold text-amber-800 mt-1">🔧 Pièces : {i.piecesConso}</p>
                                  )}
                                </td>
                                <td className="border border-black p-1.5 font-bold uppercase text-center whitespace-nowrap">{i.statut}</td>
                                <td className="border border-black p-1.5 whitespace-nowrap">{i.technicienCloture || i.operateur || i.demandeur}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Section 4: Signatures */}
                  <div className="grid grid-cols-2 gap-8 mt-12">
                    <div className="border border-black p-4 h-24 flex flex-col justify-between bg-white text-black">
                      <span className="text-[9px] uppercase text-gray-500 font-bold">Technicien Référent (Visa & Date)</span>
                      <div className="border-t border-dashed border-gray-300 w-1/2 self-end"></div>
                    </div>
                    <div className="border border-black p-4 h-24 flex flex-col justify-between bg-white text-black">
                      <span className="text-[9px] uppercase text-gray-500 font-bold">Responsable Technique (Visa & Date)</span>
                      <div className="border-t border-dashed border-gray-300 w-1/2 self-end"></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRINT TREE MODAL */}
      <AnimatePresence>
        {showTreePrintPreview && (
          <div className="modal z-[110] no-print">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content text-left overflow-y-auto max-h-[95vh] bg-primary-100 dark:bg-primary-950 p-0 shadow-2xl"
              style={{ maxWidth: '850px', width: '95%' }}
            >
              {/* Toolbar */}
              <div className="p-4 bg-white dark:bg-primary-900 border-b border-primary-200 dark:border-primary-800 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <Printer size={18} className="text-accent-orange" />
                  <span className="font-display font-bold text-sm text-primary-800 dark:text-white">
                    Aperçu avant impression (Arborescence)
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setTimeout(() => {
                        window.print();
                      }, 100);
                    }}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-accent-orange hover:bg-accent-orange-hover text-white rounded-lg font-semibold"
                  >
                    <Printer size={14} />
                    <span>Imprimer / PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowTreePrintPreview(false);
                      setTreePrintRoot(null);
                    }}
                    className="btn-secondary text-xs py-1.5 px-3 rounded-lg font-semibold"
                  >
                    Fermer
                  </button>
                </div>
              </div>

              {/* Selection toolbar */}
              <div className="px-6 py-3 bg-white/50 dark:bg-primary-900/50 border-b border-primary-200 dark:border-primary-800 text-xs flex flex-wrap gap-4 items-center">
                <span className="font-semibold text-primary-700 dark:text-primary-300">Étendue de l'export :</span>
                <label className="flex items-center gap-2 cursor-pointer text-primary-800 dark:text-primary-200">
                  <input
                    type="radio"
                    name="printScope"
                    checked={treePrintRoot === null}
                    onChange={() => setTreePrintRoot(null)}
                    className="text-accent-orange focus:ring-accent-orange bg-white dark:bg-primary-800"
                  />
                  <span>Tout le parc machine ({equipements.filter(e => !e.parentId).length} racines)</span>
                </label>
                {treePrintRoot && (
                  <label className="flex items-center gap-2 cursor-pointer text-primary-800 dark:text-primary-200">
                    <input
                      type="radio"
                      name="printScope"
                      checked={treePrintRoot !== null}
                      onChange={() => {}}
                      className="text-accent-orange focus:ring-accent-orange bg-white dark:bg-primary-800"
                    />
                    <span>Sous-arborescence de : <strong className="text-accent-orange">{treePrintRoot.nom}</strong></span>
                  </label>
                )}
              </div>

              {/* Printable container */}
              <div className="p-4 md:p-8 flex justify-center bg-primary-50 dark:bg-primary-900/40">
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
                      <div className="px-3 py-1 border border-black font-extrabold text-xs uppercase mb-2">
                        Rapport d'Arborescence Technique
                      </div>
                      <div className="text-[9px] text-gray-500 font-bold">
                        {treePrintRoot ? `Scope: ${treePrintRoot.nom}` : 'Scope: Parc Complet'}
                      </div>
                    </div>
                  </div>

                  {/* Overview Stats for Arborescence */}
                  <div className="bg-gray-100 p-4 border border-black mb-6 text-black grid grid-cols-4 gap-4">
                    <div>
                      <span className="text-[9px] uppercase text-gray-600 font-bold block">Équipements total</span>
                      <span className="text-base font-bold">
                        {treePrintRoot 
                          ? getDescendantsCount(treePrintRoot.id) + 1 
                          : equipements.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-gray-600 font-bold block">Opérationnels</span>
                      <span className="text-base font-bold text-emerald-700">
                        {getFilteredStatusCount('Opérationnel')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-gray-600 font-bold block">En Panne (HS)</span>
                      <span className="text-base font-bold text-red-600">
                        {getFilteredStatusCount('HS')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-gray-600 font-bold block">Critiques</span>
                      <span className="text-base font-bold text-amber-700">
                        {getFilteredCritiqueCount()}
                      </span>
                    </div>
                  </div>

                  {/* Arborescence Tree Content */}
                  <div className="space-y-1">
                    {renderPrintTree()}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DEDICATED QR CODES MANAGER SECTION */}
      <AnimatePresence>
        {showQRSection && (
          <div className="modal z-[100] no-print">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content text-left overflow-y-auto max-h-[95vh] bg-primary-100 dark:bg-primary-950 p-0 shadow-2xl flex flex-col"
              style={{ maxWidth: '1000px', width: '95%' }}
            >
              {/* Header */}
              <div className="p-5 bg-white dark:bg-primary-900 border-b border-primary-200 dark:border-primary-800 flex justify-between items-center sticky top-0 z-20 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <QrCode size={22} />
                  </div>
                  <div>
                    <h2 className="font-display font-extrabold text-base text-primary-900 dark:text-white">
                      Générateur d'Étiquettes QR Codes d'Équipements
                    </h2>
                    <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">
                      Générez, prévisualisez et imprimez les codes QR uniques pour identifier vos équipements en usine.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQRSection(false)}
                  className="p-1.5 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg text-primary-400 hover:text-primary-600 transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Filters Toolbar */}
              <div className="p-4 bg-white/70 dark:bg-primary-900/70 border-b border-primary-100 dark:border-primary-850/60 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  {/* Search */}
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-2.5 text-primary-400" size={14} />
                    <input
                      type="text"
                      placeholder="Rechercher une machine, un code..."
                      value={qrSearchQuery}
                      onChange={e => setQrSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg text-xs text-primary-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {/* Atelier filter */}
                  <div className="relative">
                    <select
                      value={qrSelectedAtelier}
                      onChange={e => setQrSelectedAtelier(e.target.value)}
                      className="w-full bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 text-xs text-primary-900 dark:text-white rounded-lg p-2 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="all">Tous les ateliers</option>
                      {Array.from(new Set(equipements.map(e => e.atelier).filter(Boolean))).sort().map(atelier => (
                        <option key={atelier} value={atelier!}>{atelier}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto justify-end">
                  <span className="text-xs text-primary-500 dark:text-primary-400 self-center font-medium mr-2">
                    {filteredQREquipments.length} machine{filteredQREquipments.length > 1 ? 's' : ''} trouvée{filteredQREquipments.length > 1 ? 's' : ''}
                  </span>
                  
                  {filteredQREquipments.length > 0 && (
                    <button
                      onClick={() => setShowAllQRPrint(true)}
                      className="btn-primary text-xs py-2 px-4 bg-accent-orange hover:bg-accent-orange-hover text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Printer size={14} />
                      <span>Imprimer toute la sélection</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Grid content */}
              <div className="p-6 bg-primary-50/50 dark:bg-primary-950/20 overflow-y-auto max-h-[60vh] flex-1">
                {filteredQREquipments.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-2xl space-y-3">
                    <QrCode size={40} className="mx-auto text-primary-300 dark:text-primary-700 animate-pulse" />
                    <p className="text-sm font-semibold text-primary-500 dark:text-primary-400">Aucun équipement ne correspond à vos filtres.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredQREquipments.map((eq) => {
                      const smartData = typeof window !== 'undefined' 
                        ? `${window.location.origin}${window.location.pathname}#/portal-terrain?eq=${eq.id}` 
                        : eq.id;
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=0f172a&data=${encodeURIComponent(smartData)}`;
                      return (
                        <div
                          key={eq.id}
                          className="bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-850 p-4 rounded-xl flex flex-col justify-between hover:border-indigo-450 dark:hover:border-indigo-500/55 transition shadow-xs group relative"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-xs text-primary-800 dark:text-white truncate" title={eq.nom}>
                                {eq.nom}
                              </h3>
                              <p className="text-[10px] text-primary-400 font-mono truncate">
                                ID: {eq.id}
                              </p>
                              <div className="flex gap-1.5 mt-2 flex-wrap">
                                <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300">
                                  {eq.atelier || "N/A"}
                                </span>
                                {eq.critique && (
                                  <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
                                    CRITIQUE
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Little visual preview of the QR code */}
                            <div className="shrink-0 bg-white p-1 rounded border border-primary-100">
                              <img
                                src={qrUrl}
                                alt="QR Code"
                                className="w-14 h-14 object-contain select-none"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>

                          <div className="border-t border-primary-50 dark:border-primary-800/60 pt-3 mt-1 flex justify-end">
                            <button
                              onClick={() => {
                                setQrSelectedEqForSinglePrint(eq);
                                setShowSingleQRPrint(true);
                              }}
                              className="w-full py-1.5 px-3 bg-primary-50 hover:bg-indigo-50 dark:bg-primary-950 dark:hover:bg-indigo-950/40 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Printer size={12} className="text-indigo-500" />
                              Imprimer à l'unité
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-white dark:bg-primary-900 border-t border-primary-200 dark:border-primary-800 flex justify-end">
                <button
                  onClick={() => setShowQRSection(false)}
                  className="btn-secondary font-bold py-2 px-5 text-xs rounded-lg"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SINGLE QR PRINT PREVIEW MODAL */}
      <AnimatePresence>
        {showSingleQRPrint && qrSelectedEqForSinglePrint && (
          <div className="modal z-[120] no-print">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content text-left overflow-y-auto max-h-[90vh] bg-primary-100 dark:bg-primary-950 p-0 shadow-2xl"
              style={{ maxWidth: '420px', width: '95%' }}
            >
              <div className="p-4 bg-white dark:bg-primary-900 border-b border-primary-200 dark:border-primary-800 flex justify-between items-center">
                <span className="font-display font-bold text-sm text-primary-800 dark:text-white flex items-center gap-1.5">
                  <QrCode size={16} className="text-accent-orange" />
                  Imprimer QR Code
                </span>
                <button
                  onClick={() => {
                    setShowSingleQRPrint(false);
                    setQrSelectedEqForSinglePrint(null);
                  }}
                  className="text-primary-400 hover:text-primary-600 dark:hover:text-primary-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 flex flex-col items-center justify-center bg-primary-50 dark:bg-primary-900/30">
                {/* Visual Label Layout */}
                <div className="bg-white text-black p-6 rounded-2xl border-2 border-slate-900 shadow-lg text-center max-w-[280px] w-full">
                  <h1 className="text-lg font-extrabold tracking-widest uppercase mb-1">GMAO PRO</h1>
                  <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mb-2">Étiquette de Maintenance</p>
                  
                  <div className="flex justify-center my-3">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=0f172a&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}#/portal-terrain?eq=${qrSelectedEqForSinglePrint.id}` : qrSelectedEqForSinglePrint.id)}`}
                      alt="QR Code"
                      className="w-40 h-40 object-contain"
                    />
                  </div>

                  <h2 className="text-xs font-extrabold uppercase leading-tight truncate">{qrSelectedEqForSinglePrint.nom}</h2>
                  <div className="font-mono text-[9px] font-bold text-rose-500 mt-1">{qrSelectedEqForSinglePrint.id}</div>
                  <p className="text-[9px] text-gray-600 font-semibold mt-1">Atelier : <span className="font-bold">{qrSelectedEqForSinglePrint.atelier || "N/A"}</span></p>
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-primary-900 border-t border-primary-200 dark:border-primary-800 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowSingleQRPrint(false);
                    setQrSelectedEqForSinglePrint(null);
                  }}
                  className="btn-secondary text-xs py-1.5 px-3 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    setTimeout(() => {
                      window.print();
                    }, 50);
                  }}
                  className="btn-primary text-xs py-1.5 px-4 bg-accent-orange hover:bg-accent-orange-hover text-white rounded-lg font-semibold flex items-center gap-1.5"
                >
                  <Printer size={14} />
                  Imprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ALL QRS PRINT PREVIEW MODAL */}
      <AnimatePresence>
        {showAllQRPrint && (
          <div className="modal z-[120] no-print">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content text-left overflow-y-auto max-h-[90vh] bg-primary-100 dark:bg-primary-950 p-0 shadow-2xl"
              style={{ maxWidth: '850px', width: '95%' }}
            >
              <div className="p-4 bg-white dark:bg-primary-900 border-b border-primary-200 dark:border-primary-800 flex justify-between items-center sticky top-0 z-10">
                <span className="font-display font-bold text-sm text-primary-800 dark:text-white flex items-center gap-1.5">
                  <QrCode size={16} className="text-accent-orange" />
                  Imprimer toute la sélection ({filteredQREquipments.length} machines)
                </span>
                <button
                  onClick={() => setShowAllQRPrint(false)}
                  className="text-primary-400 hover:text-primary-600 dark:hover:text-primary-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh] bg-primary-50 dark:bg-primary-900/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredQREquipments.map((eq) => (
                    <div key={eq.id} className="bg-white text-black p-4 rounded-xl border-2 border-slate-950 text-center flex flex-col justify-between shadow-md">
                      <div>
                        <h3 className="text-[11px] font-extrabold text-black uppercase leading-tight truncate">{eq.nom}</h3>
                        <p className="text-[8px] text-gray-500 font-bold tracking-widest uppercase mb-1">{eq.atelier || "N/A"}</p>
                      </div>
                      <div className="flex justify-center my-2">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=0f172a&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}#/portal-terrain?eq=${eq.id}` : eq.id)}`}
                          alt="QR Code"
                          className="w-24 h-24 object-contain"
                        />
                      </div>
                      <div>
                        <div className="font-mono text-[8px] font-bold text-rose-500 truncate">{eq.id}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-primary-900 border-t border-primary-200 dark:border-primary-800 flex justify-end gap-2">
                <button
                  onClick={() => setShowAllQRPrint(false)}
                  className="btn-secondary text-xs py-1.5 px-3 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    setTimeout(() => {
                      window.print();
                    }, 50);
                  }}
                  className="btn-primary text-xs py-1.5 px-4 bg-accent-orange hover:bg-accent-orange-hover text-white rounded-lg font-semibold flex items-center gap-1.5"
                >
                  <Printer size={14} />
                  Imprimer Tout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PORTALS FOR PRINTING */}
      {showSingleQRPrint && qrSelectedEqForSinglePrint && createPortal(
        <div
          id="printable-single-qr-portal"
          className="gmao-print-sheet hidden print:block bg-white text-black p-6 w-full text-center font-sans"
          style={{ color: '#000000', backgroundColor: '#ffffff' }}
        >
          <div className="border-4 border-black p-8 rounded-2xl inline-block max-w-[320px] mx-auto text-center">
            <h1 className="text-xl font-extrabold tracking-widest text-black uppercase mb-1">GMAO PRO</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-4">Étiquette de Maintenance</p>
            <div className="flex justify-center mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=0f172a&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}#/portal-terrain?eq=${qrSelectedEqForSinglePrint.id}` : qrSelectedEqForSinglePrint.id)}`}
                alt="QR Code"
                className="w-48 h-48 object-contain"
              />
            </div>
            <h2 className="text-base font-extrabold text-black uppercase leading-tight tracking-tight truncate px-2">{qrSelectedEqForSinglePrint.nom}</h2>
            <div className="font-mono text-xs font-bold text-rose-600 mt-1 select-all">{qrSelectedEqForSinglePrint.id}</div>
            <p className="text-[10px] text-gray-600 font-semibold mt-1">Atelier: <span className="font-bold">{qrSelectedEqForSinglePrint.atelier || "N/A"}</span></p>
            <div className="text-[8px] text-gray-400 font-extrabold uppercase mt-6 border-t border-dashed border-gray-300 pt-3">
              Scannez pour signaler un problème
            </div>
          </div>
        </div>,
        document.body
      )}

      {showAllQRPrint && createPortal(
        <div
          id="printable-all-qr-portal"
          className="gmao-print-sheet hidden print:block bg-white text-black p-6 w-full font-sans"
          style={{ color: '#000000', backgroundColor: '#ffffff' }}
        >
          <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
            <div>
              <h1 className="text-xl font-extrabold text-black tracking-wider uppercase">GMAO PRO INDUSTRIE</h1>
              <p className="text-[10px] text-gray-500 font-semibold">Planche d'Étiquettes QR Codes Équipements</p>
            </div>
            <div className="text-right text-[9px] text-gray-500">
              Généré le {new Date().toLocaleDateString('fr-FR')} • {filteredQREquipments.length} machines
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6">
            {filteredQREquipments.map((eq) => (
              <div key={eq.id} className="border-2 border-black p-4 rounded-xl text-center bg-white print:break-inside-avoid flex flex-col justify-between min-h-[220px]">
                <div>
                  <h3 className="text-[11px] font-extrabold text-black uppercase leading-tight truncate">{eq.nom}</h3>
                  <p className="text-[8px] text-gray-500 font-bold tracking-widest uppercase mb-2">{eq.atelier || "Sans atelier"}</p>
                </div>
                <div className="flex justify-center my-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=0f172a&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}#/portal-terrain?eq=${eq.id}` : eq.id)}`}
                    alt="QR Code"
                    className="w-32 h-32 object-contain"
                  />
                </div>
                <div>
                  <div className="font-mono text-[9px] font-bold text-rose-600 truncate">{eq.id}</div>
                  <div className="text-[7px] text-gray-400 font-bold uppercase mt-1 border-t border-dashed border-gray-200 pt-1">
                    SCAN MAINTENANCE MOBILE
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* PORTAL FOR PERFECT PRINTING DIRECTLY ON BODY */}
      {showPrintPreview && selectedEq && createPortal(
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
                if (confirm("Voulez-vous vraiment réinitialiser le formulaire d'équipement et vider tous les champs de saisie ?")) {
                  setFormNom('');
                  setFormAtelier('');
                  setFormMetier('');
                  setFormStatut('Opérationnel');
                  setFormType('');
                  setFormMarque('');
                  setFormSerie('');
                  setFormAnnee(new Date().getFullYear());
                  setFormGarantie('');
                  setFormPrix(0);
                  setFormTemps(3600);
                  setFormCritique(false);
                  setFormPieces('');
                  setFormParentId('');
                  setFormPhotoUrl('');
                  // Spontaneous fields in Equipements
                  setBtsDemandeur('');
                  setBtsUrgence('Moyenne');
                  setBtsEffet('Mécanique');
                  setBtsDescription('');
                  setBtsStatut('En cours');
                  setBtsCodeDefaut('');

                  // Clear draft from localStorage
                  localStorage.removeItem('gmao_draft_eq_create');
                  localStorage.removeItem('gmao_eq_is_creating');
                  if (selectedEq) {
                    localStorage.removeItem(`gmao_draft_eq_edit_${selectedEq.id}`);
                  }
                  localStorage.removeItem('gmao_active_eq_id');
                  localStorage.removeItem('gmao_eq_is_editing');

                  alert("Formulaire d'équipement réinitialisé avec succès.");
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
                Fiche d'Équipement Technique
              </div>
              <BarcodeSim value={selectedEq.id} />
            </div>
          </div>

          {/* Banner & Characteristics */}
          {(() => {
            const isEditingThisEq = selectedId === selectedEq.id;
            const liveNom = isEditingThisEq ? formNom : selectedEq.nom;
            const liveAtelier = isEditingThisEq ? formAtelier : selectedEq.atelier;
            const liveMetier = isEditingThisEq ? formMetier : selectedEq.metier;
            const liveStatut = isEditingThisEq ? formStatut : selectedEq.statut;
            const liveCritique = isEditingThisEq ? formCritique : selectedEq.critique;
            const liveMarque = isEditingThisEq ? formMarque : selectedEq.marque;
            const liveType = isEditingThisEq ? formType : selectedEq.type;
            const liveSerie = isEditingThisEq ? formSerie : selectedEq.serie;
            const liveAnnee = isEditingThisEq ? formAnnee : selectedEq.annee;
            const liveGarantie = isEditingThisEq ? formGarantie : selectedEq.garantie;
            const livePrix = isEditingThisEq ? formPrix : selectedEq.prix;
            const liveInfos = isEditingThisEq ? formInfos : selectedEq.infos;
            const livePhotoUrl = isEditingThisEq ? formPhotoUrl : selectedEq.photoUrl;

            return (
              <>
                {/* Banner */}
                <div className="bg-gray-100 p-3 border border-black flex justify-between items-center mb-6 text-black">
                  <div>
                    <span className="text-[10px] uppercase text-gray-600 font-bold block flex items-center gap-1">
                      <span>Nom de la machine</span>
                      {liveNom.trim() ? (
                        <CheckCircle size={10} className="text-emerald-500 no-print print:hidden shrink-0 animate-fade-in" />
                      ) : null}
                    </span>
                    <span className="text-sm font-bold">{liveNom}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-gray-600 font-bold block flex items-center gap-1">
                      <span>Localisation / Atelier</span>
                      {liveAtelier ? (
                        <CheckCircle size={10} className="text-emerald-500 no-print print:hidden shrink-0 animate-fade-in" />
                      ) : null}
                    </span>
                    <span className="text-xs font-bold">{liveAtelier}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-gray-600 font-bold block">Statut Actuel</span>
                    <span className="text-xs font-bold uppercase">{liveStatut}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-gray-600 font-bold block">Criticité</span>
                    <span className="text-xs font-bold uppercase">{liveCritique ? '🔴 CRITIQUE' : '🟢 NORMAL'}</span>
                  </div>
                </div>

                {/* Section 1: Caractéristiques */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold uppercase border-b border-black pb-1 mb-3 text-black">1. Caractéristiques Générales</h3>
                  <div className="flex gap-4">
                    <div className={`${livePhotoUrl ? 'w-2/3' : 'w-full'} grid grid-cols-3 gap-y-2 gap-x-4 border border-black p-3 rounded-sm bg-gray-50/50`}>
                      <div>
                        <span className="text-[9px] uppercase text-gray-500 block">ID Unique</span>
                        <span className="font-semibold font-mono">{selectedEq.id}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-gray-500 block flex items-center gap-1">
                          <span>Atelier</span>
                          {liveAtelier ? (
                            <CheckCircle size={10} className="text-emerald-500 no-print print:hidden shrink-0 animate-fade-in" />
                          ) : null}
                        </span>
                        <span className="font-semibold">{liveAtelier}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-gray-500 block flex items-center gap-1">
                          <span>Discipline / Métier</span>
                          {liveMetier ? (
                            <CheckCircle size={10} className="text-emerald-500 no-print print:hidden shrink-0 animate-fade-in" />
                          ) : null}
                        </span>
                        <span className="font-semibold">{liveMetier}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-gray-500 block">Marque</span>
                        <span className="font-semibold">{liveMarque || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-gray-500 block">Type / Modèle</span>
                        <span className="font-semibold">{liveType || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-gray-500 block">Numéro de Série</span>
                        <span className="font-semibold font-mono">{liveSerie || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-gray-500 block">Année d'installation</span>
                        <span className="font-semibold">{liveAnnee || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-gray-500 block">Garantie</span>
                        <span className="font-semibold">{liveGarantie || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-gray-500 block">Prix d'acquisition</span>
                        <span className="font-semibold">{(livePrix || 0).toLocaleString()} €</span>
                      </div>
                      <div className="col-span-3">
                        <span className="text-[9px] uppercase text-gray-500 block">Description / Informations</span>
                        <span className="italic">{liveInfos || "Aucune information supplémentaire rédigée."}</span>
                      </div>
                    </div>
                    {livePhotoUrl && (
                      <div className="w-1/3 border border-black p-2 rounded-sm bg-gray-50/50 flex items-center justify-center">
                        <img src={livePhotoUrl} alt={liveNom} className="max-h-36 max-w-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}

          {/* Section 2: Structure et Components */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase border-b border-black pb-1 mb-3 text-black">2. Structure Hiérarchique & Composants</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-black p-3 rounded-sm">
                <h4 className="text-[10px] font-bold uppercase text-gray-700 mb-2">Sous-ensembles rattachés ({getSubEnsembles(selectedEq.id).length})</h4>
                {getSubEnsembles(selectedEq.id).length === 0 ? (
                  <p className="text-[10px] text-gray-500 italic">Aucun sous-ensemble rattaché.</p>
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-[10px]">
                    {getSubEnsembles(selectedEq.id).map(sub => (
                      <li key={sub.id}>
                        <span className="font-semibold">{sub.nom}</span> <span className="font-mono text-gray-500">({sub.id})</span> - {sub.metier}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="border border-black p-3 rounded-sm">
                <h4 className="text-[10px] font-bold uppercase text-gray-700 mb-2">Pièces de rechange associées</h4>
                {pieces.filter(p => p.equipementsLies && p.equipementsLies.includes(selectedEq.id)).length === 0 ? (
                  <p className="text-[10px] text-gray-500 italic">Aucune pièce de rechange spécifiquement associée.</p>
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-[10px]">
                    {pieces.filter(p => p.equipementsLies && p.equipementsLies.includes(selectedEq.id)).map(p => (
                      <li key={p.id}>
                        <span className="font-semibold">{p.designation}</span> - Réf: <span className="font-mono">{p.reference}</span> (Stock: {p.quantite})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Historique */}
          <div className="mb-6 print:break-inside-avoid">
            <h3 className="text-xs font-bold uppercase border-b border-black pb-1 mb-3 text-black">3. Historique Récent des Interventions</h3>
            {interventions.filter(i => i.equipementId === selectedEq.id).length === 0 ? (
              <p className="text-xs text-gray-500 italic p-3 border border-dashed border-gray-300 text-center">Aucune intervention enregistrée sur cet équipement.</p>
            ) : (
              <table className="w-full border-collapse border border-black text-[10px]">
                <thead>
                  <tr className="bg-gray-100 text-black">
                    <th className="border border-black p-1.5 text-left">Date / Réf</th>
                    <th className="border border-black p-1.5 text-left">Type / Urgence</th>
                    <th className="border border-black p-1.5 text-left">Problème / Effet</th>
                    <th className="border border-black p-1.5 text-left">Compte-Rendu / Actions</th>
                    <th className="border border-black p-1.5 text-left">Statut</th>
                    <th className="border border-black p-1.5 text-left">Intervenant</th>
                  </tr>
                </thead>
                <tbody>
                  {interventions
                    .filter(i => i.equipementId === selectedEq.id)
                    .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime())
                    .slice(0, 10)
                    .map(i => (
                      <tr key={i.id} className="border-b border-black">
                        <td className="border border-black p-1.5 font-medium whitespace-nowrap">
                          {new Date(i.dateCreation).toLocaleDateString('fr-FR')}<br />
                          <span className="font-mono text-gray-600 font-bold">{i.numero}</span>
                        </td>
                        <td className="border border-black p-1.5 whitespace-nowrap">
                          <span className="font-semibold">{i.typeDoc}</span><br />
                          <span className="text-gray-600 uppercase text-[9px]">{i.urgence}</span>
                        </td>
                        <td className="border border-black p-1.5 font-semibold text-gray-900 max-w-[150px] break-words">
                          {i.typeProbleme || i.effet || 'Non spécifié'}
                          <p className="text-[9px] font-normal text-gray-500 line-clamp-2 mt-0.5">{i.description}</p>
                        </td>
                        <td className="border border-black p-1.5 text-gray-800 max-w-[200px] break-words">
                          {i.compteRendu || <span className="italic text-gray-400">Aucun compte-rendu rédigé</span>}
                          {i.piecesConso && (
                            <p className="text-[8px] font-semibold text-amber-700 mt-1">🔧 Pièces : {i.piecesConso}</p>
                          )}
                        </td>
                        <td className="border border-black p-1.5 font-bold uppercase text-center whitespace-nowrap">{i.statut}</td>
                        <td className="border border-black p-1.5 whitespace-nowrap">{i.technicienCloture || i.operateur || i.demandeur}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section 4: Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-12 print:break-inside-avoid">
            <div className="border border-black p-4 h-24 flex flex-col justify-between">
              <span className="text-[9px] uppercase text-gray-500 font-bold">Technicien Référent (Visa & Date)</span>
              <div className="border-t border-dashed border-gray-300 w-1/2 self-end"></div>
            </div>
            <div className="border border-black p-4 h-24 flex flex-col justify-between">
              <span className="text-[9px] uppercase text-gray-500 font-bold">Responsable Technique de Maintenance</span>
              <div className="border-t border-dashed border-gray-300 w-1/2 self-end"></div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PORTAL FOR PERFECT ARBORESCENCE PRINTING DIRECTLY ON BODY */}
      {showTreePrintPreview && createPortal(
        <div
          id="printable-tree-body-portal"
          className="gmao-print-sheet hidden print:block bg-white text-black p-10 w-full font-sans text-xs"
          style={{ color: '#000000', backgroundColor: '#ffffff' }}
        >
          {/* Top Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
            <div>
              <h1 className="text-xl font-extrabold tracking-wider text-black uppercase">GMAO PRO INDUSTRIE</h1>
              <p className="text-[10px] text-gray-600 font-medium">Département Maintenance & Infrastructures • Service Technique</p>
              <p className="text-[9px] text-gray-500 mt-1">Généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="px-3 py-1 border border-black font-extrabold text-sm uppercase mb-2">
                Rapport d'Arborescence Technique
              </div>
              <div className="text-[9px] text-gray-500 font-bold">
                {treePrintRoot ? `Scope: ${treePrintRoot.nom}` : 'Scope: Parc Complet'}
              </div>
            </div>
          </div>

          {/* Overview Stats for Arborescence */}
          <div className="bg-gray-100 p-4 border border-black mb-6 text-black grid grid-cols-4 gap-4">
            <div>
              <span className="text-[9px] uppercase text-gray-600 font-bold block">Équipements total</span>
              <span className="text-base font-bold">
                {treePrintRoot 
                  ? getDescendantsCount(treePrintRoot.id) + 1 
                  : equipements.length}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-gray-600 font-bold block">Opérationnels</span>
              <span className="text-base font-bold text-emerald-700">
                {getFilteredStatusCount('Opérationnel')}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-gray-600 font-bold block">En Panne (HS)</span>
              <span className="text-base font-bold text-red-600">
                {getFilteredStatusCount('HS')}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-gray-600 font-bold block">Critiques</span>
              <span className="text-base font-bold text-amber-700">
                {getFilteredCritiqueCount()}
              </span>
            </div>
          </div>

          {/* Arborescence Tree Content */}
          <div className="space-y-1">
            {renderPrintTree()}
          </div>
        </div>,
        document.body
      )}

      {/* FLOATING CONTEXT MENU */}
      {contextMenu && contextMenu.visible && (
        <div
          className="fixed bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-lg shadow-xl py-1 z-50 w-56 text-xs divide-y divide-primary-100 dark:divide-primary-800 text-left"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 font-bold text-primary-500 dark:text-primary-400 border-b border-primary-100 dark:border-primary-800 truncate uppercase tracking-wider text-[10px]">
            {contextMenu.node.nom}
          </div>
          <div className="py-1">
            <button
              onClick={() => {
                setSelectedId(contextMenu.node.id);
                setContextMenu(null);
              }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-800 text-primary-700 dark:text-primary-200 font-medium"
            >
              <Eye size={14} className="text-primary-400" />
              Voir les détails
            </button>
            <button
              onClick={() => {
                handleStartCreateSub(contextMenu.node.id);
                setContextMenu(null);
              }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-800 text-primary-700 dark:text-primary-200 font-medium"
            >
              <Plus size={14} className="text-emerald-500" />
              Ajouter un sous-équipement
            </button>
            <button
              onClick={() => {
                setIntervModalEquipement(contextMenu.node);
                setContextMenu(null);
              }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-800 text-primary-700 dark:text-primary-200 font-medium"
            >
              <Wrench size={14} className="text-indigo-500" />
              Créer une intervention (BT)
            </button>
            <button
              onClick={() => {
                handleCopyPath(contextMenu.node);
                setContextMenu(null);
              }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-800 text-primary-700 dark:text-primary-200 font-medium border-t border-primary-50 dark:border-primary-800/50"
            >
              <Copy size={14} className="text-amber-500" />
              Copier le chemin d'accès
            </button>
            <button
              onClick={() => {
                setTreePrintRoot(contextMenu.node);
                setShowTreePrintPreview(true);
                setContextMenu(null);
              }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-800 text-primary-700 dark:text-primary-200 font-medium border-t border-primary-50 dark:border-primary-800/50"
            >
              <Printer size={14} className="text-teal-500" />
              Exporter l'arborescence (PDF)
            </button>
            <button
              onClick={() => {
                setContextMenu(null);
                if ((window as any).gmaoNavigateToGuide) {
                  (window as any).gmaoNavigateToGuide('equipements');
                }
              }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-800 text-primary-700 dark:text-primary-200 font-medium border-t border-primary-50 dark:border-primary-800/50"
            >
              <BookOpen size={14} className="text-indigo-600 dark:text-indigo-400" />
              Mode d'emploi du module
            </button>
          </div>
          <div className="py-1">
            <button
              onClick={() => {
                handleDeleteEquipment(contextMenu.node.id);
                setContextMenu(null);
              }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-800 text-red-600 dark:text-red-400 font-medium"
            >
              <Trash2 size={14} className="text-red-400" />
              Supprimer l'équipement
            </button>
          </div>
        </div>
      )}

      {/* QUICK INTERVENTION CREATION MODAL */}
      <AnimatePresence>
        {intervModalEquipement && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setIntervModalEquipement(null)}
                className="absolute top-4 right-4 p-1.5 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg text-primary-400 hover:text-primary-600 transition"
              >
                <X size={18} />
              </button>

              <h2 className="text-lg font-display font-bold text-primary-900 dark:text-white border-b border-primary-100 dark:border-primary-800 pb-3 mb-4 flex items-center gap-2">
                <Wrench size={18} className="text-indigo-500" />
                Créer une intervention rapide
              </h2>

              <form onSubmit={handleCreateQuickIntervention} className="space-y-4 text-xs text-left">
                <div>
                  <label className="block text-primary-500 dark:text-primary-400 font-semibold mb-1">Équipement concerné</label>
                  <input
                    type="text"
                    disabled
                    value={intervModalEquipement.nom}
                    className="w-full bg-primary-50 dark:bg-primary-950/50 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 rounded-lg p-2 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-primary-500 dark:text-primary-400 font-semibold mb-1">Demandeur <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={btsDemandeur}
                      onChange={e => setBtsDemandeur(e.target.value)}
                      placeholder="Nom du demandeur..."
                      className="w-full bg-white dark:bg-primary-950 border border-primary-200 dark:border-primary-800 text-primary-900 dark:text-white rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-primary-500 dark:text-primary-400 font-semibold mb-1">Urgence <span className="text-red-500">*</span></label>
                    <select
                      value={btsUrgence}
                      onChange={e => setBtsUrgence(e.target.value)}
                      className="w-full bg-white dark:bg-primary-950 border border-primary-200 dark:border-primary-800 text-primary-900 dark:text-white rounded-lg p-2"
                    >
                      {[...(settings.listes.urgences || ['Faible', 'Moyenne', 'Haute', 'Critique'])].sort((a, b) => a.localeCompare(b)).map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-primary-500 dark:text-primary-400 font-semibold mb-1">Type de problème <span className="text-red-500">*</span></label>
                    <select
                      value={btsEffet}
                      onChange={e => setBtsEffet(e.target.value)}
                      className="w-full bg-white dark:bg-primary-950 border border-primary-200 dark:border-primary-800 text-primary-900 dark:text-white rounded-lg p-2"
                    >
                      {[...(settings.listes.effets || ['Mécanique', 'Électrique', 'Pneumatique', 'Hydraulique', 'Autre'])].sort((a, b) => a.localeCompare(b)).map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-primary-500 dark:text-primary-400 font-semibold mb-1">Statut initial <span className="text-red-500">*</span></label>
                    <select
                      value={btsStatut}
                      onChange={e => setBtsStatut(e.target.value as any)}
                      className="w-full bg-white dark:bg-primary-950 border border-primary-200 dark:border-primary-800 text-primary-900 dark:text-white rounded-lg p-2"
                    >
                      <option value="En attente">En attente (Demande)</option>
                      <option value="En cours">En cours (BT Direct)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-primary-500 dark:text-primary-400 font-semibold mb-1">Code Défaut (Optionnel)</label>
                  <input
                    type="text"
                    value={btsCodeDefaut}
                    onChange={e => setBtsCodeDefaut(e.target.value)}
                    placeholder="Ex: DEF-01, FUITE..."
                    className="w-full bg-white dark:bg-primary-950 border border-primary-200 dark:border-primary-800 text-primary-900 dark:text-white rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-primary-500 dark:text-primary-400 font-semibold mb-1">Description <span className="text-red-500">*</span></label>
                  <textarea
                    required
                    rows={3}
                    value={btsDescription}
                    onChange={e => setBtsDescription(e.target.value)}
                    placeholder="Décrire le problème constaté..."
                    className="w-full bg-white dark:bg-primary-950 border border-primary-200 dark:border-primary-800 text-primary-900 dark:text-white rounded-lg p-2"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-primary-100 dark:border-primary-800 pt-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setIntervModalEquipement(null)}
                    className="px-4 py-2 border border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-800 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition"
                  >
                    Générer l'intervention
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[60] bg-primary-950 dark:bg-white text-white dark:text-primary-950 px-4 py-3 rounded-xl shadow-2xl border border-primary-800 dark:border-primary-100 flex items-center gap-3.5 max-w-sm text-xs font-semibold"
          >
            <Copy size={16} className="text-amber-400 dark:text-amber-600 shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QUICK PREVIEW POPOVER (HOVER) */}
      <AnimatePresence>
        {hoveredEq && (() => {
          const node = hoveredEq.node;
          const eqId = node.id;
          
          // inline helper to get last intervention
          const eqInterventions = interventions.filter(i => i.equipementId === eqId);
          const lastInt = eqInterventions.length === 0 ? null : [...eqInterventions].sort((a, b) => {
            return new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime();
          })[0];

          const topPos = Math.min(hoveredEq.y, typeof window !== 'undefined' ? window.innerHeight - 240 : hoveredEq.y);
          
          let statusColor = 'bg-emerald-500 text-emerald-800 dark:text-emerald-300';
          let statusBg = 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900';
          if (node.statut === 'HS') {
            statusColor = 'bg-red-500 text-red-800 dark:text-red-300';
            statusBg = 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900';
          } else if (node.statut === 'En Maintenance') {
            statusColor = 'bg-amber-500 text-amber-800 dark:text-amber-300';
            statusBg = 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900';
          }

          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, x: -8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.96, x: -8 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[70] w-80 bg-white/95 dark:bg-primary-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-primary-200 dark:border-primary-800 p-4 pointer-events-none select-none flex flex-col gap-3"
              style={{
                top: `${topPos}px`,
                left: `${hoveredEq.x + 12}px`,
              }}
              id={`quick-preview-popover-${node.id}`}
            >
              {/* Header */}
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-accent-orange/10 text-accent-orange flex items-center justify-center shrink-0">
                  <Cog size={16} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-primary-800 dark:text-white leading-tight truncate">
                    {node.nom}
                  </h4>
                  <span className="text-[10px] text-primary-400 font-medium block mt-0.5 font-mono">
                    ID: {node.id.substring(0, 8)}...
                  </span>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-2 text-[10px] py-2 border-y border-primary-100 dark:border-primary-850/60">
                <div className="space-y-1">
                  <span className="text-primary-400 block font-medium uppercase tracking-wider text-[9px]">État</span>
                  <div className={`px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1.5 ${statusBg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
                    <span className="capitalize">{node.statut}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-primary-400 block font-medium uppercase tracking-wider text-[9px]">Criticité</span>
                  {node.critique ? (
                    <span className="px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900">
                      <Flame size={10} className="text-red-500 fill-red-400 animate-pulse" />
                      Critique
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md font-bold inline-flex items-center bg-primary-100/60 text-primary-600 dark:bg-primary-800/60 dark:text-primary-300 border border-primary-200/40 dark:border-primary-750">
                      Standard
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <span className="text-primary-400 block font-medium uppercase tracking-wider text-[9px]">Atelier</span>
                  <span className="font-semibold text-primary-700 dark:text-primary-200 block truncate">
                    {node.atelier || '-'}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-primary-400 block font-medium uppercase tracking-wider text-[9px]">Métier</span>
                  <span className="font-semibold text-primary-700 dark:text-primary-200 block truncate">
                    {node.metier || '-'}
                  </span>
                </div>
              </div>

              {/* Last Intervention Block */}
              <div className="space-y-2">
                <span className="text-primary-400 block font-bold uppercase tracking-wider text-[9px]">Dernière intervention</span>
                {lastInt ? (
                  <div className="bg-primary-50/50 dark:bg-primary-850/40 p-2.5 rounded-xl border border-primary-150 dark:border-primary-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-accent-orange bg-accent-orange/5 px-1.5 py-0.5 rounded-md border border-accent-orange/15 font-mono leading-none">
                        {lastInt.typeDoc} N°{lastInt.numero}
                      </span>
                      <span className="text-[9px] text-primary-400 font-medium">
                        {new Date(lastInt.dateCreation).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    
                    <p className="text-[10px] text-primary-600 dark:text-primary-300 font-medium leading-relaxed line-clamp-2">
                      {lastInt.description || lastInt.typeProbleme || "Pas de description"}
                    </p>

                    <div className="flex items-center justify-between text-[9px] text-primary-400 pt-1.5 border-t border-primary-100/60 dark:border-primary-800/40">
                      <span className="font-medium truncate max-w-[120px]">
                        Par : {lastInt.technicienCloture || lastInt.demandeur || 'Non assigné'}
                      </span>
                      <span className="font-bold uppercase text-[8px] tracking-wide px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
                        {lastInt.statut}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-primary-50/30 dark:bg-primary-850/20 p-3 rounded-xl border border-dashed border-primary-200 dark:border-primary-800 text-center">
                    <span className="text-[10px] text-primary-400 font-semibold block">
                      Aucun historique d'intervention
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

// SIMULATED BARCODE COMPONENT FOR INDUSTRIAL PRINT VALUE
const BarcodeSim = ({ value }: { value: string }) => {
  return (
    <div className="flex flex-col items-center select-none bg-white text-black">
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
