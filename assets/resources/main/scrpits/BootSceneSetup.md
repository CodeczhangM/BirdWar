# 启动场景配置指南

本文档说明如何正确配置启动场景来使用BootInit系统。

## 场景结构

推荐的启动场景节点结构：

```
Boot Scene (场景根节点)
├── Canvas (画布)
│   ├── Background (背景图片)
│   ├── LoadingPanel (加载面板)
│   │   ├── Logo (游戏Logo)
│   │   ├── ProgressBar (进度条)
│   │   ├── StatusLabel (状态文本)
│   │   └── LoadingAnimation (加载动画，可选)
│   └── BootManager (启动管理器节点)
│       └── BootInit Component (挂载BootInit组件)
```

## 组件配置

### BootInit组件配置

在BootManager节点上挂载BootInit组件，并进行以下配置：

#### 必需配置：
- **Status Label**: 拖拽StatusLabel节点到此字段
- **Progress Bar**: 拖拽ProgressBar节点到此字段
- **Main Scene Name**: 设置主场景名称（如："mainMenu"）

#### 可选配置：
- **Preload Bundles**: 需要预加载的Bundle列表
  - 默认值：["ui", "game"]
  - 可根据项目需求添加其他bundle
- **Enable Debug Log**: 是否启用详细日志
  - 开发阶段建议设为true
  - 发布版本可设为false

## UI组件设置

### 进度条 (ProgressBar)
- 类型：ProgressBar组件
- Progress: 初始值设为0
- 可以添加动画效果增强用户体验

### 状态文本 (StatusLabel)
- 类型：Label组件
- 初始文本：可设为"正在启动..."
- 字体大小：建议24-32px
- 颜色：选择与UI风格匹配的颜色

## 启动流程时序

```
1. 场景加载
   ↓
2. BootInit.start() 执行
   ↓
3. 初始化BundleLoader (进度: 10%)
   ↓
4. 预加载Bundle资源 (进度: 20%-80%)
   ↓
5. 加载主场景 (进度: 90%)
   ↓
6. 启动完成 (进度: 100%)
   ↓
7. 跳转到主场景
```

## 错误处理

BootInit包含完整的错误处理机制：

1. **Bundle加载失败**: 会显示错误信息并自动重试
2. **场景加载失败**: 会记录错误日志并触发错误事件
3. **初始化超时**: 3秒后自动重试

## 事件监听示例

如果需要监听启动事件，可以在其他脚本中添加：

```typescript
// 监听启动完成事件
const bootManager = director.getScene().getChildByName('BootManager');
bootManager.on('boot-complete', (event) => {
    console.log('启动完成，耗时:', event.detail.totalTime);
    console.log('已加载Bundle:', event.detail.loadedBundles);
});

// 监听启动失败事件
bootManager.on('boot-error', (event) => {
    console.error('启动失败:', event.detail.error);
    // 可以在这里显示自定义错误界面
});
```

## 性能优化建议

1. **Bundle分离**: 将UI和游戏逻辑分离到不同bundle
2. **按需加载**: 只在启动时加载必需的bundle
3. **资源压缩**: 确保bundle资源已经过压缩优化
4. **加载顺序**: 优先加载UI bundle，后加载游戏bundle

## 调试技巧

1. **启用详细日志**: 设置enableDebugLog为true
2. **控制台监控**: 查看详细的加载时间和状态
3. **进度监控**: 观察进度条是否正常更新
4. **错误捕获**: 检查控制台是否有错误信息

## 常见问题

### Q: 启动卡在某个进度不动
A: 检查对应的bundle是否存在，路径是否正确

### Q: 主场景加载失败
A: 确认主场景名称设置正确，场景文件存在

### Q: BundleLoader初始化失败
A: 检查BundleLoader脚本是否正确导入

### Q: 进度条不显示
A: 确认ProgressBar组件引用设置正确，节点处于激活状态