// app/page.tsx - 首页：帖子列表 + 发帖表单（支持登录、匿名、搜索、分页）
'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from './components/Header';

const API = '';

interface Member {
  id: number;
  username: string;
  display_name: string;
  role: string;
  identity_type: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  layer: string;
  author_name: string;
  author_type: string | null;
  is_anonymous: number;
  comment_count: number;
  created_at: number;
}

const layerLabels: Record<string, string> = { deep: '深', middle: '中', shallow: '浅' };
const layerColors: Record<string, string> = { deep: '#6b46c1', middle: '#2563eb', shallow: '#059669' };
const PAGE_SIZE = 10;

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [layer, setLayer] = useState('middle');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLayer, setFilterLayer] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const loadPosts = useCallback(async (s?: string, fl?: string | null, p?: number) => {
    const queryS = s ?? search;
    const queryL = fl ?? filterLayer;
    const queryP = p ?? page;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(p * PAGE_SIZE) });
      if (s) params.set('search', s);
      if (fl) params.set('layer', fl);
      const res = await fetch(`${API}/api/posts?${params}`);
      const data = await res.json();
      setPosts(data.posts || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to load posts:', e);
    } finally {
      setLoading(false);
    }
  }, [search, filterLayer, page]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('member');
    if (token && saved) {
      try { setMember(JSON.parse(saved)); } catch {}
    }
    loadPosts();
  }, []);

  useEffect(() => {
    loadPosts(search, filterLayer, page);
  }, [search, filterLayer, page]);

  const [saveMsg, setSaveMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    if (!member) {
      window.location.href = '/auth';
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, content, layer, is_anonymous: isAnonymous }),
      });
      if (res.ok) {
        setTitle('');
        setContent('');
        setIsAnonymous(false);
        setPage(0);
        loadPosts(search, filterLayer, 0);
        setSaveMsg('发布成功 ✓');
        setTimeout(() => setSaveMsg(''), 2000);
      }
    } catch (e) {
      console.error('Failed to post:', e);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    loadPosts(search, 0);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* 发帖表单 */}
      <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {member ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>
                {isAnonymous ? <span>以 <span style={{fontWeight:600}}>匿名</span> 身份发言</span> : <span>以 <span style={{fontWeight:600}}>{member.display_name}</span> 的身份发言</span>}
              </span>
              <a href="/profile" style={{ fontSize: '12px', color: '#999', textDecoration: 'none' }}>编辑资料</a>
            </div>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }} />
              <textarea placeholder="内容..." value={content} onChange={(e) => setContent(e.target.value)} rows={4}
                style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={layer} onChange={(e) => setLayer(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                  <option value="deep">深层</option>
                  <option value="middle">中层</option>
                  <option value="shallow">浅层</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#666', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                  匿名
                </label>
                <button type="submit" style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  发布
                </button>
                {saveMsg && <span style={{ color: '#059669', fontSize: '13px' }}>{saveMsg}</span>}
              </div>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: '#666', marginBottom: '12px' }}>登录后才能发言</p>
            <a href="/auth" style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '14px' }}>
              登录 / 注册
            </a>
          </div>
        )}
      </div>

      {/* 搜索框 */}
      <form onSubmit={handleSearch} style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="搜索讨论……"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
        />
        <button type="submit" style={{ padding: '10px 20px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
          搜索
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setPage(0); }} style={{ padding: '10px 16px', background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '14px' }}>
            清除
          </button>
        )}
      </form>

      {/* 层次筛选 */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
        <button onClick={() => { setFilterLayer(null); setPage(0); }}
          style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid #ddd', background: filterLayer === null ? '#2563eb' : '#fff', color: filterLayer === null ? '#fff' : '#666', cursor: 'pointer', fontSize: '13px' }}>
          全部
        </button>
        <button onClick={() => { setFilterLayer('deep'); setPage(0); }}
          style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid #6b46c1', background: filterLayer === 'deep' ? '#6b46c1' : '#fff', color: filterLayer === 'deep' ? '#fff' : '#6b46c1', cursor: 'pointer', fontSize: '13px' }}>
          深
        </button>
        <button onClick={() => { setFilterLayer('middle'); setPage(0); }}
          style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid #2563eb', background: filterLayer === 'middle' ? '#2563eb' : '#fff', color: filterLayer === 'middle' ? '#fff' : '#2563eb', cursor: 'pointer', fontSize: '13px' }}>
          中
        </button>
        <button onClick={() => { setFilterLayer('shallow'); setPage(0); }}
          style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid #059669', background: filterLayer === 'shallow' ? '#059669' : '#fff', color: filterLayer === 'shallow' ? '#fff' : '#059669', cursor: 'pointer', fontSize: '13px' }}>
          浅
        </button>
      </div>

      {/* 帖子列表 */}
      <div>
        <h3 style={{ marginBottom: '16px' }}>
          {search ? `搜索结果 (${total})` : `最新讨论 (${total})`}
        </h3>
        {loading ? (
          <p style={{ color: '#999' }}>加载中...</p>
        ) : posts.length === 0 ? (
          <p style={{ color: '#999' }}>没有找到讨论</p>
        ) : (
          posts.map((post) => (
            <a key={post.id} href={`/post/${post.id}`}
              style={{ display: 'block', background: '#fff', borderRadius: '8px', padding: '16px 20px', marginBottom: '12px', textDecoration: 'none', color: 'inherit', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px', fontWeight: 600 }}>
                  {post.is_pinned === 1 && <span style={{ marginRight: '6px', color: '#e53e3e' }}>📌</span>}
                  {post.title}
                </span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: layerColors[post.layer] || '#666', color: '#fff' }}>
                  {layerLabels[post.layer] || post.layer}
                </span>
              </div>
              <p style={{ margin: '6px 0', color: '#666', fontSize: '14px', lineHeight: 1.5 }}>
                {post.content.length > 120 ? post.content.slice(0, 120) + '...' : post.content}
              </p>
              <div style={{ fontSize: '12px', color: '#999', display: 'flex', gap: '12px' }}>
                <span>{post.author_name}</span>
                <span>💬 {post.comment_count || 0}</span>
                <span>{new Date(post.created_at).toLocaleString('zh-CN')}</span>
              </div>
            </a>
          ))
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              style={{ padding: '8px 16px', background: page === 0 ? '#f0f0f0' : '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: page === 0 ? 'not-allowed' : 'pointer', color: page === 0 ? '#ccc' : '#333' }}
            >上一页</button>
            <span style={{ padding: '8px 12px', color: '#666', fontSize: '14px' }}>{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              style={{ padding: '8px 16px', background: page >= totalPages - 1 ? '#f0f0f0' : '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', color: page >= totalPages - 1 ? '#ccc' : '#333' }}
            >下一页</button>
          </div>
        )}
      </div>
    </div>
  );
}
