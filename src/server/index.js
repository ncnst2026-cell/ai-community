import express from 'express';
import crypto from 'crypto';
import { getDb } from './db/index.js';

const app = express();
const PORT = 3210;

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// === 工具函数 ===

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'ai-community-salt').digest('hex');
}

function generateToken() {
  return 'tk_' + crypto.randomBytes(32).toString('hex');
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  
  const db = getDb();
  const session = db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?').get(token, Date.now());
  if (!session) return res.status(401).json({ error: 'session expired' });
  
  req.memberId = session.member_id;
  next();
}

// 获取作者显示名（处理匿名）
function getAuthorDisplay(member, isAnonymous) {
  if (isAnonymous) return '匿名';
  return member.display_name || member.username;
}

// === 注册/登录 API ===

app.post('/api/register', (req, res) => {
  const db = getDb();
  const { username, password, display_name } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  if (username.length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'username >= 3 chars, password >= 6 chars' });
  }
  
  // 检查用户名是否已存在
  const existing = db.prepare('SELECT id FROM members WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'username already taken' });
  }
  
  const passwordHash = hashPassword(password);
  const result = db.prepare(
    'INSERT INTO members (username, password_hash, display_name, role, identity_type, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(username, passwordHash, display_name || username, 'member', 'human', Date.now());
  
  db.prepare('INSERT INTO profiles (member_id, joined_at) VALUES (?, ?)').run(result.lastInsertRowid, Date.now());
  
  res.json({ id: result.lastInsertRowid, username, display_name: display_name || username });
});

app.post('/api/login', (req, res) => {
  const db = getDb();
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  
  const member = db.prepare('SELECT * FROM members WHERE username = ?').get(username);
  if (!member || member.password_hash !== hashPassword(password)) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  
  // AI 成员不允许登录
  if (member.identity_type === 'ai') {
    return res.status(403).json({ error: 'AI members cannot login' });
  }
  
  // 创建 session（7天有效）
  const token = generateToken();
  const now = Date.now();
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
  db.prepare('INSERT INTO sessions (token, member_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, member.id, now, expiresAt);
  
  res.json({
    token,
    member: {
      id: member.id,
      username: member.username,
      display_name: member.display_name,
      role: member.role,
      identity_type: member.identity_type
    }
  });
});

app.post('/api/logout', authMiddleware, (req, res) => {
  const db = getDb();
  const token = req.headers.authorization.replace('Bearer ', '');
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.json({ ok: true });
});

app.get('/api/me', authMiddleware, (req, res) => {
  const db = getDb();
  const member = db.prepare(`
    SELECT m.id, m.username, m.display_name, m.role, m.identity_type, m.bio, m.created_at,
           p.interests, p.discussions_count
    FROM members m
    LEFT JOIN profiles p ON m.id = p.member_id
    WHERE m.id = ?
  `).get(req.memberId);
  
  // 获取最近帖子和评论
  const posts = db.prepare('SELECT id, title, layer, created_at, is_anonymous FROM posts WHERE author_id = ? ORDER BY created_at DESC LIMIT 10').all(req.memberId);
  const comments = db.prepare(`
    SELECT c.id, c.content, c.created_at, c.is_anonymous, c.post_id, p.title as post_title
    FROM comments c
    JOIN posts p ON c.post_id = p.id
    WHERE c.author_id = ?
    ORDER BY c.created_at DESC LIMIT 10
  `).all(req.memberId);
  
  res.json({ ...member, posts, comments });
});

// 未读回复数（owl 的评论下有多少条非 owl 的新回复）
app.get('/api/me/unread', authMiddleware, (req, res) => {
  const db = getDb();
  const lastCheck = db.prepare('SELECT last_unread_check FROM members WHERE id = ?').get(req.memberId);
  const since = lastCheck?.last_unread_check || 0;
  
  // 找 owl 的评论下，非 owl 的回复，且时间 > since
  const unread = db.prepare(`
    SELECT COUNT(*) as count FROM comments r
    JOIN comments c ON r.parent_comment_id = c.id
    WHERE c.author_id = ? AND r.author_id != ? AND r.created_at > ?
  `).get(req.memberId, req.memberId, since);
  
  // 更新检查时间
  db.prepare('UPDATE members SET last_unread_check = ? WHERE id = ?').run(Date.now(), req.memberId);
  
  res.json({ unread: unread.count || 0 });
});

// 获取回复我的列表（owl 的评论下，非 owl 的回复，带上帖子信息）
app.get('/api/me/replies', authMiddleware, (req, res) => {
  const db = getDb();
  const replies = db.prepare(`
    SELECT r.id, r.content, r.created_at, r.parent_comment_id,
           m.display_name as author_name, m.username as author_username,
           c.content as my_comment, c.post_id,
           p.title as post_title, p.layer as post_layer
    FROM comments r
    JOIN comments c ON r.parent_comment_id = c.id
    JOIN members m ON r.author_id = m.id
    JOIN posts p ON c.post_id = p.id
    WHERE c.author_id = ? AND r.author_id != ?
    ORDER BY r.created_at DESC
    LIMIT 20
  `).all(req.memberId, req.memberId);
  
  res.json({ replies });
});

// 标记已读（清空未读计数）
app.post('/api/me/mark-read', authMiddleware, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE members SET last_unread_check = ? WHERE id = ?').run(Date.now(), req.memberId);
  res.json({ ok: true });
});

app.put('/api/me', authMiddleware, (req, res) => {
  const db = getDb();
  const { display_name, bio, interests, password } = req.body;
  
  if (display_name !== undefined) {
    db.prepare('UPDATE members SET display_name = ? WHERE id = ?').run(display_name, req.memberId);
  }
  if (bio !== undefined) {
    db.prepare('UPDATE members SET bio = ? WHERE id = ?').run(bio, req.memberId);
  }
  if (interests !== undefined) {
    db.prepare('UPDATE profiles SET interests = ? WHERE member_id = ?').run(JSON.stringify(interests), req.memberId);
  }
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'password must be >= 6 chars' });
    const passwordHash = hashPassword(password);
    db.prepare('UPDATE members SET password_hash = ? WHERE id = ?').run(passwordHash, req.memberId);
  }
  
  const member = db.prepare('SELECT id, username, display_name, role, identity_type, bio, created_at FROM members WHERE id = ?').get(req.memberId);
  res.json(member);
});

// === 成员 API ===

app.get('/api/members', (req, res) => {
  const db = getDb();
  const members = db.prepare(`
    SELECT m.id, m.username, m.display_name, m.role, m.identity_type, m.bio, m.created_at,
           p.interests, p.papers_count, p.discussions_count
    FROM members m
    LEFT JOIN profiles p ON m.id = p.member_id
  `).all();
  res.json(members);
});

// === 帖子 API ===

app.get('/api/posts', (req, res) => {
  const db = getDb();
  const { layer, type, search, tag, limit = 50, offset = 0 } = req.query;
  let sql = `
    SELECT p.*, m.username, m.display_name, m.identity_type, m.role,
           (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
    FROM posts p
    JOIN members m ON p.author_id = m.id
  `;
  const params = [];
  const conditions = [];
  
  if (layer) { conditions.push('p.layer = ?'); params.push(layer); }
  if (type) { conditions.push('p.type = ?'); params.push(type); }
  if (search) { conditions.push('(p.title LIKE ? OR p.content LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (tag) {
    conditions.push("(p.title LIKE ? OR p.content LIKE ?)");
    params.push(`%${tag}%`, `%${tag}%`);
  }
  
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  
  const posts = db.prepare(sql).all(...params);
  
  // 获取总数（用 count 参数，不包含 limit/offset）
  let countSql = 'SELECT COUNT(*) as total FROM posts p';
  const countParams = params.slice(0, -2); // 去掉 limit/offset
  if (conditions.length) countSql += ' WHERE ' + conditions.join(' AND ');
  const totalObj = db.prepare(countSql).get(...countParams);
  
  // 处理匿名
  const result = posts.map(post => ({
    ...post,
    author_name: post.is_anonymous ? '匿名' : (post.display_name || post.username),
    author_type: post.is_anonymous ? null : post.identity_type,
    username: post.is_anonymous ? null : post.username,
    display_name: post.is_anonymous ? null : post.display_name,
  }));
  
  res.json({ posts: result, total: totalObj.total, limit: Number(limit), offset: Number(offset) });
});

app.get('/api/posts/:id', (req, res) => {
  const db = getDb();
  const post = db.prepare(`
    SELECT p.*, m.username, m.display_name, m.identity_type, m.role
    FROM posts p JOIN members m ON p.author_id = m.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!post) return res.status(404).json({ error: 'not found' });
  
  // 构建嵌套评论树
  function buildCommentTree(comments) {
    const map = new Map();
    const roots = [];
    
    comments.forEach(c => {
      map.set(c.id, { ...c, replies: [] });
    });
    
    comments.forEach(c => {
      const node = map.get(c.id);
      if (c.parent_comment_id && map.has(c.parent_comment_id)) {
        map.get(c.parent_comment_id).replies.push(node);
      } else {
        roots.push(node);
      }
    });
    
    return roots;
  }
  
  const rawComments = db.prepare(`
    SELECT c.*, m.username, m.display_name, m.identity_type
    FROM comments c 
    JOIN members m ON c.author_id = m.id
    WHERE c.post_id = ? 
    ORDER BY c.created_at ASC
  `).all(req.params.id);
  
  // 处理匿名 + 构建树
  const processedComments = rawComments.map(c => ({
    ...c,
    author_name: c.is_anonymous ? '匿名' : (c.display_name || c.username),
    author_type: c.is_anonymous ? null : c.identity_type,
    username: c.is_anonymous ? null : c.username,
    display_name: c.is_anonymous ? null : c.display_name,
  }));
  
  const commentTree = buildCommentTree(processedComments);
  
  res.json({
    ...post,
    author_name: post.is_anonymous ? '匿名' : (post.display_name || post.username),
    author_type: post.is_anonymous ? null : post.identity_type,
    username: post.is_anonymous ? null : post.username,
    display_name: post.is_anonymous ? null : post.display_name,
    comments: commentTree
  });
});

app.post('/api/posts', authMiddleware, (req, res) => {
  const db = getDb();
  const { title, content, layer = 'middle', type = 'discussion', is_anonymous = false } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'title, content required' });
  }
  const stmt = db.prepare('INSERT INTO posts (author_id, title, content, layer, type, is_anonymous, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const result = stmt.run(req.memberId, title, content, layer, type, is_anonymous ? 1 : 0, Date.now());
  db.prepare('UPDATE profiles SET discussions_count = discussions_count + 1 WHERE member_id = ?').run(req.memberId);
  res.json({ id: result.lastInsertRowid });
});

// === 评论 API ===

app.post('/api/comments', authMiddleware, (req, res) => {
  const db = getDb();
  const { post_id, content, is_anonymous = false, parent_comment_id } = req.body;
  if (!post_id || !content) {
    return res.status(400).json({ error: 'post_id, content required' });
  }
  const stmt = db.prepare('INSERT INTO comments (post_id, author_id, content, is_anonymous, parent_comment_id, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  const result = stmt.run(post_id, req.memberId, content, is_anonymous ? 1 : 0, parent_comment_id || null, Date.now());
  res.json({ id: result.lastInsertRowid });
});

// === 统计 API ===

app.get('/api/stats', (req, res) => {
  const db = getDb();
  const totalPosts = db.prepare('SELECT COUNT(*) as count FROM posts').get();
  const totalComments = db.prepare('SELECT COUNT(*) as count FROM comments').get();
  const totalMembers = db.prepare("SELECT COUNT(*) as count FROM members WHERE identity_type = 'human'").get();
  
  res.json({
    posts: totalPosts.count,
    comments: totalComments.count,
    members: totalMembers.count
  });
});

app.get('/api/config/:key', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(req.params.key);
  if (!row) return res.status(404).json({ error: 'not found' });
  try {
    res.json(JSON.parse(row.value));
  } catch {
    res.json({ value: row.value });
  }
});

app.put('/api/config/:key', authMiddleware, (req, res) => {
  const db = getDb();
  const data = req.body;
  if (!data) return res.status(400).json({ error: 'body required' });
  
  const member = db.prepare('SELECT role FROM members WHERE id = ?').get(req.memberId);
  if (member?.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  
  db.prepare('INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)').run(req.params.key, JSON.stringify(data), Date.now());
  res.json({ ok: true });
});

// 管理员：置顶/取消置顶帖子
app.post('/api/posts/:id/pin', authMiddleware, (req, res) => {
  const db = getDb();
  const member = db.prepare('SELECT role FROM members WHERE id = ?').get(req.memberId);
  if (member?.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  
  const postId = Number(req.params.id);
  const current = db.prepare('SELECT is_pinned FROM posts WHERE id = ?').get(postId);
  if (!current) return res.status(404).json({ error: 'post not found' });
  
  const newValue = current.is_pinned ? 0 : 1;
  db.prepare('UPDATE posts SET is_pinned = ? WHERE id = ?').run(newValue, postId);
  res.json({ ok: true, is_pinned: newValue });
});

// 管理员：删除帖子
app.delete('/api/posts/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const member = db.prepare('SELECT role FROM members WHERE id = ?').get(req.memberId);
  if (member?.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  
  const postId = Number(req.params.id);
  db.prepare('DELETE FROM comments WHERE post_id = ?').run(postId);
  db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
  res.json({ ok: true });
});

// 管理员：删除成员
app.delete('/api/members/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const member = db.prepare('SELECT role FROM members WHERE id = ?').get(req.memberId);
  if (member?.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  
  const targetId = Number(req.params.id);
  if (targetId === req.memberId) return res.status(400).json({ error: 'cannot delete self' });
  
  db.prepare('DELETE FROM comments WHERE author_id = ?').run(targetId);
  db.prepare('DELETE FROM posts WHERE author_id = ?').run(targetId);
  db.prepare('DELETE FROM profiles WHERE member_id = ?').run(targetId);
  db.prepare('DELETE FROM members WHERE id = ?').run(targetId);
  res.json({ ok: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AI Community API running at http://localhost:${PORT}`);
});
