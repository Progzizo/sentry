import {formatFloat, getDuration} from 'app/utils/formatters';

import {MeasuresHistogramArgs, WebVital} from './types';

export function formatNumber(num: number, places: number = 2): string {
  return formatFloat(num, places).toLocaleString();
}

export function formatDuration(duration: number): string {
  return duration < 1000
    ? getDuration(duration / 1000, 0, true)
    : getDuration(duration / 1000, 2, true);
}

export function getMeasuresHistogramFunction(
  vitals: WebVital[],
  {buckets, max, min, precision}: MeasuresHistogramArgs
) {
  const vitalsStr = vitals.join(', ');
  const maxStr = max === undefined ? 'null' : max.toString();
  const minStr = min === undefined ? 'null' : min.toString();
  const precisionStr = precision === undefined ? 'null' : precision.toString();
  return `measuresHistogram(${buckets}, ${minStr}, ${maxStr}, ${precisionStr}, ${vitalsStr})`;
}
