import { director } from 'cc';
import { EventManagerInstance, EventData } from './EventManager';
import { Log } from './Logger';

/**
 * 游戏阶段枚举
 */
export enum GamePhase {
    NONE     = 'none',      // 初始状态
    LOADING  = 'loading',   // 加载中
    MENU     = 'menu',      // 主菜单
    PLAYING  = 'playing',   // 游戏进行中
    PAUSED   = 'paused',    // 暂停
    GAME_OVER = 'game_over', // 游戏结束（失败）
    VICTORY  = 'victory',   // 游戏胜利
}

/**
 * 游戏控制器事件名常量
 * 外部模块监听/触发游戏状态时使用，避免硬编码字符串
 */
export const GameEvents = {
    /** 阶段发生变化，携带 { previousPhase, currentPhase } */
    PHASE_CHANGED:    'game-phase-changed',
    /** 游戏开始（进入 PLAYING） */
    START:            'game-start',
    /** 游戏暂停 */
    PAUSE:            'game-pause',
    /** 游戏恢复 */
    RESUME:           'game-resume',
    /** 游戏结束（失败），携带 { result: 'lose' } */
    OVER:             'game-end',
    /** 游戏胜利，携带 { result: 'win' } */
    VICTORY:          'game-victory',
    /** 重新开始，携带 { goToMenu: boolean } */
    RESTART:          'game-restart',
    /** 开始加载 */
    LOADING_START:    'game-loading-start',
    /** 加载完成 */
    LOADING_COMPLETE: 'game-loading-complete',
    /** 进入主菜单 */
    ENTER_MENU:       'game-enter-menu',

    // -------- 外部请求事件（其他模块发出，GameController 响应）--------
    /** UI 暂停按钮触发 */
    REQUEST_PAUSE:    'request-pause',
    /** UI 恢复按钮触发 */
    REQUEST_RESUME:   'request-resume',
    /** 请求游戏结束 */
    REQUEST_GAME_OVER: 'request-game-over',
    /** 请求游戏胜利 */
    REQUEST_VICTORY:  'request-victory',
    /** 请求重新开始，可附带 { goToMenu: boolean } */
    REQUEST_RESTART:  'request-restart',
} as const;

/**
 * 阶段变更事件数据
 */
export interface PhaseChangedEventData extends EventData {
    previousPhase: GamePhase;
    currentPhase: GamePhase;
}

/**
 * 游戏整体控制器（单例）
 *
 * 职责：
 *  - 维护并校验游戏阶段状态机（NONE → LOADING → MENU → PLAYING ⇄ PAUSED → GAME_OVER/VICTORY）
 *  - 调用 director.pause/resume 控制引擎时间
 *  - 通过 EventManagerInstance 广播所有状态变更
 *  - 监听外部 request-* 事件，实现模块解耦
 *
 * 用法：
 *   import { GameControllerInstance, GameEvents, GamePhase } from './GameController';
 *   GameControllerInstance.startGame();
 *   EventManagerInstance.on(GameEvents.PHASE_CHANGED, handler);
 */
export class GameController {
    private static _instance: GameController = null;
    private _currentPhase: GamePhase = GamePhase.NONE;
    private readonly MODULE_NAME = 'GameController';

    /** 合法的阶段转换表 */
    private static readonly VALID_TRANSITIONS: Partial<Record<GamePhase, GamePhase[]>> = {
        [GamePhase.NONE]:      [GamePhase.LOADING, GamePhase.MENU],
        [GamePhase.LOADING]:   [GamePhase.MENU],
        [GamePhase.MENU]:      [GamePhase.LOADING, GamePhase.PLAYING],
        [GamePhase.PLAYING]:   [GamePhase.PAUSED, GamePhase.GAME_OVER, GamePhase.VICTORY],
        [GamePhase.PAUSED]:    [GamePhase.PLAYING, GamePhase.MENU, GamePhase.GAME_OVER],
        [GamePhase.GAME_OVER]: [GamePhase.LOADING, GamePhase.MENU, GamePhase.PLAYING],
        [GamePhase.VICTORY]:   [GamePhase.LOADING, GamePhase.MENU, GamePhase.PLAYING],
    };

    private constructor() {
        Log.log(this.MODULE_NAME, 'GameController 初始化');
        this.setupEventListeners();
    }

    public static getInstance(): GameController {
        if (!GameController._instance) {
            GameController._instance = new GameController();
        }
        return GameController._instance;
    }

    // ========== 状态查询 ==========

    public get currentPhase(): GamePhase {
        return this._currentPhase;
    }

    public isPlaying(): boolean  { return this._currentPhase === GamePhase.PLAYING; }
    public isPaused(): boolean   { return this._currentPhase === GamePhase.PAUSED; }
    public isGameOver(): boolean { return this._currentPhase === GamePhase.GAME_OVER; }
    public isVictory(): boolean  { return this._currentPhase === GamePhase.VICTORY; }
    public isInMenu(): boolean   { return this._currentPhase === GamePhase.MENU; }
    public isLoading(): boolean  { return this._currentPhase === GamePhase.LOADING; }

    // ========== 阶段控制公共接口 ==========

    /**
     * 进入加载阶段
     */
    public startLoading(): void {
        if (this.transitionTo(GamePhase.LOADING)) {
            EventManagerInstance.emit(GameEvents.LOADING_START, { phase: GamePhase.LOADING });
            Log.log(this.MODULE_NAME, '进入加载阶段');
        }
    }

    /**
     * 加载完成，进入主菜单
     */
    public enterMenu(): void {
        if (this.transitionTo(GamePhase.MENU)) {
            EventManagerInstance.emit(GameEvents.ENTER_MENU, { phase: GamePhase.MENU });
            Log.log(this.MODULE_NAME, '进入主菜单');
        }
    }

    /**
     * 开始游戏（从菜单或重新开始均可调用）
     * @param data 附加数据，将随 game-start 事件一起广播
     */
    public startGame(data: EventData = {}): void {
        if (this.transitionTo(GamePhase.PLAYING)) {
            director.resume();
            EventManagerInstance.emitGameStart({ ...data, phase: GamePhase.PLAYING });
            Log.log(this.MODULE_NAME, '游戏开始');
        }
    }

    /**
     * 暂停游戏
     * @param data 附加数据
     */
    public pause(data: EventData = {}): void {
        if (this.transitionTo(GamePhase.PAUSED)) {
            director.pause();
            EventManagerInstance.emitGamePause({ ...data, phase: GamePhase.PAUSED });
            Log.log(this.MODULE_NAME, '游戏暂停');
        }
    }

    /**
     * 继续游戏（从暂停恢复）
     * @param data 附加数据
     */
    public resume(data: EventData = {}): void {
        if (this.transitionTo(GamePhase.PLAYING)) {
            director.resume();
            EventManagerInstance.emitGameResume({ ...data, phase: GamePhase.PLAYING });
            Log.log(this.MODULE_NAME, '游戏恢复');
        }
    }

    /**
     * 游戏结束（失败）
     * @param data 附加数据，如 { score, reason }
     */
    public gameOver(data: EventData = {}): void {
        if (this.transitionTo(GamePhase.GAME_OVER)) {
            EventManagerInstance.emitGameEnd({ ...data, result: 'lose', phase: GamePhase.GAME_OVER });
            Log.log(this.MODULE_NAME, '游戏结束（失败）');
        }
    }

    /**
     * 游戏胜利
     * @param data 附加数据，如 { score, stars }
     */
    public victory(data: EventData = {}): void {
        if (this.transitionTo(GamePhase.VICTORY)) {
            EventManagerInstance.emit(GameEvents.VICTORY, { ...data, result: 'win', phase: GamePhase.VICTORY });
            Log.log(this.MODULE_NAME, '游戏胜利');
        }
    }

    /**
     * 重新开始
     * @param goToMenu true 返回主菜单，false 直接重玩（默认 false）
     */
    public restart(goToMenu: boolean = false): void {
        // 无论当前是暂停还是其他状态，先恢复引擎时间
        director.resume();

        if (goToMenu) {
            if (this.transitionTo(GamePhase.MENU)) {
                EventManagerInstance.emit(GameEvents.RESTART, { goToMenu: true });
                EventManagerInstance.emit(GameEvents.ENTER_MENU, { phase: GamePhase.MENU });
                Log.log(this.MODULE_NAME, '重新开始 -> 返回菜单');
            }
        } else {
            if (this.transitionTo(GamePhase.PLAYING)) {
                EventManagerInstance.emit(GameEvents.RESTART, { goToMenu: false });
                EventManagerInstance.emitGameStart({ phase: GamePhase.PLAYING });
                Log.log(this.MODULE_NAME, '重新开始 -> 直接重玩');
            }
        }
    }

    // ========== 内部实现 ==========

    /**
     * 执行阶段转换，校验合法性后更新状态并广播 PHASE_CHANGED 事件
     * @returns 是否转换成功
     */
    private transitionTo(newPhase: GamePhase): boolean {
        if (this._currentPhase === newPhase) {
            Log.warn(this.MODULE_NAME, `已处于目标阶段，忽略转换: ${newPhase}`);
            return false;
        }

        const validTargets  = GameController.VALID_TRANSITIONS[this._currentPhase] ?? [];
        if (!validTargets.includes(newPhase)) {
            Log.warn(this.MODULE_NAME, `非法阶段转换: ${this._currentPhase} -> ${newPhase}`);
            return false;
        }

        const previousPhase = this._currentPhase;
        this._currentPhase = newPhase;

        const eventData: PhaseChangedEventData = { previousPhase, currentPhase: newPhase };
        EventManagerInstance.emit(GameEvents.PHASE_CHANGED, eventData);

        Log.debug(this.MODULE_NAME, `阶段转换: ${previousPhase} -> ${newPhase}`);
        return true;
    }

    /**
     * 监听外部 request-* 事件，使 UI/战斗系统不必直接持有 GameController 引用
     */
    private setupEventListeners(): void {
        EventManagerInstance.on(GameEvents.REQUEST_PAUSE,    ()     => this.pause(),    this);
        EventManagerInstance.on(GameEvents.REQUEST_RESUME,   ()     => this.resume(),   this);
        EventManagerInstance.on(GameEvents.REQUEST_GAME_OVER, data  => this.gameOver(data),  this);
        EventManagerInstance.on(GameEvents.REQUEST_VICTORY,  data   => this.victory(data),   this);
        EventManagerInstance.on(GameEvents.REQUEST_RESTART,  data   => {
            this.restart(!!(data as any).goToMenu);
        }, this);
    }

    // ========== 调试 ==========

    public debugInfo(): void {
        Log.log(this.MODULE_NAME, '=== GameController 调试信息 ===');
        Log.log(this.MODULE_NAME, `当前阶段: ${this._currentPhase}`);
        const validTargets = GameController.VALID_TRANSITIONS[this._currentPhase] ?? [];
        Log.log(this.MODULE_NAME, `可转换到: [${validTargets.join(', ')}]`);
    }
}

/** 全局单例，直接 import 使用 */
export const GameControllerInstance = GameController.getInstance();
