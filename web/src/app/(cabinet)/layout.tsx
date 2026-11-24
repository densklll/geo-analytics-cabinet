'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { Loader } from '@/components/States';
import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/dashboard', label: 'Дашборд' },
  { href: '/branches', label: 'Филиалы' },
  { href: '/reviews', label: 'Отзывы' },
];

function Nav() {
  const pathname = usePathname();
  const params = useSearchParams();
  // при переходе между разделами сохраняем выбранные фильтры
  const qs = params.toString();
  return (
    <nav className="nav">
      {NAV.map((item) => (
        <Link key={item.href} href={qs ? `${item.href}?${qs}` : item.href} className={pathname === item.href ? 'active' : ''}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  if (!ready || !user) return <Loader label="Проверяем доступ…" />;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">ИИ</span> Истинный интеллект
        </div>
        <Suspense>
          <Nav />
        </Suspense>
        <div className="sidebar-user">
          <div className="user-name">{user.fullName}</div>
          <div className="muted">{user.role === 'admin' ? 'Администратор' : user.company?.name}</div>
          <button className="link" onClick={logout}>
            Выйти
          </button>
        </div>
      </aside>
      <main className="content">
        <Suspense fallback={<Loader />}>{children}</Suspense>
      </main>
    </div>
  );
}
