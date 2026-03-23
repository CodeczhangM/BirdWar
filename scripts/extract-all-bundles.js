#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

/**
 * 解压所有Bundle
 * 使用: node scripts/extract-all-bundles.js
 */

const projectRoot = path.join(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const extractDir = path.join(distDir, 'bundles');

function extractBundle(bundleName) {
  const zipFile = path.join(distDir, `${bundleName}-bundle.zip`);

  if (!fs.existsSync(zipFile)) {
    console.log(`⚠️  ${bundleName}-bundle.zip 不存在，跳过`);
    return;
  }

  console.log(`📦 解压 ${bundleName} Bundle`);

  const zip = new AdmZip(zipFile);
  zip.extractAllTo(extractDir, true);

  // 添加空的index.js
  const bundleDir = path.join(extractDir, bundleName);
  const indexPath = path.join(bundleDir, 'index.js');
  fs.writeFileSync(indexPath, '');

  const files = fs.readdirSync(bundleDir);
  console.log(`✓ ${bundleName} Bundle解压完成`);
  files.forEach(f => {
    const fullPath = path.join(bundleDir, f);
    const stat = fs.statSync(fullPath);
    const size = stat.isDirectory() ? '-' : `${(stat.size / 1024 / 1024).toFixed(2)} MB`;
    console.log(`  ${f} ${size}`);
  });
  console.log();
}

try {
  // 清理旧的解压目录
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true });
  }

  console.log('📦 解压所有Bundle\n');

  extractBundle('game');
  extractBundle('ui');

  console.log('✓ 所有Bundle解压完成');
} catch (error) {
  console.error('✗ 解压失败:', error.message);
  process.exit(1);
}
