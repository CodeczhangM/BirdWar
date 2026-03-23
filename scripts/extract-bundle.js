#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

/**
 * 解压UI Bundle
 * 使用: node scripts/extract-bundle.js
 */

const projectRoot = path.join(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const zipFile = path.join(distDir, 'ui-bundle.zip');
const extractDir = path.join(distDir, 'bundles');

function extractBundle() {
  try {
    if (!fs.existsSync(zipFile)) {
      throw new Error(`zip文件不存在: ${zipFile}`);
    }

    console.log(`📦 解压Bundle: ${zipFile}`);

    // 清理旧的解压目录
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true });
    }

    const zip = new AdmZip(zipFile);
    zip.extractAllTo(extractDir, true);

    // 添加空的index.js文件
    const uiDir = path.join(extractDir, 'ui');
    const indexPath = path.join(uiDir, 'index.js');
    fs.writeFileSync(indexPath, '');

    console.log(`✓ 解压完成: ${extractDir}\n`);

    // 显示目录结构
    if (fs.existsSync(uiDir)) {
      const files = fs.readdirSync(uiDir);
      console.log('📁 UI Bundle文件:');
      files.forEach(f => {
        const fullPath = path.join(uiDir, f);
        const stat = fs.statSync(fullPath);
        const size = stat.isDirectory() ? '-' : `${(stat.size / 1024 / 1024).toFixed(2)} MB`;
        console.log(`  ${f} ${size}`);
      });
    }

  } catch (error) {
    console.error('✗ 解压失败:', error.message);
    process.exit(1);
  }
}

extractBundle();

