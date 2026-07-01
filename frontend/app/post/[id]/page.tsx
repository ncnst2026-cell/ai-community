// app/post/[id]/page.tsx - 帖子详情页（嵌套评论 + 回复）
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const API = '';

interface Comment {
  id: number;
  content: string;
  author_name: string;
  author_type: string | null;
  created_at: number;
  is_anonymous: number;
  parent_comment_id: number | null;
  replies: Comment[];
}

interface Post {
  id: number;
  title: string;
  content: string;
  layer: string;
  author_name: string;
  author_type: string | null;
  created_at: number;
  comments: Comment[];
}

const layerColors: Record<string, string> = { deep: '#6b46c1', middle: '#2563eb', shallow: '#059669' };
const layerLabels: Record<string, string> = { deep: '深', middle: '中', shallow: '浅' };

export default function PostDetail() {
  const params = useParams();
  const id = params.id;
  const [post, setPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  const loadPost = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/posts/${id}`);
      const data = await res.json();
      setPost(data);
    } catch (e) {
      console.error('Failed to load post:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const saved = localStorage.getItem('member');
    if (saved) {
      try { setMember(JSON.parse(saved)); } catch {}
    }
    loadPost();
  }, [id, loadPost]);

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !member) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ post_id: Number(id), content: commentText, is_anonymous: isAnonymous }),
      });
      if (res.ok) {
        setCommentText('');
        setIsAnonymous(false);
        loadPost();
      }
    } catch (e) {
      console.error('Failed to comment:', e);
    }
  }

  async function handleReply(e: React.FormEvent, parentId: number) {
    e.preventDefault();
    if (!replyText.trim() || !member) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ post_id: Number(id), content: replyText, parent_comment_id: parentId }),
      });
      if (res.ok) {
        setReplyText('');
        setReplyingTo(null);
        loadPost();
      }
    } catch (e) {
      console.error('Failed to reply:', e);
    }
  }

  function renderComment(comment: Comment, depth: number = 0) {
    return (
      <div key={comment.id} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0', marginLeft: depth * 24 }}>
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>
          <strong>{comment.author_name}</strong>
          <span style={{ marginLeft: '10px', color: '#aaa' }}>{new Date(comment.created_at).toLocaleString('zh-CN')}</span>
        </div>
        <p style={{ margin: '0 0 8px', fontSize: '14px', lineHeight: 1.6 }}>
          <ReactMarkdown>{comment.content}</ReactMarkdown>
        </p>
        {member && (
          <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
            style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            回复
          </button>
        )}
        {replyingTo === comment.id && member && (
          <form onSubmit={(e) => handleReply(e, comment.id)} style={{ marginTop: '8px' }}>
            <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2} placeholder={`回复 ${comment.author_name}...`}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }} />
            <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
              <button type="submit" style={{ padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>发布</button>
              <button type="button" onClick={() => { setReplyingTo(null); setReplyText(''); }}
                style={{ padding: '6px 14px', background: '#f0f0f0', color: '#666', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>取消</button>
            </div>
          </form>
        )}
        {comment.replies && comment.replies.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  if (loading) return <p style={{ color: '#999' }}>加载中...</p>;
  if (!post) return <p>帖子不存在</p>;

  return (
    <div>
      {/* 帖子正文 */}
      <article style={{ background: '#fff', borderRadius: '8px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{post.title}</h1>
          <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '12px', background: layerColors[post.layer], color: '#fff' }}>
            {layerLabels[post.layer]}
          </span>
        </div>
        <div style={{ fontSize: '13px', color: '#999', marginBottom: '16px' }}>
          <span>{post.author_name}</span>
          <span style={{ margin: '0 8px' }}>·</span>
          <span>{new Date(post.created_at).toLocaleString('zh-CN')}</span>
        </div>
        <div style={{ fontSize: '15px', lineHeight: 1.8 }}>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{post.content}</ReactMarkdown>
        </div>
      </article>

      {/* 评论区 */}
      <section style={{ background: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ marginTop: 0 }}>回应 ({post.comments?.length || 0})</h3>
        
        {post.comments && post.comments.length > 0 ? (
          post.comments.map(comment => renderComment(comment, 0))
        ) : (
          <p style={{ color: '#aaa' }}>还没有评论</p>
        )}

        {/* 发新评论 */}
        {member ? (
          <form onSubmit={handleComment} style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
              {isAnonymous ? <span>以 <span style={{fontWeight:600}}>匿名</span> 发言</span> : <span>以 <span style={{fontWeight:600}}>{member.display_name}</span> 的身份发言</span>}
            </div>
            <textarea placeholder="写下你的想法..." value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={3}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#666', cursor: 'pointer' }}>
                <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                匿名
              </label>
              <button type="submit" style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                发布
              </button>
            </div>
          </form>
        ) : (
          <div style={{ marginTop: '20px', textAlign: 'center', padding: '16px', background: '#f9f9f9', borderRadius: '6px' }}>
            <a href="/auth" style={{ color: '#2563eb', textDecoration: 'none' }}>登录</a> 后才能评论
          </div>
        )}
      </section>
    </div>
  );
}
