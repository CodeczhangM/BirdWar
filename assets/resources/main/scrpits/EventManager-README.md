# EventManager 事件管理器

EventManager 是一个强大的事件管理系统，提供统一的事件处理机制，特别支持根据click id来处理点击事件。

## 主要功能

### 1. 通用事件系统
- 事件监听和触发
- 一次性事件监听
- 事件监听器管理
- 支持target绑定

### 2. 点击事件系统
- 基于ID的点击事件路由
- 全局点击处理器
- 点击处理器启用/禁用
- 点击事件数据传递

### 3. 预定义事件
- 游戏生命周期事件
- UI事件
- 场景切换事件
- 角色和武器事件

## 基础使用

### 导入EventManager
```typescript
import { EventManagerInstance, ClickEventData, EventData } from './EventManager';
```

### 通用事件系统

#### 监听事件
```typescript
// 普通监听
EventManagerInstance.on('game-start', (data: EventData) => {
    console.log('游戏开始', data);
}, this);

// 一次性监听
EventManagerInstance.once('game-end', (data: EventData) => {
    console.log('游戏结束', data);
}, this);
```

#### 触发事件
```typescript
// 触发自定义事件
EventManagerInstance.emit('custom-event', {
    message: 'Hello World',
    value: 42
});

// 触发预定义事件
EventManagerInstance.emitGameStart({ level: 1 });
EventManagerInstance.emitSceneChange('MainMenu');
EventManagerInstance.emitUIShow('SettingsPanel');
```

#### 移除事件监听器
```typescript
// 移除特定监听器
EventManagerInstance.off('game-start', callback, this);

// 移除所有监听器
EventManagerInstance.off('game-start');

// 移除target的所有监听器
EventManagerInstance.clearTargetListeners(this);
```

### 点击事件系统

#### 注册点击处理器
```typescript
// 注册特定ID的点击处理器
EventManagerInstance.registerClickHandler('btn-start', (data: ClickEventData) => {
    console.log('开始按钮被点击', data);
    // 处理开始按钮逻辑
}, this);

// 注册全局点击处理器（处理所有点击）
EventManagerInstance.registerGlobalClickHandler((data: ClickEventData) => {
    console.log('全局点击处理', data.clickId);
    // 处理通用点击逻辑，如统计、音效等
}, this);
```

#### 触发点击事件
```typescript
// 手动触发点击事件
EventManagerInstance.handleClick('btn-start', {
    clickId: 'btn-start',
    position: { x: 100, y: 200 },
    target: buttonNode
});

// 在按钮事件中触发
button.node.on(Button.EventType.CLICK, () => {
    EventManagerInstance.handleClick('btn-start', {
        clickId: 'btn-start',
        position: { x: button.node.position.x, y: button.node.position.y },
        target: button.node
    });
});
```

#### 管理点击处理器
```typescript
// 启用/禁用点击处理器
EventManagerInstance.setClickHandlerEnabled('btn-start', false); // 禁用
EventManagerInstance.setClickHandlerEnabled('btn-start', true);  // 启用

// 移除点击处理器
EventManagerInstance.removeClickHandler('btn-start', callback, this);

// 移除全局点击处理器
EventManagerInstance.removeGlobalClickHandler(callback, this);
```

## 实际应用示例

### 游戏UI按钮处理
```typescript
export class GameUI extends Component {
    
    start() {
        this.setupClickHandlers();
    }

    onDestroy() {
        // 清理所有事件监听器
        EventManagerInstance.clearTargetListeners(this);
    }

    private setupClickHandlers() {
        // 开始游戏按钮
        EventManagerInstance.registerClickHandler('btn-start-game', (data) => {
            this.startGame();
        }, this);

        // 暂停游戏按钮
        EventManagerInstance.registerClickHandler('btn-pause-game', (data) => {
            this.pauseGame();
        }, this);

        // 设置按钮
        EventManagerInstance.registerClickHandler('btn-settings', (data) => {
            this.showSettings();
        }, this);

        // 武器切换按钮
        EventManagerInstance.registerClickHandler('btn-weapon-switch', (data) => {
            this.switchWeapon();
        }, this);
    }

    private startGame() {
        EventManagerInstance.emitGameStart({ 
            level: this.currentLevel,
            difficulty: this.difficulty 
        });
    }

    private pauseGame() {
        EventManagerInstance.emitGamePause();
    }

    private showSettings() {
        EventManagerInstance.emitUIShow('SettingsPanel');
    }

    private switchWeapon() {
        const nextWeapon = this.getNextWeapon();
        EventManagerInstance.emitWeaponSwitch(nextWeapon);
    }
}
```

### 游戏逻辑监听事件
```typescript
export class GameManager extends Component {
    
    start() {
        this.setupEventListeners();
    }

    onDestroy() {
        EventManagerInstance.clearTargetListeners(this);
    }

    private setupEventListeners() {
        // 监听游戏开始
        EventManagerInstance.on('game-start', (data) => {
            this.onGameStart(data);
        }, this);

        // 监听游戏暂停
        EventManagerInstance.on('game-pause', (data) => {
            this.onGamePause();
        }, this);

        // 监听武器切换
        EventManagerInstance.on('weapon-switch', (data) => {
            this.onWeaponSwitch(data.weaponType);
        }, this);

        // 监听角色死亡
        EventManagerInstance.on('actor-death', (data) => {
            this.onActorDeath(data.actorName);
        }, this);
    }

    private onGameStart(data: EventData) {
        console.log('游戏开始', data);
        // 初始化游戏逻辑
    }

    private onGamePause() {
        console.log('游戏暂停');
        // 暂停游戏逻辑
    }

    private onWeaponSwitch(weaponType: string) {
        console.log('武器切换到', weaponType);
        // 切换武器逻辑
    }

    private onActorDeath(actorName: string) {
        console.log('角色死亡', actorName);
        // 处理角色死亡逻辑
    }
}
```

### 统计和分析系统
```typescript
export class AnalyticsManager extends Component {
    
    start() {
        // 注册全局点击处理器进行统计
        EventManagerInstance.registerGlobalClickHandler((data) => {
            this.trackClick(data);
        }, this);

        // 监听各种游戏事件
        EventManagerInstance.on('game-start', (data) => {
            this.trackEvent('game_start', data);
        }, this);

        EventManagerInstance.on('game-end', (data) => {
            this.trackEvent('game_end', data);
        }, this);
    }

    private trackClick(data: ClickEventData) {
        // 统计点击事件
        console.log('点击统计', {
            clickId: data.clickId,
            timestamp: data.timestamp,
            position: data.position
        });
    }

    private trackEvent(eventName: string, data: EventData) {
        // 统计游戏事件
        console.log('事件统计', eventName, data);
    }
}
```

## 预定义事件类型

### 游戏生命周期
- `game-start` - 游戏开始
- `game-end` - 游戏结束
- `game-pause` - 游戏暂停
- `game-resume` - 游戏恢复

### UI事件
- `ui-show` - UI显示
- `ui-hide` - UI隐藏

### 场景事件
- `scene-change` - 场景切换

### 游戏对象事件
- `actor-death` - 角色死亡
- `weapon-switch` - 武器切换

### 点击事件
- `click` - 通用点击事件
- `click:{clickId}` - 特定ID的点击事件

## 接口定义

### EventData
```typescript
interface EventData {
    [key: string]: any;
}
```

### ClickEventData
```typescript
interface ClickEventData extends EventData {
    clickId: string;
    position?: { x: number, y: number };
    target?: any;
    timestamp?: number;
}
```

### EventListener
```typescript
interface EventListener {
    callback: (data: EventData) => void;
    target?: any;
    once?: boolean;
}
```

### ClickHandler
```typescript
interface ClickHandler {
    id: string;
    handler: (data: ClickEventData) => void;
    target?: any;
    enabled?: boolean;
}
```

## 工具方法

### 调试和统计
```typescript
// 获取所有事件类型
const eventTypes = EventManagerInstance.getAllEventTypes();

// 获取所有点击ID
const clickIds = EventManagerInstance.getAllClickIds();

// 获取监听器数量
const listenerCount = EventManagerInstance.getEventListenerCount('game-start');

// 获取点击处理器数量
const handlerCount = EventManagerInstance.getClickHandlerCount('btn-start');

// 打印调试信息
EventManagerInstance.debugInfo();
```

### 清理方法
```typescript
// 清除所有事件监听器
EventManagerInstance.clearAllEventListeners();

// 清除所有点击处理器
EventManagerInstance.clearAllClickHandlers();

// 清除指定target的所有监听器
EventManagerInstance.clearTargetListeners(this);
```

## 最佳实践

### 1. 使用target参数
始终在注册监听器时传入target参数，便于清理：
```typescript
EventManagerInstance.on('event-name', callback, this);
```

### 2. 在onDestroy中清理
```typescript
onDestroy() {
    EventManagerInstance.clearTargetListeners(this);
}
```

### 3. 使用有意义的事件名称和点击ID
```typescript
// 好的命名
EventManagerInstance.registerClickHandler('btn-main-menu-start', callback);
EventManagerInstance.emit('player-level-up', data);

// 避免的命名
EventManagerInstance.registerClickHandler('btn1', callback);
EventManagerInstance.emit('event1', data);
```

### 4. 合理使用全局点击处理器
全局点击处理器适用于：
- 统计和分析
- 音效播放
- 通用UI反馈
- 调试和日志

### 5. 事件数据结构化
```typescript
// 结构化的事件数据
EventManagerInstance.emitGameStart({
    level: 1,
    difficulty: 'normal',
    playerName: 'Player1',
    timestamp: Date.now()
});
```

## 注意事项

1. **内存管理**: 及时清理不需要的事件监听器，避免内存泄漏
2. **错误处理**: 事件回调中的错误会被捕获并记录，不会影响其他监听器
3. **执行顺序**: 监听器按注册顺序执行，一次性监听器会在执行后自动移除
4. **性能考虑**: 避免在高频事件中进行复杂操作
5. **调试**: 使用debugInfo()方法查看当前注册的所有监听器和处理器