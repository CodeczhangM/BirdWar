import { _decorator, Component, Camera } from 'cc';
import { PostProcessEnv } from './PostProcessEnv';
const { ccclass, property } = _decorator;

@ccclass('CameraController')
export class GameController extends Component {
    @property(Camera)
    mainCamera: Camera = null;
    
    start() {
        // 添加后处理组件
        const postProcessEnv = this.mainCamera.addComponent(PostProcessEnv);
        postProcessEnv.camera = this.mainCamera;
        
        // 设置初始参数
        postProcessEnv.setSunWarmth(0.8);
        postProcessEnv.setFogDensity(0.1);
        postProcessEnv.setSunIntensity(1.2);
    }
}