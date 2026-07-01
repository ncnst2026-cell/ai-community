// proxy.js - 简单的反向代理，把 /api/* 转发到 3210，其他走 3000
import http from 'http';

const API_TARGET = 'http://127.0.0.1:3210';
const WEB_TARGET = 'http://127.0.0.1:3000';
const PORT = 3211;

const server = http.createServer((req, res) => {
  const target = req.url?.startsWith('/api/') || req.url?.startsWith('/api') ? API_TARGET : WEB_TARGET;
  const url = target + req.url;
  
  const options = {
    method: req.method,
    headers: { ...req.headers },
  };
  delete options.headers.host;
  
  const proxyReq = http.request(url, options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  
  req.pipe(proxyReq, { end: true });
  
  proxyReq.on('error', (err) => {
    res.writeHead(502);
    res.end('Bad Gateway: ' + err.message);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy running on http://0.0.0.0:${PORT}`);
  console.log(`  /api/* -> ${API_TARGET}`);
  console.log(`  /*     -> ${WEB_TARGET}`);
});
