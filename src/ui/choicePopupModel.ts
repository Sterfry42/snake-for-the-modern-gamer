export interface ChoiceOptionInput {
  id?: unknown;
  title?: unknown;
  description?: unknown;
}

export interface NormalizedChoiceOption {
  id: string;
  title: string;
  description: string;
  disabled?: boolean;
}

export function normalizeChoiceOptions(
  options: readonly ChoiceOptionInput[] | null | undefined,
): NormalizedChoiceOption[] {
  if (!Array.isArray(options) || options.length === 0) {
    return [
      {
        id: '__empty__',
        title: 'Nothing available',
        description: 'There are no choices here right now.',
        disabled: true,
      },
    ];
  }

  return options.map((option, index) => {
    const rawId = typeof option?.id === 'string' ? option.id.trim() : '';
    const rawTitle = typeof option?.title === 'string' ? option.title.trim() : '';
    const rawDescription = typeof option?.description === 'string' ? option.description.trim() : '';
    return {
      id: rawId || `choice-${index + 1}`,
      title: rawTitle || `Option ${index + 1}`,
      description: rawDescription || 'No additional details.',
    };
  });
}

export function getChoicePopupWidth(sceneWidth: number): number {
  return Math.max(280, Math.min(500, sceneWidth - 48));
}

export function getChoicePopupHeight(
  sceneHeight: number,
  contentHeight: number,
  footerHeight: number,
): number {
  const maximum = Math.max(220, sceneHeight - 48);
  const desired = Math.max(240, contentHeight + 72 + footerHeight);
  return Math.min(maximum, desired);
}
