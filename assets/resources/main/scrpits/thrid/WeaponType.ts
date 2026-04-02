/**
 * 武器类型枚举
 * 定义游戏中可用的武器类型
 */
export enum WeaponType {
    BULLET_TYPE_NORMAL = 0,    // 普通子弹
    BULLET_TYPE_CANNON = 1,    // 加农炮
    BULLET_TYPE_MULTIPLE = 2,  // 多重射击
    BULLET_TYPE_LASER = 3      // 激光
}

/**
 * 武器配置接口
 * 定义每种武器的基本属性
 */
export interface WeaponConfig {
    type: WeaponType;
    name: string;
    damage: number;
    fireRate: number;          // 射击速度 (每秒发射次数)
    bulletSpeed: number;       // 子弹速度
    bulletLifetime: number;    // 子弹生存时间
    range: number;             // 射程
    bulletCount: number;       // 每次发射的子弹数量
    spreadAngle: number;       // 散射角度 (度)
    penetration: number;       // 穿透力
    explosionRadius: number;   // 爆炸半径
    energyCost: number;        // 能量消耗
    cooldown: number;          // 冷却时间
}

/**
 * 默认武器配置
 */
export const DEFAULT_WEAPON_CONFIGS: { [key in WeaponType]: WeaponConfig } = {
    [WeaponType.BULLET_TYPE_NORMAL]: {
        type: WeaponType.BULLET_TYPE_NORMAL,
        name: "普通子弹",
        damage: 10,
        fireRate: 2.0,
        bulletSpeed: 500,
        bulletLifetime: 3.0,
        range: 400,
        bulletCount: 1,
        spreadAngle: 0,
        penetration: 0,
        explosionRadius: 0,
        energyCost: 1,
        cooldown: 0
    },
    [WeaponType.BULLET_TYPE_CANNON]: {
        type: WeaponType.BULLET_TYPE_CANNON,
        name: "加农炮",
        damage: 50,
        fireRate: 0.5,
        bulletSpeed: 300,
        bulletLifetime: 4.0,
        range: 600,
        bulletCount: 1,
        spreadAngle: 0,
        penetration: 2,
        explosionRadius: 80,
        energyCost: 5,
        cooldown: 1.0
    },
    [WeaponType.BULLET_TYPE_MULTIPLE]: {
        type: WeaponType.BULLET_TYPE_MULTIPLE,
        name: "多重射击",
        damage: 8,
        fireRate: 3.0,
        bulletSpeed: 450,
        bulletLifetime: 2.5,
        range: 350,
        bulletCount: 3,
        spreadAngle: 30,
        penetration: 0,
        explosionRadius: 0,
        energyCost: 3,
        cooldown: 0.2
    },
    [WeaponType.BULLET_TYPE_LASER]: {
        type: WeaponType.BULLET_TYPE_LASER,
        name: "激光",
        damage: 25,
        fireRate: 5.0,
        bulletSpeed: 1000,
        bulletLifetime: 1.5,
        range: 800,
        bulletCount: 1,
        spreadAngle: 0,
        penetration: 5,
        explosionRadius: 0,
        energyCost: 2,
        cooldown: 0
    }
};
