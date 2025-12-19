import { TOOLTIP_WIDTH, TOOLTIP_HEIGHT, TOOLTIP_MARGIN } from "@/lib/constants";

export const TOOLTIP_STYLES = `
  width: auto;
  min-width: 180px;
  max-width: ${TOOLTIP_WIDTH}px;
  position: absolute;
  display: none;
  padding: 6px 8px;
  box-sizing: border-box;
  font-size: 11px;
  text-align: left;
  z-index: 10;
  pointer-events: none;
  border: 1px solid #27272a;
  border-radius: 4px;
  background: rgba(24, 24, 27, 0.95);
  color: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  backdrop-filter: blur(8px);
`;

export const createTooltipElement = (): HTMLElement => {
  const tooltip = document.createElement("div");
  tooltip.style.cssText = TOOLTIP_STYLES;
  return tooltip;
};

export const positionTooltip = (
  tooltip: HTMLElement,
  position: { x: number; y: number } | 'top-right',
  containerWidth: number,
  containerHeight: number
): void => {
  if (position === 'top-right') {
    const left = containerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN;
    const top = TOOLTIP_MARGIN;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  } else {
    const { x, y } = position;
    let left = x + TOOLTIP_MARGIN;
    if (left > containerWidth - TOOLTIP_WIDTH) {
      left = x - TOOLTIP_MARGIN - TOOLTIP_WIDTH;
    }

    let top = y + TOOLTIP_MARGIN;
    if (top > containerHeight - TOOLTIP_HEIGHT) {
      top = y - TOOLTIP_HEIGHT - TOOLTIP_MARGIN;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }
};