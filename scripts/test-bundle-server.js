#!/usr/bin/env node

const http = require('http');

/**
 * 验证Bundle服务器
 * 使用: node scripts/test-bundle-server.js
 */

const baseUrl = 'http://localhost:8080';
const bundleName = 'ui';

function testUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      console.log(`✓ ${url}`);
      console.log(`  状态码: ${res.statusCode}`);
      console.log(`  Content-Type: ${res.headers['content-type']}`);
      resolve(true);
    }).on('error', (err) => {
      console.log(`✗ ${url}`);
      console.log(`  错误: ${err.message}`);
      resolve(false);
    });
  });
}

async function test() {
  console.log('\n📋 Bundle服务器测试\n');

  const urls = [
    `${baseUrl}/ui/config.json`,
    `${baseUrl}/ui/res.zip`
  ];

  for (const url of urls) {
    await testUrl(url);
  }

  console.log('\n✅ 配置检查清单:\n');
  console.log('1. BootInit.remoteBundleUrl = "http://localhost:8080"');
  console.log('2. BootInit.preloadBundles = ["ui"]');
  console.log('3. 运行预览并查看控制台日志\n');
}

test();
