const PROTEINPAINT_TOOL_CONTAINER_SELECTOR =
  '[data-proteinpaint-tool-container="true"]';

export const getProteinPaintToolContainer = (
  rootElem: HTMLElement | null,
): HTMLElement | null => {
  if (!rootElem) return null;

  const toolContainer = rootElem.closest(PROTEINPAINT_TOOL_CONTAINER_SELECTOR);
  return toolContainer instanceof HTMLElement ? toolContainer : null;
};
