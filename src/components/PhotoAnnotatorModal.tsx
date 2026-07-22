import React, { useState, useRef, useEffect } from 'react';
import { Pencil, ArrowUpRight, Circle, Undo2, Trash2, Check, X, Sliders } from 'lucide-react';

interface Shape {
  type: 'free' | 'arrow' | 'circle';
  color: string;
  width: number;
  points: { x: number; y: number }[];
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}

interface PhotoAnnotatorModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (annotatedImageUrl: string) => void;
}

export default function PhotoAnnotatorModal({
  isOpen,
  imageUrl,
  onClose,
  onSave
}: PhotoAnnotatorModalProps) {
  const [tool, setTool] = useState<'free' | 'arrow' | 'circle'>('arrow');
  const [color, setColor] = useState<string>('#ef4444'); // Default Red for danger/anomalies
  const [strokeWidth, setStrokeWidth] = useState<number>(6);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load background image
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    setImageLoading(true);
    setImageError(null);
    setShapes([]);
    setCurrentShape(null);

    const img = new Image();
    img.crossOrigin = 'anonymous'; // Avoid tainted canvas for CORS images
    img.onload = () => {
      setBgImage(img);
      setImageLoading(false);
    };
    img.onerror = () => {
      setImageError("Impossible de charger l'image pour annotation.");
      setImageLoading(false);
    };
    img.src = imageUrl;
  }, [isOpen, imageUrl]);

  // Adjust canvas size to match background image physical resolution
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImage) return;

    canvas.width = bgImage.naturalWidth || 800;
    canvas.height = bgImage.naturalHeight || 600;

    // Redraw once after resizing
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    }
  }, [bgImage]);

  // Redraw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    // Helper to draw a single shape
    const drawShape = (c: CanvasRenderingContext2D, s: Shape) => {
      if (s.type === 'free') {
        if (s.points.length < 2) return;
        c.strokeStyle = s.color;
        c.lineWidth = s.width;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.beginPath();
        c.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) {
          c.lineTo(s.points[i].x, s.points[i].y);
        }
        c.stroke();
      } else if (s.type === 'arrow') {
        const sx = s.startX ?? 0;
        const sy = s.startY ?? 0;
        const ex = s.endX ?? sx;
        const ey = s.endY ?? sy;

        const headlen = Math.max(12, s.width * 2.5); // size of arrowhead proportional to stroke
        const dx = ex - sx;
        const dy = ey - sy;
        const angle = Math.atan2(dy, dx);

        c.strokeStyle = s.color;
        c.fillStyle = s.color;
        c.lineWidth = s.width;
        c.lineCap = 'round';
        c.lineJoin = 'round';

        // Draw shaft
        c.beginPath();
        c.moveTo(sx, sy);
        c.lineTo(ex, ey);
        c.stroke();

        // Draw arrowhead
        c.beginPath();
        c.moveTo(ex, ey);
        c.lineTo(ex - headlen * Math.cos(angle - Math.PI / 6), ey - headlen * Math.sin(angle - Math.PI / 6));
        c.lineTo(ex - headlen * Math.cos(angle + Math.PI / 6), ey - headlen * Math.sin(angle + Math.PI / 6));
        c.closePath();
        c.fill();
      } else if (s.type === 'circle') {
        const sx = s.startX ?? 0;
        const sy = s.startY ?? 0;
        const ex = s.endX ?? sx;
        const ey = s.endY ?? sy;

        c.strokeStyle = s.color;
        c.lineWidth = s.width;
        c.lineCap = 'round';
        c.lineJoin = 'round';

        const radiusX = Math.abs(ex - sx);
        const radiusY = Math.abs(ey - sy);
        const centerX = sx;
        const centerY = sy;

        c.beginPath();
        if (c.ellipse) {
          c.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        } else {
          const radius = Math.sqrt(radiusX * radiusX + radiusY * radiusY);
          c.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        }
        c.stroke();
      }
    };

    // Draw saved shapes
    shapes.forEach(s => drawShape(ctx, s));

    // Draw current active shape
    if (currentShape) {
      drawShape(ctx, currentShape);
    }
  }, [shapes, currentShape, bgImage]);

  if (!isOpen) return null;

  // Pointer event handlers to draw on canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImage) return;

    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (tool === 'free') {
      setCurrentShape({
        type: 'free',
        color,
        width: strokeWidth,
        points: [{ x, y }]
      });
    } else {
      setCurrentShape({
        type: tool,
        color,
        width: strokeWidth,
        points: [],
        startX: x,
        startY: y,
        endX: x,
        endY: y
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentShape) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (tool === 'free') {
      setCurrentShape(prev => {
        if (!prev) return null;
        return {
          ...prev,
          points: [...prev.points, { x, y }]
        };
      });
    } else {
      setCurrentShape(prev => {
        if (!prev) return null;
        return {
          ...prev,
          endX: x,
          endY: y
        };
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Safe fallback
      }
    }

    if (currentShape) {
      setShapes(prev => [...prev, currentShape]);
      setCurrentShape(null);
    }
  };

  const handleUndo = () => {
    setShapes(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (window.confirm("Voulez-vous vraiment effacer tous les dessins sur cette photo ?")) {
      setShapes([]);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Generate Base64 image
    try {
      const annotatedUrl = canvas.toDataURL('image/jpeg', 0.85);
      onSave(annotatedUrl);
      onClose();
    } catch (err) {
      console.error("Failed to export annotated canvas:", err);
      alert("Erreur lors de la sauvegarde de l'image annotée.");
    }
  };

  // Preset Colors
  const colors = [
    { value: '#ef4444', label: 'Rouge (Anomalie)', bgClass: 'bg-red-500' },
    { value: '#eab308', label: 'Jaune (Alerte)', bgClass: 'bg-yellow-500' },
    { value: '#22c55e', label: 'Vert (Normal)', bgClass: 'bg-green-500' },
    { value: '#3b82f6', label: 'Bleu (Info)', bgClass: 'bg-blue-500' },
    { value: '#a855f7', label: 'Violet (Autre)', bgClass: 'bg-purple-500' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-primary-900 border border-primary-800 text-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary-800 bg-primary-950/50">
          <div>
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <Pencil className="text-indigo-400" size={20} />
              Annoter la photo terrain
            </h3>
            <p className="text-xs text-primary-300 mt-0.5">
              Dessinez directement sur la photo pour mettre en évidence les zones d'usure ou défauts.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-primary-800 hover:bg-primary-700 text-primary-300 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-primary-950/20">
          
          {/* Main Drawing Area */}
          <div className="flex-1 p-6 flex items-center justify-center min-h-[300px] md:min-h-0 relative select-none">
            {imageLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary-900/50">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs text-primary-300">Chargement de l'image...</p>
              </div>
            )}

            {imageError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-sm text-red-400 font-bold mb-2">{imageError}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-primary-800 hover:bg-primary-700 text-xs font-bold text-white transition"
                >
                  Fermer
                </button>
              </div>
            )}

            {!imageLoading && !imageError && bgImage && (
              <div className="relative max-w-full max-h-full rounded-2xl overflow-hidden border border-primary-800 bg-black shadow-inner flex items-center justify-center aspect-auto">
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="max-w-full max-h-[50vh] md:max-h-[60vh] object-contain cursor-crosshair touch-none"
                  style={{ display: 'block' }}
                />
              </div>
            )}
          </div>

          {/* Sidebar Controls */}
          <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-primary-800 bg-primary-900/60 p-5 space-y-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              
              {/* Tool Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-black uppercase tracking-wider text-primary-400 block">
                  Outils de dessin
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTool('arrow')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      tool === 'arrow'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 font-bold'
                        : 'bg-primary-800/40 border-primary-800 text-primary-300 hover:bg-primary-800/80 hover:text-white'
                    }`}
                  >
                    <ArrowUpRight size={18} />
                    <span className="text-[10px]">Flèche</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTool('circle')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      tool === 'circle'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 font-bold'
                        : 'bg-primary-800/40 border-primary-800 text-primary-300 hover:bg-primary-800/80 hover:text-white'
                    }`}
                  >
                    <Circle size={18} />
                    <span className="text-[10px]">Cercle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTool('free')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      tool === 'free'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 font-bold'
                        : 'bg-primary-800/40 border-primary-800 text-primary-300 hover:bg-primary-800/80 hover:text-white'
                    }`}
                  >
                    <Pencil size={18} />
                    <span className="text-[10px]">Pinceau</span>
                  </button>
                </div>
              </div>

              {/* Color Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-black uppercase tracking-wider text-primary-400 block">
                  Couleur d'annotation
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {colors.map(col => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => setColor(col.value)}
                      className={`w-7 h-7 rounded-full transition-all duration-150 relative ${col.bgClass} hover:scale-110 flex items-center justify-center`}
                      title={col.label}
                    >
                      {color === col.value && (
                        <span className="absolute inset-0 rounded-full border-2 border-white animate-ping opacity-75" />
                      )}
                      {color === col.value && (
                        <div className="w-2 h-2 rounded-full bg-white shadow-md" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-primary-400 italic">
                  {colors.find(c => c.value === color)?.label || 'Sélectionné'}
                </p>
              </div>

              {/* Stroke Width Selector */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black uppercase tracking-wider text-primary-400 flex items-center gap-1">
                    <Sliders size={12} /> Épaisseur du trait
                  </label>
                  <span className="font-mono text-xs font-bold text-primary-300">{strokeWidth}px</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-[9px] text-primary-400">
                  <span>Fin</span>
                  <span>Moyen</span>
                  <span>Épais</span>
                </div>
              </div>

              {/* Draw Actions */}
              <div className="space-y-2.5 border-t border-primary-800 pt-4">
                <label className="text-xs font-black uppercase tracking-wider text-primary-400 block">
                  Édition
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={shapes.length === 0}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition ${
                      shapes.length === 0
                        ? 'opacity-40 bg-primary-800/10 border-primary-850 text-primary-500 cursor-not-allowed'
                        : 'bg-primary-800 hover:bg-primary-750 border-primary-700 text-white'
                    }`}
                    title="Annuler le dernier tracé"
                  >
                    <Undo2 size={13} />
                    <span>Annuler ({shapes.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={shapes.length === 0}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition ${
                      shapes.length === 0
                        ? 'opacity-40 bg-primary-800/10 border-primary-850 text-primary-500 cursor-not-allowed'
                        : 'bg-red-950/20 hover:bg-red-950/40 border-red-900/30 text-red-400 hover:text-red-300'
                    }`}
                    title="Effacer tout"
                  >
                    <Trash2 size={13} />
                    <span>Effacer</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Footer buttons inside Sidebar for compact/desktop layout */}
            <div className="space-y-2 pt-6 border-t border-primary-800">
              <button
                type="button"
                onClick={handleSave}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/20 transition-all active:scale-[0.98]"
              >
                <Check size={14} />
                Enregistrer l'annotation
              </button>
              
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-primary-800 hover:bg-primary-750 text-primary-200 hover:text-white font-semibold text-xs transition"
              >
                Fermer sans enregistrer
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
