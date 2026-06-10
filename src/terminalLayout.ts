export interface TerminalDimensions {
  cols: number;
  rows: number;
}

export function canFitTerminalElement(element: HTMLElement): boolean {
  return element.isConnected
    && element.offsetWidth > 0
    && element.offsetHeight > 0;
}

export function normalizeTerminalDimensions(dimensions: TerminalDimensions | undefined): TerminalDimensions | null {
  if (!dimensions || !Number.isFinite(dimensions.cols) || !Number.isFinite(dimensions.rows)) {
    return null;
  }

  const cols = Math.floor(dimensions.cols);
  const rows = Math.floor(dimensions.rows);

  return cols > 0 && rows > 0
    ? { cols, rows }
    : null;
}
