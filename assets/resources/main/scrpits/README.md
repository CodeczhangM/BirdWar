# 主场景脚本说明

本文件夹包含了主场景的核心脚本，负责控制加载bundle ui game等功能。

## 脚本文件说明

### 1. BootInit.ts
启动初始化器，负责游戏的启动流程管理。

**主要功能：**
- 游戏启动序列控制
- BundleLoader初始化
- Bundle预加载管理
- 主场景加载
- 启动进度显示
- 错误处理和重试机制

**使用方法：**
1. 在启动场景中创建一个节点
2. 挂载BootInit组件
3. 配置状态文本和进度条引用
4. 设置预加载Bundle列表和主场景名称

**配置参数：**
- `statusLabel`: 启动状态显示文本
- `progressBar`: 启动进度条
- `preloadBundles`: 需要预加载的Bundle列表（默认：['ui', 'game']）
- `mainSceneName`: 主场景名称（默认：'mainMenu'）
- `enableDebugLog`: 是否显示详细日志

### 2. BundleLoader.ts
Bundle加载器，负责管理和加载游戏中的各种bundle资源。

**主要功能：**
- 单例模式管理bundle加载
- 支持单个和批量bundle加载
- 提供加载进度回调
- Bundle状态检查和管理
- 资源预加载功能
- 获取已加载Bundle列表

**使用方法：**
```typescript
// 获取实例
const loader = BundleLoader.instance;

// 加载单个bundle
await loader.loadBundle('ui');

// 批量加载bundle
await loader.loadBundles(['ui', 'game'], (progress) => {
    console.log(`加载进度: ${progress * 100}%`);
});

// 获取已加载的bundle列表
const loadedBundles = loader.getLoadedBundles();
```

### 3. GameLauncher.ts
游戏启动器，负责游戏的初始化和资源加载流程。

**主要功能：**
- 游戏启动流程管理
- 加载界面控制
- 进度显示和状态更新
- 错误处理和重试机制

**使用方法：**
1. 在主场景中添加一个节点
2. 挂载GameLauncher组件
3. 配置相关UI节点引用
4. 设置需要加载的bundle列表

### 4. MainSceneController.ts
主场景控制器，整合所有加载逻辑的高级控制器。

**主要功能：**
- 统一的场景初始化入口
- UI系统初始化
- 游戏系统初始化
- 主菜单UI加载

## 启动流程

### 推荐的启动流程：
1. **启动场景** → 使用BootInit进行初始化
2. **Bundle加载** → 通过BundleLoader加载必要资源
3. **主场景加载** → 自动跳转到主场景
4. **游戏初始化** → 在主场景中使用GameLauncher或MainSceneController

### 具体步骤：

1. **创建启动场景（Boot Scene）**
   ```
   Boot Scene
   ├── Canvas
   │   ├── LoadingUI (加载界面)
   │   │   ├── ProgressBar (进度条)
   │   │   └── StatusLabel (状态文本)
   │   └── BootInit (挂载BootInit组件)
   ```

2. **配置BootInit组件**
   - 设置statusLabel和progressBar引用
   - 配置preloadBundles: ['ui', 'game']
   - 设置mainSceneName: 'mainMenu'

3. **创建主场景（Main Scene）**
   - 使用GameLauncher或MainSceneController进行进一步初始化

## Bundle结构要求

确保项目中存在以下bundle：
- `ui`: UI相关资源
- `game`: 游戏逻辑相关资源

## 事件系统

### BootInit事件：
- `boot-complete`: 启动完成事件
  ```typescript
  bootInitNode.on('boot-complete', (event) => {
      console.log('启动完成', event.detail);
  });
  ```

- `boot-error`: 启动失败事件
  ```typescript
  bootInitNode.on('boot-error', (event) => {
      console.log('启动失败', event.detail);
  });
  ```

## 注意事项

1. BootInit应该在启动场景中使用，负责初始化和跳转
2. BundleLoader使用单例模式，会自动持久化
3. 所有异步加载操作都有完整的错误处理机制
4. 支持启动失败后的自动重试功能
5. 建议在正式项目中根据需求调整Bundle列表和场景名称
6. 启动过程中的所有关键步骤都有详细的日志输出