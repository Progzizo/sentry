import React from 'react';
import {Location} from 'history';
import styled from '@emotion/styled';

import {t} from 'app/locale';
import AsyncComponent from 'app/components/asyncComponent';
import BarChart from 'app/components/charts/barChart';
// import LineSeries from 'app/components/charts/series/lineSeries';
// import MarkLine from 'app/components/charts/components/markLine';
import {Panel} from 'app/components/panels';
import space from 'app/styles/space';
import {Organization} from 'app/types';
import EventView from 'app/utils/discover/eventView';
import DiscoverQuery from 'app/utils/discover/discoverQuery';
import theme from 'app/utils/theme';

import {
  Card,
  CardSummary,
  CardSectionHeading,
  StatNumber,
  Description,
  formatDuration,
} from './styles';

const NUM_BUCKETS = 50;
const PERCENTILE = 0.75;

enum WebVital {
  FCP = 'fcp',
  LCP = 'lcp',
  FID = 'fid',
  // TTI = 'tti,
  TBT = 'tbt',
  CLS = 'cls',
}

type Props = AsyncComponent['props'] & {
  organization: Organization;
  location: Location;
  eventView: EventView;
};

type HistogramData = {
  histogram: number;
  count: number;
};

const vitals = Object.values(WebVital).map(vital => `metrics.${vital}`);
const vitals_key = vitals.join('_').replace(/\./g, '_');
const RESULT_KEY = `multihistogram_${vitals_key}_${NUM_BUCKETS}`;

class TransactionVitals extends React.Component<Props> {
  generateHistogramEventView() {
    const {eventView} = this.props;

    return EventView.fromSavedQuery({
      id: '',
      name: '',
      version: 2,
      fields: [`multihistogram(${vitals.join(', ')}, ${NUM_BUCKETS})`, 'count()'],
      orderby: RESULT_KEY,
      projects: eventView.project,
      range: eventView.statsPeriod,
      query: eventView.query,
      environment: eventView.environment,
      start: eventView.start,
      end: eventView.end,
    });
  }

  generateSummaryEventView() {
    const {eventView} = this.props;

    return EventView.fromSavedQuery({
      id: '',
      name: '',
      version: 2,
      fields: Object.values(WebVital).map(
        vital => `percentile(metrics.${vital}, ${PERCENTILE})`
      ),
      projects: eventView.project,
      range: eventView.statsPeriod,
      query: eventView.query,
      environment: eventView.environment,
      start: eventView.start,
      end: eventView.end,
    });
  }

  render() {
    const {location, organization} = this.props;

    const histogramsEventView = this.generateHistogramEventView();
    const summaryEventView = this.generateSummaryEventView();

    return (
      <DiscoverQuery
        location={location}
        eventView={summaryEventView}
        orgSlug={organization.slug}
        limit={1}
      >
        {summaryResults => {
          return (
            <DiscoverQuery
              location={location}
              eventView={histogramsEventView}
              orgSlug={organization.slug}
            >
              {histogramResults => {
                const isLoading = summaryResults.isLoading || histogramResults.isLoading;
                const error = summaryResults.error ?? histogramResults.error;

                const summaryData = summaryResults?.tableData?.data?.[0] ?? null;
                const histogramData = histogramResults?.tableData?.data ?? [];

                const colors = theme.charts.getColorPalette(3);
                const percentile = PERCENTILE.toString().replace('.', '_');

                return (
                  <Panel>
                    {Object.values(WebVital).map((vital, index) => {
                      const summaryKey = `percentile_metrics_${vital}_${percentile}`;
                      const histogramKey = `${RESULT_KEY}_metrics_${vital}`;

                      const summary = summaryData?.[summaryKey] ?? null;
                      const data = histogramData.map(d => ({
                        histogram: d[RESULT_KEY] ?? 0,
                        count: d[histogramKey] ?? 0,
                      })) as HistogramData[];

                      return (
                        <VitalCard
                          key={vital}
                          isLoading={isLoading}
                          error={error}
                          colors={[colors[colors.length - index - 1]]}
                          vital={vital}
                          chartData={data}
                          summary={summary as number}
                        />
                      );
                    })}
                  </Panel>
                );
              }}
            </DiscoverQuery>
          );
        }}
      </DiscoverQuery>
    );
  }
}

const VITAL_LONG_NAME: Record<WebVital, string> = {
  [WebVital.FCP]: t('First Contentful Paint (FCP)'),
  [WebVital.LCP]: t('Largest Contentful Paint (LCP)'),
  [WebVital.FID]: t('First Input Delay (FID)'),
  // [WebVital.TTI]: t('Time To Interactive (TTI)'),
  [WebVital.TBT]: t('Total Blocking Time (TBT)'),
  [WebVital.CLS]: t('Content Layout Shift  (CLS)'),
};

const VITAL_DESCRIPTION: Record<WebVital, string> = {
  [WebVital.FCP]: t(
    "Must go faster. You're a very talented young man, with your own clever thoughts."
  ),
  [WebVital.LCP]: t(
    "Must go faster. You're a very talented young man, with your own clever thoughts."
  ),
  [WebVital.FID]: t(
    "Must go faster. You're a very talented young man, with your own clever thoughts."
  ),
  // [WebVital.TTI]: t(
  //   "Must go faster. You're a very talented young man, with your own clever thoughts."
  // ),
  [WebVital.TBT]: t(
    "Must go faster. You're a very talented young man, with your own clever thoughts."
  ),
  [WebVital.CLS]: t(
    "Must go faster. You're a very talented young man, with your own clever thoughts."
  ),
};

type VitalProps = {
  isLoading: boolean;
  error: string | null;
  vital: WebVital;
  summary: number | null;
  chartData: HistogramData[];
  colors: [string];
};

class VitalCard extends React.Component<VitalProps> {
  renderSummary() {
    const {isLoading, error, summary, vital, colors} = this.props;

    return (
      <CardSummary>
        <Indicator color={colors[0]} />
        <CardSectionHeading>{VITAL_LONG_NAME[vital]}</CardSectionHeading>
        <StatNumber>
          {isLoading || error !== null || summary === null
            ? '\u2014'
            : formatDuration(summary)}
        </StatNumber>
        <Description>{VITAL_DESCRIPTION[vital]}</Description>
      </CardSummary>
    );
  }

  renderHistogram() {
    const {chartData, colors} = this.props;

    const xAxis = {
      type: 'category',
      truncate: true,
      axisLabel: {
        margin: 20,
      },
      axisTick: {
        interval: 0,
        alignWithLabel: true,
      },
    };

    // const tooltip = {
    //   formatter(series) {
    //     const seriesData = Array.isArray(series) ? series : [series];
    //     let contents: string[] = [];
    //     // if (!zoomError) {
    //     // Replicate the necessary logic from app/components/charts/components/tooltip.jsx
    //     contents = seriesData.map(item => {
    //       const label = item.seriesName;
    //       const value = item.value[1].toLocaleString();
    //       return [
    //         '<div class="tooltip-series">',
    //         `<div><span class="tooltip-label">${item.marker} <strong>${label}</strong></span> ${value}</div>`,
    //         '</div>',
    //       ].join('');
    //     });
    //     const seriesLabel = seriesData[0].value[0];
    //     contents.push(`<div class="tooltip-date">${seriesLabel}</div>`);
    //     // } else {
    //     //   contents = [
    //     //     '<div class="tooltip-series tooltip-series-solo">',
    //     //     t('You cannot zoom in any further'),
    //     //     '</div>',
    //     //   ];
    //     // }
    //     contents.push('<div class="tooltip-arrow"></div>');
    //     return contents.join('');
    //   },
    // };

    const series = transformData(chartData, NUM_BUCKETS);

    return (
      <BarChart
        grid={{left: space(3), right: space(3), top: '20px', bottom: '10px'}}
        xAxis={xAxis}
        yAxis={{type: 'value'}}
        // tooltip={tooltip}
        colors={colors}
        series={series}
      />
    );
  }

  get bucketWidth() {
    const {chartData} = this.props;
    // We can assume that all buckets are of equal width, use the first two
    // buckets to get the width. The value of each histogram function indicates
    // the beginning of the bucket.
    return chartData.length > 2 ? chartData[1].histogram - chartData[0].histogram : 0;
  }

  render() {
    return (
      <Card>
        {this.renderSummary()}
        {this.renderHistogram()}
      </Card>
    );
  }
}

function transformData(data: HistogramData[], bucketWidth: number) {
  const seriesData = data.map(item => {
    const bucket = item.histogram;
    const midPoint = bucketWidth > 1 ? Math.ceil(bucket + bucketWidth / 2) : bucket;
    return {
      value: item.count,
      name: formatDuration(midPoint),
    };
  });

  return [
    {
      seriesName: t('Count'),
      data: seriesData,
    },
  ];
}

type IndicatorProps = {
  color: string;
};

const Indicator = styled('div')<IndicatorProps>`
  position: absolute;
  left: 0px;
  margin-top: ${space(0.5)};
  width: 6px;
  height: 18px;
  border-radius: 0 3px 3px 0;

  background-color: ${p => p.color};
`;

export default TransactionVitals;
