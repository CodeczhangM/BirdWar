import { _decorator, Component, Node, Label, ProgressBar } from 'cc';
import { BundleLoader } from './BundleLoader';
import { Log } from './Logger';
const { ccclass, property } = _decorator;

/**
 * 游戏启动器
 * 负责游戏的初始化和资源加载流程
 */
@ccclass('GameLauncher')
export class GameLauncher extends Component {
    
    @property({ type: Node, tooltip: '加载界面根节点' })
    public loadingUI: Node = null;

    @property({ type: ProgressBar, tooltip: '加载进度条' })
    public progressBar: ProgressBar = null;

    @property({ type: Label, tooltip: '加载状态文本' })
    public statusLabel: Label = null;

    @property({ type: [String], tooltip: '需要加载的Bundle列表' })
    public bundlesToLoad: string[] = ['ui', 'game'];

    private _bundleLoader: BundleLoader = null;
    private readonly MODULE_NAME = 'GameLauncher';

    start() {
        this.initializeGame();
    }

    /**
     * 初始化游戏
     */
    private async initializeGame() {
        try {
            // 显示加载界面
            this.showLoadingUI(true);
            this.updateStatus('正在初始化...');
            
            // 获取BundleLoader实例
            this._bundleLoader = BundleLoader.instance;
            if (!this._bundleLoader) {
                throw new Error('BundleLoader未初始化');
            }

            // 开始加载所有bundle
            await this.loadAllBundles();
            
            // 加载完成后的处理
            this.onLoadingComplete();
            
        } catch (error) {
            Log.error(this.MODULE_NAME, '游戏初始化失败:', error);
            this.onLoadingError(error);
        }
    }

    /**
     * 加载所有bundle
     */
    private async loadAllBundles(): Promise<void> {
        this.updateStatus('正在加载游戏资源...');
        
        await this._bundleLoader.loadBundles(this.bundlesToLoad, (progress) => {
            this.updateProgress(progress);
            this.updateStatus(`加载进度: ${Math.floor(progress * 100)}%`);
        });
    }

    /**
     * 加载完成处理
     */
    private onLoadingComplete() {
        Log.log(this.MODULE_NAME, '所有资源加载完成');
        this.updateStatus('加载完成！');
        this.updateProgress(1);
        
        // 延迟一下再隐藏加载界面，让用户看到100%
        this.scheduleOnce(() => {
            this.showLoadingUI(false);
            this.startGame();
        }, 0.5);
    }

    /**
     * 开始游戏
     */
    private startGame() {
        Log.log(this.MODULE_NAME, '游戏启动');
        
        // 这里可以加载主菜单场景或直接进入游戏
        // 例如：director.loadScene('MainMenu');
        
        // 或者触发游戏开始事件
        this.node.emit('game-ready');
    }

    /**
     * 加载错误处理
     */
    private onLoadingError(error: any) {
        Log.error(this.MODULE_NAME, '加载过程中发生错误:', error);
        this.updateStatus('加载失败，请重试');
        
        // 可以显示重试按钮
        this.showRetryButton(true);
    }

    /**
     * 更新加载进度
     */
    private updateProgress(progress: number) {
        if (this.progressBar) {
            this.progressBar.progress = progress;
        }
    }

    /**
     * 更新状态文本
     */
    private updateStatus(status: string) {
        if (this.statusLabel) {
            this.statusLabel.string = status;
        }
        Log.log(this.MODULE_NAME, status);
    }

    /**
     * 显示/隐藏加载界面
     */
    private showLoadingUI(show: boolean) {
        if (this.loadingUI) {
            this.loadingUI.active = show;
        }
    }

    /**
     * 显示/隐藏重试按钮
     */
    private showRetryButton(show: boolean) {
        // 这里可以控制重试按钮的显示
        // 需要在场景中添加重试按钮节点
    }

    /**
     * 重试加载（可以绑定到重试按钮）
     */
    public onRetryButtonClicked() {
        Log.log(this.MODULE_NAME, '重试加载');
        this.showRetryButton(false);
        this.initializeGame();
    }

    /**
     * 获取bundle加载状态
     */
    public getBundleLoadStatus(): { [key: string]: boolean } {
        const status: { [key: string]: boolean } = {};
        for (const bundleName of this.bundlesToLoad) {
            status[bundleName] = this._bundleLoader?.isBundleLoaded(bundleName) || false;
        }
        return status;
    }
}