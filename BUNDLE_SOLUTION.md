# UI Bundle 远程加载 - 完整解决方案

## 问题解决

### 原始问题
```
Error: Load http://localhost:8080/ui/index.js failed!
```

### 根本原因
- Cocos Creator的assetManager.loadBundle需要Bundle的根目录路径
- 它会自动查找该目录下的`config.json`文件
- 之前的实现没有正确解压Bundle文件

### 解决方案
1. 打包UI Bundle为zip文件
2. 解压zip到`dist/bundles/ui/`目录
3. 服务器提供解压后的文件
4. BootInit正确加载远程Bundle

## 完整流程

### 1. 打包阶段
```bash
npm run build:ui-bundle
```
- 从构建输出的`remote/ui/`目录打包
- 生成`dist/ui-bundle.zip`

### 2. 解压阶段
```bash
npm run extract:bundle
```
- 解压zip到`dist/bundles/ui/`
- 包含`config.json`和`res.zip`

### 3. 服务阶段
```bash
npm run serve:bundles
```
- 启动HTTP服务器
- 提供`http://localhost:8080/ui/config.json`

### 4. 加载阶段
- BootInit设置`remoteBundleUrl = "http://localhost:8080"`
- BundleLoader调用`loadBundleFromUrl('ui', 'http://localhost:8080/ui')`
- assetManager自动查找并加载`config.json`

## 文件结构

```
dist/
├── ui-bundle.zip          # 打包的Bundle
└── bundles/
    └── ui/
        ├── config.json    # Bundle配置
        └── res.zip        # 资源文件
```

## 代码改动

### BootInit.ts
```typescript
@property({ type: String, tooltip: '远程Bundle服务器地址' })
public remoteBundleUrl: string = 'http://localhost:8080';

private async loadRemoteBundles(): Promise<void> {
    // 从远程加载Bundle
    for (const bundleName of this.preloadBundles) {
        const bundleUrl = `${this.remoteBundleUrl}/${bundleName}`;
        await this._bundleLoader.loadBundleFromUrl(bundleName, bundleUrl);
    }
}
```

### BundleLoader.ts
```typescript
public loadBundleFromUrl(bundleName: string, remoteUrl: string): Promise<void> {
    // 从远程URL加载Bundle
    return new Promise((resolve, reject) => {
        assetManager.loadBundle(remoteUrl, (err, bundle) => {
            if (err) reject(err);
            else resolve();
        });
    });
}
```

## 脚本说明

| 脚本 | 功能 |
|------|------|
| `build-ui-bundle.js` | 打包UI Bundle为zip |
| `extract-bundle.js` | 解压Bundle文件 |
| `bundle-server.js` | 启动HTTP服务器 |
| `verify-bundle.js` | 验证Bundle结构 |

## npm脚本

```json
{
  "scripts": {
    "build:ui-bundle": "打包Bundle",
    "extract:bundle": "解压Bundle",
    "prepare:bundles": "打包+解压",
    "serve:bundles": "启动服务器",
    "dev": "完整流程（推荐）"
  }
}
```

## 快速使用

```bash
# 一键启动
npm run dev

# 在编辑器中设置
# BootInit.remoteBundleUrl = "http://localhost:8080"

# 运行预览
# 查看控制台日志确认加载成功
```

## 调试检查清单

- [ ] 运行`npm run dev`
- [ ] 服务器输出`http://localhost:8080`
- [ ] 编辑器设置`remoteBundleUrl`
- [ ] 浏览器F12查看Network
- [ ] 搜索`config.json`请求
- [ ] 状态码应为200
- [ ] 控制台显示加载成功日志

## 生产部署

1. 打包Bundle
   ```bash
   npm run build:ui-bundle
   ```

2. 上传到CDN
   ```bash
   # 上传dist/ui-bundle.zip到CDN
   ```

3. 更新配置
   ```typescript
   this.remoteBundleUrl = 'https://cdn.example.com/bundles';
   ```

## 常见问题

**Q: 为什么需要解压Bundle？**
A: assetManager.loadBundle需要访问config.json文件，HTTP服务器需要提供解压后的文件。

**Q: 可以直接加载zip吗？**
A: 不行，Cocos Creator不支持直接加载zip格式的Bundle。

**Q: 如何验证Bundle是否正确？**
A: 运行`node scripts/verify-bundle.js`检查文件结构。

**Q: 生产环境如何优化？**
A: 使用CDN加速，启用gzip压缩，配置缓存策略。
