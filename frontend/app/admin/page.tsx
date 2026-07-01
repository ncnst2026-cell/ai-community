// app/admin/page.tsx - 管理员后台
'use client';

import { useEffect, useState } from 'react';

const API = '';

export default function AdminPage() {
  const [member, setMember] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [tab, setTab] = useState<'posts' | 'members' | 'about'>('posts');
  const [aboutContent, setAboutContent] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API}/api/me`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.role !== 'admin') { setError('需要管理员权限'); return; }
        setMember(data);
      })
      .catch(() => setError('登录失败'));
  }, []);

  useEffect(() => {
    if (!member) return;
    if (tab === 'posts') {
      fetch(`${API}/api/posts?limit=50`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(r => r.json())
        .then(data => setPosts(data.posts || data));
    } else if (tab === 'members') {
      fetch(`${API}/api/members`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(r => r.json())
        .then(data => setMembers(data));
    } else if (tab === 'about') {
      fetch(`${API}/api/config/about_content`)
        .then(r => r.json())
        .then(data => setAboutContent(JSON.stringify(data, null, 2)));
    }
  }, [tab, member]);

  async function togglePin(id: number, current: number) {
    const res = await fetch(`${API}/api/posts/${id}/pin`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
      setPosts(posts.map(p => p.id === id ? { ...p, is_pinned: current ? 0 : 1 } : p));
    } else {
      alert('操作失败');
    }
  }

  async function deletePost(id: number) {
    if (!confirm('确定删除这篇帖子？')) return;
    const res = await fetch(`${API}/api/posts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
      setPosts(posts.filter(p => p.id !== id));
      alert('已删除');
    } else {
      alert('删除失败');
    }
  }

  async function deleteMember(id: number) {
    if (id === member.id) { alert('不能删除自己'); return; }
    if (!confirm('确定删除这个成员？')) return;
    const res = await fetch(`${API}/api/members/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
      setMembers(members.filter(m => m.id !== id));
      alert('已删除');
    } else {
      alert('删除失败');
    }
  }

  async function saveAbout() {
    try {
      JSON.parse(aboutContent); // 验证 JSON
    } catch { alert('JSON 格式错误'); return; }
    const res = await fetch(`${API}/api/config/about_content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(JSON.parse(aboutContent))
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    else alert('保存失败');
  }

  if (error) return <div style={{ textAlign: 'center', padding: '60px', color: '#e53e3e' }}>{error}</div>;
  if (!member) return <div style={{ textAlign: 'center', padding: '60px' }}>加载中...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>管理后台</h1>
        <span style={{ fontSize: '13px', color: '#999' }}>管理员：{member.display_name || member.username}</span>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => setTab('posts')} style={btn(tab === 'posts')}>帖子管理</button>
        <button onClick={() => setTab('members')} style={btn(tab === 'members')}>成员管理</button>
        <button onClick={() => setTab('about')} style={btn(tab === 'about')}>关于页编辑</button>
      </div>

      {tab === 'posts' && (
        <div>
          <h3>帖子列表（{posts.length} 篇）</h3>
          {posts.map(p => (
            <div key={p.id} style={itemRow}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{p.title}</div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  by {p.author_name} · {new Date(p.created_at).toLocaleDateString('zh-CN')} · 💬{p.comment_count || 0}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => togglePin(p.id, p.is_pinned)} style={{ ...delBtn, background: p.is_pinned ? '#fef3c7' : '#f0f4ff', color: p.is_pinned ? '#d97706' : '#2563eb' }}>
                  {p.is_pinned ? '取消置顶' : '置顶'}
                </button>
                <button onClick={() => deletePost(p.id)} style={delBtn}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'members' && (
        <div>
          <h3>成员列表（{members.length} 人）</h3>
          {members.map(m => (
            <div key={m.id} style={itemRow}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{m.display_name || m.username}</div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  @{m.username} · {m.role} · {m.discussions_count} 篇讨论
                </div>
              </div>
              <button onClick={() => deleteMember(m.id)} style={delBtn}>删除</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'about' && (
        <div>
          <h3>关于页内容（JSON 格式）</h3>
          <textarea
            value={aboutContent}
            onChange={e => setAboutContent(e.target.value)}
            rows={20}
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', boxSizing: 'border-box' }}
          />
          <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={saveAbout} style={primaryBtn}>保存</button>
            {saved && <span style={{ color: '#059669', fontSize: '13px' }}>已保存 ✓</span>}
          </div>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '12px' }}>
            修改后刷新关于页即可看到效果。字段说明：intro（开头语）、intro_sub/intro_sub2（副标题）、layers（三个层次）、philosophy/philosophy2（理念）、cta/cta_link（行动按钮）
          </p>
        </div>
      )}
    </div>
  );
}

const btn = (active: boolean) => ({
  padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer',
  background: active ? '#2563eb' : '#f0f0f0', color: active ? '#fff' : '#666', fontSize: '13px',
});

const delBtn = {
  padding: '4px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer',
  background: '#fee2e2', color: '#dc2626', fontSize: '12px',
};

const primaryBtn = {
  padding: '8px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer',
  background: '#2563eb', color: '#fff', fontSize: '14px',
};

const itemRow = {
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '12px 0', borderBottom: '1px solid #f0f0f0',
};
