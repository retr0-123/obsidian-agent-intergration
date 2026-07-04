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

export function chooseTerminalDimensions(
  beforeFit: TerminalDimensions | undefined,
  afterFit: TerminalDimensions | undefined,
): TerminalDimensions | null {
  return normalizeTerminalDimensions(afterFit) || normalizeTerminalDimensions(beforeFit);
}

export function estimateTerminalDimensions(
  element: HTMLElement,
  cellWidth = 9,
  cellHeight = 18,
): TerminalDimensions | null {
  if (!canFitTerminalElement(element) || cellWidth <= 0 || cellHeight <= 0) {
    return null;
  }

  return normalizeTerminalDimensions({
    cols: Math.floor(element.offsetWidth / cellWidth),
    rows: Math.floor(element.offsetHeight / cellHeight),
  });
}

export interface TerminalWriter {
  write(data: string, callback?: () => void): void;
}

export function writeTerminalAndScheduleFit(
  terminal: TerminalWriter | null,
  data: string,
  scheduleFit: () => void,
): void {
  if (!terminal) {
    return;
  }

  terminal.write(data, scheduleFit);
}
