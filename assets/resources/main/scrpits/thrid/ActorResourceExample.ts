import { _decorator, Component, Node } from 'cc';
import { ActorController, Chick_Actors, Chick_Guns } from './ActorController';
import { Log } from '../Logger';
const { ccclass, property } = _decorator;

/**
 * 角色资源使用示例
 * 展示如何使用ActorController的资源加载功能
 */
@ccclass('ActorResourceExample')
export class ActorResourceExample extends Component {
    
    @property({ type: ActorController, tooltip: 'ActorController引用' })
    public actorController: ActorController = null;

    private readonly MODULE_NAME = 'ActorResourceExample';

    start() {
        if (!this.actorController) {
            this.actorController = this.node.getComponent(ActorController);
        }
    }

    /**
     * 调试Bundle资源
     */
    public debugBundleResources() {
        if (!this.actorController) {
            Log.warn(this.MODULE_NAME, 'ActorController未设置');
            return;
        }

        Log.log(this.MODULE_NAME, '开始调试Bundle资源');
        this.actorController.debugListBundleResources();
    }

    /**
     * 测试特定资源路径
     */
    public async testSpecificPaths() {
        if (!this.actorController) return;

        const testPaths = [
            'textures/chickens/Chick',
            'textures/chickens/CK_Chick',
            'main/textures/chickens/Chick',
            'main/textures/chickens/CK_Chick',
            'chickens/Chick',
            'chickens/CK_Chick',
            'Chick',
            'CK_Chick'
        ];

        Log.log(this.MODULE_NAME, '测试各种可能的资源路径:');
        
        for (const path of testPaths) {
            const exists = await this.actorController.testResourcePath(path);
            Log.log(this.MODULE_NAME, `${path}: ${exists ? '✓ 存在' : '✗ 不存在'}`);
        }
    }

    /**
     * 增强版测试功能
     */
    public async testWithDebug() {
        Log.log(this.MODULE_NAME, '开始调试测试');
        
        // 首先调试Bundle资源
        this.debugBundleResources();
        
        // 等待1秒
        await this.wait(1000);
        
        // 测试各种路径
        await this.testSpecificPaths();
    }

    /**
     * 等待指定时间
     */
    private wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}