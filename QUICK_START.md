# UI Bundle 远程加载 - 快速开始

## 快速调试步骤

### 1. 安装依赖
```bash
npm install
```

### 2. 一键启动（推荐）
```bash
npm run dev
```

这个命令会自动：
- 打包UI Bundle为zip
- 解压到dist/bundles目录
- 启动本地服务器

### 3. 在编辑器中配置

打开场景，选择BootInit组件，设置：
- **remoteBundleUrl**: `http://localhost:8080` ⚠️ 不要加/ui
- **preloadBundles**: `['ui']`

### 5. 运行预览

点击编辑器的预览按钮，查看控制台日志。

## 分步命令

如果需要分步执行：

```bash
# 步骤1：打包UI Bundle
npm run build:ui-bundle

# 步骤2：解压Bundle
npm run extract:bundle

# 步骤3：启动服务器
npm run serve:bundles
```

## 文件说明

| 文件 | 说明 |
|------|------|
| `scripts/build-ui-bundle.js` | UI Bundle打包脚本 |
| `scripts/extract-bundle.js` | Bundle解压脚本 |
| `scripts/bundle-server.js` | 本地Bundle服务器 |
| `dist/ui-bundle.zip` | 打包的Bundle文件 |
| `dist/bundles/ui/` | 解压后的Bundle文件 |

## 代码改动

### BootInit.ts
- 添加 `remoteBundleUrl` 属性
- 添加 `loadRemoteBundles()` 方法
- 修改 `preloadEssentialBundles()` 支持远程加载

### BundleLoader.ts
- 添加 `loadBundleFromUrl()` 方法支持远程加载

## 调试技巧

### 查看加载日志
```
[LOG] [BootInit] 游戏启动初始化开始
[LOG] [BundleLoader] 从远程加载bundle: ui, URL: http://localhost:8080/ui
[LOG] [BundleLoader] 远程Bundle ui 加载成功
```

### 检查网络请求
1. 打开浏览器F12
2. 查看Network标签
3. 搜索`config.json`或`ui`

### 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|--------|
| 404 Not Found | Bundle文件不存在 | 运行 `npm run prepare:bundles` |
| CORS error | 跨域问题 | 服务器已配置CORS，检查浏览器设置 |
| Connection refused | 服务器未运行 | 运行 `npm run dev` |
| Load index.js failed | 路径错误 | 确保remoteBundleUrl正确 |

## 生产环境

将 `remoteBundleUrl` 改为CDN地址：
```typescript
this.remoteBundleUrl = 'https://cdn.example.com/bundles';
```

## 更多信息

详见 `BUNDLE_DEBUG_GUIDE.md`
