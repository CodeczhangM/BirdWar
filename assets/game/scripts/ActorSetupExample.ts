import { _decorator, Component, Node, Prefab } from 'cc';
import { ActorController } from './ActorController';
import { WeaponsSystem } from './WeaponsSystem';
import { WeaponType } from './WeaponType';
import { Log } from '../Logger';
const { ccclass, property } = _decorator;

/**
 * 角色设置示例
 * 展示如何正确配置ActorController和WeaponsSystem
 */
@ccclass('ActorSetupExample')
export class ActorSetupExample extends Component {
    
    @property({ type: [Prefab], tooltip: '子弹预制件数组 [普通, 加农炮, 多重, 激光]' })
    public bulletPrefabs: Prefab[] = [];

    @property({ type: String, tooltip: '角色标签' })
    public actorTag: string = 'Player';

    @property({ type: WeaponType, tooltip: '初始武器类型' })
    public initialWeaponType: WeaponType = WeaponType.BULLET_TYPE_NORMAL;

    private _actorController: ActorController = null;
    private _weaponsSystem: WeaponsSystem = null;
    private readonly MODULE_NAME = 'ActorSetupExample';

    start() {
        this.setupActor();
    }

    /**
     * 设置角色
     */
    private setupActor() {
        Log.log(this.MODULE_NAME, '开始设置角色');

        // 获取或创建ActorController
        this._actorController = this.node.getComponent(ActorController);
        if (!this._actorController) {
            this._actorController = this.node.addComponent(ActorController);
        }

        // 设置角色基本属性
        this.setupActorProperties();

        // 设置武器系统
        this.setupWeaponsSystem();

        // 验证设置
        this.validateSetup();

        Log.log(this.MODULE_NAME, '角色设置完成');
    }

    /**
     * 设置角色属性
     */
    private setupActorProperties() {
        this._actorController.actorTag = this.actorTag;
        this._actorController.maxHealth = 100;
        this._actorController.autoAttack = true;
        this._actorController.attackRange = 400;

        Log.log(this.MODULE_NAME, `角色属性设置完成 - 标签: ${this.actorTag}`);
    }

    /**
     * 设置武器系统
     */
    private setupWeaponsSystem() {
        // 查找BirdGun节点
        const birdGun = this.node.getChildByName('BirdGun');
        if (!birdGun) {
            Log.error(this.MODULE_NAME, 'BirdGun节点未找到');
            return;
        }

        // 获取或创建WeaponsSystem
        this._weaponsSystem = birdGun.getComponent(WeaponsSystem);
        if (!this._weaponsSystem) {
            this._weaponsSystem = birdGun.addComponent(WeaponsSystem);
        }

        // 配置武器系统
        this._weaponsSystem.currentWeaponType = this.initialWeaponType;
        this._weaponsSystem.bulletPrefabs = this.bulletPrefabs;
        this._weaponsSystem.autoFire = true;
        this._weaponsSystem.currentEnergy = 100;
        this._weaponsSystem.maxEnergy = 100;
        this._weaponsSystem.energyRegenRate = 5;

        // 查找并设置发射点
        const gunTrickPoint = birdGun.getChildByName('GunTrickPoint');
        if (gunTrickPoint) {
            this._weaponsSystem.firePoint = gunTrickPoint;
        }

        Log.log(this.MODULE_NAME, `武器系统设置完成 - 初始武器: ${WeaponType[this.initialWeaponType]}`);
    }

    /**
     * 验证设置
     */
    private validateSetup() {
        const issues: string[] = [];

        // 检查ActorController
        if (!this._actorController) {
            issues.push('ActorController未找到');
        }

        // 检查WeaponsSystem
        if (!this._weaponsSystem) {
            issues.push('WeaponsSystem未找到');
        }

        // 检查子弹预制件
        if (this.bulletPrefabs.length === 0) {
            issues.push('子弹预制件未设置');
        }

        // 检查节点结构
        const requiredNodes = ['BirdPlayer', 'BirdGun', 'BirdGun/GunTrickPoint'];
        for (const nodePath of requiredNodes) {
            const parts = nodePath.split('/');
            let currentNode = this.node;
            for (const part of parts) {
                currentNode = currentNode.getChildByName(part);
                if (!currentNode) {
                    issues.push(`节点 ${nodePath} 未找到`);
                    break;
                }
            }
        }

        if (issues.length > 0) {
            Log.error(this.MODULE_NAME, `设置验证失败: ${issues.join(', ')}`);
        } else {
            Log.log(this.MODULE_NAME, '设置验证通过');
        }
    }

    /**
     * 测试攻击功能
     */
    public testAttack() {
        if (!this._actorController) {
            Log.warn(this.MODULE_NAME, 'ActorController未初始化');
            return;
        }

        const success = this._actorController.performAttack();
        Log.log(this.MODULE_NAME, `测试攻击 - ${success ? '成功' : '失败'}`);
    }

    /**
     * 测试武器切换
     */
    public testWeaponSwitch() {
        if (!this._actorController) {
            Log.warn(this.MODULE_NAME, 'ActorController未初始化');
            return;
        }

        const weapons = [
            WeaponType.BULLET_TYPE_NORMAL,
            WeaponType.BULLET_TYPE_CANNON,
            WeaponType.BULLET_TYPE_MULTIPLE,
            WeaponType.BULLET_TYPE_LASER
        ];

        const currentIndex = weapons.indexOf(this._weaponsSystem.currentWeaponType);
        const nextIndex = (currentIndex + 1) % weapons.length;
        const nextWeapon = weapons[nextIndex];

        const success = this._actorController.switchWeapon(nextWeapon);
        Log.log(this.MODULE_NAME, `武器切换 - ${success ? '成功' : '失败'} - 新武器: ${WeaponType[nextWeapon]}`);
    }

    /**
     * 获取状态信息
     */
    public getStatusInfo() {
        if (!this._actorController) {
            Log.warn(this.MODULE_NAME, 'ActorController未初始化');
            return;
        }

        const info = this._actorController.getActorInfo();
        Log.log(this.MODULE_NAME, '角色状态信息:', info);
        return info;
    }

    /**
     * 设置自动攻击
     */
    public setAutoAttack(enabled: boolean) {
        if (this._actorController) {
            this._actorController.autoAttack = enabled;
        }
        if (this._weaponsSystem) {
            this._weaponsSystem.autoFire = enabled;
        }
        Log.log(this.MODULE_NAME, `自动攻击设置为: ${enabled}`);
    }
}