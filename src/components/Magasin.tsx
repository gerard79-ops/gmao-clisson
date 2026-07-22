/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Piece,
  MouvementStock,
  Equipement,
  Fournisseur,
  GlobalSettings
} from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { ModuleHelp } from './ModuleHelp';
import EquipmentTreeSelect from './EquipmentTreeSelect';
import { compressImage } from '../utils/imageCompressor';
import {
  Boxes,
  Plus,
  Trash2,
  PenTool,
  Search,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Camera,
  ClipboardCheck,
  Eye,
  Activity,
  Layers,
  Link2,
  Lock,
  Cog,
  ArrowLeft
} from 'lucide-react';

interface MagasinProps {
  pieces: Piece[];
  equipements: Equipement[];
  suppliers: Fournisseur[];
  settings: GlobalSettings;
  mouvements: MouvementStock[];
  onAddPiece: (payload: Omit<Piece, 'id'>) => void;
  onEditPiece: (id: string, payload: Partial<Piece>) => void;
  onDeletePiece: (id: string) => void;
  onAddMouvement: (payload: Omit<MouvementStock, 'id' | 'dateCreation'>) => void;
  selectedIdFromDashboard: string | null;
  onClearNavigationId: () => void;
  initialFilter?: string | null;
  onClearFilter?: () => void;
  userRole?: string;
}

export default function Magasin({
  pieces,
  equipements,
  suppliers,
  settings,
  mouvements,
  onAddPiece,
  onEditPiece,
  onDeletePiece,
  onAddMouvement,
  selectedIdFromDashboard,
  onClearNavigationId,
  initialFilter,
  onClearFilter,
  userRole
}: MagasinProps) {
  const [activeTab, setActiveTab] = useState<'inventaire' | 'mouvements'>('inventaire');
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);

  // Forms visibility
  const [showPieceForm, setShowPieceForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showInModal, setShowInModal] = useState(false);
  const [showOutModal, setShowOutModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showInventaireModal, setShowInventaireModal] = useState(false);

  // Search/Filters states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAtelier, setFilterAtelier] = useState('');
  const [filterMetier, setFilterMetier] = useState('');
  const [filterEq, setFilterEq] = useState('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Move stock list filters
  const [mvtStart, setMvtStart] = useState('');
  const [mvtEnd, setMvtEnd] = useState('');
  const [mvtType, setMvtType] = useState('');
  const [mvtFamille, setMvtFamille] = useState('');
  const [mvtMarque, setMvtMarque] = useState('');
  const [mvtText, setMvtText] = useState('');

  // Piece Form States
  const [formDesig, setFormDesig] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formFamille, setFormFamille] = useState('');
  const [formSousFamille, setFormSousFamille] = useState('');
  const [formMarque, setFormMarque] = useState('');
  const [formRef, setFormRef] = useState('');
  const [formFournisseur, setFormFournisseur] = useState('');
  const [formRefFourn, setFormRefFourn] = useState('');
  const [formEmp, setFormEmp] = useState('');
  const [formCodeBarre, setFormCodeBarre] = useState('');
  const [formQte, setFormQte] = useState<number>(0);
  const [formSeuil, setFormSeuil] = useState<number>(1);
  const [formPrix, setFormPrix] = useState<number>(0);
  const [formEqLies, setFormEqLies] = useState<string[]>([]);
  const [formPhoto, setFormPhoto] = useState<string | null>(null);
  const [formPhotoUrl, setFormPhotoUrl] = useState('');

  // In / Out / Scanner Mvt Forms States
  const [mvtInPieceId, setMvtInPieceId] = useState('');
  const [mvtInIntervenant, setMvtInIntervenant] = useState('');
  const [mvtInQte, setMvtInQte] = useState<number>(1);
  const [mvtInPrix, setMvtInPrix] = useState<number>(0);
  const [mvtInEmp, setMvtInEmp] = useState('');
  const [mvtInCom, setMvtInCom] = useState('');

  const [mvtOutPieceId, setMvtOutPieceId] = useState('');
  const [mvtOutIntervenant, setMvtOutIntervenant] = useState('');
  const [mvtOutQte, setMvtOutQte] = useState<number>(1);
  const [mvtOutType, setMvtOutType] = useState('Directe');
  const [mvtOutDestName, setMvtOutDestName] = useState('');
  const [mvtOutCom, setMvtOutCom] = useState('');

  // Inventaire tournant states
  const [tournantEmp, setTournantEmp] = useState('');
  const [tournantFam, setTournantFam] = useState('');
  const [tournantItems, setTournantItems] = useState<{ id: string; nom: string; code: string; ref: string; emp: string; theo: number; phys: number }[]>([]);

  // Scanner Simulator States
  const [scanDeductId, setScanDeductId] = useState('');
  const [scanDeductQty, setScanDeductQty] = useState(1);

  useEffect(() => {
    if (selectedIdFromDashboard) {
      setSelectedPieceId(selectedIdFromDashboard);
      onClearNavigationId();
    }
  }, [selectedIdFromDashboard]);

  useEffect(() => {
    if (initialFilter) {
      if (initialFilter === 'rupture') {
        setFilterLowStockOnly(true);
        setActiveTab('inventaire');
      }
      if (onClearFilter) {
        onClearFilter();
      }
    }
  }, [initialFilter, onClearFilter]);

  const selectedPiece = pieces.find(p => p.id === selectedPieceId);

  // KPIs
  const refsCount = pieces.length;
  const totalPiecesCount = pieces.reduce((sum, p) => sum + (p.quantite || 0), 0);
  const totalWarehouseValue = pieces.reduce((sum, p) => sum + (p.quantite || 0) * (p.prix || 0), 0);
  const rupturesCount = pieces.filter(p => p.quantite <= p.seuil).length;

  // Fuzzy match relevance scoring
  const getRelevance = (piece: Piece, query: string) => {
    if (!query) return 0;
    const txt = query.toLowerCase();
    const d = (piece.designation || '').toLowerCase();
    const r = (piece.reference || '').toLowerCase();
    const c = (piece.codeArticle || '').toLowerCase();
    if (d.startsWith(txt) || r.startsWith(txt) || c.startsWith(txt)) return 100;
    if (d.includes(txt) || r.includes(txt) || c.includes(txt)) return 50;
    return 0;
  };

  // Filter Piece List
  const getFilteredPieces = () => {
    return pieces.filter(p => {
      if (filterLowStockOnly && p.quantite > p.seuil) return false;

      if (filterAtelier || filterMetier || filterEq) {
        if (!p.equipementsLies || p.equipementsLies.length === 0) return false;
        const matchingEqs = equipements.filter(eq => p.equipementsLies.includes(eq.nom));
        if (filterAtelier && !matchingEqs.some(eq => eq.atelier === filterAtelier)) return false;
        if (filterMetier && !matchingEqs.some(eq => eq.metier === filterMetier)) return false;
        if (filterEq && !p.equipementsLies.includes(filterEq)) return false;
      }

      if (searchQuery) {
        return getRelevance(p, searchQuery) > 0;
      }
      return true;
    }).sort((a, b) => {
      if (searchQuery) {
        return getRelevance(b, searchQuery) - getRelevance(a, searchQuery);
      }
      return a.designation.localeCompare(b.designation);
    });
  };

  const filteredPieces = getFilteredPieces();

  // Load movement data for charts (Past 12 months)
  const getPieceChartData = (id: string) => {
    const data = [];
    const now = new Date();
    const relevantMvts = mouvements.filter(m => m.pieceId === id);

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });

      const monthMvts = relevantMvts.filter(m => m.dateStr.startsWith(key));
      const ent = monthMvts.filter(m => m.type === 'Entrée').reduce((sum, m) => sum + m.quantite, 0);
      const sor = monthMvts.filter(m => m.type === 'Sortie').reduce((sum, m) => sum + m.quantite, 0);

      data.push({
        name: label,
        'Entrées': ent,
        'Sorties': sor
      });
    }
    return data;
  };

  // Load movement data for line chart (Past 6 months)
  const getPiece6MonthsLineData = (id: string) => {
    const data = [];
    const now = new Date();
    const relevantMvts = mouvements.filter(m => m.pieceId === id);

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });

      const monthMvts = relevantMvts.filter(m => m.dateStr.startsWith(key));
      const ent = monthMvts.filter(m => m.type === 'Entrée').reduce((sum, m) => sum + m.quantite, 0);
      const sor = monthMvts.filter(m => m.type === 'Sortie').reduce((sum, m) => sum + m.quantite, 0);

      data.push({
        name: label.charAt(0).toUpperCase() + label.slice(1),
        'Entrées': ent,
        'Sorties': sor
      });
    }
    return data;
  };

  const exportPiecesToCSV = () => {
    const dataToExport = getFilteredPieces();
    const headers = [
      'Code Article',
      'Désignation',
      'Famille',
      'Sous-Famille',
      'Marque/Constructeur',
      'Référence',
      'Fournisseur',
      'Référence Fournisseur',
      'Emplacement Magasin',
      'Stock Actuel',
      'Seuil d\'Alerte',
      'Prix Unitaire HT (€)',
      'Valeur Stock HT (€)',
      'Code Barre / QR',
      'Équipements liés'
    ];

    const rows = dataToExport.map(p => [
      p.codeArticle,
      p.designation,
      p.famille,
      p.sousFamille,
      p.marque,
      p.reference,
      p.fournisseur,
      p.refFournisseur,
      p.emplacement,
      p.quantite,
      p.seuil,
      p.prix,
      p.quantite * p.prix,
      p.codeBarre,
      p.equipementsLies ? p.equipementsLies.join(', ') : ''
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
    link.setAttribute('download', `export_pieces_magasin_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Image URL verification
  const handlePhotoUrlChange = (url: string) => {
    setFormPhotoUrl(url);
    if (url.trim()) {
      setFormPhoto(url);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 1.0);
        setFormPhoto(compressed);
      } catch (error: any) {
        alert("Erreur lors du traitement de la photo : " + (error.message || error));
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = err => reject(err);
    });
  };

  // Trigger web image search in google images
  const triggerImageSearch = () => {
    if (!formDesig && !formRef) {
      alert("Veuillez d'abord renseigner la désignation ou la référence.");
      return;
    }
    const q = `${formMarque} ${formRef} ${formDesig}`.trim().replace(/\s+/g, '+');
    window.open(`https://www.google.com/search?tbm=isch&q=${q}`, '_blank');
  };

  // CRUD Saves
  const handleStartEdit = () => {
    if (!selectedPiece) return;
    setFormDesig(selectedPiece.designation);
    setFormCode(selectedPiece.codeArticle || '');
    setFormFamille(selectedPiece.famille || '');
    setFormSousFamille(selectedPiece.sousFamille || '');
    setFormMarque(selectedPiece.marque || '');
    setFormRef(selectedPiece.reference || '');
    setFormFournisseur(selectedPiece.fournisseur || '');
    setFormRefFourn(selectedPiece.refFournisseur || '');
    setFormEmp(selectedPiece.emplacement || '');
    setFormCodeBarre(selectedPiece.codeBarre || '');
    setFormQte(selectedPiece.quantite || 0);
    setFormSeuil(selectedPiece.seuil || 1);
    setFormPrix(selectedPiece.prix || 0);
    setFormEqLies(selectedPiece.equipementsLies || []);
    setFormPhoto(selectedPiece.photoUrl || null);
    setFormPhotoUrl(selectedPiece.photoUrl && selectedPiece.photoUrl.startsWith('http') ? selectedPiece.photoUrl : '');
    setIsEditing(true);
    setShowPieceForm(true);
  };

  const handleStartCreate = () => {
    setFormDesig('');
    setFormCode('');
    setFormFamille('');
    setFormSousFamille('');
    setFormMarque(settings.listes.marques[0] || '');
    setFormRef('');
    setFormFournisseur('');
    setFormRefFourn('');
    setFormEmp('');
    setFormCodeBarre('');
    setFormQte(0);
    setFormSeuil(1);
    setFormPrix(0);
    setFormEqLies([]);
    setFormPhoto(null);
    setFormPhotoUrl('');
    setIsEditing(false);
    setShowPieceForm(true);
  };

  const handleSubmitPiece = (e: React.FormEvent) => {
    e.preventDefault();
    let barcode = formCodeBarre.trim();
    if (!barcode) {
      barcode = "PRT-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.floor(Math.random() * 99);
    }

    const payload = {
      designation: formDesig,
      codeArticle: formCode || '-',
      famille: formFamille || '-',
      sousFamille: formSousFamille || '-',
      marque: formMarque || '-',
      reference: formRef || '-',
      fournisseur: formFournisseur || '-',
      refFournisseur: formRefFourn || '-',
      emplacement: formEmp || '-',
      quantite: Number(formQte),
      seuil: Number(formSeuil),
      prix: Number(formPrix),
      codeBarre: barcode,
      equipementsLies: formEqLies,
      photoUrl: formPhoto || undefined
    };

    if (isEditing && selectedPieceId) {
      onEditPiece(selectedPieceId, payload);
    } else {
      onAddPiece(payload);
    }

    setShowPieceForm(false);
    setSelectedPieceId(null);
  };

  const handleDelete = () => {
    if (userRole === 'Technicien') {
      alert("🔐 Accès refusé : Seul un Manager est autorisé à supprimer des pièces de rechange.");
      return;
    }
    if (!selectedPieceId) return;
    if (confirm("⚠️ Confirmer la suppression définitive de cet article ?")) {
      onDeletePiece(selectedPieceId);
      setSelectedPieceId(null);
    }
  };

  // Toggle compatible equipment checkboxes
  const handleToggleEq = (eqName: string) => {
    setFormEqLies(prev =>
      prev.includes(eqName) ? prev.filter(x => x !== eqName) : [...prev, eqName]
    );
  };

  // Mouvements saves
  const handleSaveInMvt = (e: React.FormEvent) => {
    e.preventDefault();
    const id = mvtInPieceId || selectedPieceId;
    if (!id) return;
    const p = pieces.find(x => x.id === id);
    if (!p) return;

    onAddMouvement({
      pieceId: id,
      pieceNom: p.designation,
      type: 'Entrée',
      dateStr: new Date().toISOString().split('T')[0],
      quantite: Number(mvtInQte),
      intervenant: mvtInIntervenant,
      prixUnitaire: Number(mvtInPrix),
      magasin: 'Magasin Principal',
      commentaires: mvtInCom || 'Entrée manuelle'
    });

    onEditPiece(id, {
      quantite: p.quantite + Number(mvtInQte),
      prix: Number(mvtInPrix),
      emplacement: mvtInEmp || p.emplacement
    });

    setShowInModal(false);
    setSelectedPieceId(id);
  };

  const handleSaveOutMvt = (e: React.FormEvent) => {
    e.preventDefault();
    const id = mvtOutPieceId || selectedPieceId;
    if (!id) return;
    const p = pieces.find(x => x.id === id);
    if (!p) return;

    if (Number(mvtOutQte) > p.quantite) {
      alert("⚠️ Stock insuffisant pour réaliser ce prélèvement !");
      return;
    }

    onAddMouvement({
      pieceId: id,
      pieceNom: p.designation,
      type: 'Sortie',
      dateStr: new Date().toISOString().split('T')[0],
      quantite: Number(mvtOutQte),
      intervenant: mvtOutIntervenant,
      destinationType: mvtOutType,
      destinationNom: mvtOutDestName || mvtOutType,
      commentaires: mvtOutCom || 'Sortie manuelle'
    });

    onEditPiece(id, {
      quantite: Math.max(p.quantite - Number(mvtOutQte), 0)
    });

    setShowOutModal(false);
    setSelectedPieceId(id);
  };

  // Inventaire Tournant loaders
  const loadTournantList = () => {
    const filtered = pieces.filter(p => {
      let mEmp = true, mFam = true;
      if (tournantEmp) mEmp = (p.emplacement || '').toLowerCase().includes(tournantEmp.toLowerCase().trim());
      if (tournantFam) mFam = p.famille === tournantFam;
      return mEmp && mFam;
    });

    setTournantItems(
      filtered.map(p => ({
        id: p.id,
        nom: p.designation,
        code: p.codeArticle,
        ref: p.reference,
        emp: p.emplacement,
        theo: p.quantite,
        phys: p.quantite
      }))
    );
  };

  const handleSaveTournant = () => {
    const listToSave = tournantItems.filter(item => item.phys !== item.theo);
    if (listToSave.length === 0) {
      alert("Aucun écart constaté. L'inventaire est conforme.");
      setShowInventaireModal(false);
      return;
    }

    if (confirm(`Confirmer la régularisation de ${listToSave.length} article(s) ? Des mouvements automatiques d'inventaire seront écrits.`)) {
      listToSave.forEach(item => {
        const diff = item.phys - item.theo;
        onAddMouvement({
          pieceId: item.id,
          pieceNom: item.nom,
          type: diff > 0 ? 'Entrée' : 'Sortie',
          dateStr: new Date().toISOString().split('T')[0],
          quantite: Math.abs(diff),
          intervenant: 'Inventaire Tournant (Régularisation)',
          commentaires: `Régularisation inventaire: Théo ${item.theo} -> Phys ${item.phys}`
        });

        onEditPiece(item.id, {
          quantite: item.phys
        });
      });

      alert("L'inventaire tournant a été régularisé.");
      setShowInventaireModal(false);
    }
  };

  // Scanner direct checkout
  const handleQuickScannerCheckout = () => {
    const p = pieces.find(x => x.id === scanDeductId);
    if (!p) return;

    if (scanDeductQty > p.quantite) {
      alert("Quantité supérieure au stock physique !");
      return;
    }

    onAddMouvement({
      pieceId: scanDeductId,
      pieceNom: p.designation,
      type: 'Sortie',
      dateStr: new Date().toISOString().split('T')[0],
      quantite: scanDeductQty,
      intervenant: 'Scanner Mobile (Quick checkout)',
      destinationType: 'Directe',
      destinationNom: 'Sortie Directe Scanner',
      commentaires: 'Consommation rapide par code-barres'
    });

    onEditPiece(scanDeductId, {
      quantite: p.quantite - scanDeductQty
    });

    setShowScannerModal(false);
    setScanDeductId('');
    setScanDeductQty(1);
    alert(`Sortie validée avec succès pour : ${p.designation}`);
  };

  // Movements List Filtering
  const getFilteredMvts = () => {
    return mouvements.filter(m => {
      if (mvtStart && m.dateStr < mvtStart) return false;
      if (mvtEnd && m.dateStr > mvtEnd) return false;
      if (mvtType && m.type !== mvtType) return false;

      const p = pieces.find(x => x.id === m.pieceId) || ({} as any);
      if (mvtFamille && p.famille !== mvtFamille) return false;
      if (mvtMarque && p.marque !== mvtMarque) return false;

      if (mvtText) {
        const t = mvtText.toLowerCase();
        return (
          m.pieceNom.toLowerCase().includes(t) ||
          m.intervenant.toLowerCase().includes(t) ||
          m.commentaires.toLowerCase().includes(t)
        );
      }
      return true;
    }).sort((a, b) => b.dateCreation.localeCompare(a.dateCreation));
  };

  const filteredMvts = getFilteredMvts();

  // Excel / PDF Mock Downloader
  const handleDownloadReport = (dataset: string) => {
    alert(`📥 Génération et téléchargement du rapport "${dataset}" au format Excel démarré.`);
  };

  return (
    <div className="space-y-6">
      {/* MODULE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary-900 dark:text-white flex items-center">
            Magasin & Stocks
            <ModuleHelp moduleId="magasin" />
          </h1>
          <p className="text-sm text-primary-500 dark:text-primary-400 mt-1">
            Valorisation, gestion des stocks de sécurité, inventaire tournant et logistique pièces de rechange.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <button
            onClick={exportPiecesToCSV}
            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 bg-white hover:bg-primary-50 text-primary-700 dark:bg-primary-800 dark:hover:bg-primary-750 dark:text-primary-200 border border-primary-200 dark:border-primary-700"
            title="Exporter l'inventaire filtré au format CSV"
          >
            <Download size={16} />
            Exporter CSV
          </button>
          <button
            onClick={() => setShowScannerModal(true)}
            className="btn-primary"
            style={{ backgroundColor: '#8B5CF6' }}
          >
            <Camera size={16} />
            Scanner Sortie
          </button>
          <button
            onClick={() => setShowInventaireModal(true)}
            className="btn-primary"
            style={{ backgroundColor: '#0284C7' }}
          >
            <ClipboardCheck size={16} />
            Inv. Tournant
          </button>
          <button
            onClick={handleStartCreate}
            className="btn-primary"
          >
            <Plus size={16} />
            Nouvelle Pièce
          </button>
        </div>
      </div>

      {/* MODULE TABS */}
      <div className="flex items-center gap-4 border-b border-primary-200 dark:border-primary-700">
        <button
          onClick={() => setActiveTab('inventaire')}
          className={`px-4 py-2 font-display text-sm font-bold border-b-2 transition ${activeTab === 'inventaire' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-400 hover:text-primary-600'}`}
        >
          Inventaire du Parc
        </button>
        <button
          onClick={() => {
            setActiveTab('mouvements');
            setSelectedPieceId(null);
          }}
          className={`px-4 py-2 font-display text-sm font-bold border-b-2 transition ${activeTab === 'mouvements' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-400 hover:text-primary-600'}`}
        >
          Entrées / Sorties (Mouvements)
        </button>
      </div>

      {/* TAB 1 : INVENTAIRE */}
      {activeTab === 'inventaire' && !selectedPieceId && (
        <div className="space-y-6">
          {/* KPIS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card text-center border-b-2 border-b-sky-500">
              <span className="text-[10px] uppercase font-bold text-primary-500">Réf. Uniques</span>
              <h2 className="text-2xl font-display font-bold text-primary-900 dark:text-white mt-1">{refsCount}</h2>
            </div>
            <div className="card text-center border-b-2 border-b-indigo-500">
              <span className="text-[10px] uppercase font-bold text-primary-500">Pièces Physiques</span>
              <h2 className="text-2xl font-display font-bold text-primary-900 dark:text-white mt-1">{totalPiecesCount}</h2>
            </div>
            <div className="card text-center border-b-2 border-b-emerald-500">
              <span className="text-[10px] uppercase font-bold text-primary-500">Valeur Magasin</span>
              <h2 className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {totalWarehouseValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </h2>
            </div>
            <div className="card text-center border-b-2 border-b-red-500">
              <span className="text-[10px] uppercase font-bold text-primary-500">Sécurité / Ruptures</span>
              <h2 className={`text-2xl font-display font-bold ${rupturesCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-primary-900 dark:text-white'} mt-1`}>{rupturesCount}</h2>
            </div>
          </div>

          {/* MAIN INVENTORY LIST CARD */}
          <div className="card">
            {/* Fuzzy Search and cascades filters */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" size={16} />
                <input
                  type="text"
                  placeholder="Recherche rapide (Désignation, Réf Constructeur, Code Article...)"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={filterAtelier}
                onChange={e => setFilterAtelier(e.target.value)}
                className="p-2 text-xs w-40"
              >
                <option value="">Ateliers (Tous)</option>
                {[...settings.listes.ateliers].sort((a, b) => a.localeCompare(b)).map(a => <option key={a} value={a}>{a}</option>)}
              </select>

              <select
                value={filterMetier}
                onChange={e => setFilterMetier(e.target.value)}
                className="p-2 text-xs w-40"
              >
                <option value="">Métiers (Tous)</option>
                {[...settings.listes.metiers].sort((a, b) => a.localeCompare(b)).map(m => <option key={m} value={m}>{m}</option>)}
              </select>

              <EquipmentTreeSelect
                equipements={equipements}
                selectedId={equipements.find(e => e.nom === filterEq)?.id || ''}
                onSelect={(id) => {
                  const found = equipements.find(e => e.id === id);
                  setFilterEq(found ? found.nom : '');
                }}
                noneLabel="Équipements (Tous)"
                placeholder="Filtrer par machine..."
                className="w-48 text-xs font-semibold"
              />

              <button
                type="button"
                onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
                className={`p-2 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
                  filterLowStockOnly
                    ? 'bg-red-100 text-red-800 border-red-350 dark:bg-red-950 dark:text-red-300'
                    : 'bg-primary-50 hover:bg-primary-100 dark:bg-primary-800 dark:hover:bg-primary-750 text-primary-700 dark:text-primary-300 border-primary-200'
                }`}
              >
                <AlertTriangle size={14} className={filterLowStockOnly ? 'text-red-600' : 'text-primary-450'} />
                Ruptures uniquement ({rupturesCount})
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Désignation / Code</th>
                    <th>Catégorie / Référence</th>
                    <th>Emplacement</th>
                    <th>Stock</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPieces.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-primary-500 text-sm">
                        Aucun article correspondant dans l'inventaire du magasin.
                      </td>
                    </tr>
                  ) : (
                    filteredPieces.map(p => {
                      const limit = p.seuil;
                      const qte = p.quantite;
                      const alert = qte <= limit;

                      return (
                        <tr key={p.id} className="hover:bg-primary-50 dark:hover:bg-primary-800 transition">
                          <td>
                            {p.photoUrl ? (
                              <img src={p.photoUrl} alt={p.designation} className="h-10 w-10 object-contain rounded border bg-white" />
                            ) : (
                              <div className="h-10 w-10 rounded border bg-primary-100 dark:bg-primary-900 text-primary-400 flex items-center justify-center">
                                <Cog size={16} />
                              </div>
                            )}
                          </td>
                          <td>
                            <strong className="text-primary-800 dark:text-white block">{p.designation}</strong>
                            <span className="text-[10px] font-mono text-primary-400">Code: {p.codeArticle}</span>
                          </td>
                          <td>
                            <span className="block">{p.reference}</span>
                            <span className="text-[10px] text-primary-400">{p.famille} · {p.marque}</span>
                          </td>
                          <td>
                            <span className="px-2 py-0.5 rounded text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-mono font-bold">
                              {p.emplacement}
                            </span>
                          </td>
                          <td>
                            <span className={`font-bold ${qte === 0 ? 'text-red-500 animate-pulse' : (alert ? 'text-amber-500' : 'text-emerald-500')}`}>
                              {qte} {qte === 0 ? '(Rupture)' : (alert ? '(Critique)' : '')}
                            </span>
                          </td>
                          <td className="text-right">
                            <button
                              onClick={() => setSelectedPieceId(p.id)}
                              className="btn-icon bg-primary-50 hover:bg-accent-orange hover:text-white"
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
        </div>
      )}

      {/* TAB 2 : MOUVEMENTS STOCK LIST */}
      {activeTab === 'mouvements' && (
        <div className="space-y-6">
          {/* QUICK INPUT AND OUTPUT CREATION BANNER */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => {
                setMvtInPieceId(pieces[0]?.id || '');
                setMvtInPrix(pieces[0]?.prix || 0);
                setMvtInEmp(pieces[0]?.emplacement || '');
                setMvtInIntervenant('Sylvie Roche (Magasin)');
                setShowInModal(true);
              }}
              className="p-5 border border-emerald-200 dark:border-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400 font-display font-bold text-lg rounded-xl flex items-center justify-center gap-3 hover:bg-emerald-100/20 active:scale-[0.99] transition shadow-sm"
            >
              <ArrowDown size={22} />
              CRÉER UNE ENTRÉE (RÉASSORT)
            </button>

            <button
              onClick={() => {
                setMvtOutPieceId(pieces[0]?.id || '');
                setMvtOutIntervenant('Pierre Martin (Tech)');
                setMvtOutType('Directe');
                setMvtOutDestName('Perte / Divers');
                setShowOutModal(true);
              }}
              className="p-5 border border-red-200 dark:border-red-950 bg-red-50/20 dark:bg-red-950/10 text-red-700 dark:text-red-400 font-display font-bold text-lg rounded-xl flex items-center justify-center gap-3 hover:bg-red-100/20 active:scale-[0.99] transition shadow-sm"
            >
              <ArrowUp size={22} />
              CRÉER UNE SORTIE (PRÉLÈVEMENT)
            </button>
          </div>

          {/* MOVEMENTS HISTORIC AND FILTERS */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-primary-800 dark:text-primary-200">
                Historique des Transactions Magasin
              </h3>
              <button
                onClick={() => handleDownloadReport('Mouvements de stock')}
                className="btn-secondary text-xs flex items-center gap-1 py-1.5"
              >
                <FileSpreadsheet size={14} />
                Exporter XLS
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-4 bg-primary-50 dark:bg-primary-900 rounded-lg mb-4 text-xs">
              <div>
                <label className="text-[10px] font-bold">Du</label>
                <input type="date" value={mvtStart} onChange={e => setMvtStart(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-bold">Au</label>
                <input type="date" value={mvtEnd} onChange={e => setMvtEnd(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-bold">Type</label>
                <select value={mvtType} onChange={e => setMvtType(e.target.value)}>
                  <option value="">Tous</option>
                  <option value="Entrée">Entrée</option>
                  <option value="Sortie">Sortie</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold">Famille</label>
                <select value={mvtFamille} onChange={e => setMvtFamille(e.target.value)}>
                  <option value="">Toutes</option>
                  {[...Object.keys(settings.listes.categories)].sort((a, b) => a.localeCompare(b)).map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold">Fabricant</label>
                <select value={mvtMarque} onChange={e => setMvtMarque(e.target.value)}>
                  <option value="">Tous</option>
                  {[...settings.listes.marques].sort((a, b) => a.localeCompare(b)).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold">Recherche</label>
                <input
                  type="text"
                  placeholder="Recherche libre..."
                  value={mvtText}
                  onChange={e => setMvtText(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table w-full text-xs">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Désignation Pièce</th>
                    <th>Quantité</th>
                    <th>Imputation / BL</th>
                    <th>Intervenant</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMvts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-primary-500 text-sm">
                        Aucun mouvement correspondant aux filtres.
                      </td>
                    </tr>
                  ) : (
                    filteredMvts.map(m => {
                      const isIn = m.type === 'Entrée';
                      return (
                        <tr key={m.id} className="hover:bg-primary-50 dark:hover:bg-primary-800 transition">
                          <td>{m.dateStr}</td>
                          <td>
                            <span className={`font-bold inline-flex items-center gap-1 ${isIn ? 'text-emerald-600' : 'text-red-500'}`}>
                              {isIn ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                              {m.type}
                            </span>
                          </td>
                          <td className="font-bold">{m.pieceNom}</td>
                          <td className="font-bold">{m.quantite}</td>
                          <td>{m.destinationNom || m.commentaires}</td>
                          <td>{m.intervenant}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL VIEW ON SELECT PIECE */}
      {selectedPieceId && selectedPiece && (
        <div className="space-y-6">
          <div className="card flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedPieceId(null)}
                className="p-1.5 bg-primary-100 hover:bg-primary-200 dark:bg-primary-900 dark:hover:bg-primary-800 rounded-lg text-primary-600 dark:text-primary-300"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-xl font-display font-bold text-primary-900 dark:text-white">
                  {selectedPiece.designation}
                </h2>
                <p className="text-xs text-primary-500 font-mono uppercase mt-1">
                  Réf Constructeur : {selectedPiece.reference} · Code: {selectedPiece.codeArticle}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className={`btn-secondary text-red-500 border-red-200 ${userRole === 'Technicien' ? 'opacity-40 cursor-not-allowed' : 'hover:bg-red-50'}`}
                title={userRole === 'Technicien' ? "Suppression réservée aux Managers (Accès restreint)" : "Supprimer cet article"}
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={handleStartEdit}
                className="btn-primary"
                style={{ backgroundColor: '#3B82F6' }}
              >
                <PenTool size={14} />
                Modifier
              </button>
            </div>
          </div>

          {/* TWO COLUMN ARBORESCENCE OF CHARACTERISTICS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Box Photo and stock */}
            <div className="md:col-span-1 space-y-6">
              <div className="card text-center flex flex-col items-center">
                {selectedPiece.photoUrl ? (
                  <img
                    src={selectedPiece.photoUrl}
                    alt={selectedPiece.designation}
                    className="max-h-48 w-full object-contain bg-white border rounded-xl mb-4 p-2"
                  />
                ) : (
                  <div className="h-40 w-full bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center text-primary-400 mb-4 border">
                    <Boxes size={48} />
                  </div>
                )}

                <h3 className="text-2xl font-display font-extrabold text-primary-900 dark:text-white">
                  {(selectedPiece.prix || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </h3>
                <span className="text-xs text-primary-400 block font-mono mt-1">Prix Unitaire Moyen</span>

                <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900 rounded-xl w-full">
                  <span className="text-[10px] uppercase font-bold text-primary-500 block">Stock Physique</span>
                  <span className={`text-3xl font-display font-bold ${selectedPiece.quantite <= selectedPiece.seuil ? 'text-red-600' : 'text-emerald-600'}`}>
                    {selectedPiece.quantite}
                  </span>
                  <span className="text-xs block text-primary-400 mt-1">Seuil d'alerte : {selectedPiece.seuil} pcs</span>
                </div>
              </div>

              {/* Transactions quick links */}
              <div className="card flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMvtInPieceId(selectedPiece.id);
                    setMvtInPrix(selectedPiece.prix);
                    setMvtInEmp(selectedPiece.emplacement);
                    setMvtInIntervenant('Sylvie Roche (Magasin)');
                    setShowInModal(true);
                  }}
                  className="btn-primary w-full justify-center"
                  style={{ backgroundColor: '#10B981' }}
                >
                  <ArrowDown size={14} />
                  Enregistrer une Entrée
                </button>
                <button
                  onClick={() => {
                    setMvtOutPieceId(selectedPiece.id);
                    setMvtOutIntervenant('Pierre Martin (Tech)');
                    setShowOutModal(true);
                  }}
                  className="btn-primary w-full justify-center"
                  style={{ backgroundColor: '#EF4444' }}
                >
                  <ArrowUp size={14} />
                  Enregistrer une Sortie
                </button>
              </div>
            </div>

            {/* Right Box Characteristics */}
            <div className="md:col-span-2 space-y-6">
              <div className="card">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary-800 dark:text-primary-200 border-b pb-2 mb-4">
                  <Layers size={16} className="inline mr-2 text-accent-orange" />
                  Nomenclature & Classification
                </h3>
                <div className="grid grid-cols-2 gap-y-3 text-xs">
                  <p><strong>Code Article :</strong> {selectedPiece.codeArticle || '-'}</p>
                  <p><strong>Emplacement :</strong> <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900 font-mono rounded">{selectedPiece.emplacement}</span></p>
                  <p><strong>Famille :</strong> {selectedPiece.famille || '-'}</p>
                  <p><strong>Sous-Famille :</strong> {selectedPiece.sousFamille || '-'}</p>
                  <p><strong>Marque / Fab :</strong> {selectedPiece.marque || '-'}</p>
                  <p><strong>Réf Constructeur :</strong> {selectedPiece.reference || '-'}</p>
                  <p><strong>Fournisseur principal :</strong> {selectedPiece.fournisseur || '-'}</p>
                  <p><strong>Réf Fournisseur :</strong> {selectedPiece.refFournisseur || '-'}</p>
                  <p className="col-span-2"><strong>Code-barres / QR :</strong> <span className="font-mono bg-primary-50 p-1 border rounded">{selectedPiece.codeBarre}</span></p>
                </div>

                <h3 className="text-sm font-bold uppercase tracking-wider text-primary-800 dark:text-primary-200 border-b pb-2 mt-6 mb-4">
                  <Link2 size={16} className="inline mr-2 text-indigo-500" />
                  Machines compatibles
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPiece.equipementsLies && selectedPiece.equipementsLies.length > 0 ? (
                    selectedPiece.equipementsLies.map(eq => (
                      <span key={eq} className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-900">
                        {eq}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-primary-400 italic">Aucune compatibilité machine n'a été spécifiée.</p>
                  )}
                </div>
              </div>

              {/* Monthly consumption graph */}
              <div className="card">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary-800 dark:text-primary-200 mb-4">
                  <Activity size={16} className="inline mr-2 text-sky-500" />
                  Consommation 12 derniers mois
                </h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getPieceChartData(selectedPiece.id)}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="Entrées" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Sorties" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 6-Month Line Chart */}
              <div className="card">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary-800 dark:text-primary-200 mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-indigo-500" />
                  Évolution des entrées / sorties (6 derniers mois)
                </h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={getPiece6MonthsLineData(selectedPiece.id)}
                      margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="Entrées" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="Sorties" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Historical logs of transactions */}
              <div className="card">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary-800 dark:text-primary-200 mb-4">
                  Journal des Transactions
                </h3>
                <div className="table-wrapper" style={{ maxHeight: '200px' }}>
                  <table className="data-table w-full text-xs">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Quantité</th>
                        <th>Bénéficiaire / Motif</th>
                      </tr>
                    </thead>
                    <tbody id="fiche-mvt-list">
                      {mouvements.filter(m => m.pieceId === selectedPiece.id).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-4 text-primary-400">Aucune transaction recensée.</td>
                        </tr>
                      ) : (
                        mouvements
                          .filter(m => m.pieceId === selectedPiece.id)
                          .sort((a, b) => b.dateCreation.localeCompare(a.dateCreation))
                          .map(m => (
                            <tr key={m.id}>
                              <td>{m.dateStr}</td>
                              <td className={`font-bold ${m.type === 'Entrée' ? 'text-emerald-600' : 'text-red-500'}`}>
                                {m.type}
                              </td>
                              <td className="font-bold">{m.quantite}</td>
                              <td>{m.destinationNom || m.commentaires}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CRUD FORM PIECE */}
      <AnimatePresence>
        {showPieceForm && (
          <div className="modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content"
              style={{ maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <span onClick={() => setShowPieceForm(false)} className="close-modal">&times;</span>
              <h2 className="text-lg font-display font-bold text-primary-900 dark:text-white border-b pb-3 mb-4">
                {isEditing ? "Modifier l'article" : "Ajouter un article au magasin"}
              </h2>

              <form onSubmit={handleSubmitPiece} className="grid-form text-xs">
                <div className="col-span-2">
                  <label>Désignation de la pièce <span className="text-red-500">*</span></label>
                  <textarea
                    required
                    value={formDesig}
                    onChange={e => setFormDesig(e.target.value)}
                    rows={2}
                    placeholder="Ex: Roulement SKF à contact oblique..."
                  />
                </div>

                <div>
                  <label>Code Article (Interne / ERP)</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                    placeholder="ROU-SKF-6204"
                  />
                </div>

                <div>
                  <label>Code-barres / Barcode QR</label>
                  <input
                    type="text"
                    value={formCodeBarre}
                    onChange={e => setFormCodeBarre(e.target.value)}
                    placeholder="Laisser vide pour génération auto"
                  />
                </div>

                <div>
                  <label>Famille principale</label>
                  <input
                    type="text"
                    value={formFamille}
                    onChange={e => setFormFamille(e.target.value)}
                    placeholder="Ex: Hydraulique, Mécanique..."
                  />
                </div>

                <div>
                  <label>Sous-Famille</label>
                  <input
                    type="text"
                    value={formSousFamille}
                    onChange={e => setFormSousFamille(e.target.value)}
                    placeholder="Ex: Vérins, Joints, Cartouches..."
                  />
                </div>

                <div>
                  <label>Fabricant / Marque</label>
                  <select value={formMarque} onChange={e => setFormMarque(e.target.value)}>
                    {[...settings.listes.marques].sort((a, b) => a.localeCompare(b)).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Référence Constructeur</label>
                  <input
                    type="text"
                    value={formRef}
                    onChange={e => setFormRef(e.target.value)}
                    placeholder="Ex: 6204-2RSH"
                  />
                </div>

                <div>
                  <label>Fournisseur habituel</label>
                  <select value={formFournisseur} onChange={e => setFormFournisseur(e.target.value)}>
                    <option value="">Sélectionner fournisseur...</option>
                    {[...suppliers].sort((a, b) => a.nom.localeCompare(b.nom)).map(s => (
                      <option key={s.id} value={s.nom}>{s.nom}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Référence Fournisseur (Catalogue)</label>
                  <input
                    type="text"
                    value={formRefFourn}
                    onChange={e => setFormRefFourn(e.target.value)}
                    placeholder="Ex: CAT-SND-991"
                  />
                </div>

                <div>
                  <label>Emplacement de stockage <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formEmp}
                    onChange={e => setFormEmp(e.target.value)}
                    placeholder="Ex: Rayon C - Étagère 4"
                  />
                </div>

                <div>
                  <label>Prix unitaire moyen HT (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPrix}
                    onChange={e => setFormPrix(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label>Quantité Initiale <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    value={formQte}
                    onChange={e => setFormQte(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label>Seuil d'alerte sécurité <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    value={formSeuil}
                    onChange={e => setFormSeuil(Number(e.target.value))}
                  />
                </div>

                <div className="col-span-2 p-3 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Equipment checkboxes compatibility */}
                  <div>
                    <label className="font-bold mb-2 block">Machines compatibles :</label>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-white dark:bg-primary-950 border rounded-lg">
                      {equipements.map(eq => (
                        <label key={eq.id} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={formEqLies.includes(eq.nom)}
                            onChange={() => handleToggleEq(eq.nom)}
                            className="accent-accent-orange"
                          />
                          <span>{eq.nom}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Photo details */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold">Image / Photo :</label>
                        <button
                          type="button"
                          onClick={triggerImageSearch}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                        >
                          🔍 Chercher l'image
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Coller l'adresse URL d'une image..."
                        value={formPhotoUrl}
                        onChange={e => handlePhotoUrlChange(e.target.value)}
                        className="mb-2"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="p-1 text-[10px]"
                      />
                    </div>

                    {formPhoto && (
                      <div className="mt-2 text-center">
                        <img src={formPhoto} alt="Prévisualisation" className="max-h-16 inline object-contain rounded border bg-white" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-2 flex justify-end gap-3 mt-4 border-t pt-4">
                  <button type="button" onClick={() => setShowPieceForm(false)} className="btn-secondary">Annuler</button>
                  <button type="submit" className="btn-primary">Enregistrer</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MVT IN MODAL */}
      <AnimatePresence>
        {showInModal && (
          <div className="modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content"
            >
              <span onClick={() => setShowInModal(false)} className="close-modal">&times;</span>
              <h2 className="text-lg font-display font-bold text-emerald-600 border-b pb-3 mb-4 flex items-center gap-1.5"><ArrowDown size={18} /> Entrée de Stock (Réassort)</h2>
              <form onSubmit={handleSaveInMvt} className="grid-form text-xs">
                <div className="col-span-2">
                  <label>Sélectionner la référence de pièce <span className="text-red-500">*</span></label>
                  <select value={mvtInPieceId} onChange={e => setMvtInPieceId(e.target.value)}>
                    {[...pieces].sort((a, b) => a.designation.localeCompare(b.designation)).map(p => (
                      <option key={p.id} value={p.id}>{p.designation} (Stock: {p.quantite})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Intervenant / Magasinier <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={mvtInIntervenant}
                    onChange={e => setMvtInIntervenant(e.target.value)}
                  />
                </div>

                <div>
                  <label>Quantité Entrée <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={mvtInQte}
                    onChange={e => setMvtInQte(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label>Nouveau Prix d'Achat HT Moyen (€) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={mvtInPrix}
                    onChange={e => setMvtInPrix(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label>Confirmer adresse de stockage</label>
                  <input
                    type="text"
                    value={mvtInEmp}
                    onChange={e => setMvtInEmp(e.target.value)}
                    placeholder="Rayon X - Case Y"
                  />
                </div>

                <div className="col-span-2">
                  <label>Motif d'entrée / N° de Bon de Livraison (BL)</label>
                  <textarea
                    value={mvtInCom}
                    onChange={e => setMvtInCom(e.target.value)}
                    rows={2}
                    placeholder="Optionnel..."
                  />
                </div>

                <div className="col-span-2 flex justify-end gap-3 mt-4 border-t pt-4">
                  <button type="button" onClick={() => setShowInModal(false)} className="btn-secondary">Annuler</button>
                  <button type="submit" className="btn-primary" style={{ backgroundColor: '#10B981' }}>Valider l'entrée</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MVT OUT MODAL */}
      <AnimatePresence>
        {showOutModal && (
          <div className="modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content"
            >
              <span onClick={() => setShowOutModal(false)} className="close-modal">&times;</span>
              <h2 className="text-lg font-display font-bold text-red-600 border-b pb-3 mb-4 flex items-center gap-1.5"><ArrowUp size={18} /> Sortie de Stock (Prélèvement)</h2>
              <form onSubmit={handleSaveOutMvt} className="grid-form text-xs">
                <div className="col-span-2">
                  <label>Sélectionner la référence de pièce <span className="text-red-500">*</span></label>
                  <select value={mvtOutPieceId} onChange={e => setMvtOutPieceId(e.target.value)}>
                    {[...pieces].sort((a, b) => a.designation.localeCompare(b.designation)).map(p => (
                      <option key={p.id} value={p.id}>{p.designation} (Dispo : {p.quantite})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Technicien préleveur <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={mvtOutIntervenant}
                    onChange={e => setMvtOutIntervenant(e.target.value)}
                  />
                </div>

                <div>
                  <label>Quantité prélevée <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={mvtOutQte}
                    onChange={e => setMvtOutQte(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label>Imputation de la consommation <span className="text-red-500">*</span></label>
                  <select value={mvtOutType} onChange={e => {
                    setMvtOutType(e.target.value);
                    if (e.target.value === 'Directe') {
                      setMvtOutDestName('Perte / Divers');
                    } else {
                      setMvtOutDestName('');
                    }
                  }}>
                    <option value="Atelier">Imputation Atelier complet</option>
                    <option value="Machine">Imputation Machine spécifique</option>
                    <option value="Directe">Sortie directe (Ajustement/Perte)</option>
                  </select>
                </div>

                {mvtOutType !== 'Directe' && (
                  <div>
                    <label>Nom de la destination <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder={mvtOutType === 'Machine' ? "Nom de la machine" : "Nom de l'atelier"}
                      value={mvtOutDestName}
                      onChange={e => setMvtOutDestName(e.target.value)}
                    />
                  </div>
                )}

                <div className="col-span-2">
                  <label>Commentaire / Cause d'usure / Numéro de BT <span className="text-red-500">*</span></label>
                  <textarea
                    required
                    value={mvtOutCom}
                    onChange={e => setMvtOutCom(e.target.value)}
                    rows={2}
                    placeholder="Indiquez la raison de la sortie ou l'ID de l'intervention..."
                  />
                </div>

                <div className="col-span-2 flex justify-end gap-3 mt-4 border-t pt-4">
                  <button type="button" onClick={() => setShowOutModal(false)} className="btn-secondary">Annuler</button>
                  <button type="submit" className="btn-primary" style={{ backgroundColor: '#EF4444' }}>Valider la sortie</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SCANNER SIMULATOR MODAL */}
      <AnimatePresence>
        {showScannerModal && (
          <div className="modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content"
              style={{ maxWidth: '400px' }}
            >
              <span onClick={() => {
                setShowScannerModal(false);
                setScanDeductId('');
              }} className="close-modal">&times;</span>
              <h2 className="text-lg font-display font-bold text-primary-900 dark:text-white border-b pb-3 mb-4 flex items-center gap-1.5">
                <Camera size={18} />
                Simulateur de douchette QR / Barcode
              </h2>
              <p className="text-xs text-primary-500 dark:text-primary-400 mb-4">
                Simulez la lecture d'un code-barres physique ou d'un QR code étiqueté sur le casier de stockage.
              </p>

              <div className="space-y-4">
                <div>
                  <label>Sélectionnez la pièce scannée :</label>
                  <select
                    value={scanDeductId}
                    onChange={e => setScanDeductId(e.target.value)}
                  >
                    <option value="">-- Présenter le code-barres --</option>
                    {[...pieces].sort((a, b) => a.designation.localeCompare(b.designation)).map(p => (
                      <option key={p.id} value={p.id}>[{p.codeBarre}] {p.designation}</option>
                    ))}
                  </select>
                </div>

                {scanDeductId && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-lg text-xs space-y-2"
                  >
                    <p><strong>Article reconnu :</strong> {pieces.find(x => x.id === scanDeductId)?.designation}</p>
                    <p><strong>Stock actuel :</strong> {pieces.find(x => x.id === scanDeductId)?.quantite} unités</p>
                    <p><strong>Emplacement :</strong> {pieces.find(x => x.id === scanDeductId)?.emplacement}</p>
                    
                    <div className="flex items-center gap-2 pt-2">
                      <label className="m-0">Prélèvement rapide :</label>
                      <input
                        type="number"
                        min={1}
                        value={scanDeductQty}
                        onChange={e => setScanDeductQty(Number(e.target.value))}
                        className="w-16 p-1 text-center font-bold"
                      />
                      <span>unités</span>
                    </div>

                    <button
                      onClick={handleQuickScannerCheckout}
                      className="btn-primary w-full justify-center mt-2"
                      style={{ backgroundColor: '#10B981' }}
                    >
                      Valider Sortie Rapide
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODE INVENTAIRE TOURNANT */}
      <AnimatePresence>
        {showInventaireModal && (
          <div className="modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content"
              style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            >
              <span onClick={() => setShowInventaireModal(false)} className="close-modal">&times;</span>
              <h2 className="text-lg font-display font-bold text-sky-600 border-b pb-3 mb-4 flex items-center gap-1.5">
                <ClipboardCheck size={18} />
                Mode Inventaire Tournant
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 items-end text-xs">
                <div>
                  <label>Rayon / Alvéole / Emplacement</label>
                  <input
                    type="text"
                    placeholder="Ex: Rayon A"
                    value={tournantEmp}
                    onChange={e => setTournantEmp(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label>Famille d'articles</label>
                    <select value={tournantFam} onChange={e => setTournantFam(e.target.value)}>
                      <option value="">Toutes</option>
                      {[...Object.keys(settings.listes.categories)].sort((a, b) => a.localeCompare(b)).map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={loadTournantList}
                    className="btn-primary"
                    style={{ backgroundColor: '#0284C7' }}
                  >
                    Charger
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto border border-primary-100 dark:border-primary-800 rounded-lg p-2 bg-primary-50/50">
                <table className="data-table w-full text-xs">
                  <thead>
                    <tr className="bg-white dark:bg-primary-900">
                      <th>Code / Réf</th>
                      <th>Désignation</th>
                      <th>Emplacement</th>
                      <th className="text-center">Stock Système</th>
                      <th className="text-center w-24">Physique Réel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournantItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-primary-400">
                          Configurez les filtres ci-dessus et cliquez sur "Charger" pour générer la feuille d'inventaire.
                        </td>
                      </tr>
                    ) : (
                      tournantItems.map(item => (
                        <tr key={item.id} className="hover:bg-primary-50 dark:hover:bg-primary-800 transition">
                          <td>{item.code}<br/><span className="text-[10px] text-primary-400">{item.ref}</span></td>
                          <td className="font-semibold">{item.nom}</td>
                          <td><span className="px-2 py-0.5 rounded font-mono bg-primary-200 dark:bg-primary-900 text-primary-800 dark:text-primary-300">{item.emp}</span></td>
                          <td className="text-center font-bold">{item.theo}</td>
                          <td className="text-center">
                            <input
                              type="number"
                              min={0}
                              value={item.phys}
                              onChange={e => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= 0) {
                                  setTournantItems(tournantItems.map(x => x.id === item.id ? { ...x, phys: val } : x));
                                }
                              }}
                              className="w-16 p-1 text-center font-bold"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center mt-4 border-t pt-4">
                <span className="text-[10px] text-primary-500 max-w-sm leading-relaxed">
                  💡 Les écarts entre le stock système théorique et vos comptes physiques réels généreront automatiquement des entrées ou sorties correctives.
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowInventaireModal(false)} className="btn-secondary">Annuler</button>
                  <button
                    onClick={handleSaveTournant}
                    disabled={tournantItems.length === 0}
                    className="btn-primary"
                    style={{ backgroundColor: '#10B981' }}
                  >
                    Valider Inventaire
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
export { KEYS } from '../data';
