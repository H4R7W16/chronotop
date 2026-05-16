import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore.js';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-parchment-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl" aria-hidden="true">⌛</span>
          <h1 className="font-serif text-2xl font-semibold text-ink-800 mt-3">Anmelden</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-parchment-200 p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1" htmlFor="email">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-parchment-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-burgundy-400 focus:ring-1 focus:ring-burgundy-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1" htmlFor="password">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-parchment-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-burgundy-400 focus:ring-1 focus:ring-burgundy-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-burgundy-500 hover:bg-burgundy-600 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Wird angemeldet…' : 'Anmelden'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-500 mt-4">
          Noch kein Konto?{' '}
          <Link to="/register" className="text-burgundy-600 hover:underline font-medium">
            Registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
