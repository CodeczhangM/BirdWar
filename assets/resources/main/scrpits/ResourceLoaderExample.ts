import { _decorator, Component, Node, Sprite, SpriteFrame, Material, MeshRenderer } from 'cc';
import { ResourceLoaderInstance, ResourceInfo } from './ResourceLoader';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

/**
 * ResourceLoader使用示例
 * 演示如何使用ResourceLoader加载和管理资源
 */
@ccclass('ResourceLoaderExample')
export class ResourceLoaderExample extends Component {
    
    @property({ type: String, tooltip: 'Bundle名称' })
    public bundleName: string = 'resources';

    @property({ type: Node, tooltip: '显示精灵的节点' })
    public spriteNode: Node = null;

    @property({ type: Node, tooltip: '应用材质的3D节点' })
    public meshNode: Node = null;

    private readonly MODULE_NAME = 'ResourceLoaderExample';

    start() {
        this.runExamples();
    }

    /**
     * 运行所有示例
     */
    private async runExamples() {
        Log.log(this.MODULE_NAME, '=== ResourceLoader 使用示例开始 ===');

        // 示例1: 获取Bundle资源列表
        await this.example1_GetBundleResourceList();

        // 示例2: 搜索指定资源
        await this.example2_SearchResources();

        // 示例3: 查找SpriteFrame路径
        await this.example3_FindSpriteFramePath();

        // 示例4: 加载单个SpriteFrame
        await this.example4_LoadSingleSpriteFrame();

        // 示例5: 批量加载SpriteFrame
        await this.example5_BatchLoadSpriteFrames();

        // 示例6: 智能搜索
        await this.example6_SmartSearch();

        // 示例7: 资源统计
        await this.example7_ResourceStats();

        // 示例8: 调试信息
        await this.example8_DebugInfo();

        // 示例9: 材质加载
        await this.example9_MaterialLoading();

        // 示例10: 纹理和音频加载
        await this.example10_TextureAndAudioLoading();

        Log.log(this.MODULE_NAME, '=== ResourceLoader 使用示例结束 ===');
    }

    /**
     * 示例1: 获取Bundle资源列表
     */
    private async example1_GetBundleResourceList() {
        Log.log(this.MODULE_NAME, '--- 示例1: 获取Bundle资源列表 ---');

        const resources = ResourceLoaderInstance.getBundleResourceList(this.bundleName);
        Log.log(this.MODULE_NAME, `Bundle ${this.bundleName} 中共有 ${resources.length} 个资源`);

        // 显示前5个资源作为示例
        const sampleResources = resources.slice(0, 5);
        sampleResources.forEach((resource, index) => {
            Log.log(this.MODULE_NAME, `  ${index + 1}. ${resource.name} (${resource.type}) -> ${resource.fullPath}`);
        });
    }

    /**
     * 示例2: 搜索指定资源
     */
    private async example2_SearchResources() {
        Log.log(this.MODULE_NAME, '--- 示例2: 搜索指定资源 ---');

        // 搜索所有SpriteFrame类型的资源
        const spriteFrames = ResourceLoaderInstance.searchResources(this.bundleName, {
            type: 'SpriteFrame',
            maxResults: 10
        });
        Log.log(this.MODULE_NAME, `找到 ${spriteFrames.length} 个SpriteFrame资源`);

        // 搜索包含'chick'的资源
        const chickResources = ResourceLoaderInstance.searchResources(this.bundleName, {
            name: 'chick',
            caseSensitive: false,
            maxResults: 5
        });
        Log.log(this.MODULE_NAME, `包含'chick'的资源: ${chickResources.length} 个`);
        chickResources.forEach(resource => {
            Log.log(this.MODULE_NAME, `  - ${resource.name} -> ${resource.fullPath}`);
        });

        // 搜索路径包含'chickens'的资源
        const chickensPathResources = ResourceLoaderInstance.searchResources(this.bundleName, {
            pathContains: 'chickens',
            type: 'SpriteFrame',
            maxResults: 5
        });
        Log.log(this.MODULE_NAME, `路径包含'chickens'的SpriteFrame: ${chickensPathResources.length} 个`);
    }

    /**
     * 示例3: 查找SpriteFrame路径
     */
    private async example3_FindSpriteFramePath() {
        Log.log(this.MODULE_NAME, '--- 示例3: 查找SpriteFrame路径 ---');

        const testNames = ['Chick', 'CK_Chick', 'Blitz', 'GN_Blitz'];
        
        for (const name of testNames) {
            const path = ResourceLoaderInstance.findSpriteFramePath(this.bundleName, name);
            if (path) {
                Log.log(this.MODULE_NAME, `✓ ${name} -> ${path}`);
            } else {
                Log.log(this.MODULE_NAME, `✗ ${name} -> 未找到`);
            }
        }
    }

    /**
     * 示例4: 加载单个SpriteFrame
     */
    private async example4_LoadSingleSpriteFrame() {
        Log.log(this.MODULE_NAME, '--- 示例4: 加载单个SpriteFrame ---');

        // 尝试加载一个SpriteFrame
        const testNames = ['Chick', 'CK_Chick', 'Blitz', 'GN_Blitz'];
        
        for (const name of testNames) {
            const spriteFrame = await ResourceLoaderInstance.loadSpriteFrame(this.bundleName, name);
            if (spriteFrame) {
                Log.log(this.MODULE_NAME, `✓ ${name} 加载成功`);
                
                // 如果有显示节点，显示这个精灵
                if (this.spriteNode) {
                    const sprite = this.spriteNode.getComponent(Sprite);
                    if (sprite) {
                        sprite.spriteFrame = spriteFrame;
                        Log.log(this.MODULE_NAME, `已将 ${name} 显示在节点上`);
                    }
                }
                break; // 成功加载一个就退出
            } else {
                Log.log(this.MODULE_NAME, `✗ ${name} 加载失败`);
            }
        }
    }

    /**
     * 示例5: 批量加载SpriteFrame
     */
    private async example5_BatchLoadSpriteFrames() {
        Log.log(this.MODULE_NAME, '--- 示例5: 批量加载SpriteFrame ---');

        const spriteNames = ['Chick', 'CK_Chick', 'Cluck', 'CK_Cluck', 'Blitz', 'GN_Blitz'];
        const spriteMap = await ResourceLoaderInstance.loadSpriteFrames(this.bundleName, spriteNames);

        let successCount = 0;
        let failCount = 0;

        spriteMap.forEach((spriteFrame, name) => {
            if (spriteFrame) {
                Log.log(this.MODULE_NAME, `✓ ${name} 批量加载成功`);
                successCount++;
            } else {
                Log.log(this.MODULE_NAME, `✗ ${name} 批量加载失败`);
                failCount++;
            }
        });

        Log.log(this.MODULE_NAME, `批量加载结果: 成功 ${successCount}, 失败 ${failCount}`);
    }

    /**
     * 示例6: 智能搜索
     */
    private async example6_SmartSearch() {
        Log.log(this.MODULE_NAME, '--- 示例6: 智能搜索 ---');

        const testNames = ['Chick', 'Blitz', 'Hawk', 'Pip'];
        
        for (const name of testNames) {
            const results = ResourceLoaderInstance.smartSearchSprite(this.bundleName, name);
            Log.log(this.MODULE_NAME, `智能搜索 "${name}" 找到 ${results.length} 个匹配项:`);
            
            results.forEach((result, index) => {
                Log.log(this.MODULE_NAME, `  ${index + 1}. ${result.name} -> ${result.fullPath}`);
            });
        }
    }

    /**
     * 示例7: 资源统计
     */
    private async example7_ResourceStats() {
        Log.log(this.MODULE_NAME, '--- 示例7: 资源统计 ---');

        const stats = ResourceLoaderInstance.getResourceStats(this.bundleName);
        Log.log(this.MODULE_NAME, `Bundle ${this.bundleName} 资源统计:`);
        
        for (const type in stats) {
            if (stats.hasOwnProperty(type)) {
                Log.log(this.MODULE_NAME, `  ${type}: ${stats[type]} 个`);
            }
        }
    }

    /**
     * 示例8: 调试信息
     */
    private async example8_DebugInfo() {
        Log.log(this.MODULE_NAME, '--- 示例8: 调试信息 ---');

        // 打印详细的Bundle信息
        ResourceLoaderInstance.debugPrintBundleInfo(this.bundleName);
    }

    /**
     * 示例9: 材质加载
     */
    private async example9_MaterialLoading() {
        Log.log(this.MODULE_NAME, '--- 示例9: 材质加载 ---');

        // 搜索材质资源
        const materials = ResourceLoaderInstance.searchResources(this.bundleName, {
            type: 'Material',
            maxResults: 5
        });
        Log.log(this.MODULE_NAME, `找到 ${materials.length} 个Material资源`);

        if (materials.length > 0) {
            // 显示找到的材质
            materials.forEach(mat => {
                Log.log(this.MODULE_NAME, `  - ${mat.name} -> ${mat.fullPath}`);
            });

            // 尝试加载第一个材质
            const firstMaterial = materials[0];
            Log.log(this.MODULE_NAME, `尝试加载材质: ${firstMaterial.name}`);
            
            const material = await ResourceLoaderInstance.loadMaterial(this.bundleName, firstMaterial.name);
            if (material) {
                Log.log(this.MODULE_NAME, `✓ 材质 ${firstMaterial.name} 加载成功`);
                
                // 如果有3D节点，应用材质
                if (this.meshNode) {
                    const meshRenderer = this.meshNode.getComponent(MeshRenderer);
                    if (meshRenderer) {
                        meshRenderer.material = material;
                        Log.log(this.MODULE_NAME, `已将材质应用到3D节点`);
                    }
                }
            } else {
                Log.log(this.MODULE_NAME, `✗ 材质 ${firstMaterial.name} 加载失败`);
            }

            // 测试智能搜索材质
            const smartResults = ResourceLoaderInstance.smartSearchMaterial(this.bundleName, 'env');
            Log.log(this.MODULE_NAME, `智能搜索 "env" 材质找到 ${smartResults.length} 个匹配项`);
            smartResults.forEach(result => {
                Log.log(this.MODULE_NAME, `  - ${result.name} -> ${result.fullPath}`);
            });

            // 批量加载材质
            const materialNames = materials.slice(0, 3).map(m => m.name);
            if (materialNames.length > 0) {
                Log.log(this.MODULE_NAME, `批量加载 ${materialNames.length} 个材质`);
                const materialMap = await ResourceLoaderInstance.loadMaterials(this.bundleName, materialNames);
                
                let successCount = 0;
                materialMap.forEach((mat, name) => {
                    if (mat) {
                        Log.log(this.MODULE_NAME, `✓ 材质 ${name} 批量加载成功`);
                        successCount++;
                    } else {
                        Log.log(this.MODULE_NAME, `✗ 材质 ${name} 批量加载失败`);
                    }
                });
                Log.log(this.MODULE_NAME, `材质批量加载结果: 成功 ${successCount}/${materialNames.length}`);
            }
        } else {
            Log.log(this.MODULE_NAME, '未找到任何材质资源');
        }
    }

    /**
     * 示例10: 纹理和音频加载
     */
    private async example10_TextureAndAudioLoading() {
        Log.log(this.MODULE_NAME, '--- 示例10: 纹理和音频加载 ---');

        // 搜索纹理资源
        const textures = ResourceLoaderInstance.searchResources(this.bundleName, {
            type: 'Texture2D',
            maxResults: 3
        });
        Log.log(this.MODULE_NAME, `找到 ${textures.length} 个Texture2D资源`);

        if (textures.length > 0) {
            const firstTexture = textures[0];
            Log.log(this.MODULE_NAME, `尝试加载纹理: ${firstTexture.name}`);
            
            const texture = await ResourceLoaderInstance.loadTexture2D(this.bundleName, firstTexture.name);
            if (texture) {
                Log.log(this.MODULE_NAME, `✓ 纹理 ${firstTexture.name} 加载成功，尺寸: ${texture.width}x${texture.height}`);
            } else {
                Log.log(this.MODULE_NAME, `✗ 纹理 ${firstTexture.name} 加载失败`);
            }
        }

        // 搜索音频资源
        const audioClips = ResourceLoaderInstance.searchResources(this.bundleName, {
            type: 'AudioClip',
            maxResults: 3
        });
        Log.log(this.MODULE_NAME, `找到 ${audioClips.length} 个AudioClip资源`);

        if (audioClips.length > 0) {
            const firstAudio = audioClips[0];
            Log.log(this.MODULE_NAME, `尝试加载音频: ${firstAudio.name}`);
            
            const audioClip = await ResourceLoaderInstance.loadAudioClip(this.bundleName, firstAudio.name);
            if (audioClip) {
                Log.log(this.MODULE_NAME, `✓ 音频 ${firstAudio.name} 加载成功`);
            } else {
                Log.log(this.MODULE_NAME, `✗ 音频 ${firstAudio.name} 加载失败`);
            }
        }
    }

    /**
     * 测试预加载功能
     */
    public async testPreload() {
        Log.log(this.MODULE_NAME, '--- 测试预加载功能 ---');

        // 获取一些SpriteFrame路径
        const spriteFrames = ResourceLoaderInstance.searchResources(this.bundleName, {
            type: 'SpriteFrame',
            maxResults: 5
        });

        const pathsToPreload = spriteFrames.map(sf => sf.fullPath);
        
        if (pathsToPreload.length > 0) {
            Log.log(this.MODULE_NAME, `开始预加载 ${pathsToPreload.length} 个资源`);
            await ResourceLoaderInstance.preloadResources(this.bundleName, pathsToPreload);
            Log.log(this.MODULE_NAME, '预加载完成');
        } else {
            Log.log(this.MODULE_NAME, '没有找到可预加载的资源');
        }
    }

    /**
     * 测试缓存清理
     */
    public testCacheClear() {
        Log.log(this.MODULE_NAME, '--- 测试缓存清理 ---');

        // 清理指定Bundle的缓存
        ResourceLoaderInstance.clearCache(this.bundleName);
        Log.log(this.MODULE_NAME, `已清理 ${this.bundleName} 的缓存`);

        // 重新获取资源列表（会重新扫描）
        const resources = ResourceLoaderInstance.getBundleResourceList(this.bundleName);
        Log.log(this.MODULE_NAME, `重新扫描后找到 ${resources.length} 个资源`);
    }

    /**
     * 手动触发示例（可在编辑器中调用）
     */
    public runExample1() { this.example1_GetBundleResourceList(); }
    public runExample2() { this.example2_SearchResources(); }
    public runExample3() { this.example3_FindSpriteFramePath(); }
    public runExample4() { this.example4_LoadSingleSpriteFrame(); }
    public runExample5() { this.example5_BatchLoadSpriteFrames(); }
    public runExample6() { this.example6_SmartSearch(); }
    public runExample7() { this.example7_ResourceStats(); }
    public runExample8() { this.example8_DebugInfo(); }
    public runExample9() { this.example9_MaterialLoading(); }
    public runExample10() { this.example10_TextureAndAudioLoading(); }
}