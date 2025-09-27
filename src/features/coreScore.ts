// AI Generated, Replace

import { registerFeature } from "../systems/features";
registerFeature({
  id: "score",
  label: "Score HUD",
  onAppleEaten(s){
    s.addScore(1);
    s.flags["applesEaten"] = (s.flags["applesEaten"] || 0) as number + 1;
  },
  onRender(s, g){
    const txt = `Score: ${s.score}`;
    const style = s.add.text(10, 8, txt, { fontFamily: "monospace", fontSize: "16px", color: "#9ad1ff" });
    style.setDepth(10);
    style.once(Phaser.GameObjects.Events.DESTROY, ()=>{});
    // destroy at end of render cycle
    s.events.once("postrender", ()=> style.destroy());
  }
});
