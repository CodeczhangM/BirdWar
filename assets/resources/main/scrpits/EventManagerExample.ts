import { _decorator, Component, Node, Button } from 'cc';
import { EventManagerInstance, ClickEventData, EventData } from './EventManager';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

/**
 * EventManager使用示例
 * 演示如何使用EventManager处理各种事件，特别是点击事件
 */
@ccclass('EventManagerExample')
export class EventManagerExample extends Component {
    
    @property({ type: [Button], tooltip: '示例按钮列表' })
    public exampleButtons: Button[] = [];

    @property({ type: Node, tooltip: '点击目标节点' })
    public clickTarget: Node = null;

    private readonly MODULE_NAME = 'EventManagerExample';

    start() {
        this.setupEventListeners();
        this.setupClickHandlers();
        this.setupButtonEvents();
        this.runExamples();
    }

    onDestroy() {
        // 清理所有与此组件相关的事件监听器
        EventManagerInstance.clearTargetListeners(this);
    }

    /**
     * 设置事件监听器
     */
    private setupEventListeners() {
        Log.log(this.MODULE_NAME, '设置事件监听器');

        // 监听游戏开始事件
        EventManagerInstance.on('game-start', (data: EventData) => {
            Log.log(this.MODULE_NAME, '游戏开始事件触发', data);
        }, this);

        // 监听游戏结束事件（一次性）
        EventManagerInstance.once('game-end', (data: EventData) => {
            Log.log(this.MODULE_NAME, '游戏结束事件触发（一次性）', data);
        }, this);

        // 监听场景切换事件
        EventManagerInstance.on('scene-change', (data: EventData) => {
            Log.log(this.MODULE_NAME, `场景切换到: ${data.sceneName}`, data);
        }, this);

        // 监听UI显示事件
        EventManagerInstance.on('ui-show', (data: EventData) => {
            Log.log(this.MODULE_NAME, `UI显示: ${data.uiName}`, data);
        }, this);

        // 监听自定义事件
        EventManagerInstance.on('custom-event', (data: EventData) => {
            Log.log(this.MODULE_NAME, '自定义事件触发', data);
        }, this);
    }

    /**
     * 设置点击处理器
     */
    private setupClickHandlers() {
        Log.log(this.MODULE_NAME, '设置点击处理器');

        // 注册按钮点击处理器
        EventManagerInstance.registerClickHandler('btn-start', (data: ClickEventData) => {
            Log.log(this.MODULE_NAME, '开始按钮被点击', data);
            this.handleStartButtonClick(data);
        }, this);

        EventManagerInstance.registerClickHandler('btn-pause', (data: ClickEventData) => {
            Log.log(this.MODULE_NAME, '暂停按钮被点击', data);
            this.handlePauseButtonClick(data);
        }, this);

        EventManagerInstance.registerClickHandler('btn-settings', (data: ClickEventData) => {
            Log.log(this.MODULE_NAME, '设置按钮被点击', data);
            this.handleSettingsButtonClick(data);
        }, this);

        EventManagerInstance.registerClickHandler('btn-weapon-switch', (data: ClickEventData) => {
            Log.log(this.MODULE_NAME, '武器切换按钮被点击', data);
            this.handleWeaponSwitchClick(data);
        }, this);

        // 注册全局点击处理器
        EventManagerInstance.registerGlobalClickHandler((data: ClickEventData) => {
            Log.debug(this.MODULE_NAME, `全局点击处理: ${data.clickId}`, data);
            this.handleGlobalClick(data);
        }, this);

        // 注册通用点击事件监听器
        EventManagerInstance.on('click', (data: EventData) => {
            const clickData = data as ClickEventData;
            Log.debug(this.MODULE_NAME, `通用点击事件: ${clickData.clickId}`);
        }, this);
    }

    /**
     * 设置按钮事件
     */
    private setupButtonEvents() {
        this.exampleButtons.forEach((button, index) => {
            if (button && button.node) {
                const clickId = `example-btn-${index}`;
                
                button.node.on(Button.EventType.CLICK, () => {
                    // 触发点击事件
                    EventManagerInstance.handleClick(clickId, {
                        clickId,
                        position: { x: button.node.position.x, y: button.node.position.y },
                        target: button.node,
                        buttonIndex: index
                    });
                }, this);

                Log.debug(this.MODULE_NAME, `设置按钮事件: ${clickId}`);
            }
        });
    }

    /**
     * 运行示例
     */
    private async runExamples() {
        Log.log(this.MODULE_NAME, '=== EventManager 使用示例开始 ===');

        // 等待一秒后开始示例
        await this.delay(1000);

        // 示例1: 触发预定义事件
        this.example1_PredefinedEvents();

        await this.delay(1000);

        // 示例2: 触发自定义事件
        this.example2_CustomEvents();

        await this.delay(1000);

        // 示例3: 模拟点击事件
        this.example3_ClickEvents();

        await this.delay(1000);

        // 示例4: 事件管理
        this.example4_EventManagement();

        await this.delay(1000);

        // 示例5: 调试信息
        this.example5_DebugInfo();
    }

    /**
     * 示例1: 预定义事件
     */
    private example1_PredefinedEvents() {
        Log.log(this.MODULE_NAME, '--- 示例1: 预定义事件 ---');

        // 触发游戏开始事件
        EventManagerInstance.emitGameStart({
            level: 1,
            difficulty: 'normal'
        });

        // 触发场景切换事件
        EventManagerInstance.emitSceneChange('MainMenu', {
            previousScene: 'Loading'
        });

        // 触发UI显示事件
        EventManagerInstance.emitUIShow('SettingsPanel', {
            animated: true
        });
    }

    /**
     * 示例2: 自定义事件
     */
    private example2_CustomEvents() {
        Log.log(this.MODULE_NAME, '--- 示例2: 自定义事件 ---');

        // 触发自定义事件
        EventManagerInstance.emit('custom-event', {
            message: 'Hello from custom event!',
            value: 42
        });

        // 触发玩家得分事件
        EventManagerInstance.emit('player-score', {
            score: 1000,
            combo: 5
        });

        // 触发道具获得事件
        EventManagerInstance.emit('item-collected', {
            itemType: 'coin',
            amount: 10
        });
    }

    /**
     * 示例3: 点击事件
     */
    private example3_ClickEvents() {
        Log.log(this.MODULE_NAME, '--- 示例3: 点击事件 ---');

        // 模拟各种按钮点击
        EventManagerInstance.handleClick('btn-start', {
            clickId: 'btn-start',
            position: { x: 0, y: 0 },
            simulated: true
        });

        EventManagerInstance.handleClick('btn-pause', {
            clickId: 'btn-pause',
            position: { x: 100, y: 0 },
            simulated: true
        });

        EventManagerInstance.handleClick('btn-settings', {
            clickId: 'btn-settings',
            position: { x: 200, y: 0 },
            simulated: true
        });

        // 模拟未注册的点击ID
        EventManagerInstance.handleClick('btn-unknown', {
            clickId: 'btn-unknown',
            simulated: true
        });
    }

    /**
     * 示例4: 事件管理
     */
    private example4_EventManagement() {
        Log.log(this.MODULE_NAME, '--- 示例4: 事件管理 ---');

        // 临时注册一个事件监听器
        const tempCallback = (data: EventData) => {
            Log.log(this.MODULE_NAME, '临时事件监听器触发', data);
        };

        EventManagerInstance.on('temp-event', tempCallback, this);

        // 触发事件
        EventManagerInstance.emit('temp-event', { message: 'Temporary event' });

        // 移除事件监听器
        EventManagerInstance.off('temp-event', tempCallback, this);

        // 再次触发事件（不会有响应）
        EventManagerInstance.emit('temp-event', { message: 'This should not be heard' });

        // 禁用点击处理器
        EventManagerInstance.setClickHandlerEnabled('btn-start', false);
        EventManagerInstance.handleClick('btn-start', {
            clickId: 'btn-start',
            message: 'This click should be ignored'
        });

        // 重新启用点击处理器
        EventManagerInstance.setClickHandlerEnabled('btn-start', true);
        EventManagerInstance.handleClick('btn-start', {
            clickId: 'btn-start',
            message: 'This click should work again'
        });
    }

    /**
     * 示例5: 调试信息
     */
    private example5_DebugInfo() {
        Log.log(this.MODULE_NAME, '--- 示例5: 调试信息 ---');

        // 打印调试信息
        EventManagerInstance.debugInfo();

        // 获取统计信息
        const eventTypes = EventManagerInstance.getAllEventTypes();
        const clickIds = EventManagerInstance.getAllClickIds();

        Log.log(this.MODULE_NAME, `注册的事件类型: ${eventTypes.join(', ')}`);
        Log.log(this.MODULE_NAME, `注册的点击ID: ${clickIds.join(', ')}`);

        // 获取具体的监听器数量
        Log.log(this.MODULE_NAME, `'game-start'事件监听器数量: ${EventManagerInstance.getEventListenerCount('game-start')}`);
        Log.log(this.MODULE_NAME, `'btn-start'点击处理器数量: ${EventManagerInstance.getClickHandlerCount('btn-start')}`);
    }

    // ========== 点击处理器方法 ==========

    /**
     * 处理开始按钮点击
     */
    private handleStartButtonClick(data: ClickEventData) {
        Log.log(this.MODULE_NAME, '处理开始按钮点击');
        
        // 触发游戏开始事件
        EventManagerInstance.emitGameStart({
            triggeredBy: 'start-button',
            clickData: data
        });
    }

    /**
     * 处理暂停按钮点击
     */
    private handlePauseButtonClick(data: ClickEventData) {
        Log.log(this.MODULE_NAME, '处理暂停按钮点击');
        
        // 触发游戏暂停事件
        EventManagerInstance.emitGamePause({
            triggeredBy: 'pause-button',
            clickData: data
        });
    }

    /**
     * 处理设置按钮点击
     */
    private handleSettingsButtonClick(data: ClickEventData) {
        Log.log(this.MODULE_NAME, '处理设置按钮点击');
        
        // 触发UI显示事件
        EventManagerInstance.emitUIShow('SettingsPanel', {
            triggeredBy: 'settings-button',
            clickData: data
        });
    }

    /**
     * 处理武器切换点击
     */
    private handleWeaponSwitchClick(data: ClickEventData) {
        Log.log(this.MODULE_NAME, '处理武器切换点击');
        
        // 触发武器切换事件
        EventManagerInstance.emitWeaponSwitch('laser', {
            triggeredBy: 'weapon-switch-button',
            clickData: data
        });
    }

    /**
     * 处理全局点击
     */
    private handleGlobalClick(data: ClickEventData) {
        // 可以在这里处理所有点击事件的通用逻辑
        // 比如统计、分析、特殊效果等
        
        if (data.simulated) {
            Log.debug(this.MODULE_NAME, `全局处理模拟点击: ${data.clickId}`);
        }
    }

    // ========== 工具方法 ==========

    /**
     * 延迟函数
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 手动触发点击事件（可在编辑器中调用）
     */
    public triggerStartClick() {
        EventManagerInstance.handleClick('btn-start', {
            clickId: 'btn-start',
            manual: true
        });
    }

    public triggerPauseClick() {
        EventManagerInstance.handleClick('btn-pause', {
            clickId: 'btn-pause',
            manual: true
        });
    }

    public triggerSettingsClick() {
        EventManagerInstance.handleClick('btn-settings', {
            clickId: 'btn-settings',
            manual: true
        });
    }

    /**
     * 手动触发自定义事件
     */
    public triggerCustomEvent() {
        EventManagerInstance.emit('custom-event', {
            message: 'Manual trigger from example',
            timestamp: Date.now()
        });
    }

    /**
     * 显示调试信息
     */
    public showDebugInfo() {
        EventManagerInstance.debugInfo();
    }
}