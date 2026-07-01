// app/profile/page.tsx - 个人主页
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const API = '';

interface Member {
  id: number;
  username: string;
  display_name: string;
  bio: string;
  interests: string;
  discussions_count: number;
  created_at: number;
  posts?: any[];
  comments?: any[];
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') as 'posts' | 'replies' | null;
  const [member, setMember] = useState<Member | null>(null);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<'posts' | 'replies'>(initialTab || 'posts');
  const [replies, setReplies] = useState<any[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('');
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [isLogin, setIsLogin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setIsLogin(false); return; }
    setIsLogin(true);
    fetch(`${API}/api/me`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (!data.username) { setIsLogin(false); localStorage.removeItem('token'); return; }
        setMember(data);
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setInterests(data.interests ? JSON.parse(data.interests).join(', ') : '');
      })
      .catch(() => { setIsLogin(false); });
  }, []);

  useEffect(() => {
    if (tab !== 'replies') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API}/api/me/replies`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setReplies(data.replies || []))
      .then(() => {
        fetch(`${API}/api/me/mark-read`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      })
      .catch(() => setReplies([]));
  }, [tab]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          display_name: displayName,
          bio: bio,
          interests: interests.split(',').map(s => s.trim()).filter(Boolean),
          password: password || undefined
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMember({ ...member, ...data });
        setSaved(true);
        setPassword('');
      }
    } catch (e) {
      console.error('save failed:', e);
    }
  }

  if (!isLogin || !member) {
    return (
      <div style={{ textAlign: 'center', marginTop: '80px' }}>
        <p style={{ color: '#666' }}>请先 <a href="/auth" style={{ color: '#2563eb' }}>登录</a></p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '32px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#e8e0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 16px', color: '#6b46c1' }}>
          {member.display_name?.[0] || member.username[0]}
        </div>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem' }}>{member.display_name || member.username}</h2>
        <p style={{ margin: 0, color: '#999', fontSize: '0.9rem' }}>@{member.username}</p>
        <p style={{ margin: '8px 0 0', color: '#999', fontSize: '0.85rem' }}>{member.discussions_count} 篇讨论 · 加入于 {new Date(member.created_at).toLocaleDateString('zh-CN')}</p>
        <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('member'); window.dispatchEvent(new Event('auth-change')); window.location.href = '/'; }}
          style={{ marginTop: '12px', padding: '6px 16px', background: 'none', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', color: '#999', cursor: 'pointer' }}>
          退出登录
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {editing ? (
          <form onSubmit={handleSave}>
            <label style={{ display: 'block', marginBottom: '16px', fontSize: '14px', color: '#666' }}>
              显示名
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                style={{ width: '100%', padding: '10px', marginTop: '6px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '16px', fontSize: '14px', color: '#666' }}>
              签名 / 简介
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                style={{ width: '100%', padding: '10px', marginTop: '6px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '20px', fontSize: '14px', color: '#666' }}>
              兴趣（用逗号分隔）
              <input type="text" value={interests} onChange={(e) => setInterests(e.target.value)}
                style={{ width: '100%', padding: '10px', marginTop: '6px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '20px', fontSize: '14px', color: '#666' }}>
              修改密码（留空则不修改）
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="新密码（至少6位）"
                style={{ width: '100%', padding: '10px', marginTop: '6px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>保存</button>
              <button type="button" onClick={() => setEditing(false)} style={{ padding: '10px 24px', background: '#f0f0f0', color: '#666', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>取消</button>
            </div>
            {saved && <p style={{ color: '#059669', fontSize: '13px', marginTop: '12px' }}>已保存 ✓</p>}
          </form>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>关于我</h3>
              <button onClick={() => setEditing(true)} style={{ padding: '6px 16px', background: 'none', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', color: '#666', cursor: 'pointer' }}>编辑</button>
            </div>
            {member.bio ? (
              <p style={{ color: '#555', marginBottom: '16px' }}>{member.bio}</p>
            ) : (
              <p style={{ color: '#aaa', fontStyle: 'italic', marginBottom: '16px' }}>还没有签名……</p>
            )}
            {member.interests && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {JSON.parse(member.interests).map((t: string, i: number) => (
                  <span key={i} style={{ fontSize: '12px', padding: '3px 10px', background: '#f0f4ff', borderRadius: '12px', color: '#4a5568' }}>{t}</span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', marginTop: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
          <button onClick={() => setTab('posts')} style={tabBtn(tab === 'posts')}>
            我的帖子 {(member.posts?.length || 0) > 0 && `(${member.posts.length})`}
          </button>
          <button onClick={() => setTab('replies')} style={tabBtn(tab === 'replies')}>
            回复我的 {replies.length > 0 && <span style={{ marginLeft: '4px', background: '#e53e3e', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '11px' }}>{replies.length}</span>}
          </button>
        </div>

        {tab === 'posts' && (
          member.posts && member.posts.length > 0 ? (
            member.posts.map((p: any) => (
              <a key={p.id} href={`/post/${p.id}`} style={itemStyle}>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{p.title}</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  <span style={layerBadge(p.layer)}>{p.layer === 'deep' ? '深' : p.layer === 'shallow' ? '浅' : '中'}</span>
                  <span style={{ marginLeft: '8px' }}>{new Date(p.created_at).toLocaleDateString('zh-CN')}</span>
                  {p.is_anonymous === 1 && <span style={{ marginLeft: '8px', color: '#aaa' }}>匿名</span>}
                </div>
              </a>
            ))
          ) : (
            <p style={{ color: '#aaa', fontSize: '14px' }}>还没有发过帖子</p>
          )
        )}

        {tab === 'replies' && (
          replies.length > 0 ? (
            replies.map((r: any) => (
              <a key={r.id} href={`/post/${r.post_id}`} style={itemStyle}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 500, color: '#666' }}>{r.author_name}</span>
                  {' '}回复了你对「{r.post_title}」的评论
                </div>
                <div style={{ fontSize: '13px', color: '#333', padding: '8px 12px', background: '#f9f9f9', borderRadius: '6px' }}>
                  {r.content}
                </div>
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
                  你说：{r.my_comment?.slice(0, 50)}{r.my_comment?.length > 50 ? '...' : ''}
                </div>
              </a>
            ))
          ) : (
            <p style={{ color: '#aaa', fontSize: '14px' }}>还没有人回复你</p>
          )
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>}>
      <ProfileContent />
    </Suspense>
  );
}

const tabBtn = (active: boolean) => ({
  background: 'none', border: 'none', padding: '4px 0', fontSize: '14px',
  fontWeight: active ? 600 : 400, color: active ? '#2563eb' : '#999', cursor: 'pointer',
  borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
});

const itemStyle = { display: 'block', padding: '12px 0', borderBottom: '1px solid #f5f5f5', textDecoration: 'none', color: 'inherit' };

const layerBadge = (layer: string) => ({
  padding: '1px 6px', borderRadius: '4px',
  background: layer === 'deep' ? '#ede9fe' : layer === 'shallow' ? '#d1fae5' : '#dbeafe',
  color: layer === 'deep' ? '#6b46c1' : layer === 'shallow' ? '#059669' : '#2563eb',
});
