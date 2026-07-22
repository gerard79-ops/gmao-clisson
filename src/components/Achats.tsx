/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Fournisseur,
  Commande,
  GlobalSettings,
  Equipement,
  Budget
} from '../types';
import { ModuleHelp } from './ModuleHelp';
import {
  ShoppingBag,
  Handshake,
  Search,
  FileSpreadsheet,
  FileText,
  Building,
  DollarSign,
  Phone,
  Mail,
  ExternalLink,
  Plus,
  Trash2,
  FileCheck,
  Globe,
  Coins,
  Eye,
  ArrowLeft,
  PenTool,
  Upload,
  Download
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface AchatsProps {
  suppliers: Fournisseur[];
  commandes: Commande[];
  settings: GlobalSettings;
  equipements: Equipement[];
  budgets: Budget[];
  onAddSupplier: (payload: Omit<Fournisseur, 'id'>) => void;
  onEditSupplier: (id: string, payload: Partial<Fournisseur>) => void;
  onDeleteSupplier: (id: string) => void;
  onAddCommande: (payload: Omit<Commande, 'id' | 'dateCreation'>) => void;
  onAddBudget: (payload: Omit<Budget, 'id'>) => void;
  onEditBudget: (id: string, payload: Partial<Budget>) => void;
  onDeleteBudget: (id: string) => void;
  userRole?: string;
}

export default function Achats({
  suppliers,
  commandes,
  settings,
  equipements,
  budgets,
  onAddSupplier,
  onEditSupplier,
  onDeleteSupplier,
  onAddCommande,
  onAddBudget,
  onEditBudget,
  onDeleteBudget,
  userRole
}: AchatsProps) {
  const [activeTab, setActiveTab] = useState<'commandes' | 'partenaires' | 'budgets'>('commandes');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  // Budget Form States
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  const [budgetAnnee, setBudgetAnnee] = useState<number>(2026);
  const [budgetAtelier, setBudgetAtelier] = useState<string>('');
  const [budgetEnveloppe, setBudgetEnveloppe] = useState<number>(0);
  const [budgetDesc, setBudgetDesc] = useState<string>('');

  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Form states suppliers
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Supplier Form States
  const [formNom, setFormNom] = useState('');
  const [formType, setFormType] = useState<'Fournisseur' | 'Sous-traitant'>('Fournisseur');
  const [formMetier, setFormMetier] = useState('');
  const [formWeb, setFormWeb] = useState('');
  const [formTel, setFormTel] = useState('');
  const [formAdresse, setFormAdresse] = useState('');
  const [formCpVille, setFormCpVille] = useState('');
  const [formPays, setFormPays] = useState('');
  const [formC1Nom, setFormC1Nom] = useState('');
  const [formC1Fonc, setFormC1Fonc] = useState('');
  const [formC1Tel, setFormC1Tel] = useState('');
  const [formC1Email, setFormC1Email] = useState('');
  const [formC2Nom, setFormC2Nom] = useState('');
  const [formC2Fonc, setFormC2Fonc] = useState('');
  const [formC2Tel, setFormC2Tel] = useState('');
  const [formC2Email, setFormC2Email] = useState('');
  const [formPaiement, setFormPaiement] = useState('');
  const [formLivraison, setFormLivraison] = useState('');
  const [formTva, setFormTva] = useState('20');
  const [formDevise, setFormDevise] = useState('€');
  const [formObs, setFormObs] = useState('');
  const [formObsCmd, setFormObsCmd] = useState('');
  
  // Specific Subcontracting Form States
  const [formCoutMo, setFormCoutMo] = useState<number>(0);
  const [formCoutDep, setFormCoutDep] = useState<number>(0);
  const [formCatServices, setFormCatServices] = useState('');
  const [formContratActif, setFormContratActif] = useState(false);

  // Command Form States
  const [showCommandForm, setShowCommandForm] = useState(false);
  const [cmdSupplierId, setCmdSupplierId] = useState('');
  const [cmdAtelier, setCmdAtelier] = useState('');
  const [cmdDemandeur, setCmdDemandeur] = useState('');
  const [cmdMontant, setCmdMontant] = useState<number>(0);
  const [cmdDesc, setCmdDesc] = useState('');

  // Suppliers list filter
  const [supplierSearch, setSupplierSupplierSearch] = useState('');
  const [supplierFilterType, setSupplierFilterType] = useState('Tous');
  const [importTargetType, setImportTargetType] = useState<'Fournisseur' | 'Sous-traitant'>('Sous-traitant');

  const importInputRef = React.useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): string[][] => {
    const firstLine = text.split('\n')[0] || '';
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    const rows: string[][] = [];
    let row: string[] = [];
    let currentVal = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentVal += '"';
            i++; // skip next quote
          } else {
            inQuotes = false;
          }
        } else {
          currentVal += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === delimiter) {
          row.push(currentVal.trim());
          currentVal = '';
        } else if (char === '\r' || char === '\n') {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          row.push(currentVal.trim());
          rows.push(row);
          row = [];
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
    }
    if (currentVal || row.length > 0) {
      row.push(currentVal.trim());
      rows.push(row);
    }
    return rows.filter(r => r.length > 0 && r.some(cell => cell !== ''));
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const matrix = parseCSV(text);
      if (matrix.length < 2) {
        alert("Le fichier CSV est vide ou ne contient pas de données.");
        return;
      }

      const rawHeaders = matrix[0].map(h => h.trim().toLowerCase());
      
      const findIndex = (aliases: string[]) => {
        return rawHeaders.findIndex(h => aliases.includes(h.replace(/_/g, '').replace(/ /g, '')));
      };

      const idxNom = findIndex(['nom', 'name', 'societe', 'entreprise']);
      const idxType = findIndex(['type', 'categorie', 'category', 'nature']);
      const idxMetier = findIndex(['metier', 'profession', 'specialite', 'activite']);
      const idxWeb = findIndex(['web', 'site', 'siteweb', 'website']);
      const idxTel = findIndex(['telephone', 'tel', 'telfax', 'phone']);
      const idxAdresse = findIndex(['adresse', 'address']);
      const idxCpVille = findIndex(['cpville', 'ville', 'city', 'codepostal', 'zipcode']);
      const idxPays = findIndex(['pays', 'country']);
      const idxC1Nom = findIndex(['contact1nom', 'c1nom', 'contactnom', 'interlocuteur']);
      const idxC1Fonc = findIndex(['contact1fonction', 'c1fonc', 'contactfonction']);
      const idxC1Tel = findIndex(['contact1tel', 'c1tel', 'contacttel']);
      const idxC1Email = findIndex(['contact1email', 'c1email', 'contactemail', 'email']);
      const idxC2Nom = findIndex(['contact2nom', 'c2nom']);
      const idxC2Fonc = findIndex(['contact2fonction', 'c2fonc']);
      const idxC2Tel = findIndex(['contact2tel', 'c2tel']);
      const idxC2Email = findIndex(['contact2email', 'c2email']);
      const idxPaiement = findIndex(['paiement', 'conditionsdepaiement', 'payment']);
      const idxLivraison = findIndex(['livraison', 'delivery']);
      const idxTVA = findIndex(['tva', 'vat']);
      const idxDevise = findIndex(['devise', 'currency']);
      const idxObs = findIndex(['observations', 'obs', 'notes', 'commentaires']);
      const idxCoutMo = findIndex(['coutmo', 'tarifmo', 'hourlyrate']);
      const idxCoutDep = findIndex(['coutdeplacement', 'fraisdeplacement', 'travelcost']);
      const idxCatServices = findIndex(['catalogueservices', 'services']);
      const idxContratActif = findIndex(['contratactif', 'contrat', 'active']);

      if (idxNom === -1) {
        alert("La colonne 'Nom' est obligatoire dans le fichier CSV.");
        return;
      }

      let addedCount = 0;
      const dataRows = matrix.slice(1);

      dataRows.forEach(row => {
        if (!row[idxNom]) return;

        const nom = row[idxNom]?.trim() || '';
        if (!nom) return;

        const metier = idxMetier !== -1 ? (row[idxMetier] || '') : '';
        const web = idxWeb !== -1 ? (row[idxWeb] || '') : '';
        const telfax = idxTel !== -1 ? (row[idxTel] || '') : '';
        const adresse = idxAdresse !== -1 ? (row[idxAdresse] || '') : '';
        const cpville = idxCpVille !== -1 ? (row[idxCpVille] || '') : '';
        const pays = idxPays !== -1 ? (row[idxPays] || '') : 'France';
        
        const c1_nom = idxC1Nom !== -1 ? (row[idxC1Nom] || '') : '';
        const c1_fonc = idxC1Fonc !== -1 ? (row[idxC1Fonc] || '') : '';
        const c1_tel = idxC1Tel !== -1 ? (row[idxC1Tel] || '') : '';
        const c1_email = idxC1Email !== -1 ? (row[idxC1Email] || '') : '';

        const c2_nom = idxC2Nom !== -1 ? (row[idxC2Nom] || '') : '';
        const c2_fonc = idxC2Fonc !== -1 ? (row[idxC2Fonc] || '') : '';
        const c2_tel = idxC2Tel !== -1 ? (row[idxC2Tel] || '') : '';
        const c2_email = idxC2Email !== -1 ? (row[idxC2Email] || '') : '';

        const paiement = idxPaiement !== -1 ? (row[idxPaiement] || '') : '30 jours';
        const livraison = idxLivraison !== -1 ? (row[idxLivraison] || '') : '-';
        const tva = idxTVA !== -1 ? (row[idxTVA] || '20') : '20';
        const devise = idxDevise !== -1 ? (row[idxDevise] || '€') : '€';
        const obs = idxObs !== -1 ? (row[idxObs] || '') : '';
        
        const coutMOVal = idxCoutMo !== -1 ? Number(row[idxCoutMo]) : 0;
        const coutMO = isNaN(coutMOVal) ? 0 : coutMOVal;

        const coutDepVal = idxCoutDep !== -1 ? Number(row[idxCoutDep]) : 0;
        const coutDeplacement = isNaN(coutDepVal) ? 0 : coutDepVal;

        const catalogueServices = idxCatServices !== -1 ? (row[idxCatServices] || '') : '';
        
        const rawContrat = idxContratActif !== -1 ? (row[idxContratActif] || '').toLowerCase() : '';
        const contratActif = rawContrat === 'oui' || rawContrat === 'true' || rawContrat === 'yes' || rawContrat === '1';

        let resolvedType: 'Fournisseur' | 'Sous-traitant' = importTargetType;
        if (idxType !== -1 && row[idxType]) {
          const csvTypeVal = row[idxType].trim().toLowerCase();
          if (csvTypeVal.includes('fourn') || csvTypeVal.includes('supplier')) {
            resolvedType = 'Fournisseur';
          } else if (csvTypeVal.includes('sous') || csvTypeVal.includes('sub') || csvTypeVal.includes('traitant')) {
            resolvedType = 'Sous-traitant';
          }
        }

        const payload: Omit<Fournisseur, 'id'> = {
          nom,
          type: resolvedType,
          metier,
          web,
          telfax,
          adresse,
          cpville,
          pays,
          c1_nom,
          c1_fonc,
          c1_tel,
          c1_email,
          c2_nom,
          c2_fonc,
          c2_tel,
          c2_email,
          paiement,
          livraison,
          tva,
          devise,
          obs,
          obsCmd: '',
          coutMO,
          coutDeplacement,
          catalogueServices,
          contratActif
        };

        onAddSupplier(payload);
        addedCount++;
      });

      alert(`✅ Importation réussie : ${addedCount} partenaire(s) ajouté(s) au catalogue.`);
      e.target.value = '';
    };

    reader.readAsText(file, 'UTF-8');
  };

  const exportSubcontractorsToCSV = () => {
    const subcontractors = suppliers.filter(s => s.type === 'Sous-traitant');
    
    if (subcontractors.length === 0) {
      alert("Aucun sous-traitant à exporter.");
      return;
    }

    const headers = [
      'Nom',
      'Type',
      'Metier',
      'Web',
      'Telephone',
      'Adresse',
      'CpVille',
      'Pays',
      'Contact1_Nom',
      'Contact1_Fonction',
      'Contact1_Tel',
      'Contact1_Email',
      'Contact2_Nom',
      'Contact2_Fonction',
      'Contact2_Tel',
      'Contact2_Email',
      'Paiement',
      'Livraison',
      'TVA',
      'Devise',
      'Observations',
      'Cout_MO',
      'Cout_Deplacement',
      'Catalogue_Services',
      'Contrat_Actif'
    ];

    const escapeCSVValue = (val: any) => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      str = str.replace(/"/g, '""');
      if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str}"`;
      }
      return str;
    };

    const rows = subcontractors.map(s => [
      s.nom,
      s.type,
      s.metier,
      s.web,
      s.telfax,
      s.adresse,
      s.cpville,
      s.pays,
      s.c1_nom,
      s.c1_fonc,
      s.c1_tel,
      s.c1_email,
      s.c2_nom,
      s.c2_fonc,
      s.c2_tel,
      s.c2_email,
      s.paiement,
      s.livraison,
      s.tva,
      s.devise,
      s.obs,
      s.coutMO ?? '',
      s.coutDeplacement ?? '',
      s.catalogueServices ?? '',
      s.contratActif ? 'Oui' : 'Non'
    ]);

    const csvContent = [
      headers.map(escapeCSVValue).join(';'),
      ...rows.map(row => row.map(escapeCSVValue).join(';'))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `export_sous_traitants_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSuppliersToCSV = () => {
    const coreSuppliers = suppliers.filter(s => s.type === 'Fournisseur');
    
    if (coreSuppliers.length === 0) {
      alert("Aucun fournisseur à exporter.");
      return;
    }

    const headers = [
      'Nom',
      'Type',
      'Metier',
      'Web',
      'Telephone',
      'Adresse',
      'CpVille',
      'Pays',
      'Contact1_Nom',
      'Contact1_Fonction',
      'Contact1_Tel',
      'Contact1_Email',
      'Contact2_Nom',
      'Contact2_Fonction',
      'Contact2_Tel',
      'Contact2_Email',
      'Paiement',
      'Livraison',
      'TVA',
      'Devise',
      'Observations'
    ];

    const escapeCSVValue = (val: any) => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      str = str.replace(/"/g, '""');
      if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str}"`;
      }
      return str;
    };

    const rows = coreSuppliers.map(s => [
      s.nom,
      s.type,
      s.metier,
      s.web,
      s.telfax,
      s.adresse,
      s.cpville,
      s.pays,
      s.c1_nom,
      s.c1_fonc,
      s.c1_tel,
      s.c1_email,
      s.c2_nom,
      s.c2_fonc,
      s.c2_tel,
      s.c2_email,
      s.paiement,
      s.livraison,
      s.tva,
      s.devise,
      s.obs
    ]);

    const csvContent = [
      headers.map(escapeCSVValue).join(';'),
      ...rows.map(row => row.map(escapeCSVValue).join(';'))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `export_fournisseurs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadImportTemplateCSV = () => {
    const headers = [
      'Nom',
      'Type',
      'Metier',
      'Web',
      'Telephone',
      'Adresse',
      'CpVille',
      'Pays',
      'Contact1_Nom',
      'Contact1_Fonction',
      'Contact1_Tel',
      'Contact1_Email',
      'Contact2_Nom',
      'Contact2_Fonction',
      'Contact2_Tel',
      'Contact2_Email',
      'Paiement',
      'Livraison',
      'TVA',
      'Devise',
      'Observations',
      'Cout_MO',
      'Cout_Deplacement',
      'Catalogue_Services',
      'Contrat_Actif'
    ];
    
    const sampleRows = [
      ['ACME Sous-traitance', 'Sous-traitant', 'Electricite', 'https://acme.example.com', '0102030405', '12 Rue de la Paix', '75001 Paris', 'France', 'Jean Dupont', 'Directeur technique', '0601020304', 'jean.dupont@acme.example.com', 'Marie Martin', 'Responsable planning', '0602030405', 'marie.martin@acme.example.com', '30 jours', 'FR', 'FR123456789', '€', 'Specialiste automatismes', '65', '40', 'Maintenance automate PLC, Câblage armoires', 'Oui'],
      ['BatiElec SAS', 'Sous-traitant', 'Cablage', 'https://batielec.example.com', '0203040506', '45 Boulevard Industriel', '69002 Lyon', 'France', 'Pierre Durand', 'Chef de projet', '0611223344', 'p.durand@batielec.example.com', '', '', '', '', '45 jours fin de mois', 'FR', 'FR987654321', '€', 'Certifie Qualifelec', '55', '30', 'Tirage de câbles, Raccordements industriels', 'Non'],
      ['Fournitures Indusprix', 'Fournisseur', 'Consommables', 'https://indusprix.example.com', '0304050607', '78 Rue de la Gare', '33000 Bordeaux', 'France', 'Alain Proviste', 'Commercial', '0612345678', 'alain@indusprix.example.com', '', '', '', '', '60 jours', 'FR', 'FR555666777', '€', 'Distributeur de visserie et composants', '', '', '', '']
    ];

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
      ...sampleRows.map(row => row.map(escapeCSVValue).join(';'))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gabarit_import_partenaires.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedSup = suppliers.find(s => s.id === selectedSupplierId);

  // KPI total spending
  const totalPOExpenses = commandes.reduce((sum, c) => sum + (c.montant || 0), 0);

  // Suppliers filter handler
  const getFilteredSuppliers = () => {
    return suppliers.filter(s => {
      if (supplierFilterType !== 'Tous' && s.type !== supplierFilterType) return false;
      if (supplierSearch) {
        const text = supplierSearch.toLowerCase();
        return (
          s.nom.toLowerCase().includes(text) ||
          s.metier.toLowerCase().includes(text) ||
          s.cpville.toLowerCase().includes(text)
        );
      }
      return true;
    }).sort((a, b) => a.nom.localeCompare(b.nom));
  };

  const filteredSuppliers = getFilteredSuppliers();

  // Create or Edit Supplier Submit
  const handleSubmitSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Omit<Fournisseur, 'id'> = {
      nom: formNom,
      type: formType,
      metier: formMetier || '-',
      web: formWeb || '-',
      telfax: formTel || '-',
      adresse: formAdresse || '-',
      cpville: formCpVille || '-',
      pays: formPays || '-',
      c1_nom: formC1Nom || '-',
      c1_fonc: formC1Fonc || '-',
      c1_tel: formC1Tel || '-',
      c1_email: formC1Email || '-',
      c2_nom: formC2Nom || '-',
      c2_fonc: formC2Fonc || '-',
      c2_tel: formC2Tel || '-',
      c2_email: formC2Email || '-',
      paiement: formPaiement || '-',
      livraison: formLivraison || '-',
      tva: formTva || '20',
      devise: formDevise || '€',
      obs: formObs || '',
      obsCmd: formObsCmd || '',
      coutMO: formType === 'Sous-traitant' ? Number(formCoutMo) : undefined,
      coutDeplacement: formType === 'Sous-traitant' ? Number(formCoutDep) : undefined,
      catalogueServices: formType === 'Sous-traitant' ? formCatServices : undefined,
      contratActif: formType === 'Sous-traitant' ? formContratActif : undefined,
      contratPdfUrl: formType === 'Sous-traitant' && formContratActif ? "data:application/pdf;base64,JVBERi0xLjQK..." : undefined
    };

    if (isEditing && selectedSupplierId) {
      onEditSupplier(selectedSupplierId, payload);
    } else {
      onAddSupplier(payload);
    }

    setShowSupplierForm(false);
    setSelectedSupplierId(null);
  };

  const handleStartEdit = () => {
    if (!selectedSup) return;
    setFormNom(selectedSup.nom);
    setFormType(selectedSup.type);
    setFormMetier(selectedSup.metier || '');
    setFormWeb(selectedSup.web || '');
    setFormTel(selectedSup.telfax || '');
    setFormAdresse(selectedSup.adresse || '');
    setFormCpVille(selectedSup.cpville || '');
    setFormPays(selectedSup.pays || '');
    setFormC1Nom(selectedSup.c1_nom || '');
    setFormC1Fonc(selectedSup.c1_fonc || '');
    setFormC1Tel(selectedSup.c1_tel || '');
    setFormC1Email(selectedSup.c1_email || '');
    setFormC2Nom(selectedSup.c2_nom || '');
    setFormC2Fonc(selectedSup.c2_fonc || '');
    setFormC2Tel(selectedSup.c2_tel || '');
    setFormC2Email(selectedSup.c2_email || '');
    setFormPaiement(selectedSup.paiement || '');
    setFormLivraison(selectedSup.livraison || '');
    setFormTva(selectedSup.tva || '20');
    setFormDevise(selectedSup.devise || '€');
    setFormObs(selectedSup.obs || '');
    setFormObsCmd(selectedSup.obsCmd || '');
    setFormCoutMo(selectedSup.coutMO || 0);
    setFormCoutDep(selectedSup.coutDeplacement || 0);
    setFormCatServices(selectedSup.catalogueServices || '');
    setFormContratActif(selectedSup.contratActif || false);

    setIsEditing(true);
    setShowSupplierForm(true);
  };

  const handleStartCreate = () => {
    setFormNom('');
    setFormType('Fournisseur');
    setFormMetier('');
    setFormWeb('');
    setFormTel('');
    setFormAdresse('');
    setFormCpVille('');
    setFormPays('');
    setFormC1Nom('');
    setFormC1Fonc('');
    setFormC1Tel('');
    setFormC1Email('');
    setFormC2Nom('');
    setFormC2Fonc('');
    setFormC2Tel('');
    setFormC2Email('');
    setFormPaiement('');
    setFormLivraison('');
    setFormTva('20');
    setFormDevise('€');
    setFormObs('');
    setFormObsCmd('');
    setFormCoutMo(0);
    setFormCoutDep(0);
    setFormCatServices('');
    setFormContratActif(false);

    setIsEditing(false);
    setShowSupplierForm(true);
  };

  const handleDeleteSupplier = () => {
    if (userRole === 'Technicien') {
      alert("🔐 Accès refusé : Seul un Manager est autorisé à supprimer des partenaires/fournisseurs.");
      return;
    }
    if (!selectedSupplierId) return;
    if (confirm("⚠️ Êtes-vous sûr de vouloir supprimer définitivement ce partenaire du catalogue ? Cette action annulera l'affectation sur le stock.")) {
      onDeleteSupplier(selectedSupplierId);
      setSelectedSupplierId(null);
    }
  };

  // Budget management handlers
  const handleStartCreateBudget = () => {
    setBudgetAnnee(selectedYear);
    setBudgetAtelier(settings.listes.ateliers[0] || '');
    setBudgetEnveloppe(0);
    setBudgetDesc('');
    setIsEditingBudget(false);
    setShowBudgetForm(true);
  };

  const handleStartEditBudget = (b: Budget) => {
    setSelectedBudgetId(b.id);
    setBudgetAnnee(b.annee);
    setBudgetAtelier(b.atelier);
    setBudgetEnveloppe(b.enveloppe);
    setBudgetDesc(b.description || '');
    setIsEditingBudget(true);
    setShowBudgetForm(true);
  };

  const handleSubmitBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      annee: Number(budgetAnnee),
      atelier: budgetAtelier,
      enveloppe: Number(budgetEnveloppe),
      description: budgetDesc
    };

    if (isEditingBudget && selectedBudgetId) {
      onEditBudget(selectedBudgetId, payload);
    } else {
      onAddBudget(payload);
    }
    setShowBudgetForm(false);
  };

  const handleDeleteBudget = (id: string) => {
    if (userRole === 'Technicien') {
      alert("🔐 Accès refusé : Seul un Manager est autorisé à supprimer des enveloppes budgétaires.");
      return;
    }
    if (confirm("⚠️ Êtes-vous sûr de vouloir supprimer cette enveloppe budgétaire ?")) {
      onDeleteBudget(id);
    }
  };

  const getExpensesByWorkshopAndYear = (workshop: string, year: number) => {
    return commandes
      .filter(c => {
        const cmdYear = new Date(c.dateCreation).getFullYear();
        return cmdYear === year && c.atelier === workshop;
      })
      .reduce((sum, c) => sum + (c.montant || 0), 0);
  };

  // Submit purchase order (PO)
  const handleSubmitCommande = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find(x => x.id === cmdSupplierId);
    if (!sup) return;

    const num = `CMD-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    onAddCommande({
      numero: num,
      fournisseurId: cmdSupplierId,
      fournisseurNom: sup.nom,
      atelier: cmdAtelier,
      demandeur: cmdDemandeur,
      montant: Number(cmdMontant),
      description: cmdDesc,
      statut: "En attente"
    });

    setShowCommandForm(false);
    setCmdSupplierId('');
    setCmdAtelier('');
    setCmdDemandeur('');
    setCmdMontant(0);
    setCmdDesc('');
    alert(`Bon de commande ${num} généré avec succès !`);
  };

  // Simulated reports download
  const handleExportData = (dataset: string) => {
    alert(`📥 Rapport "${dataset}" exporté avec succès.`);
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary-900 dark:text-white flex items-center">
            Achats & Sous-traitance
            <ModuleHelp moduleId="achats" />
          </h1>
          <p className="text-sm text-primary-500 dark:text-primary-400 mt-1">
            Gérez vos commandes, fournisseurs agréés et contrats cadres de sous-traitance.
          </p>
        </div>

        {activeTab === 'commandes' ? (
          <button
            onClick={() => {
              setCmdSupplierId(suppliers[0]?.id || '');
              setCmdAtelier(settings.listes.ateliers[0] || '');
              setCmdDemandeur('Jean Dupont (Admin)');
              setShowCommandForm(true);
            }}
            className="btn-primary"
            style={{ backgroundColor: '#10B981' }}
          >
            <ShoppingBag size={16} />
            Nouvelle Commande
          </button>
        ) : activeTab === 'partenaires' ? (
          <button
            onClick={handleStartCreate}
            className="btn-primary"
            style={{ backgroundColor: '#3B82F6' }}
          >
            <Plus size={16} />
            Nouveau Partenaire
          </button>
        ) : (
          <button
            onClick={handleStartCreateBudget}
            className="btn-primary"
            style={{ backgroundColor: '#F97316' }}
          >
            <Plus size={16} />
            Allouer Budget
          </button>
        )}
      </div>

      {/* MODULE TABS */}
      <div className="flex items-center gap-4 border-b border-primary-200 dark:border-primary-700">
        <button
          onClick={() => setActiveTab('commandes')}
          className={`px-4 py-2 font-display text-sm font-bold border-b-2 transition ${activeTab === 'commandes' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-400 hover:text-primary-600'}`}
        >
          Bons de Commande
        </button>
        <button
          onClick={() => {
            setActiveTab('partenaires');
            setSelectedSupplierId(null);
          }}
          className={`px-4 py-2 font-display text-sm font-bold border-b-2 transition ${activeTab === 'partenaires' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-400 hover:text-primary-600'}`}
        >
          Catalogue Sous-traitants & Fournisseurs
        </button>
        <button
          onClick={() => {
            setActiveTab('budgets');
            setSelectedSupplierId(null);
          }}
          className={`px-4 py-2 font-display text-sm font-bold border-b-2 transition ${activeTab === 'budgets' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-400 hover:text-primary-600'}`}
        >
          Gestion Budgétaire
        </button>
      </div>

      {/* TAB 1 : COMMANDES */}
      {activeTab === 'commandes' && (
        <div className="space-y-6">
          {/* Total spending card */}
          <div className="card max-w-sm flex items-center justify-between border-b-4 border-b-emerald-500">
            <div>
              <span className="text-[10px] uppercase font-bold text-primary-500">Dépenses engagées</span>
              <h2 className="text-3xl font-display font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {totalPOExpenses.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </h2>
            </div>
            <Coins className="text-emerald-500" size={28} />
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-primary-800 dark:text-primary-200">
                Historique des Commandes d'Achats
              </h3>
              <button
                onClick={() => handleExportData('Historique des Commandes d\'Achat')}
                className="btn-secondary text-xs flex items-center gap-1 py-1.5"
              >
                <FileSpreadsheet size={14} />
                Exporter Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table w-full text-xs">
                <thead>
                  <tr>
                    <th>Date d'émission</th>
                    <th>N° Commande</th>
                    <th>Fournisseur / Prestataire</th>
                    <th>Atelier demandeur</th>
                    <th>Demandeur</th>
                    <th>Montant HT</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {commandes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-primary-400">Aucune commande enregistrée.</td>
                    </tr>
                  ) : (
                    commandes
                      .sort((a, b) => b.dateCreation.localeCompare(a.dateCreation))
                      .map(c => (
                        <tr key={c.id} className="hover:bg-primary-50 dark:hover:bg-primary-800 transition">
                          <td>{new Date(c.dateCreation).toLocaleDateString('fr-FR')}</td>
                          <td className="font-mono font-bold text-indigo-600">{c.numero}</td>
                          <td className="font-bold">{c.fournisseurNom}</td>
                          <td>{c.atelier}</td>
                          <td>{c.demandeur}</td>
                          <td className="font-bold text-primary-900 dark:text-white">{c.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                          <td>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {c.statut}
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

      {/* TAB 2 : CATALOGUE PARTENAIRES */}
      {activeTab === 'partenaires' && !selectedSupplierId && (
        <div className="space-y-6">
          <div className="card">
            {/* Search and type filter */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-primary-100 dark:border-primary-800/60">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" size={16} />
                  <input
                    type="text"
                    placeholder="Recherche partenaires (Nom, métier, ville...)"
                    value={supplierSearch}
                    onChange={e => setSupplierSupplierSearch(e.target.value)}
                    className="pl-10 text-xs py-2 h-9"
                  />
                </div>

                <div className="flex gap-1.5">
                  {['Tous', 'Fournisseur', 'Sous-traitant'].map(type => (
                    <button
                      key={type}
                      onClick={() => setSupplierFilterType(type)}
                      className={`px-3 py-1.5 h-9 text-xs font-bold rounded-lg border transition ${supplierFilterType === type ? 'bg-accent-orange text-white border-accent-orange' : 'bg-white dark:bg-primary-800 text-primary-600 dark:text-primary-300 border-primary-200 dark:border-primary-700'}`}
                    >
                      {type === 'Tous' ? 'Tous' : (type === 'Fournisseur' ? 'Fournisseurs' : 'Sous-traitants')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={importInputRef}
                  onChange={handleImportCSV}
                  accept=".csv"
                  className="hidden"
                />
                
                <button
                  onClick={downloadImportTemplateCSV}
                  className="btn-secondary text-[11px] h-9 flex items-center gap-1.5 py-1.5 px-3 border border-dashed border-primary-300 dark:border-primary-600"
                  title="Télécharger le gabarit CSV d'importation avec des exemples"
                >
                  <FileSpreadsheet size={13} className="text-emerald-500" />
                  <span>Gabarit CSV</span>
                </button>

                <button
                  onClick={() => {
                    setImportTargetType('Sous-traitant');
                    setTimeout(() => importInputRef.current?.click(), 50);
                  }}
                  className="btn-secondary text-[11px] h-9 flex items-center gap-1.5 py-1.5 px-3"
                  title="Importer des sous-traitants depuis un fichier CSV"
                >
                  <Upload size={13} className="text-blue-500" />
                  <span>Importer CSV (Sous-traitants)</span>
                </button>

                <button
                  onClick={() => {
                    setImportTargetType('Fournisseur');
                    setTimeout(() => importInputRef.current?.click(), 50);
                  }}
                  className="btn-secondary text-[11px] h-9 flex items-center gap-1.5 py-1.5 px-3"
                  title="Importer des fournisseurs depuis un fichier CSV"
                >
                  <Upload size={13} className="text-indigo-500" />
                  <span>Importer CSV (Fournisseurs)</span>
                </button>

                <button
                  onClick={exportSubcontractorsToCSV}
                  className="btn-secondary text-[11px] h-9 flex items-center gap-1.5 py-1.5 px-3"
                  title="Exporter tous les sous-traitants au format CSV"
                >
                  <Download size={13} className="text-orange-500" />
                  <span>Exporter CSV (Sous-traitants)</span>
                </button>

                <button
                  onClick={exportSuppliersToCSV}
                  className="btn-secondary text-[11px] h-9 flex items-center gap-1.5 py-1.5 px-3"
                  title="Exporter tous les fournisseurs au format CSV"
                >
                  <Download size={13} className="text-pink-500" />
                  <span>Exporter CSV (Fournisseurs)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Partenaire / Entreprise</th>
                    <th>Catégorie</th>
                    <th>Métier principal</th>
                    <th>Contact Principal</th>
                    <th>Localisation</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-primary-400 text-sm">Aucun partenaire trouvé.</td>
                    </tr>
                  ) : (
                    filteredSuppliers.map(s => {
                      const isSub = s.type === 'Sous-traitant';
                      return (
                        <tr key={s.id} className="hover:bg-primary-50 dark:hover:bg-primary-800 transition">
                          <td>
                            <strong className="text-primary-800 dark:text-white block">{s.nom}</strong>
                            {s.web && s.web !== '-' && (
                              <span className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5">
                                <Globe size={10} /> {s.web}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${isSub ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300'}`}>
                              {s.type}
                            </span>
                          </td>
                          <td className="font-semibold text-xs">{s.metier}</td>
                          <td>
                            <span className="block font-bold text-xs">{s.c1_nom}</span>
                            <span className="text-[10px] text-primary-400">{s.c1_email}</span>
                          </td>
                          <td>
                            <span className="text-xs block font-semibold">{s.cpville}</span>
                            <span className="text-[10px] text-primary-400 uppercase font-mono">{s.pays}</span>
                          </td>
                          <td className="text-right">
                            <button
                              onClick={() => setSelectedSupplierId(s.id)}
                              className="btn-icon bg-primary-100 text-primary-700 hover:bg-accent-orange hover:text-white"
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

      {/* TAB 3: GESTION BUDGETAIRE */}
      {activeTab === 'budgets' && (
        <div className="space-y-6">
          {/* YEAR SELECTION AND KPIS */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-primary-700 dark:text-primary-300">Exercice annuel :</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="w-28 p-2 rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800 text-xs font-bold"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={() => {
                setBudgetAnnee(selectedYear);
                setBudgetAtelier(settings.listes.ateliers[0] || '');
                setBudgetEnveloppe(0);
                setBudgetDesc('');
                setIsEditingBudget(false);
                setShowBudgetForm(true);
              }}
              className="btn-primary"
              style={{ backgroundColor: '#F97316' }}
            >
              <Plus size={16} />
              Allouer Budget
            </button>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Budgeted Card */}
            <div className="card flex items-center justify-between border-b-4 border-b-blue-500">
              <div>
                <span className="text-[10px] uppercase font-bold text-primary-500">Budget Alloué Global</span>
                <h2 className="text-2xl font-display font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                  {budgets
                    .filter(b => b.annee === selectedYear)
                    .reduce((sum, b) => sum + b.enveloppe, 0)
                    .toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                </h2>
              </div>
              <Coins className="text-blue-500" size={24} />
            </div>

            {/* Total Spent Card */}
            <div className="card flex items-center justify-between border-b-4 border-b-amber-500">
              <div>
                <span className="text-[10px] uppercase font-bold text-primary-500">Dépenses Cumulées</span>
                <h2 className="text-2xl font-display font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                  {commandes
                    .filter(c => new Date(c.dateCreation).getFullYear() === selectedYear)
                    .reduce((sum, c) => sum + (c.montant || 0), 0)
                    .toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                </h2>
              </div>
              <DollarSign className="text-amber-500" size={24} />
            </div>

            {/* Consumption Rate Card */}
            {(() => {
              const totalAlloc = budgets.filter(b => b.annee === selectedYear).reduce((sum, b) => sum + b.enveloppe, 0);
              const totalSpent = commandes.filter(c => new Date(c.dateCreation).getFullYear() === selectedYear).reduce((sum, c) => sum + (c.montant || 0), 0);
              const rate = totalAlloc > 0 ? (totalSpent / totalAlloc) * 100 : 0;
              const isOver = rate > 100;
              return (
                <div className={`card flex items-center justify-between border-b-4 ${isOver ? 'border-b-red-500' : rate > 80 ? 'border-b-orange-500' : 'border-b-emerald-500'}`}>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-primary-500">Taux de Consommation</span>
                    <h2 className={`text-2xl font-display font-extrabold mt-1 ${isOver ? 'text-red-600 dark:text-red-400' : rate > 80 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {rate.toFixed(1)} %
                    </h2>
                  </div>
                  <FileCheck className={isOver ? 'text-red-500' : rate > 80 ? 'text-orange-500' : 'text-emerald-500'} size={24} />
                </div>
              );
            })()}

            {/* Solde Card */}
            {(() => {
              const totalAlloc = budgets.filter(b => b.annee === selectedYear).reduce((sum, b) => sum + b.enveloppe, 0);
              const totalSpent = commandes.filter(c => new Date(c.dateCreation).getFullYear() === selectedYear).reduce((sum, c) => sum + (c.montant || 0), 0);
              const solde = totalAlloc - totalSpent;
              const isNegative = solde < 0;
              return (
                <div className={`card flex items-center justify-between border-b-4 ${isNegative ? 'border-b-red-600 bg-red-50/10' : 'border-b-indigo-500'}`}>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-primary-500">Marge Disponible</span>
                    <h2 className={`text-2xl font-display font-extrabold mt-1 ${isNegative ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                      {solde.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                    </h2>
                  </div>
                  <Coins className={isNegative ? 'text-red-500' : 'text-indigo-500'} size={24} />
                </div>
              );
            })()}
          </div>

          {/* VISUAL CHARTS AND DETAILED ATELIER TABLES */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Table list - 7cols */}
            <div className="card lg:col-span-7">
              <h3 className="text-sm font-bold text-primary-800 dark:text-primary-200 mb-4">
                Enveloppes par Ateliers ({selectedYear})
              </h3>
              
              <div className="overflow-x-auto">
                <table className="data-table w-full text-xs">
                  <thead>
                    <tr>
                      <th>Atelier</th>
                      <th>Budget Alloué</th>
                      <th>Dépenses Réelles</th>
                      <th>Consommation</th>
                      <th>Solde</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.listes.ateliers.map(atelier => {
                      const budgetObj = budgets.find(b => b.annee === selectedYear && b.atelier === atelier);
                      const spent = getExpensesByWorkshopAndYear(atelier, selectedYear);
                      const envelope = budgetObj ? budgetObj.enveloppe : 0;
                      const consumed = envelope > 0 ? (spent / envelope) * 100 : 0;
                      const solde = envelope - spent;
                      const isNegative = solde < 0;

                      return (
                        <tr key={atelier} className="hover:bg-primary-50 dark:hover:bg-primary-800 transition">
                          <td className="font-bold py-3">{atelier}</td>
                          <td>
                            {budgetObj ? (
                              <span className="font-semibold text-primary-900 dark:text-white">
                                {envelope.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                              </span>
                            ) : (
                              <span className="text-primary-400 italic font-medium">Non défini</span>
                            )}
                          </td>
                          <td className="font-semibold text-amber-600 dark:text-amber-400">
                            {spent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })}
                          </td>
                          <td className="align-middle">
                            {envelope > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-primary-200 dark:bg-primary-700 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${consumed > 100 ? 'bg-red-500' : consumed > 80 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min(consumed, 100)}%` }}
                                  />
                                </div>
                                <span className={`font-mono font-bold ${consumed > 100 ? 'text-red-500' : consumed > 80 ? 'text-orange-500' : 'text-emerald-500'}`}>
                                  {consumed.toFixed(0)}%
                                </span>
                              </div>
                            ) : spent > 0 ? (
                              <span className="text-red-500 font-bold font-mono">Dépassement</span>
                            ) : (
                              <span className="text-primary-400 font-mono">-</span>
                            )}
                          </td>
                          <td className={`font-semibold ${isNegative ? 'text-red-500 font-bold' : 'text-primary-700 dark:text-primary-300'}`}>
                            {solde.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                          </td>
                          <td className="text-right">
                            {budgetObj ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleStartEditBudget(budgetObj)}
                                  className="btn-icon bg-primary-100 dark:bg-primary-800 text-primary-700 hover:bg-blue-500 hover:text-white"
                                  title="Modifier le budget"
                                >
                                  <PenTool size={11} />
                                </button>
                                <button
                                  onClick={() => handleDeleteBudget(budgetObj.id)}
                                  className="btn-icon bg-primary-100 dark:bg-primary-800 text-red-500 hover:bg-red-500 hover:text-white"
                                  title="Supprimer"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setBudgetAnnee(selectedYear);
                                  setBudgetAtelier(atelier);
                                  setBudgetEnveloppe(0);
                                  setBudgetDesc('');
                                  setIsEditingBudget(false);
                                  setShowBudgetForm(true);
                                }}
                                className="px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-md text-[10px] font-bold flex items-center gap-1 ml-auto"
                              >
                                <Plus size={10} />
                                Configurer
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recharts Chart - 5cols */}
            <div className="card lg:col-span-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-primary-800 dark:text-primary-200 mb-4">
                  Visualisation Budget vs Dépenses ({selectedYear})
                </h3>
                
                {/* RECHARTS COMPONENT */}
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={settings.listes.ateliers.map(atelier => {
                        const budgetObj = budgets.find(b => b.annee === selectedYear && b.atelier === atelier);
                        const envelope = budgetObj ? budgetObj.enveloppe : 0;
                        const spent = getExpensesByWorkshopAndYear(atelier, selectedYear);
                        return {
                          name: atelier.replace("Atelier ", ""),
                          "Budget": envelope,
                          "Dépenses": spent
                        };
                      })}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#9CA3AF" opacity={0.15} />
                      <XAxis dataKey="name" stroke="#6B7280" style={{ fontSize: '9px' }} />
                      <YAxis stroke="#6B7280" style={{ fontSize: '9px' }} tickFormatter={(v) => `${v}€`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.375rem', color: '#F3F4F6', fontSize: '10px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                      <Bar dataKey="Budget" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Dépenses" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Advice box */}
              <div className="bg-primary-50 dark:bg-primary-800/40 border-l-4 border-l-orange-500 p-3 rounded-r-lg mt-4 text-[11px] text-primary-600 dark:text-primary-300">
                <p className="font-semibold text-primary-800 dark:text-white mb-0.5">💡 Recommandation GMAO Pro :</p>
                Configurez des enveloppes d'achat proactives par rapport au volume d'interventions préventives plannifiées afin de prévenir les surcoûts logistiques d'urgence.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL DISPLAY ON SPECIFIC SUP/SUB SELECT */}
      {selectedSupplierId && selectedSup && (
        <div className="space-y-6">
          <div className="card flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedSupplierId(null)}
                className="p-1.5 bg-primary-100 hover:bg-primary-200 dark:bg-primary-900 dark:hover:bg-primary-800 rounded-lg text-primary-600 dark:text-primary-300"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-xl font-display font-bold text-primary-900 dark:text-white">
                  {selectedSup.nom}
                </h2>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase mt-1 ${selectedSup.type === 'Sous-traitant' ? 'bg-indigo-100 text-indigo-800' : 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300'}`}>
                  {selectedSup.type}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDeleteSupplier}
                className={`btn-secondary text-red-500 border-red-200 ${userRole === 'Technicien' ? 'opacity-40 cursor-not-allowed' : 'hover:bg-red-50'}`}
                title={userRole === 'Technicien' ? "Suppression réservée aux Managers (Accès restreint)" : "Supprimer ce partenaire"}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Characteristics and contact */}
            <div className="card space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary-800 dark:text-primary-200 border-b pb-2">
                <Building size={16} className="inline mr-2 text-accent-orange" />
                Fiche administrative & Contacts
              </h3>

              <div className="grid grid-cols-2 gap-y-3 text-xs border-b pb-4">
                <p><strong>Standard Tel :</strong> {selectedSup.telfax}</p>
                <p><strong>Métier :</strong> {selectedSup.metier}</p>
                <p className="col-span-2"><strong>Adresse :</strong> {selectedSup.adresse}, {selectedSup.cpville} ({selectedSup.pays})</p>
                {selectedSup.web && selectedSup.web !== '-' && (
                  <p className="col-span-2">
                    <strong>Site Web :</strong>{' '}
                    <a
                      href={`https://${selectedSup.web}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline inline-flex items-center gap-1"
                    >
                      {selectedSup.web} <ExternalLink size={12} />
                    </a>
                  </p>
                )}
              </div>

                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-amber-50 dark:bg-primary-900/50 rounded-lg">
                    <strong className="text-accent-orange block mb-1">Contact Commercial (Principal) :</strong>
                    <p className="font-bold text-primary-850 dark:text-white">{selectedSup.c1_nom}</p>
                    <p className="text-[10px] text-primary-400">{selectedSup.c1_fonc}</p>
                    <p className="flex items-center gap-1.5 mt-2"><Phone size={12} /> {selectedSup.c1_tel}</p>
                    <p className="flex items-center gap-1.5 mt-1"><Mail size={12} /> {selectedSup.c1_email}</p>
                  </div>

                  {selectedSup.c2_nom && selectedSup.c2_nom !== '-' && (
                    <div className="p-3 bg-primary-100/50 dark:bg-primary-900/20 rounded-lg">
                      <strong className="text-primary-600 dark:text-primary-400 block mb-1">Contact Technique (Secondaire) :</strong>
                      <p className="font-bold">{selectedSup.c2_nom}</p>
                      <p className="text-[10px] text-primary-400">{selectedSup.c2_fonc}</p>
                      <p className="flex items-center gap-1.5 mt-2"><Phone size={12} /> {selectedSup.c2_tel}</p>
                      <p className="flex items-center gap-1.5 mt-1"><Mail size={12} /> {selectedSup.c2_email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Commercial and subcontracting specific details */}
              <div className="space-y-6">
              <div className="card">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary-800 dark:text-primary-200 border-b pb-2 mb-4">
                  Conditions Commerciales
                </h3>
                <div className="grid grid-cols-2 gap-y-3 text-xs">
                  <p><strong>Règlement :</strong> {selectedSup.paiement || '-'}</p>
                  <p><strong>Livraison :</strong> {selectedSup.livraison || '-'}</p>
                  <p><strong>TVA applicable :</strong> {selectedSup.tva || '20'} %</p>
                  <p><strong>Devise de facturation :</strong> {selectedSup.devise || '€'}</p>
                </div>
                {selectedSup.obs && (
                  <div className="mt-4 p-3 bg-primary-50 rounded-lg text-xs italic">
                    &ldquo;{selectedSup.obs}&rdquo;
                  </div>
                )}
              </div>

              {selectedSup.type === 'Sous-traitant' && (
                <div className="card border-l-4 border-l-indigo-500 bg-indigo-50/10">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b pb-2 mb-4 flex items-center gap-1.5">
                    <FileCheck size={16} />
                    Détails du Contrat de Sous-traitance
                  </h3>
                  <div className="grid grid-cols-2 gap-y-3 text-xs pb-3 border-b border-primary-200 dark:border-primary-800">
                    <p><strong>Tarif Horaire MO :</strong> <span className="font-bold text-red-500 text-sm">{(selectedSup.coutMO || 0).toFixed(2)} € / h</span></p>
                    <p><strong>Forfait Déplacement :</strong> <span className="font-bold text-amber-500 text-sm">{(selectedSup.coutDeplacement || 0).toFixed(2)} €</span></p>
                    <p className="col-span-2"><strong>Prestations couvertes :</strong> {selectedSup.catalogueServices || 'Non spécifié'}</p>
                    <p className="col-span-2">
                      <strong>Contrat Annuel Actif :</strong>{' '}
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${selectedSup.contratActif ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {selectedSup.contratActif ? "Oui (Actif)" : "Non (Inactif)"}
                      </span>
                    </p>
                  </div>
                  {selectedSup.contratActif && (
                    <button
                      onClick={() => alert("📄 Téléchargement simulé de la convention cadre PDF de sous-traitance.")}
                      className="btn-primary w-full justify-center mt-3 bg-indigo-600 hover:bg-indigo-700 text-xs py-2"
                    >
                      Télécharger la convention cadre (PDF)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CRUD PARTENAIRE MODAL */}
      <AnimatePresence>
        {showSupplierForm && (
          <div className="modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content"
              style={{ maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <span onClick={() => setShowSupplierForm(false)} className="close-modal">&times;</span>
              <h2 className="text-lg font-display font-bold text-primary-900 dark:text-white border-b pb-3 mb-4">
                {isEditing ? `Modifier partenaire` : "Ajouter un partenaire d'achats"}
              </h2>

              <form onSubmit={handleSubmitSupplier} className="grid-form text-xs">
                <div>
                  <label>Nom de l'Entreprise <span className="text-red-500">*</span></label>
                  <input type="text" required value={formNom} onChange={e => setFormNom(e.target.value)} placeholder="Ex: SND Distri" />
                </div>

                <div>
                  <label>Type de Partenaire <span className="text-red-500">*</span></label>
                  <select value={formType} onChange={e => setFormType(e.target.value as any)}>
                    <option value="Fournisseur">Fournisseur de Pièces</option>
                    <option value="Sous-traitant">Sous-traitant (Intervention terrain)</option>
                  </select>
                </div>

                <div>
                  <label>Métier / Activité principale</label>
                  <input type="text" value={formMetier} onChange={e => setFormMetier(e.target.value)} placeholder="Ex: Transmission mécanique" />
                </div>

                <div>
                  <label>Site Web d'entreprise</label>
                  <input type="text" value={formWeb} onChange={e => setFormWeb(e.target.value)} placeholder="www.exemple.fr" />
                </div>

                <div>
                  <label>Standard Téléphone / Fax</label>
                  <input type="text" value={formTel} onChange={e => setFormTel(e.target.value)} placeholder="04.XX.XX.XX.XX" />
                </div>

                <div>{/* Empty column */}</div>

                <div className="col-span-2 border-t pt-3 mt-2"><span className="font-bold text-accent-orange">Coordonnées Postales</span></div>
                
                <div className="col-span-2">
                  <label>Adresse complète d'expédition</label>
                  <input type="text" value={formAdresse} onChange={e => setFormAdresse(e.target.value)} placeholder="Rue de la Zone Industrielle..." />
                </div>

                <div>
                  <label>Code Postal & Ville</label>
                  <input type="text" value={formCpVille} onChange={e => setFormCpVille(e.target.value)} placeholder="69000 Lyon" />
                </div>

                <div>
                  <label>Pays / Langue</label>
                  <input type="text" value={formPays} onChange={e => setFormPays(e.target.value)} placeholder="France" />
                </div>

                <div className="col-span-2 border-t pt-3 mt-2"><span className="font-bold text-accent-orange font-display">Interlocuteurs (Contacts direct)</span></div>

                <div className="p-3 bg-primary-50 rounded-lg border">
                  <strong className="block text-primary-700 mb-2">Interlocuteur #1 (Commercial)</strong>
                  <div className="space-y-2">
                    <input type="text" value={formC1Nom} onChange={e => setFormC1Nom(e.target.value)} placeholder="Nom du contact" className="bg-white" />
                    <input type="text" value={formC1Fonc} onChange={e => setFormC1Fonc(e.target.value)} placeholder="Fonction (Ex: Commercial)" className="bg-white" />
                    <input type="text" value={formC1Tel} onChange={e => setFormC1Tel(e.target.value)} placeholder="Téléphone direct" className="bg-white" />
                    <input type="email" value={formC1Email} onChange={e => setFormC1Email(e.target.value)} placeholder="Adresse mail" className="bg-white" />
                  </div>
                </div>

                <div className="p-3 bg-primary-50 rounded-lg border">
                  <strong className="block text-primary-700 mb-2">Interlocuteur #2 (SAV / Tech)</strong>
                  <div className="space-y-2">
                    <input type="text" value={formC2Nom} onChange={e => setFormC2Nom(e.target.value)} placeholder="Nom du contact" className="bg-white" />
                    <input type="text" value={formC2Fonc} onChange={e => setFormC2Fonc(e.target.value)} placeholder="Fonction (Ex: Technicien)" className="bg-white" />
                    <input type="text" value={formC2Tel} onChange={e => setFormC2Tel(e.target.value)} placeholder="Téléphone direct" className="bg-white" />
                    <input type="email" value={formC2Email} onChange={e => setFormC2Email(e.target.value)} placeholder="Adresse mail" className="bg-white" />
                  </div>
                </div>

                <div className="col-span-2 border-t pt-3 mt-2"><span className="font-bold text-accent-orange">Conditions Commerciales</span></div>

                <div>
                  <label>Mode de règlement</label>
                  <input type="text" value={formPaiement} onChange={e => setFormPaiement(e.target.value)} placeholder="30j fin de mois" />
                </div>

                <div>
                  <label>Mode de livraison / Port</label>
                  <input type="text" value={formLivraison} onChange={e => setFormLivraison(e.target.value)} placeholder="Franco de port" />
                </div>

                {formType === 'Sous-traitant' && (
                  <div className="col-span-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg grid grid-cols-2 gap-3">
                    <strong className="col-span-2 text-indigo-700 block"><Handshake size={14} className="inline mr-1" /> Modalités Spécifiques de Sous-traitance</strong>
                    <div>
                      <label>Coût Main d'Œuvre (€/Heure) <span className="text-red-500">*</span></label>
                      <input type="number" step="0.01" value={formCoutMo} onChange={e => setFormCoutMo(Number(e.target.value))} />
                    </div>
                    <div>
                      <label>Forfait Déplacement (€) <span className="text-red-500">*</span></label>
                      <input type="number" step="0.01" value={formCoutDep} onChange={e => setFormCoutDep(Number(e.target.value))} />
                    </div>
                    <div className="col-span-2">
                      <label>Catalogue de prestations couvertes</label>
                      <textarea value={formCatServices} onChange={e => setFormCatServices(e.target.value)} rows={2} placeholder="Soudure, rectifications, lignage..." className="bg-white" />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <input type="checkbox" checked={formContratActif} onChange={e => setFormContratActif(e.target.checked)} className="h-5 w-5 accent-indigo-600 rounded" />
                      <label className="m-0 font-bold text-indigo-800 cursor-pointer">CONTRAT ANNUEL CADRE ACTIF</label>
                    </div>
                  </div>
                )}

                <div className="col-span-2">
                  <label>Observations générales</label>
                  <textarea value={formObs} onChange={e => setFormObs(e.target.value)} rows={2} />
                </div>

                <div className="col-span-2">
                  <label>Observations à transmettre au fournisseur lors d'un achat</label>
                  <textarea value={formObsCmd} onChange={e => setFormObsCmd(e.target.value)} rows={2} placeholder="Ex: Joindre notre bon de commande au BL..." />
                </div>

                <div className="col-span-2 flex justify-end gap-3 mt-4 border-t pt-4">
                  <button type="button" onClick={() => setShowSupplierForm(false)} className="btn-secondary">Annuler</button>
                  <button type="submit" className="btn-primary">Enregistrer la fiche</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE PURCHASE ORDER (PO) MODAL */}
      <AnimatePresence>
        {showCommandForm && (
          <div className="modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content"
            >
              <span onClick={() => setShowCommandForm(false)} className="close-modal">&times;</span>
              <h2 className="text-lg font-display font-bold text-emerald-600 border-b pb-3 mb-4 flex items-center gap-1.5">
                <ShoppingBag size={18} />
                Générer un Bon de Commande
              </h2>

              <form onSubmit={handleSubmitCommande} className="grid-form text-xs">
                <div className="col-span-2">
                  <label>Partenaire agréé de l'achat <span className="text-red-500">*</span></label>
                  <select required value={cmdSupplierId} onChange={e => setCmdSupplierId(e.target.value)}>
                    {[...suppliers].sort((a, b) => a.nom.localeCompare(b.nom)).map(s => (
                      <option key={s.id} value={s.id}>{s.nom} ({s.type})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Atelier demandeur <span className="text-red-500">*</span></label>
                  <select required value={cmdAtelier} onChange={e => setCmdAtelier(e.target.value)}>
                    {[...settings.listes.ateliers].sort((a, b) => a.localeCompare(b)).map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Nom du demandeur interne <span className="text-red-500">*</span></label>
                  <input type="text" required value={cmdDemandeur} onChange={e => setCmdDemandeur(e.target.value)} />
                </div>

                <div className="col-span-2">
                  <label>Montant estimé global de la transaction (€ HT) <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" required value={cmdMontant || ''} onChange={e => setCmdMontant(Number(e.target.value))} />
                </div>

                <div className="col-span-2">
                  <label>Désignation détaillée du matériel / motif <span className="text-red-500">*</span></label>
                  <textarea required value={cmdDesc} onChange={e => setCmdDesc(e.target.value)} rows={3} placeholder="Saisir la liste des pièces ou prestations..." />
                </div>

                <div className="col-span-2 flex justify-end gap-3 mt-4 border-t pt-4">
                  <button type="button" onClick={() => setShowCommandForm(false)} className="btn-secondary">Annuler</button>
                  <button type="submit" className="btn-primary" style={{ backgroundColor: '#10B981' }}>Émettre le bon</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ALLOCATE / EDIT BUDGET MODAL */}
      <AnimatePresence>
        {showBudgetForm && (
          <div className="modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content"
            >
              <span onClick={() => setShowBudgetForm(false)} className="close-modal">&times;</span>
              <h2 className="text-lg font-display font-bold text-orange-600 border-b pb-3 mb-4 flex items-center gap-1.5">
                <Coins size={18} />
                {isEditingBudget ? "Modifier l'Enveloppe Budgétaire" : "Allouer une Enveloppe Budgétaire"}
              </h2>

              <form onSubmit={handleSubmitBudget} className="grid-form text-xs">
                <div>
                  <label>Année d'exercice <span className="text-red-500">*</span></label>
                  <select required value={budgetAnnee} onChange={e => setBudgetAnnee(Number(e.target.value))}>
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Atelier ciblé <span className="text-red-500">*</span></label>
                  <select required disabled={isEditingBudget} value={budgetAtelier} onChange={e => setBudgetAtelier(e.target.value)}>
                    {[...settings.listes.ateliers].sort((a, b) => a.localeCompare(b)).map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label>Montant de l'enveloppe annuelle (€ HT) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={budgetEnveloppe || ''}
                    onChange={e => setBudgetEnveloppe(Number(e.target.value))}
                    placeholder="Ex: 15000"
                  />
                </div>

                <div className="col-span-2">
                  <label>Notes / Justification budgétaire</label>
                  <textarea
                    value={budgetDesc}
                    onChange={e => setBudgetDesc(e.target.value)}
                    rows={3}
                    placeholder="Description de la ligne d'imputation (ex: Maintenance courante des compresseurs)..."
                  />
                </div>

                <div className="col-span-2 flex justify-end gap-3 mt-4 border-t pt-4">
                  <button type="button" onClick={() => setShowBudgetForm(false)} className="btn-secondary">Annuler</button>
                  <button type="submit" className="btn-primary" style={{ backgroundColor: '#F97316' }}>
                    {isEditingBudget ? "Sauvegarder" : "Créer l'enveloppe"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
