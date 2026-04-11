import { RoomType } from './ProceduralDungeonGenerator';
import { RoomConfig } from './RoomTypes';

// 门区域高度（像素），门两侧各留此空间保证不被墙遮挡且玩家可通行
const DOOR_CLEAR_HEIGHT = 120;
// 玩家最小可移动净空（像素）
const MIN_MOVE_SPACE = 200;

/** 各房间类型对应的敌人数量 */
const ENEMY_COUNT: Record<RoomType, number> = {
    [RoomType.START]:    0,
    [RoomType.REST]:     0,
    [RoomType.TREASURE]: 0,
    [RoomType.SHOP]:     0,
    [RoomType.COMBAT]:   3,
    [RoomType.ELITE]:    4,
    [RoomType.TRAP]:     1,
    [RoomType.EXIT]:     0,
};

/** 房间类型权重池（START/EXIT 由外部指定，不在此随机） */
const TYPE_POOL: RoomType[] = [
    RoomType.COMBAT, RoomType.COMBAT, RoomType.COMBAT,
    RoomType.ELITE,
    RoomType.TREASURE,
    RoomType.TRAP,
    RoomType.REST,
    RoomType.SHOP,
];

/**
 * RoomGenerator 单例
 * 负责生成合法的房间数据（大小、类型、敌人数量）。
 * 合法性保证：
 *  - 宽度 600~1200，高度 400~800
 *  - 门高度区域（DOOR_CLEAR_HEIGHT）不被墙体遮挡
 *  - 房间净空 >= MIN_MOVE_SPACE，玩家可正常移动
 */
export class RoomGenerator {
    private static _inst: RoomGenerator;
    private _roomIndex: number = 0;

    private constructor() {}

    static get instance(): RoomGenerator {
        if (!RoomGenerator._inst) RoomGenerator._inst = new RoomGenerator();
        return RoomGenerator._inst;
    }

    /** 重置房间计数（新游戏时调用） */
    reset() { this._roomIndex = 0; }

    /** 生成下一个房间配置 */
    next(): RoomConfig {
        const type = this._pickType();
        const config = this._generate(type);
        this._roomIndex++;
        return config;
    }

    /** 用指定类型生成房间（用于强制 START/EXIT） */
    generate(type: RoomType): RoomConfig {
        const config = this._generate(type);
        this._roomIndex++;
        return config;
    }

    get roomIndex() { return this._roomIndex; }

    // ========== 内部 ==========

    private _pickType(): RoomType {
        // 每 5 间保证一个 REST
        if (this._roomIndex > 0 && this._roomIndex % 5 === 0) return RoomType.REST;
        return TYPE_POOL[Math.floor(Math.random() * TYPE_POOL.length)];
    }

    private _generate(type: RoomType): RoomConfig {
        const width  = this._randInt(600, 1200);
        const height = this._randInt(400, 800);

        // 合法性校验：净空必须满足玩家移动和门不被遮挡
        // 门开在左右墙中央，门高 DOOR_CLEAR_HEIGHT，房间高度必须 >= DOOR_CLEAR_HEIGHT + MIN_MOVE_SPACE
        const minHeight = DOOR_CLEAR_HEIGHT + MIN_MOVE_SPACE;
        const safeHeight = Math.max(height, minHeight);
        // 宽度同理（上下门若存在）
        const minWidth = DOOR_CLEAR_HEIGHT + MIN_MOVE_SPACE;
        const safeWidth = Math.max(width, minWidth);

        return {
            type,
            width:  safeWidth,
            height: safeHeight,
            enemyCount: ENEMY_COUNT[type] ?? 0,
        };
    }

    private _randInt(min: number, max: number): number {
        return min + Math.floor(Math.random() * (max - min + 1));
    }
}
