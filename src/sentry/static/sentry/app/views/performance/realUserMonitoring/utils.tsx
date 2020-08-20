import {formatFloat, getDuration} from 'app/utils/formatters';

import {NUM_BUCKETS} from './constants';
import {WebVital} from './types';

export function formatNumber(num: number, places: number = 2): string {
  return formatFloat(num, places).toLocaleString();
}

export function formatDuration(duration: number): string {
  return duration < 1000
    ? getDuration(duration / 1000, 0, true)
    : getDuration(duration / 1000, 2, true);
}

export function getMeasuresHistogramResultsKey(vitals: WebVital[]) {
  const vitalsKey = vitals.join('_').replace(/\./g, '_');
  return `measuresHistogram_${NUM_BUCKETS}_${vitalsKey}`;
}
