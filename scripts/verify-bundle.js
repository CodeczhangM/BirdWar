#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 验证Bundle结构
 * 使用: node scripts/verify-bundle.js
 */

const projectRoot = path.join(__dirname, '..');
const buildDir = path.join(projectRoot, 'build');

function findLatestBuild() {
  const buildDirs = fs.readdirSync(buildDir).filter(f => {
    const fullPath = path.join(buildDir, f);
    return fs.statSync(fullPath).isDirectory();
  });

  if (buildDirs.length === 0) {
    throw new Error('未找到构建输出目录');
  }

  return path.join(buildDir, buildDirs[buildDirs.length - 1]);
}

function verifyBundle() {
  try {
    const latestBuild = findLatestBuild();
    console.log(`\n📁 构建目录: ${latestBuild}\n`);

    const bundles = ['ui', 'resources', 'game'];
    const remoteDir = path.join(latestBuild, 'remote');

    if (!fs.existsSync(remoteDir)) {
      console.log('⚠️  remote目录不存在\n');
      return;
    }

    console.log('📦 Bundle检查:\n');

    for (const bundle of bundles) {
      const bundlePath = path.join(remoteDir, bundle);
      const configPath = path.join(bundlePath, 'config.json');
      const resPath = path.join(bundlePath, 'res.zip');

      if (fs.existsSync(bundlePath)) {
        const hasConfig = fs.existsSync(configPath);
        const hasRes = fs.existsSync(resPath);

        const configSize = hasConfig ? fs.statSync(configPath).size : 0;
        const resSize = hasRes ? fs.statSync(resPath).size : 0;

        console.log(`  ${bundle}:`);
        console.log(`    ✓ 目录存在`);
        console.log(`    ${hasConfig ? '✓' : '✗'} config.json (${(configSize / 1024).toFixed(2)} KB)`);
        console.log(`    ${hasRes ? '✓' : '✗'} res.zip (${(resSize / 1024 / 1024).toFixed(2)} MB)`);
        console.log();
      } else {
        console.log(`  ${bundle}: ✗ 不存在\n`);
      }
    }

  } catch (error) {
    console.error('✗ 验证失败:', error.message);
    process.exit(1);
  }
}

verifyBundle();
