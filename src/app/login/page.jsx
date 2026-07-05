'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ADMIN_EMAILS } from '@/lib/firebase';

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();

  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setError(''); setLoading(true);
    try {
      const cred = await loginWithGoogle();
      if (!ADMIN_EMAILS.includes((cred.user.email || '').toLowerCase())) {
        setError('Access denied — not an admin account.');
        return;
      }
      router.push('/');
    } catch (err) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-xs font-bold tracking-widest uppercase text-white">RobotForge</span>
          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">ADMIN</span>
          <p className="text-xs text-gray-600 mt-2">Restricted access</p>
        </div>

        {error && <p className="text-xs text-red-400 text-center mb-4">{error}</p>}

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full py-2.5 bg-[#111] border border-[#2A2A2A] hover:border-[#3A3A3A] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>
      </div>
    </div>
  );
}
