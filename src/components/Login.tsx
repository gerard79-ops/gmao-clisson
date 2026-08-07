import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { Lock, Mail, AlertTriangle, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import logoGroupe from '../assets/logo-groupe-clisson.png';

interface LoginProps {
  onLoginSuccess: (email: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

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
      onLoginSuccess(email.trim());
    } catch (err: any) {
      console.error('Login error:', err);
      switch (err.code) {
        case 'auth/invalid-email':
          setError('Adresse e-mail non valide.');
          break;
        case 'auth/user-disabled':
          setError('Ce compte utilisateur a été désactivé. Contactez votre administrateur.');
          break;
        case 'auth/operation-not-allowed':
          setError("L'authentification par e-mail et mot de passe n'est pas activée sur ce projet. Contactez votre administrateur.");
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Adresse e-mail ou mot de passe incorrect.');
          break;
        default:
          setError(`Une erreur est survenue lors de la connexion (${err.message || err.code}). Veuillez réessayer.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Renseignez d'abord votre adresse e-mail ci-dessus, puis cliquez sur \"Mot de passe oublié\".");
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMessage(`Un e-mail de réinitialisation a été envoyé à ${email.trim()}. Vérifiez votre boîte de réception.`);
    } catch (err: any) {
      setError(`Erreur lors de l'envoi de l'e-mail : ${err.message || err.code}`);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans">

      {/* ===== LEFT PANEL — BRAND ===== */}
      <div
        className="relative lg:w-[42%] flex flex-col items-center justify-center px-8 py-10 lg:py-0 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #142B4D 0%, #0A1730 100%)' }}
      >
        {/* Brushed-metal texture: fine diagonal hairlines, very subtle */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(115deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 14px)'
          }}
        />
        {/* Soft radial glow behind the logo */}
        <div
          className="absolute w-[520px] h-[520px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(249,115,22,0.10) 0%, rgba(249,115,22,0) 70%)'
          }}
        />

        <div className="relative flex flex-col items-center max-w-sm text-center">
          <img
            src={logoGroupe}
            alt="Groupe Clisson"
            className="w-full max-w-[300px] h-auto rounded-2xl shadow-2xl shadow-black/40"
          />
          <p
            className="mt-8 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400"
          >
            Clisson Métal · Laseris · Atlantique Armatures
          </p>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            Portail de Gestion de Maintenance Assistée par Ordinateur
          </p>
        </div>

        <p className="hidden lg:block absolute bottom-6 text-[10px] text-slate-500 tracking-wide">
          © {new Date().getFullYear()} Groupe Clisson — Accès réservé aux collaborateurs
        </p>
      </div>

      {/* ===== SEAM — signature laser line ===== */}
      <div className="hidden lg:block relative w-px">
        <div
          className="absolute inset-y-0 left-0 w-px"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, #F97316 20%, #F97316 80%, transparent 100%)',
            boxShadow: '0 0 12px 1px rgba(249,115,22,0.55)'
          }}
        />
      </div>

      {/* ===== RIGHT PANEL — FORM ===== */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">

          <div className="mb-9">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-orange">
              GMAO Pro
            </span>
            <h1
              className="mt-2 text-2xl font-bold text-slate-900"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Connexion à votre espace
            </h1>
           <p className="mt-2 text-sm text-slate-600">
              Entrez vos identifiants pour accéder au portail de maintenance.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2.5 text-xs text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">Erreur de connexion</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2.5 text-xs text-emerald-700">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <div>
<label htmlFor="email-address" className="block text-xs font-bold text-slate-800 mb-1.5">
                Adresse e-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
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
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-orange/40 focus:border-accent-orange focus:bg-white transition text-sm"
                  placeholder="vous@groupeclisson.fr"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
<label htmlFor="password" className="block text-xs font-bold text-slate-800">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-[11px] text-accent-orange hover:text-accent-orange-hover font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  {resetLoading ? 'Envoi...' : 'Mot de passe oublié ?'}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-orange/40 focus:border-accent-orange focus:bg-white transition text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-accent-orange hover:bg-accent-orange-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-orange transition cursor-pointer shadow-sm shadow-orange-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Connexion en cours...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <p className="mt-8 text-[11px] text-slate-400 text-center lg:hidden">
            © {new Date().getFullYear()} Groupe Clisson — Accès réservé aux collaborateurs
          </p>
        </div>
      </div>
    </div>
  );
}
