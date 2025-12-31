import { _decorator, Component, assetManager, director } from 'cc';
import { Log } from './Logger';
const { ccclass } = _decorator;

/**
 * Bundle加载器
 * 负责管理和加载游戏中的各种bundle资源
 */
@ccclass('BundleLoader')
export class BundleLoader extends Component {
    
    private static _instance: BundleLoader = null;
    private _loadingPromises: Map<string, Promise<void>> = new Map();
    private _loadedBundles: Set<string> = new Set();
    private readonly MODULE_NAME = 'BundleLoader';

    public static get instance(): BundleLoader {
        return BundleLoader._instance;
    }

    onLoad() {
        if (BundleLoader._instance === null) {
            BundleLoader._instance = this;
            director.addPersistRootNode(this.node);
        } else {
            this.node.destroy();
        }
    }

    /**
     * 加载bundle
     * @param bundleName bundle名称
     * @param onProgress 进度回调
     * @returns Promise
     */
    public loadBundle(bundleName: string, onProgress?: (progress: number) => void): Promise<void> {
        // 如果已经在加载中，返回现有的Promise
        if (this._loadingPromises.has(bundleName)) {
            return this._loadingPromises.get(bundleName);
        }

        // 如果已经加载完成，直接返回
        if (this._loadedBundles.has(bundleName)) {
            return Promise.resolve();
        }

        const loadPromise = new Promise<void>((resolve, reject) => {
            Log.log(this.MODULE_NAME, `开始加载bundle: ${bundleName}`);
            
            assetManager.loadBundle(bundleName, (err, bundle) => {
                if (err) {
                    Log.error(this.MODULE_NAME, `加载bundle ${bundleName} 失败:`, err);
                    this._loadingPromises.delete(bundleName);
                    reject(err);
                    return;
                }
                
                Log.log(this.MODULE_NAME, `Bundle ${bundleName} 加载成功`);
                this._loadedBundles.add(bundleName);
                this._loadingPromises.delete(bundleName);
                resolve();
            });
        });

        this._loadingPromises.set(bundleName, loadPromise);
        return loadPromise;
    }

    /**
     * 批量加载bundle
     * @param bundleNames bundle名称数组
     * @param onProgress 总体进度回调
     * @returns Promise
     */
    public async loadBundles(bundleNames: string[], onProgress?: (progress: number) => void): Promise<void> {
        const totalCount = bundleNames.length;
        let loadedCount = 0;

        const updateProgress = () => {
            loadedCount++;
            if (onProgress) {
                onProgress(loadedCount / totalCount);
            }
        };

        const loadPromises = bundleNames.map(async (bundleName) => {
            try {
                await this.loadBundle(bundleName);
                updateProgress();
            } catch (error) {
                Log.error(this.MODULE_NAME, `批量加载中，bundle ${bundleName} 加载失败:`, error);
                updateProgress();
                throw error;
            }
        });

        await Promise.all(loadPromises);
    }

    /**
     * 检查bundle是否已加载
     */
    public isBundleLoaded(bundleName: string): boolean {
        return this._loadedBundles.has(bundleName);
    }

    /**
     * 获取bundle
     */
    public getBundle(bundleName: string) {
        if (!this.isBundleLoaded(bundleName)) {
            Log.warn(this.MODULE_NAME, `Bundle ${bundleName} 尚未加载`);
            return null;
        }
        return assetManager.getBundle(bundleName);
    }

    /**
     * 预加载bundle中的资源
     */
    public preloadBundleAssets(bundleName: string, paths: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const bundle = this.getBundle(bundleName);
            if (!bundle) {
                reject(new Error(`Bundle ${bundleName} 不存在`));
                return;
            }

            bundle.preload(paths, (err) => {
                if (err) {
                    Log.error(this.MODULE_NAME, `预加载 ${bundleName} 中的资源失败:`, err);
                    reject(err);
                    return;
                }
                
                Log.log(this.MODULE_NAME, `预加载 ${bundleName} 中的资源成功`);
                resolve();
            });
        });
    }

    /**
     * 获取已加载的bundle列表
     */
    public getLoadedBundles(): string[] {
        return Array.from(this._loadedBundles);
    }

    /**
     * 释放bundle
     */
    public releaseBundle(bundleName: string) {
        const bundle = assetManager.getBundle(bundleName);
        if (bundle) {
            bundle.releaseAll();
            assetManager.removeBundle(bundle);
            this._loadedBundles.delete(bundleName);
            Log.log(this.MODULE_NAME, `Bundle ${bundleName} 已释放`);
        }
    }
}