/**
 * ComponentInventory
 *
 * Pure aggregation over `UIElement[]`. Keeps the UI dumb: counts per type,
 * grouping per file, totals — all derived in one place so we can swap in a
 * worker later without touching the panel.
 */

import {
  UI_TYPES,
  type UIElement,
  type UIElementType,
} from './ComponentDetector';

export type Inventory = {
  elements: UIElement[];
  totals: { all: number; byType: Record<UIElementType, number> };
  byType: Record<UIElementType, UIElement[]>;
  byFile: Record<string, UIElement[]>;
};

export function buildInventory(elements: UIElement[]): Inventory {
  const byType = {} as Record<UIElementType, UIElement[]>;
  const totals = { all: elements.length, byType: {} as Record<UIElementType, number> };
  for (const t of UI_TYPES) {
    byType[t] = [];
    totals.byType[t] = 0;
  }
  const byFile: Record<string, UIElement[]> = {};
  for (const el of elements) {
    byType[el.type].push(el);
    totals.byType[el.type]++;
    (byFile[el.file] ??= []).push(el);
  }
  return { elements, totals, byType, byFile };
}
