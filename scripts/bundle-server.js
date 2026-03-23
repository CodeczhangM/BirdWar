#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

/**
 * 简单的Bundle服务器
 * 用于本地调试远程Bundle加载
 * 使用: node scripts/bundle-server.js
 */

const PORT = process.env.PORT || 8080;
const DIST_DIR = path.join(__dirname, '..', 'dist', 'bundles');

// 确保dist目录存在
if (!fs.existsSync(DIST_DIR)) {
  console.error(`✗ dist目录不存在: ${DIST_DIR}`);
  console.error('请先运行: node scripts/build-ui-bundle.js');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // 添加CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // 移除前导斜杠
  if (pathname.startsWith('/')) {
    pathname = pathname.slice(1);
  }

  // 构建文件路径
  let filePath = path.join(DIST_DIR, pathname);

  // 安全检查：防止目录遍历
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // 如果是目录，尝试返回index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // 读取文件
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.log(`✗ 404: ${req.url}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    // 根据文件扩展名设置Content-Type
    const ext = path.extname(filePath);
    let contentType = 'application/octet-stream';

    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.zip': 'application/zip',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.css': 'text/css'
    };

    if (mimeTypes[ext]) {
      contentType = mimeTypes[ext];
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);

    console.log(`✓ 200: ${req.url} (${data.length} bytes)`);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Bundle服务器运行在: http://localhost:${PORT}`);
  console.log(`📁 服务目录: ${DIST_DIR}\n`);
  console.log('在BootInit中设置:');
  console.log(`  remoteBundleUrl = "http://localhost:${PORT}"\n`);
  console.log('按 Ctrl+C 停止服务器\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✗ 端口 ${PORT} 已被占用`);
    console.error(`请使用其他端口: PORT=8081 node scripts/bundle-server.js`);
  } else {
    console.error('✗ 服务器错误:', err);
  }
  process.exit(1);
});
