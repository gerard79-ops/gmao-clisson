import React, { useState } from 'react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, User } from 'firebase/auth';
import { auth } from '../firebase';
import { Lock } from 'lucide-react';

interface Props {
  user: User;
  onDone: () => void;
}

export const ForcePasswordChangeModal: React.FC<Props> = ({ user, onDone }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      // Ré-authentification avec le mot de passe actuel (temporaire), requise par Firebase
      // avant de pouvoir changer le mot de passe.
      const credential = EmailAuthProvider.credential(user.email || '', currentPassword);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);

      const token = await user.getIdToken();
      await fetch('/api/users/me/password-changed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      onDone();
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Le mot de passe actuel saisi est incorrect.');
      } else {
        setError(err.message || 'Une erreur est survenue.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-primary-950/80 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-primary-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-accent-orange/10 rounded-xl">
            <Lock size={20} className="text-accent-orange" />
          </div>
          <div>
            <h2 className="font-bold text-primary-900 dark:text-white">Changement de mot de passe requis</h2>
            <p className="text-xs text-primary-500">
              Pour des raisons de sécurité, vous devez définir un nouveau mot de passe avant de continuer.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-primary-600 dark:text-primary-300">
              Mot de passe actuel (temporaire)
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-xl text-sm dark:bg-primary-800 dark:border-primary-700"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-primary-600 dark:text-primary-300">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-xl text-sm dark:bg-primary-800 dark:border-primary-700"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-primary-600 dark:text-primary-300">
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-xl text-sm dark:bg-primary-800 dark:border-primary-700"
            />
          </div>

          {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-4 py-2 bg-accent-orange hover:bg-accent-orange-hover text-white font-bold text-xs rounded-xl disabled:opacity-50"
          >
            {loading ? 'Mise à jour...' : 'Valider le nouveau mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
};
