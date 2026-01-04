import { _decorator, Component, Node, Prefab, instantiate, Vec3, director } from 'cc';
import { WeaponType, WeaponConfig, DEFAULT_WEAPON_CONFIGS } from './WeaponType';
import { Bullet } from './Bullet';
import { Log } from '../Logger';
const { ccclass, property } = _decorator;

/**
 * 武器系统
 * 管理不同类型的武器，处理射击逻辑，与Bullet系统整合
 */
@ccclass('WeaponsSystem')
export class WeaponsSystem extends Component {
    
    // ========== 武器配置 ==========
    @property({ type: WeaponType, tooltip: '当前武器类型' })
    public currentWeaponType: WeaponType = WeaponType.BULLET_TYPE_NORMAL;

    @property({ type: [Prefab], tooltip: '不同武器类型的子弹预制件' })
    public bulletPrefabs: Prefab[] = [];

    @property({ type: Node, tooltip: '发射点节点' })
    public firePoint: Node = null;

    @property({ type: Boolean, tooltip: '是否启用自动射击' })
    public autoFire: boolean = false;

    @property({ type: Number, tooltip: '当前能量值', range: [0, 1000, 1] })
    public currentEnergy: number = 100;

    @property({ type: Number, tooltip: '最大能量值', range: [1, 1000, 1] })
    public maxEnergy: number = 100;

    @property({ type: Number, tooltip: '能量恢复速度 (每秒)', range: [0, 50, 1] })
    public energyRegenRate: number = 5;

    // ========== 私有变量 ==========
    private _weaponConfigs: Map<WeaponType, WeaponConfig> = new Map();
    private _bulletPools: Map<WeaponType, Node[]> = new Map();
    private _activeBullets: Set<Node> = new Set();
    private _lastFireTime: number = 0;
    private _cooldownEndTime: number = 0;
    private _ownerTag: string = 'Player';
    private readonly MODULE_NAME = 'WeaponsSystem';

    // ========== 生命周期 ==========
    start() {
        this.initializeWeaponSystem();
    }

    update(deltaTime: number) {
        this.updateEnergyRegen(deltaTime);
        this.updateBullets(deltaTime);
        
        if (this.autoFire && this.canFire()) {
            this.fire();
        }
    }

    // ========== 初始化 ==========
    /**
     * 初始化武器系统
     */
    private initializeWeaponSystem() {
        Log.log(this.MODULE_NAME, '初始化武器系统');
        
        // 加载武器配置
        this.loadWeaponConfigs();
        
        // 初始化子弹池
        this.initializeBulletPools();
        
        // 验证配置
        this.validateConfiguration();
        
        Log.log(this.MODULE_NAME, `武器系统初始化完成，当前武器: ${this.getCurrentWeaponConfig().name}`);
    }

    /**
     * 加载武器配置
     */
    private loadWeaponConfigs() {
        // 加载默认配置
        for (const type in DEFAULT_WEAPON_CONFIGS) {
            if (DEFAULT_WEAPON_CONFIGS.hasOwnProperty(type)) {
                const weaponType = parseInt(type) as WeaponType;
                const config = DEFAULT_WEAPON_CONFIGS[weaponType];
                this._weaponConfigs.set(weaponType, { ...config });
            }
        }
    }

    /**
     * 初始化子弹池
     */
    private initializeBulletPools() {
        const poolSize = 30; // 每种武器预创建30个子弹
        
        for (let i = 0; i < this.bulletPrefabs.length; i++) {
            const weaponType = i as WeaponType;
            const prefab = this.bulletPrefabs[i];
            
            if (prefab) {
                const pool: Node[] = [];
                for (let j = 0; j < poolSize; j++) {
                    const bullet = instantiate(prefab);
                    bullet.active = false;
                    pool.push(bullet);
                    this.firePoint.addChild(bullet);
                }
                this._bulletPools.set(weaponType, pool);
                Log.log(this.MODULE_NAME, `武器 ${WeaponType[weaponType]} 子弹池初始化完成`);
            }
        }
    }

    /**
     * 验证配置
     */
    private validateConfiguration() {
        if (!this.firePoint) {
            Log.warn(this.MODULE_NAME, '发射点未设置');
        }
        
        if (this.bulletPrefabs.length === 0) {
            Log.warn(this.MODULE_NAME, '未设置子弹预制件');
        }
        
        // 检查当前武器类型是否有对应的预制件
        if (!this.bulletPrefabs[this.currentWeaponType]) {
            Log.warn(this.MODULE_NAME, `当前武器类型 ${WeaponType[this.currentWeaponType]} 没有对应的子弹预制件`);
        }
    }

    // ========== 射击系统 ==========
    /**
     * 开火
     */
    public fire(targetPosition?: Vec3): boolean {
        if (!this.canFire()) {
            return false;
        }

        const weaponConfig = this.getCurrentWeaponConfig();
        const currentTime = director.getTotalTime() / 1000;

        // 消耗能量
        this.currentEnergy -= weaponConfig.energyCost;
        
        // 设置冷却时间
        this._cooldownEndTime = currentTime + weaponConfig.cooldown;
        this._lastFireTime = currentTime;

        // 根据武器类型执行不同的射击逻辑
        this.executeFirePattern(weaponConfig, targetPosition);

        Log.debug(this.MODULE_NAME, `发射 ${weaponConfig.name}, 剩余能量: ${this.currentEnergy}`);
        
        // 触发射击事件
        this.node.emit('weapon-fire', {
            weaponType: this.currentWeaponType,
            weaponConfig: weaponConfig,
            energyRemaining: this.currentEnergy
        });

        return true;
    }

    /**
     * 执行射击模式
     */
    private executeFirePattern(config: WeaponConfig, targetPosition?: Vec3) {
        switch (config.type) {
            case WeaponType.BULLET_TYPE_NORMAL:
                this.fireSingleBullet(config, targetPosition);
                break;
            case WeaponType.BULLET_TYPE_CANNON:
                this.fireCannonBullet(config, targetPosition);
                break;
            case WeaponType.BULLET_TYPE_MULTIPLE:
                this.fireMultipleBullets(config, targetPosition);
                break;
            case WeaponType.BULLET_TYPE_LASER:
                this.fireLaserBullet(config, targetPosition);
                break;
        }
    }

    /**
     * 发射单发子弹
     */
    private fireSingleBullet(config: WeaponConfig, targetPosition?: Vec3) {
        const bullet = this.getBulletFromPool(config.type);
        if (bullet) {
            this.configureBullet(bullet, config, targetPosition);
            this.activateBullet(bullet);
        }
    }

    /**
     * 发射加农炮子弹
     */
    private fireCannonBullet(config: WeaponConfig, targetPosition?: Vec3) {
        const bullet = this.getBulletFromPool(config.type);
        if (bullet) {
            this.configureBullet(bullet, config, targetPosition);
            
            // 加农炮特殊配置
            const bulletComponent = bullet.getComponent(Bullet);
            if (bulletComponent) {
                bulletComponent.explosionRadius = config.explosionRadius;
                bulletComponent.penetration = config.penetration;
            }
            
            this.activateBullet(bullet);
        }
    }

    /**
     * 发射多重子弹
     */
    private fireMultipleBullets(config: WeaponConfig, targetPosition?: Vec3) {
        const bulletCount = config.bulletCount;
        const spreadAngle = config.spreadAngle;
        const angleStep = spreadAngle / (bulletCount - 1);
        const startAngle = -spreadAngle / 2;

        for (let i = 0; i < bulletCount; i++) {
            const bullet = this.getBulletFromPool(config.type);
            if (bullet) {
                const angle = startAngle + (angleStep * i);
                this.configureBullet(bullet, config, targetPosition, angle);
                this.activateBullet(bullet);
            }
        }
    }

    /**
     * 发射激光子弹
     */
    private fireLaserBullet(config: WeaponConfig, targetPosition?: Vec3) {
        const bullet = this.getBulletFromPool(config.type);
        if (bullet) {
            this.configureBullet(bullet, config, targetPosition);
            
            // 激光特殊配置
            const bulletComponent = bullet.getComponent(Bullet);
            if (bulletComponent) {
                bulletComponent.penetration = config.penetration;
                bulletComponent.isLaser = true;
            }
            
            this.activateBullet(bullet);
        }
    }

    /**
     * 配置子弹
     */
    private configureBullet(bullet: Node, config: WeaponConfig, targetPosition?: Vec3, angleOffset: number = 0) {
        // 设置位置
        if (this.firePoint) {
            bullet.setWorldPosition(this.firePoint.worldPosition);
        } else {
            bullet.setWorldPosition(this.node.worldPosition);
        }

        // 计算方向
        let direction = Vec3.UNIT_X; // 默认向右
        if (targetPosition) {
            direction = new Vec3();
            Vec3.subtract(direction, targetPosition, bullet.worldPosition);
            direction.normalize();
        }

        // 应用角度偏移
        if (angleOffset !== 0) {
            const radians = angleOffset * Math.PI / 180;
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);
            const newX = direction.x * cos - direction.y * sin;
            const newY = direction.x * sin + direction.y * cos;
            direction.set(newX, newY, direction.z);
        }

        // 配置子弹组件
        const bulletComponent = bullet.getComponent(Bullet);
        if (bulletComponent) {
            bulletComponent.setBulletData(
                config.damage,
                config.bulletSpeed,
                config.bulletLifetime,
                this._ownerTag,
                config.type
            );
        }

        // 设置移动数据
        bullet['bulletData'] = {
            direction: direction,
            speed: config.bulletSpeed,
            lifetime: config.bulletLifetime,
            startTime: director.getTotalTime() / 1000,
            weaponType: config.type
        };
    }

    /**
     * 激活子弹
     */
    private activateBullet(bullet: Node) {
        bullet.active = true;
        this._activeBullets.add(bullet);
    }

    /**
     * 检查是否可以开火
     */
    private canFire(): boolean {
        const currentTime = director.getTotalTime() / 1000;
        const config = this.getCurrentWeaponConfig();
        
        // 检查冷却时间
        if (currentTime < this._cooldownEndTime) {
            return false;
        }
        
        // 检查射击间隔
        const fireInterval = 1.0 / config.fireRate;
        if (currentTime - this._lastFireTime < fireInterval) {
            return false;
        }
        
        // 检查能量
        if (this.currentEnergy < config.energyCost) {
            return false;
        }
        
        // 检查子弹预制件
        if (!this.bulletPrefabs[this.currentWeaponType]) {
            return false;
        }
        
        return true;
    }

    // ========== 子弹管理 ==========
    /**
     * 从对象池获取子弹
     */
    private getBulletFromPool(weaponType: WeaponType): Node | null {
        const pool = this._bulletPools.get(weaponType);
        if (!pool) return null;

        // 查找未激活的子弹
        for (const bullet of pool) {
            if (!bullet.active) {
                return bullet;
            }
        }

        // 如果池中没有可用子弹，创建新的
        const prefab = this.bulletPrefabs[weaponType];
        if (prefab) {
            const newBullet = instantiate(prefab);
            pool.push(newBullet);
            this.firePoint.addChild(newBullet);
            return newBullet;
        }

        return null;
    }

    /**
     * 更新子弹状态
     */
    private updateBullets(deltaTime: number) {
        const currentTime = director.getTotalTime() / 1000;
        const bulletsToRemove: Node[] = [];

        for (const bullet of this._activeBullets) {
            const bulletData = bullet['bulletData'];
            if (!bulletData) continue;

            // 检查生存时间
            if (currentTime - bulletData.startTime > bulletData.lifetime) {
                bulletsToRemove.push(bullet);
                continue;
            }

            // 更新位置
            const movement = new Vec3();
            Vec3.multiplyScalar(movement, bulletData.direction, bulletData.speed * deltaTime);
            const currentPos = bullet.worldPosition;
            bullet.setWorldPosition(currentPos.add(movement));
        }

        // 回收过期子弹
        for (const bullet of bulletsToRemove) {
            this.recycleBullet(bullet);
        }
    }

    /**
     * 回收子弹
     */
    private recycleBullet(bullet: Node) {
        bullet.active = false;
        bullet['bulletData'] = null;
        this._activeBullets.delete(bullet);
    }

    // ========== 能量系统 ==========
    /**
     * 更新能量恢复
     */
    private updateEnergyRegen(deltaTime: number) {
        if (this.currentEnergy < this.maxEnergy) {
            this.currentEnergy = Math.min(this.maxEnergy, this.currentEnergy + this.energyRegenRate * deltaTime);
        }
    }

    // ========== 公共接口 ==========
    /**
     * 切换武器类型
     */
    public switchWeapon(weaponType: WeaponType): boolean {
        if (weaponType === this.currentWeaponType) {
            return false;
        }

        if (!this.bulletPrefabs[weaponType]) {
            Log.warn(this.MODULE_NAME, `武器类型 ${WeaponType[weaponType]} 没有对应的子弹预制件`);
            return false;
        }

        const oldWeapon = this.currentWeaponType;
        this.currentWeaponType = weaponType;
        
        Log.log(this.MODULE_NAME, `切换武器: ${WeaponType[oldWeapon]} -> ${WeaponType[weaponType]}`);
        
        // 触发武器切换事件
        this.node.emit('weapon-switch', {
            oldWeapon: oldWeapon,
            newWeapon: weaponType,
            weaponConfig: this.getCurrentWeaponConfig()
        });
        
        return true;
    }

    /**
     * 获取当前武器配置
     */
    public getCurrentWeaponConfig(): WeaponConfig {
        return this._weaponConfigs.get(this.currentWeaponType) || DEFAULT_WEAPON_CONFIGS[WeaponType.BULLET_TYPE_NORMAL];
    }

    /**
     * 设置武器配置
     */
    public setWeaponConfig(weaponType: WeaponType, config: Partial<WeaponConfig>) {
        const currentConfig = this._weaponConfigs.get(weaponType);
        if (currentConfig) {
            this._weaponConfigs.set(weaponType, { ...currentConfig, ...config });
        }
    }

    /**
     * 设置拥有者标签
     */
    public setOwnerTag(tag: string) {
        this._ownerTag = tag;
    }

    /**
     * 获取武器系统状态
     */
    public getWeaponSystemInfo() {
        const config = this.getCurrentWeaponConfig();
        return {
            currentWeapon: WeaponType[this.currentWeaponType],
            weaponConfig: config,
            energy: this.currentEnergy,
            maxEnergy: this.maxEnergy,
            canFire: this.canFire(),
            activeBullets: this._activeBullets.size,
            cooldownRemaining: Math.max(0, this._cooldownEndTime - (director.getTotalTime() / 1000))
        };
    }
}


