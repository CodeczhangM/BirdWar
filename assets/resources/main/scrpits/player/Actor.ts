import { _decorator, Component, Node, BoxCollider2D } from 'cc';
import { CombatEntity, EntityType, Faction } from '../CombatSystem';
import { Log } from '../Logger';
const { ccclass, property } = _decorator;

@ccclass('Actor')
export class Actor extends Component {

    private mcollider : BoxCollider2D = null;
    private mcombatEntity : CombatEntity = null;
    private readonly MODULE_NAME = 'Actor';

    protected onLoad(): void {
        this.mcollider = this.getComponent(BoxCollider2D);
        if(!this.mcombatEntity)
        {
            this.mcombatEntity =  this.node.addComponent(CombatEntity);
            //TODO set default keys.
            this.mcombatEntity.entityType = EntityType.BULLET;
            this.mcombatEntity.faction = Faction.PLAYER; // 玩家子弹
            this.mcombatEntity.attackPower = 20;
        }
    }


    public onAttackStart() : void {
        Log.debug(this.MODULE_NAME, "onActorAttackedStart");
    }


    public onAttackEnd() : void {
        Log.debug(this.MODULE_NAME, "onActorAttackedEnd");
    }

}


