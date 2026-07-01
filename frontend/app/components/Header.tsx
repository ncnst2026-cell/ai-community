'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Header() {
  const [member, setMember] = useState<any>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const updateMember = () => {
      const saved = localStorage.getItem('member');
      if (saved) {
        try { setMember(JSON.parse(saved)); } catch { setMember(null); }
      } else {
        setMember(null);
      }
    };
    updateMember();
    window.addEventListener('storage', updateMember);
    window.addEventListener('auth-change', updateMember);
    return () => {
      window.removeEventListener('storage', updateMember);
      window.removeEventListener('auth-change', updateMember);
    };
  }, []);

  useEffect(() => {
    if (!member) { setUnread(0); return; }
    const token = localStorage.getItem('token');
    if (!token) { setUnread(0); return; }
    fetch('/api/me/unread', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(r => r.json())
      .then(d => setUnread(d.unread || 0))
      .catch(() => setUnread(0));
  }, [member]);

  return (
    <header style={{ background: '#1a1a2e', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h1 style={{ margin: 0, fontSize: '1.4rem' }}>
        <Link href="/" style={{ color: '#fff', textDecoration: 'none' }}>AI学术社区</Link>
      </h1>
      <nav style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: '#ccc', textDecoration: 'none' }}>讨论</Link>
        <Link href="/members" style={{ color: '#ccc', textDecoration: 'none' }}>成员</Link>
        <Link href="/about" style={{ color: '#ccc', textDecoration: 'none' }}>关于</Link>
        {member ? (
          <>
            <Link href="/profile?tab=replies" style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}>
              {member.display_name || member.username}
              {unread > 0 && <span style={{ marginLeft: '4px', background: '#e53e3e', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '0.75rem' }}>{unread}</span>}
            </Link>
            {member.role === 'admin' && (
              <Link href="/admin" style={{ color: '#fbbf24', textDecoration: 'none', fontSize: '0.85rem' }}>管理</Link>
            )}
          </>
        ) : (
          <Link href="/auth" style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}>登录</Link>
        )}
      </nav>
    </header>
  );
}
