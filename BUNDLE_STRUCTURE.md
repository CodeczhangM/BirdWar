# 项目打包结构说明

## 打包配置

项目已调整为两个主要包的结构：

### 1. 主包 (main)
- **位置**: `assets/resources/`
- **bundleName**: `main`
- **优先级**: 11
- **内容**:
  - 核心系统脚本 (`assets/resources/main/scrpits/`)
  - 游戏关卡数据 (`assets/resources/gameleveldata/`)
  - 游戏动画资源 (`assets/game/animations/`)

### 2. UI包 (ui)
- **位置**: `assets/ui/`
- **bundleName**: `ui`
- **优先级**: 10
- **内容**:
  - UI脚本 (`assets/ui/scripts/`)
  - UI动画 (`assets/ui/animation/`)
  - UI预制体 (`assets/ui/prefeb/`)
  - UI纹理 (`assets/ui/textures/`)

### 3. 游戏资源 (game)
- **位置**: `assets/game/`
- **isBundle**: false
- **内容**:
  - 游戏动画 (`assets/game/animations/`)
  - 游戏脚本 (`assets/game/scripts/`)

## 加载流程

1. **启动阶段** (`BootInit.ts`):
   - 初始化 `BundleLoader`
   - 预加载 `ui` 包（主包自动加载）
   - 加载主菜单场景

2. **Bundle加载** (`BundleLoader.ts`):
   - 支持单个或批量加载Bundle
   - 提供进度回调
   - 支持Bundle预加载和释放

## 脚本位置

### 核心系统脚本 (resources/main/scrpits/)
- `BootInit.ts` - 启动初始化
- `BundleLoader.ts` - Bundle加载器
- `EventManager.ts` - 事件管理
- `Logger.ts` - 日志系统
- `InputManager.ts` - 输入管理
- `LevelManager.ts` - 关卡管理
- `GameLauncher.ts` - 游戏启动器
- `MainSceneController.ts` - 主场景控制器
- 其他核心系统...

### 游戏逻辑脚本 (game/scripts/)
- `ActorController.ts` - 角色控制
- `WeaponsSystem.ts` - 武器系统
- `Bullet.ts` - 子弹
- `Actor.ts` - 主角
- 其他游戏逻辑...

### UI脚本 (ui/scripts/)
- `CameraController.ts` - 摄像机控制
- `VirtualJoystick.ts` - 虚拟摇杆
- `SkillButton.ts` - 技能按钮
- `MultiCamManager.ts` - 多摄像机管理
- 其他UI组件...

## 配置文件

### Bundle配置 (.meta文件)
- `assets/resources.meta` - 主包配置 (bundleName: "main")
- `assets/ui.meta` - UI包配置 (bundleName: "ui")
- `assets/game.meta` - 游戏资源配置 (非Bundle)

## 注意事项

1. **加载顺序**: 主包自动加载，UI包在启动时预加载
2. **资源引用**: 跨包引用需要通过Bundle加载器获取
3. **性能优化**: 可根据需要进一步拆分Bundle

## 验证步骤

1. 在编辑器中检查Bundle配置是否正确
2. 运行游戏验证启动流程
3. 检查控制台日志确认Bundle加载成功
4. 验证游戏功能完整性
