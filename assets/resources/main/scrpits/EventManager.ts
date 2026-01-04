import { _decorator, EventTarget } from 'cc';
import { Log } from './Logger';

const { ccclass } = _decorator;

/**
 * 事件数据接口
 */
export interface EventData {
    [key: string]: any;
}

/**
 * 点击事件数据接口
 */
export interface ClickEventData extends EventData {
    clickId: string;
    position?: { x: number, y: number };
    target?: any;
    timestamp?: number;
}

/**
 * 事件监听器接口
 */
export interface EventListener {
    callback: (data: EventData) => void;
    target?: any;
    once?: boolean;
}

/**
 * 点击处理器接口
 */
export interface ClickHandler {
    id: string;
    handler: (data: ClickEventData) => void;
    target?: any;
    enabled?: boolean;
}

/**
 * 事件管理器
 * 统一管理游戏中的各种事件，支持点击事件的ID路由
 */
@ccclass('EventManager')
export class EventManager {
    private static _instance: EventManager = null;
    private _eventTarget: EventTarget = new EventTarget();
    private _clickHandlers: Map<string, ClickHandler[]> = new Map();
    private _eventListeners: Map<string, EventListener[]> = new Map();
    private _globalClickHandlers: ClickHandler[] = [];
    private readonly MODULE_NAME = 'EventManager';

    /**
     * 获取单例实例
     */
    public static getInstance(): EventManager {
        if (!EventManager._instance) {
            EventManager._instance = new EventManager();
        }
        return EventManager._instance;
    }

    private constructor() {
        Log.log(this.MODULE_NAME, 'EventManager初始化');
    }

    // ========== 通用事件系统 ==========

    /**
     * 监听事件
     */
    public on(eventType: string, callback: (data: EventData) => void, target?: any): void {
        if (!this._eventListeners.has(eventType)) {
            this._eventListeners.set(eventType, []);
        }

        const listener: EventListener = {
            callback,
            target,
            once: false
        };

        this._eventListeners.get(eventType).push(listener);
        Log.debug(this.MODULE_NAME, `添加事件监听器: ${eventType}`);
    }

    /**
     * 监听事件（一次性）
     */
    public once(eventType: string, callback: (data: EventData) => void, target?: any): void {
        if (!this._eventListeners.has(eventType)) {
            this._eventListeners.set(eventType, []);
        }

        const listener: EventListener = {
            callback,
            target,
            once: true
        };

        this._eventListeners.get(eventType).push(listener);
        Log.debug(this.MODULE_NAME, `添加一次性事件监听器: ${eventType}`);
    }

    /**
     * 移除事件监听器
     */
    public off(eventType: string, callback?: (data: EventData) => void, target?: any): void {
        const listeners = this._eventListeners.get(eventType);
        if (!listeners) return;

        if (!callback) {
            // 移除所有监听器
            if (target) {
                // 移除指定target的所有监听器
                const filteredListeners = listeners.filter(listener => listener.target !== target);
                this._eventListeners.set(eventType, filteredListeners);
            } else {
                // 移除所有监听器
                this._eventListeners.delete(eventType);
            }
        } else {
            // 移除指定的监听器
            const filteredListeners = listeners.filter(listener => {
                if (target) {
                    return listener.callback !== callback || listener.target !== target;
                } else {
                    return listener.callback !== callback;
                }
            });
            this._eventListeners.set(eventType, filteredListeners);
        }

        Log.debug(this.MODULE_NAME, `移除事件监听器: ${eventType}`);
    }

    /**
     * 触发事件
     */
    public emit(eventType: string, data: EventData = {}): void {
        const listeners = this._eventListeners.get(eventType);
        if (!listeners || listeners.length === 0) {
            Log.debug(this.MODULE_NAME, `没有找到事件监听器: ${eventType}`);
            return;
        }

        Log.debug(this.MODULE_NAME, `触发事件: ${eventType}, 监听器数量: ${listeners.length}`);

        // 复制监听器数组，避免在回调中修改数组导致问题
        const listenersToCall = [...listeners];
        const listenersToRemove: EventListener[] = [];

        for (const listener of listenersToCall) {
            try {
                listener.callback(data);
                
                // 标记一次性监听器待移除
                if (listener.once) {
                    listenersToRemove.push(listener);
                }
            } catch (error) {
                Log.error(this.MODULE_NAME, `事件回调执行错误: ${eventType}`, error);
            }
        }

        // 移除一次性监听器
        if (listenersToRemove.length > 0) {
            const remainingListeners = listeners.filter(listener => 
                listenersToRemove.indexOf(listener) === -1
            );
            this._eventListeners.set(eventType, remainingListeners);
        }
    }

    // ========== 点击事件系统 ==========

    /**
     * 注册点击处理器
     */
    public registerClickHandler(clickId: string, handler: (data: ClickEventData) => void, target?: any): void {
        if (!this._clickHandlers.has(clickId)) {
            this._clickHandlers.set(clickId, []);
        }

        const clickHandler: ClickHandler = {
            id: clickId,
            handler,
            target,
            enabled: true
        };

        this._clickHandlers.get(clickId).push(clickHandler);
        Log.debug(this.MODULE_NAME, `注册点击处理器: ${clickId}`);
    }

    /**
     * 注册全局点击处理器（处理所有点击事件）
     */
    public registerGlobalClickHandler(handler: (data: ClickEventData) => void, target?: any): void {
        const clickHandler: ClickHandler = {
            id: 'global',
            handler,
            target,
            enabled: true
        };

        this._globalClickHandlers.push(clickHandler);
        Log.debug(this.MODULE_NAME, '注册全局点击处理器');
    }

    /**
     * 移除点击处理器
     */
    public removeClickHandler(clickId: string, handler?: (data: ClickEventData) => void, target?: any): void {
        const handlers = this._clickHandlers.get(clickId);
        if (!handlers) return;

        if (!handler) {
            // 移除所有处理器
            if (target) {
                // 移除指定target的所有处理器
                const filteredHandlers = handlers.filter(h => h.target !== target);
                this._clickHandlers.set(clickId, filteredHandlers);
            } else {
                // 移除所有处理器
                this._clickHandlers.delete(clickId);
            }
        } else {
            // 移除指定的处理器
            const filteredHandlers = handlers.filter(h => {
                if (target) {
                    return h.handler !== handler || h.target !== target;
                } else {
                    return h.handler !== handler;
                }
            });
            this._clickHandlers.set(clickId, filteredHandlers);
        }

        Log.debug(this.MODULE_NAME, `移除点击处理器: ${clickId}`);
    }

    /**
     * 移除全局点击处理器
     */
    public removeGlobalClickHandler(handler?: (data: ClickEventData) => void, target?: any): void {
        if (!handler) {
            // 移除所有全局处理器
            if (target) {
                this._globalClickHandlers = this._globalClickHandlers.filter(h => h.target !== target);
            } else {
                this._globalClickHandlers = [];
            }
        } else {
            // 移除指定的处理器
            this._globalClickHandlers = this._globalClickHandlers.filter(h => {
                if (target) {
                    return h.handler !== handler || h.target !== target;
                } else {
                    return h.handler !== handler;
                }
            });
        }

        Log.debug(this.MODULE_NAME, '移除全局点击处理器');
    }

    /**
     * 启用/禁用点击处理器
     */
    public setClickHandlerEnabled(clickId: string, enabled: boolean): void {
        const handlers = this._clickHandlers.get(clickId);
        if (handlers) {
            handlers.forEach(handler => {
                handler.enabled = enabled;
            });
            Log.debug(this.MODULE_NAME, `设置点击处理器状态: ${clickId} -> ${enabled ? '启用' : '禁用'}`);
        }
    }

    /**
     * 处理点击事件
     */
    public handleClick(clickId: string, data: ClickEventData = { clickId }): void {
        // 确保clickId在数据中
        data.clickId = clickId;
        data.timestamp = data.timestamp || Date.now();

        Log.debug(this.MODULE_NAME, `处理点击事件: ${clickId}`);

        // 处理特定ID的点击处理器
        const handlers = this._clickHandlers.get(clickId);
        if (handlers && handlers.length > 0) {
            const enabledHandlers = handlers.filter(h => h.enabled);
            
            for (const handler of enabledHandlers) {
                try {
                    handler.handler(data);
                } catch (error) {
                    Log.error(this.MODULE_NAME, `点击处理器执行错误: ${clickId}`, error);
                }
            }
        } else {
            Log.debug(this.MODULE_NAME, `没有找到点击处理器: ${clickId}`);
        }

        // 处理全局点击处理器
        const enabledGlobalHandlers = this._globalClickHandlers.filter(h => h.enabled);
        for (const handler of enabledGlobalHandlers) {
            try {
                handler.handler(data);
            } catch (error) {
                Log.error(this.MODULE_NAME, '全局点击处理器执行错误', error);
            }
        }

        // 同时触发通用事件系统
        this.emit('click', data);
        this.emit(`click:${clickId}`, data);
    }

    // ========== 预定义事件类型 ==========

    /**
     * 触发游戏开始事件
     */
    public emitGameStart(data: EventData = {}): void {
        this.emit('game-start', data);
    }

    /**
     * 触发游戏结束事件
     */
    public emitGameEnd(data: EventData = {}): void {
        this.emit('game-end', data);
    }

    /**
     * 触发游戏暂停事件
     */
    public emitGamePause(data: EventData = {}): void {
        this.emit('game-pause', data);
    }

    /**
     * 触发游戏恢复事件
     */
    public emitGameResume(data: EventData = {}): void {
        this.emit('game-resume', data);
    }

    /**
     * 触发场景切换事件
     */
    public emitSceneChange(sceneName: string, data: EventData = {}): void {
        data.sceneName = sceneName;
        this.emit('scene-change', data);
    }

    /**
     * 触发UI显示事件
     */
    public emitUIShow(uiName: string, data: EventData = {}): void {
        data.uiName = uiName;
        this.emit('ui-show', data);
    }

    /**
     * 触发UI隐藏事件
     */
    public emitUIHide(uiName: string, data: EventData = {}): void {
        data.uiName = uiName;
        this.emit('ui-hide', data);
    }

    /**
     * 触发角色死亡事件
     */
    public emitActorDeath(actorName: string, data: EventData = {}): void {
        data.actorName = actorName;
        this.emit('actor-death', data);
    }

    /**
     * 触发武器切换事件
     */
    public emitWeaponSwitch(weaponType: string, data: EventData = {}): void {
        data.weaponType = weaponType;
        this.emit('weapon-switch', data);
    }

    // ========== 工具方法 ==========

    /**
     * 获取所有注册的事件类型
     */
    public getAllEventTypes(): string[] {
        return Array.from(this._eventListeners.keys());
    }

    /**
     * 获取所有注册的点击ID
     */
    public getAllClickIds(): string[] {
        return Array.from(this._clickHandlers.keys());
    }

    /**
     * 获取事件监听器数量
     */
    public getEventListenerCount(eventType: string): number {
        const listeners = this._eventListeners.get(eventType);
        return listeners ? listeners.length : 0;
    }

    /**
     * 获取点击处理器数量
     */
    public getClickHandlerCount(clickId: string): number {
        const handlers = this._clickHandlers.get(clickId);
        return handlers ? handlers.length : 0;
    }

    /**
     * 清除所有事件监听器
     */
    public clearAllEventListeners(): void {
        this._eventListeners.clear();
        Log.log(this.MODULE_NAME, '清除所有事件监听器');
    }

    /**
     * 清除所有点击处理器
     */
    public clearAllClickHandlers(): void {
        this._clickHandlers.clear();
        this._globalClickHandlers = [];
        Log.log(this.MODULE_NAME, '清除所有点击处理器');
    }

    /**
     * 清除指定target的所有监听器和处理器
     */
    public clearTargetListeners(target: any): void {
        // 清除事件监听器
        for (const [eventType, listeners] of this._eventListeners.entries()) {
            const filteredListeners = listeners.filter(listener => listener.target !== target);
            this._eventListeners.set(eventType, filteredListeners);
        }

        // 清除点击处理器
        for (const [clickId, handlers] of this._clickHandlers.entries()) {
            const filteredHandlers = handlers.filter(handler => handler.target !== target);
            this._clickHandlers.set(clickId, filteredHandlers);
        }

        // 清除全局点击处理器
        this._globalClickHandlers = this._globalClickHandlers.filter(handler => handler.target !== target);

        Log.debug(this.MODULE_NAME, `清除target的所有监听器: ${target}`);
    }

    /**
     * 调试信息
     */
    public debugInfo(): void {
        Log.log(this.MODULE_NAME, '=== EventManager 调试信息 ===');
        
        // 事件监听器信息
        Log.log(this.MODULE_NAME, `事件类型数量: ${this._eventListeners.size}`);
        for (const [eventType, listeners] of this._eventListeners.entries()) {
            Log.log(this.MODULE_NAME, `  ${eventType}: ${listeners.length} 个监听器`);
        }

        // 点击处理器信息
        Log.log(this.MODULE_NAME, `点击ID数量: ${this._clickHandlers.size}`);
        for (const [clickId, handlers] of this._clickHandlers.entries()) {
            const enabledCount = handlers.filter(h => h.enabled).length;
            Log.log(this.MODULE_NAME, `  ${clickId}: ${handlers.length} 个处理器 (${enabledCount} 个启用)`);
        }

        // 全局点击处理器信息
        const enabledGlobalCount = this._globalClickHandlers.filter(h => h.enabled).length;
        Log.log(this.MODULE_NAME, `全局点击处理器: ${this._globalClickHandlers.length} 个 (${enabledGlobalCount} 个启用)`);
    }
}

// 导出单例实例
export const EventManagerInstance = EventManager.getInstance();