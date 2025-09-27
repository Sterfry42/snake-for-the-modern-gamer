import { registerFeature } from "../systems/features";
registerFeature({
  id: "bonus",
  label: "Bonus apple timer bar",
  onAppleEaten(s){ if (s.flags["bonusActive"]) s.addScore(4); s.flags["bonusActive"] = false; },
  onTick(s){ if (!s.flags["bonusActive"] && Math.random()<0.005) s.flags["bonusActive"]= true; },
  onRender(s,g){
    g.beginPath();
    if (!s.flags["bonusActive"]) return;
    g.fillStyle(0x54ff9a,1);
    g.fillRect(0,0, s.grid.cols * s.grid.cell * 0.5, 4);
  }
});
