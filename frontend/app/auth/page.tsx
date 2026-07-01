// app/auth/page.tsx - 注册/登录页
'use client';

import { useState } from 'react';

const API = '';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '登录失败');
      localStorage.setItem('token', data.token);
      localStorage.setItem('member', JSON.stringify(data.member));
      window.dispatchEvent(new Event('auth-change'));
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, display_name: displayName || username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '注册失败');
      // 注册成功后自动登录
      await handleLogin(e);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '360px', margin: '60px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <button
          onClick={() => setMode('login')}
          style={{
            flex: 1, padding: '10px', border: 'none', background: mode === 'login' ? '#2563eb' : '#f0f0f0',
            color: mode === 'login' ? '#fff' : '#666', borderRadius: '6px', cursor: 'pointer'
          }}
        >登录</button>
        <button
          onClick={() => setMode('register')}
          style={{
            flex: 1, padding: '10px', border: 'none', background: mode === 'register' ? '#2563eb' : '#f0f0f0',
            color: mode === 'register' ? '#fff' : '#666', borderRadius: '6px', cursor: 'pointer'
          }}
        >注册</button>
      </div>

      <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
        {mode === 'register' && (
          <input
            type="text"
            placeholder="显示名（可选）"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        )}
        <input
          type="text"
          placeholder="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={{ width: '100%', padding: '12px', marginBottom: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '12px', marginBottom: '16px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
        />
        {error && <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '12px' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '15px', cursor: 'pointer' }}
        >
          {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#999' }}>
        没有账号？<a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'register' : 'login'); }} style={{ color: '#2563eb' }}>
          {mode === 'login' ? '去注册' : '去登录'}
        </a>
      </p>
    </div>
  );
}
