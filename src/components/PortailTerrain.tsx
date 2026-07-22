/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  QrCode,
  Search,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Activity,
  FileText,
  Check,
  User,
  History,
  Smartphone,
  Maximize2,
  RefreshCw,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  FileSignature,
  Printer,
  ChevronDown,
  Upload,
  Trash2,
  Play,
  CheckCircle,
  AlertCircle,
  X,
  Minus,
  Plus,
  Barcode,
  Boxes,
  Zap,
  Pencil
} from 'lucide-react';
import { Equipement, Intervention, GlobalSettings, Compteur, Piece, MouvementStock } from '../types';
import { SaisieVocale } from './SaisieVocale';
import PhotoAnnotatorModal from './PhotoAnnotatorModal';
import { ModuleHelp } from './ModuleHelp';
import EquipmentTreeSelect from './EquipmentTreeSelect';

interface PortailTerrainProps {
  equipements: Equipement[];
  interventions: Intervention[];
  settings: GlobalSettings;
  pieces: Piece[];
  onEditEquipement: (id: string, payload: Partial<Equipement>) => void;
  onAddIntervention: (payload: Omit<Intervention, 'id' | 'dateCreation'>) => void;
  onUpdateIntervention: (id: string, payload: Partial<Intervention>) => void;
  onAddCompteur: (payload: Omit<Compteur, 'id' | 'dateReleve'>) => void;
  onEditPiece: (id: string, payload: Partial<Piece>) => void;
  onAddMouvement: (payload: Omit<MouvementStock, 'id' | 'dateCreation'>) => void;
}

export default function PortailTerrain({
  equipements,
  interventions,
  settings,
  pieces,
  onEditEquipement,
  onAddIntervention,
  onUpdateIntervention,
  onAddCompteur,
  onEditPiece,
  onAddMouvement
}: PortailTerrainProps) {
  // Safe Date Formatter helper
  const formatDateSafely = (dateStr: string | undefined | null, fallback: string = 'Expirée') => {
    if (!dateStr) return fallback;
    try {
      if (dateStr.toLowerCase().includes('expir') || dateStr.toLowerCase() === 'n/a' || dateStr.toLowerCase() === '-') {
        return fallback;
      }
      
      let finalStr = dateStr;
      // Convert DD/MM/YYYY to YYYY-MM-DD
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('/');
        finalStr = `${year}-${month}-${day}`;
      }

      const d = new Date(finalStr);
      if (isNaN(d.getTime())) {
        return dateStr; // fallback to raw string if it's not a standard parseable date
      }
      return d.toLocaleDateString('fr-FR');
    } catch (e) {
      return fallback;
    }
  };

  // Session Operator State
  const [selectedOperator, setSelectedOperator] = useState<string>(
    settings.listes.operateurs[0] || 'Pierre Martin'
  );

  // Scanning State
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [manualCode, setManualCode] = useState('');

  // Selected Machine identified by Scan
  const [scannedMachineId, setScannedMachineId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      let eqVal = params.get('eq') || params.get('machine');
      if (!eqVal) {
        const hash = window.location.hash;
        const match = hash.match(/[?&]eq=([^&]+)/i) || hash.match(/[?&]machine=([^&]+)/i);
        if (match && match[1]) {
          eqVal = decodeURIComponent(match[1]);
        }
      }
      if (eqVal) {
        const found = equipements.find(e => 
          e.id.toLowerCase() === eqVal!.toLowerCase() || 
          e.nom.toLowerCase() === eqVal!.toLowerCase()
        );
        return found ? found.id : null;
      }
    }
    return null;
  });

  const machineDetailsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scannedMachineId && machineDetailsRef.current) {
      setTimeout(() => {
        machineDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [scannedMachineId]);

  useEffect(() => {
    const handleUrlEquipement = () => {
      const params = new URLSearchParams(window.location.search);
      let eqVal = params.get('eq') || params.get('machine');
      if (!eqVal) {
        const hash = window.location.hash;
        const match = hash.match(/[?&]eq=([^&]+)/i) || hash.match(/[?&]machine=([^&]+)/i);
        if (match && match[1]) {
          eqVal = decodeURIComponent(match[1]);
        }
      }
      if (eqVal) {
        const found = equipements.find(e => 
          e.id.toLowerCase() === eqVal!.toLowerCase() || 
          e.nom.toLowerCase() === eqVal!.toLowerCase()
        );
        if (found && found.id !== scannedMachineId) {
          setScannedMachineId(found.id);
          setScanMessage({
            text: `Équipement ${found.nom} (${found.id}) identifié par lien de scan !`,
            type: 'success'
          });
          setTimeout(() => setScanMessage(null), 4000);
        }
      }
    };
    
    handleUrlEquipement();
    window.addEventListener('popstate', handleUrlEquipement);
    window.addEventListener('hashchange', handleUrlEquipement);
    return () => {
      window.removeEventListener('popstate', handleUrlEquipement);
      window.removeEventListener('hashchange', handleUrlEquipement);
    };
  }, [equipements, scannedMachineId]);

  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isScanningAnimate, setIsScanningAnimate] = useState(false);

  // Modals / Form triggers
  const [activeForm, setActiveForm] = useState<'none' | 'panne' | 'compteur' | 'compteRendu' | 'depannage_rapide'>('none');
  const [selectedIntToClose, setSelectedIntToClose] = useState<Intervention | null>(null);

  // Form Field States
  const [formDescription, setFormDescription] = useState('');
  const [formUrgence, setFormUrgence] = useState('Moyenne');
  const [formTypeProbleme, setFormTypeProbleme] = useState('Mécanique');
  
  const [formCompteurValeur, setFormCompteurValeur] = useState<number>(0);
  const [formCompteurUnite, setFormCompteurUnite] = useState('Heures');

  const [crComment, setCrComment] = useState('');
  const [crTime, setCrTime] = useState('1.0');
  const [crPieces, setCrPieces] = useState('');

  // Dépannage rapide states
  const [depannageDescription, setDepannageDescription] = useState('');
  const [depannageTempsPasse, setDepannageTempsPasse] = useState('0.5');
  const [isCustomTemps, setIsCustomTemps] = useState(false);
  const [depannageTypeProbleme, setDepannageTypeProbleme] = useState('Mécanique');
  const [depannagePieces, setDepannagePieces] = useState('');
  const [depannageStatutMachine, setDepannageStatutMachine] = useState<'Opérationnel' | 'HS'>('Opérationnel');

  // Structured consumed pieces list for active work order closure
  const [consumedPiecesList, setConsumedPiecesList] = useState<Array<{
    pieceId: string;
    designation: string;
    quantite: number;
    codeBarre: string;
    prix: number;
  }>>([]);

  // Barcode scanner states for spare parts
  const [pieceScannerActive, setPieceScannerActive] = useState(false);
  const [pieceScannerError, setPieceScannerError] = useState<string | null>(null);
  const pieceQrScannerRef = useRef<Html5Qrcode | null>(null);

  // Signature Canvas drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // Active View Tab within portal
  const [portalTab, setPortalTab] = useState<'scanner' | 'mes-bt' | 'etiquettes' | 'auto-diag'>('scanner');

  // Auto-Diag States
  const [diagEquipementId, setDiagEquipementId] = useState<string>('');
  const [diagPartType, setDiagPartType] = useState<string>('roulement');
  const [diagImage, setDiagImage] = useState<string | null>(null);
  const [isDiagAnnotatorOpen, setIsDiagAnnotatorOpen] = useState(false);
  const [diagImageSizeInfo, setDiagImageSizeInfo] = useState<{ original: string; compressed: string; reduced: boolean; percentage: number } | null>(null);

  useEffect(() => {
    if (!diagImage) {
      setDiagImageSizeInfo(null);
    }
  }, [diagImage]);
  const [diagLoading, setDiagLoading] = useState<boolean>(false);
  const [diagLoadingStep, setDiagLoadingStep] = useState<string>('');
  const [diagResult, setDiagResult] = useState<{
    wearLevel: string;
    wearPercentage: number;
    diagnosis: string;
    correctiveAction: string;
    partsRequired: string[];
    recommendedPriority: string;
  } | null>(null);
  const [diagError, setDiagError] = useState<string | null>(null);

  // Quick Saisie States
  const [showQuickSaisie, setShowQuickSaisie] = useState(false);
  const [quickEquipementId, setQuickEquipementId] = useState('');
  const [quickDescription, setQuickDescription] = useState('');
  const [quickUrgence, setQuickUrgence] = useState('Moyenne');
  const [quickTypeProbleme, setQuickTypeProbleme] = useState('Mécanique');
  const [quickDemandeur, setQuickDemandeur] = useState('');
  const [quickSetHS, setQuickSetHS] = useState(false);

  useEffect(() => {
    setQuickDemandeur(selectedOperator);
  }, [selectedOperator]);

  // Live Camera states for Auto-Diag
  const [isDiagCameraLive, setIsDiagCameraLive] = useState<boolean>(false);
  const diagVideoRef = useRef<HTMLVideoElement | null>(null);
  const diagStreamRef = useRef<MediaStream | null>(null);

  // Stop live camera if tab changes or live mode turns off
  useEffect(() => {
    if (portalTab !== 'auto-diag' || !isDiagCameraLive) {
      if (diagStreamRef.current) {
        diagStreamRef.current.getTracks().forEach(track => track.stop());
        diagStreamRef.current = null;
      }
      setIsDiagCameraLive(false);
    }
  }, [portalTab, isDiagCameraLive]);

  useEffect(() => {
    return () => {
      if (diagStreamRef.current) {
        diagStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleStartDiagCamera = async () => {
    setDiagError(null);
    try {
      setIsDiagCameraLive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      diagStreamRef.current = stream;
      if (diagVideoRef.current) {
        diagVideoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Error accessing camera for diagnostic:", err);
      setDiagError("Impossible d'accéder à la caméra. Veuillez autoriser l'accès ou téléverser un fichier.");
      setIsDiagCameraLive(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  };

  const getExifOrientationFromBase64 = (base64Str: string): number => {
    try {
      const base64Pattern = /^data:image\/[a-zA-Z]+;base64,/;
      const cleanBase64 = base64Str.replace(base64Pattern, '');
      const binaryString = atob(cleanBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const view = new DataView(bytes.buffer);
      if (view.byteLength < 2 || view.getUint16(0, false) !== 0xFFD8) {
        return -1; // Not a JPEG or too short
      }
      const length = view.byteLength;
      let offset = 2;
      while (offset < length - 1) {
        if (offset + 2 > length) break;
        const marker = view.getUint16(offset, false);
        if (marker === 0xFFE1) {
          if (offset + 8 > length) break;
          // E.x.i.f
          if (view.getUint32(offset + 4, false) !== 0x45786966) {
            return -1;
          }
          let little = false;
          if (offset + 12 > length) break;
          const tiffHeader = view.getUint16(offset + 10, false);
          if (tiffHeader === 0x4949) {
            little = true;
          } else if (tiffHeader === 0x4D4D) {
            little = false;
          } else {
            return -1;
          }
          if (view.getUint16(offset + 12, little) !== 0x002A) {
            return -1;
          }
          if (offset + 18 > length) break;
          const offsetIFD = view.getUint32(offset + 14, little);
          let idx = offset + 10 + offsetIFD;
          if (idx + 2 > length) break;
          const entries = view.getUint16(idx, little);
          idx += 2;
          for (let i = 0; i < entries; i++) {
            if (idx + 12 > length) break;
            if (view.getUint16(idx, little) === 0x0112) {
              return view.getUint16(idx + 8, little);
            }
            idx += 12;
          }
        } else if ((marker & 0xFF00) === 0xFF00) {
          if (offset + 4 > length) break;
          offset += 2 + view.getUint16(offset + 2, false);
        } else {
          break;
        }
      }
      return -1;
    } catch (err) {
      console.warn("Could not parse EXIF orientation:", err);
      return -1;
    }
  };

  const compressImage = (base64Str: string, maxSizeBytes = 1024 * 1024): Promise<{ compressed: string; originalSize: number; compressedSize: number }> => {
    return new Promise((resolve) => {
      const originalSize = Math.round(base64Str.length * 0.75);
      const orientation = getExifOrientationFromBase64(base64Str);
      
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        // If image does not need compression and orientation is already correct/normal
        if (originalSize < maxSizeBytes && (!orientation || orientation <= 1)) {
          resolve({ compressed: base64Str, originalSize, compressedSize: originalSize });
          return;
        }

        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Downscale max resolution if huge to speed up and guarantee reduction
        const maxDimension = 1200;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // Adjust canvas dimensions if orientation is rotated by 90 or 270 degrees (values 5, 6, 7, 8)
        const isRotated90 = [5, 6, 7, 8].includes(orientation);
        canvas.width = isRotated90 ? height : width;
        canvas.height = isRotated90 ? width : height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ compressed: base64Str, originalSize, compressedSize: originalSize });
          return;
        }

        // Apply EXIF rotation transformations
        if (orientation > 1) {
          switch (orientation) {
            case 2:
              // Horizontal flip
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
              break;
            case 3:
              // 180° rotation
              ctx.translate(canvas.width, canvas.height);
              ctx.rotate(Math.PI);
              break;
            case 4:
              // Vertical flip
              ctx.translate(0, canvas.height);
              ctx.scale(1, -1);
              break;
            case 5:
              // Vertical flip + 90° clockwise rotation
              ctx.rotate(0.5 * Math.PI);
              ctx.scale(1, -1);
              break;
            case 6:
              // 90° clockwise rotation
              ctx.translate(canvas.width, 0);
              ctx.rotate(0.5 * Math.PI);
              break;
            case 7:
              // Horizontal flip + 90° clockwise rotation
              ctx.rotate(0.5 * Math.PI);
              ctx.translate(0, -canvas.width);
              ctx.scale(-1, 1);
              break;
            case 8:
              // 90° counter-clockwise rotation
              ctx.translate(0, canvas.height);
              ctx.rotate(-0.5 * Math.PI);
              break;
          }
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Quality reduction loop
        let quality = 0.85;
        let resultBase64 = canvas.toDataURL('image/jpeg', quality);
        let currentSize = Math.round(resultBase64.length * 0.75);

        while (currentSize > maxSizeBytes && quality > 0.1) {
          quality -= 0.1;
          resultBase64 = canvas.toDataURL('image/jpeg', quality);
          currentSize = Math.round(resultBase64.length * 0.75);
        }

        // Dimension reduction loop if still too big
        if (currentSize > maxSizeBytes) {
          let scale = 0.8;
          while (currentSize > maxSizeBytes && scale > 0.1) {
            const sCanvas = document.createElement('canvas');
            const newWidth = Math.round(width * scale);
            const newHeight = Math.round(height * scale);

            sCanvas.width = isRotated90 ? newHeight : newWidth;
            sCanvas.height = isRotated90 ? newWidth : newHeight;

            const sCtx = sCanvas.getContext('2d');
            if (sCtx) {
              if (orientation > 1) {
                switch (orientation) {
                  case 2:
                    sCtx.translate(sCanvas.width, 0);
                    sCtx.scale(-1, 1);
                    break;
                  case 3:
                    sCtx.translate(sCanvas.width, sCanvas.height);
                    sCtx.rotate(Math.PI);
                    break;
                  case 4:
                    sCtx.translate(0, sCanvas.height);
                    sCtx.scale(1, -1);
                    break;
                  case 5:
                    sCtx.rotate(0.5 * Math.PI);
                    sCtx.scale(1, -1);
                    break;
                  case 6:
                    sCtx.translate(sCanvas.width, 0);
                    sCtx.rotate(0.5 * Math.PI);
                    break;
                  case 7:
                    sCtx.rotate(0.5 * Math.PI);
                    sCtx.translate(0, -sCanvas.width);
                    sCtx.scale(-1, 1);
                    break;
                  case 8:
                    sCtx.translate(0, sCanvas.height);
                    sCtx.rotate(-0.5 * Math.PI);
                    break;
                }
              }
              sCtx.drawImage(img, 0, 0, newWidth, newHeight);
              resultBase64 = sCanvas.toDataURL('image/jpeg', 0.6);
              currentSize = Math.round(resultBase64.length * 0.75);
            }
            scale -= 0.2;
          }
        }

        resolve({ compressed: resultBase64, originalSize, compressedSize: currentSize });
      };
      img.onerror = () => {
        resolve({ compressed: base64Str, originalSize, compressedSize: originalSize });
      };
    });
  };

  const handleCaptureDiagPhoto = () => {
    if (!diagVideoRef.current) return;
    const video = diagVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      compressImage(base64).then(({ compressed, originalSize, compressedSize }) => {
        setDiagImage(compressed);
        setDiagImageSizeInfo({
          original: formatSize(originalSize),
          compressed: formatSize(compressedSize),
          reduced: compressedSize < originalSize,
          percentage: originalSize > 0 ? Math.round((1 - (compressedSize / originalSize)) * 100) : 0
        });
        setDiagResult(null); // Reset previous result on new capture
      });
    }
    setIsDiagCameraLive(false);
  };

  const handleDiagImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processDiagFile(file);
  };

  const processDiagFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setDiagError("Veuillez sélectionner un fichier image valide (PNG, JPEG, etc.).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      compressImage(base64).then(({ compressed, originalSize, compressedSize }) => {
        setDiagImage(compressed);
        setDiagImageSizeInfo({
          original: formatSize(originalSize),
          compressed: formatSize(compressedSize),
          reduced: compressedSize < originalSize,
          percentage: originalSize > 0 ? Math.round((1 - (compressedSize / originalSize)) * 100) : 0
        });
        setDiagResult(null); // Reset previous result
      });
      setDiagError(null);
    };
    reader.onerror = () => {
      setDiagError("Une erreur s'est produite lors de la lecture du fichier.");
    };
    reader.readAsDataURL(file);
  };

  const handleRunDiagnostic = async () => {
    if (!diagImage) return;
    setDiagLoading(true);
    setDiagError(null);
    setDiagResult(null);

    const steps = [
      "Initialisation de l'analyse visuelle...",
      "Traitement de l'image & Extraction des caractéristiques de surface...",
      "Comparaison avec les motifs d'usure mécaniques...",
      "Estimation du taux de fatigue et des risques...",
      "Formulation du plan d'action de de maintenance..."
    ];

    let currentStep = 0;
    setDiagLoadingStep(steps[currentStep]);

    const stepInterval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setDiagLoadingStep(steps[currentStep]);
      }
    }, 1200);

    try {
      const response = await fetch("/api/gemini/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: diagImage,
          partType: diagPartType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "L'analyse a échoué.");
      }

      const data = await response.json();
      setDiagResult(data);
    } catch (err: any) {
      console.error("Error executing diagnostic API:", err);
      setDiagError(err.message || "Une erreur réseau est survenue lors de l'appel au service de diagnostic.");
    } finally {
      clearInterval(stepInterval);
      setDiagLoading(false);
    }
  };

  const handleCreateDIFromDiag = () => {
    if (!diagResult) return;

    // Use selected machine if specified, otherwise default to a general machine
    const targetEq = equipements.find(e => e.id === diagEquipementId) || equipements[0];
    if (!targetEq) {
      setDiagError("Veuillez sélectionner un équipement pour y associer l'intervention.");
      return;
    }

    const urgencyMapping: Record<string, string> = {
      "Critique": "Critique",
      "Haute": "Critique",
      "Moyenne": "Moyenne",
      "Basse": "Basse"
    };

    const urgency = urgencyMapping[diagResult.recommendedPriority] || "Moyenne";

    onAddIntervention({
      typeDoc: 'DI',
      numero: `DI-${new Date().getFullYear().toString().substring(2, 4)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      equipementId: targetEq.id,
      equipementNom: targetEq.nom,
      atelier: targetEq.atelier,
      urgence: urgency,
      typeProbleme: 'Mécanique',
      demandeur: `${selectedOperator} (Auto-Diag IA)`,
      description: `[Auto-Diagnostic IA - Organe: ${diagPartType.toUpperCase()}]
Taux d'usure estimé: ${diagResult.wearPercentage}% (${diagResult.wearLevel})

Diagnostic de l'IA: 
${diagResult.diagnosis}

Action corrective immédiate suggérée:
${diagResult.correctiveAction}

Pièces requises identifiées par l'IA:
${diagResult.partsRequired.join(', ')}`,
      statut: 'En attente',
      operateur: selectedOperator
    });

    // If critical, set machine to HS
    if (diagResult.wearLevel === 'Critique') {
      onEditEquipement(targetEq.id, { statut: 'HS' });
    }

    playBeepSound('success');
    setScanMessage({
      text: `Ordre d'intervention (DI) créé avec succès pour ${targetEq.nom} ! Taux d'usure estimé : ${diagResult.wearPercentage}%.`,
      type: 'success'
    });
    setTimeout(() => setScanMessage(null), 4000);

    // Redirect to "Mes Interventions" tab
    setPortalTab('mes-bt');
  };


  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Load cameras if available
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          setCameras(videoDevices);
          if (videoDevices.length > 0) {
            setSelectedCameraId(videoDevices[0].deviceId);
          }
        })
        .catch(err => {
          console.warn("Could not enumerate camera devices:", err);
        });
    }
  }, []);

  // Initialize camera scanner
  useEffect(() => {
    let active = true;
    let qrScanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      if (!scannerActive) return;

      try {
        setCameraError(null);
        setIsScanningAnimate(true);

        // 1. If there's an existing active scanner, stop it first and wait for it to be fully stopped
        if (html5QrCodeRef.current) {
          const oldInstance = html5QrCodeRef.current;
          if (oldInstance.isScanning) {
            try {
              await oldInstance.stop();
            } catch (e) {
              console.warn("Error stopping old scanner:", e);
            }
          }
          html5QrCodeRef.current = null;
        }

        // 2. Add a small safety delay to let the browser/OS release the camera device resource
        await new Promise(resolve => setTimeout(resolve, 250));

        if (!active) return;

        const scannerId = "qr-scanner-element";
        qrScanner = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = qrScanner;

        const config = {
          fps: 15,
          qrbox: (width: number, height: number) => {
            const size = Math.min(width, height) * 0.75;
            return { width: size, height: size };
          }
        };

        const startConfig = selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: "environment" };

        await qrScanner.start(
          startConfig,
          config,
          (decodedText) => {
            if (active) {
              handleSuccessfulScan(decodedText);
            }
          },
          () => {} // Silent on noise
        );
      } catch (err) {
        console.error("Camera scanner startup failed:", err);
        if (active) {
          setCameraError("Impossible d'accéder au flux caméra. Vérifiez les permissions de votre navigateur ou utilisez le simulateur tactile.");
          setScannerActive(false);
        }
      }
    };

    startScanner();

    return () => {
      active = false;
      if (qrScanner) {
        const instance = qrScanner;
        if (instance.isScanning) {
          instance.stop().catch(err => console.warn("Cleanup scan stop error (safe to ignore):", err));
        }
      }
    };
  }, [scannerActive, selectedCameraId]);

  // Initialize piece camera scanner
  useEffect(() => {
    let active = true;
    let qrScanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      if (!pieceScannerActive) return;

      try {
        setPieceScannerError(null);

        // 1. If there's an existing active scanner, stop it first and wait for it to be fully stopped
        if (pieceQrScannerRef.current) {
          const oldInstance = pieceQrScannerRef.current;
          if (oldInstance.isScanning) {
            try {
              await oldInstance.stop();
            } catch (e) {
              console.warn("Error stopping old piece scanner:", e);
            }
          }
          pieceQrScannerRef.current = null;
        }

        // 2. Add a small safety delay to let the browser/OS release the camera device resource
        await new Promise(resolve => setTimeout(resolve, 250));

        if (!active) return;

        const scannerId = "piece-qr-scanner-element";
        qrScanner = new Html5Qrcode(scannerId);
        pieceQrScannerRef.current = qrScanner;

        const config = {
          fps: 15,
          qrbox: (width: number, height: number) => {
            const size = Math.min(width, height) * 0.75;
            return { width: size, height: size };
          }
        };

        const startConfig = selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: "environment" };

        await qrScanner.start(
          startConfig,
          config,
          (decodedText) => {
            if (active) {
              handleSuccessfulPieceScan(decodedText);
            }
          },
          () => {} // Silent on noise
        );
      } catch (err) {
        console.error("Piece scanner startup failed:", err);
        if (active) {
          setPieceScannerError("Impossible d'accéder au flux caméra pour pièces.");
          setPieceScannerActive(false);
        }
      }
    };

    startScanner();

    return () => {
      active = false;
      if (qrScanner) {
        const instance = qrScanner;
        if (instance.isScanning) {
          instance.stop().catch(err => console.warn("Cleanup piece scan stop error (safe to ignore):", err));
        }
      }
    };
  }, [pieceScannerActive, selectedCameraId]);

  // Handle successful scan of a piece's barcode/QR
  const handleSuccessfulPieceScan = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const foundPiece = pieces.find(p => 
      p.codeBarre.toUpperCase() === cleanCode ||
      p.id.toUpperCase() === cleanCode ||
      p.codeArticle.toUpperCase() === cleanCode
    );

    playBeepSound(foundPiece ? 'success' : 'error');

    if (foundPiece) {
      setConsumedPiecesList(prev => {
        const exists = prev.find(item => item.pieceId === foundPiece.id);
        let updated;
        if (exists) {
          updated = prev.map(item => 
            item.pieceId === foundPiece.id 
              ? { ...item, quantite: item.quantite + 1 }
              : item
          );
        } else {
          updated = [
            ...prev,
            {
              pieceId: foundPiece.id,
              designation: foundPiece.designation,
              quantite: 1,
              codeBarre: foundPiece.codeBarre,
              prix: foundPiece.prix
            }
          ];
        }
        // Sync crPieces text string
        const desc = updated.map(item => `${item.quantite}x ${item.designation} (${item.codeBarre})`).join(', ');
        setCrPieces(desc);
        return updated;
      });

      setScanMessage({
        text: `Pièce "${foundPiece.designation}" ajoutée avec succès !`,
        type: 'success'
      });
      setPieceScannerActive(false); // turn off camera after success
    } else {
      setScanMessage({
        text: `Code article/barre "${code}" inconnu dans le magasin.`,
        type: 'error'
      });
    }

    setTimeout(() => {
      setScanMessage(null);
    }, 4000);
  };

  const handleSimulatePieceScan = (barcode: string) => {
    handleSuccessfulPieceScan(barcode);
  };

  // Handle successful machine code resolution
  const handleSuccessfulScan = (code: string) => {
    let targetId = code.trim();
    
    // Quick regex extraction of common param names from anywhere in the string
    const eqMatch = code.match(/[?&](eq|machine|id|equipementId|data)=([^&?#]+)/i);
    if (eqMatch && eqMatch[2]) {
      targetId = decodeURIComponent(eqMatch[2]).trim();
    } else if (code.toLowerCase().includes('http://') || code.toLowerCase().includes('https://')) {
      // If it's a URL but didn't match the standard query parameters format (e.g. nested / path or other)
      try {
        const urlObj = new URL(code);
        // Fallback: If targetId is still the full code, try to check if the last path segment matches any equipment ID
        const pathname = urlObj.pathname;
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
          const lastSegment = segments[segments.length - 1];
          if (equipements.some(eq => eq.id.toLowerCase() === lastSegment.toLowerCase())) {
            targetId = lastSegment;
          }
        }
      } catch (e) {
        // Silent catch
      }
    }

    const cleanTargetId = targetId.trim().toUpperCase();

    // 1. Try to find by exact ID match (case-insensitive)
    let foundEq = equipements.find(eq => eq.id.toUpperCase() === cleanTargetId);

    // 2. Try exact name match
    if (!foundEq) {
      foundEq = equipements.find(eq => eq.nom.toUpperCase() === cleanTargetId);
    }

    // 3. Try exact type match
    if (!foundEq) {
      foundEq = equipements.find(eq => eq.type && eq.type.toUpperCase() === cleanTargetId);
    }

    // 4. Fallback search (exact substring contains or similar) only if no exact match found
    if (!foundEq) {
      foundEq = equipements.find(eq => 
        cleanTargetId.includes(eq.id.toUpperCase()) || 
        eq.id.toUpperCase().includes(cleanTargetId)
      );
    }

    // Visual beep animation trigger
    setIsScanningAnimate(false);
    setScannerActive(false);

    // Sound effect simulation (Web Audio API)
    playBeepSound(foundEq ? 'success' : 'error');

    if (foundEq) {
      setScannedMachineId(foundEq.id);
      setScanMessage({
        text: `Scanner : Équipement ${foundEq.nom} (${foundEq.id}) identifié !`,
        type: 'success'
      });
    } else {
      setScanMessage({
        text: `Code scan "${code}" non associé à une machine existante.`,
        type: 'error'
      });
    }

    setTimeout(() => {
      setScanMessage(null);
    }, 4500);
  };

  // Simulates scanning a specific machine from a click list (for computer developers/iframe bypass)
  const handleSimulateScan = (id: string) => {
    setIsScanningAnimate(true);
    setScannerActive(false);
    
    setTimeout(() => {
      const eq = equipements.find(e => e.id === id);
      playBeepSound('success');
      setIsScanningAnimate(false);
      
      if (eq) {
        setScannedMachineId(eq.id);
        setScanMessage({
          text: `Simulateur : Équipement ${eq.nom} identifié avec succès.`,
          type: 'success'
        });
      }
      setTimeout(() => setScanMessage(null), 3500);
    }, 800);
  };

  // Quick manual ID selection fallback
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode) return;
    handleSuccessfulScan(manualCode);
    setManualCode('');
  };

  // Web Audio Synth for professional Beep and Web Vibration haptic feedback
  const playBeepSound = (type: 'success' | 'error') => {
    // 1. Try to trigger haptic vibration feedback if supported
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        if (type === 'success') {
          // Double brief vibration pulse for successful scanning/identification
          navigator.vibrate([100, 50, 100]);
        } else {
          // Longer single vibration pulse for scan error
          navigator.vibrate(300);
        }
      }
    } catch (vibErr) {
      // Ignore vibration failures/permissions in sandboxed frames
      console.warn("Vibration feedback not allowed or not supported in this environment:", vibErr);
    }

    // 2. Play Web Audio API synthesized sound feedback
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // high note A5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime); // low note A3
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      // AudioContext could be blocked by autoplay policies
    }
  };

  // Action: Toggle Machine operating status
  const handleToggleStatus = (machineId: string) => {
    const eq = equipements.find(e => e.id === machineId);
    if (!eq) return;
    const newStatus = eq.statut === 'Opérationnel' ? 'HS' : 'Opérationnel';
    onEditEquipement(machineId, { statut: newStatus });
    playBeepSound('success');
  };

  // Action: Create quick simplified Bon de Travail (BT)
  const handleCreateQuickBT = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEquipementId) return;

    const eq = equipements.find(m => m.id === quickEquipementId);
    if (!eq) return;

    const yearShort = new Date().getFullYear().toString().substring(2, 4);
    const randCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const num = `BT-RAPIDE-${yearShort}-${randCode}`;

    onAddIntervention({
      typeDoc: 'BT',
      numero: num,
      equipementId: eq.id,
      equipementNom: eq.nom,
      atelier: eq.atelier,
      urgence: quickUrgence,
      typeProbleme: quickTypeProbleme,
      demandeur: quickDemandeur || selectedOperator,
      description: quickDescription || "Saisie rapide de bon de travail simplifié.",
      statut: 'En cours',
      operateur: selectedOperator,
      source: 'Saisie Rapide'
    });

    if (quickSetHS) {
      onEditEquipement(eq.id, { statut: 'HS' });
    }

    // Reset fields
    setQuickDescription('');
    setQuickUrgence('Moyenne');
    setQuickTypeProbleme('Mécanique');
    setQuickSetHS(false);
    setShowQuickSaisie(false);

    playBeepSound('success');

    setScanMessage({
      text: `Bon de travail rapide ${num} créé avec succès et assigné à ${selectedOperator} !`,
      type: 'success'
    });
    setTimeout(() => setScanMessage(null), 5000);
  };

  // Action: Submit quick Breakdown report (DI)
  const handleSubmitBreakdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedMachineId) return;

    const eq = equipements.find(e => e.id === scannedMachineId);
    if (!eq) return;

    // Create a Demande d'Intervention on behalf of selected operator
    onAddIntervention({
      typeDoc: 'DI',
      numero: `DI-${new Date().getFullYear().toString().substring(2, 4)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      equipementId: eq.id,
      equipementNom: eq.nom,
      atelier: eq.atelier,
      urgence: formUrgence,
      typeProbleme: formTypeProbleme,
      demandeur: `${selectedOperator} (Terrain)`,
      description: formDescription || "Signalement de panne rapide via QR Code terrain.",
      statut: 'En attente',
      operateur: selectedOperator
    });

    // Automatically set machine to HS if critical or requested
    onEditEquipement(eq.id, { statut: 'HS' });

    setFormDescription('');
    setActiveForm('none');
    playBeepSound('success');
    
    setScanMessage({
      text: `Panne signalée avec succès ! Ordre de travail DI créé. Machine passée Hors Service.`,
      type: 'success'
    });
    setTimeout(() => setScanMessage(null), 4000);
  };

  // Action: Record counter reading
  const handleSubmitCounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedMachineId) return;

    const eq = equipements.find(e => e.id === scannedMachineId);
    if (!eq) return;

    onAddCompteur({
      equipementId: eq.id,
      equipementNom: eq.nom,
      valeur: Number(formCompteurValeur),
      unite: formCompteurUnite
    });

    setFormCompteurValeur(0);
    setActiveForm('none');
    playBeepSound('success');

    setScanMessage({
      text: `Nouveau relevé de compteur (${formCompteurValeur} ${formCompteurUnite}) enregistré pour ${eq.nom}.`,
      type: 'success'
    });
    setTimeout(() => setScanMessage(null), 4000);
  };

  // Action: Submit quick troubleshooting (Dépannage Rapide)
  const handleSubmitDepannageRapide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedMachineId) return;

    const eq = equipements.find(e => e.id === scannedMachineId);
    if (!eq) return;

    const yearShort = new Date().getFullYear().toString().substring(2, 4);
    const randCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const num = `BT-DEP-${yearShort}-${randCode}`;

    onAddIntervention({
      typeDoc: 'BT',
      numero: num,
      equipementId: eq.id,
      equipementNom: eq.nom,
      atelier: eq.atelier,
      urgence: 'Basse',
      typeProbleme: depannageTypeProbleme,
      demandeur: `${selectedOperator} (Ronde Terrain)`,
      description: `[Dépannage Rapide] ${depannageDescription || 'Résolution directe au cours de la ronde.'}`,
      statut: 'Clôturé', // Directly closed/clôturé!
      compteRendu: depannageDescription || 'Dépannage rapide effectué au cours de la ronde d\'atelier.',
      tempsPasse: `${depannageTempsPasse} H`,
      piecesConso: depannagePieces || 'Néant',
      technicienCloture: selectedOperator,
      dateCloture: new Date().toISOString(),
      source: 'Ronde d\'atelier'
    });

    // Update equipment status based on operator selection
    onEditEquipement(eq.id, { statut: depannageStatutMachine });

    // Reset fields
    setDepannageDescription('');
    setDepannageTempsPasse('0.5');
    setIsCustomTemps(false);
    setDepannageTypeProbleme('Mécanique');
    setDepannagePieces('');
    setDepannageStatutMachine('Opérationnel');
    setActiveForm('none');
    playBeepSound('success');

    setScanMessage({
      text: `Dépannage rapide enregistré ! Bon de travail ${num} créé et clôturé directement.`,
      type: 'success'
    });
    setTimeout(() => setScanMessage(null), 5000);
  };

  // Handle closing an intervention (B.T.)
  const handleOpenCloseBTModal = (item: Intervention) => {
    setSelectedIntToClose(item);
    setCrComment('');
    setCrTime('1.0');
    setCrPieces('');
    setConsumedPiecesList([]);
    setPieceScannerActive(false);
    setHasSigned(false);
    setActiveForm('compteRendu');
  };

  // Setup drawing canvas listeners
  useEffect(() => {
    if (activeForm === 'compteRendu' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0f172a'; // slate-900
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
      }
    }
  }, [activeForm]);

  // Drawing mouse/touch handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSigned(true);

    const pos = getEventCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    e.preventDefault();
    const pos = getEventCoords(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const getEventCoords = (e: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleSubmitCloseBT = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntToClose) return;

    let signatureUrl = '';
    if (canvasRef.current && hasSigned) {
      signatureUrl = canvasRef.current.toDataURL('image/png');
    }

    // Deduct stock and add movements for each scanned/added piece
    consumedPiecesList.forEach(item => {
      const dbPiece = pieces.find(p => p.id === item.pieceId);
      if (dbPiece) {
        const newQty = Math.max(0, dbPiece.quantite - item.quantite);
        onEditPiece(dbPiece.id, { quantite: newQty });
        
        onAddMouvement({
          pieceId: dbPiece.id,
          pieceNom: dbPiece.designation,
          type: 'Sortie',
          quantite: item.quantite,
          intervenant: selectedOperator,
          commentaires: `Consommation auto via Portail Terrain (BT n°${selectedIntToClose.numero})`,
          destinationType: 'Equipement',
          destinationNom: selectedIntToClose.equipementNom,
          prixUnitaire: dbPiece.prix,
          dateStr: new Date().toISOString().split('T')[0]
        });
      }
    });

    // Save and close intervention (BT)
    onUpdateIntervention(selectedIntToClose.id, {
      statut: 'Clôturé',
      compteRendu: crComment || 'Maintenance curative réalisée. Matériel testé.',
      tempsPasse: `${crTime} H`,
      piecesConso: crPieces || 'Néant',
      technicienCloture: selectedOperator,
      signatureTechnicien: signatureUrl || undefined,
      dateCloture: new Date().toISOString()
    });

    // Also update machine status to Opérationnel on work order completion if it was offline
    onEditEquipement(selectedIntToClose.equipementId, { statut: 'Opérationnel' });

    setActiveForm('none');
    setSelectedIntToClose(null);
    setConsumedPiecesList([]);
    playBeepSound('success');

    setScanMessage({
      text: `Bon de travail ${selectedIntToClose.numero} clôturé et signé. ${consumedPiecesList.length > 0 ? `${consumedPiecesList.length} pièce(s) consommée(s) sortie(s) du stock.` : ''} Équipement remis en service.`,
      type: 'success'
    });
    setTimeout(() => setScanMessage(null), 5000);
  };

  // Filter current interventions for the logged in operator
  const myAssignedBTs = interventions.filter(int => {
    // Return true if technician is assigned and not closed
    const isAssigned = int.operateur === selectedOperator || int.technicienCloture === selectedOperator;
    const isPending = int.statut !== 'Clôturé' && int.statut !== 'Soldé';
    return isAssigned && isPending;
  });

  const selectedMachine = scannedMachineId ? equipements.find(e => e.id === scannedMachineId) : null;
  const selectedMachineBTs = selectedMachine ? interventions.filter(i => i.equipementId === selectedMachine.id) : [];

  return (
    <div className="space-y-6">
      {/* BRAND & HEADER PORTAL CODES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-primary-900 p-5 rounded-2xl border border-primary-100 dark:border-primary-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-accent-orange/10 rounded-xl text-accent-orange">
            <Smartphone size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-primary-900 dark:text-white flex flex-wrap items-center gap-2">
              Portail Terrain Mobile
              <ModuleHelp moduleId="portail-terrain" />
              <span className="text-[10px] px-2 py-0.5 bg-accent-orange text-white font-black tracking-widest uppercase rounded">OPERATEUR</span>
            </h1>
            <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">
              Interface terrain de diagnostic rapide par caméra, signalement de pannes et gestion des BT assignés.
            </p>
          </div>
        </div>

        {/* PROFILE ACTIF / CONNECTÉ */}
        <div className="flex items-center gap-3 bg-primary-50 dark:bg-primary-950 p-2.5 rounded-xl border border-primary-100 dark:border-primary-800 w-full md:w-auto">
          <User size={16} className="text-accent-orange shrink-0" />
          <div className="flex-1 text-left min-w-[140px]">
            <span className="text-[9px] text-primary-400 block font-semibold uppercase">Technicien Connecté :</span>
            <div className="relative inline-block w-full">
              <select
                value={selectedOperator}
                onChange={e => setSelectedOperator(e.target.value)}
                className="font-bold text-xs text-primary-800 dark:text-primary-100 bg-transparent border-none p-0 focus:ring-0 cursor-pointer w-full pr-4"
              >
                {[...settings.listes.operateurs].sort((a,b) => a.localeCompare(b)).map(o => (
                  <option key={o} value={o} className="dark:bg-primary-900">{o}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK IN-PORTAL TABS */}
      <div className="flex border-b border-primary-200 dark:border-primary-800 gap-1 overflow-x-auto whitespace-nowrap scrollbar-none pb-1">
        <button
          onClick={() => setPortalTab('scanner')}
          className={`px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 -mb-[2px] shrink-0 whitespace-nowrap ${portalTab === 'scanner' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-500 hover:text-primary-800'}`}
        >
          <QrCode size={14} />
          Scanner de Codes Machines
        </button>
        <button
          onClick={() => setPortalTab('mes-bt')}
          className={`px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 -mb-[2px] relative shrink-0 whitespace-nowrap ${portalTab === 'mes-bt' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-500 hover:text-primary-800'}`}
        >
          <Wrench size={14} />
          Mes Interventions / BT
          {myAssignedBTs.length > 0 && (
            <span className="h-4 min-w-[16px] px-1 bg-accent-orange text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">
              {myAssignedBTs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setPortalTab('etiquettes')}
          className={`px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 -mb-[2px] shrink-0 whitespace-nowrap ${portalTab === 'etiquettes' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-500 hover:text-primary-800'}`}
        >
          <Printer size={14} />
          Générer Étiquettes QR
        </button>
        <button
          id="portal-tab-auto-diag"
          onClick={() => setPortalTab('auto-diag')}
          className={`px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 -mb-[2px] shrink-0 whitespace-nowrap ${portalTab === 'auto-diag' ? 'border-accent-orange text-accent-orange' : 'border-transparent text-primary-500 hover:text-primary-800'}`}
        >
          <Sparkles size={14} className="text-indigo-500 animate-pulse" />
          Auto-Diagnostic IA
        </button>
      </div>

      {/* NOTIFICATIONS HUD */}
      <AnimatePresence>
        {scanMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg ${scanMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'}`}
          >
            {scanMessage.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> : <XCircle size={16} className="text-red-500 shrink-0" />}
            <span>{scanMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------- VIEW 1: SCANNER TAB -------------------- */}
      {portalTab === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* CAMERA FEED & MANUAL INPUTS */}
          <div className="lg:col-span-5 space-y-6">
            <div className="card relative overflow-hidden flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-primary-200 dark:border-primary-800">
              
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1 text-[9px] font-bold text-primary-400 bg-primary-100 dark:bg-primary-850 px-2 py-1 rounded">
                <Activity size={10} className="text-accent-orange animate-pulse" />
                LECTEUR DE CAMERA LIVE
              </div>

              {/* Holographic glowing scan box */}
              <div className="relative w-full aspect-square max-w-[280px] bg-primary-950 rounded-2xl border-4 border-slate-900 flex flex-col items-center justify-center overflow-hidden shadow-2xl mt-4">
                
                {/* Real Html5 Scanner Bind Div */}
                <div 
                  id="qr-scanner-element" 
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${scannerActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                />

                {/* Simulated scan placeholder screen when inactive */}
                {!scannerActive && (
                  <div className="flex flex-col items-center p-6 space-y-3 text-slate-400 z-10">
                    <QrCode size={56} className="text-primary-600 dark:text-primary-500 animate-pulse" />
                    <p className="text-xs max-w-[200px] text-primary-400">
                      Visez un code QR collé sur le châssis d'une machine industrielle.
                    </p>
                    <button
                      onClick={() => setScannerActive(true)}
                      className="btn-primary flex items-center gap-1.5 py-2 px-4 shadow-xl shadow-accent-orange/20"
                    >
                      <Camera size={14} />
                      Démarrer Caméra
                    </button>
                  </div>
                )}

                {/* Laser Scanning Line Animation */}
                {isScanningAnimate && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-accent-orange shadow-[0_0_12px_4px_rgba(251,113,133,0.8)] animate-bounce z-20" />
                )}

                {/* Reticle Target Sight Marks */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-accent-orange pointer-events-none z-20" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-accent-orange pointer-events-none z-20" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-accent-orange pointer-events-none z-20" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-accent-orange pointer-events-none z-20" />
              </div>

              {/* Camera selection switcher if active */}
              {scannerActive && (
                <div className="w-full max-w-[280px] mt-4 space-y-3 z-10">
                  {cameras.length > 1 && (
                    <div className="text-left">
                      <label className="text-[10px] text-primary-400 font-bold block mb-1">Source Caméra :</label>
                      <select
                        value={selectedCameraId}
                        onChange={e => setSelectedCameraId(e.target.value)}
                        className="text-xs p-1.5 rounded-lg border w-full dark:bg-primary-900"
                      >
                        {[...cameras].sort((a, b) => (a.label || '').localeCompare(b.label || '')).map(cam => (
                          <option key={cam.deviceId} value={cam.deviceId}>{cam.label || `Caméra ${cameras.indexOf(cam) + 1}`}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={() => setScannerActive(false)}
                    className="w-full text-xs font-bold text-red-500 hover:text-red-600 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 p-2 rounded-xl transition"
                  >
                    Arrêter Scanner
                  </button>
                </div>
              )}

              {/* Camera permission/browser blocking alert */}
              {cameraError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl mt-4 max-w-[320px] dark:bg-red-950/20 dark:text-red-300 dark:border-red-900">
                  <p className="font-bold flex items-center gap-1"><AlertTriangle size={12} /> Problème de caméra</p>
                  <p className="mt-1 text-[11px] leading-relaxed">{cameraError}</p>
                </div>
              )}
            </div>

            {/* MANUAL FALLBACK FORM */}
            <div className="card space-y-3">
              <h3 className="text-xs font-bold uppercase text-primary-400">
                Saisie manuelle ou recherche
              </h3>
              <form onSubmit={handleManualSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: EQ-8J2K ou Pompe"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  className="text-xs p-2 rounded-xl border flex-1 dark:bg-primary-900 dark:border-primary-800"
                />
                <button
                  type="submit"
                  className="btn-secondary flex items-center justify-center p-2.5 rounded-xl shrink-0"
                >
                  <Search size={14} />
                </button>
              </form>
            </div>

            {/* SIMULATOR CLICK CODES - ESSENTIAL FOR MOCKING IN SANDBOX */}
            <div className="card space-y-3.5">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase text-primary-800 dark:text-primary-200 flex items-center gap-1">
                  <Sparkles size={12} className="text-accent-orange" />
                  Simulateur Tactile (Codes Démo)
                </h3>
                <span className="text-[10px] bg-primary-100 dark:bg-primary-800 font-bold px-2 py-0.5 rounded text-primary-500">
                  Sandbox Bypass
                </span>
              </div>
              <p className="text-[10.5px] text-primary-500 leading-relaxed">
                Cliquez sur l'un des matériels de l'usine pour simuler le scan laser de son étiquette QR collée en atelier.
              </p>
              
              <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
                {equipements.slice(0, 6).map(eq => (
                  <button
                    key={eq.id}
                    onClick={() => handleSimulateScan(eq.id)}
                    className="p-2 text-left text-xs bg-primary-50/50 dark:bg-primary-950/30 hover:bg-accent-orange/10 rounded-xl border border-primary-100 dark:border-primary-800 flex items-center justify-between group transition"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-primary-800 dark:text-primary-200 group-hover:text-accent-orange truncate">{eq.nom}</p>
                      <span className="text-[10px] text-primary-400 font-mono font-medium">{eq.id} · {eq.atelier}</span>
                    </div>
                    <span className="text-[9px] font-bold text-accent-orange bg-white dark:bg-primary-900 px-2 py-0.5 rounded border border-primary-200 dark:border-primary-800 group-hover:bg-accent-orange group-hover:text-white transition shadow-sm">
                      MOCK SCAN
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* IDENTIFIED MACHINE DETAIL VIEW & QUICK ACTION SHEET */}
          <div ref={machineDetailsRef} className="lg:col-span-7 space-y-6">
            <AnimatePresence mode="wait">
              {selectedMachine ? (
                <motion.div
                  key={selectedMachine.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-6"
                >
                  
                  {/* MACHINE BANNER STATUS */}
                  <div className="card relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-primary-900 p-5 rounded-2xl border-l-4 border-l-accent-orange">
                    <div className="min-w-0">
                      <span className="text-[9px] text-accent-orange font-bold uppercase tracking-wider block">Équipement Identifié</span>
                      <h2 className="text-xl font-display font-bold text-primary-900 dark:text-white mt-0.5">
                        {selectedMachine.nom}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-primary-400 font-mono mt-1 uppercase">
                        <span>ID: {selectedMachine.id}</span>
                        <span>•</span>
                        <span>Constructeur: {selectedMachine.marque}</span>
                        <span>•</span>
                        <span>Atelier: {selectedMachine.atelier}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${selectedMachine.statut === 'Opérationnel' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'}`}>
                        {selectedMachine.statut}
                      </span>
                      <button
                        onClick={() => handleToggleStatus(selectedMachine.id)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-xl transition ${selectedMachine.statut === 'Opérationnel' ? 'border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30' : 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950/30'}`}
                      >
                        {selectedMachine.statut === 'Opérationnel' ? 'Arrêt Panne (HS)' : 'Remettre Service'}
                      </button>
                    </div>
                  </div>

                  {/* QUICK DIAGNOSTICS & SPECS CONTAINER */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Character specs */}
                    <div className="card p-4 space-y-3.5">
                      <h4 className="text-xs font-bold uppercase text-primary-800 dark:text-primary-200 flex items-center gap-1.5 border-b pb-2">
                        <Activity size={13} className="text-accent-orange" />
                        Caractéristiques Machine
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-primary-400 block">Modèle / Type :</span>
                          <span className="font-bold text-primary-800 dark:text-primary-200 truncate block">{selectedMachine.type || "-"}</span>
                        </div>
                        <div>
                          <span className="text-primary-400 block">N° Série :</span>
                          <span className="font-bold text-primary-800 dark:text-primary-200 font-mono truncate block">{selectedMachine.serie || "-"}</span>
                        </div>
                        <div>
                          <span className="text-primary-400 block">Importance :</span>
                          <span className={`font-bold ${selectedMachine.critique ? 'text-red-500' : 'text-primary-500'}`}>{selectedMachine.critique ? 'CRITIQUE (Seuil A)' : 'Standard'}</span>
                        </div>
                        <div>
                          <span className="text-primary-400 block">Garantie :</span>
                          <span className="font-bold text-primary-800 dark:text-primary-200">{formatDateSafely(selectedMachine.garantie, 'Expirée')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stock rechanges hints */}
                    <div className="card p-4 space-y-3.5">
                      <h4 className="text-xs font-bold uppercase text-primary-800 dark:text-primary-200 flex items-center gap-1.5 border-b pb-2">
                        <Layers size={13} className="text-accent-orange" />
                        Pièces de Rechange Assignées
                      </h4>
                      <p className="text-[11px] text-primary-500">
                        Pièces détachées référencées en magasin magasinier pour cet équipement :
                      </p>
                      {selectedMachine.piecesAffectees ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedMachine.piecesAffectees.split(',').map((p, index) => (
                            <span key={index} className="text-[10px] px-2 py-0.5 bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300 rounded font-semibold">
                              {p.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-primary-400 italic">Aucune liaison spécifique définie.</span>
                      )}
                    </div>

                  </div>

                  {/* PORTAL INTERACTIVE PANEL TRIGGERS */}
                  <div className="card space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary-800 dark:text-primary-200 border-b pb-2">
                      Actions rapides terrain
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      
                      {/* Action 1: Signaler une Panne (DI) */}
                      <button
                        onClick={() => {
                          setActiveForm(activeForm === 'panne' ? 'none' : 'panne');
                          setFormDescription('');
                        }}
                        className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 group transition ${activeForm === 'panne' ? 'bg-amber-50 dark:bg-primary-850 border-amber-500 text-amber-800 dark:text-amber-300' : 'bg-white dark:bg-primary-900 border-primary-100 dark:border-primary-800 hover:border-amber-400 text-primary-700 dark:text-primary-200 hover:text-amber-500'}`}
                      >
                        <AlertTriangle size={20} className="text-amber-500 animate-pulse" />
                        <span className="text-xs font-bold">Signaler Panne (D.I.)</span>
                      </button>

                      {/* Action 2: Dépannage Rapide (Ronde terrain) */}
                      <button
                        onClick={() => {
                          setActiveForm(activeForm === 'depannage_rapide' ? 'none' : 'depannage_rapide');
                        }}
                        className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 group transition ${activeForm === 'depannage_rapide' ? 'bg-indigo-50 dark:bg-primary-850 border-indigo-500 text-indigo-800 dark:text-indigo-300' : 'bg-white dark:bg-primary-900 border-primary-100 dark:border-primary-800 hover:border-indigo-400 text-primary-700 dark:text-primary-200 hover:text-indigo-500'}`}
                      >
                        <Zap size={20} className="text-indigo-500 animate-pulse" />
                        <span className="text-xs font-bold">Dépannage Rapide</span>
                      </button>

                      {/* Action 3: Faire un Relevé Compteur */}
                      <button
                        onClick={() => {
                          setActiveForm(activeForm === 'compteur' ? 'none' : 'compteur');
                        }}
                        className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 group transition ${activeForm === 'compteur' ? 'bg-emerald-50 dark:bg-primary-850 border-emerald-500 text-emerald-800 dark:text-emerald-300' : 'bg-white dark:bg-primary-900 border-primary-100 dark:border-primary-800 hover:border-emerald-400 text-primary-700 dark:text-primary-200 hover:text-emerald-500'}`}
                      >
                        <Clock size={20} className="text-emerald-500" />
                        <span className="text-xs font-bold">Relevé de Compteur</span>
                      </button>

                      {/* Action 4: Consulter l'Historique (Fait défiler/Montre plus bas) */}
                      <a
                        href="#hist-bt-sec"
                        className="p-3 bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800 rounded-2xl text-center flex flex-col items-center justify-center gap-2 text-primary-700 dark:text-primary-200 hover:border-accent-orange hover:text-accent-orange transition"
                      >
                        <History size={20} className="text-accent-orange" />
                        <span className="text-xs font-bold">Historique BT ({selectedMachineBTs.length})</span>
                      </a>

                    </div>

                    {/* DYNAMIC FORMS ACCORDION EXPANSIONS */}
                    <AnimatePresence>
                      
                      {/* FORM A: BREAKDOWN DEMAND (DI) */}
                      {activeForm === 'panne' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-amber-50/50 dark:bg-primary-950/30 p-4 rounded-xl border border-amber-200 dark:border-primary-800 space-y-4 text-xs"
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-amber-800 dark:text-amber-300 uppercase">Créer Demande d'Intervention Curative</h4>
                            <button onClick={() => setActiveForm('none')} className="text-primary-400 hover:text-primary-600 font-bold">Annuler</button>
                          </div>
                          
                          <form onSubmit={handleSubmitBreakdown} className="space-y-3">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="font-semibold block">Description précise de l'avarie :</label>
                                <SaisieVocale
                                  compact
                                  onTranscript={(text) => {
                                    setFormDescription(prev => prev ? `${prev} ${text}` : text);
                                  }}
                                />
                              </div>
                              <textarea
                                required
                                value={formDescription}
                                onChange={e => setFormDescription(e.target.value)}
                                placeholder="Symptômes constatés : bruits suspects, échauffement, fuite d'huile, arrêt total..."
                                rows={3}
                                className="w-full p-2.5 bg-white dark:bg-primary-900 border rounded-xl"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="font-semibold block mb-1">Urgence curative :</label>
                                <select
                                  value={formUrgence}
                                  onChange={e => setFormUrgence(e.target.value)}
                                  className="w-full p-2 bg-white dark:bg-primary-900 border rounded-xl"
                                >
                                  <option value="Basse">Basse (Simple observation)</option>
                                  <option value="Haute">Haute (Ligne bloquée / Panne majeure)</option>
                                  <option value="Moyenne">Moyenne (Ralentissement de cadence)</option>
                                </select>
                              </div>

                              <div>
                                <label className="font-semibold block mb-1">Technologie affectée :</label>
                                <select
                                  value={formTypeProbleme}
                                  onChange={e => setFormTypeProbleme(e.target.value)}
                                  className="w-full p-2 bg-white dark:bg-primary-900 border rounded-xl"
                                >
                                  <option value="Automatisme">Automatisme / CN</option>
                                  <option value="Électrique">Électrique</option>
                                  <option value="Hydraulique">Hydraulique</option>
                                  <option value="Mécanique">Mécanique</option>
                                  <option value="Pneumatique">Pneumatique</option>
                                </select>
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="w-full btn-primary bg-amber-600 hover:bg-amber-700 text-white font-bold p-2.5 rounded-xl flex items-center justify-center gap-1"
                            >
                              <AlertTriangle size={14} />
                              Créer DI & Passer en Hors-Service (HS)
                            </button>
                          </form>
                        </motion.div>
                      )}

                      {/* FORM B: COUNTER VALUE READING */}
                      {activeForm === 'compteur' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-emerald-50/50 dark:bg-primary-950/30 p-4 rounded-xl border border-emerald-200 dark:border-primary-800 space-y-4 text-xs"
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-emerald-800 dark:text-emerald-300 uppercase">Mettre à jour le compteur de fonctionnement</h4>
                            <button onClick={() => setActiveForm('none')} className="text-primary-400 hover:text-primary-600 font-bold">Annuler</button>
                          </div>

                          <form onSubmit={handleSubmitCounter} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="font-semibold block mb-1">Valeur mesurée (Compteur) :</label>
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  value={formCompteurValeur}
                                  onChange={e => setFormCompteurValeur(Number(e.target.value))}
                                  className="w-full p-2 bg-white dark:bg-primary-900 border rounded-xl"
                                />
                              </div>

                              <div>
                                <label className="font-semibold block mb-1">Unité de mesure :</label>
                                <select
                                  value={formCompteurUnite}
                                  onChange={e => setFormCompteurUnite(e.target.value)}
                                  className="w-full p-2 bg-white dark:bg-primary-900 border rounded-xl"
                                >
                                  <option value="Cycles">Cycles (cps)</option>
                                  <option value="Heures">Heures (h)</option>
                                  <option value="Kilomètres">Kilomètres (km)</option>
                                  <option value="Pièces Produites">Pièces Produites (pcs)</option>
                                </select>
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="w-full btn-primary bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2.5 rounded-xl flex items-center justify-center gap-1"
                            >
                              <CheckCircle2 size={14} />
                              Sauvegarder le relevé machine
                            </button>
                          </form>
                        </motion.div>
                      )}

                      {/* FORM C: DÉPANNAGE RAPIDE */}
                      {activeForm === 'depannage_rapide' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-indigo-50/50 dark:bg-primary-950/30 p-4 rounded-xl border border-indigo-200 dark:border-primary-800 space-y-4 text-xs"
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-indigo-800 dark:text-indigo-300 uppercase flex items-center gap-1.5">
                              <Zap size={14} className="text-indigo-500 animate-pulse" />
                              Dépannage Rapide en Ronde (Saisie Directe)
                            </h4>
                            <button type="button" onClick={() => setActiveForm('none')} className="text-primary-400 hover:text-primary-600 font-bold">Annuler</button>
                          </div>

                          <form onSubmit={handleSubmitDepannageRapide} className="space-y-3">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="font-semibold block">Travail / Action corrective effectué :</label>
                                <SaisieVocale
                                  compact
                                  onTranscript={(text) => {
                                    setDepannageDescription(prev => prev ? `${prev} ${text}` : text);
                                  }}
                                />
                              </div>
                              <textarea
                                required
                                value={depannageDescription}
                                onChange={e => setDepannageDescription(e.target.value)}
                                placeholder="Ex: Resserrage des connecteurs, appoint d'huile hydraulique, remplacement fusible, nettoyage cellule..."
                                rows={3}
                                className="w-full p-2.5 bg-white dark:bg-primary-900 border rounded-xl"
                              />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="font-semibold block mb-1">Temps passé :</label>
                                {!isCustomTemps ? (
                                  <select
                                    value={depannageTempsPasse}
                                    onChange={e => {
                                      if (e.target.value === 'custom') {
                                        setIsCustomTemps(true);
                                        setDepannageTempsPasse('');
                                      } else {
                                        setDepannageTempsPasse(e.target.value);
                                      }
                                    }}
                                    className="w-full p-2 bg-white dark:bg-primary-900 border rounded-xl"
                                  >
                                    <option value="0.25">15 min (0.25 H)</option>
                                    <option value="0.5">30 min (0.5 H)</option>
                                    <option value="0.75">45 min (0.75 H)</option>
                                    <option value="1.0">1 h (1.0 H)</option>
                                    <option value="1.5">1h30 (1.5 H)</option>
                                    <option value="2.0">2 h (2.0 H)</option>
                                    <option value="3.0">3 h (3.0 H)</option>
                                    <option value="custom">Autre (Saisie libre...)</option>
                                  </select>
                                ) : (
                                  <div className="flex gap-1.5 items-center">
                                    <input
                                      type="text"
                                      required
                                      autoFocus
                                      value={depannageTempsPasse}
                                      onChange={e => setDepannageTempsPasse(e.target.value)}
                                      placeholder="Ex: 1.5 ou 1h30"
                                      className="w-full p-2 bg-white dark:bg-primary-900 border rounded-xl"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsCustomTemps(false);
                                        setDepannageTempsPasse('0.5');
                                      }}
                                      className="p-2 bg-primary-100 hover:bg-primary-200 dark:bg-primary-800 dark:hover:bg-primary-700 text-primary-700 dark:text-primary-200 rounded-xl font-bold"
                                      title="Retour"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div>
                                <label className="font-semibold block mb-1">Technologie :</label>
                                <select
                                  value={depannageTypeProbleme}
                                  onChange={e => setDepannageTypeProbleme(e.target.value)}
                                  className="w-full p-2 bg-white dark:bg-primary-900 border rounded-xl"
                                >
                                  <option value="Automatisme">Automatisme / CN</option>
                                  <option value="Électrique">Électrique</option>
                                  <option value="Hydraulique">Hydraulique</option>
                                  <option value="Mécanique">Mécanique</option>
                                  <option value="Pneumatique">Pneumatique</option>
                                </select>
                              </div>

                              <div className="col-span-2 sm:col-span-1">
                                <label className="font-semibold block mb-1">Statut final machine :</label>
                                <select
                                  value={depannageStatutMachine}
                                  onChange={e => setDepannageStatutMachine(e.target.value as 'Opérationnel' | 'HS')}
                                  className="w-full p-2 bg-white dark:bg-primary-900 border rounded-xl font-bold"
                                >
                                  <option value="Opérationnel">Opérationnel</option>
                                  <option value="HS">Hors Service (HS)</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="font-semibold block mb-1">Pièces consommées (optionnel) :</label>
                              <input
                                type="text"
                                value={depannagePieces}
                                onChange={e => setDepannagePieces(e.target.value)}
                                placeholder="Ex: fusible 10A, joint torique 22mm, huile Mobil..."
                                className="w-full p-2 bg-white dark:bg-primary-900 border rounded-xl"
                              />
                            </div>

                            <button
                              type="submit"
                              className="w-full btn-primary bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2.5 rounded-xl flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle size={14} />
                              Enregistrer l'Intervention & Clôturer le BT
                            </button>
                          </form>
                        </motion.div>
                      )}

                    </AnimatePresence>
                  </div>

                  {/* PAST INTERVENTIONS SECTION ON MACHINE */}
                  <div id="hist-bt-sec" className="card space-y-3">
                    <h3 className="text-xs font-bold uppercase text-primary-800 dark:text-primary-200">
                      Historique d'interventions sur cette machine ({selectedMachineBTs.length})
                    </h3>

                    {selectedMachineBTs.length === 0 ? (
                      <p className="text-xs text-primary-400 italic py-2">Aucun bon de travail ou demande répertorié pour cette machine.</p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {selectedMachineBTs.map(bt => (
                          <div
                            key={bt.id}
                            className="p-2.5 text-xs bg-primary-50/50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-800 rounded-xl flex items-center justify-between"
                          >
                            <div>
                              <p className="font-semibold text-primary-800 dark:text-primary-200">
                                <span className={`mr-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${bt.typeDoc === 'DI' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>{bt.typeDoc}</span>
                                {bt.numero} - {bt.description.substring(0, 45)}...
                              </p>
                              <span className="text-[10px] text-primary-400 block mt-1">Crée le {formatDateSafely(bt.dateCreation, 'N/A')} par {bt.demandeur}</span>
                            </div>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${bt.statut === 'Clôturé' ? 'bg-emerald-100 text-emerald-800' : 'bg-primary-100 text-primary-800'}`}>
                              {bt.statut}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </motion.div>
              ) : (
                <div className="card h-full min-h-[420px] flex flex-col items-center justify-center text-center text-primary-400 p-8 space-y-4">
                  <div className="p-4 bg-primary-50 dark:bg-primary-950 rounded-full text-primary-300">
                    <QrCode size={48} className="animate-pulse text-accent-orange" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-primary-800 dark:text-primary-200">
                    Aucune Machine Identifiée
                  </h3>
                  <p className="text-xs max-w-[280px] text-primary-500 leading-relaxed">
                    Veuillez démarrer la caméra de votre mobile pour scanner un QR code ou cliquez sur un équipement de démo dans le simulateur à gauche.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>
      )}

      {/* -------------------- VIEW 2: ASSIGNED BT / WORK ORDERS -------------------- */}
      {portalTab === 'mes-bt' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-primary-800 dark:text-primary-200">
                Ordres de Travail Actifs : {selectedOperator}
              </h3>
              <p className="text-[11px] text-primary-500">
                Bons de travail, pannes curatives et plannings préventifs assignés à votre profil.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 bg-accent-orange text-white rounded">
              {myAssignedBTs.length} Bons à Réaliser
            </span>
          </div>

          {myAssignedBTs.length === 0 ? (
            <div className="card text-center py-12 text-primary-400 space-y-3">
              <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold">Toutes vos interventions ont été traitées !</p>
              <p className="text-[11px] text-primary-400">Scannez une machine pour ouvrir un nouveau bon de travail ou signaler une avarie.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myAssignedBTs.map(bt => (
                <div
                  key={bt.id}
                  className="card border border-primary-100 dark:border-primary-800 hover:border-accent-orange/30 transition shadow-sm flex flex-col justify-between space-y-4 relative"
                >
                  
                  {/* BT Card Header */}
                  <div>
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${bt.typeDoc === 'DI' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                        {bt.typeDoc === 'DI' ? 'Demande curative (DI)' : 'Bon de Travail (BT)'}
                      </span>
                      <span className="text-[11px] text-primary-400 font-mono font-medium">{bt.numero}</span>
                    </div>

                    <h4 className="font-display font-bold text-sm text-primary-900 dark:text-white mt-2 leading-snug">
                      Machine : {bt.equipementNom}
                    </h4>
                    <p className="text-xs text-primary-500 mt-1 line-clamp-3 leading-relaxed">
                      <strong>Description :</strong> {bt.description}
                    </p>
                  </div>

                  {/* BT Details Specifications */}
                  <div className="bg-primary-50/50 dark:bg-primary-950/20 p-2.5 rounded-xl border border-primary-100 dark:border-primary-850 grid grid-cols-2 gap-2 text-[10.5px]">
                    <div>
                      <span className="text-primary-400">Atelier :</span>
                      <span className="font-bold text-primary-800 dark:text-primary-200 block truncate">{bt.atelier}</span>
                    </div>
                    <div>
                      <span className="text-primary-400">Urgence :</span>
                      <span className={`font-bold block ${bt.urgence === 'Haute' ? 'text-red-500' : 'text-primary-500'}`}>{bt.urgence}</span>
                    </div>
                    <div>
                      <span className="text-primary-400">Date d'émission :</span>
                      <span className="font-bold text-primary-800 dark:text-primary-200 block">{formatDateSafely(bt.dateCreation, 'N/A')}</span>
                    </div>
                    <div>
                      <span className="text-primary-400">Statut :</span>
                      <span className="font-bold text-accent-orange block">{bt.statut}</span>
                    </div>
                  </div>

                  {/* Action row to complete */}
                  <div className="flex justify-end gap-2 border-t pt-3 border-primary-100 dark:border-primary-850">
                    <button
                      onClick={() => handleOpenCloseBTModal(bt)}
                      className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1 bg-accent-orange hover:bg-amber-600 text-white"
                    >
                      <FileSignature size={12} />
                      Saisir Compte-Rendu & Clôturer
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------- VIEW 3: BARCODE QR GENERATOR -------------------- */}
      {portalTab === 'etiquettes' && (
        <div className="card space-y-4">
          <div>
            <h3 className="text-sm font-bold text-primary-800 dark:text-primary-200 flex items-center gap-1.5">
              <Printer size={16} className="text-accent-orange" />
              Générer et Imprimer des Étiquettes QR Machines
            </h3>
            <p className="text-xs text-primary-500">
              Chaque machine possède un identifiant unique (ID) encodé en QR code. Imprimez ces étiquettes pour les coller directement sur le matériel en usine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipements.map(eq => {
              const smartData = typeof window !== 'undefined' 
                ? `${window.location.origin}${window.location.pathname}#/portal-terrain?eq=${eq.id}` 
                : eq.id;
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=0f172a&data=${encodeURIComponent(smartData)}`;
              return (
                <div
                  key={eq.id}
                  className="bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 relative group"
                >
                  <div className="absolute top-2 right-2 text-[8px] bg-primary-100 dark:bg-primary-800 font-semibold px-2 py-0.5 rounded font-mono text-primary-500">
                    {eq.id}
                  </div>
                  
                  {/* Clean Mock Label */}
                  <div className="p-3 bg-white border border-slate-900 rounded-lg shadow-sm flex flex-col items-center max-w-[150px]">
                    <img
                      src={qrUrl}
                      alt={`QR Code ${eq.nom}`}
                      referrerPolicy="no-referrer"
                      className="w-28 h-28 object-contain"
                    />
                    <div className="mt-1">
                      <p className="text-[8px] text-slate-900 font-extrabold tracking-wider truncate max-w-[120px] uppercase font-mono">{eq.nom}</p>
                      <p className="text-[7px] text-slate-500 font-mono tracking-widest">{eq.id}</p>
                    </div>
                  </div>

                  <div className="text-xs w-full">
                    <p className="font-bold text-primary-800 dark:text-primary-100 truncate">{eq.nom}</p>
                    <span className="text-[10px] text-primary-400">{eq.atelier}</span>
                  </div>

                  <button
                    onClick={() => {
                      // Simulates printing label by opening in new tab or mock popup
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Etiquette de Maintenance - GMAO PRO</title>
                              <style>
                                body { font-family: 'Helvetica Neue', Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafafa; }
                                .label { border: 2px solid #0f172a; padding: 25px; background: white; border-radius: 12px; text-align: center; width: 220px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                                .qr { width: 180px; height: 180px; }
                                .title { font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-top: 15px; color: #0f172a; }
                                .id { font-family: monospace; font-size: 11px; letter-spacing: 2px; color: #fb7185; font-weight: bold; margin-top: 4px; }
                                .footer { font-size: 8px; color: #94a3b8; font-weight: bold; text-transform: uppercase; margin-top: 15px; border-top: 1px dashed #e2e8f0; padding-top: 10px; }
                              </style>
                            </head>
                            <body>
                              <div class="label">
                                <img class="qr" src="${qrUrl}" />
                                <div class="title">${eq.nom}</div>
                                <div class="id">${eq.id}</div>
                                <div class="footer">GMAO PRO - ETAPE DE MAINTENANCE VALIDÉE</div>
                              </div>
                              <script>window.onload = function() { window.print(); }</script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      } else {
                        alert("Le bloqueur de fenêtres pop-up empêche l'ouverture de l'étiquette d'impression. Veuillez l'autoriser.");
                      }
                    }}
                    className="w-full text-xs font-semibold py-1.5 border border-primary-200 hover:border-accent-orange dark:border-primary-800 rounded-xl hover:text-accent-orange transition"
                  >
                    Imprimer Étiquette
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------- VIEW 4: AUTO-DIAGNOSTIC IA -------------------- */}
      {portalTab === 'auto-diag' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/10 via-purple-900/5 to-transparent p-5 rounded-2xl border border-indigo-100 dark:border-indigo-950">
            <div>
              <h3 className="text-sm font-bold text-primary-800 dark:text-primary-200 flex items-center gap-1.5 font-display">
                <Sparkles size={16} className="text-indigo-500 animate-pulse" />
                Auto-Diagnostic d'Usure Visuelle par IA
              </h3>
              <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
                Utilisez la caméra de votre appareil ou téléversez une photo pour analyser l'usure, la fatigue de surface ou les anomalies d'un organe mécanique, puis générez instantanément l'action corrective recommandée.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900 font-mono">
                Propulsé par Gemini 3.5 Flash
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN: CAPTURE AND PARAMETERS */}
            <div className="lg:col-span-5 space-y-5">
              <div className="card space-y-4">
                <div className="border-b border-primary-100 dark:border-primary-800 pb-3">
                  <h4 className="font-bold text-xs text-primary-800 dark:text-primary-200 flex items-center gap-2">
                    <Layers size={14} className="text-indigo-500" />
                    1. Configuration & Capture
                  </h4>
                </div>

                {/* Dropdown 1: Select Equipment */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-primary-600 dark:text-primary-400">
                    Équipement à analyser : <span className="text-red-500">*</span>
                  </label>
                  <EquipmentTreeSelect
                    equipements={equipements}
                    selectedId={diagEquipementId}
                    onSelect={setDiagEquipementId}
                    required
                    placeholder="Choisir l'équipement dans l'arborescence..."
                  />
                </div>

                {/* Dropdown 2: Select Part Type */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-primary-600 dark:text-primary-400">
                    Type d'organe mécanique :
                  </label>
                  <select
                    value={diagPartType}
                    onChange={(e) => setDiagPartType(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-primary-950 text-primary-800 dark:text-primary-100"
                  >
                    <option value="arbre">Arbre de transmission / Cardan</option>
                    <option value="autre">Autre pièce d'usure mécanique</option>
                    <option value="chaine">Chaîne de transmission / Pignon</option>
                    <option value="courroie">Courroie de transmission / Poulie</option>
                    <option value="engrenage">Engrenage / Pignon / Crémaillère</option>
                    <option value="filtre">Filtre (Air, Huile, Hydraulique)</option>
                    <option value="joint">Joint d'étanchéité / Joint torique</option>
                    <option value="roulement">Roulement à billes / Palier</option>
                  </select>
                </div>

                {/* Camera / Upload selection */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-primary-600 dark:text-primary-400">
                    Prise de photo ou téléversement :
                  </label>

                  {/* Live viewfinder */}
                  {isDiagCameraLive ? (
                    <div className="relative overflow-hidden rounded-2xl bg-black aspect-video border border-indigo-500 flex items-center justify-center">
                      <video
                        ref={diagVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      {/* Scanning visual effect */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent animate-[pulse_2s_infinite] pointer-events-none">
                        <div className="w-full h-[2px] bg-emerald-400 shadow-[0_0_10px_#34d399] absolute top-[50%] left-0 animate-[bounce_3s_infinite]" />
                      </div>
                      
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-4">
                        <button
                          type="button"
                          onClick={() => setIsDiagCameraLive(false)}
                          className="px-3 py-1.5 rounded-xl bg-primary-950/80 hover:bg-primary-900 border border-primary-700 text-white font-semibold text-[10px] transition"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={handleCaptureDiagPhoto}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 border border-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-lg transition"
                        >
                          <Camera size={12} />
                          Prendre la photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Normal image state / Drag & Drop */}
                      {!diagImage ? (
                        <div
                          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-50/5'); }}
                          onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50/5'); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50/5');
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              processDiagFile(e.dataTransfer.files[0]);
                            }
                          }}
                          className="border-2 border-dashed border-primary-200 dark:border-primary-800 rounded-2xl p-6 text-center flex flex-col items-center justify-center space-y-3 hover:border-indigo-400 dark:hover:border-indigo-800 transition cursor-pointer relative"
                          onClick={() => document.getElementById('diag-file-upload')?.click()}
                        >
                          <input
                            type="file"
                            id="diag-file-upload"
                            accept="image/*"
                            onChange={handleDiagImageUpload}
                            className="hidden"
                          />
                          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-full text-indigo-600 dark:text-indigo-400">
                            <Upload size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-primary-800 dark:text-primary-200">
                              Glissez-déposez la photo ici
                            </p>
                            <p className="text-[10px] text-primary-400 mt-1">
                              ou cliquez pour parcourir les fichiers
                            </p>
                          </div>
                          <p className="text-[9px] text-primary-400 italic">
                            Prend en charge PNG, JPG, JPEG (Max. 10Mo)
                          </p>
                        </div>
                      ) : (
                        <div className="relative overflow-hidden rounded-2xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950">
                          <img
                            src={diagImage}
                            alt="Mechanical part preview"
                            className="w-full h-48 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setDiagImage(null)}
                            className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md transition"
                            title="Supprimer la photo"
                          >
                            <Trash2 size={12} />
                          </button>
                          <div className="p-2 text-center border-t border-primary-200 dark:border-primary-800 bg-primary-100/30 dark:bg-primary-900/30 flex flex-col gap-1 items-center justify-center">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ Photo chargée & optimisée (Moins de 1 Mo)</span>
                            {diagImageSizeInfo && (
                              <p className="text-[9px] font-mono text-primary-500 dark:text-primary-400">
                                {diagImageSizeInfo.reduced ? (
                                  <>
                                    Optimisée de <span className="line-through text-red-400">{diagImageSizeInfo.original}</span> à <span className="font-extrabold text-emerald-500">{diagImageSizeInfo.compressed}</span> (-{diagImageSizeInfo.percentage}%)
                                  </>
                                ) : (
                                  <>Taille : <span className="font-extrabold text-emerald-500">{diagImageSizeInfo.compressed}</span></>
                                )}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => setIsDiagAnnotatorOpen(true)}
                              className="mt-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-sm"
                            >
                              <Pencil size={11} /> Dessiner / Annoter la photo
                            </button>
                          </div>
                        </div>
                      )}

                      {diagImage && (
                        <PhotoAnnotatorModal
                          isOpen={isDiagAnnotatorOpen}
                          imageUrl={diagImage}
                          onClose={() => setIsDiagAnnotatorOpen(false)}
                          onSave={(annotatedUrl) => setDiagImage(annotatedUrl)}
                        />
                      )}

                      {/* Alternate manual triggers */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleStartDiagCamera}
                          className="flex-1 text-xs py-2 border border-primary-200 hover:border-indigo-500 dark:border-primary-800 hover:text-indigo-500 font-bold rounded-xl flex items-center justify-center gap-1.5 bg-white dark:bg-primary-900 transition"
                        >
                          <Camera size={13} />
                          Activer Caméra Live
                        </button>
                        
                        {diagImage && (
                          <button
                            type="button"
                            onClick={() => setDiagImage(null)}
                            className="px-3 text-xs py-2 border border-red-200 hover:bg-red-50 dark:border-red-950 dark:hover:bg-red-950/20 text-red-500 rounded-xl transition"
                            title="Réinitialiser"
                          >
                            Effacer
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Diag main action */}
                <button
                  type="button"
                  disabled={!diagImage || diagLoading}
                  onClick={handleRunDiagnostic}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-primary-300 disabled:to-primary-300 disabled:dark:from-primary-800 disabled:dark:to-primary-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  {diagLoading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Analyse IA en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      Lancer l'Auto-Diagnostic par IA
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: AI REPORT CONSOLE */}
            <div className="lg:col-span-7">
              {diagLoading ? (
                /* LOADING HUDE PANEL */
                <div className="card h-full min-h-[350px] flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <div className="relative">
                    {/* Ring animated borders */}
                    <div className="w-16 h-16 rounded-full border-4 border-indigo-105 border-t-indigo-600 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-4 border-dashed border-purple-200 animate-ping opacity-30" />
                    <Sparkles size={18} className="text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-bold text-primary-800 dark:text-primary-100">
                      Calcul de l'Auto-Diagnostic IA...
                    </p>
                    <p className="text-xs text-indigo-500 dark:text-indigo-400 font-medium animate-pulse">
                      {diagLoadingStep}
                    </p>
                  </div>
                  <p className="text-[10px] text-primary-400 italic max-w-xs">
                    Le modèle examine les surfaces, détecte la corrosion et estime la résistance mécanique restante.
                  </p>
                </div>
              ) : diagResult ? (
                /* DETAILED REPORT VIEW */
                <div className="space-y-4 animate-fadeIn">
                  
                  {/* Summary row with speedometer gauge */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    
                    {/* Radial Meter Card */}
                    <div className="md:col-span-5 card p-4 flex flex-col items-center justify-center text-center space-y-2">
                      <span className="text-[9px] font-bold text-primary-400 uppercase tracking-wide">
                        Taux d'Usure Estimé
                      </span>
                      
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        {/* Circle gauge representation */}
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle
                            cx="48"
                            cy="48"
                            r="42"
                            className="stroke-primary-100 dark:stroke-primary-850"
                            strokeWidth="8"
                            fill="transparent"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r="42"
                            className={`transition-all duration-1000 ${
                              diagResult.wearPercentage > 75 
                                ? 'stroke-rose-500' 
                                : diagResult.wearPercentage > 35 
                                  ? 'stroke-amber-500' 
                                  : 'stroke-emerald-500'
                            }`}
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={263.89}
                            strokeDashoffset={263.89 - (263.89 * diagResult.wearPercentage) / 100}
                          />
                        </svg>
                        
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-extrabold text-primary-800 dark:text-white font-mono">
                            {diagResult.wearPercentage}%
                          </span>
                        </div>
                      </div>

                      {/* Badge for wear level */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        diagResult.wearLevel === 'Critique'
                          ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900'
                          : diagResult.wearLevel === 'Attention'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                      }`}>
                        {diagResult.wearLevel}
                      </span>
                    </div>

                    {/* Metadata summary cards */}
                    <div className="md:col-span-7 grid grid-cols-1 gap-3">
                      
                      <div className="card p-3.5 flex items-center gap-3 bg-primary-50/50 dark:bg-primary-950/40">
                        <div className={`p-2 rounded-xl text-white ${
                          diagResult.recommendedPriority === 'Critique' || diagResult.recommendedPriority === 'Haute'
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                        }`}>
                          <AlertTriangle size={15} />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-primary-400 block uppercase">
                            Priorité de Maintenance
                          </span>
                          <p className="text-xs font-extrabold text-primary-800 dark:text-primary-200 mt-0.5">
                            Intervention {diagResult.recommendedPriority}
                          </p>
                        </div>
                      </div>

                      <div className="card p-3.5 flex items-center gap-3 bg-primary-50/50 dark:bg-primary-950/40">
                        <div className="p-2 rounded-xl bg-indigo-500 text-white">
                          <Wrench size={15} />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-primary-400 block uppercase">
                            Organe Analysé
                          </span>
                          <p className="text-xs font-extrabold text-primary-800 dark:text-primary-200 mt-0.5 font-display">
                            {diagPartType.toUpperCase()}
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Detailed AI report details card */}
                  <div className="card space-y-4">
                    <div className="border-b border-primary-100 dark:border-primary-800 pb-2">
                      <h4 className="font-bold text-xs text-primary-800 dark:text-primary-200 flex items-center gap-1.5 font-display">
                        <FileText size={14} className="text-indigo-500" />
                        Rapport d'Analyse Optique IA
                      </h4>
                    </div>

                    {/* Section 1: Vision analysis */}
                    <div className="space-y-1">
                      <h5 className="font-bold text-[10px] text-primary-400 uppercase tracking-wide">
                        Analyse et Diagnostics Visuels
                      </h5>
                      <p className="text-xs text-primary-700 dark:text-primary-300 leading-relaxed font-medium bg-primary-50/50 dark:bg-primary-950/40 p-3 rounded-xl border border-primary-100 dark:border-primary-850">
                        {diagResult.diagnosis}
                      </p>
                    </div>

                    {/* Section 2: Action proposed */}
                    <div className="space-y-1">
                      <h5 className="font-bold text-[10px] text-indigo-500 uppercase tracking-wide">
                        Action Corrective Recommandée
                      </h5>
                      <p className="text-xs text-primary-800 dark:text-primary-100 leading-relaxed font-bold bg-indigo-50/30 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                        {diagResult.correctiveAction}
                      </p>
                    </div>

                    {/* Section 3: Spare parts required */}
                    <div className="space-y-1.5">
                      <h5 className="font-bold text-[10px] text-primary-400 uppercase tracking-wide">
                        Pièces de Rechange Requises
                      </h5>
                      <div className="flex flex-wrap gap-1.5">
                        {diagResult.partsRequired && diagResult.partsRequired.length > 0 ? (
                          diagResult.partsRequired.map((part, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 text-[10px] font-bold text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-800 rounded-lg border border-primary-200 dark:border-primary-700 font-mono"
                            >
                              {part}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-primary-400 italic">Aucune pièce spécifique requise</span>
                        )}
                      </div>
                    </div>

                    {/* Core action button: Deploy intervention */}
                    <div className="border-t border-primary-100 dark:border-primary-800 pt-3.5 flex justify-end">
                      <button
                        type="button"
                        onClick={handleCreateDIFromDiag}
                        className="btn-primary py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-1.5 bg-accent-orange hover:bg-amber-600 text-white shadow-md shadow-accent-orange/10 cursor-pointer"
                      >
                        <Wrench size={13} />
                        Créer une Demande d'Intervention Corrective Immédiate
                      </button>
                    </div>

                  </div>

                </div>
              ) : (
                /* EMPTY STATE - WAITING FOR IMAGE */
                <div className="card h-full min-h-[350px] border-2 border-dashed border-primary-100 dark:border-primary-850 flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-full text-indigo-500 animate-pulse">
                    <Sparkles size={26} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-primary-800 dark:text-primary-200">
                      En attente de photo...
                    </p>
                    <p className="text-xs text-primary-400 max-w-xs">
                      Chargez une image ou utilisez la caméra de gauche pour lancer le diagnostic automatique de l'organe mécanique.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* -------------------- POPUP MODAL: WORK ORDER CLOSURE WITH SIGNATURE CANVAS -------------------- */}
      {activeForm === 'compteRendu' && selectedIntToClose && (
        <div className="fixed inset-0 bg-primary-950/75 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-xs"
          >
            
            {/* Modal Header */}
            <div className="p-4 bg-primary-50 dark:bg-primary-950 border-b border-primary-100 dark:border-primary-850 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-sm text-primary-900 dark:text-white flex items-center gap-1.5">
                  <FileSignature size={15} className="text-accent-orange" />
                  Rapport de Clôture Intervention
                </h3>
                <p className="text-[10px] text-primary-400 font-mono">{selectedIntToClose.numero} · {selectedIntToClose.equipementNom}</p>
              </div>
              <button
                onClick={() => {
                  setActiveForm('none');
                  setSelectedIntToClose(null);
                }}
                className="p-1 rounded hover:bg-primary-100 dark:hover:bg-primary-800 text-primary-400"
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitCloseBT} className="p-4 space-y-4">
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold block text-primary-700 dark:text-primary-300">
                    Compte-Rendu d'intervention (Travaux réalisés) : <span className="text-red-500">*</span>
                  </label>
                  <SaisieVocale
                    compact
                    onTranscript={(text) => {
                      setCrComment(prev => prev ? `${prev} ${text}` : text);
                    }}
                  />
                </div>
                <textarea
                  required
                  value={crComment}
                  onChange={e => setCrComment(e.target.value)}
                  placeholder="Expliquez brièvement l'action curative ou préventive effectuée : échange de joint, graissage, câblage remis à neuf, etc."
                  rows={3}
                  className="w-full p-2.5 border rounded-xl dark:bg-primary-950 dark:border-primary-800"
                />
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold block mb-1 text-primary-700 dark:text-primary-300 text-sm">
                      Temps passé (Heures de M-O) : <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={crTime}
                      onChange={e => setCrTime(e.target.value)}
                      placeholder="Ex: 1.5 ou 2.0"
                      className="w-full p-2.5 border rounded-xl dark:bg-primary-950 dark:border-primary-800 text-sm"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1 text-primary-700 dark:text-primary-300 text-sm">
                      Saisie manuelle additionnelle (Optionnel) :
                    </label>
                    <input
                      type="text"
                      value={crPieces}
                      onChange={e => setCrPieces(e.target.value)}
                      placeholder="Ex: Joint torique, fil électrique..."
                      className="w-full p-2.5 border rounded-xl dark:bg-primary-950 dark:border-primary-800 text-sm"
                    />
                  </div>
                </div>

                {/* ADVANCED SCAN & STOCK CONSUMPTION SECTION */}
                <div className="border border-primary-200 dark:border-primary-800 rounded-2xl p-4 bg-primary-50/50 dark:bg-primary-950/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-primary-200 dark:border-primary-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Barcode className="text-primary-600 dark:text-primary-400" size={18} />
                      <div>
                        <h4 className="font-bold text-sm text-primary-800 dark:text-primary-200">
                          Consommation de Pièces Détachées
                        </h4>
                        <p className="text-[11px] text-primary-500 dark:text-primary-400">
                          Scannez ou sélectionnez les pièces consommées pour décompter automatiquement le stock.
                        </p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setPieceScannerActive(!pieceScannerActive)}
                      className={`flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg transition ${
                        pieceScannerActive 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm'
                      }`}
                    >
                      <Camera size={14} />
                      {pieceScannerActive ? 'Arrêter Caméra' : 'Activer Caméra (Scan)'}
                    </button>
                  </div>

                  {/* Camera Scanner Container */}
                  {pieceScannerActive && (
                    <div className="space-y-2">
                      <div className="relative w-full h-48 bg-black rounded-xl overflow-hidden border border-primary-300 dark:border-primary-700">
                        <div id="piece-qr-scanner-element" className="w-full h-full"></div>
                        <div className="absolute inset-0 border-2 border-dashed border-primary-500 pointer-events-none opacity-50 m-6 rounded-lg animate-pulse" />
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-[10px] text-white px-2 py-0.5 rounded font-mono">
                          Scanner Actif
                        </div>
                      </div>
                      {pieceScannerError && (
                        <p className="text-xs text-red-500 font-semibold">{pieceScannerError}</p>
                      )}
                      <p className="text-[10px] text-primary-400 italic text-center">
                        Présentez le QR code ou code-barre de la pièce devant votre objectif.
                      </p>
                    </div>
                  )}

                  {/* QUICK SIMULATOR PANEL */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary-500 block">
                      Simulateur de Scan Rapide (Pièces en Stock) :
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {pieces.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSimulatePieceScan(p.codeBarre)}
                          className="flex flex-col items-start p-2 rounded-xl text-left border bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-850 hover:border-primary-400 dark:hover:border-primary-700 transition relative overflow-hidden group shadow-xs"
                        >
                          <div className="absolute top-1 right-1.5 bg-primary-100 dark:bg-primary-800 text-[9px] text-primary-700 dark:text-primary-300 px-1 py-0.5 rounded font-mono font-bold">
                            Stock: {p.quantite}
                          </div>
                          <span className="font-bold text-xs text-primary-800 dark:text-primary-200 truncate pr-12 w-full">
                            {p.designation}
                          </span>
                          <span className="text-[9px] text-primary-400 font-mono flex items-center gap-1 mt-1">
                            <Barcode size={10} />
                            {p.codeBarre}
                          </span>
                          <div className="mt-1 w-full flex justify-between items-center text-[10px]">
                            <span className="text-primary-500">{p.emplacement}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold group-hover:underline">
                              Simuler Scan
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CONSUMED LIST */}
                  {consumedPiecesList.length > 0 ? (
                    <div className="space-y-2 border-t border-primary-200 dark:border-primary-800 pt-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary-500 block">
                        Pièces Consommées Scannées ({consumedPiecesList.length}) :
                      </span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {consumedPiecesList.map(item => {
                          const dbPiece = pieces.find(p => p.id === item.pieceId);
                          const isLowStock = dbPiece ? (dbPiece.quantite - item.quantite <= dbPiece.seuil) : false;
                          const currentStock = dbPiece ? dbPiece.quantite : 0;
                          return (
                            <div
                              key={item.pieceId}
                              className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-850 shadow-2xs"
                            >
                              <div className="flex-1 min-w-0 pr-3">
                                <div className="flex items-center gap-1.5">
                                  <h5 className="font-bold text-xs text-primary-800 dark:text-primary-200 truncate">
                                    {item.designation}
                                  </h5>
                                  <span className="text-[9px] font-mono text-primary-400">
                                    ({item.codeBarre})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                                  <span className="text-primary-500 font-mono">PU: {(item.prix ?? 0).toFixed(2)}€</span>
                                  <span className="text-primary-300 dark:text-primary-700">|</span>
                                  <span className="text-primary-500">Total HT: {((item.prix ?? 0) * item.quantite).toFixed(2)}€</span>
                                  {isLowStock && (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50">
                                      Alerte Stock Bas ({currentStock - item.quantite} restants)
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center border border-primary-200 dark:border-primary-800 rounded-lg overflow-hidden bg-primary-50 dark:bg-primary-950">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConsumedPiecesList(prev => {
                                        const updated = prev.map(p => 
                                          p.pieceId === item.pieceId 
                                            ? { ...p, quantite: Math.max(1, p.quantite - 1) } 
                                            : p
                                        );
                                        setCrPieces(updated.map(p => `${p.quantite}x ${p.designation} (${p.codeBarre})`).join(', '));
                                        return updated;
                                      });
                                    }}
                                    className="p-1 px-2 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-800 transition"
                                  >
                                    <Minus size={10} />
                                  </button>
                                  <span className="px-2 text-xs font-bold text-primary-800 dark:text-primary-100 font-mono w-6 text-center">
                                    {item.quantite}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConsumedPiecesList(prev => {
                                        const updated = prev.map(p => 
                                          p.pieceId === item.pieceId 
                                            ? { ...p, quantite: p.quantite + 1 } 
                                            : p
                                        );
                                        setCrPieces(updated.map(p => `${p.quantite}x ${p.designation} (${p.codeBarre})`).join(', '));
                                        return updated;
                                      });
                                    }}
                                    className="p-1 px-2 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-800 transition"
                                  >
                                    <Plus size={10} />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setConsumedPiecesList(prev => {
                                      const updated = prev.filter(p => p.pieceId !== item.pieceId);
                                      setCrPieces(updated.map(p => `${p.quantite}x ${p.designation} (${p.codeBarre})`).join(', '));
                                      return updated;
                                    });
                                  }}
                                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                                  title="Supprimer"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-primary-200 dark:border-primary-800 rounded-xl p-4 text-center text-xs text-primary-400">
                      Aucune pièce scannée pour le moment. Scannez une pièce ou cliquez sur le simulateur ci-dessus.
                    </div>
                  )}
                </div>
              </div>

              {/* SIGNATURE PAD CANVAS */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-primary-700 dark:text-primary-300">
                    Signature tactile du technicien : <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-[10px] text-red-500 hover:text-red-600 font-bold"
                  >
                    Effacer Signature
                  </button>
                </div>
                
                <div className="bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-xl overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={440}
                    height={110}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-28 cursor-crosshair bg-white"
                  />
                </div>
                <p className="text-[10px] text-primary-400 italic">
                  Dessinez votre signature au doigt ou à la souris ci-dessus pour acter l'intervention.
                </p>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-primary-100 dark:border-primary-850">
                <button
                  type="button"
                  onClick={() => {
                    setActiveForm('none');
                    setSelectedIntToClose(null);
                  }}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!hasSigned || !crComment}
                  className="btn-primary flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={14} />
                  Valider & Clôturer BT
                </button>
              </div>

            </form>

          </motion.div>
        </div>
      )}

      {/* FLOATING ACTION BUTTON - SAISIE RAPIDE */}
      <div className="fixed bottom-6 right-6 z-40 print:hidden">
        <button
          type="button"
          onClick={() => {
            if (!quickEquipementId && equipements.length > 0) {
              setQuickEquipementId(equipements[0].id);
            }
            setShowQuickSaisie(true);
          }}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-full shadow-2xl hover:shadow-orange-500/20 active:scale-95 transition-all duration-200 cursor-pointer font-bold text-xs uppercase tracking-wider group"
          title="Saisie rapide de bon de travail"
        >
          <Zap size={16} className="animate-pulse group-hover:rotate-12 transition-transform" />
          <span>Saisie Rapide BT</span>
        </button>
      </div>

      {/* QUICK SAISIE SIMPLIFIED BT MODAL */}
      <AnimatePresence>
        {showQuickSaisie && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-primary-900 w-full max-w-lg rounded-2xl shadow-2xl border border-primary-200 dark:border-primary-800 flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-primary-100 dark:border-primary-800 flex justify-between items-center bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent shrink-0">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 rounded-xl">
                    <Zap size={20} className="text-orange-500" />
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-base text-primary-900 dark:text-white">
                      Saisie Rapide - Bon de Travail
                    </h3>
                    <p className="text-[11px] text-primary-400">Créer et assigner un BT simplifié instantanément</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQuickSaisie(false)}
                  className="p-1.5 hover:bg-primary-100 dark:hover:bg-primary-850 rounded-lg text-primary-400 hover:text-primary-600 dark:hover:text-primary-200 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <form onSubmit={handleCreateQuickBT} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  
                  {/* Équipement */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-primary-500 uppercase tracking-wider">
                      Équipement concerné <span className="text-red-500">*</span>
                    </label>
                    <EquipmentTreeSelect
                      equipements={equipements}
                      selectedId={quickEquipementId}
                      onSelect={setQuickEquipementId}
                      required
                      placeholder="Choisir l'équipement dans l'arborescence..."
                    />
                  </div>

                  {/* Dual fields for Urgence & Technologie */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Urgence */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-primary-500 uppercase tracking-wider">
                        Urgence du travail
                      </label>
                      <select
                        value={quickUrgence}
                        onChange={e => setQuickUrgence(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/10 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-white dark:bg-primary-950"
                      >
                        <option value="Basse">Basse (Observation)</option>
                        <option value="Critique">Critique (Danger / Urgent)</option>
                        <option value="Haute">Haute (Ligne bloquée)</option>
                        <option value="Moyenne">Moyenne (Ralentissement)</option>
                      </select>
                    </div>

                    {/* Type de Problème / Métier */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-primary-500 uppercase tracking-wider">
                        Type de Problème / Métier
                      </label>
                      <select
                        value={quickTypeProbleme}
                        onChange={e => setQuickTypeProbleme(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/10 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-white dark:bg-primary-950"
                      >
                        <option value="Automatisme">Automatisme / CN</option>
                        <option value="Autre">Autre</option>
                        <option value="Électrique">Électrique</option>
                        <option value="Hydraulique">Hydraulique</option>
                        <option value="Mécanique">Mécanique</option>
                        <option value="Pneumatique">Pneumatique</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-[11px] font-bold text-primary-500 uppercase tracking-wider">
                        Description de l'intervention <span className="text-red-500">*</span>
                      </label>
                      <SaisieVocale
                        compact
                        onTranscript={(text) => {
                          setQuickDescription(prev => prev ? `${prev} ${text}` : text);
                        }}
                      />
                    </div>
                    <textarea
                      required
                      rows={4}
                      value={quickDescription}
                      onChange={e => setQuickDescription(e.target.value)}
                      placeholder="Décrivez brièvement le travail à réaliser ou l'anomalie constatée..."
                      className="w-full text-xs font-semibold px-3 py-2.5 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/10 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-white dark:bg-primary-950 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Demandeur */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-primary-500 uppercase tracking-wider">
                      Émetteur / Demandeur
                    </label>
                    <input
                      type="text"
                      value={quickDemandeur}
                      onChange={e => setQuickDemandeur(e.target.value)}
                      placeholder="Nom de l'émetteur..."
                      className="w-full text-xs font-semibold px-3 py-2 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/10 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-white dark:bg-primary-950"
                    />
                  </div>

                  {/* Checkbox for setting equipment HS */}
                  <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 rounded-xl border border-amber-500/10 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="quick-set-hs"
                      checked={quickSetHS}
                      onChange={e => setQuickSetHS(e.target.checked)}
                      className="h-4 w-4 rounded text-orange-500 border-primary-300 focus:ring-orange-500 cursor-pointer"
                    />
                    <label htmlFor="quick-set-hs" className="text-xs font-bold text-amber-800 dark:text-amber-400 cursor-pointer select-none">
                      ⚠️ Déclarer l'équipement comme Hors Service (HS) immédiatement
                    </label>
                  </div>

                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-primary-100 dark:border-primary-800 flex justify-end gap-3 bg-primary-50/20 dark:bg-primary-950/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowQuickSaisie(false)}
                    className="px-4 py-2 text-xs font-bold text-primary-500 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-850 rounded-xl transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check size={14} />
                    <span>Créer & Assigner le BT</span>
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
