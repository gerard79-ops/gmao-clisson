import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle, Sparkles } from 'lucide-react';

interface SaisieVocaleProps {
  onTranscript: (text: string) => void;
  className?: string;
  buttonText?: string;
  compact?: boolean;
}

export const SaisieVocale: React.FC<SaisieVocaleProps> = ({
  onTranscript,
  className = '',
  buttonText = 'Parler pour décrire la panne',
  compact = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    setError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("La reconnaissance vocale n'est pas supportée par ce navigateur.");
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'fr-FR';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let textResult = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            textResult += event.results[i][0].transcript;
          }
        }
        if (textResult.trim()) {
          onTranscript(textResult.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError("Microphone refusé ou bloqué. Autorisez l'accès ou ouvrez l'application dans un nouvel onglet.");
        } else if (event.error === 'no-speech') {
          setError("Aucun son détecté. Parlez plus fort.");
        } else {
          setError(`Erreur de saisie vocale (${event.error})`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setError("Impossible de démarrer la saisie vocale.");
      setIsListening(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="text-[10px] text-primary-400 dark:text-primary-500 flex items-center gap-1 mt-1 font-mono">
        <AlertCircle size={12} className="shrink-0" />
        Saisie vocale non disponible (Navigateur restrictif)
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
        <button
          type="button"
          onClick={toggleListening}
          className={`p-1.5 rounded-lg border transition-all duration-300 flex items-center justify-center gap-1 ${
            isListening
              ? 'bg-red-500/10 border-red-500 text-red-600 animate-pulse'
              : 'bg-primary-50 hover:bg-primary-100 dark:bg-primary-800 dark:hover:bg-primary-700 border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-300'
          }`}
          title={isListening ? "Arrêter l'écoute vocale" : "Démarrer la saisie vocale"}
        >
          {isListening ? (
            <MicOff size={14} className="text-red-600 animate-bounce" />
          ) : (
            <Mic size={14} className="text-primary-600 dark:text-primary-300" />
          )}
        </button>

        {isListening && (
          <span className="text-[10px] text-red-500 font-bold animate-pulse flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
            Micro actif (Parlez...)
          </span>
        )}

        {error && (
          <div className="absolute left-0 bottom-full mb-1 bg-red-500 text-white text-[9px] px-2 py-1 rounded shadow-lg z-30 whitespace-nowrap flex items-center gap-1">
            <AlertCircle size={10} />
            {error}
            <button onClick={() => setError(null)} className="ml-1 font-bold">×</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <button
        type="button"
        onClick={toggleListening}
        className={`w-full py-1.5 px-3 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-sm ${
          isListening
            ? 'bg-red-500/10 border-red-500 text-red-600 ring-2 ring-red-500/20'
            : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/30 border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300'
        }`}
      >
        {isListening ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <MicOff size={13} className="animate-bounce" />
            <span className="font-bold">Écoute en cours... Cliquez pour valider</span>
          </>
        ) : (
          <>
            <Mic size={13} className="text-amber-600 dark:text-amber-400" />
            <span>{buttonText}</span>
            <Sparkles size={11} className="text-amber-500 dark:text-amber-400 opacity-80" />
          </>
        )}
      </button>

      {isListening && (
        <div className="text-[10px] text-primary-500 dark:text-primary-400 text-center italic font-mono bg-primary-50 dark:bg-primary-950 p-1.5 rounded border border-primary-100 dark:border-primary-800/80 animate-pulse">
          🗣️ Parlez distinctement. Votre dictée s'ajoutera automatiquement ci-dessous...
        </div>
      )}

      {error && (
        <div className="p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-[10px] text-red-600 dark:text-red-400 flex items-center gap-1.5">
          <AlertCircle size={12} className="shrink-0" />
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-auto font-bold text-xs hover:text-red-800">×</button>
        </div>
      )}
    </div>
  );
};
