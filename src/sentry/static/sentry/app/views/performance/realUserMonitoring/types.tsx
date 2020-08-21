export type MeasuresHistogramArgs = {
  buckets: number;
  max?: number;
  min?: number;
  precision?: number;
};

export type HistogramData = {
  histogram: number;
  count: number;
};

export enum WebVital {
  FCP = 'metrics.fcp',
  LCP = 'metrics.lcp',
  FID = 'metrics.fid',
  CLS = 'metrics.cls',
}
