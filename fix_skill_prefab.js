const fs = require('fs');
const content = fs.readFileSync('assets/resources/main/scrpits/player/SkillManager.ts', 'utf8');

const updated = content.replace(
  `        const node = instantiate(prefab);
        node.setParent(this.node);
        node.setScale(this._scale.x, this._scale.y);
        const offsetX = this.facing * skill.castDistance;
        node.setWorldPosition(this.node.worldPosition.x, this.node.worldPosition.y, this.node.worldPosition.z);
        this._prefabNodes.set(index, node);`,
  `        const node = instantiate(prefab);
        // 不作为 player 的子节点，以避免跟随 player 旋转，直接挂载到场景中或指定的层级（这里使用 director.getScene() 作为父节点，或者 player 的父节点）
        node.setParent(this.node.parent);
        
        // 如果原本需要根据 player 的 scale 设置 scale
        node.setScale(this._scale.x, this._scale.y);
        
        // 也可以加上 offsetX 的逻辑（原来算出来了没用上）
        const offsetX = this.facing * skill.castDistance;
        node.setWorldPosition(this.node.worldPosition.x + offsetX, this.node.worldPosition.y, this.node.worldPosition.z);
        
        this._prefabNodes.set(index, node);`
);

fs.writeFileSync('assets/resources/main/scrpits/player/SkillManager.ts', updated);
console.log('Done!');
