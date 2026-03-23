#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * 打包UI Bundle为zip文件
 * 使用: node scripts/build-ui-bundle.js
 */

const projectRoot = path.join(__dirname, '..');
const buildDir = path.join(projectRoot, 'build');
const outputDir = path.join(projectRoot, 'dist');

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 查找最新的构建输出
function findLatestBuild() {
  const buildDirs = fs.readdirSync(buildDir).filter(f => {
    const fullPath = path.join(buildDir, f);
    return fs.statSync(fullPath).isDirectory();
  });

  if (buildDirs.length === 0) {
    throw new Error('未找到构建输出目录，请先构建项目');
  }

  // 查找包含remote目录的构建
  for (let i = buildDirs.length - 1; i >= 0; i--) {
    const buildPath = path.join(buildDir, buildDirs[i]);
    const remoteDir = path.join(buildPath, 'remote');
    if (fs.existsSync(remoteDir)) {
      return buildPath;
    }
  }

  throw new Error('未找到包含remote目录的构建输出');
}

async function packUIBundle() {
  try {
    const latestBuild = findLatestBuild();
    console.log(`使用构建目录: ${latestBuild}`);

    // UI Bundle在remote/ui目录中
    const uiBundlePath = path.join(latestBuild, 'remote', 'ui');

    if (!fs.existsSync(uiBundlePath)) {
      throw new Error(`UI Bundle路径不存在: ${uiBundlePath}`);
    }

    // 检查必要文件
    const configPath = path.join(uiBundlePath, 'config.json');
    const resPath = path.join(uiBundlePath, 'res.zip');

    if (!fs.existsSync(configPath)) {
      throw new Error(`config.json不存在: ${configPath}`);
    }

    if (!fs.existsSync(resPath)) {
      throw new Error(`res.zip不存在: ${resPath}`);
    }

    const outputZip = path.join(outputDir, 'ui-bundle.zip');
    const output = fs.createWriteStream(outputZip);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`✓ UI Bundle已打包: ${outputZip} (${archive.pointer()} bytes)`);
      console.log(`\n使用方式:`);
      console.log(`  1. 启动服务器: npm run dev`);
      console.log(`  2. 在BootInit中设置: remoteBundleUrl = "http://localhost:8080"`);
      console.log(`  3. 运行预览\n`);
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    // 添加ui目录下的所有文件
    archive.directory(uiBundlePath, 'ui');
    await archive.finalize();

  } catch (error) {
    console.error('✗ 打包失败:', error.message);
    process.exit(1);
  }
}

packUIBundle();

