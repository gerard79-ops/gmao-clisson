/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  CheckCircle,
  PlusCircle,
  Trash2,
  Paperclip,
  Printer,
  ChevronRight,
  User,
  Wrench,
  AlertCircle,
  Clock,
  Sparkles,
  Award,
  RefreshCw,
  FileCheck,
  Check,
  PenTool,
  Bookmark,
  Camera,
  Upload,
  Eye,
  Pencil
} from 'lucide-react';
import { Intervention, Equipement, Piece, GlobalSettings, AuditLog, MouvementStock } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { SaisieVocale } from './SaisieVocale';
import { dbSaveAuditLog } from '../firebaseSync';
import { compressImage } from '../utils/imageCompressor';
import PhotoAnnotatorModal from './PhotoAnnotatorModal';

interface RapportInterventionProps {
  interventions: Intervention[];
  equipements: Equipement[];
  pieces: Piece[];
  settings: GlobalSettings;
  onUpdateIntervention: (id: string, payload: Partial<Intervention>) => void;
  onAddIntervention: (payload: Omit<Intervention, 'id' | 'dateCreation'>) => void;
  onEditPiece: (id: string, payload: Partial<Piece>) => void;
  onAddMouvement: (payload: Omit<MouvementStock, 'id' | 'dateCreation'>) => void;
  userRole?: string;
  onNavigateToModule?: (moduleName: 'dashboard' | 'interventions') => void;
}

export default function RapportIntervention({
  interventions,
  equipements,
  pieces,
  settings,
  onUpdateIntervention,
  onAddIntervention,
  onEditPiece,
  onAddMouvement,
  userRole = 'Manager',
  onNavigateToModule
}: RapportInterventionProps) {
  // Navigation inside component
  const [selectedIntId, setSelectedIntId] = useState<string | null>(null);
  const [isSpontaneousMode, setIsSpontaneousMode] = useState(false);

  // Search and lists filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAtelier, setFilterAtelier] = useState('');
  const [filterUrgence, setFilterUrgence] = useState('');

  // Spontaneous creation states
  const [sponEqId, setSponEqId] = useState('');
  const [sponTitre, setSponTitre] = useState('');
  const [sponDesc, setSponDesc] = useState('');
  const [sponUrgence, setSponUrgence] = useState('Moyenne');
  const [sponDemandeur, setSponDemandeur] = useState('Technicien Terrain');

  // Report Form States
  const [crActivite, setCrActivite] = useState('');
  const [crTechno, setCrTechno] = useState('');
  const [crCause, setCrCause] = useState('');
  const [crRemede, setCrRemede] = useState('');
  const [crOperateur, setCrOperateur] = useState('');
  const [crImputation, setCrImputation] = useState('');
  const [crText, setCrText] = useState('');
  const [crMo, setCrMo] = useState('');
  const [crArret, setCrArret] = useState('');
  const [crStatut, setCrStatut] = useState<'Brouillon' | 'En attente de validation' | 'Soldé'>('En attente de validation');
  const [crPhotoUrl, setCrPhotoUrl] = useState('');
  const [isAnnotatorOpen, setIsAnnotatorOpen] = useState(false);

  // Part consumption states
  const [partSearch, setPartSearch] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [selectedParts, setSelectedParts] = useState<{ id: string; nom: string; qte: number; reference: string }[]>([]);

  // Signature pad states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // Success Feedback Screen
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [submittedCode, setSubmittedCode] = useState('');

  // Print preview states
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printInt, setPrintInt] = useState<Intervention | null>(null);

  // Reset all form fields
  const resetForm = () => {
    setCrActivite(settings.listes.activites[0] || '');
    setCrTechno(settings.listes.technologies[0] || '');
    setCrCause(settings.listes.causes[0] || '');
    setCrRemede(settings.listes.remedes[0] || '');
    setCrOperateur(settings.listes.operateurs[0] || '');
    setCrImputation(settings.listes.imputations[0] || '');
    setCrText('');
    setCrMo('');
    setCrArret('');
    setCrPhotoUrl('');
    setSelectedParts([]);
    setPartSearch('');
    setHasSigned(false);
    clearSignature();
  };

  // Filter active/ongoing interventions that need a report
  const pendingInterventions = interventions.filter(i => {
    // Only interventions in ongoing or pending state
    const isPending = i.statut !== 'Soldé' && i.statut !== 'Clôturé' && i.statut !== 'Terminé';
    if (!isPending) return false;

    // Apply search query
    const text = searchQuery.toLowerCase();
    const matchText = 
      i.numero?.toLowerCase().includes(text) ||
      i.typeProbleme?.toLowerCase().includes(text) ||
      i.equipementNom?.toLowerCase().includes(text) ||
      i.description?.toLowerCase().includes(text);

    const matchAtelier = filterAtelier ? i.atelier === filterAtelier : true;
    const matchUrgence = filterUrgence ? i.urgence === filterUrgence : true;

    return matchText && matchAtelier && matchUrgence;
  });

  // Handle Selection of an intervention
  useEffect(() => {
    if (selectedIntId) {
      setIsSpontaneousMode(false);
      const item = interventions.find(i => i.id === selectedIntId);
      if (item) {
        // Load draft if exists
        const savedDraftStr = localStorage.getItem(`gmao_draft_int_${selectedIntId}`);
        if (savedDraftStr) {
          try {
            const draft = JSON.parse(savedDraftStr);
            setCrActivite(draft.crActivite || item.activite || settings.listes.activites[0] || '');
            setCrTechno(draft.crTechno || item.technologie || settings.listes.technologies[0] || '');
            setCrCause(draft.crCause || item.cause || settings.listes.causes[0] || '');
            setCrRemede(draft.crRemede || item.remede || settings.listes.remedes[0] || '');
            setCrOperateur(draft.crOperateur || item.operateur || settings.listes.operateurs[0] || '');
            setCrImputation(draft.crImputation || item.imputation || settings.listes.imputations[0] || '');
            setCrText(draft.crText || item.compteRendu || '');
            setCrMo(draft.crMo || item.tempsPasse?.replace(/[^\d.]/g, '') || '');
            setCrArret(draft.crArret || item.tempsArret?.replace(/[^\d.]/g, '') || '');
            setCrStatut(draft.crStatut || (userRole === 'Manager' ? 'Soldé' : 'En attente de validation'));
            setSelectedParts(draft.selectedParts || []);
            setCrPhotoUrl(draft.crPhotoUrl || item.photoUrl || '');
          } catch (e) {
            console.error("Failed to parse draft", e);
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
          setCrStatut(userRole === 'Manager' ? 'Soldé' : 'En attente de validation');
          setSelectedParts([]);
          setCrPhotoUrl(item.photoUrl || '');
        }
        setPartSearch('');
        setHasSigned(false);
        clearSignature();
      }
    } else if (!isSpontaneousMode) {
      resetForm();
    }
  }, [selectedIntId, isSpontaneousMode]);

  // Autosave draft locally as user types
  useEffect(() => {
    if (selectedIntId && !showSuccessScreen) {
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
        selectedParts,
        crPhotoUrl
      };
      localStorage.setItem(`gmao_draft_int_${selectedIntId}`, JSON.stringify(draft));
    }
  }, [crActivite, crTechno, crCause, crRemede, crOperateur, crImputation, crText, crMo, crArret, crStatut, selectedParts, crPhotoUrl, selectedIntId]);

  // Handle signature pad drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    
    // Support touch devices
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      const rect = canvas.getBoundingClientRect();
      ctx.moveTo(clientX - rect.left, clientY - rect.top);
    } else {
      ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    }
    
    setIsDrawing(true);
    setHasSigned(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0F172A'; // Navy Blue

    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      const rect = canvas.getBoundingClientRect();
      ctx.lineTo(clientX - rect.left, clientY - rect.top);
    } else {
      ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    }
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
    setHasSigned(false);
  };

  // Submit report handler
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();

    let signatureData: string | undefined = undefined;
    if (hasSigned && canvasRef.current) {
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
      statut: crStatut,
      tempsPasse: crMo ? `${crMo} H` : '0 H',
      tempsArret: crArret ? `${crArret} H` : '0 H',
      technicienCloture: crOperateur,
      dateCloture: crStatut === 'Soldé' ? new Date().toISOString() : undefined,
      photoUrl: crPhotoUrl || undefined
    };

    if (signatureData) payload.signatureTechnicien = signatureData;

    // Deduct parts from stock and add stock movements
    if (selectedParts.length > 0) {
      selectedParts.forEach(sel => {
        const piece = pieces.find(p => p.id === sel.id);
        if (piece) {
          const nextQty = Math.max(piece.quantite - sel.qte, 0);
          onEditPiece(sel.id, { quantite: nextQty });
          
          // Log stock movement
          onAddMouvement({
            pieceId: sel.id,
            pieceNom: piece.designation,
            type: 'Sortie',
            quantite: sel.qte,
            intervenant: crOperateur || 'Technicien Terrain',
            commentaires: `Consommé dans le rapport de l'intervention`,
            dateStr: new Date().toLocaleDateString('fr-FR'),
            destinationType: 'Équipement',
            destinationNom: selectedIntId ? (interventions.find(i => i.id === selectedIntId)?.equipementNom || 'Inconnu') : (equipements.find(eq => eq.id === sponEqId)?.nom || 'Spontané')
          });
        }
      });
      payload.piecesConso = selectedParts.map(s => `${s.nom} x${s.qte}`).join(', ');
    }

    // Save Audit trail log
    const auditLogId = "LOG-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Date.now().toString().slice(-4);
    const logItem: AuditLog = {
      id: auditLogId,
      timestamp: new Date().toISOString(),
      utilisateur: `${crOperateur || 'Jean Dupont'} (${userRole})`,
      action: "Saisie Rapport d'Intervention",
      details: `Clôture de rapport avec statut : ${crStatut}. Temps de travail : ${crMo || 0}H, Arrêt machine : ${crArret || 0}H.`,
      criticite: "moyenne",
      ipAdresse: "192.168.1.55"
    };

    try {
      await dbSaveAuditLog(logItem);
    } catch (err) {
      console.warn("Could not save audit trail log:", err);
    }

    if (isSpontaneousMode) {
      // Create fresh spontaneous intervention
      const eq = equipements.find(m => m.id === sponEqId);
      const spontCode = "BT-" + new Date().getFullYear().toString().substring(2, 4) + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
      
      const spontPayload = {
        id: "SPONT-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
        typeDoc: 'BT' as const,
        numero: spontCode,
        equipementId: sponEqId,
        equipementNom: eq ? eq.nom : 'Spontané',
        atelier: eq ? eq.atelier : 'Atelier Général',
        titre: sponTitre || `Dépannage Spontané ${eq ? eq.nom : ''}`,
        description: sponDesc || "Intervention express effectuée en direct sur le terrain sans BT planifié.",
        urgence: sponUrgence,
        typeProbleme: "Curatif express",
        demandeur: sponDemandeur,
        statut: crStatut,
        dateCreation: new Date().toISOString(),
        ...payload
      };

      onAddIntervention(spontPayload);
      setSubmittedCode(spontCode);
      setPrintInt(spontPayload as Intervention);
    } else {
      // Update existing intervention
      const targetInt = interventions.find(i => i.id === selectedIntId);
      onUpdateIntervention(selectedIntId!, payload);
      setSubmittedCode(targetInt?.numero || targetInt?.id || 'BT-XXXX');
      if (targetInt) {
        setPrintInt({
          ...targetInt,
          ...payload
        });
      }
      localStorage.removeItem(`gmao_draft_int_${selectedIntId}`);
    }

    // Show success feedback screen
    setShowSuccessScreen(true);
  };

  const addPieceConsumption = (piece: Piece) => {
    const qtyToAdd = partQty;
    if (qtyToAdd <= 0) return;

    const exists = selectedParts.find(p => p.id === piece.id);
    if (exists) {
      setSelectedParts(selectedParts.map(p => 
        p.id === piece.id 
          ? { ...p, qte: Math.min(piece.quantite, p.qte + qtyToAdd) }
          : p
      ));
    } else {
      setSelectedParts([
        ...selectedParts,
        { id: piece.id, nom: piece.designation, qte: Math.min(piece.quantite, qtyToAdd), reference: piece.reference || '' }
      ]);
    }
    setPartSearch('');
    setPartQty(1);
  };

  const removePieceConsumption = (pieceId: string) => {
    setSelectedParts(selectedParts.filter(p => p.id !== pieceId));
  };

  // Smart suggestions of technicians based on selected BT requirements
  const selectedInt = interventions.find(i => i.id === selectedIntId);
  
  const getTechnicianSuggestions = () => {
    if (!selectedInt) return [];
    
    // Match keywords from description
    const searchStr = `${selectedInt.description || ''} ${selectedInt.typeProbleme || ''} ${selectedInt.equipementNom || ''}`.toLowerCase();
    const globalSkills = settings.competencesList || [];
    const reqSkills = globalSkills.filter(skill => searchStr.includes(skill.toLowerCase()));

    if (reqSkills.length === 0) return [];

    return settings.listes.operateurs.map(techName => {
      const techSkills = settings.competencesTechniciens?.[techName] || [];
      const matches = reqSkills.filter(s => techSkills.includes(s));
      return {
        name: techName,
        matches,
        score: matches.length
      };
    }).filter(t => t.score > 0).sort((a,b) => b.score - a.score);
  };

  const techSuggestions = getTechnicianSuggestions();

  return (
    <div className="space-y-6 animate-fade-in" id="rapport-intervention-module">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-primary-900 p-5 rounded-2xl border border-primary-200 dark:border-primary-800 shadow-xs">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-black text-primary-900 dark:text-white flex items-center gap-2">
            <PenTool className="text-accent-orange animate-pulse" size={22} />
            Saisie de Rapport d'Intervention Rapide
          </h2>
          <p className="text-xs text-primary-500 dark:text-primary-400 font-semibold leading-relaxed">
            Rédigez ou dictez vos rapports d'intervention directement depuis cette interface. Mettez à jour vos pièces consommées en temps réel.
          </p>
        </div>

        {onNavigateToModule && (
          <button
            onClick={() => onNavigateToModule('dashboard')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 px-3.5 py-2 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50 cursor-pointer self-start md:self-auto shrink-0 transition"
          >
            Retour au Tableau de Bord
          </button>
        )}
      </div>

      {showSuccessScreen ? (
        /* SUCCESS FEEDBACK SCREEN */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-primary-900 rounded-3xl border-2 border-emerald-500/30 p-8 text-center max-w-2xl mx-auto space-y-6 shadow-2xl"
        >
          <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-500 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Check className="stroke-[3px]" size={36} />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-display font-bold text-primary-900 dark:text-white">Rapport Enregistré avec Succès !</h3>
            <p className="text-xs text-primary-500 dark:text-primary-400 font-semibold">
              Le rapport d'intervention pour le Bon de Travail <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{submittedCode}</span> a été transmis et validé dans la GMAO.
            </p>
          </div>

          <div className="bg-primary-50 dark:bg-primary-950 p-4 rounded-xl text-left border border-primary-200 dark:border-primary-800 space-y-1.5 max-w-md mx-auto text-xs">
            <div className="flex justify-between font-bold">
              <span className="text-primary-500">Statut final :</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black uppercase text-[10px] tracking-wide">
                {crStatut === 'Soldé' ? 'Validé & Clôturé' : 'En attente de validation'}
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-primary-500">Temps de travail :</span>
              <span className="text-primary-800 dark:text-primary-200 font-extrabold">{crMo || 0} Heures</span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-primary-500">Temps d'arrêt machine :</span>
              <span className="text-primary-800 dark:text-primary-200 font-extrabold">{crArret || 0} Heures</span>
            </div>
            {selectedParts.length > 0 && (
              <div className="flex justify-between font-bold">
                <span className="text-primary-500">Pièces consommées :</span>
                <span className="text-primary-800 dark:text-primary-200 font-semibold">{selectedParts.map(p => `${p.nom} (x${p.qte})`).join(', ')}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => {
                setShowSuccessScreen(false);
                setSelectedIntId(null);
                setIsSpontaneousMode(false);
                resetForm();
              }}
              className="btn-primary"
            >
              Rédiger un autre rapport
            </button>
            {printInt && (
              <button
                type="button"
                onClick={() => setShowPrintPreview(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-accent-orange hover:bg-accent-orange-hover rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer size={14} />
                <span>Imprimer le rapport (PDF)</span>
              </button>
            )}
            {onNavigateToModule && (
              <button
                onClick={() => onNavigateToModule('interventions')}
                className="px-4 py-2 text-xs font-bold text-primary-600 hover:text-primary-800 dark:text-primary-300 dark:hover:text-white bg-primary-100 hover:bg-primary-200 dark:bg-primary-800 dark:hover:bg-primary-750 rounded-xl transition cursor-pointer"
              >
                Consulter les interventions
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        /* MAIN WORKSPACE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT PANEL: SELECTOR LIST */}
          <div className="lg:col-span-4 space-y-4">
            
            <div className="bg-white dark:bg-primary-900 p-4 rounded-2xl border border-primary-200 dark:border-primary-800 shadow-xs space-y-4">
              
              {/* Direct Spontaneous Action */}
              <button
                onClick={() => {
                  setSelectedIntId(null);
                  setIsSpontaneousMode(true);
                }}
                className={`w-full p-3 rounded-xl border flex items-center justify-between transition cursor-pointer font-bold ${
                  isSpontaneousMode
                    ? 'bg-accent-orange border-accent-orange text-white shadow-md'
                    : 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 text-amber-600 hover:text-amber-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <PlusCircle size={18} />
                  <span className="text-xs">Rapport Spontané (Sans BT)</span>
                </div>
                <ChevronRight size={16} />
              </button>

              <div className="border-t border-primary-100 dark:border-primary-800 pt-3">
                <span className="text-[10px] font-bold text-primary-400 dark:text-primary-500 uppercase tracking-wider block mb-2">
                  Sélectionner un Bon de Travail en cours :
                </span>

                {/* Filter Controls */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary-400" size={14} />
                    <input
                      type="text"
                      placeholder="Chercher par BT, machine..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8 py-1.5 text-xs bg-primary-50 dark:bg-primary-950 rounded-lg border-primary-200 dark:border-primary-800 w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={filterAtelier}
                      onChange={e => setFilterAtelier(e.target.value)}
                      className="py-1 px-2 text-[10px] rounded bg-primary-50 dark:bg-primary-950 border-primary-200 dark:border-primary-800"
                    >
                      <option value="">Tous ateliers</option>
                      {Array.from(new Set(interventions.map(i => i.atelier).filter(Boolean))).map(at => (
                        <option key={at} value={at}>{at}</option>
                      ))}
                    </select>

                    <select
                      value={filterUrgence}
                      onChange={e => setFilterUrgence(e.target.value)}
                      className="py-1 px-2 text-[10px] rounded bg-primary-50 dark:bg-primary-950 border-primary-200 dark:border-primary-800"
                    >
                      <option value="">Toutes urgences</option>
                      <option value="Critique">Critique</option>
                      <option value="Haute">Haute</option>
                      <option value="Moyenne">Moyenne</option>
                      <option value="Faible">Faible</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pending list */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {pendingInterventions.length === 0 ? (
                  <p className="text-xs text-primary-400 italic text-center py-6">Aucun bon de travail actif trouvé.</p>
                ) : (
                  pendingInterventions.map(item => {
                    const active = selectedIntId === item.id;
                    const isStoppage = item.urgence?.toLowerCase().includes('arrêt') || item.urgence?.toLowerCase().includes('critique');
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedIntId(item.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition flex flex-col gap-1.5 ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-primary-50 hover:bg-primary-100 dark:bg-primary-950 dark:hover:bg-primary-850 border-primary-200 dark:border-primary-800'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[9px] font-mono font-bold">
                          <span className={active ? 'text-white' : 'text-primary-400'}>{item.numero || 'SANS CODE'}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            isStoppage
                              ? 'bg-red-500 text-white animate-pulse'
                              : active
                                ? 'bg-indigo-700 text-white border border-indigo-500'
                                : 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300'
                          }`}>
                            {item.urgence || 'Moyenne'}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <p className="font-extrabold text-[11px] truncate">{item.typeProbleme || item.description}</p>
                          <p className={`text-[10px] font-semibold flex items-center gap-1 ${active ? 'text-indigo-200' : 'text-primary-500'}`}>
                            <Wrench size={10} /> {item.equipementNom}
                          </p>
                        </div>

                        <div className="flex justify-between items-center text-[9px] font-bold border-t pt-1.5 mt-0.5 border-current/10">
                          <span className="opacity-80">Secteur : {item.atelier}</span>
                          <span className="italic opacity-80">{new Date(item.dateCreation).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* QUICK LEGEND CARD */}
            <div className="bg-primary-50/50 dark:bg-primary-950/20 p-4 rounded-xl border border-primary-100 dark:border-primary-800 text-[11px] space-y-2">
              <span className="font-bold text-primary-500 block uppercase tracking-wider text-[9px]">💡 Guide rapide</span>
              <p className="text-primary-600 dark:text-primary-300 leading-relaxed font-semibold">
                La clôture des rapports déduit automatiquement les pièces consommées du magasin, met à jour le taux de disponibilité de vos équipements critiques et génère un rapport final imprimable en un clic.
              </p>
            </div>
          </div>

          {/* RIGHT PANEL: REPORT FORM */}
          <div className="lg:col-span-8">
            {!selectedIntId && !isSpontaneousMode ? (
              <div className="bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 h-full min-h-[400px]">
                <PenTool className="text-primary-300 dark:text-primary-700 animate-bounce" size={48} />
                <div className="space-y-1.5 max-w-sm">
                  <h3 className="font-display font-extrabold text-primary-800 dark:text-primary-200 text-sm">Aucune sélection active</h3>
                  <p className="text-xs text-primary-400 font-semibold leading-relaxed">
                    Veuillez sélectionner un bon de travail à clôturer dans la liste de gauche ou cliquer sur <strong>Rapport Spontané</strong> pour consigner une intervention sur le champ.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-2xl shadow-xs overflow-hidden">
                
                {/* ACTIVE BANNER */}
                <div className="p-4 bg-gradient-to-r from-indigo-500/5 to-indigo-500/10 dark:from-indigo-500/10 dark:to-indigo-500/20 border-b border-primary-100 dark:border-primary-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider block">
                      {isSpontaneousMode ? 'CRÉATION DE RAPPORT EXPRESS SPONTANÉ' : `RÉDACTION RAPPORT POUR LE BT : ${selectedInt?.numero}`}
                    </span>
                    <h3 className="font-display font-black text-sm text-primary-900 dark:text-white">
                      {isSpontaneousMode ? 'Nouveau Rapport Spontané Terrain' : (selectedInt?.typeProbleme || selectedInt?.description)}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 self-start md:self-auto">
                    {!isSpontaneousMode && selectedInt && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-bold uppercase text-[9px] tracking-wider">
                        {selectedInt.statut}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-bold text-[9px]">
                      {isSpontaneousMode ? 'Spontané' : selectedInt?.urgence}
                    </span>
                  </div>
                </div>

                {/* FORM CONTROLS */}
                <div className="p-5 space-y-6">
                  
                  {/* STEP 1 FOR SPONTANEOUS MODE: BASIC PROBLEM INFO */}
                  {isSpontaneousMode && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-4"
                    >
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block flex items-center gap-1">
                        <Sparkles size={12} className="animate-pulse" /> Informations Générales d'Urgence
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="font-semibold flex items-center gap-1 text-xs mb-1">
                            <span>Équipement concerné</span>
                            <span className="text-red-500">*</span>
                          </label>
                          <select required value={sponEqId} onChange={e => setSponEqId(e.target.value)}>
                            <option value="">Sélectionner l'équipement...</option>
                            {[...equipements].sort((a,b) => a.nom.localeCompare(b.nom)).map(eq => (
                              <option key={eq.id} value={eq.id}>{eq.nom} - {eq.atelier} ({eq.serie})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold flex items-center gap-1 text-xs mb-1">
                            <span>Titre abrégé de la panne</span>
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Dépannage mécanique, Fuite hydraulique, etc."
                            value={sponTitre}
                            onChange={e => setSponTitre(e.target.value)}
                          />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                          <label className="font-semibold flex items-center gap-1 text-xs mb-1">
                            <span>Description du constat d'anomalie</span>
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Décrivez l'état de la machine constaté sur le terrain par les opérateurs..."
                            value={sponDesc}
                            onChange={e => setSponDesc(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-xs mb-1">Urgence initiale</label>
                          <select value={sponUrgence} onChange={e => setSponUrgence(e.target.value)}>
                            <option value="Critique">Critique (Arrêt Machine)</option>
                            <option value="Haute">Haute</option>
                            <option value="Moyenne">Moyenne</option>
                            <option value="Faible">Faible</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold text-xs mb-1">Demandeur / Signalé par</label>
                          <input
                            type="text"
                            value={sponDemandeur}
                            onChange={e => setSponDemandeur(e.target.value)}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: DICTATION & TECHNICAL DETAILS */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-primary-400 dark:text-primary-500 uppercase tracking-wider block">
                      Rapport d'activité technique & temps :
                    </span>

                    {/* Saisie Vocale Integration */}
                    <div className="p-4 bg-primary-50 dark:bg-primary-950 rounded-xl border border-primary-200 dark:border-primary-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="m-0 font-bold text-primary-800 dark:text-primary-200 text-xs flex items-center gap-1">
                          <span>Compte-rendu détaillé des travaux</span>
                          <span className="text-red-500">*</span>
                          {crText.trim() ? (
                            <CheckCircle size={12} className="text-emerald-500 inline shrink-0 animate-fade-in" />
                          ) : null}
                        </label>

                        {/* Speech Dictation Button */}
                        <SaisieVocale
                          compact
                          onTranscript={(text) => {
                            setCrText(prev => prev ? `${prev} ${text}` : text);
                          }}
                        />
                      </div>
                      
                      <textarea
                        required
                        value={crText}
                        onChange={e => setCrText(e.target.value)}
                        rows={4}
                        placeholder="Rédigez ou dictez à la voix le déroulé exact de vos travaux de maintenance..."
                        className="text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Imputation */}
                      <div>
                        <label className="font-semibold text-xs mb-1 flex items-center gap-1.5">
                          <span>Budget / Imputation</span>
                          <span className="text-red-500">*</span>
                        </label>
                        <select required value={crImputation} onChange={e => setCrImputation(e.target.value)}>
                          {[...settings.listes.imputations].sort((a,b) => a.localeCompare(b)).map(i => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                      </div>

                      {/* Opérateur */}
                      <div>
                        <label className="font-semibold text-xs mb-1 flex items-center gap-1.5">
                          <span>Opérateur en charge</span>
                          <span className="text-red-500">*</span>
                        </label>
                        <select required value={crOperateur} onChange={e => setCrOperateur(e.target.value)}>
                          <option value="">Sélectionner...</option>
                          {[...settings.listes.operateurs].sort((a,b) => a.localeCompare(b)).map(o => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>

                        {/* Suggest Qualified Technicians if any */}
                        {!isSpontaneousMode && techSuggestions.length > 0 && (
                          <div className="mt-2 p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg space-y-1">
                            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 block flex items-center gap-1">
                              <Award size={10} /> Suggestions de techniciens qualifiés :
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {techSuggestions.slice(0, 3).map(tech => (
                                <button
                                  key={tech.name}
                                  type="button"
                                  onClick={() => setCrOperateur(tech.name)}
                                  className="text-[8px] font-bold px-1.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded hover:bg-amber-500/20"
                                >
                                  {tech.name} ({tech.score} comp.)
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Activité */}
                      <div>
                        <label className="font-semibold text-xs mb-1">Type d'activité</label>
                        <select value={crActivite} onChange={e => setCrActivite(e.target.value)}>
                          {settings.listes.activites.map(act => (
                            <option key={act} value={act}>{act}</option>
                          ))}
                        </select>
                      </div>

                      {/* Technologie */}
                      <div>
                        <label className="font-semibold text-xs mb-1">Technologie ciblée</label>
                        <select value={crTechno} onChange={e => setCrTechno(e.target.value)}>
                          {settings.listes.technologies.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* Cause */}
                      <div>
                        <label className="font-semibold text-xs mb-1">Cause de défaillance</label>
                        <select value={crCause} onChange={e => setCrCause(e.target.value)}>
                          {settings.listes.causes.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      {/* Remède */}
                      <div>
                        <label className="font-semibold text-xs mb-1">Remède appliqué</label>
                        <select value={crRemede} onChange={e => setCrRemede(e.target.value)}>
                          {settings.listes.remedes.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>

                      {/* Temps de travail (Heures) */}
                      <div>
                        <label className="font-semibold text-xs mb-1 flex items-center gap-1.5">
                          <span>Temps de travail (Heures)</span>
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          required
                          placeholder="ex: 1.5"
                          value={crMo}
                          onChange={e => setCrMo(e.target.value)}
                        />
                      </div>

                      {/* Temps d'arrêt machine (Heures) */}
                      <div>
                        <label className="font-semibold text-xs mb-1">
                          <span>Temps d'arrêt machine (Heures)</span>
                          <span className="text-primary-400 ml-1">(Facultatif)</span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="ex: 0.5 (laisser vide si pas d'arrêt)"
                          value={crArret}
                          onChange={e => setCrArret(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* STEP 3: PIÈCES CONSOMMÉES DU MAGASIN */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-primary-400 dark:text-primary-500 uppercase tracking-wider block">
                      Pièces de rechange consommées (Magasin) :
                    </span>

                    <div className="p-4 bg-primary-50 dark:bg-primary-950 rounded-xl border border-primary-200 dark:border-primary-800 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-8 relative">
                          <label className="font-bold text-xs mb-1 text-primary-700 dark:text-primary-300 flex items-center gap-1">
                            <Paperclip size={12} /> Rechercher un article dans le magasin
                          </label>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary-400" size={14} />
                            <input
                              type="text"
                              placeholder="Rechercher par désignation, référence, code..."
                              value={partSearch}
                              onChange={e => setPartSearch(e.target.value)}
                              className="pl-8 py-1.5 text-xs bg-white dark:bg-primary-900 rounded-lg"
                            />
                          </div>

                          {/* Autocomplete suggestions dropdown */}
                          {partSearch.trim() && (
                            <ul className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-xl shadow-xl z-50 divide-y divide-primary-100 dark:divide-primary-800 text-xs">
                              {pieces
                                .filter(p => 
                                  p.designation.toLowerCase().includes(partSearch.toLowerCase()) ||
                                  (p.reference || '').toLowerCase().includes(partSearch.toLowerCase()) ||
                                  (p.codeArticle || '').toLowerCase().includes(partSearch.toLowerCase())
                                )
                                .slice(0, 5)
                                .map(p => (
                                  <li
                                    key={p.id}
                                    onClick={() => addPieceConsumption(p)}
                                    className="p-2.5 hover:bg-primary-50 dark:hover:bg-primary-850 cursor-pointer flex justify-between items-center"
                                  >
                                    <div className="font-semibold text-primary-800 dark:text-primary-100">
                                      {p.designation} <span className="text-[10px] text-primary-400">({p.reference || 'sans réf'})</span>
                                    </div>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-primary-100 dark:bg-primary-950 rounded text-primary-500">
                                      Stock : {p.quantite} dispo
                                    </span>
                                  </li>
                                ))}
                            </ul>
                          )}
                        </div>

                        <div className="md:col-span-4">
                          <label className="font-bold text-xs mb-1 text-primary-700 dark:text-primary-300">Quantité consommée</label>
                          <input
                            type="number"
                            min="1"
                            value={partQty}
                            onChange={e => setPartQty(parseInt(e.target.value) || 1)}
                            className="bg-white dark:bg-primary-900"
                          />
                        </div>
                      </div>

                      {/* Consumed parts list */}
                      {selectedParts.length > 0 ? (
                        <div className="border-t border-primary-200 dark:border-primary-850 pt-3 space-y-2">
                          <span className="text-[10px] font-bold text-primary-400 dark:text-primary-500 block uppercase tracking-wider">
                            Pièces affectées au rapport :
                          </span>
                          
                          <div className="divide-y divide-primary-100 dark:divide-primary-800/60">
                            {selectedParts.map(part => (
                              <div key={part.id} className="py-2 flex items-center justify-between text-xs font-semibold">
                                <div className="flex flex-col">
                                  <span className="text-primary-800 dark:text-primary-200">{part.nom}</span>
                                  <span className="text-[10px] text-primary-400 font-mono">Ref: {part.reference || 'N/A'}</span>
                                </div>

                                <div className="flex items-center gap-4">
                                  <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-extrabold">
                                    Qté : {part.qte}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removePieceConsumption(part.id)}
                                    className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 hover:text-rose-600 rounded-lg transition"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-primary-400 italic text-center py-2">Aucune pièce de rechange ajoutée.</p>
                      )}
                    </div>
                  </div>

                  {/* STEP 3.5: PHOTOS DE L'INTERVENTION */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-primary-400 dark:text-primary-500 uppercase tracking-wider block">
                      Photos de l'intervention (Terrain) :
                    </span>

                    <div className="p-4 bg-primary-50 dark:bg-primary-950 rounded-xl border border-primary-200 dark:border-primary-800 space-y-4">
                      <div className="flex flex-col md:flex-row gap-4 items-start">
                        {crPhotoUrl ? (
                          <div className="flex flex-col gap-2 shrink-0 w-full md:w-44">
                            <div className="relative group w-full h-32 rounded-xl overflow-hidden border border-primary-200 dark:border-primary-800 shadow-sm bg-black flex items-center justify-center">
                              <img
                                src={crPhotoUrl}
                                alt="Intervention terrain"
                                className="max-w-full max-h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const win = window.open();
                                    if (win) {
                                      win.document.write(`<img src="${crPhotoUrl}" style="max-width:100%; max-height:100vh; display:block; margin:auto;"/>`);
                                    }
                                  }}
                                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition text-xs font-bold flex items-center gap-1"
                                  title="Agrandir la photo"
                                >
                                  <Eye size={12} /> Voir
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCrPhotoUrl('')}
                                  className="p-1.5 bg-red-600/80 hover:bg-red-600 rounded-lg text-white transition text-xs font-bold flex items-center gap-1"
                                  title="Supprimer la photo"
                                >
                                  <Trash2 size={12} /> Supprimer
                                </button>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsAnnotatorOpen(true)}
                              className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                              title="Annoter la photo"
                            >
                              <Pencil size={11} /> Dessiner / Annoter
                            </button>
                          </div>
                        ) : (
                          <div className="shrink-0 w-full md:w-44 h-32 rounded-xl border-2 border-dashed border-primary-300 dark:border-primary-750 flex flex-col items-center justify-center bg-white/50 dark:bg-primary-950/20 text-primary-400">
                            <Camera size={32} className="mb-2 text-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-center px-2">Aucune photo enregistrée</span>
                            <span className="text-[8px] text-primary-400 text-center px-2 mt-1">Facultatif</span>
                          </div>
                        )}

                        <div className="flex-1 space-y-3 w-full">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-primary-700 dark:text-primary-300 flex items-center gap-1.5">
                              <Camera size={14} className="text-indigo-500" />
                              Documentation visuelle de la panne ou réparation
                            </span>
                            <p className="text-[10px] text-primary-400 leading-relaxed">
                              Prenez une photo en direct ou importez une capture. Vos images sont compressées automatiquement (max 2 Mo) pour un transfert ultra-rapide en 4G/5G sur le terrain.
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            {/* Option 1: Prendre une photo via la caméra du smartphone */}
                            <label className="btn-secondary flex items-center justify-center gap-1.5 text-xs py-1.5 px-3 bg-indigo-500 hover:bg-indigo-600 text-white border-0 cursor-pointer rounded-lg shadow-sm transition">
                              <Camera size={13} />
                              <span>Prendre une photo (Caméra)</span>
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
                                      setCrPhotoUrl(compressed);
                                    } catch (error: any) {
                                      alert("Erreur lors du traitement de la photo : " + (error.message || error));
                                    }
                                  }
                                }}
                              />
                            </label>

                            {/* Option 2: Galerie d'images */}
                            <label className="btn-secondary flex items-center justify-center gap-1.5 text-xs py-1.5 px-3 bg-white hover:bg-primary-50 text-primary-700 dark:bg-primary-800 dark:hover:bg-primary-750 dark:text-primary-200 border border-primary-200 dark:border-primary-700 cursor-pointer rounded-lg shadow-sm transition">
                              <Upload size={13} className="text-indigo-500" />
                              <span>Importer un fichier</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const compressed = await compressImage(file, 1.0);
                                      setCrPhotoUrl(compressed);
                                    } catch (error: any) {
                                      alert("Erreur lors du traitement de la photo : " + (error.message || error));
                                    }
                                  }
                                }}
                              />
                            </label>

                            {/* Option 3: Entrer une URL d'image */}
                            <div className="w-full relative mt-1">
                              <input
                                type="text"
                                placeholder="Ou collez l'URL d'une image en ligne..."
                                value={crPhotoUrl.startsWith('data:') ? '' : crPhotoUrl}
                                onChange={(e) => setCrPhotoUrl(e.target.value)}
                                className="w-full text-xs py-1.5 px-2 bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <PhotoAnnotatorModal
                      isOpen={isAnnotatorOpen}
                      imageUrl={crPhotoUrl}
                      onClose={() => setIsAnnotatorOpen(false)}
                      onSave={(annotatedUrl) => setCrPhotoUrl(annotatedUrl)}
                    />
                  </div>

                  {/* STEP 4: DIGITAL SIGNATURE */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-primary-400 dark:text-primary-500 uppercase tracking-wider block">
                      Signature électronique du technicien :
                    </span>

                    <div className="p-4 bg-primary-50 dark:bg-primary-950 rounded-xl border border-primary-200 dark:border-primary-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-xs text-primary-700 dark:text-primary-300 mb-0 flex items-center gap-1.5">
                          <PenTool size={12} /> Signer le document de rapport
                          {hasSigned ? (
                            <CheckCircle size={11} className="text-emerald-500 shrink-0" />
                          ) : (
                            <span className="text-red-500">*</span>
                          )}
                        </label>
                        
                        {hasSigned && (
                          <button
                            type="button"
                            onClick={clearSignature}
                            className="text-[10px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                          >
                            Effacer la signature
                          </button>
                        )}
                      </div>

                      <div className="bg-white rounded-xl border border-primary-200 dark:border-primary-800 overflow-hidden shadow-inner relative h-32">
                        <canvas
                          ref={canvasRef}
                          width={600}
                          height={128}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-full cursor-crosshair block"
                        />
                        {!hasSigned && (
                          <div className="absolute inset-0 flex items-center justify-center text-primary-400 select-none pointer-events-none text-[11px] font-mono italic">
                            ✍️ Signez ici à l'aide de votre souris ou écran tactile
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* STEP 5: STATUS FOR SUBMISSION */}
                  <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/20 dark:border-indigo-800/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <label className="font-bold text-xs text-primary-800 dark:text-primary-200 flex items-center gap-1 justify-center sm:justify-start">
                        <Bookmark size={13} /> Option de clôture & statut du rapport
                      </label>
                      <p className="text-[10px] text-primary-400 font-semibold leading-relaxed max-w-sm">
                        Sélectionnez si le rapport est un brouillon ou s'il doit être envoyé en validation auprès d'un manager.
                      </p>
                    </div>

                    <select
                      value={crStatut}
                      onChange={e => setCrStatut(e.target.value as any)}
                      className="max-w-xs bg-white dark:bg-primary-900 text-xs font-bold border-indigo-200/50"
                    >
                      {userRole === 'Manager' && <option value="Soldé">Valider et Clôturer directement (Soldé)</option>}
                      <option value="En attente de validation">Soumettre pour validation (En attente)</option>
                      <option value="Brouillon">Enregistrer en Brouillon local</option>
                    </select>
                  </div>

                </div>

                {/* FORM ACTIONS */}
                <div className="px-5 py-4 bg-primary-50/50 dark:bg-primary-950/20 border-t border-primary-100 dark:border-primary-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Voulez-vous vraiment vider ce formulaire de rapport ?")) {
                        resetForm();
                      }
                    }}
                    className="px-4 py-2 text-xs font-bold text-primary-600 hover:text-primary-800 dark:text-primary-300 dark:hover:text-white bg-primary-100 hover:bg-primary-200 dark:bg-primary-800 dark:hover:bg-primary-750 rounded-xl transition cursor-pointer"
                  >
                    Effacer
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer transition flex items-center gap-1.5"
                  >
                    <FileCheck size={14} />
                    <span>Enregistrer le Rapport</span>
                  </button>
                </div>

              </form>
            )}
          </div>

        </div>
      )}

      {/* PRINT PREVIEW / PDF GENERATION MODAL */}
      <AnimatePresence>
        {showPrintPreview && printInt && (
          <div className="modal z-[110] no-print text-left">
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
                  <span className="font-display font-bold text-sm text-primary-800 dark:text-white">Aperçu avant impression (Rapport d'Intervention)</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setTimeout(() => {
                        window.print();
                      }, 100);
                    }}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-accent-orange hover:bg-accent-orange-hover text-white rounded-lg cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>Imprimer / PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowPrintPreview(false);
                    }}
                    className="btn-secondary text-xs py-1.5 px-3 rounded-lg cursor-pointer"
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
                  <div className="grid grid-cols-2 gap-4 mt-8 text-black">
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
            <div className="border border-gray-300 p-3 rounded space-y-3 text-black">
              <div className="grid grid-cols-4 gap-3 bg-gray-50 p-2 border border-gray-200 rounded">
                <div>
                  <p className="text-gray-500 text-[10px] uppercase font-bold">Activité</p>
                  <p className="font-bold">{printInt.activite || 'Correctif'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase font-bold">Technologie</p>
                  <p className="font-bold">{printInt.technologie || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase font-bold">Temps Passé</p>
                  <p className="font-bold">{printInt.tempsPasse || 'Non spécifié'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase font-bold">Temps d'Arrêt</p>
                  <p className="font-bold">{printInt.tempsArret || '0 H'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-2">
                <div>
                  <p><strong>Cause de la défaillance :</strong></p>
                  <p className="font-semibold bg-gray-50 p-1.5 rounded border">{printInt.cause}</p>
                </div>
                <div>
                  <p><strong>Remède / Action réalisée :</strong></p>
                  <p className="font-semibold bg-gray-50 p-1.5 rounded border">{printInt.remede}</p>
                </div>
              </div>

              <div className="border-t pt-2">
                <p><strong>Compte-rendu technique détaillé :</strong></p>
                <p className="bg-gray-50 p-2 rounded border leading-relaxed whitespace-pre-wrap font-medium">{printInt.compteRendu}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-2 text-[10px]">
                <p><strong>Technicien intervenant :</strong> <span className="font-semibold">{printInt.technicienCloture || printInt.operateur || 'N/A'}</span></p>
                <p><strong>Budget d'imputation :</strong> <span className="font-semibold">{printInt.imputation}</span></p>
              </div>
            </div>
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
