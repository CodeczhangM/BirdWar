import { _decorator, Component, Camera, postProcess, Material } from 'cc';
import { Log } from '../Logger';
import { ResourceLoaderInstance } from '../ResourceLoader';

const { ccclass, property } = _decorator;

/**
 * 环境后处理控制器
 * 用于控制环境后处理效果的参数
 */
@ccclass('PostProcessEnv')
export class PostProcessEnv extends Component {

    @property({ type: Camera, tooltip: '目标摄像机' })
    public camera: Camera = null;

    @property({ type: Material, tooltip: '后处理材质' })
    public postProcessMaterial: Material = null;

    @property({ type: Boolean, tooltip: '自动加载材质' })
    public autoLoadMaterial: boolean = true;

    @property({ type: String, tooltip: '材质名称' })
    public materialName: string = 'env-post-mtl';

    @property({ type: String, tooltip: '材质Bundle名称' })
    public materialBundle: string = 'game';

    @property({ type: Boolean, tooltip: '启用后处理' })
    public enablePostProcess: boolean = true;

    // 环境参数
    @property({ type: Number, range: [0, 1], tooltip: '阳光暖度' })
    public sunWarmth: number = 0.6;

    @property({ type: Number, range: [0, 1], tooltip: '雾密度' })
    public fogDensity: number = 0.08;

    @property({ type: Number, range: [0, 2], tooltip: '阳光强度' })
    public sunIntensity: number = 0.8;

    @property({ tooltip: '环境光颜色' })
    public ambientLightColor: { r: number, g: number, b: number, a: number } = { r: 1, g: 1, b: 1, a: 1 };

    @property({ tooltip: '雾颜色' })
    public fogColor: { r: number, g: number, b: number, a: number } = { r: 1, g: 1, b: 1, a: 1 };

    private readonly MODULE_NAME = 'PostProcessEnv';
    private _isLoadingMaterial: boolean = false;

    start() {
        this.initializePostProcess();
    }

    /**
     * 初始化后处理
     */
    private async initializePostProcess() {
        if (!this.camera) {
            Log.error(this.MODULE_NAME, '摄像机未设置');
            return;
        }

        if (!this.enablePostProcess) {
            Log.log(this.MODULE_NAME, '后处理已禁用');
            return;
        }

        try {
            // 获取或创建后处理组件
            let postProcessComponent = this.camera.getComponent(postProcess.PostProcess);
            if (!postProcessComponent) {
                postProcessComponent = this.camera.addComponent(postProcess.PostProcess);
                Log.log(this.MODULE_NAME, '已添加后处理组件');
            }

            // 如果启用自动加载材质且没有设置自定义材质，则加载材质
            if (this.autoLoadMaterial && !this.postProcessMaterial) {
                await this.loadPostProcessMaterial();
            }

            // 应用材质和参数
            this.applyPostProcessSettings();

        } catch (error) {
            Log.error(this.MODULE_NAME, '初始化后处理失败:', error);
        }
    }

    /**
     * 加载后处理材质
     */
    private async loadPostProcessMaterial(): Promise<void> {
        if (this._isLoadingMaterial) {
            Log.debug(this.MODULE_NAME, '材质正在加载中，跳过重复加载');
            return;
        }

        this._isLoadingMaterial = true;

        try {
            Log.log(this.MODULE_NAME, `开始加载材质: ${this.materialName} from bundle: ${this.materialBundle}`);

            // 使用 ResourceLoader 加载材质
            const material = await ResourceLoaderInstance.loadMaterial(this.materialBundle, this.materialName);
            
            if (material) {
                this.postProcessMaterial = material;
                Log.log(this.MODULE_NAME, `材质加载成功: ${this.materialName}`);
                
                // 重新应用后处理设置
                this.applyPostProcessSettings();
            } else {
                Log.error(this.MODULE_NAME, `材质加载失败: ${this.materialName}`);
                
                // 尝试智能搜索材质
                await this.trySmartLoadMaterial();
            }

        } catch (error) {
            Log.error(this.MODULE_NAME, '加载材质时发生异常:', error);
            
            // 尝试智能搜索材质
            await this.trySmartLoadMaterial();
        } finally {
            this._isLoadingMaterial = false;
        }
    }

    /**
     * 尝试智能搜索并加载材质
     */
    private async trySmartLoadMaterial(): Promise<void> {
        try {
            Log.log(this.MODULE_NAME, '尝试智能搜索材质...');
            
            // 使用智能搜索查找材质
            const searchResults = ResourceLoaderInstance.smartSearchMaterial(this.materialBundle, 'env');
            
            if (searchResults.length > 0) {
                Log.log(this.MODULE_NAME, `找到 ${searchResults.length} 个可能的材质:`);
                searchResults.forEach((result, index) => {
                    Log.log(this.MODULE_NAME, `  ${index + 1}. ${result.name} -> ${result.fullPath}`);
                });

                // 尝试加载第一个匹配的材质
                const firstResult = searchResults[0];
                const material = await ResourceLoaderInstance.loadMaterial(this.materialBundle, firstResult.name);
                
                if (material) {
                    this.postProcessMaterial = material;
                    Log.log(this.MODULE_NAME, `智能搜索材质加载成功: ${firstResult.name}`);
                    
                    // 重新应用后处理设置
                    this.applyPostProcessSettings();
                } else {
                    Log.warn(this.MODULE_NAME, `智能搜索材质加载失败: ${firstResult.name}`);
                }
            } else {
                Log.warn(this.MODULE_NAME, '智能搜索未找到匹配的材质');
                
                // 显示可用的材质列表
                this.debugAvailableMaterials();
            }

        } catch (error) {
            Log.error(this.MODULE_NAME, '智能搜索材质时发生异常:', error);
        }
    }

    /**
     * 调试显示可用材质
     */
    private debugAvailableMaterials(): void {
        try {
            const materials = ResourceLoaderInstance.searchResources(this.materialBundle, {
                type: 'Material',
                maxResults: 10
            });

            if (materials.length > 0) {
                Log.log(this.MODULE_NAME, `Bundle ${this.materialBundle} 中可用的材质:`);
                materials.forEach((material, index) => {
                    Log.log(this.MODULE_NAME, `  ${index + 1}. ${material.name} -> ${material.fullPath}`);
                });
            } else {
                Log.warn(this.MODULE_NAME, `Bundle ${this.materialBundle} 中未找到任何材质`);
            }

        } catch (error) {
            Log.error(this.MODULE_NAME, '获取可用材质列表失败:', error);
        }
    }

    /**
     * 应用后处理设置
     */
    private applyPostProcessSettings() {
        if (!this.camera) return;

        const postProcessComponent = this.camera.getComponent(postProcess.PostProcess);
        if (!postProcessComponent) {
            Log.warn(this.MODULE_NAME, '后处理组件未找到');
            return;
        }

        try {
            // 如果有自定义材质，使用自定义材质
            if (this.postProcessMaterial) {
                this.updateMaterialProperties(this.postProcessMaterial);
                Log.log(this.MODULE_NAME, '使用自定义后处理材质');
            } else {
                // 尝试获取默认材质
                this.tryApplyToDefaultMaterial(postProcessComponent);
            }

        } catch (error) {
            Log.error(this.MODULE_NAME, '应用后处理设置失败:', error);
        }
    }

    /**
     * 尝试应用到默认材质
     */
    private tryApplyToDefaultMaterial(postProcessComponent: any) {
        // 注意：这里的实现可能需要根据具体的Cocos Creator版本调整
        if (postProcessComponent.material) {
            this.updateMaterialProperties(postProcessComponent.material);
            Log.log(this.MODULE_NAME, '使用默认后处理材质');
        } else {
            Log.warn(this.MODULE_NAME, '未找到后处理材质');
        }
    }

    /**
     * 更新材质属性
     */
    private updateMaterialProperties(material: Material) {
        if (!material) return;

        try {
            // 设置环境参数
            material.setProperty('u_sunWarmth', this.sunWarmth);
            material.setProperty('u_fogDensity', this.fogDensity);
            material.setProperty('u_sunIntensity', this.sunIntensity);
            
            // 设置颜色参数
            material.setProperty('u_ambientLight', [
                this.ambientLightColor.r,
                this.ambientLightColor.g,
                this.ambientLightColor.b,
                this.ambientLightColor.a
            ]);
            
            material.setProperty('u_fogColor', [
                this.fogColor.r,
                this.fogColor.g,
                this.fogColor.b,
                this.fogColor.a
            ]);

            Log.log(this.MODULE_NAME, '材质属性更新完成');

        } catch (error) {
            Log.error(this.MODULE_NAME, '更新材质属性失败:', error);
        }
    }

    /**
     * 设置阳光暖度
     */
    public setSunWarmth(value: number) {
        this.sunWarmth = Math.max(0, Math.min(1, value));
        this.updateCurrentMaterial();
    }

    /**
     * 设置雾密度
     */
    public setFogDensity(value: number) {
        this.fogDensity = Math.max(0, Math.min(1, value));
        this.updateCurrentMaterial();
    }

    /**
     * 设置阳光强度
     */
    public setSunIntensity(value: number) {
        this.sunIntensity = Math.max(0, Math.min(2, value));
        this.updateCurrentMaterial();
    }

    /**
     * 设置环境光颜色
     */
    public setAmbientLightColor(r: number, g: number, b: number, a: number = 1) {
        this.ambientLightColor = { r, g, b, a };
        this.updateCurrentMaterial();
    }

    /**
     * 设置雾颜色
     */
    public setFogColor(r: number, g: number, b: number, a: number = 1) {
        this.fogColor = { r, g, b, a };
        this.updateCurrentMaterial();
    }

    /**
     * 重新加载材质
     */
    public async reloadMaterial(): Promise<boolean> {
        Log.log(this.MODULE_NAME, '重新加载材质...');
        
        // 清除当前材质
        this.postProcessMaterial = null;
        
        // 重新加载
        await this.loadPostProcessMaterial();
        
        return !!this.postProcessMaterial;
    }

    /**
     * 设置材质名称并重新加载
     */
    public async setMaterialName(materialName: string, bundleName?: string): Promise<boolean> {
        this.materialName = materialName;
        if (bundleName) {
            this.materialBundle = bundleName;
        }
        
        Log.log(this.MODULE_NAME, `设置材质名称: ${materialName} (bundle: ${this.materialBundle})`);
        
        return await this.reloadMaterial();
    }

    /**
     * 更新当前材质
     */
    private updateCurrentMaterial() {
        if (!this.camera) return;

        const material = this.postProcessMaterial;
        if (material) {
            this.updateMaterialProperties(material);
        } else {
            const postProcessComponent = this.camera.getComponent(postProcess.PostProcess);
            if (postProcessComponent && (postProcessComponent as any).material) {
                this.updateMaterialProperties((postProcessComponent as any).material);
            }
        }
    }

    /**
     * 启用/禁用后处理
     */
    public setPostProcessEnabled(enabled: boolean) {
        this.enablePostProcess = enabled;
        
        if (!this.camera) return;

        const postProcessComponent = this.camera.getComponent(postProcess.PostProcess);
        if (postProcessComponent) {
            postProcessComponent.enabled = enabled;
            Log.log(this.MODULE_NAME, `后处理${enabled ? '启用' : '禁用'}`);
        }
    }

    /**
     * 重置为默认值
     */
    public resetToDefaults() {
        this.sunWarmth = 0.6;
        this.fogDensity = 0.08;
        this.sunIntensity = 0.8;
        this.ambientLightColor = { r: 1, g: 1, b: 1, a: 1 };
        this.fogColor = { r: 1, g: 1, b: 1, a: 1 };
        
        this.updateCurrentMaterial();
        Log.log(this.MODULE_NAME, '已重置为默认值');
    }

    /**
     * 获取当前设置
     */
    public getCurrentSettings() {
        return {
            sunWarmth: this.sunWarmth,
            fogDensity: this.fogDensity,
            sunIntensity: this.sunIntensity,
            ambientLightColor: { ...this.ambientLightColor },
            fogColor: { ...this.fogColor },
            enabled: this.enablePostProcess
        };
    }

    /**
     * 应用设置
     */
    public applySettings(settings: any) {
        if (settings.sunWarmth !== undefined) this.sunWarmth = settings.sunWarmth;
        if (settings.fogDensity !== undefined) this.fogDensity = settings.fogDensity;
        if (settings.sunIntensity !== undefined) this.sunIntensity = settings.sunIntensity;
        if (settings.ambientLightColor) this.ambientLightColor = { ...settings.ambientLightColor };
        if (settings.fogColor) this.fogColor = { ...settings.fogColor };
        if (settings.enabled !== undefined) this.enablePostProcess = settings.enabled;

        this.applyPostProcessSettings();
        Log.log(this.MODULE_NAME, '设置已应用');
    }

    /**
     * 调试信息
     */
    public debugInfo() {
        Log.log(this.MODULE_NAME, '=== PostProcessEnv 调试信息 ===');
        Log.log(this.MODULE_NAME, '当前设置:', this.getCurrentSettings());
        
        if (this.camera) {
            const postProcessComponent = this.camera.getComponent(postProcess.PostProcess);
            Log.log(this.MODULE_NAME, '后处理组件存在:', !!postProcessComponent);
            Log.log(this.MODULE_NAME, '后处理组件启用:', postProcessComponent?.enabled);
        } else {
            Log.log(this.MODULE_NAME, '摄像机未设置');
        }
        
        Log.log(this.MODULE_NAME, '自定义材质:', !!this.postProcessMaterial);
        Log.log(this.MODULE_NAME, '自动加载材质:', this.autoLoadMaterial);
        Log.log(this.MODULE_NAME, '材质名称:', this.materialName);
        Log.log(this.MODULE_NAME, '材质Bundle:', this.materialBundle);
        Log.log(this.MODULE_NAME, '正在加载材质:', this._isLoadingMaterial);
        
        if (this.postProcessMaterial) {
            Log.log(this.MODULE_NAME, '材质名称:', this.postProcessMaterial.name);
            Log.log(this.MODULE_NAME, '材质有效:', this.postProcessMaterial.isValid);
        }
    }
}