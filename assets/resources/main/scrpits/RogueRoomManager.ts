import {
    _decorator, Component, Node, Prefab, Vec3,
    Camera, UIOpacity, tween, BoxCollider2D, RigidBody2D,
    ERigidBody2DType, Collider2D, Contact2DType, IPhysics2DContact,
    Sprite, Color, UITransform, view, instantiate, Graphics, PhysicsGroup2D
} from 'cc';
import { Log } from './Logger';
import { RoomType } from './ProceduralDungeonGenerator';
import { EventManagerInstance } from './EventManager';
import { RoomGenerator } from './RoomGenerator';
import { RoomConfig, RoomEvents } from './RoomTypes';
import { EnemyManager } from './enemy/EnemyManager';
import { FogOfWar } from './FogOfWar';

const { ccclass, property } = _decorator;

export type { RoomConfig };
export { RoomEvents };

@ccclass('RogueRoomManager')
export class RogueRoomManager extends Component {

    // ---------- Inspector ----------

    @property(Prefab)
    enemyPrefab: Prefab = null;

    @property(Prefab)
    doorPrefab: Prefab = null;

    @property(Camera)
    mainCamera: Camera = null;

    /** 全屏黑色遮罩节点（挂 UIOpacity），留空自动创建 */
    @property(Node)
    fadeOverlay: Node = null;

    /** 玩家节点，用于瞬移到入口 */
    @property(Node)
    playerNode: Node = null;

    /** FogOfWar 组件，房间切换后重置迷雾 */
    @property(FogOfWar)
    fogOfWar: FogOfWar = null;

    @property({ tooltip: '淡入淡出时长（秒）' })
    fadeDuration: number = 0.4;

    @property({ tooltip: '门宽（像素）' })
    doorWidth: number = 32;

    @property({ tooltip: '门高（像素）' })
    doorHeight: number = 80;


    @property({ type: Prefab, tooltip: '测试的Map prefab'})
    debugMapPrefab : Prefab = null;
    // ---------- 私有状态 ----------

    private _currentRoom: Node = null;
    private _exitDoor: Node = null;
    private _isTransitioning: boolean = false;
    private _inputLocked: boolean = false;
    private _mapBackgroud: Node = null;

    private readonly M = 'RogueRoomManager';

    // ========== 生命周期 ==========

    start() {
        this._ensureFadeOverlay();
        RoomGenerator.instance.reset();
        this.loadNextRoom(RoomType.START);
    }

    // ========== 公共 API ==========

    /**
     * 玩家触发出口门时调用。
     * 完整流程：锁输入 → 淡出 → 销毁旧房间 → 生成新房间 → 淡入 → 解锁输入
     */
    public loadNextRoom(forceType?: RoomType) {
        if (this._isTransitioning) return;
        this._isTransitioning = true;
        this._setInputLocked(true);

        const overlay = this._getOverlayOpacity();

        // 淡出（黑屏）
        tween(overlay)
            .to(this.fadeDuration, { opacity: 255 })
            .call(() => {
                this.destroyCurrentRoom();

                const cfg = forceType
                    ? RoomGenerator.instance.generate(forceType)
                    : RoomGenerator.instance.next();

                this._buildRoom(cfg);

                // 淡入
                tween(overlay)
                    .to(this.fadeDuration, { opacity: 0 })
                    .call(() => {
                        this._isTransitioning = false;
                        this._setInputLocked(false);
                    })
                    .start();
            })
            .start();
    }

    /** 安全销毁当前房间所有节点（怪物、门、地板、碰撞） */
    public destroyCurrentRoom() {
        if (this._currentRoom && this._currentRoom.isValid) {
            this._currentRoom.destroy();
        }

        if(this._mapBackgroud && this._mapBackgroud.isValid) {
            this._mapBackgroud.destroy();
        }
        this._currentRoom = null;
        this._exitDoor = null;
    }

    /** 外部通知敌人死亡（EnemyManager 不支持时手动调用） */
    public notifyEnemyDead(enemy: Node) {
        const mgr = this._currentRoom?.getComponent(EnemyManager);
        if (mgr) {
            // EnemyManager 内部已跟踪，检查存活数
            if (mgr.getAliveCount() === 0) this._onRoomCleared();
        }
    }

    // ========== 房间构建 ==========

    private _buildRoom(cfg: RoomConfig) {
        const room = new Node('Room');
        room.setParent(this.node);
        room.setPosition(Vec3.ZERO);
        this._currentRoom = room;

        const hw = cfg.width / 2;
        const hh = cfg.height / 2;
        const dw = this.doorWidth;
        const dh = this.doorHeight;

        //  let NodeMap: Node = null
        //load map
        if(this.debugMapPrefab) {
           this._mapBackgroud = instantiate(this.debugMapPrefab);
           this._mapBackgroud.setParent(this.node);
           const sizeContent =  this._mapBackgroud.getChildByName("SizeContent");
           if(sizeContent) {
                const uisize = sizeContent.getComponent(UITransform);
                Log.debug(this.M, `uisize : ${uisize.width}, ${uisize.height}, cfg.width: ${cfg.width} cfg.height:${cfg.height}`);

                const scaleX = cfg.width / uisize.width;
                const scaleY = cfg.height / uisize.height;
                const finalScale = Math.min(scaleX, scaleY); // 取最小，保证不变形
                this._mapBackgroud.setScale(finalScale,finalScale);
           }
        }

        // 地板
        this._makeRect(room, 'Floor', cfg.width, cfg.height, new Color(60, 60, 60, 255), Vec3.ZERO, false);

        // 四面墙（左右各留门缺口）
        // 上墙、下墙：完整
        this._makeWall(room, new Vec3(0,  hh + dw / 2, 0), cfg.width, dw);
        this._makeWall(room, new Vec3(0, -hh - dw / 2, 0), cfg.width, dw);
        // 左墙：上下两段，中间留 dh 高度的门缺口
        const wallH = (cfg.height - dh) / 2;
        const wallCY = (dh + wallH) / 2;  // 墙段中心距房间中心的偏移
        this._makeWall(room, new Vec3(-hw - dw / 2,  wallCY, 0), dw, wallH);
        this._makeWall(room, new Vec3(-hw - dw / 2, -wallCY, 0), dw, wallH);
        // 右墙：同左墙
        this._makeWall(room, new Vec3( hw + dw / 2,  wallCY, 0), dw, wallH);
        this._makeWall(room, new Vec3( hw + dw / 2, -wallCY, 0), dw, wallH);

        // 入口门（左，不阻挡）
        this._makeDoor(room, new Vec3(-hw, 0, 0), false);

        // 出口门（右，初始锁定）
        this._exitDoor = this._makeDoor(room, new Vec3(hw, 0, 0), true);

        // 生成敌人（通过 EnemyManager）
        this._spawnEnemies(room, cfg);

        // 玩家瞬移到入口门位置
        if (this.playerNode && this.playerNode.isValid) {
            this.playerNode.setWorldPosition(new Vec3(-hw + dw + 20, 0, 0));
        }

        // 相机通知
        this._clampCamera(cfg);

        // 重置迷雾
        if (this.fogOfWar) this.fogOfWar.initForRoom(room, cfg.width, cfg.height);

        // 无敌人房间直接解锁出口
        if (cfg.enemyCount === 0) this._onRoomCleared();

        Log.log(this.M, `房间 #${RoomGenerator.instance.roomIndex} 生成，类型: ${cfg.type}，敌人: ${cfg.enemyCount}`);
        EventManagerInstance.emit(RoomEvents.ROOM_CHANGED, { roomIndex: RoomGenerator.instance.roomIndex, config: cfg });
    }

    // ========== 敌人生成 ==========

    private _spawnEnemies(room: Node, cfg: RoomConfig) {
        if (!this.enemyPrefab || cfg.enemyCount <= 0) return;

        // 挂载 EnemyManager 到房间节点
        const mgr = room.addComponent(EnemyManager);
        mgr.enemyPrefab = this.enemyPrefab;
        mgr.enemyCount = cfg.enemyCount;
        mgr.spawnRange = Math.min(cfg.width, cfg.height) * 0.35;
        mgr.spawnPosition = Vec3.ZERO;

        // 监听全部死亡
        mgr.onAllDead(() => this._onRoomCleared());
    }

    // ========== 房间清空 & 门控 ==========

    private _onRoomCleared() {
        Log.log(this.M, `房间已清空，解锁出口`);
        EventManagerInstance.emit(RoomEvents.ROOM_CLEARED, { roomIndex: RoomGenerator.instance.roomIndex });
        this._unlockExitDoor();
    }

    private _unlockExitDoor() {
        if (!this._exitDoor || !this._exitDoor.isValid) return;

        const col = this._exitDoor.getComponent(BoxCollider2D);
        if (col) col.enabled = false;

        const sprite = this._exitDoor.getComponent(Sprite);
        if (sprite) sprite.color = new Color(0, 220, 80, 200);

        // 添加 sensor 触发器感应玩家
        const rb = this._exitDoor.getComponent(RigidBody2D) || this._exitDoor.addComponent(RigidBody2D);
        // rb.type = ERigidBody2DType.Static;
        rb.enabledContactListener = true;
        const trigger = this._exitDoor.getComponent(BoxCollider2D);
        trigger.sensor = true;
        trigger.size.set(this.doorWidth, this.doorHeight);
        trigger.enabled = true;
        

        trigger.on(Contact2DType.BEGIN_CONTACT,
            (_self: Collider2D, other: Collider2D, _c: IPhysics2DContact) => {
                Log.debug(this.M, `enter exit door.`);
                if (other.node.name.includes('Player') && !this._isTransitioning) {
                    this.loadNextRoom();
                }
            }, this);

        EventManagerInstance.emit(RoomEvents.DOOR_UNLOCKED, { roomIndex: RoomGenerator.instance.roomIndex });
    }

    // ========== 输入锁定 ==========

    private _setInputLocked(locked: boolean) {
        this._inputLocked = locked;
        EventManagerInstance.emit('input-lock', { locked });
    }

    // ========== 相机 ==========

    private _clampCamera(cfg: RoomConfig) {
        if (!this.mainCamera) return;
        this.mainCamera.node.setPosition(0, 0, this.mainCamera.node.position.z);
        EventManagerInstance.emit('camera-room-bounds', {
            minX: -cfg.width / 2, maxX: cfg.width / 2,
            minY: -cfg.height / 2, maxY: cfg.height / 2
        });
    }

    // ========== 工具 ==========

    private _makeRect(parent: Node, name: string, w: number, h: number, color: Color, pos: Vec3, physics: boolean): Node {
        const n = new Node(name);
        n.setParent(parent);
        n.setPosition(pos);
        n.addComponent(UITransform).setContentSize(w, h);
        const g = n.addComponent(Graphics);
        g.fillColor = color;
        g.rect(-w / 2, -h / 2, w, h);
        g.fill();
        if (physics) {
            const rb = n.addComponent(RigidBody2D);
            rb.type = ERigidBody2DType.Static;
            const col = n.addComponent(BoxCollider2D);
            col.group = 1  << 5;
            col.size.set(w, h);
        }
        return n;
    }

    private _makeWall(parent: Node, pos: Vec3, w: number, h: number) {
        this._makeRect(parent, 'Wall', w, h, new Color(30, 30, 30, 255), pos, true);
    }

    private _makeDoor(parent: Node, pos: Vec3, locked: boolean): Node {
        if (this.doorPrefab) {
            const door = instantiate(this.doorPrefab);
            door.setParent(parent);
            door.setPosition(pos);
            return door;
        }
        return this._makeRect(parent, 'Door', this.doorWidth, this.doorHeight,
            locked ? new Color(180, 60, 60, 220) : new Color(0, 220, 80, 200),
            pos, locked);
    }

    private _ensureFadeOverlay() {
        if (this.fadeOverlay) return;
        const n = new Node('FadeOverlay');
        n.setParent(this.node);
        n.layer = this.node.layer;
        const ut = n.addComponent(UITransform);
        const s = view.getVisibleSize();
        ut.setContentSize(s.width || 1280, s.height || 720);
        const sp = n.addComponent(Sprite);
        sp.color = new Color(0, 0, 0, 255);
        const op = n.addComponent(UIOpacity);
        op.opacity = 0;
        this.fadeOverlay = n;
    }

    private _getOverlayOpacity(): UIOpacity {
        return this.fadeOverlay.getComponent(UIOpacity)!;
    }
}
