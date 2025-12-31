import { _decorator, Component, director, Label, ProgressBar, Node } from 'cc';
import { BundleLoader } from './BundleLoader';
import { Log } from './Logger';
const { ccclass, property } = _decorator;

/**
 * 启动初始化器
 * 负责游戏的启动流程，初始化BundleLoader并加载主场景
 */
@ccclass('BootInit')
export class BootInit extends Component {
    
    @property({ type: Label, tooltip: '启动状态显示文本' })
    public statusLabel: Label = null;

    @property({ type: ProgressBar, tooltip: '启动进度条' })
    public progressBar: ProgressBar = null;

    @property({ type: [String], tooltip: '需要预加载的Bundle列表' })
    public preloadBundles: string[] = ['ui', 'game'];

    @property({ type: String, tooltip: '主场景名称' })
    public mainSceneName: string = 'mainMenu';

    @property({ type: Boolean, tooltip: '是否显示详细日志' })
    public enableDebugLog: boolean = true;

    private _bundleLoader: BundleLoader = null;
    private _initStartTime: number = 0;
    private readonly MODULE_NAME = 'BootInit';

    start() {
        this._initStartTime = Date.now();
        
        // 配置日志系统
        if (!this.enableDebugLog) {
            Log.setLevel(1); // 只显示LOG级别以上的日志
        }
        
        Log.log(this.MODULE_NAME, '游戏启动初始化开始');
        this.initializeBootSequence();
    }

    /**
     * 初始化启动序列
     */
    private async initializeBootSequence() {
        try {
            // 步骤1: 初始化BundleLoader
            await this.initializeBundleLoader();
            
            // 步骤2: 预加载必要的Bundle
            await this.preloadEssentialBundles();
            
            // 步骤3: 加载主场景
            // await this.loadMainScene();
            
            // 启动完成
            this.onBootComplete();
            
        } catch (error) {
            this.onBootError(error);
        }
    }

    /**
     * 初始化BundleLoader
     */
    private async initializeBundleLoader(): Promise<void> {
        this.updateStatus('正在初始化资源加载器...');
        this.updateProgress(0.1);
        
        return new Promise((resolve, reject) => {
            // 创建BundleLoader节点（如果不存在）
            let bundleLoaderNode = director.getScene().getChildByName('BundleLoader');
            if (!bundleLoaderNode) {
                bundleLoaderNode = new Node('BundleLoader');
                bundleLoaderNode.addComponent(BundleLoader);
                director.getScene().addChild(bundleLoaderNode);
            }

            // 等待BundleLoader初始化完成
            this.scheduleOnce(() => {
                this._bundleLoader = BundleLoader.instance;
                if (this._bundleLoader) {
                    Log.log(this.MODULE_NAME, 'BundleLoader初始化完成');
                    this.updateProgress(0.2);
                    resolve();
                } else {
                    reject(new Error('BundleLoader初始化失败'));
                }
            }, 0.1);
        });
    }

    /**
     * 预加载必要的Bundle
     */
    private async preloadEssentialBundles(): Promise<void> {
        if (this.preloadBundles.length === 0) {
            Log.log(this.MODULE_NAME, '跳过Bundle预加载');
            this.updateProgress(1.0);
            return;
        }

        this.updateStatus('正在加载游戏资源...');
        Log.log(this.MODULE_NAME, `开始预加载Bundle: ${this.preloadBundles.join(', ')}`);

        try {
            await this._bundleLoader.loadBundles(this.preloadBundles, (progress) => {
                // 将bundle加载进度映射到总进度的20%-80%区间
                const mappedProgress = 0.2 + (progress * 0.6);
                this.updateProgress(mappedProgress);
                this.updateStatus(`加载资源中... ${Math.floor(progress * 100)}%`);
            });

            Log.log(this.MODULE_NAME, '所有Bundle预加载完成');
            this.updateProgress(1.0);
            
        } catch (error) {
            throw new Error(`Bundle预加载失败: ${error.message}`);
        }
    }

    /**
     * 加载主场景
     */
    private async loadMainScene(): Promise<void> {
        this.updateStatus('正在加载主场景...');
        this.updateProgress(0.9);
        
        return new Promise((resolve, reject) => {
            Log.log(this.MODULE_NAME, `开始加载主场景: ${this.mainSceneName}`);
            
            director.loadScene(this.mainSceneName, (err) => {
                if (err) {
                    Log.error(this.MODULE_NAME, `主场景加载失败: ${err.message}`);
                    reject(new Error(`主场景加载失败: ${err.message}`));
                    return;
                }
                
                Log.log(this.MODULE_NAME, '主场景加载完成');
                this.updateProgress(1.0);
                resolve();
            });
        });
    }

    /**
     * 启动完成处理
     */
    private onBootComplete() {
        const totalTime = Date.now() - this._initStartTime;
        this.updateStatus('启动完成！');
        Log.log(this.MODULE_NAME, `游戏启动完成，总耗时: ${totalTime}ms`);
        
        // 可以在这里触发启动完成事件
        this.node.emit('boot-complete', {
            totalTime,
            loadedBundles: this._bundleLoader?.getLoadedBundles() || []
        });
    }

    /**
     * 启动错误处理
     */
    private onBootError(error: any) {
        const totalTime = Date.now() - this._initStartTime;
        this.updateStatus('启动失败！');
        Log.error(this.MODULE_NAME, `游戏启动失败: ${error.message}，耗时: ${totalTime}ms`);
        
        // 触发启动失败事件
        this.node.emit('boot-error', {
            error: error.message,
            totalTime
        });
        
        // 可以在这里显示重试按钮或错误提示
        this.showRetryOption();
    }

    /**
     * 显示重试选项
     */
    private showRetryOption() {
        // 延迟3秒后自动重试，或者显示重试按钮让用户手动重试
        this.scheduleOnce(() => {
            Log.log(this.MODULE_NAME, '准备重试启动...');
            this.retryBoot();
        }, 3);
    }

    /**
     * 重试启动
     */
    public retryBoot() {
        Log.log(this.MODULE_NAME, '重试游戏启动');
        this._initStartTime = Date.now();
        this.updateProgress(0);
        this.initializeBootSequence();
    }

    /**
     * 更新进度条
     */
    private updateProgress(progress: number) {
        if (this.progressBar) {
            this.progressBar.progress = Math.max(0, Math.min(1, progress));
        }
    }

    /**
     * 更新状态文本
     */
    private updateStatus(status: string) {
        if (this.statusLabel) {
            this.statusLabel.string = status;
        }
    }

    /**
     * 获取启动状态信息
     */
    public getBootStatus() {
        return {
            bundleLoader: this._bundleLoader !== null,
            loadedBundles: this._bundleLoader?.getLoadedBundles() || [],
            startTime: this._initStartTime,
            currentTime: Date.now()
        };
    }
}


