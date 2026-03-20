import { _decorator, Component, Label, profiler, Color, game } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 性能监控器
 * 实时显示 FPS 信息，并开启 Cocos 内置性能面板
 */
@ccclass('PerformanceMonitor')
export class PerformanceMonitor extends Component {
    @property({ type: Label, tooltip: 'FPS 显示标签' })
    fpsLabel: Label = null;

    @property({ type: Label, tooltip: '综合信息显示标签' })
    infoLabel: Label = null;

    @property({ tooltip: '更新间隔（秒）' })
    updateInterval: number = 0.5;

    @property({ tooltip: '是否启用监控' })
    enableMonitor: boolean = true;

    @property({ tooltip: '显示详细信息' })
    showDetailedInfo: boolean = true;

    @property({ tooltip: '启动时显示 Cocos 内置 profiler' })
    showBuiltinProfiler: boolean = true;

    private _frameCount: number = 0;
    private _lastUpdateTime: number = 0;
    private _currentFPS: number = 0;
    private _minFPS: number = 999;
    private _maxFPS: number = 0;
    private _avgFPS: number = 0;
    private _fpsHistory: number[] = [];
    private readonly _historySize: number = 60;

    onLoad() {
        if (this.showBuiltinProfiler) {
            profiler.showStats();
        }

        this._lastUpdateTime = performance.now() / 1000;
    }

    start() {
        if (!this.enableMonitor) {
            this.node.active = false;
            return;
        }

        if (!this.fpsLabel && !this.infoLabel) {
            this._autoFindLabels();
        }
    }

    update(_deltaTime: number) {
        if (!this.enableMonitor) return;

        this._frameCount++;
        const currentTime = performance.now() / 1000;
        const elapsed = currentTime - this._lastUpdateTime;

        if (elapsed >= this.updateInterval) {
            this._currentFPS = Math.round(this._frameCount / elapsed);
            this._updateFPSStats();
            this._updateDisplay();
            this._frameCount = 0;
            this._lastUpdateTime = currentTime;
        }
    }

    private _updateFPSStats() {
        if (this._currentFPS < this._minFPS) {
            this._minFPS = this._currentFPS;
        }
        if (this._currentFPS > this._maxFPS) {
            this._maxFPS = this._currentFPS;
        }

        this._fpsHistory.push(this._currentFPS);
        if (this._fpsHistory.length > this._historySize) {
            this._fpsHistory.shift();
        }

        const sum = this._fpsHistory.reduce((a, b) => a + b, 0);
        this._avgFPS = this._fpsHistory.length > 0 ? Math.round(sum / this._fpsHistory.length) : 0;
    }

    private _updateDisplay() {
        if (this.fpsLabel) {
            this.fpsLabel.string = `FPS: ${this._currentFPS}`;
            this.fpsLabel.color = this._getFPSColor(this._currentFPS);
        }

        if (this.infoLabel) {
            this.infoLabel.string = this._getDetailedInfo();
        }
    }

    private _getDetailedInfo(): string {
        let info = `FPS: ${this._currentFPS}`;

        if (this.showDetailedInfo) {
            info += `\nAvg: ${this._avgFPS} | Min: ${this._minFPS} | Max: ${this._maxFPS}`;
            info += `\nFrameTime: ${(1000 / Math.max(this._currentFPS, 1)).toFixed(2)} ms`;
            info += `\nGame Delta: ${(game.deltaTime * 1000).toFixed(2)} ms`;
        }

        info += `\nDrawCall / Triangles 请看 Cocos 内置 profiler`;
        return info;
    }

    private _getFPSColor(fps: number): Color {
        if (fps >= 55) {
            return new Color(0, 255, 0, 255);
        } else if (fps >= 30) {
            return new Color(255, 255, 0, 255);
        } else {
            return new Color(255, 0, 0, 255);
        }
    }

    private _autoFindLabels() {
        const children = this.node.children;

        for (const child of children) {
            const label = child.getComponent(Label);
            if (!label) continue;

            const name = child.name.toLowerCase();
            if (name.includes('fps') && !this.fpsLabel) {
                this.fpsLabel = label;
            } else if (name.includes('info') && !this.infoLabel) {
                this.infoLabel = label;
            }
        }
    }

    public resetStats() {
        this._minFPS = 999;
        this._maxFPS = 0;
        this._fpsHistory = [];
        this._avgFPS = 0;
    }

    public toggleMonitor() {
        this.enableMonitor = !this.enableMonitor;
        this.node.active = this.enableMonitor;

        if (this.enableMonitor && this.showBuiltinProfiler) {
            profiler.showStats();
        } else {
            profiler.hideStats();
        }
    }

    public getPerformanceData() {
        return {
            fps: {
                current: this._currentFPS,
                average: this._avgFPS,
                min: this._minFPS,
                max: this._maxFPS,
            },
            frameTimeMs: Number((1000 / Math.max(this._currentFPS, 1)).toFixed(2)),
            deltaTimeMs: Number((game.deltaTime * 1000).toFixed(2)),
            builtinProfilerEnabled: this.showBuiltinProfiler,
        };
    }
}
