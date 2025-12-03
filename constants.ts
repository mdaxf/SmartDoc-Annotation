
import React from 'react';

export const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#ffffff', // white
  '#000000', // black
];

export const STROKE_WIDTHS = [2, 4, 6, 8, 12];
export const FONT_SIZES = [12, 16, 20, 24, 32, 48];

export const SEVERITY_COLORS: Record<number, string> = {
  1: '#3b82f6', // Blue (Low)
  2: '#eab308', // Yellow (Medium)
  3: '#f97316', // Orange (High)
  4: '#ef4444', // Red (Critical)
};

export const REASON_CODES = [
  'Defect 1',
  'Defect 2',
  'Defect 3',
  'Defect 4',
  'Defect 5',
  'Observation',
  'Missing Info',
  'Other'
];

export const STATUS_OPTIONS = [
  'New',
  'Closed',
  'Hold',
  'Cancel'
];

export const getColorForSeverity = (severity: number): string => {
  return SEVERITY_COLORS[severity] || SEVERITY_COLORS[4];
};