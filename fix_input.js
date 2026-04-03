const fs = require('fs');
const content = fs.readFileSync('assets/resources/main/scrpits/InputManager.ts', 'utf8');

const updated = content.replace(
  `        // PC 平台：每帧从键盘状态更新移动方向
        if (this._platform === InputPlatform.PC) {
            this._updatePCDirection();
        }`,
  `        // 每帧从键盘状态更新移动方向（允许在任何平台通过键盘操作）
        this._updatePCDirection();`
).replace(
  `    private _registerInputEvents() {
        if (this._platform === InputPlatform.PC) {
            input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
            input.on(Input.EventType.KEY_UP,   this._onKeyUp,   this);
        } else {
            // 触摸事件挂在 node 上，确保全屏接收
            this.node.on(Input.EventType.TOUCH_START, this._onTouchStart, this);
            this.node.on(Input.EventType.TOUCH_MOVE,  this._onTouchMove,  this);
            this.node.on(Input.EventType.TOUCH_END,   this._onTouchEnd,   this);
            this.node.on(Input.EventType.TOUCH_CANCEL,this._onTouchEnd,   this);
        }
    }`,
  `    private _registerInputEvents() {
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
    }`
).replace(
  `    private _unregisterInputEvents() {
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.off(Input.EventType.KEY_UP,   this._onKeyUp,   this);
        this.node.off(Input.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.off(Input.EventType.TOUCH_MOVE,  this._onTouchMove,  this);
        this.node.off(Input.EventType.TOUCH_END,   this._onTouchEnd,   this);
        this.node.off(Input.EventType.TOUCH_CANCEL,this._onTouchEnd,   this);
    }`,
  `    private _unregisterInputEvents() {
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.off(Input.EventType.KEY_UP,   this._onKeyUp,   this);
        if (this._platform === InputPlatform.MOBILE) {
            this.node.off(Input.EventType.TOUCH_START, this._onTouchStart, this);
            this.node.off(Input.EventType.TOUCH_MOVE,  this._onTouchMove,  this);
            this.node.off(Input.EventType.TOUCH_END,   this._onTouchEnd,   this);
            this.node.off(Input.EventType.TOUCH_CANCEL,this._onTouchEnd,   this);
        }
    }`
);

fs.writeFileSync('assets/resources/main/scrpits/InputManager.ts', updated);
console.log('Done!');
