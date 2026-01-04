import { _decorator, Component, Node, director, assetManager, instantiate } from 'cc';
import { Log } from './Logger';
const { ccclass, property } = _decorator;

@ccclass('MainSceneController')
export class MainSceneController extends Component {
    
    @property({ type: Node, tooltip: '加载进度显示节点' })
    public loadingNode: Node = null;

    @property({ type: Node, tooltip: 'UI根节点' })
    public uiRoot: Node = null;

    private _loadedBundles: Set<string> = new Set();
    private readonly MODULE_NAME = 'MainSceneController';

    start() {
        this.loadAllBundles();
    }

    /**
     * 加载所有必要的bundle
     */
    private async loadAllBundles() {
        try {
            // 显示加载界面
            this.showLoading(true);
            
            // 需要加载的bundle列表
            const bundlesToLoad = ['ui', 'game'];
            
            for (const bundleName of bundlesToLoad) {
                await this.loadBundle(bundleName);
            }
            
            // 所有bundle加载完成后的处理
            this.onAllBundlesLoaded();
            
        } catch (error) {
            Log.error(this.MODULE_NAME, 'Bundle加载失败:', error);
            this.onLoadError(error);
        }
    }

    /**
     * 加载单个bundle
     */
    private loadBundle(bundleName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            Log.log(this.MODULE_NAME, `开始加载bundle: ${bundleName}`);
            
            assetManager.loadBundle(bundleName, (err, bundle) => {
                if (err) {
                    Log.error(this.MODULE_NAME, `加载bundle ${bundleName} 失败:`, err);
                    reject(err);
                    return;
                }
                
                Log.log(this.MODULE_NAME, `Bundle ${bundleName} 加载成功`);
                this._loadedBundles.add(bundleName);
                resolve();
            });
        });
    }

    /**
     * 所有bundle加载完成后的处理
     */
    private onAllBundlesLoaded() {
        Log.log(this.MODULE_NAME, '所有Bundle加载完成');
        
        // 隐藏加载界面
        this.showLoading(false);
        
        // 初始化UI系统
        this.initializeUI();
        
        // 初始化游戏系统
        this.initializeGame();
    }

    /**
     * 初始化UI系统
     */
    private initializeUI() {
        if (!this._loadedBundles.has('ui')) {
            Log.warn(this.MODULE_NAME, 'UI bundle未加载，跳过UI初始化');
            return;
        }
        
        Log.log(this.MODULE_NAME, '初始化UI系统');
        // 这里可以加载主UI预制体或场景
        // 例如：加载主菜单UI
        this.loadMainMenuUI();
    }

    /**
     * 初始化游戏系统
     */
    private initializeGame() {
        if (!this._loadedBundles.has('game')) {
            Log.warn(this.MODULE_NAME, 'Game bundle未加载，跳过游戏初始化');
            return;
        }
        
        Log.log(this.MODULE_NAME, '初始化游戏系统');
        // 这里可以预加载游戏资源或初始化游戏管理器
    }

    /**
     * 加载主菜单UI
     */
    private loadMainMenuUI() {
        const uiBundle = assetManager.getBundle('ui');
        if (!uiBundle) {
            Log.error(this.MODULE_NAME, 'UI bundle不存在');
            return;
        }

        // 假设UI bundle中有一个MainMenu预制体
        uiBundle.load('MainMenu', (err, prefab: any) => {
            if (err) {
                Log.error(this.MODULE_NAME, '加载MainMenu预制体失败:', err);
                return;
            }
            
            // 实例化UI预制体
            const mainMenuNode = director.getScene().getChildByName('Canvas') || this.uiRoot;
            if (mainMenuNode && prefab) {
                const uiInstance = instantiate(prefab);
                mainMenuNode.addChild(uiInstance);
                console.log('主菜单UI加载完成');
            }
        });
    }

    /**
     * 显示/隐藏加载界面
     */
    private showLoading(show: boolean) {
        if (this.loadingNode) {
            this.loadingNode.active = show;
        }
    }

    /**
     * 加载错误处理
     */
    private onLoadError(error: any) {
        console.error('加载过程中发生错误:', error);
        this.showLoading(false);
        
        // 这里可以显示错误提示UI
        // 或者重试加载逻辑
    }

    /**
     * 检查bundle是否已加载
     */
    public isBundleLoaded(bundleName: string): boolean {
        return this._loadedBundles.has(bundleName);
    }

    /**
     * 获取已加载的bundle
     */
    public getLoadedBundles(): string[] {
        return Array.from(this._loadedBundles);
    }
}