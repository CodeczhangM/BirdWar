import { _decorator, Component, Node } from 'cc';
import { GridManager, GridCoordinate, GridCellType} from '../GridManager';
const { ccclass, property } = _decorator;

@ccclass('GameScene')
export class GameScene extends Component {
    start() {
         this.gridManager.reconfigureGrid({
            rows: 5,
            cols: 9,
            cellWidth: 100,
            cellHeight: 100,
            startPosition: new Vec3(-400, 200, 0),
            showGrid: true
        });
    }

    update(deltaTime: number) {
        
    }
}


