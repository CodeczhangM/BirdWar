# UI Bundle 打包和远程加载调试指南

## 1. 打包UI Bundle为ZIP

### 方式一：使用打包脚本（推荐）

```bash
# 安装依赖
npm install archiver

# 运行打包脚本
node scripts/build-ui-bundle.js
```

输出文件：`dist/ui-bundle.zip`

### 方式二：手动打包

1. 在Cocos Creator编辑器中构建项目
2. 找到构建输出目录中的UI Bundle文件
3. 使用7-Zip或WinRAR压缩为zip文件

## 2. 配置远程加载

### 编辑器中配置

在场景中选择BootInit组件，设置以下属性：

- **remoteBundleUrl**: `http://localhost:8080/bundles`（或你的服务器地址）
- **preloadBundles**: `['ui']`

### 代码配置

```typescript
// 在BootInit中设置
bootInit.remoteBundleUrl = 'http://your-server.com/bundles';
bootInit.preloadBundles = ['ui'];
```

## 3. 启动本地Bundle服务器

### 使用Node.js简单服务器

```bash
# 安装http-server
npm install -g http-server

# 启动服务器（在dist目录）
cd dist
http-server -p 8080 --cors
```

### 使用Python

```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

## 4. 调试步骤

### 步骤1：验证Bundle文件

```bash
# 检查dist目录
ls -la dist/

# 应该看到 ui-bundle.zip
```

### 步骤2：启动服务器

```bash
cd dist
http-server -p 8080 --cors
```

### 步骤3：在编辑器中测试

1. 打开项目
2. 设置BootInit的remoteBundleUrl为`http://localhost:8080`
3. 运行预览
4. 查看控制台日志

### 步骤4：检查网络请求

打开浏览器开发者工具（F12）：

- 查看Network标签
- 搜索`ui-bundle`或`config.json`
- 检查请求状态（应该是200）

## 5. 常见问题

### 问题1：404错误

```
Error: download failed: http://localhost:8080/ui/config.json, status: 404
```

**解决方案**：
- 确保Bundle文件已正确打包
- 检查服务器地址和端口
- 验证文件路径是否正确

### 问题2：CORS错误

```
Access to XMLHttpRequest blocked by CORS policy
```

**解决方案**：
- 使用`--cors`标志启动http-server
- 或在服务器配置中添加CORS头

### 问题3：加载超时

**解决方案**：
- 检查网络连接
- 增加超时时间
- 检查服务器是否正常运行

## 6. 生产环境部署

### 上传Bundle到CDN

```bash
# 1. 打包Bundle
node scripts/build-ui-bundle.js

# 2. 上传到CDN
# 使用你的CDN工具上传dist/ui-bundle.zip

# 3. 更新BootInit中的remoteBundleUrl
# 设置为CDN地址，如：https://cdn.example.com/bundles
```

### 配置生产环境URL

```typescript
// 在BootInit中
if (CC_DEBUG) {
    this.remoteBundleUrl = 'http://localhost:8080';
} else {
    this.remoteBundleUrl = 'https://cdn.example.com/bundles';
}
```

## 7. 性能优化

### 启用Bundle缓存

BundleLoader已内置缓存机制，重复加载同一Bundle时会使用缓存。

### 压缩优化

打包脚本已配置最高压缩级别（zlib level 9）。

### 预加载策略

```typescript
// 只在需要时加载UI Bundle
public preloadBundles: string[] = ['ui'];

// 或在运行时动态加载
await this._bundleLoader.loadBundleFromUrl('ui', remoteUrl);
```

## 8. 监控和日志

### 启用详细日志

在BootInit中设置：
```typescript
public enableDebugLog: boolean = true;
```

### 查看加载进度

```typescript
// 在preloadEssentialBundles中已实现进度回调
this.updateStatus(`加载资源中... ${Math.floor(progress * 100)}%`);
```

## 9. 测试清单

- [ ] Bundle文件已生成
- [ ] 服务器正常运行
- [ ] remoteBundleUrl已配置
- [ ] 浏览器控制台无错误
- [ ] 加载进度条正常显示
- [ ] UI Bundle加载成功
- [ ] 游戏功能正常
