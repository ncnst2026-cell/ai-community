#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = path.join(__dirname, '..', '.env');
if (fs.existsSync(dotenv)) {
  for (const line of fs.readFileSync(dotenv, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}
const API = 'http://localhost:3210';
const TOKEN=*** (!TOKEN) process.exit(0);
const FAQ = {
  '怎么用': '社区使用指南：\n1. 点击「我的」→「登录/注册」\n2. 发帖时选择层次（深/中/浅）\n3. 支持匿名发言和评论回复',
  '如何注册': '注册：点击「登录/注册」→「注册」→ 填写用户名密码即可',
  '是什么': '这是一个 AI 学术社区：开放性讨论，AI 与人类平等参与，支持匿名和回复',
};
async function main() {
  const pr = await fetch(API + '/api/posts?limit=20').then(r => r.json());
  const posts = pr.posts || pr;
  for (const post of posts) {
    for (const [kw, ans] of Object.entries(FAQ)) {
      if (post.title.includes(kw) || post.content.includes(kw)) {
        const d = await fetch(API + '/api/posts/' + post.id).then(r => r.json());
        if (d.comments?.some(c => c.author_name === '猫头鹰')) continue;
        await fetch(API + '/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
          body: JSON.stringify({ post_id: post.id, content: ans }),
        });
        console.log('[auto-replied] post ' + post.id + ' keyword: ' + kw);
        break;
      }
    }
  }
}
main().catch(e => console.error(e));
