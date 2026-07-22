import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  Send, 
  History, 
  Search, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  User, 
  MapPin, 
  Cpu, 
  Wrench, 
  ChevronRight, 
  X, 
  RefreshCw,
  TrendingUp,
  Flame,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Equipement, Intervention, GlobalSettings } from '../types';
import EquipmentTreeSelect from './EquipmentTreeSelect';

interface PortailAtelierDIProps {
  equipements: Equipement[];
  interventions: Intervention[];
  settings: GlobalSettings;
  onAddIntervention: (payload: Omit<Intervention, 'id' | 'dateCreation'>) => void;
}

export default function PortailAtelierDI({
  equipements,
  interventions,
  settings,
  onAddIntervention
}: PortailAtelierDIProps) {
  // Form state
  const [demandeur, setDemandeur] = useState('');
  const [selectedAtelier, setSelectedAtelier] = useState('');
  const [selectedEquipementId, setSelectedEquipementId] = useState('');
  const [typeProbleme, setTypeProbleme] = useState('');
  const [urgency, setUrgency] = useState('Moyenne (48h)');
  const [description, setDescription] = useState('');
  const [codeDefaut, setCodeDefaut] = useState('');
  
  // History list and modal states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  const [selectedDi, setSelectedDi] = useState<Intervention | null>(null);
  
  // UI States
  const [currentTime, setCurrentTime] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastSubmittedId, setLastSubmittedId] = useState('');

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter equipments by selected workshop
  const filteredEquipements = useMemo(() => {
    if (!selectedAtelier) return [];
    return equipements.filter(eq => eq.atelier === selectedAtelier);
  }, [selectedAtelier, equipements]);

  // When selected workshop changes, reset selected equipment
  useEffect(() => {
    setSelectedEquipementId('');
  }, [selectedAtelier]);

  // Filter and compute interventions for the workshop DI list (typeDoc === 'DI')
  const workshopDIs = useMemo(() => {
    return interventions.filter(int => int.typeDoc === 'DI');
  }, [interventions]);

  const stats = useMemo(() => {
    const total = workshopDIs.length;
    const pending = workshopDIs.filter(di => di.statut === 'En attente' || di.statut === 'Brouillon' || di.statut === 'En attente de validation').length;
    const inProgress = workshopDIs.filter(di => di.statut === 'En cours' || di.statut === 'En attente de pièce').length;
    const resolved = workshopDIs.filter(di => di.statut === 'Soldé' || di.statut === 'Clôturé' || di.statut === 'Terminé').length;
    return { total, pending, inProgress, resolved };
  }, [workshopDIs]);

  const filteredDIs = useMemo(() => {
    return workshopDIs.filter(di => {
      // Status filter
      if (statusFilter !== 'Tous') {
        if (statusFilter === 'Attente' && !['En attente', 'Brouillon', 'En attente de validation'].includes(di.statut)) return false;
        if (statusFilter === 'Cours' && !['En cours', 'En attente de pièce'].includes(di.statut)) return false;
        if (statusFilter === 'Resolues' && !['Soldé', 'Clôturé', 'Terminé'].includes(di.statut)) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          di.demandeur.toLowerCase().includes(query) ||
          di.equipementNom.toLowerCase().includes(query) ||
          di.description.toLowerCase().includes(query) ||
          (di.numero && di.numero.toLowerCase().includes(query))
        );
      }
      return true;
    }).sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());
  }, [workshopDIs, statusFilter, searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demandeur.trim() || !selectedAtelier || !selectedEquipementId || !typeProbleme || !description.trim()) {
      return;
    }

    setSubmitting(true);
    
    // Find selected equipment details
    const equip = equipements.find(eq => eq.id === selectedEquipementId);
    
    const payload = {
      typeDoc: 'DI' as const,
      numero: '',
      equipementId: selectedEquipementId,
      equipementNom: equip ? equip.nom : 'Inconnu',
      atelier: selectedAtelier,
      urgence: urgency,
      typeProbleme: typeProbleme,
      demandeur: demandeur.trim(),
      description: description.trim(),
      statut: 'En attente' as const,
      source: 'Portail Atelier DI',
      codeDefaut: codeDefaut.trim() || undefined
    };

    setTimeout(() => {
      onAddIntervention(payload);
      
      // Clear form
      setDescription('');
      setCodeDefaut('');
      
      // Trigger success screen/toast
      setSubmitting(false);
      setShowSuccessToast(true);
      
      // Auto-hide success toast after 4 seconds
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 5000);
    }, 800);
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'En attente':
      case 'Brouillon':
      case 'En attente de validation':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/20',
          text: 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50',
          label: 'Signalé (En attente)'
        };
      case 'En cours':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/20',
          text: 'text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50',
          label: 'En cours de dépannage'
        };
      case 'En attente de pièce':
        return {
          bg: 'bg-purple-50 dark:bg-purple-950/20',
          text: 'text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/50',
          label: 'En attente de pièce'
        };
      case 'Soldé':
      case 'Clôturé':
      case 'Terminé':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/20',
          text: 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50',
          label: 'Problème Résolu'
        };
      default:
        return {
          bg: 'bg-primary-50 dark:bg-primary-950/20',
          text: 'text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-900/50',
          label: status
        };
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-primary-950 text-primary-900 dark:text-primary-100 flex flex-col font-sans">
      {/* HEADER BAR */}
      <header className="bg-primary-900 text-white px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-primary-950 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-accent-orange p-2 rounded-xl text-white shadow-inner flex items-center justify-center">
            <ClipboardList size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-lg tracking-tight">GMAO PRO</h1>
              <span className="bg-primary-800 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full text-accent-orange border border-primary-700">
                Portail Atelier
              </span>
            </div>
            <p className="text-xs text-primary-300">Terminal d'auto-signalement des anomalies et pannes</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-primary-200 bg-primary-950/50 px-4 py-2 rounded-xl border border-primary-800/80">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-accent-orange animate-pulse" />
            <span>
              {currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
            </span>
            <span className="text-white font-extrabold">
              {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] uppercase bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-800/40 font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Connexion Active
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* LEFT COLUMN: THE SUBMISSION FORM (7 COLS) */}
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-primary-900 rounded-3xl p-6 md:p-8 border border-primary-200 dark:border-primary-850 shadow-xl relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-[0.02] pointer-events-none">
              <ClipboardList size={280} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <span className="h-2 w-2 rounded-full bg-accent-orange"></span>
                <h2 className="font-display font-bold text-lg text-primary-900 dark:text-white">
                  Déclarer une Anomalie
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* DEMANDEUR */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-primary-500 dark:text-primary-400 mb-2 flex items-center gap-1.5">
                    <User size={12} className="text-primary-400" />
                    Demandeur / Opérateur <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={demandeur}
                    onChange={(e) => setDemandeur(e.target.value)}
                    placeholder="Saisissez votre Prénom Nom ou matricule"
                    className="w-full px-4 py-3 rounded-xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 text-sm text-primary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-orange/40 focus:border-accent-orange transition"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ATELIER */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-primary-500 dark:text-primary-400 mb-2 flex items-center gap-1.5">
                      <MapPin size={12} className="text-primary-400" />
                      Atelier / Zone d'impact <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={selectedAtelier}
                      onChange={(e) => setSelectedAtelier(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 text-sm text-primary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-orange/40 focus:border-accent-orange transition cursor-pointer"
                    >
                      <option value="">-- Sélectionner l'atelier --</option>
                      {[...(settings?.listes?.ateliers || [])].sort((a,b) => a.localeCompare(b)).map(at => (
                        <option key={at} value={at}>{at}</option>
                      ))}
                    </select>
                  </div>

                  {/* EQUIPEMENT */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-primary-500 dark:text-primary-400 mb-2 flex items-center gap-1.5">
                      <Cpu size={12} className="text-primary-400" />
                      Équipement défectueux <span className="text-red-500">*</span>
                    </label>
                    <EquipmentTreeSelect
                      equipements={equipements}
                      selectedId={selectedEquipementId}
                      onSelect={setSelectedEquipementId}
                      required
                      disabled={!selectedAtelier}
                      atelierFilter={selectedAtelier}
                      placeholder={!selectedAtelier ? "Veuillez d'abord choisir un atelier" : "Choisir l'équipement dans l'arborescence..."}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* TYPE DE PROBLEME */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-primary-500 dark:text-primary-400 mb-2 flex items-center gap-1.5">
                      <Wrench size={12} className="text-primary-400" />
                      Type de problème <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={typeProbleme}
                      onChange={(e) => setTypeProbleme(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 text-sm text-primary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-orange/40 focus:border-accent-orange transition cursor-pointer"
                    >
                      <option value="">-- Sélectionner --</option>
                      {[...(settings?.listes?.metiers || ['Mécanique', 'Électricité', 'Automatisme', 'Pneumatique', 'Hydraulique'])].sort((a,b) => a.localeCompare(b)).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                      <option value="Autre">Autre anomalie générale</option>
                    </select>
                  </div>

                  {/* DEGRÉ D'URGENCE */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-primary-500 dark:text-primary-400 mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={12} className="text-primary-400" />
                      Urgence estimée <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={urgency}
                        onChange={(e) => setUrgency(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 text-sm text-primary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-orange/40 focus:border-accent-orange transition cursor-pointer"
                      >
                        {[...(settings?.listes?.urgences || ["Faible (Semaine)", "Moyenne (48h)", "Haute (24h)", "Critique (Arrêt Machine)"])].sort((a,b) => a.localeCompare(b)).map(urg => (
                          <option key={urg} value={urg}>{urg}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* CODE DEFAUT / CODE ERREUR */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-primary-500 dark:text-primary-400 mb-2 flex items-center gap-1.5">
                    <AlertCircle size={12} className="text-red-500" />
                    Code défaut ou Code erreur (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={codeDefaut}
                    onChange={(e) => setCodeDefaut(e.target.value.toUpperCase())}
                    placeholder="Ex: E102, ERR_04, ALARM_HIGH, OVERTEMP..."
                    className="w-full px-4 py-3 rounded-xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 text-sm text-primary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-orange/40 focus:border-accent-orange transition"
                  />
                  <p className="text-[10px] text-primary-400 mt-1">
                    Permet d'accélérer le diagnostic technique et d'associer la panne à un code d'erreur de la machine.
                  </p>
                </div>

                {/* DESCRIPTION */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-primary-500 dark:text-primary-400 mb-2">
                    Description de la panne ou du défaut constaté <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez précisément les symptômes. (Ex : Fuite d'huile importante sous le carter, fumée suspecte, bruit anormal lors des phases de rotation...)"
                    className="w-full px-4 py-3 rounded-xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 text-sm text-primary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-orange/40 focus:border-accent-orange transition resize-none"
                  />
                  <div className="flex justify-between items-center mt-1.5 text-[11px] text-primary-400 font-bold">
                    <span>Décrivez de manière objective et succincte</span>
                    <span>{description.length} caractères</span>
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-accent-orange hover:bg-opacity-90 active:bg-opacity-95 text-white font-bold text-sm py-4 rounded-xl shadow-lg hover:shadow-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Transmission en cours...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Envoyer le signalement d'intervention</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: RECENT DI LIST & STATUS MONITOR (5 COLS) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          {/* STATS TILES */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-850 p-3.5 rounded-2xl flex flex-col items-center text-center shadow-sm">
              <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider mb-1">Signalés</span>
              <span className="text-xl font-display font-black text-amber-500">{stats.pending}</span>
            </div>
            <div className="bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-850 p-3.5 rounded-2xl flex flex-col items-center text-center shadow-sm">
              <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider mb-1">En Cours</span>
              <span className="text-xl font-display font-black text-blue-500">{stats.inProgress}</span>
            </div>
            <div className="bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-850 p-3.5 rounded-2xl flex flex-col items-center text-center shadow-sm">
              <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider mb-1">Résolus</span>
              <span className="text-xl font-display font-black text-emerald-500">{stats.resolved}</span>
            </div>
          </div>

          {/* LIST BOX */}
          <div className="bg-white dark:bg-primary-900 rounded-3xl border border-primary-200 dark:border-primary-850 shadow-xl p-5 md:p-6 flex-1 flex flex-col min-h-[450px]">
            <div className="flex items-center gap-2 mb-4">
              <History size={18} className="text-primary-500" />
              <h3 className="font-display font-bold text-base text-primary-900 dark:text-white">
                Historique des Signalements
              </h3>
            </div>

            {/* SEARCH AND FILTERS */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" size={14} />
                <input
                  type="text"
                  placeholder="Rechercher par demandeur, machine..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-xl text-xs text-primary-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-accent-orange"
                />
              </div>

              {/* Status toggle tabs */}
              <div className="flex bg-primary-100/50 dark:bg-primary-950/60 p-1 rounded-xl text-[10px] font-bold">
                {[
                  { id: 'Tous', label: 'Tous' },
                  { id: 'Attente', label: 'En attente' },
                  { id: 'Cours', label: 'En cours' },
                  { id: 'Resolues', label: 'Résolus' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${statusFilter === tab.id ? 'bg-white dark:bg-primary-850 text-accent-orange shadow-xs' : 'text-primary-500 dark:text-primary-400 hover:text-primary-700'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* LIVE FEED LIST */}
            <div className="flex-1 overflow-y-auto max-h-[380px] lg:max-h-[500px] pr-1 divide-y divide-primary-100 dark:divide-primary-800/60">
              {filteredDIs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-12 text-center text-primary-400">
                  <ClipboardList size={36} className="opacity-30 mb-2 animate-pulse" />
                  <p className="text-xs italic">Aucun signalement trouvé</p>
                </div>
              ) : (
                filteredDIs.map(di => {
                  const badge = getStatusBadgeStyles(di.statut);
                  return (
                    <button
                      key={di.id}
                      onClick={() => setSelectedDi(di)}
                      className="w-full py-3.5 text-left flex items-start gap-3 hover:bg-primary-50/50 dark:hover:bg-primary-850/20 px-2 rounded-xl transition duration-150"
                    >
                      <div className="mt-1 flex-shrink-0">
                        {di.urgence.includes('Critique') || di.urgence.includes('Haute') ? (
                          <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-primary-300 dark:bg-primary-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono text-[10px] text-primary-400 font-bold uppercase truncate">
                            {di.numero || "DI-ATELIER"}
                          </span>
                          <span className="text-[9px] text-primary-400">
                            {new Date(di.dateCreation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 className="font-semibold text-xs text-primary-800 dark:text-white truncate">
                          {di.equipementNom}
                        </h4>
                        <p className="text-[11px] text-primary-500 dark:text-primary-400 truncate mt-0.5">
                          {di.description}
                        </p>
                        <div className="flex items-center justify-between gap-2 mt-2">
                          <span className="text-[10px] text-primary-400 font-medium truncate">
                            Par : {di.demandeur}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-primary-300 self-center" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-primary-900 text-primary-400 text-[10px] text-center py-4 border-t border-primary-950 font-bold shrink-0">
        <p>GMAO-PRO • Système d'assistance en production industriel • Terminal Atelier DI</p>
      </footer>

      {/* DETAIL DRAWER / POPUP MODAL */}
      <AnimatePresence>
        {selectedDi && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-primary-900 rounded-3xl w-full max-w-lg border border-primary-200 dark:border-primary-800 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal header */}
              <div className="p-5 bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-850 dark:to-primary-900 border-b border-primary-100 dark:border-primary-800 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-mono tracking-widest text-primary-400 font-bold block mb-0.5">
                    Fiche du Ticket
                  </span>
                  <h3 className="font-display font-bold text-sm text-primary-900 dark:text-white flex items-center gap-1.5">
                    {selectedDi.numero || "DI-ATELIER"}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedDi(null)}
                  className="p-1 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800 text-primary-500 dark:text-primary-400 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal scrollable content */}
              <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] text-xs">
                {/* Status bar */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-800">
                  <div className="space-y-1">
                    <span className="text-[9px] text-primary-400 font-bold uppercase tracking-wider block">Statut Actuel</span>
                    <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${getStatusBadgeStyles(selectedDi.statut).bg} ${getStatusBadgeStyles(selectedDi.statut).text}`}>
                      {getStatusBadgeStyles(selectedDi.statut).label}
                    </span>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="text-[9px] text-primary-400 font-bold uppercase tracking-wider block">Niveau d'Urgence</span>
                    <span className={`text-[10px] font-bold ${selectedDi.urgence.includes('Critique') || selectedDi.urgence.includes('Haute') ? 'text-rose-500' : 'text-primary-500'}`}>
                      {selectedDi.urgence}
                    </span>
                  </div>
                </div>

                {/* Details list */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-primary-400 font-bold uppercase text-[9px] block mb-1">Date d'émission</span>
                    <span className="font-medium text-primary-800 dark:text-white">
                      {new Date(selectedDi.dateCreation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {" à "}
                      {new Date(selectedDi.dateCreation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-primary-400 font-bold uppercase text-[9px] block mb-1">Demandeur</span>
                    <span className="font-medium text-primary-800 dark:text-white">{selectedDi.demandeur}</span>
                  </div>
                  <div>
                    <span className="text-primary-400 font-bold uppercase text-[9px] block mb-1">Atelier</span>
                    <span className="font-medium text-primary-800 dark:text-white">{selectedDi.atelier}</span>
                  </div>
                  <div>
                    <span className="text-primary-400 font-bold uppercase text-[9px] block mb-1">Type Panne</span>
                    <span className="font-medium text-primary-800 dark:text-white">{selectedDi.typeProbleme}</span>
                  </div>
                  {selectedDi.codeDefaut && (
                    <div>
                      <span className="text-primary-400 font-bold uppercase text-[9px] block mb-1">Code défaut / erreur</span>
                      <span className="inline-block px-2.5 py-0.5 rounded-lg bg-red-100/50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 font-mono font-bold text-xs uppercase">
                        {selectedDi.codeDefaut}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-primary-400 font-bold uppercase text-[9px] block mb-1">Équipement concerné</span>
                  <div className="p-3 bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-800/60 rounded-xl font-bold text-primary-900 dark:text-white">
                    {selectedDi.equipementNom}
                  </div>
                </div>

                <div>
                  <span className="text-primary-400 font-bold uppercase text-[9px] block mb-1">Symptômes déclarés</span>
                  <p className="bg-primary-50 dark:bg-primary-950/40 p-4 rounded-xl border border-primary-100 dark:border-primary-800 text-primary-700 dark:text-primary-300 leading-relaxed italic">
                    "{selectedDi.description}"
                  </p>
                </div>

                {/* Technical report or schedule if available */}
                {(selectedDi.datePrevue || selectedDi.compteRendu || selectedDi.technicienCloture) && (
                  <div className="border-t border-primary-100 dark:border-primary-800/80 pt-4 space-y-3.5">
                    <h4 className="font-display font-bold text-xs text-primary-800 dark:text-white flex items-center gap-1.5">
                      <Wrench size={14} className="text-accent-orange" />
                      Suivi technique de l'intervention
                    </h4>

                    {selectedDi.datePrevue && (
                      <div>
                        <span className="text-primary-400 font-bold uppercase text-[9px] block mb-1">Intervention planifiée le</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                          {new Date(selectedDi.datePrevue).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    )}

                    {selectedDi.compteRendu && (
                      <div>
                        <span className="text-primary-400 font-bold uppercase text-[9px] block mb-1">Compte-rendu du technicien</span>
                        <p className="bg-emerald-50/40 dark:bg-emerald-950/10 p-3 rounded-xl border border-emerald-100/60 dark:border-emerald-900/20 text-emerald-800 dark:text-emerald-300 leading-relaxed">
                          {selectedDi.compteRendu}
                        </p>
                      </div>
                    )}

                    {selectedDi.technicienCloture && (
                      <div className="flex justify-between items-center text-[10px] text-primary-400 font-bold pt-1">
                        <span>Technicien assigné : {selectedDi.technicienCloture}</span>
                        {selectedDi.tempsPasse && <span>Temps passé : {selectedDi.tempsPasse}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Close footer button */}
              <div className="bg-primary-50/50 dark:bg-primary-950/20 px-5 py-4 border-t border-primary-100 dark:border-primary-800 flex justify-end">
                <button
                  onClick={() => setSelectedDi(null)}
                  className="bg-primary-200 hover:bg-primary-300 dark:bg-primary-800 dark:hover:bg-primary-750 text-primary-800 dark:text-white font-bold text-[11px] px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUCCESS TOAST WITH ANIMATION */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-emerald-600 dark:bg-emerald-700 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500 max-w-sm"
          >
            <div className="bg-white/20 p-2 rounded-xl text-white">
              <CheckCircle size={20} />
            </div>
            <div>
              <h5 className="font-bold text-xs">Signalement Envoyé !</h5>
              <p className="text-[10px] text-emerald-100 mt-0.5">La demande d'intervention a été enregistrée avec succès.</p>
            </div>
            <button
              onClick={() => setShowSuccessToast(false)}
              className="text-white/70 hover:text-white ml-auto"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
