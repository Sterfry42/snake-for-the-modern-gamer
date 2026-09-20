// ActiveXObject is a legacy IE type referenced by Phaser's type definitions.
// Declare it here so strict type-checking succeeds without skipLibCheck.
declare class ActiveXObject {
  constructor(progId: string);
}
declare type ActiveXObjectType = ActiveXObject;
