import { _decorator, Component, Node, Collider2D, Contact2DType, IPhysics2DContact, Sprite } from 'cc';
import { WeaponType } from './WeaponType';
import { Log } from '../Logger';
import { ResourceLoaderInstance } from '../ResourceLoader';
const { ccclass, property } = _decorator;

/**
 * 子弹资源映射
 */
const BULLET_SPRITE_MAP: { [key in WeaponType]: string } = {
    [WeaponType.BULLET_TYPE_NORMAL]: 'Bullet_Normal',
    [WeaponType.BULLET_TYPE_CANNON]: 'Bullet_Cannon',
    [WeaponType.BULLET_TYPE_MULTIPLE]: 'Bullet_Multiple',
    [WeaponType.BULLET_TYPE_LASER]: 'Bullet_Laser'
};

/**
 * 子弹组件
 * 处理子弹的碰撞、伤害等逻辑，与WeaponsSystem整合
 */
@ccclass('Bullet')
export class Bullet extends Component {
    
    @property({ type: Number, tooltip: '子弹伤害' })
    public damage: number = 10;

    @property({ type: Number, tooltip: '子弹速度' })
    public speed: number = 500;

    @property({ type: Number, tooltip: '子弹生存时间' })
    public lifetime: number = 3.0;

    @property({ type: String, tooltip: '发射者标签' })
    public ownerTag: string = 'Player';

    @property({ type: [String], tooltip: '可以伤害的目标标签' })
    public targetTags: string[] = ['Enemy'];

    @property({ type: Number, tooltip: '穿透力（可穿透目标数量）' })
    public penetration: number = 0;

    @property({ type: Number, tooltip: '爆炸半径' })
    public explosionRadius: number = 0;

    @property({ type: Boolean, tooltip: '是否为激光类型' })
    public isLaser: boolean = false;

    @property({ type: String, tooltip: '资源Bundle名称' })
    public resourceBundle: string = 'ui';

    @property({ type: Node, tooltip: '子弹精灵节点' })
    public bulletSprite: Node = null;

    // 武器类型（由WeaponsSystem设置）
    public weaponType: WeaponType = WeaponType.BULLET_TYPE_NORMAL;

    private _startTime: number = 0;
    private _hasHit: boolean = false;
    private _hitCount: number = 0;
    private _hitTargets: Set<Node> = new Set();
    private _spriteComponent: Sprite = null;
    private readonly MODULE_NAME = 'Bullet';

    onLoad() {
        // 初始化子弹精灵节点
        this.initializeBulletSprite();
        
        // 设置碰撞监听
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    onEnable() {
        this._startTime = Date.now() / 1000;
        this._hasHit = false;
        this._hitCount = 0;
        this._hitTargets.clear();
        
        // 加载对应武器类型的子弹贴图
        this.loadBulletSprite();
        
        Log.debug(this.MODULE_NAME, `子弹激活 - 类型: ${WeaponType[this.weaponType]}`);
    }

    onDisable() {
        this._hasHit = false;
        this._hitCount = 0;
        this._hitTargets.clear();
        Log.debug(this.MODULE_NAME, '子弹回收');
    }

    onDestroy() {
        // 清理资源引用
        this._spriteComponent = null;
        this.bulletSprite = null;
        this._hitTargets.clear();
    }

    // ========== 资源加载相关方法 ==========
    
    /**
     * 初始化子弹精灵节点
     */
    private initializeBulletSprite() {
        // 自动查找BulletSprite子节点
        if (!this.bulletSprite) {
            this.bulletSprite = this.node.getChildByName('BulletSprite');
            if (!this.bulletSprite) {
                Log.warn(this.MODULE_NAME, 'BulletSprite子节点未找到，将尝试在根节点添加Sprite组件');
                // 如果没有子节点，直接在根节点上获取Sprite组件
                this._spriteComponent = this.node.getComponent(Sprite);
                if (!this._spriteComponent) {
                    this._spriteComponent = this.node.addComponent(Sprite);
                }
                return;
            }
        }

        // 获取或添加Sprite组件
        if (this.bulletSprite) {
            this._spriteComponent = this.bulletSprite.getComponent(Sprite);
            if (!this._spriteComponent) {
                this._spriteComponent = this.bulletSprite.addComponent(Sprite);
            }
        }
    }

    /**
     * 根据武器类型加载子弹贴图
     */
    private async loadBulletSprite() {
        if (!this._spriteComponent) {
            Log.warn(this.MODULE_NAME, 'Sprite组件未找到，跳过贴图加载');
            return;
        }

        const spriteName = this.getBulletSpriteName();
        if (!spriteName) {
            Log.warn(this.MODULE_NAME, `未找到武器类型 ${WeaponType[this.weaponType]} 对应的贴图名称`);
            return;
        }

        try {
            Log.debug(this.MODULE_NAME, `开始加载子弹贴图: ${spriteName} (武器类型: ${WeaponType[this.weaponType]})`);
            
            const spriteFrame = await ResourceLoaderInstance.loadSpriteFrame(this.resourceBundle, spriteName);
            if (spriteFrame && this._spriteComponent && this._spriteComponent.isValid) {
                this._spriteComponent.spriteFrame = spriteFrame;
                Log.debug(this.MODULE_NAME, `子弹贴图加载成功: ${spriteName}`);
            } else {
                Log.warn(this.MODULE_NAME, `子弹贴图加载失败: ${spriteName}`);
                // 尝试加载默认子弹贴图
                await this.loadDefaultBulletSprite();
            }
        } catch (error) {
            Log.error(this.MODULE_NAME, `子弹贴图加载异常: ${spriteName}`, error);
            await this.loadDefaultBulletSprite();
        }
    }

    /**
     * 加载默认子弹贴图
     */
    private async loadDefaultBulletSprite() {
        const defaultSpriteName = 'Bullet_Default';
        try {
            const spriteFrame = await ResourceLoaderInstance.loadSpriteFrame(this.resourceBundle, defaultSpriteName);
            if (spriteFrame && this._spriteComponent && this._spriteComponent.isValid) {
                this._spriteComponent.spriteFrame = spriteFrame;
                Log.debug(this.MODULE_NAME, `默认子弹贴图加载成功: ${defaultSpriteName}`);
            }
        } catch (error) {
            Log.warn(this.MODULE_NAME, `默认子弹贴图加载失败: ${defaultSpriteName}`, error);
        }
    }

    /**
     * 获取子弹贴图名称
     */
    private getBulletSpriteName(): string {
        return BULLET_SPRITE_MAP[this.weaponType] || 'Bullet_Normal';
    }

    /**
     * 设置武器类型并更新贴图
     */
    public async setWeaponType(weaponType: WeaponType) {
        if (this.weaponType !== weaponType) {
            this.weaponType = weaponType;
            
            // 根据武器类型设置子弹属性
            this.updateBulletPropertiesByWeaponType();
            
            // 重新加载贴图
            await this.loadBulletSprite();
            
            Log.debug(this.MODULE_NAME, `武器类型已更新: ${WeaponType[weaponType]}`);
        }
    }

    /**
     * 根据武器类型更新子弹属性
     */
    private updateBulletPropertiesByWeaponType() {
        switch (this.weaponType) {
            case WeaponType.BULLET_TYPE_NORMAL:
                this.penetration = 0;
                this.explosionRadius = 0;
                this.isLaser = false;
                break;
            case WeaponType.BULLET_TYPE_CANNON:
                this.penetration = 0;
                this.explosionRadius = 50; // 爆炸半径
                this.isLaser = false;
                break;
            case WeaponType.BULLET_TYPE_MULTIPLE:
                this.penetration = 1; // 可穿透1个目标
                this.explosionRadius = 0;
                this.isLaser = false;
                break;
            case WeaponType.BULLET_TYPE_LASER:
                this.penetration = 3; // 可穿透3个目标
                this.explosionRadius = 0;
                this.isLaser = true;
                break;
        }
    }

    /**
     * 预加载所有子弹贴图
     */
    public static async preloadAllBulletSprites(resourceBundle: string = 'resources'): Promise<void> {
        Log.log('Bullet', '开始预加载所有子弹贴图');
        
        // 手动获取所有贴图名称，避免使用Object.values
        const spriteNames: string[] = [
            BULLET_SPRITE_MAP[WeaponType.BULLET_TYPE_NORMAL],
            BULLET_SPRITE_MAP[WeaponType.BULLET_TYPE_CANNON],
            BULLET_SPRITE_MAP[WeaponType.BULLET_TYPE_MULTIPLE],
            BULLET_SPRITE_MAP[WeaponType.BULLET_TYPE_LASER],
            'Bullet_Default' // 添加默认贴图
        ];
        
        try {
            const spriteMap = await ResourceLoaderInstance.loadSpriteFrames(resourceBundle, spriteNames);
            
            let successCount = 0;
            spriteMap.forEach((sprite, name) => {
                if (sprite) successCount++;
            });
            
            Log.log('Bullet', `子弹贴图预加载完成: ${successCount}/${spriteNames.length}`);
        } catch (error) {
            Log.error('Bullet', '子弹贴图预加载失败:', error);
        }
    }

    /**
     * 调试子弹资源信息
     */
    public debugBulletResources(): void {
        Log.log(this.MODULE_NAME, '=== 子弹资源调试信息 ===');
        Log.log(this.MODULE_NAME, `当前武器类型: ${WeaponType[this.weaponType]}`);
        Log.log(this.MODULE_NAME, `对应贴图名称: ${this.getBulletSpriteName()}`);
        Log.log(this.MODULE_NAME, `资源Bundle: ${this.resourceBundle}`);
        Log.log(this.MODULE_NAME, `Sprite组件状态: ${this._spriteComponent ? '已找到' : '未找到'}`);
        Log.log(this.MODULE_NAME, `BulletSprite节点: ${this.bulletSprite ? this.bulletSprite.name : '未设置'}`);
        
        // 搜索相关的子弹资源
        const bulletResults = ResourceLoaderInstance.smartSearchSprite(this.resourceBundle, 'Bullet');
        Log.log(this.MODULE_NAME, `找到的子弹相关资源: ${bulletResults.length} 个`);
        bulletResults.forEach((result, index) => {
            Log.log(this.MODULE_NAME, `  ${index + 1}. ${result.name} -> ${result.fullPath}`);
        });
    }

    /**
     * 获取所有可用的子弹贴图名称
     */
    public static getAllBulletSpriteNames(): string[] {
        return [
            BULLET_SPRITE_MAP[WeaponType.BULLET_TYPE_NORMAL],
            BULLET_SPRITE_MAP[WeaponType.BULLET_TYPE_CANNON],
            BULLET_SPRITE_MAP[WeaponType.BULLET_TYPE_MULTIPLE],
            BULLET_SPRITE_MAP[WeaponType.BULLET_TYPE_LASER],
            'Bullet_Default'
        ];
    }

    /**
     * 根据武器类型获取子弹贴图名称（静态方法）
     */
    public static getBulletSpriteNameByWeaponType(weaponType: WeaponType): string {
        return BULLET_SPRITE_MAP[weaponType] || 'Bullet_Normal';
    }

    /**
     * 检查子弹贴图是否已加载
     */
    public isSpriteLoaded(): boolean {
        return this._spriteComponent && this._spriteComponent.spriteFrame !== null;
    }

    /**
     * 强制重新加载子弹贴图
     */
    public async reloadBulletSprite(): Promise<void> {
        Log.debug(this.MODULE_NAME, '强制重新加载子弹贴图');
        await this.loadBulletSprite();
    }

    /**
     * 设置资源Bundle
     */
    public setResourceBundle(bundleName: string): void {
        if (this.resourceBundle !== bundleName) {
            this.resourceBundle = bundleName;
            Log.debug(this.MODULE_NAME, `资源Bundle已更新: ${bundleName}`);
            
            // 重新加载贴图
            this.loadBulletSprite();
        }
    }

    /**
     * 获取子弹资源状态
     */
    public getBulletResourceStatus() {
        return {
            weaponType: WeaponType[this.weaponType],
            spriteName: this.getBulletSpriteName(),
            resourceBundle: this.resourceBundle,
            spriteLoaded: this.isSpriteLoaded(),
            spriteComponent: this._spriteComponent !== null,
            bulletSpriteNode: this.bulletSprite !== null,
            bulletSpriteNodeName: this.bulletSprite ? this.bulletSprite.name : null
        };
    }

    /**
     * 碰撞开始
     */
    private onBeginContact(_selfCollider: Collider2D, otherCollider: Collider2D, _contact: IPhysics2DContact | null) {
        if (this._hasHit && this.penetration <= 0) return;

        const otherNode = otherCollider.node;
        
        // 避免重复命中同一目标
        if (this._hitTargets.has(otherNode)) {
            return;
        }

        const otherTag = this.getNodeTag(otherNode);

        // 检查是否是有效目标
        if (this.isValidTarget(otherTag)) {
            this.hitTarget(otherNode);
        }
    }

    /**
     * 获取节点标签
     */
    private getNodeTag(node: Node): string {
        // 优先使用ActorController的标签
        const actorController = node.getComponent('ActorController');
        if (actorController && actorController['actorTag']) {
            return actorController['actorTag'];
        }
        
        // 其次使用节点名称
        return node.name;
    }

    /**
     * 检查是否是有效攻击目标
     */
    private isValidTarget(targetTag: string): boolean {
        // 不能攻击自己的标签
        if (targetTag === this.ownerTag) {
            return false;
        }

        // 检查是否在目标标签列表中
        return this.targetTags.indexOf(targetTag) !== -1 || this.targetTags.length === 0;
    }

    /**
     * 命中目标
     */
    private hitTarget(target: Node) {
        this._hitTargets.add(target);
        this._hitCount++;
        
        Log.log(this.MODULE_NAME, `子弹命中目标: ${target.name}, 伤害: ${this.damage}, 武器类型: ${WeaponType[this.weaponType]}`);

        // 根据武器类型执行不同的伤害逻辑
        this.applyDamageByWeaponType(target);

        // 触发命中事件
        this.node.emit('bullet-hit', {
            bullet: this.node,
            target: target,
            damage: this.damage,
            weaponType: this.weaponType,
            hitCount: this._hitCount
        });

        // 检查是否应该销毁子弹
        if (this.shouldDestroyAfterHit()) {
            this.destroyBullet();
        } else {
            this._hasHit = true;
        }
    }

    /**
     * 根据武器类型应用伤害
     */
    private applyDamageByWeaponType(target: Node) {
        switch (this.weaponType) {
            case WeaponType.BULLET_TYPE_NORMAL:
                this.applyNormalDamage(target);
                break;
            case WeaponType.BULLET_TYPE_CANNON:
                this.applyCannonDamage(target);
                break;
            case WeaponType.BULLET_TYPE_MULTIPLE:
                this.applyMultipleDamage(target);
                break;
            case WeaponType.BULLET_TYPE_LASER:
                this.applyLaserDamage(target);
                break;
        }
    }

    /**
     * 应用普通伤害
     */
    private applyNormalDamage(target: Node) {
        this.dealDamageToTarget(target, this.damage);
    }

    /**
     * 应用加农炮伤害（包含爆炸伤害）
     */
    private applyCannonDamage(target: Node) {
        // 直接伤害
        this.dealDamageToTarget(target, this.damage);
        
        // 爆炸伤害
        if (this.explosionRadius > 0) {
            this.applyExplosionDamage(target.worldPosition);
        }
    }

    /**
     * 应用多重射击伤害
     */
    private applyMultipleDamage(target: Node) {
        // 多重射击每发伤害稍低
        this.dealDamageToTarget(target, this.damage);
    }

    /**
     * 应用激光伤害
     */
    private applyLaserDamage(target: Node) {
        // 激光具有高穿透性
        this.dealDamageToTarget(target, this.damage);
    }

    /**
     * 对目标造成伤害
     */
    private dealDamageToTarget(target: Node, damage: number) {
        const targetController = target.getComponent('ActorController');
        if (targetController && targetController['takeDamage']) {
            targetController['takeDamage'](damage);
        }
    }

    /**
     * 应用爆炸伤害
     */
    private applyExplosionDamage(explosionCenter: any) {
        // 这里需要实现范围伤害逻辑
        // 可以通过物理查询或距离计算来找到范围内的目标
        Log.log(this.MODULE_NAME, `爆炸伤害 - 半径: ${this.explosionRadius}, 中心: ${explosionCenter}`);
        
        // 触发爆炸效果事件
        this.node.emit('bullet-explosion', {
            center: explosionCenter,
            radius: this.explosionRadius,
            damage: this.damage * 0.7 // 爆炸伤害通常比直接伤害低
        });
    }

    /**
     * 检查命中后是否应该销毁子弹
     */
    private shouldDestroyAfterHit(): boolean {
        // 激光和有穿透力的子弹可能不会立即销毁
        if (this.isLaser && this.penetration > 0) {
            return this._hitCount >= this.penetration;
        }
        
        // 普通子弹命中后销毁
        if (this.penetration <= 0) {
            return true;
        }
        
        // 有穿透力的子弹达到穿透上限后销毁
        return this._hitCount >= this.penetration;
    }

    /**
     * 销毁子弹
     */
    private destroyBullet() {
        // 根据武器类型播放不同的销毁效果
        this.playDestroyEffect();
        
        this.node.emit('bullet-destroy', {
            bullet: this.node,
            weaponType: this.weaponType,
            hitCount: this._hitCount
        });
        
        // 回收到对象池（通过设置为非激活状态）
        this.node.active = false;
    }

    /**
     * 播放销毁效果
     */
    private playDestroyEffect() {
        switch (this.weaponType) {
            case WeaponType.BULLET_TYPE_CANNON:
                // 播放爆炸效果
                Log.debug(this.MODULE_NAME, '播放爆炸效果');
                break;
            case WeaponType.BULLET_TYPE_LASER:
                // 播放激光消散效果
                Log.debug(this.MODULE_NAME, '播放激光消散效果');
                break;
            default:
                // 播放普通消失效果
                Log.debug(this.MODULE_NAME, '播放普通消失效果');
                break;
        }
    }

    /**
     * 设置子弹属性（由WeaponsSystem调用）
     */
    public async setBulletData(damage: number, speed: number, lifetime: number, ownerTag: string, weaponType: WeaponType = WeaponType.BULLET_TYPE_NORMAL) {
        this.damage = damage;
        this.speed = speed;
        this.lifetime = lifetime;
        this.ownerTag = ownerTag;
        
        // 设置武器类型并更新贴图
        await this.setWeaponType(weaponType);
    }

    /**
     * 获取子弹信息
     */
    public getBulletInfo() {
        return {
            damage: this.damage,
            speed: this.speed,
            lifetime: this.lifetime,
            ownerTag: this.ownerTag,
            weaponType: WeaponType[this.weaponType],
            hasHit: this._hasHit,
            hitCount: this._hitCount,
            penetration: this.penetration,
            explosionRadius: this.explosionRadius,
            isLaser: this.isLaser,
            aliveTime: (Date.now() / 1000) - this._startTime,
            spriteName: this.getBulletSpriteName(),
            resourceBundle: this.resourceBundle,
            hasSpriteComponent: this._spriteComponent !== null,
            bulletSpriteNode: this.bulletSprite ? this.bulletSprite.name : null
        };
    }
}