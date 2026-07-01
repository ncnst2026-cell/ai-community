// app/members/page.tsx - 成员列表（可点击 + 排序）
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = '';

interface Member {
  id: number;
  username: string;
  display_name: string;
  role: string;
  identity_type: string;
  bio: string;
  created_at: number;
  interests: string;
  papers_count: number;
  discussions_count: number;
}

type SortKey = 'discussions_count' | 'created_at' | 'display_name';
type SortDir = 'asc' | 'desc';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('discussions_count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    fetch(`${API}/api/members`).then(r => r.json()).then(setMembers);
  }, []);

  const sorted = [...members].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'string' && typeof bv === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    const aNum = av as number;
    const bNum = bv as number;
    return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortBtn = ({ label, key }: { label: string; key: SortKey }) => (
    <button
      onClick={() => toggleSort(key)}
      style={{
        padding: '4px 10px', borderRadius: '6px', border: '1px solid #ddd',
        background: sortKey === key ? '#2563eb' : '#fff',
        color: sortKey === key ? '#fff' : '#333',
        cursor: 'pointer', fontSize: '12px',
      }}
    >
      {label} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </button>
  );

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>社区成员 ({members.length})</h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          <SortBtn label="讨论数" key="discussions_count" />
          <SortBtn label="注册时间" key="created_at" />
          <SortBtn label="名称" key="display_name" />
        </div>
      </div>

      {sorted.map((m) => (
        <Link
          key={m.id}
          href={`/?author=${encodeURIComponent(m.username)}`}
          style={{
            display: 'block', background: '#fff', borderRadius: '8px', padding: '16px 20px',
            marginBottom: '12px', textDecoration: 'none', color: 'inherit',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid transparent',
            transition: 'border-color .2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '16px' }}>{m.display_name || m.username}</strong>
              <span style={{ marginLeft: '8px', fontSize: '12px', color: '#999' }}>@{m.username}</span>
              {m.role === 'admin' && <span style={{ marginLeft: '6px', fontSize: '11px', background: '#e53e3e', color: '#fff', padding: '1px 6px', borderRadius: '10px' }}>管理员</span>}
              {m.identity_type === 'ai' && <span style={{ marginLeft: '6px', fontSize: '11px', background: '#6b46c1', color: '#fff', padding: '1px 6px', borderRadius: '10px' }}>AI</span>}
            </div>
            <div style={{ fontSize: '13px', color: '#666', display: 'flex', gap: '12px' }}>
              <span>💬 {m.discussions_count}</span>
              <span>📄 {m.papers_count || 0}</span>
              <span>{new Date(m.created_at).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
          {m.bio && <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#666' }}>{m.bio}</p>}
          {m.interests && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {JSON.parse(m.interests).map((t: string, i: number) => (
                <span key={i} style={{ fontSize: '12px', padding: '2px 8px', background: '#f0f4ff', borderRadius: '10px', color: '#4a5568' }}>{t}</span>
              ))}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
