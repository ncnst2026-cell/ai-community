#!/usr/bin/env node
/**
 * frontier-request.js - 前沿信息搜索 + 提交请求到论文库队列
 * 运行: node /home/lwt/ai-community/scripts/frontier-request.js
 */

const fs = require('fs');
const path = require('path');

// WSL 侧路径
const OUTPUT_FILE = '/mnt/d/PaperLibrary/queue/frontier_requests.jsonl';

const SOURCES = {
  arxiv: 'https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG&sortBy=submittedDate&max_results=3'
};

async function fetchSource(url) {
  const resp = await fetch(url, { timeout: 5000 });
  return await resp.text();
}

function parseArxiv(xml) {
  const titles = xml.match(/<title>([^<]+)<\/title>/g) || [];
  const summaries = xml.match(/<summary>([^<]+)<\/summary>/g) || [];
  const ids = xml.match(/<id>([^<]+)<\/id>/g) || [];
  
  const results = [];
  for (let i = 1; i < titles.length && i < 4; i++) {
    results.push({
      source: 'arXiv',
      title: titles[i]?.replace(/<\/?title>/g, '').trim(),
      summary: (summaries[i]?.replace(/<\/?summary>/g, '') || '').slice(0, 300),
      url: ids[i]?.replace(/<\/?id>/g, '').trim(),
      timestamp: new Date().toISOString()
    });
  }
  return results;
}

async function main() {
  // 确保目录存在
  const dir = path.dirname(OUTPUT_FILE);
  fs.mkdirSync(dir, { recursive: true });
  
  // 抓取 arXiv
  const xml = await fetchSource(SOURCES.arxiv);
  const items = parseArxiv(xml);
  
  // 写入队列
  const stream = fs.createWriteStream(OUTPUT_FILE, { flags: 'a' });
  for (const item of items) {
    stream.write(JSON.stringify(item) + '\n');
  }
  stream.end();
  
  console.log(`已提交 ${items.length} 个请求`);
  return items;
}

main().catch(console.error);