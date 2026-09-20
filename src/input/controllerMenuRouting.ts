import type { ControllerNavCommand } from './controllerNavigation.js';

export function shouldResumeFromPauseOverlay(
  command: ControllerNavCommand,
  pauseOverlayVisible: boolean,
): boolean {
  return pauseOverlayVisible && (command === 'menu' || command === 'cancel');
}

export function shouldBlockPauseToggle(options: {
  offeredQuest: boolean;
  modalVisible: boolean;
  pauseOverlayVisible: boolean;
  paused: boolean;
  force?: boolean;
}): boolean {
  const closingVisiblePauseOverlay =
    options.pauseOverlayVisible &&
    (options.force === false || (options.force === undefined && options.paused));
  return options.offeredQuest || (options.modalVisible && !closingVisiblePauseOverlay);
}
