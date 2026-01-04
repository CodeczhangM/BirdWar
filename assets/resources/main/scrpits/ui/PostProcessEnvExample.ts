import { _decorator, Component, Node, Button, Slider, Label, Camera } from 'cc';
import { PostProcessEnv } from './PostProcessEnv';
import { Log } from '../Logger';

const { ccclass, property } = _decorator;

/**
 * PostProcessEnv 使用示例
 * 演示如何使用后处理环境控制器
 */
@ccclass('PostProcessEnvExample')
export class PostProcessEnvExample extends Component {
    
    @property({ type: PostProcessEnv, tooltip: '后处理环境控制器' })
    public postProcessEnv: PostProcessEnv = null;

    @property({ type: Camera, tooltip: '目标摄像机' })
    public targetCamera: Camera = null;

    // UI 控件
    @property({ type: Slider, tooltip: '阳光暖度滑块' })
    public sunWarmthSlider: Slider = null;

    @property({ type: Slider, tooltip: '雾密度滑块' })
    public fogDensitySlider: Slider = null;

    @property({ type: Slider, tooltip: '阳光强度滑块' })
    public sunIntensitySlider: Slider = null;

    @property({ type: Label, tooltip: '阳光暖度标签' })
    public sunWarmthLabel: Label = null;

    @property({ type: Label, tooltip: '雾密度标签' })
    public fogDensityLabel: Label = null;

    @property({ type: Label, tooltip: '阳光强度标签' })
    public sunIntensityLabel: Label = null;

    @property({ type: [Button], tooltip: '预设按钮列表' })
    public presetButtons: Button[] = [];

    @property({ type: Button, tooltip: '重置按钮' })
    public resetButton: Button = null;

    @property({ type: Button, tooltip: '启用/禁用按钮' })
    public toggleButton: Button = null;

    @property({ type: Button, tooltip: '调试信息按钮' })
    public debugButton: Button = null;

    @property({ type: Button, tooltip: '重新加载材质按钮' })
    public reloadMaterialButton: Button = null;

    @property({ type: Button, tooltip: '显示可用材质按钮' })
    public showMaterialsButton: Button = null;

    private readonly MODULE_NAME = 'PostProcessEnvExample';

    start() {
        this.initializePostProcessEnv();
        this.setupUI();
        this.runExamples();
    }

    /**
     * 初始化后处理环境控制器
     */
    private initializePostProcessEnv() {
        if (!this.postProcessEnv && this.targetCamera) {
            // 如果没有设置后处理控制器，尝试从摄像机节点获取
            this.postProcessEnv = this.targetCamera.getComponent(PostProcessEnv);
            
            if (!this.postProcessEnv) {
                // 如果还没有，就添加一个
                this.postProcessEnv = this.targetCamera.addComponent(PostProcessEnv);
                this.postProcessEnv.camera = this.targetCamera;
                Log.log(this.MODULE_NAME, '已自动添加PostProcessEnv组件');
            }
        }

        if (this.postProcessEnv) {
            Log.log(this.MODULE_NAME, 'PostProcessEnv初始化完成');
        } else {
            Log.error(this.MODULE_NAME, 'PostProcessEnv未设置');
        }
    }

    /**
     * 设置UI事件
     */
    private setupUI() {
        // 设置滑块事件
        if (this.sunWarmthSlider) {
            this.sunWarmthSlider.node.on('slide', this.onSunWarmthChanged, this);
            this.sunWarmthSlider.progress = 0.6; // 默认值
        }

        if (this.fogDensitySlider) {
            this.fogDensitySlider.node.on('slide', this.onFogDensityChanged, this);
            this.fogDensitySlider.progress = 0.08; // 默认值
        }

        if (this.sunIntensitySlider) {
            this.sunIntensitySlider.node.on('slide', this.onSunIntensityChanged, this);
            this.sunIntensitySlider.progress = 0.4; // 0.8 / 2.0 = 0.4
        }

        // 设置预设按钮
        if (this.presetButtons.length >= 4) {
            this.presetButtons[0].node.on(Button.EventType.CLICK, () => this.applyPreset('sunny'), this);
            this.presetButtons[1].node.on(Button.EventType.CLICK, () => this.applyPreset('foggy'), this);
            this.presetButtons[2].node.on(Button.EventType.CLICK, () => this.applyPreset('warm'), this);
            this.presetButtons[3].node.on(Button.EventType.CLICK, () => this.applyPreset('cool'), this);
        }

        // 设置功能按钮
        if (this.resetButton) {
            this.resetButton.node.on(Button.EventType.CLICK, this.resetToDefaults, this);
        }

        if (this.toggleButton) {
            this.toggleButton.node.on(Button.EventType.CLICK, this.togglePostProcess, this);
        }

        if (this.debugButton) {
            this.debugButton.node.on(Button.EventType.CLICK, this.showDebugInfo, this);
        }

        if (this.reloadMaterialButton) {
            this.reloadMaterialButton.node.on(Button.EventType.CLICK, this.reloadMaterial, this);
        }

        if (this.showMaterialsButton) {
            this.showMaterialsButton.node.on(Button.EventType.CLICK, this.showAvailableMaterials, this);
        }

        // 更新初始UI显示
        this.updateUILabels();
    }

    /**
     * 运行示例
     */
    private async runExamples() {
        Log.log(this.MODULE_NAME, '=== PostProcessEnv 使用示例开始 ===');

        if (!this.postProcessEnv) {
            Log.error(this.MODULE_NAME, 'PostProcessEnv未设置，无法运行示例');
            return;
        }

        // 等待初始化完成
        await this.delay(1000);

        // 示例1: 基础参数设置
        await this.example1_BasicSettings();

        await this.delay(2000);

        // 示例2: 颜色设置
        await this.example2_ColorSettings();

        await this.delay(2000);

        // 示例3: 预设应用
        await this.example3_PresetApplication();

        await this.delay(2000);

        // 示例4: 材质加载测试
        await this.example4_MaterialLoading();

        Log.log(this.MODULE_NAME, '=== PostProcessEnv 使用示例结束 ===');
    }

    /**
     * 示例1: 基础参数设置
     */
    private async example1_BasicSettings() {
        Log.log(this.MODULE_NAME, '--- 示例1: 基础参数设置 ---');

        // 设置阳光暖度
        this.postProcessEnv.setSunWarmth(0.8);
        Log.log(this.MODULE_NAME, '设置阳光暖度: 0.8');

        await this.delay(1000);

        // 设置雾密度
        this.postProcessEnv.setFogDensity(0.15);
        Log.log(this.MODULE_NAME, '设置雾密度: 0.15');

        await this.delay(1000);

        // 设置阳光强度
        this.postProcessEnv.setSunIntensity(1.2);
        Log.log(this.MODULE_NAME, '设置阳光强度: 1.2');
    }

    /**
     * 示例2: 颜色设置
     */
    private async example2_ColorSettings() {
        Log.log(this.MODULE_NAME, '--- 示例2: 颜色设置 ---');

        // 设置暖色调环境光
        this.postProcessEnv.setAmbientLightColor(1.0, 0.9, 0.7, 1.0);
        Log.log(this.MODULE_NAME, '设置暖色调环境光');

        await this.delay(1000);

        // 设置蓝色雾
        this.postProcessEnv.setFogColor(0.7, 0.8, 1.0, 0.5);
        Log.log(this.MODULE_NAME, '设置蓝色雾');
    }

    /**
     * 示例3: 预设应用
     */
    private async example3_PresetApplication() {
        Log.log(this.MODULE_NAME, '--- 示例3: 预设应用 ---');

        const presets = ['sunny', 'foggy', 'warm', 'cool'];
        
        for (const preset of presets) {
            this.applyPreset(preset);
            Log.log(this.MODULE_NAME, `应用预设: ${preset}`);
            await this.delay(1500);
        }
    }

    /**
     * 示例4: 材质加载测试
     */
    private async example4_MaterialLoading() {
        Log.log(this.MODULE_NAME, '--- 示例4: 材质加载测试 ---');

        if (!this.postProcessEnv) return;

        // 测试重新加载材质
        Log.log(this.MODULE_NAME, '测试重新加载材质...');
        const reloadSuccess = await this.postProcessEnv.reloadMaterial();
        Log.log(this.MODULE_NAME, `材质重新加载${reloadSuccess ? '成功' : '失败'}`);

        await this.delay(1000);

        // 测试设置不同的材质名称
        Log.log(this.MODULE_NAME, '测试设置不同的材质名称...');
        const setMaterialSuccess = await this.postProcessEnv.setMaterialName('env-post-effect', 'game');
        Log.log(this.MODULE_NAME, `设置材质名称${setMaterialSuccess ? '成功' : '失败'}`);

        await this.delay(1000);

        // 恢复原始材质名称
        Log.log(this.MODULE_NAME, '恢复原始材质名称...');
        await this.postProcessEnv.setMaterialName('env-post-mtl', 'game');
    }

    // ========== UI 事件处理 ==========

    /**
     * 阳光暖度改变
     */
    private onSunWarmthChanged(slider: Slider) {
        if (this.postProcessEnv) {
            this.postProcessEnv.setSunWarmth(slider.progress);
            this.updateUILabels();
        }
    }

    /**
     * 雾密度改变
     */
    private onFogDensityChanged(slider: Slider) {
        if (this.postProcessEnv) {
            this.postProcessEnv.setFogDensity(slider.progress);
            this.updateUILabels();
        }
    }

    /**
     * 阳光强度改变
     */
    private onSunIntensityChanged(slider: Slider) {
        if (this.postProcessEnv) {
            // 滑块值 0-1 映射到 0-2
            this.postProcessEnv.setSunIntensity(slider.progress * 2);
            this.updateUILabels();
        }
    }

    /**
     * 应用预设
     */
    private applyPreset(presetName: string) {
        if (!this.postProcessEnv) return;

        const presets = {
            sunny: {
                sunWarmth: 0.9,
                fogDensity: 0.02,
                sunIntensity: 1.5,
                ambientLightColor: { r: 1.0, g: 0.95, b: 0.8, a: 1.0 },
                fogColor: { r: 1.0, g: 1.0, b: 0.9, a: 0.3 }
            },
            foggy: {
                sunWarmth: 0.3,
                fogDensity: 0.25,
                sunIntensity: 0.5,
                ambientLightColor: { r: 0.8, g: 0.8, b: 0.9, a: 1.0 },
                fogColor: { r: 0.9, g: 0.9, b: 1.0, a: 0.8 }
            },
            warm: {
                sunWarmth: 0.8,
                fogDensity: 0.05,
                sunIntensity: 1.2,
                ambientLightColor: { r: 1.0, g: 0.8, b: 0.6, a: 1.0 },
                fogColor: { r: 1.0, g: 0.9, b: 0.7, a: 0.4 }
            },
            cool: {
                sunWarmth: 0.2,
                fogDensity: 0.12,
                sunIntensity: 0.7,
                ambientLightColor: { r: 0.7, g: 0.8, b: 1.0, a: 1.0 },
                fogColor: { r: 0.8, g: 0.9, b: 1.0, a: 0.6 }
            }
        };

        const preset = presets[presetName];
        if (preset) {
            this.postProcessEnv.applySettings(preset);
            this.updateSlidersFromSettings();
            Log.log(this.MODULE_NAME, `应用预设: ${presetName}`);
        }
    }

    /**
     * 重置为默认值
     */
    private resetToDefaults() {
        if (this.postProcessEnv) {
            this.postProcessEnv.resetToDefaults();
            this.updateSlidersFromSettings();
            Log.log(this.MODULE_NAME, '已重置为默认值');
        }
    }

    /**
     * 切换后处理启用状态
     */
    private togglePostProcess() {
        if (this.postProcessEnv) {
            const currentSettings = this.postProcessEnv.getCurrentSettings();
            this.postProcessEnv.setPostProcessEnabled(!currentSettings.enabled);
            
            if (this.toggleButton) {
                const label = this.toggleButton.getComponentInChildren(Label);
                if (label) {
                    label.string = currentSettings.enabled ? '启用' : '禁用';
                }
            }
        }
    }

    /**
     * 显示调试信息
     */
    private showDebugInfo() {
        if (this.postProcessEnv) {
            this.postProcessEnv.debugInfo();
        }
    }

    /**
     * 重新加载材质
     */
    private async reloadMaterial() {
        if (this.postProcessEnv) {
            Log.log(this.MODULE_NAME, '手动重新加载材质...');
            const success = await this.postProcessEnv.reloadMaterial();
            Log.log(this.MODULE_NAME, `材质重新加载${success ? '成功' : '失败'}`);
        }
    }

    /**
     * 显示可用材质
     */
    private showAvailableMaterials() {
        if (this.postProcessEnv) {
            Log.log(this.MODULE_NAME, '显示可用材质列表...');
            // 调用私有方法来显示可用材质（通过调试信息）
            this.postProcessEnv.debugInfo();
        }
    }

    /**
     * 更新UI标签
     */
    private updateUILabels() {
        if (!this.postProcessEnv) return;

        const settings = this.postProcessEnv.getCurrentSettings();

        if (this.sunWarmthLabel) {
            this.sunWarmthLabel.string = `阳光暖度: ${settings.sunWarmth.toFixed(2)}`;
        }

        if (this.fogDensityLabel) {
            this.fogDensityLabel.string = `雾密度: ${settings.fogDensity.toFixed(2)}`;
        }

        if (this.sunIntensityLabel) {
            this.sunIntensityLabel.string = `阳光强度: ${settings.sunIntensity.toFixed(2)}`;
        }
    }

    /**
     * 从设置更新滑块
     */
    private updateSlidersFromSettings() {
        if (!this.postProcessEnv) return;

        const settings = this.postProcessEnv.getCurrentSettings();

        if (this.sunWarmthSlider) {
            this.sunWarmthSlider.progress = settings.sunWarmth;
        }

        if (this.fogDensitySlider) {
            this.fogDensitySlider.progress = settings.fogDensity;
        }

        if (this.sunIntensitySlider) {
            this.sunIntensitySlider.progress = settings.sunIntensity / 2; // 2.0 映射到 1.0
        }

        this.updateUILabels();
    }

    /**
     * 延迟函数
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ========== 公共接口方法 ==========

    /**
     * 手动应用阳光预设
     */
    public applySunnyPreset() {
        this.applyPreset('sunny');
    }

    /**
     * 手动应用雾天预设
     */
    public applyFoggyPreset() {
        this.applyPreset('foggy');
    }

    /**
     * 手动应用暖色预设
     */
    public applyWarmPreset() {
        this.applyPreset('warm');
    }

    /**
     * 手动应用冷色预设
     */
    public applyCoolPreset() {
        this.applyPreset('cool');
    }

    /**
     * 手动重置
     */
    public manualReset() {
        this.resetToDefaults();
    }

    /**
     * 手动切换
     */
    public manualToggle() {
        this.togglePostProcess();
    }

    /**
     * 手动显示调试信息
     */
    public manualDebug() {
        this.showDebugInfo();
    }

    /**
     * 手动重新加载材质
     */
    public async manualReloadMaterial() {
        await this.reloadMaterial();
    }

    /**
     * 手动显示可用材质
     */
    public manualShowMaterials() {
        this.showAvailableMaterials();
    }

    /**
     * 测试材质加载
     */
    public async testMaterialLoading() {
        await this.example4_MaterialLoading();
    }

    /**
     * 获取当前后处理设置
     */
    public getCurrentPostProcessSettings() {
        return this.postProcessEnv ? this.postProcessEnv.getCurrentSettings() : null;
    }

    /**
     * 设置自定义参数
     */
    public setCustomParameters(sunWarmth: number, fogDensity: number, sunIntensity: number) {
        if (this.postProcessEnv) {
            this.postProcessEnv.setSunWarmth(sunWarmth);
            this.postProcessEnv.setFogDensity(fogDensity);
            this.postProcessEnv.setSunIntensity(sunIntensity);
            this.updateSlidersFromSettings();
        }
    }
}