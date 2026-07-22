import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { Lock, Mail, AlertTriangle, Loader2, KeyRound, CheckCircle, RefreshCw, Send } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (email: string, role: 'Technicien' | 'Manager') => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState<Record<string, boolean>>({});
  const [showBypass, setShowBypass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      const role = email.trim() === 'admin@gmaopro.com' ? 'Manager' : 'Technicien';
      onLoginSuccess(email.trim(), role);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("L'authentification par e-mail et mot de passe n'est pas activée dans votre console Firebase (erreur: auth/operation-not-allowed). Veuillez utiliser le mode de connexion local ci-dessous.");
        setShowBypass(true);
      } else {
        switch (err.code) {
          case 'auth/invalid-email':
            setError('Adresse e-mail non valide.');
            break;
          case 'auth/user-disabled':
            setError('Ce compte utilisateur a été désactivé.');
            break;
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            setError('Identifiants incorrects. Veuillez essayer le mot de passe de test "gmaopro123" ou utiliser le bouton d\'initialisation ci-dessous.');
            break;
          default:
            setError(`Une erreur est survenue lors de la connexion (${err.message || err.code}). Veuillez réessayer.`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (targetEmail: string) => {
    setEmail(targetEmail);
    setPassword('gmaopro123');
    setError(null);
    setSuccessMessage(null);
  };

  const handleBypassLogin = (targetEmail: string) => {
    const role = targetEmail === 'admin@gmaopro.com' ? 'Manager' : 'Technicien';
    onLoginSuccess(targetEmail, role);
  };

  const handleInitializeAccount = async (targetEmail: string) => {
    setInitLoading(prev => ({ ...prev, [targetEmail]: true }));
    setError(null);
    setSuccessMessage(null);

    try {
      // Try to create the user with default password
      await createUserWithEmailAndPassword(auth, targetEmail, 'gmaopro123');
      setSuccessMessage(`Le compte ${targetEmail} a été créé avec succès sur Firebase Auth ! Le mot de passe est "gmaopro123". Vous êtes maintenant connecté.`);
      setEmail(targetEmail);
      setPassword('gmaopro123');
      const role = targetEmail === 'admin@gmaopro.com' ? 'Manager' : 'Technicien';
      onLoginSuccess(targetEmail, role);
    } catch (err: any) {
      console.error('Creation error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("L'inscription par e-mail/mot de passe n'est pas activée dans la console Firebase (auth/operation-not-allowed). Vous pouvez utiliser le bouton 'Se connecter en mode local' ou activer l'option 'Adresse e-mail/mot de passe' dans votre console Firebase.");
        setShowBypass(true);
      } else if (err.code === 'auth/email-already-in-use') {
        // If already exists, notify user and try to log in
        try {
          await signInWithEmailAndPassword(auth, targetEmail, 'gmaopro123');
          setSuccessMessage(`Le compte ${targetEmail} existait déjà. Connexion réussie avec le mot de passe "gmaopro123" !`);
          const role = targetEmail === 'admin@gmaopro.com' ? 'Manager' : 'Technicien';
          onLoginSuccess(targetEmail, role);
        } catch (loginErr: any) {
          setError(`Le compte ${targetEmail} existe déjà dans Firebase Auth, mais le mot de passe par défaut "gmaopro123" ne correspond pas. Vous pouvez cliquer sur "Reset" pour recevoir un email.`);
        }
      } else {
        setError(`Impossible d'initialiser le compte: ${err.message || err.code}`);
      }
    } finally {
      setInitLoading(prev => ({ ...prev, [targetEmail]: false }));
    }
  };

  const handleResetPassword = async (targetEmail: string) => {
    setError(null);
    setSuccessMessage(null);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setSuccessMessage(`Un e-mail de réinitialisation de mot de passe a été envoyé à ${targetEmail}. Veuillez vérifier votre boîte de réception.`);
    } catch (err: any) {
      setError(`Erreur lors de l'envoi de l'e-mail: ${err.message || err.code}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-slate-800 p-8 rounded-2xl border border-slate-700/60 shadow-2xl relative overflow-hidden">
        
        {/* Decorative background subtle glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center relative">
          <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <KeyRound className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">
            GMAO Pro
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Portail de connexion sécurisé
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="space-y-3">
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 flex items-start gap-2 text-xs text-red-400 animate-fadeIn">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold block">Erreur de connexion :</span>
                  <span>{error}</span>
                </div>
              </div>
              
              {/* Specialized Troubleshooting Guide */}
              {(error.includes('auth/operation-not-allowed') || showBypass) && (
                <div className="rounded-xl bg-indigo-950/40 border border-indigo-500/20 p-4 text-xs text-indigo-300 space-y-2.5 animate-fadeIn">
                  <span className="font-bold text-slate-100 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    Comment activer la connexion par E-mail ?
                  </span>
                  <p className="text-slate-300 leading-normal">
                    La console Firebase indique que la connexion par e-mail/mot de passe est bloquée ou mal configurée pour le projet <strong className="text-white font-mono bg-slate-900/60 px-1 py-0.5 rounded">intricate-spring-38gvj</strong>. Voici comment corriger cela :
                  </p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-slate-400 leading-normal">
                    <li>Ouvrez votre console Firebase pour le projet <strong className="text-slate-200">intricate-spring-38gvj</strong>.</li>
                    <li>Dans le menu de gauche, cliquez sur <strong className="text-slate-200">Authentication</strong>.</li>
                    <li>Allez sur l'onglet <strong className="text-slate-200">Sign-in method</strong>.</li>
                    <li>Cliquez sur le fournisseur <strong className="text-slate-200">Adresse e-mail/mot de passe</strong> (Email/Password).</li>
                    <li>Activez le premier interrupteur <strong className="text-indigo-400">"Adresse e-mail/mot de passe"</strong> (ne confondez pas avec "Lien par e-mail (connexion sans mot de passe)" !).</li>
                    <li>Cliquez impérativement sur le bouton <strong className="text-white">Enregistrer</strong> (Save) en bas à droite.</li>
                  </ol>
                  <p className="text-[10px] text-slate-500 italic mt-1">
                    💡 Astuce de secours : Vous pouvez également cliquer sur l'un des boutons de connexion en mode local ci-dessous pour utiliser l'application immédiatement.
                  </p>
                </div>
              )}
            </div>
          )}

          {successMessage && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-start gap-2 text-xs text-emerald-400 animate-fadeIn">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Adresse e-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition text-sm"
                  placeholder="exemple@gmaopro.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-500">
              Le mot de passe de test par défaut est <strong className="text-indigo-400 font-mono">gmaopro123</strong>
            </span>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  Connexion en cours...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </div>
        </form>
        
        {/* Suggest preconfigured users to help user log in easily */}
        <div className="mt-6 pt-6 border-t border-slate-700/60">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-3 text-center">Comptes de test & Outils de secours</p>
          <div className="space-y-3">
            
            {/* Admin account card */}
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/40 hover:border-slate-600 transition flex flex-col justify-between gap-2">
              <div className="flex justify-between items-start">
                <div className="cursor-pointer" onClick={() => handleQuickFill('admin@gmaopro.com')}>
                  <span className="font-bold text-slate-300 text-xs block hover:text-indigo-400 transition">Manager / Admin ↗</span>
                  <span className="text-[10px] text-slate-400 font-mono">admin@gmaopro.com</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleResetPassword('admin@gmaopro.com')}
                    className="px-1.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[9px] font-bold flex items-center gap-1 transition"
                    title="Envoyer un e-mail de réinitialisation"
                  >
                    <Send className="h-2.5 w-2.5" />
                    Reset
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <button
                  onClick={() => handleBypassLogin('admin@gmaopro.com')}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-sm"
                  title="Se connecter directement en mode local"
                >
                  Se connecter (Local)
                </button>
                <button
                  onClick={() => handleInitializeAccount('admin@gmaopro.com')}
                  disabled={initLoading['admin@gmaopro.com']}
                  className="px-2 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-indigo-400 text-[10px] font-semibold border border-indigo-500/20 flex items-center gap-1 transition disabled:opacity-50"
                  title="Créer ce compte sur Firebase Auth"
                >
                  {initLoading['admin@gmaopro.com'] ? <Loader2 className="animate-spin h-2.5 w-2.5" /> : <RefreshCw className="h-2.5 w-2.5" />}
                  Créer Firebase
                </button>
              </div>
              <p className="text-[9px] text-slate-500 leading-normal">
                Cliquez sur le nom pour remplir le formulaire. En cas d'erreur de règles Firebase, cliquez sur <strong className="text-slate-400">Se connecter (Local)</strong> pour passer outre.
              </p>
            </div>

            {/* Tech account card */}
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/40 hover:border-slate-600 transition flex flex-col justify-between gap-2">
              <div className="flex justify-between items-start">
                <div className="cursor-pointer" onClick={() => handleQuickFill('tech1@gmaopro.com')}>
                  <span className="font-bold text-slate-300 text-xs block hover:text-indigo-400 transition">Technicien de Terrain ↗</span>
                  <span className="text-[10px] text-slate-400 font-mono">tech1@gmaopro.com</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleResetPassword('tech1@gmaopro.com')}
                    className="px-1.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[9px] font-bold flex items-center gap-1 transition"
                    title="Envoyer un e-mail de réinitialisation"
                  >
                    <Send className="h-2.5 w-2.5" />
                    Reset
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <button
                  onClick={() => handleBypassLogin('tech1@gmaopro.com')}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-sm"
                  title="Se connecter directement en mode local"
                >
                  Se connecter (Local)
                </button>
                <button
                  onClick={() => handleInitializeAccount('tech1@gmaopro.com')}
                  disabled={initLoading['tech1@gmaopro.com']}
                  className="px-2 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20 flex items-center gap-1 transition disabled:opacity-50"
                  title="Créer ce compte sur Firebase Auth"
                >
                  {initLoading['tech1@gmaopro.com'] ? <Loader2 className="animate-spin h-2.5 w-2.5" /> : <RefreshCw className="h-2.5 w-2.5" />}
                  Créer Firebase
                </button>
              </div>
              <p className="text-[9px] text-slate-500 leading-normal">
                Cliquez sur le nom pour remplir le formulaire. En cas d'erreur de règles Firebase, cliquez sur <strong className="text-slate-400">Se connecter (Local)</strong> pour passer outre.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

