import { _decorator, Component, Node, Button } from 'cc';
import { EventManagerInstance, ClickEventData } from './EventManager';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

/**
 * 点击处理器组件
 * 简化的点击事件处理组件，可直接挂载到按钮节点上
 */
@ccclass('ClickHandler')
export class ClickHandler extends Component {
    
    @property({ type: String, tooltip: '点击ID，用于标识这个点击事件' })
    public clickId: string = '';

    @property({ type: Boolean, tooltip: '是否启用点击处理' })
    public clickEnabled: boolean = true;

    @property({ type: Boolean, tooltip: '是否自动查找Button组件' })
    public autoFindButton: boolean = true;

    @property({ type: Boolean, tooltip: '是否包含位置信息' })
    public includePosition: boolean = true;

    @property({ type: Boolean, tooltip: '是否包含时间戳' })
    public includeTimestamp: boolean = true;

    @property({ type: Boolean, tooltip: '是否启用调试日志' })
    public enableDebugLog: boolean = false;

    private _button: Button = null;
    private readonly MODULE_NAME = 'ClickHandler';

    onLoad() {
        this.initializeButton();
    }

    onDestroy() {
        this.cleanup();
    }

    /**
     * 初始化按钮
     */
    private initializeButton() {
        if (this.autoFindButton) {
            this._button = this.getComponent(Button);
            if (!this._button) {
                this._button = this.node.getComponentInChildren(Button);
            }
        }

        if (this._button) {
            this._button.node.on(Button.EventType.CLICK, this.onButtonClick, this);
            
            if (this.enableDebugLog) {
                Log.debug(this.MODULE_NAME, `初始化点击处理器: ${this.clickId}`);
            }
        } else {
            // 如果没有Button组件，直接监听节点的触摸事件
            this.node.on(Node.EventType.TOUCH_END, this.onNodeTouch, this);
            
            if (this.enableDebugLog) {
                Log.debug(this.MODULE_NAME, `初始化触摸处理器: ${this.clickId}`);
            }
        }
    }

    /**
     * 按钮点击处理
     */
    private onButtonClick() {
        if (!this.clickEnabled || !this.clickId) {
            return;
        }

        this.handleClick();
    }

    /**
     * 节点触摸处理
     */
    private onNodeTouch() {
        if (!this.clickEnabled || !this.clickId) {
            return;
        }

        this.handleClick();
    }

    /**
     * 处理点击事件
     */
    private handleClick() {
        const clickData: ClickEventData = {
            clickId: this.clickId,
            target: this.node
        };

        // 添加位置信息
        if (this.includePosition) {
            clickData.position = {
                x: this.node.worldPosition.x,
                y: this.node.worldPosition.y
            };
        }

        // 添加时间戳
        if (this.includeTimestamp) {
            clickData.timestamp = Date.now();
        }

        // 添加额外信息
        clickData.nodeName = this.node.name;
        clickData.hasButton = this._button !== null;

        if (this.enableDebugLog) {
            Log.debug(this.MODULE_NAME, `触发点击事件: ${this.clickId}`, clickData);
        }

        // 触发点击事件
        EventManagerInstance.handleClick(this.clickId, clickData);
    }

    /**
     * 设置点击ID
     */
    public setClickId(clickId: string) {
        this.clickId = clickId;
        
        if (this.enableDebugLog) {
            Log.debug(this.MODULE_NAME, `设置点击ID: ${clickId}`);
        }
    }

    /**
     * 启用/禁用点击处理
     */
    public setClickEnabled(enabled: boolean) {
        this.clickEnabled = enabled;
        
        if (this.enableDebugLog) {
            Log.debug(this.MODULE_NAME, `设置启用状态: ${this.clickId} -> ${enabled}`);
        }
    }

    /**
     * 手动触发点击事件
     */
    public triggerClick(additionalData?: any) {
        if (!this.clickEnabled || !this.clickId) {
            Log.warn(this.MODULE_NAME, `无法触发点击事件: clickEnabled=${this.clickEnabled}, clickId=${this.clickId}`);
            return;
        }

        const clickData: ClickEventData = {
            clickId: this.clickId,
            target: this.node,
            manual: true
        };

        // 添加位置信息
        if (this.includePosition) {
            clickData.position = {
                x: this.node.worldPosition.x,
                y: this.node.worldPosition.y
            };
        }

        // 添加时间戳
        if (this.includeTimestamp) {
            clickData.timestamp = Date.now();
        }

        // 添加额外数据
        if (additionalData) {
            Object.assign(clickData, additionalData);
        }

        if (this.enableDebugLog) {
            Log.debug(this.MODULE_NAME, `手动触发点击事件: ${this.clickId}`, clickData);
        }

        // 触发点击事件
        EventManagerInstance.handleClick(this.clickId, clickData);
    }

    /**
     * 获取点击处理器信息
     */
    public getClickHandlerInfo() {
        return {
            clickId: this.clickId,
            clickEnabled: this.clickEnabled,
            nodeName: this.node.name,
            hasButton: this._button !== null,
            autoFindButton: this.autoFindButton,
            includePosition: this.includePosition,
            includeTimestamp: this.includeTimestamp,
            enableDebugLog: this.enableDebugLog
        };
    }

    /**
     * 清理资源
     */
    private cleanup() {
        if (this._button) {
            this._button.node.off(Button.EventType.CLICK, this.onButtonClick, this);
        } else {
            this.node.off(Node.EventType.TOUCH_END, this.onNodeTouch, this);
        }

        if (this.enableDebugLog) {
            Log.debug(this.MODULE_NAME, `清理点击处理器: ${this.clickId}`);
        }
    }
}