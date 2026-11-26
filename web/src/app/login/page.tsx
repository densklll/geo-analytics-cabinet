'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

const DEMO_USERS = [
  { email: 'admin@demo.local', password: 'admin123', label: 'Администратор' },
  { email: 'owner@sova.demo', password: 'sova123', label: 'Клиент: кофейня «Сова»' },
  { email: 'owner@gaika.demo', password: 'gaika123', label: 'Клиент: автосервис «Гайка»' },
];

export default function LoginPage() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace('/dashboard');
  }, [ready, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login">
      <form className="card login-card" onSubmit={onSubmit}>
        <div className="brand">
          <span className="brand-mark">ИИ</span> Истинный интеллект
        </div>
        <h1>Вход в кабинет</h1>

        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </label>
        <label className="field">
          <span>Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <div className="form-error">{error}</div>}

        <button className="btn" type="submit" disabled={pending}>
          {pending ? 'Входим…' : 'Войти'}
        </button>

        <div className="demo-users">
          <div className="muted">Демо-доступы (нажмите, чтобы подставить):</div>
          {DEMO_USERS.map((u) => (
            <button
              key={u.email}
              type="button"
              className="link"
              onClick={() => {
                setEmail(u.email);
                setPassword(u.password);
              }}
            >
              {u.label} — {u.email}
            </button>
          ))}
        </div>
      </form>
    </main>
  );
}
