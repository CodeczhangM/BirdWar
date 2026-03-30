import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

enum RangeType {
  CIRCLE,    // 圆形
  RECT,      // 矩形
  SECTOR,    // 扇形
  SINGLE,    // 单体
}

// 圆形范围（半径）
interface CircleRange {
  type: RangeType.CIRCLE
  radius: number
}

// 矩形范围（宽高）
interface RectRange {
  type: RangeType.RECT
  width: number
  height: number
}

// 扇形范围（角度+半径）
interface SectorRange {
  type: RangeType.SECTOR
  radius: number
  angle: number
}

// 单体
interface SingleRange {
  type: RangeType.SINGLE
}

// 最终统一 Range 类型
type Range = CircleRange | RectRange | SectorRange | SingleRange

@ccclass('SkillManager')
export class SkillManager extends Component {

    @property ({type : Node, tooltip: "skill node"})
    public skillNode : Node = null;

    start() {

    }
    
    public releaseSkill(skillIndex : number, range : Range, target: Node = null) : void {
         // 1. 基础校验
        if (skillIndex < 0) return
        if (range.type !== RangeType.SINGLE && !target) {
        // 非单体技能一般需要一个中心点
        return
        }

        // 2. 根据范围类型处理逻辑
        switch (range.type) {
        case RangeType.CIRCLE:
            this.castCircle(range.radius, target!)
            break
        case RangeType.RECT:
            this.castRect(range.width, range.height, target!)
            break
        case RangeType.SECTOR:
            this.castSector(range.radius, range.angle, target!)
            break
        case RangeType.SINGLE:
            this.castSingle(target)
            break
        }
    }

    // 圆形 AOE
    private castCircle(radius: number, center: Node) {}
    // 矩形
    private castRect(w: number, h: number, center: Node) {}
    // 扇形
    private castSector(radius: number, angle: number, center: Node) {}
    // 单体
    private castSingle(target: Node | null) {}

}

