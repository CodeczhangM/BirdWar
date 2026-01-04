import { _decorator, Component, Node, Vec3, director, Sprite, SpriteFrame, assetManager } from 'cc';
import { WeaponsSystem } from './WeaponsSystem';
import { WeaponType } from './WeaponType';
import { Log } from '../Logger';
import { ResourceLoaderInstance } from '../ResourceLoader';
const { ccclass, property } = _decorator;

/**
 * 小鸡角色类型枚举
 */
export enum Chick_Actors {
    Actor_type_Chick = "Chick",
    Actor_type_Cluck = "Cluck",
    Actor_type_Bibi = "Bibi",
    Actor_type_Pip = "Pip",
    Actor_type_Kip = "Kip",
    Actor_type_Coco = "Coco",
    Actor_type_Zig = "Zig",
    Actor_type_Muff = "Muff",
    Actor_type_Tiny = "Tiny",
    Actor_type_Nugget = "Nugget"
}

/**
 * 小鸡武器类型枚举
 */
export enum Chick_Guns {
    Actor_type_Blitz = "Blitz",
    Actor_type_Rip = "Rip",
    Actor_type_Hawk = "Hawk",
    Actor_type_Vex = "Vex",
    Actor_type_Jaw = "Jaw",
    Actor_type_Flick = "Flick",
    Actor_type_Kron = "Kron",
    Actor_type_Pulse = "Pulse",
    Actor_type_Rook = "Rook",
    Actor_type_Zap = "Zap"
}

/**
 * 角色控制器
 * 负责管理角色的基本功能，包括子节点初始化、攻击系统等
 */
@ccclass('ActorController')
export class ActorController extends Component {
    
    // ========== 子节点引用 ==========
    @property({ type: Node, tooltip: '鸟类玩家节点' })
    public birdPlayer: Node = null;

    @property({ type: Node, tooltip: '鸟类武器节点' })
    public birdGun: Node = null;

    @property({ type: Node, tooltip: '枪口发射点' })
    public gunTrickPoint: Node = null;

    // ========== 武器系统 ==========
    @property({ type: WeaponsSystem, tooltip: '武器系统组件' })
    public weaponsSystem: WeaponsSystem = null;

    // ========== 角色类型配置 ==========
    @property({ type: String, tooltip: '鸟类角色类型' })
    public birdType: string = Chick_Actors.Actor_type_Chick;

    @property({ type: String, tooltip: '武器类型' })
    public gunType: string = Chick_Guns.Actor_type_Blitz;

    @property({ type: String, tooltip: '资源Bundle名称' })
    public resourceBundle: string = 'resources';

    // ========== 扩展属性 ==========
    @property({ type: Number, tooltip: '攻击范围', range: [50, 1000, 10] })
    public attackRange: number = 300;

    @property({ type: Boolean, tooltip: '是否自动攻击' })
    public autoAttack: boolean = true;

    @property({ type: String, tooltip: '角色标签' })
    public actorTag: string = 'Player';

    @property({ type: Number, tooltip: '最大生命值', range: [1, 1000, 1] })
    public maxHealth: number = 100;

    // ========== 私有变量 ==========
    private _currentHealth: number = 100;
    private _lastAttackTime: number = 0;
    private _isAttacking: boolean = false;
    private _birdSprite: Sprite = null;
    private _gunSprite: Sprite = null;
    private readonly MODULE_NAME = 'ActorController';

    // ========== 生命周期 ==========
    start() {
        this.initializeActor();
    }

    update(deltaTime: number) {
        if (this.autoAttack) {
            this.updateAutoAttack(deltaTime);
        }
    }

    // ========== 初始化方法 ==========
    /**
     * 初始化角色
     */
    private initializeActor() {
        Log.log(this.MODULE_NAME, `初始化角色控制器: ${this.node.name}`);
        
        // 初始化子节点
        this.initializeChildNodes();
        
        // 初始化属性
        this.initializeProperties();
        
        Log.log(this.MODULE_NAME, '角色初始化完成');
    }

    /**
     * 初始化子节点
     */
    private initializeChildNodes() {
        // 自动查找子节点（如果没有手动指定）
        if (!this.birdPlayer) {
            this.birdPlayer = this.node.getChildByName('BirdPlayer');
            if (!this.birdPlayer) {
                Log.warn(this.MODULE_NAME, 'BirdPlayer节点未找到');
            }
        }

        if (!this.birdGun) {
            this.birdGun = this.node.getChildByName('BirdGun');
            if (!this.birdGun) {
                Log.warn(this.MODULE_NAME, 'BirdGun节点未找到');
            }
        }

        if (!this.gunTrickPoint) {
            // 先在BirdGun下查找
            if (this.birdGun) {
                this.gunTrickPoint = this.birdGun.getChildByName('GunTrickPoint');
            }
            // 如果没找到，在根节点下查找
            if (!this.gunTrickPoint) {
                this.gunTrickPoint = this.node.getChildByName('GunTrickPoint');
            }
            if (!this.gunTrickPoint) {
                Log.warn(this.MODULE_NAME, 'GunTrickPoint节点未找到');
            }
        }

        // 初始化武器系统
        this.initializeWeaponsSystem();

        // 加载角色资源
        this.loadActorResources();

        // 验证关键节点
        this.validateNodes();
    }

    /**
     * 初始化武器系统
     */
    private initializeWeaponsSystem() {
        // 自动查找WeaponsSystem组件
        if (!this.weaponsSystem) {
            this.weaponsSystem = this.node.getComponent(WeaponsSystem);
            if (!this.weaponsSystem && this.birdGun) {
                this.weaponsSystem = this.birdGun.getComponent(WeaponsSystem);
            }
        }

        // 如果找到了武器系统，进行配置
        if (this.weaponsSystem) {
            // 设置发射点
            if (this.gunTrickPoint) {
                this.weaponsSystem.firePoint = this.gunTrickPoint;
            }
            
            // 设置拥有者标签
            this.weaponsSystem.setOwnerTag(this.actorTag);
            
            // 同步自动攻击设置
            this.weaponsSystem.autoFire = this.autoAttack;
            
            Log.log(this.MODULE_NAME, '武器系统初始化完成');
        } else {
            Log.warn(this.MODULE_NAME, 'WeaponsSystem组件未找到，将使用传统攻击系统');
        }
    }

    /**
     * 加载角色资源（使用ResourceLoader）
     */
    private async loadActorResources() {
        Log.log(this.MODULE_NAME, `开始加载角色资源 - 鸟类: ${this.birdType}, 武器: ${this.gunType}`);
        
        try {
            // 并行加载鸟类和武器资源
            await Promise.all([
                this.loadBirdSprite(),
                this.loadGunSprite()
            ]);
            
            Log.log(this.MODULE_NAME, '角色资源加载完成');
        } catch (error) {
            Log.error(this.MODULE_NAME, '角色资源加载失败:', error);
        }
    }

    /**
     * 加载鸟类精灵
     */
    private async loadBirdSprite(): Promise<void> {
        if (!this.birdPlayer) {
            Log.warn(this.MODULE_NAME, 'BirdPlayer节点未找到，跳过鸟类资源加载');
            return;
        }

        // 获取或添加Sprite组件
        this._birdSprite = this.birdPlayer.getComponent(Sprite);
        if (!this._birdSprite) {
            this._birdSprite = this.birdPlayer.addComponent(Sprite);
        }

        // 使用ResourceLoader智能搜索并加载
        const spriteFrame = await ResourceLoaderInstance.loadSpriteFrame(this.resourceBundle, this.birdType);
        if (spriteFrame) {
            this._birdSprite.spriteFrame = spriteFrame;
            Log.log(this.MODULE_NAME, `鸟类精灵加载成功: ${this.birdType}`);
        } else {
            Log.warn(this.MODULE_NAME, `鸟类精灵加载失败: ${this.birdType}`);
        }
    }

    /**
     * 加载武器精灵
     */
    private async loadGunSprite(): Promise<void> {
        if (!this.birdGun) {
            Log.warn(this.MODULE_NAME, 'BirdGun节点未找到，跳过武器资源加载');
            return;
        }

        // 获取或添加Sprite组件
        this._gunSprite = this.birdGun.getComponent(Sprite);
        if (!this._gunSprite) {
            this._gunSprite = this.birdGun.addComponent(Sprite);
        }

        // 使用ResourceLoader智能搜索并加载
        const spriteFrame = await ResourceLoaderInstance.loadSpriteFrame(this.resourceBundle, this.gunType);
        if (spriteFrame) {
            this._gunSprite.spriteFrame = spriteFrame;
            Log.log(this.MODULE_NAME, `武器精灵加载成功: ${this.gunType}`);
        } else {
            Log.warn(this.MODULE_NAME, `武器精灵加载失败: ${this.gunType}`);
        }
    }

    /**
     * 验证节点完整性
     */
    private validateNodes() {
        const missingNodes: string[] = [];
        
        if (!this.birdPlayer) missingNodes.push('BirdPlayer');
        if (!this.birdGun) missingNodes.push('BirdGun');
        if (!this.gunTrickPoint) missingNodes.push('GunTrickPoint');
        if (!this.weaponsSystem) missingNodes.push('WeaponsSystem');
        
        if (missingNodes.length > 0) {
            Log.error(this.MODULE_NAME, `缺少关键组件: ${missingNodes.join(', ')}`);
        }
    }

    /**
     * 初始化属性
     */
    private initializeProperties() {
        this._currentHealth = this.maxHealth;
        this._lastAttackTime = 0;
        this._isAttacking = false;
        
        // 验证武器系统
        if (!this.weaponsSystem) {
            Log.warn(this.MODULE_NAME, 'WeaponsSystem未设置，部分功能将不可用');
        }
    }

    // ========== 攻击系统 ==========
    /**
     * 更新自动攻击
     */
    private updateAutoAttack(deltaTime: number) {
        if (!this.weaponsSystem) {
            Log.warn(this.MODULE_NAME, 'WeaponsSystem未设置，无法执行自动攻击');
            return;
        }

        // 武器系统有自己的自动射击逻辑，这里只需要确保同步状态
        if (this.weaponsSystem.autoFire !== this.autoAttack) {
            this.weaponsSystem.autoFire = this.autoAttack;
        }
    }

    /**
     * 执行攻击
     */
    public performAttack(targetPosition?: Vec3): boolean {
        // 完全使用武器系统
        if (this.weaponsSystem) {
            const success = this.weaponsSystem.fire(targetPosition);
            if (success) {
                this._lastAttackTime = director.getTotalTime() / 1000;
            }
            return success;
        }
        
        Log.warn(this.MODULE_NAME, 'WeaponsSystem未设置，无法执行攻击');
        return false;
    }

    // ========== 公共接口 ==========
    /**
     * 设置攻击目标位置
     */
    public attackTarget(targetPosition: Vec3): boolean {
        return this.performAttack(targetPosition);
    }

    /**
     * 切换武器类型
     */
    public switchWeapon(weaponType: WeaponType): boolean {
        if (this.weaponsSystem) {
            return this.weaponsSystem.switchWeapon(weaponType);
        }
        
        Log.warn(this.MODULE_NAME, '武器系统未初始化，无法切换武器');
        return false;
    }

    /**
     * 获取当前武器类型
     */
    public getCurrentWeaponType(): WeaponType {
        if (this.weaponsSystem) {
            return this.weaponsSystem.currentWeaponType;
        }
        
        return WeaponType.BULLET_TYPE_NORMAL;
    }

    /**
     * 获取武器系统信息
     */
    public getWeaponSystemInfo() {
        if (this.weaponsSystem) {
            return this.weaponsSystem.getWeaponSystemInfo();
        }
        
        return null;
    }

    /**
     * 切换鸟类类型
     */
    public async changeBirdType(newBirdType: string): Promise<boolean> {
        // 验证类型是否有效
        if (!this.isValidBirdType(newBirdType)) {
            Log.warn(this.MODULE_NAME, `无效的鸟类类型: ${newBirdType}`);
            return false;
        }

        const oldType = this.birdType;
        this.birdType = newBirdType;
        
        try {
            await this.loadBirdSprite();
            Log.log(this.MODULE_NAME, `鸟类类型切换成功: ${oldType} -> ${newBirdType}`);
            
            // 触发类型切换事件
            this.node.emit('bird-type-changed', {
                oldType: oldType,
                newType: newBirdType
            });
            
            return true;
        } catch (error) {
            // 切换失败，恢复原类型
            this.birdType = oldType;
            Log.error(this.MODULE_NAME, `鸟类类型切换失败: ${error}`);
            return false;
        }
    }

    /**
     * 切换武器类型
     */
    public async changeGunType(newGunType: string): Promise<boolean> {
        // 验证类型是否有效
        if (!this.isValidGunType(newGunType)) {
            Log.warn(this.MODULE_NAME, `无效的武器类型: ${newGunType}`);
            return false;
        }

        const oldType = this.gunType;
        this.gunType = newGunType;
        
        try {
            await this.loadGunSprite();
            Log.log(this.MODULE_NAME, `武器类型切换成功: ${oldType} -> ${newGunType}`);
            
            // 触发类型切换事件
            this.node.emit('gun-type-changed', {
                oldType: oldType,
                newType: newGunType
            });
            
            return true;
        } catch (error) {
            // 切换失败，恢复原类型
            this.gunType = oldType;
            Log.error(this.MODULE_NAME, `武器类型切换失败: ${error}`);
            return false;
        }
    }

    /**
     * 验证鸟类类型是否有效
     */
    private isValidBirdType(birdType: string): boolean {
        const validTypes = [
            Chick_Actors.Actor_type_Chick,
            Chick_Actors.Actor_type_Cluck,
            Chick_Actors.Actor_type_Bibi,
            Chick_Actors.Actor_type_Pip,
            Chick_Actors.Actor_type_Kip,
            Chick_Actors.Actor_type_Coco,
            Chick_Actors.Actor_type_Zig,
            Chick_Actors.Actor_type_Muff,
            Chick_Actors.Actor_type_Tiny,
            Chick_Actors.Actor_type_Nugget
        ];
        return validTypes.indexOf(birdType as any) !== -1;
    }

    /**
     * 验证武器类型是否有效
     */
    private isValidGunType(gunType: string): boolean {
        const validTypes = [
            Chick_Guns.Actor_type_Blitz,
            Chick_Guns.Actor_type_Rip,
            Chick_Guns.Actor_type_Hawk,
            Chick_Guns.Actor_type_Vex,
            Chick_Guns.Actor_type_Jaw,
            Chick_Guns.Actor_type_Flick,
            Chick_Guns.Actor_type_Kron,
            Chick_Guns.Actor_type_Pulse,
            Chick_Guns.Actor_type_Rook,
            Chick_Guns.Actor_type_Zap
        ];
        return validTypes.indexOf(gunType as any) !== -1;
    }

    /**
     * 获取所有可用的鸟类类型
     */
    public getAvailableBirdTypes(): string[] {
        return [
            Chick_Actors.Actor_type_Chick,
            Chick_Actors.Actor_type_Cluck,
            Chick_Actors.Actor_type_Bibi,
            Chick_Actors.Actor_type_Pip,
            Chick_Actors.Actor_type_Kip,
            Chick_Actors.Actor_type_Coco,
            Chick_Actors.Actor_type_Zig,
            Chick_Actors.Actor_type_Muff,
            Chick_Actors.Actor_type_Tiny,
            Chick_Actors.Actor_type_Nugget
        ];
    }

    /**
     * 获取所有可用的武器类型
     */
    public getAvailableGunTypes(): string[] {
        return [
            Chick_Guns.Actor_type_Blitz,
            Chick_Guns.Actor_type_Rip,
            Chick_Guns.Actor_type_Hawk,
            Chick_Guns.Actor_type_Vex,
            Chick_Guns.Actor_type_Jaw,
            Chick_Guns.Actor_type_Flick,
            Chick_Guns.Actor_type_Kron,
            Chick_Guns.Actor_type_Pulse,
            Chick_Guns.Actor_type_Rook,
            Chick_Guns.Actor_type_Zap
        ];
    }

    /**
     * 预加载所有角色资源（使用ResourceLoader）
     */
    public async preloadAllActorResources(): Promise<void> {
        Log.log(this.MODULE_NAME, '使用ResourceLoader预加载所有角色资源');
        
        try {
            const allBirdTypes = this.getAvailableBirdTypes();
            const allGunTypes = this.getAvailableGunTypes();
            
            // 批量加载所有鸟类资源
            const birdSprites = await ResourceLoaderInstance.loadSpriteFrames(this.resourceBundle, allBirdTypes);
            
            // 批量加载所有武器资源
            const gunSprites = await ResourceLoaderInstance.loadSpriteFrames(this.resourceBundle, allGunTypes);
            
            let birdSuccessCount = 0;
            let gunSuccessCount = 0;
            
            birdSprites.forEach((sprite, name) => {
                if (sprite) birdSuccessCount++;
            });
            
            gunSprites.forEach((sprite, name) => {
                if (sprite) gunSuccessCount++;
            });
            
            Log.log(this.MODULE_NAME, `预加载完成: 鸟类 ${birdSuccessCount}/${allBirdTypes.length}, 武器 ${gunSuccessCount}/${allGunTypes.length}`);
        } catch (error) {
            Log.error(this.MODULE_NAME, '预加载失败:', error);
        }
    }

    /**
     * 调试资源信息（使用ResourceLoader）
     */
    public debugResourcesWithLoader(): void {
        Log.log(this.MODULE_NAME, '=== 使用ResourceLoader调试资源信息 ===');
        
        // 打印Bundle详细信息
        ResourceLoaderInstance.debugPrintBundleInfo(this.resourceBundle);
        
        // 智能搜索当前角色资源
        const birdResults = ResourceLoaderInstance.smartSearchSprite(this.resourceBundle, this.birdType);
        const gunResults = ResourceLoaderInstance.smartSearchSprite(this.resourceBundle, this.gunType);
        
        Log.log(this.MODULE_NAME, `当前鸟类 "${this.birdType}" 搜索结果: ${birdResults.length} 个`);
        birdResults.forEach((result, index) => {
            Log.log(this.MODULE_NAME, `  ${index + 1}. ${result.name} -> ${result.fullPath}`);
        });
        
        Log.log(this.MODULE_NAME, `当前武器 "${this.gunType}" 搜索结果: ${gunResults.length} 个`);
        gunResults.forEach((result, index) => {
            Log.log(this.MODULE_NAME, `  ${index + 1}. ${result.name} -> ${result.fullPath}`);
        });
    }

    /**
     * 重新加载所有资源
     */
    public async reloadResources(): Promise<void> {
        Log.log(this.MODULE_NAME, '重新加载角色资源');
        await this.loadActorResources();
    }

    /**
     * 获取当前生命值
     */
    public getCurrentHealth(): number {
        return this._currentHealth;
    }

    /**
     * 设置生命值
     */
    public setHealth(health: number) {
        this._currentHealth = Math.max(0, Math.min(health, this.maxHealth));
        if (this._currentHealth <= 0) {
            this.onDeath();
        }
    }

    /**
     * 受到伤害
     */
    public takeDamage(damage: number) {
        this.setHealth(this._currentHealth - damage);
        Log.log(this.MODULE_NAME, `受到伤害: ${damage}, 剩余生命: ${this._currentHealth}`);
    }

    /**
     * 死亡处理
     */
    private onDeath() {
        Log.log(this.MODULE_NAME, `角色死亡: ${this.node.name}`);
        this.autoAttack = false;
        // 这里可以添加死亡动画、特效等
        this.node.emit('actor-death', this);
    }

    /**
     * 获取角色状态信息
     */
    public getActorInfo() {
        const weaponInfo = this.getWeaponSystemInfo();
        
        return {
            name: this.node.name,
            tag: this.actorTag,
            birdType: this.birdType,
            gunType: this.gunType,
            health: this._currentHealth,
            maxHealth: this.maxHealth,
            attackRange: this.attackRange,
            isAlive: this._currentHealth > 0,
            activeBullets: weaponInfo ? weaponInfo.activeBullets : 0,
            weaponSystem: weaponInfo,
            hasWeaponSystem: this.weaponsSystem !== null,
            availableTypes: {
                birds: this.getAvailableBirdTypes(),
                guns: this.getAvailableGunTypes()
            }
        };
    }
}