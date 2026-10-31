/** Bounds for an overlay panel positioned relative to the game canvas. */
export interface CanvasPanelBounds {
  overlayX: number;
  overlayY: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Position an overlay panel's DOM element over the scaled canvas so CSS
 * pixels track canvas pixels. Shared by the Spotify and YouTube panels.
 */
export function positionCanvasPanel(
  root: HTMLElement,
  bounds: CanvasPanelBounds,
  canvas?: HTMLCanvasElement,
): void {
  const canvasRect = canvas?.getBoundingClientRect();
  const scaleX = canvasRect && canvas ? canvasRect.width / canvas.width : 1;
  const scaleY = canvasRect && canvas ? canvasRect.height / canvas.height : 1;
  const left = (canvasRect?.left ?? 0) + (bounds.overlayX + bounds.x) * scaleX;
  const top = (canvasRect?.top ?? 0) + (bounds.overlayY + bounds.y) * scaleY;

  root.style.left = `${left}px`;
  root.style.top = `${top}px`;
  root.style.width = `${bounds.width * scaleX}px`;
  root.style.height = `${bounds.height * scaleY}px`;
}
