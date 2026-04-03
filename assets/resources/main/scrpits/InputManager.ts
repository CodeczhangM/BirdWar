import {
    _decorator, Component, Node, Vec2, Vec3,
    input, Input, EventTouch, EventKeyboard, KeyCode,
    sys, screen, UITransform, view
} from 'cc';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

// ========== 枚举定义 ==========

/** 输入平台类型 */
export enum InputPlatform {
    PC = 'PC',
    MOBILE = 'MOBILE'
}

/** 方向输入 */
export enum DirectionInput {
    NONE  = 0,
    UP    = 1 << 0,
    DOWN  = 1 << 1,
    LEFT  = 1 << 2,
    RIGHT = 1 << 3
}

/** 技能槽索引 */
export enum SkillSlot {
    SKILL_1 = 0,
    SKILL_2 = 1,
    SKILL_3 = 2,
    SKILL_4 = 3,
    SKILL_5 = 4,
    SKILL_6 = 5
}

// ========== 接口定义 ==========

/** 虚拟摇杆状态 */
export interface JoystickState {
    active: boolean;
    /** 归一化方向向量 (-1 ~ 1) */
    direction: Vec2;
    /** 摇杆起始触摸位置（屏幕坐标） */
    startPos: Vec2;
    /** 当前触摸位置（屏幕坐标） */
    currentPos: Vec2;
    touchId: number;
}

/** 技能触摸状态 */
export interface SkillTouchState {
    active: boolean;
    touchId: number;
    /** 触摸起始位置（屏幕坐标） */
    startPos: Vec2;
    /** 当前触摸位置（屏幕坐标） */
    currentPos: Vec2;
    /** 按下时长（秒） */
    holdTime: number;
}

/** 输入状态快照 */
export interface InputState {
    platform: InputPlatform;
    /** 移动方向向量（归一化） */
    moveDirection: Vec2;
    /** 位掩码方向 */
    directionFlags: number;
    /** 各技能槽状态 */
    skills: boolean[];
    /** 技能触摸详情 */
    skillTouches: SkillTouchState[];
    /** 摇杆状态 */
    joystick: JoystickState;
}

/** 输入事件回调 */
export type InputEventCallback = (state: InputState) => void;

/** 技能事件回调 */
export type SkillEventCallback = (slot: SkillSlot, state: SkillTouchState) => void;

// ========== InputManager ==========

/**
 * 输入管理器
 * - PC：键盘 WASD / 方向键控制移动，数字键 1-6 触发技能
 * - Mobile：屏幕左半区虚拟摇杆控制方向，右半区触摸触发技能
 */
@ccclass('InputManager')
export class InputManager extends Component {

    // ---------- Inspector 属性 ----------

    @property({ tooltip: '摇杆最大半径（像素）' })
    public joystickRadius: number = 80;

    @property({ tooltip: '摇杆死区半径（像素）' })
    public joystickDeadZone: number = 10;

    @property({ tooltip: '右半区技能槽数量（1-6）', range: [1, 6, 1] })
    public skillSlotCount: number = 4;

    @property({ tooltip: '强制指定平台（留空则自动检测）', displayName: 'Force Platform' })
    public forcePlatform: string = '';

    @property({ tooltip: '启用调试绘制' })
    public enableDebugDraw: boolean = false;

    // ---------- 单例 ----------

    private static _instance: InputManager = null;
    public static get instance(): InputManager { return InputManager._instance; }

    // ---------- 私有状态 ----------

    private readonly MODULE_NAME = 'InputManager';

    private _platform: InputPlatform = InputPlatform.PC;
    private _screenWidth: number = 0;

    // 键盘状态
    private _keyDown: Set<KeyCode> = new Set();

    // 摇杆状态
    private _joystick: JoystickState = {
        active: false,
        direction: new Vec2(),
        startPos: new Vec2(),
        currentPos: new Vec2(),
        touchId: -1
    };

    // 技能触摸状态（每个槽一个）
    private _skillTouches: SkillTouchState[] = [];

    // 事件监听器
    private _onInputChange: InputEventCallback[] = [];
    private _onSkillDown: SkillEventCallback[] = [];
    private _onSkillUp: SkillEventCallback[] = [];

    // ========== 生命周期 ==========

    onLoad() {
        if (InputManager._instance && InputManager._instance !== this) {
            this.destroy();
            return;
        }
        InputManager._instance = this;

        this._initSkillTouches();
        this._detectPlatform();
        this._registerInputEvents();

        Log.log(this.MODULE_NAME, `InputManager 初始化完成，平台: ${this._platform}`);
    }

    onDestroy() {
        this._unregisterInputEvents();
        if (InputManager._instance === this) {
            InputManager._instance = null;
        }
    }

    update(dt: number) {
        // 更新技能按压时长
        for (const touch of this._skillTouches) {
            if (touch.active) {
                touch.holdTime += dt;
            }
        }

        // 每帧从键盘状态更新移动方向（允许在任何平台通过键盘操作）
        this._updatePCDirection();
    }

    // ========== 初始化 ==========

    private _initSkillTouches() {
        this._skillTouches = [];
        for (let i = 0; i < 6; i++) {
            this._skillTouches.push({
                active: false,
                touchId: -1,
                startPos: new Vec2(),
                currentPos: new Vec2(),
                holdTime: 0
            });
        }
    }

    private _detectPlatform() {
        if (this.forcePlatform === 'PC') {
            this._platform = InputPlatform.PC;
        } else if (this.forcePlatform === 'MOBILE') {
            this._platform = InputPlatform.MOBILE;
        } else {
            this._platform = (sys.isMobile) ? InputPlatform.MOBILE : InputPlatform.PC;
        }
        this._screenWidth = screen.windowSize.width;
    }

    private _registerInputEvents() {
        // 始终监听键盘事件，兼顾部分能用键盘的设备/Web
        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.on(Input.EventType.KEY_UP,   this._onKeyUp,   this);

        if (this._platform === InputPlatform.MOBILE) {
            // 触摸事件挂在 node 上，确保全屏接收
            this.node.on(Input.EventType.TOUCH_START, this._onTouchStart, this);
            this.node.on(Input.EventType.TOUCH_MOVE,  this._onTouchMove,  this);
            this.node.on(Input.EventType.TOUCH_END,   this._onTouchEnd,   this);
            this.node.on(Input.EventType.TOUCH_CANCEL,this._onTouchEnd,   this);
        }
    }

    private _unregisterInputEvents() {
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.off(Input.EventType.KEY_UP,   this._onKeyUp,   this);
        if (this._platform === InputPlatform.MOBILE) {
            this.node.off(Input.EventType.TOUCH_START, this._onTouchStart, this);
            this.node.off(Input.EventType.TOUCH_MOVE,  this._onTouchMove,  this);
            this.node.off(Input.EventType.TOUCH_END,   this._onTouchEnd,   this);
            this.node.off(Input.EventType.TOUCH_CANCEL,this._onTouchEnd,   this);
        }
    }

    // ========== PC 键盘处理 ==========

    private _onKeyDown(event: EventKeyboard) {
        this._keyDown.add(event.keyCode);
        this._handleSkillKey(event.keyCode, true);
        this._notifyChange();
    }

    private _onKeyUp(event: EventKeyboard) {
        this._keyDown.delete(event.keyCode);
        this._handleSkillKey(event.keyCode, false);
        this._notifyChange();
    }

    /** 数字键 1-6 映射技能槽 */
    private _handleSkillKey(keyCode: KeyCode, pressed: boolean) {
        const skillKeyMap: Partial<Record<KeyCode, SkillSlot>> = {
            [KeyCode.DIGIT_1]: SkillSlot.SKILL_1,
            [KeyCode.DIGIT_2]: SkillSlot.SKILL_2,
            [KeyCode.DIGIT_3]: SkillSlot.SKILL_3,
            [KeyCode.DIGIT_4]: SkillSlot.SKILL_4,
            [KeyCode.DIGIT_5]: SkillSlot.SKILL_5,
            [KeyCode.DIGIT_6]: SkillSlot.SKILL_6,
        };

        const slot = skillKeyMap[keyCode];
        if (slot === undefined) return;

        const touch = this._skillTouches[slot];
        if (pressed && !touch.active) {
            touch.active = true;
            touch.holdTime = 0;
            this._fireSkillDown(slot, touch);
        } else if (!pressed && touch.active) {
            touch.active = false;
            this._fireSkillUp(slot, touch);
        }
    }

    /** 每帧从键盘状态计算方向向量 */
    private _updatePCDirection() {
        const up    = this._keyDown.has(KeyCode.KEY_W) || this._keyDown.has(KeyCode.ARROW_UP);
        const down  = this._keyDown.has(KeyCode.KEY_S) || this._keyDown.has(KeyCode.ARROW_DOWN);
        const left  = this._keyDown.has(KeyCode.KEY_A) || this._keyDown.has(KeyCode.ARROW_LEFT);
        const right = this._keyDown.has(KeyCode.KEY_D) || this._keyDown.has(KeyCode.ARROW_RIGHT);

        const dir = new Vec2(
            (right ? 1 : 0) - (left ? 1 : 0),
            (up    ? 1 : 0) - (down ? 1 : 0)
        );

        if (dir.lengthSqr() > 0) dir.normalize();

        this._joystick.direction.set(dir);
        this._joystick.active = dir.lengthSqr() > 0;
    }

    // ========== Mobile 触摸处理 ==========

    private _onTouchStart(event: EventTouch) {
        this._screenWidth = screen.windowSize.width;
        const touches = event.getAllTouches();

        for (const touch of touches) {
            const pos = touch.getLocation();   // 屏幕坐标（左下原点）
            const isLeft = pos.x < this._screenWidth * 0.5;

            if (isLeft) {
                // 左半区：启动摇杆
                if (!this._joystick.active) {
                    this._joystick.active = true;
                    this._joystick.touchId = touch.getID();
                    this._joystick.startPos.set(pos.x, pos.y);
                    this._joystick.currentPos.set(pos.x, pos.y);
                    this._joystick.direction.set(0, 0);
                    Log.debug(this.MODULE_NAME, `摇杆启动 touchId=${touch.getID()} pos=(${pos.x.toFixed(0)},${pos.y.toFixed(0)})`);
                }
            } else {
                // 右半区：技能触摸
                this._handleSkillTouchStart(touch.getID(), pos);
            }
        }

        this._notifyChange();
    }

    private _onTouchMove(event: EventTouch) {
        const touches = event.getAllTouches();

        for (const touch of touches) {
            const pos = touch.getLocation();
            const id  = touch.getID();

            if (this._joystick.active && this._joystick.touchId === id) {
                // 更新摇杆
                this._joystick.currentPos.set(pos.x, pos.y);
                this._updateJoystickDirection();
            } else {
                // 更新技能触摸位置
                for (let i = 0; i < this._skillTouches.length; i++) {
                    if (this._skillTouches[i].active && this._skillTouches[i].touchId === id) {
                        this._skillTouches[i].currentPos.set(pos.x, pos.y);
                    }
                }
            }
        }

        this._notifyChange();
    }

    private _onTouchEnd(event: EventTouch) {
        const touches = event.getAllTouches();

        for (const touch of touches) {
            const id = touch.getID();

            if (this._joystick.active && this._joystick.touchId === id) {
                // 释放摇杆
                this._joystick.active = false;
                this._joystick.touchId = -1;
                this._joystick.direction.set(0, 0);
                Log.debug(this.MODULE_NAME, `摇杆释放 touchId=${id}`);
            } else {
                // 释放技能触摸
                for (let i = 0; i < this._skillTouches.length; i++) {
                    const t = this._skillTouches[i];
                    if (t.active && t.touchId === id) {
                        t.active = false;
                        this._fireSkillUp(i as SkillSlot, t);
                    }
                }
            }
        }

        this._notifyChange();
    }

    /** 根据摇杆起始点和当前点计算归一化方向 */
    private _updateJoystickDirection() {
        const dx = this._joystick.currentPos.x - this._joystick.startPos.x;
        const dy = this._joystick.currentPos.y - this._joystick.startPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.joystickDeadZone) {
            this._joystick.direction.set(0, 0);
            return;
        }

        // 限制在最大半径内
        const clampedDist = Math.min(dist, this.joystickRadius);
        const nx = (dx / dist) * (clampedDist / this.joystickRadius);
        const ny = (dy / dist) * (clampedDist / this.joystickRadius);
        this._joystick.direction.set(nx, ny);
    }

    /** 右半区触摸开始，分配到空闲技能槽 */
    private _handleSkillTouchStart(touchId: number, pos: Vec2) {
        // 根据触摸 X 位置在右半区内映射到技能槽
        const rightStart = this._screenWidth * 0.5;
        const rightWidth = this._screenWidth * 0.5;
        const slotWidth  = rightWidth / this.skillSlotCount;
        const relX       = pos.x - rightStart;
        const slotIndex  = Math.min(
            Math.floor(relX / slotWidth),
            this.skillSlotCount - 1
        );

        if (slotIndex < 0 || slotIndex >= this._skillTouches.length) return;

        const touch = this._skillTouches[slotIndex];
        if (!touch.active) {
            touch.active  = true;
            touch.touchId = touchId;
            touch.holdTime = 0;
            touch.startPos.set(pos.x, pos.y);
            touch.currentPos.set(pos.x, pos.y);
            this._fireSkillDown(slotIndex as SkillSlot, touch);
            Log.debug(this.MODULE_NAME, `技能槽 ${slotIndex} 按下 touchId=${touchId}`);
        }
    }

    // ========== 事件派发 ==========

    private _fireSkillDown(slot: SkillSlot, state: SkillTouchState) {
        for (const cb of this._onSkillDown) cb(slot, state);
    }

    private _fireSkillUp(slot: SkillSlot, state: SkillTouchState) {
        for (const cb of this._onSkillUp) cb(slot, state);
    }

    private _notifyChange() {
        const state = this.getInputState();
        for (const cb of this._onInputChange) cb(state);
    }

    // ========== 公共 API ==========

    /** 获取当前完整输入状态快照 */
    public getInputState(): InputState {
        const skills = this._skillTouches.map(t => t.active);
        return {
            platform:       this._platform,
            moveDirection:  this._joystick.direction.clone(),
            directionFlags: this._calcDirectionFlags(),
            skills,
            skillTouches:   this._skillTouches.map(t => ({ ...t,
                startPos:   t.startPos.clone(),
                currentPos: t.currentPos.clone()
            })),
            joystick: {
                ...this._joystick,
                direction:  this._joystick.direction.clone(),
                startPos:   this._joystick.startPos.clone(),
                currentPos: this._joystick.currentPos.clone()
            }
        };
    }

    /** 获取归一化移动方向 */
    public getMoveDirection(): Vec2 {
        return this._joystick.direction.clone();
    }

    /** 获取方向位掩码 */
    public getDirectionFlags(): number {
        return this._calcDirectionFlags();
    }

    /** 指定技能槽是否按下 */
    public isSkillActive(slot: SkillSlot): boolean {
        return this._skillTouches[slot]?.active ?? false;
    }

    /** 获取技能槽触摸详情 */
    public getSkillTouchState(slot: SkillSlot): SkillTouchState | null {
        return this._skillTouches[slot] ?? null;
    }

    /** 当前平台 */
    public getPlatform(): InputPlatform {
        return this._platform;
    }

    /** 是否有移动输入 */
    public isMoving(): boolean {
        return this._joystick.direction.lengthSqr() > 0;
    }

    // ---------- 事件订阅 ----------

    /** 订阅输入状态变化 */
    public onInputChange(cb: InputEventCallback) {
        if (this._onInputChange.indexOf(cb) < 0) this._onInputChange.push(cb);
    }

    /** 取消订阅输入状态变化 */
    public offInputChange(cb: InputEventCallback) {
        const idx = this._onInputChange.indexOf(cb);
        if (idx >= 0) this._onInputChange.splice(idx, 1);
    }

    /** 订阅技能按下 */
    public onSkillDown(cb: SkillEventCallback) {
        if (this._onSkillDown.indexOf(cb) < 0) this._onSkillDown.push(cb);
    }

    /** 取消订阅技能按下 */
    public offSkillDown(cb: SkillEventCallback) {
        const idx = this._onSkillDown.indexOf(cb);
        if (idx >= 0) this._onSkillDown.splice(idx, 1);
    }

    /** 订阅技能释放 */
    public onSkillUp(cb: SkillEventCallback) {
        if (this._onSkillUp.indexOf(cb) < 0) this._onSkillUp.push(cb);
    }

    /** 取消订阅技能释放 */
    public offSkillUp(cb: SkillEventCallback) {
        const idx = this._onSkillUp.indexOf(cb);
        if (idx >= 0) this._onSkillUp.splice(idx, 1);
    }

    /** 清除所有监听器 */
    public clearAllListeners() {
        this._onInputChange = [];
        this._onSkillDown   = [];
        this._onSkillUp     = [];
    }

    // ---------- 工具 ----------

    private _calcDirectionFlags(): number {
        const dir = this._joystick.direction;
        let flags = DirectionInput.NONE;
        if (dir.y >  0.3) flags |= DirectionInput.UP;
        if (dir.y < -0.3) flags |= DirectionInput.DOWN;
        if (dir.x < -0.3) flags |= DirectionInput.LEFT;
        if (dir.x >  0.3) flags |= DirectionInput.RIGHT;
        return flags;
    }

    /** 调试信息 */
    public debugInfo() {
        const state = this.getInputState();
        Log.log(this.MODULE_NAME, '=== InputManager 调试信息 ===');
        Log.log(this.MODULE_NAME, `平台: ${state.platform}`);
        Log.log(this.MODULE_NAME, `移动方向: (${state.moveDirection.x.toFixed(2)}, ${state.moveDirection.y.toFixed(2)})`);
        Log.log(this.MODULE_NAME, `方向标志: ${state.directionFlags.toString(2)}`);
        Log.log(this.MODULE_NAME, `技能状态: [${state.skills.map(s => s ? '●' : '○').join(', ')}]`);
        Log.log(this.MODULE_NAME, `摇杆激活: ${state.joystick.active}`);
    }
}

/** 全局单例访问 */
export const InputManagerInstance = {
    get instance(): InputManager { return InputManager.instance; }
};
