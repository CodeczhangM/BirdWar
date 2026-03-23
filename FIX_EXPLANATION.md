# 修复说明

## 问题
```
Error: Load http://localhost:8080/ui/index.js failed!
```

## 根本原因
assetManager.loadBundle的API使用不当：
- 第一个参数应该是Bundle的**父目录**路径
- 它会自动查找 `{parentPath}/{bundleName}/config.json`

## 解决方案

### 1. 修改BootInit.ts
```typescript
private async loadRemoteBundles(): Promise<void> {
    for (const bundleName of this.preloadBundles) {
        // 传递父目录路径，不是Bundle目录
        const bundleUrl = this.remoteBundleUrl;
        await this._bundleLoader.loadBundleFromUrl(bundleName, bundleUrl);
    }
}
```

### 2. 修改BundleLoader.ts
```typescript
public loadBundleFromUrl(bundleName: string, remoteUrl: string): Promise<void> {
    // 构建完整路径：{remoteUrl}/{bundleName}
    assetManager.loadBundle(`${remoteUrl}/${bundleName}`, (err, bundle) => {
        // ...
    });
}
```

## 配置要点

### ✅ 正确配置
- **remoteBundleUrl**: `http://localhost:8080`
- **preloadBundles**: `['ui']`
- 加载路径: `http://localhost:8080/ui/config.json`

### ❌ 错误配置
- remoteBundleUrl: `http://localhost:8080/ui` ❌
- 这会导致查找 `http://localhost:8080/ui/ui/config.json` ❌

## 验证步骤

1. 运行服务器
   ```bash
   npm run dev
   ```

2. 测试服务器
   ```bash
   node scripts/test-bundle-server.js
   ```

3. 在编辑器中设置
   - BootInit.remoteBundleUrl = `http://localhost:8080`
   - BootInit.preloadBundles = `['ui']`

4. 运行预览，查看日志
   ```
   [LOG] [BundleLoader] 从远程加载bundle: ui, URL: http://localhost:8080/ui
   [LOG] [BundleLoader] 远程Bundle ui 加载成功
   ```

## 文件结构

```
http://localhost:8080/
├── ui/
│   ├── config.json      ← assetManager会查找这个文件
│   └── res.zip
```

## 关键API说明

```typescript
// Cocos Creator assetManager.loadBundle API
assetManager.loadBundle(bundlePath, callback);

// bundlePath 是Bundle的完整路径
// 例如: "http://localhost:8080/ui"
// 它会自动查找: "http://localhost:8080/ui/config.json"
```
