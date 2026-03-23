#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * 打包所有Bundle为zip文件
 * 使用: node scripts/build-all-bundles.js
 */

const projectRoot = path.join(__dirname, '..');
const buildDir = path.join(projectRoot, 'build');
const outputDir = path.join(projectRoot, 'dist');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function findLatestBuild() {
  const buildDirs = fs.readdirSync(buildDir).filter(f => {
    const fullPath = path.join(buildDir, f);
    return fs.statSync(fullPath).isDirectory();
  });

  for (let i = buildDirs.length - 1; i >= 0; i--) {
    const buildPath = path.join(buildDir, buildDirs[i]);
    const remoteDir = path.join(buildPath, 'remote');
    if (fs.existsSync(remoteDir)) {
      return buildPath;
    }
  }

  throw new Error('未找到包含remote目录的构建输出');
}

async function packBundle(bundleName) {
  return new Promise((resolve, reject) => {
    const latestBuild = findLatestBuild();
    const bundlePath = path.join(latestBuild, 'remote', bundleName);

    if (!fs.existsSync(bundlePath)) {
      reject(new Error(`Bundle路径不存在: ${bundlePath}`));
      return;
    }

    const outputZip = path.join(outputDir, `${bundleName}-bundle.zip`);
    const output = fs.createWriteStream(outputZip);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`✓ ${bundleName} Bundle已打包: ${outputZip} (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(bundlePath, bundleName);
    archive.finalize();
  });
}

async function packAllBundles() {
  try {
    console.log('📦 打包所有Bundle\n');

    await packBundle('game');
    await packBundle('ui');

    console.log('\n✓ 所有Bundle打包完成');
  } catch (error) {
    console.error('✗ 打包失败:', error.message);
    process.exit(1);
  }
}

packAllBundles();
