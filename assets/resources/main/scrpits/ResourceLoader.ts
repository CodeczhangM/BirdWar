import { _decorator, assetManager, SpriteFrame, Texture2D, AudioClip, Material } from 'cc';
import { Log } from './Logger';

const { ccclass } = _decorator;

/**
 * 资源信息接口
 */
export interface ResourceInfo {
    /** 资源名称 */
    name: string;
    /** 完整路径 */
    fullPath: string;
    /** 资源类型 */
    type: string;
    /** 是否存在 */
    exists: boolean;
}

/**
 * 资源搜索选项
 */
export interface ResourceSearchOptions {
    /** 搜索的资源名称（支持部分匹配） */
    name?: string;
    /** 资源类型过滤 */
    type?: string;
    /** 路径包含的关键字 */
    pathContains?: string;
    /** 是否区分大小写 */
    caseSensitive?: boolean;
    /** 最大返回数量 */
    maxResults?: number;
}

/**
 * 资源加载器
 * 用于管理和加载各种资源，支持通过bundle名称获取资源列表并过滤
 */
@ccclass('ResourceLoader')
export class ResourceLoader {
    private static _instance: ResourceLoader = null;
    private readonly MODULE_NAME = 'ResourceLoader';
    private _bundleCache: Map<string, any> = new Map();
    private _resourceCache: Map<string, ResourceInfo[]> = new Map();

    /**
     * 获取单例实例
     */
    public static getInstance(): ResourceLoader {
        if (!ResourceLoader._instance) {
            ResourceLoader._instance = new ResourceLoader();
        }
        return ResourceLoader._instance;
    }

    /**
     * 获取Bundle中的所有资源列表
     */
    public getBundleResourceList(bundleName: string): ResourceInfo[] {
        // 检查缓存
        if (this._resourceCache.has(bundleName)) {
            return this._resourceCache.get(bundleName);
        }

        const bundle = assetManager.getBundle(bundleName);
        if (!bundle) {
            Log.error(this.MODULE_NAME, `Bundle ${bundleName} 未找到`);
            return [];
        }

        const resourceList: ResourceInfo[] = [];

        try {
            const bundleAny = bundle as any;
            if (bundleAny._config && bundleAny._config.paths && bundleAny._config.paths._map) {
                const pathsMap = bundleAny._config.paths._map;
                const availablePaths = Object.keys(pathsMap);

                Log.debug(this.MODULE_NAME, `Bundle ${bundleName} 中找到 ${availablePaths.length} 个资源`);

                for (const fullPath of availablePaths) {
                    const pathInfo = pathsMap[fullPath];
                    const pathParts = fullPath.split('/');
                    const fileName = pathParts[pathParts.length - 1];
                    
                    // 提取资源名称（去掉扩展名和类型后缀）
                    let resourceName = fileName;
                    if (resourceName.includes('.')) {
                        resourceName = resourceName.split('.')[0];
                    }

                    // 确定资源类型
                    let resourceType = 'unknown';
                    if (fullPath.includes('spriteFrame')) {
                        resourceType = 'SpriteFrame';
                    } else if (fullPath.includes('texture')) {
                        resourceType = 'Texture2D';
                    } else if (fullPath.includes('audio')) {
                        resourceType = 'AudioClip';
                    } else if (fullPath.includes('prefab')) {
                        resourceType = 'Prefab';
                    } else if (fullPath.includes('scene')) {
                        resourceType = 'Scene';
                    } else if (fullPath.includes('material')) {
                        resourceType = 'Material';
                    } else if (fullPath.includes('effect')) {
                        resourceType = 'Effect';
                    }

                    const resourceInfo: ResourceInfo = {
                        name: resourceName,
                        fullPath: fullPath,
                        type: resourceType,
                        exists: true
                    };

                    resourceList.push(resourceInfo);
                }

                // 缓存结果
                this._resourceCache.set(bundleName, resourceList);
                
                Log.log(this.MODULE_NAME, `Bundle ${bundleName} 资源列表获取完成，共 ${resourceList.length} 个资源`);
            } else {
                Log.warn(this.MODULE_NAME, `Bundle ${bundleName} 的配置信息不可用`);
            }
        } catch (error) {
            Log.error(this.MODULE_NAME, `获取Bundle ${bundleName} 资源列表失败:`, error);
        }

        return resourceList;
    }

    /**
     * 搜索指定名称的资源
     */
    public searchResources(bundleName: string, options: ResourceSearchOptions): ResourceInfo[] {
        const allResources = this.getBundleResourceList(bundleName);
        let filteredResources = [...allResources];

        Log.log(this.MODULE_NAME, `Bundle aaaaa:`,filteredResources);
        // 按名称过滤
        if (options.name) {
            const searchName = options.caseSensitive ? options.name : options.name.toLowerCase();
            Log.log(this.MODULE_NAME, `searchName: ${searchName}`);
            filteredResources = filteredResources.filter(resource => {
                const resourceName = options.caseSensitive ? resource.fullPath : resource.fullPath.toLowerCase();
                return resourceName.includes(searchName);
            });
        }

        // 按类型过滤
        if (options.type) {
            filteredResources = filteredResources.filter(resource => 
                resource.type === options.type
            );
        }

        // 按路径关键字过滤
        if (options.pathContains) {
            const searchPath = options.caseSensitive ? options.pathContains : options.pathContains.toLowerCase();
            filteredResources = filteredResources.filter(resource => {
                const resourcePath = options.caseSensitive ? resource.fullPath : resource.fullPath.toLowerCase();
                return resourcePath.includes(searchPath);
            });
        }

        // 限制返回数量
        if (options.maxResults && options.maxResults > 0) {
            filteredResources = filteredResources.slice(0, options.maxResults);
        }

        Log.debug(this.MODULE_NAME, `搜索完成，找到 ${filteredResources.length} 个匹配的资源`);
        return filteredResources;
    }

    /**
     * 查找指定名称的SpriteFrame资源路径
     */
    public findSpriteFramePath(bundleName: string, spriteName: string): string | null {
        const searchOptions: ResourceSearchOptions = {
            name: spriteName,
            type: 'SpriteFrame',
            caseSensitive: false,
            maxResults: 1
        };

        const results = this.searchResources(bundleName, searchOptions);
        if (results.length > 0) {
            Log.debug(this.MODULE_NAME, `找到SpriteFrame: ${spriteName} -> ${results[0].fullPath}`);
            return results[0].fullPath;
        }

        Log.warn(this.MODULE_NAME, `未找到SpriteFrame: ${spriteName}`);
        return null;
    }

    /**
     * 加载SpriteFrame资源
     */
    public loadSpriteFrame(bundleName: string, spriteName: string): Promise<SpriteFrame | null> {
        return new Promise((resolve) => {
            const resourcePath = this.findSpriteFramePath(bundleName, spriteName);
            if (!resourcePath) {
                Log.error(this.MODULE_NAME, `SpriteFrame路径未找到: ${spriteName}`);
                resolve(null);
                return;
            }

            const bundle = assetManager.getBundle(bundleName);
            if (!bundle) {
                Log.error(this.MODULE_NAME, `Bundle ${bundleName} 未找到`);
                resolve(null);
                return;
            }

            Log.debug(this.MODULE_NAME, `开始加载SpriteFrame: ${resourcePath}`);

            bundle.load(resourcePath, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    Log.error(this.MODULE_NAME, `SpriteFrame加载失败: ${resourcePath}`, err);
                    resolve(null);
                    return;
                }

                Log.debug(this.MODULE_NAME, `SpriteFrame加载成功: ${resourcePath}`);
                resolve(spriteFrame);
            });
        });
    }

    /**
     * 批量加载SpriteFrame资源
     */
    public async loadSpriteFrames(bundleName: string, spriteNames: string[]): Promise<Map<string, SpriteFrame | null>> {
        const results = new Map<string, SpriteFrame | null>();
        const loadPromises = spriteNames.map(async (spriteName) => {
            const spriteFrame = await this.loadSpriteFrame(bundleName, spriteName);
            results.set(spriteName, spriteFrame);
        });

        await Promise.all(loadPromises);
        Log.log(this.MODULE_NAME, `批量加载完成，成功加载 ${Array.from(results.values()).filter(sf => sf !== null).length}/${spriteNames.length} 个SpriteFrame`);
        return results;
    }

    /**
     * 查找指定名称的Material资源路径
     */
    public findMaterialPath(bundleName: string, materialName: string): string | null {
        const searchOptions: ResourceSearchOptions = {
            name: materialName,
            type: 'Material',
            caseSensitive: false,
            maxResults: 1
        };

        const results = this.searchResources(bundleName, searchOptions);
        if (results.length > 0) {
            Log.debug(this.MODULE_NAME, `找到Material: ${materialName} -> ${results[0].fullPath}`);
            return results[0].fullPath;
        }

        Log.warn(this.MODULE_NAME, `未找到Material: ${materialName}`);
        return null;
    }

    /**
     * 加载Material资源
     */
    public loadMaterial(bundleName: string, materialName: string): Promise<Material | null> {
        return new Promise((resolve) => {
            const resourcePath = this.findMaterialPath(bundleName, materialName);
            if (!resourcePath) {
                Log.error(this.MODULE_NAME, `Material路径未找到: ${materialName}`);
                resolve(null);
                return;
            }

            const bundle = assetManager.getBundle(bundleName);
            if (!bundle) {
                Log.error(this.MODULE_NAME, `Bundle ${bundleName} 未找到`);
                resolve(null);
                return;
            }

            Log.debug(this.MODULE_NAME, `开始加载Material: ${resourcePath}`);

            bundle.load(resourcePath, Material, (err, material) => {
                if (err) {
                    Log.error(this.MODULE_NAME, `Material加载失败: ${resourcePath}`, err);
                    resolve(null);
                    return;
                }

                Log.debug(this.MODULE_NAME, `Material加载成功: ${resourcePath}`);
                resolve(material);
            });
        });
    }

    /**
     * 批量加载Material资源
     */
    public async loadMaterials(bundleName: string, materialNames: string[]): Promise<Map<string, Material | null>> {
        const results = new Map<string, Material | null>();
        const loadPromises = materialNames.map(async (materialName) => {
            const material = await this.loadMaterial(bundleName, materialName);
            results.set(materialName, material);
        });

        await Promise.all(loadPromises);
        Log.log(this.MODULE_NAME, `批量加载完成，成功加载 ${Array.from(results.values()).filter(m => m !== null).length}/${materialNames.length} 个Material`);
        return results;
    }

    /**
     * 智能搜索材质资源（支持模糊匹配和多种命名规则）
     */
    public smartSearchMaterial(bundleName: string, materialName: string): ResourceInfo[] {
        const allResources = this.getBundleResourceList(bundleName);
        const materials = allResources.filter(r => r.type === 'Material');
        
        const results: ResourceInfo[] = [];
        const searchName = materialName.toLowerCase();

        // 1. 精确匹配
        let exactMatch = materials.find(m => m.name.toLowerCase() === searchName);
        if (exactMatch) {
            results.push(exactMatch);
        }

        // 2. 带前缀匹配 (Mat_, Material_, Mtl_等)
        const prefixes = ['Mat_', 'Material_', 'Mtl_', 'M_', ''];
        for (const prefix of prefixes) {
            const prefixedName = prefix + materialName;
            const match = materials.find(m => m.name.toLowerCase() === prefixedName.toLowerCase());
            if (match && results.indexOf(match) === -1) {
                results.push(match);
            }
        }

        // 3. 包含匹配
        const containsMatches = materials.filter(m => 
            m.name.toLowerCase().includes(searchName) && results.indexOf(m) === -1
        );
        results.push(...containsMatches);

        // 4. 路径匹配
        const pathMatches = materials.filter(m => 
            m.fullPath.toLowerCase().includes(searchName) && results.indexOf(m) === -1
        );
        results.push(...pathMatches);

        Log.debug(this.MODULE_NAME, `智能搜索材质 "${materialName}" 找到 ${results.length} 个匹配项`);
        return results;
    }

    /**
     * 加载Texture2D资源
     */
    public loadTexture2D(bundleName: string, textureName: string): Promise<Texture2D | null> {
        return new Promise((resolve) => {
            const searchOptions: ResourceSearchOptions = {
                name: textureName,
                type: 'Texture2D',
                caseSensitive: false,
                maxResults: 1
            };

            const results = this.searchResources(bundleName, searchOptions);
            if (results.length === 0) {
                Log.error(this.MODULE_NAME, `Texture2D路径未找到: ${textureName}`);
                resolve(null);
                return;
            }

            const resourcePath = results[0].fullPath;
            const bundle = assetManager.getBundle(bundleName);
            if (!bundle) {
                Log.error(this.MODULE_NAME, `Bundle ${bundleName} 未找到`);
                resolve(null);
                return;
            }

            Log.debug(this.MODULE_NAME, `开始加载Texture2D: ${resourcePath}`);

            bundle.load(resourcePath, Texture2D, (err, texture) => {
                if (err) {
                    Log.error(this.MODULE_NAME, `Texture2D加载失败: ${resourcePath}`, err);
                    resolve(null);
                    return;
                }

                Log.debug(this.MODULE_NAME, `Texture2D加载成功: ${resourcePath}`);
                resolve(texture);
            });
        });
    }

    /**
     * 加载AudioClip资源
     */
    public loadAudioClip(bundleName: string, audioName: string): Promise<AudioClip | null> {
        return new Promise((resolve) => {
            const searchOptions: ResourceSearchOptions = {
                name: audioName,
                type: 'AudioClip',
                caseSensitive: false,
                maxResults: 1
            };

            const results = this.searchResources(bundleName, searchOptions);
            if (results.length === 0) {
                Log.error(this.MODULE_NAME, `AudioClip路径未找到: ${audioName}`);
                resolve(null);
                return;
            }

            const resourcePath = results[0].fullPath;
            const bundle = assetManager.getBundle(bundleName);
            if (!bundle) {
                Log.error(this.MODULE_NAME, `Bundle ${bundleName} 未找到`);
                resolve(null);
                return;
            }

            Log.debug(this.MODULE_NAME, `开始加载AudioClip: ${resourcePath}`);

            bundle.load(resourcePath, AudioClip, (err, audioClip) => {
                if (err) {
                    Log.error(this.MODULE_NAME, `AudioClip加载失败: ${resourcePath}`, err);
                    resolve(null);
                    return;
                }

                Log.debug(this.MODULE_NAME, `AudioClip加载成功: ${resourcePath}`);
                resolve(audioClip);
            });
        });
    }

    /**
     * 预加载资源
     */
    public preloadResources(bundleName: string, resourcePaths: string[]): Promise<void> {
        return new Promise((resolve) => {
            const bundle = assetManager.getBundle(bundleName);
            if (!bundle) {
                Log.error(this.MODULE_NAME, `Bundle ${bundleName} 未找到`);
                resolve();
                return;
            }

            Log.log(this.MODULE_NAME, `开始预加载 ${resourcePaths.length} 个资源`);

            bundle.preload(resourcePaths, (err) => {
                if (err) {
                    Log.warn(this.MODULE_NAME, `预加载部分失败:`, err);
                } else {
                    Log.log(this.MODULE_NAME, `预加载完成`);
                }
                resolve();
            });
        });
    }

    /**
     * 释放资源
     */
    public releaseResources(bundleName: string, resourcePaths: string[]): void {
        const bundle = assetManager.getBundle(bundleName);
        if (!bundle) {
            Log.error(this.MODULE_NAME, `Bundle ${bundleName} 未找到`);
            return;
        }

        for (const path of resourcePaths) {
            bundle.release(path);
        }

        Log.log(this.MODULE_NAME, `释放了 ${resourcePaths.length} 个资源`);
    }

    /**
     * 清除缓存
     */
    public clearCache(bundleName?: string): void {
        if (bundleName) {
            this._resourceCache.delete(bundleName);
            this._bundleCache.delete(bundleName);
            Log.log(this.MODULE_NAME, `清除Bundle ${bundleName} 的缓存`);
        } else {
            this._resourceCache.clear();
            this._bundleCache.clear();
            Log.log(this.MODULE_NAME, `清除所有缓存`);
        }
    }

    /**
     * 获取资源统计信息
     */
    public getResourceStats(bundleName: string): { [type: string]: number } {
        const resources = this.getBundleResourceList(bundleName);
        const stats: { [type: string]: number } = {};

        for (const resource of resources) {
            if (!stats[resource.type]) {
                stats[resource.type] = 0;
            }
            stats[resource.type]++;
        }

        return stats;
    }

    /**
     * 调试：打印Bundle资源信息
     */
    public debugPrintBundleInfo(bundleName: string): void {
        Log.log(this.MODULE_NAME, `=== Bundle ${bundleName} 资源信息 ===`);
        
        const resources = this.getBundleResourceList(bundleName);
        const stats = this.getResourceStats(bundleName);

        Log.log(this.MODULE_NAME, `总资源数量: ${resources.length}`);
        Log.log(this.MODULE_NAME, `资源类型统计:`, stats);

        // 显示SpriteFrame资源
        const spriteFrames = resources.filter(r => r.type === 'SpriteFrame');
        if (spriteFrames.length > 0) {
            Log.log(this.MODULE_NAME, `SpriteFrame资源 (${spriteFrames.length}个):`);
            spriteFrames.forEach(sf => {
                Log.log(this.MODULE_NAME, `  - ${sf.name} -> ${sf.fullPath}`);
            });
        }

        // 显示Material资源
        const materials = resources.filter(r => r.type === 'Material');
        if (materials.length > 0) {
            Log.log(this.MODULE_NAME, `Material资源 (${materials.length}个):`);
            materials.forEach(mat => {
                Log.log(this.MODULE_NAME, `  - ${mat.name} -> ${mat.fullPath}`);
            });
        }

        // 显示Effect资源
        const effects = resources.filter(r => r.type === 'Effect');
        if (effects.length > 0) {
            Log.log(this.MODULE_NAME, `Effect资源 (${effects.length}个):`);
            effects.forEach(eff => {
                Log.log(this.MODULE_NAME, `  - ${eff.name} -> ${eff.fullPath}`);
            });
        }
    }

    /**
     * 智能搜索资源（支持模糊匹配和多种命名规则）
     */
    public smartSearchSprite(bundleName: string, spriteName: string): ResourceInfo[] {
        const allResources = this.getBundleResourceList(bundleName);
        const spriteFrames = allResources.filter(r => r.type === 'SpriteFrame');
        
        const results: ResourceInfo[] = [];
        const searchName = spriteName.toLowerCase();

        // 1. 精确匹配
        let exactMatch = spriteFrames.find(sf => sf.name.toLowerCase() === searchName);
        if (exactMatch) {
            results.push(exactMatch);
        }

        // 2. 带前缀匹配 (CK_, GN_, CH_等)
        const prefixes = ['CK_', 'GN_', 'CH_', 'Bird_', 'Gun_', ''];
        for (const prefix of prefixes) {
            const prefixedName = prefix + spriteName;
            const match = spriteFrames.find(sf => sf.name.toLowerCase() === prefixedName.toLowerCase());
            if (match && results.indexOf(match) === -1) {
                results.push(match);
            }
        }

        // 3. 包含匹配
        const containsMatches = spriteFrames.filter(sf => 
            sf.name.toLowerCase().includes(searchName) && results.indexOf(sf) === -1
        );
        results.push(...containsMatches);

        // 4. 路径匹配
        const pathMatches = spriteFrames.filter(sf => 
            sf.fullPath.toLowerCase().includes(searchName) && results.indexOf(sf) === -1
        );
        results.push(...pathMatches);

        Log.debug(this.MODULE_NAME, `智能搜索 "${spriteName}" 找到 ${results.length} 个匹配项`);
        return results;
    }
}

// 导出单例实例
export const ResourceLoaderInstance = ResourceLoader.getInstance();