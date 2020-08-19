import React from 'react';
import {Location} from 'history';
import styled from '@emotion/styled';

import {t} from 'app/locale';
import AsyncComponent from 'app/components/asyncComponent';
import BarChart from 'app/components/charts/barChart';
import MarkArea from 'app/components/charts/components/markArea';
import MarkLine from 'app/components/charts/components/markLine';
import MarkPoint from 'app/components/charts/components/markPoint';
import {Panel} from 'app/components/panels';
import space from 'app/styles/space';
import {Organization} from 'app/types';
import EventView from 'app/utils/discover/eventView';
import DiscoverQuery from 'app/utils/discover/discoverQuery';
import theme, {Color} from 'app/utils/theme';
import Tag from 'app/views/settings/components/tag';

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
  TTI = 'tbt',
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
  [WebVital.TTI]: t('Time To Interactive (TTI)'),
};

const VITAL_DESCRIPTION: Record<WebVital, string> = {
  [WebVital.FCP]: t(
    'The first moment DOM content such as text or an image gets rendered.'
  ),
  [WebVital.LCP]: t(
    'The moment when the largest content element gets rendered in the page.'
  ),
  [WebVital.FID]: t(
    'The first moment when an user interacts with the page by clicking, scrolling, etc.'
  ),
  [WebVital.TTI]: t(
    'The moment when the page has the most visible, interactive elements.'
  ),
};

const VITAL_WARNING_THRESHOLD: Record<WebVital, number> = {
  [WebVital.FCP]: 2000,
  [WebVital.LCP]: 2500,
  [WebVital.FID]: 100,
  [WebVital.TTI]: 3000, // couldnt find one on web.dev so i just made one up
};

const VITAL_FAILURE_THRESHOLD: Record<WebVital, number> = {
  [WebVital.FCP]: 4000,
  [WebVital.LCP]: 4000,
  [WebVital.FID]: 300,
  [WebVital.TTI]: 5000,
};

type VitalProps = {
  isLoading: boolean;
  error: string | null;
  vital: WebVital;
  summary: number | null;
  chartData: HistogramData[];
  colors: [Color];
};

type VitalState = {
  baselineX: number | null;
  failureAreaX: number | null;
};

class VitalCard extends React.Component<VitalProps, VitalState> {
  state = {
    baselineX: null,
    failureAreaX: null,
  };

  renderSummary() {
    const {isLoading, error, summary, vital, colors} = this.props;

    const failureThreshold = VITAL_FAILURE_THRESHOLD[vital];

    return (
      <CardSummary>
        <Indicator color={colors[0]} />
        <CardSectionHeading>
          {VITAL_LONG_NAME[vital]}
          {summary === null ? null : summary < failureThreshold ? (
            <StyledTag color={theme.purple500}>{t('PASS')}</StyledTag>
          ) : (
            <StyledTag color={theme.red400}>{t('FAIL')}</StyledTag>
          )}
        </CardSectionHeading>
        <StatNumber>
          {isLoading || error !== null || summary === null
            ? '\u2014'
            : formatDuration(summary)}
        </StatNumber>
        <Description>{VITAL_DESCRIPTION[vital]}</Description>
      </CardSummary>
    );
  }

  convertToPixelX(chartRef, xAxis) {
    const {chartData} = this.props;

    const coord1 = [0, 0];
    const x1 = chartRef.convertToPixel({xAxisIndex: 0, yAxisIndex: 0}, coord1)[0];

    const last = chartData.length - 1;
    const coord2 = [last, 0];
    const x2 = chartRef.convertToPixel({xAxisIndex: 0, yAxisIndex: 0}, coord2)[0];

    if (isNaN(x1) || isNaN(x2)) {
      return null;
    }

    const percentage =
      (xAxis - chartData[0].histogram) /
      (chartData[last].histogram - chartData[0].histogram);

    return x1 + (x2 - x1) * percentage;
  }

  handleFinished = (_, chartRef) => {
    const {summary, vital} = this.props;
    const {baselineX, failureAreaX} = this.state;

    if (summary !== null) {
      const newBaselineX = this.convertToPixelX(chartRef, summary);

      if (newBaselineX !== null) {
        // we only need to rerender component if the change is large
        if (baselineX === null || Math.abs(baselineX! - newBaselineX) > 1) {
          this.setState({baselineX: newBaselineX});
        }
      }
    }

    const newFailureAreaX = this.convertToPixelX(
      chartRef,
      VITAL_FAILURE_THRESHOLD[vital]
    );
    if (newFailureAreaX !== null) {
      // we only need to rerender component if the change is large
      if (failureAreaX === null || Math.abs(failureAreaX! - newFailureAreaX) > 1) {
        this.setState({failureAreaX: newFailureAreaX});
      }
    }
  };

  renderHistogram() {
    const {colors} = this.props;

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

    const series = this.getTransformedData();

    const values = series.data.map(point => point.value);
    const max = values.length ? Math.max(...values) : undefined;

    return (
      <BarChart
        series={[series]}
        xAxis={xAxis}
        yAxis={{type: 'value', max}}
        // tooltip={tooltip}
        colors={colors}
        onFinished={this.handleFinished}
        grid={{left: space(3), right: space(3), top: '20px', bottom: '10px'}}
      />
    );
  }

  bucketWidth() {
    const {chartData} = this.props;
    // We can assume that all buckets are of equal width, use the first two
    // buckets to get the width. The value of each histogram function indicates
    // the beginning of the bucket.
    return chartData.length > 2 ? chartData[1].histogram - chartData[0].histogram : 0;
  }

  getTransformedData() {
    const {chartData} = this.props;
    const {baselineX, failureAreaX} = this.state;
    const bucketWidth = this.bucketWidth();

    const seriesData = chartData.map(item => {
      const bucket = item.histogram;
      const midPoint = bucketWidth > 1 ? Math.ceil(bucket + bucketWidth / 2) : bucket;
      return {
        value: item.count,
        name: formatDuration(midPoint),
      };
    });

    const transformedSeries = {
      seriesName: t('Count'),
      data: seriesData,
      markPoint: undefined,
      markLine: undefined,
      markArea: undefined,
    };

    transformedSeries.markPoint = MarkPoint({
      symbol:
        'path://M8.08,15.92A6.58,6.58,0,0,1,1.51,9.34a4.88,4.88,0,0,1,2.2-4.25.74.74,0,0,1,1,.34,6,6,0,0,1,4-5.3A.74.74,0,0,1,9.4.22a.73.73,0,0,1,.33.61v.31A15.07,15.07,0,0,0,10,4.93a3.72,3.72,0,0,1,2.3-1.7.74.74,0,0,1,.66.12.75.75,0,0,1,.3.6A6.21,6.21,0,0,0,14,6.79a5.78,5.78,0,0,1,.68,2.55A6.58,6.58,0,0,1,8.08,15.92ZM3.59,7.23A4.25,4.25,0,0,0,3,9.34a5.07,5.07,0,1,0,10.14,0,4.6,4.6,0,0,0-.54-1.94,8,8,0,0,1-.76-2.32A2,2,0,0,0,11.07,7a.75.75,0,0,1-1.32.58C8.4,6,8.25,4.22,8.23,2c-2,1.29-2.15,3.58-2.09,5.85A7.52,7.52,0,0,1,6.14,9a.74.74,0,0,1-.46.63.77.77,0,0,1-.76-.11A4.56,4.56,0,0,1,3.59,7.23Z',
      symbolSize: [13, 15],
      data: [{x: 100, y: 100}],
    });

    if (baselineX) {
      transformedSeries.markLine = MarkLine({
        silent: true,
        lineStyle: {
          normal: {
            color: theme.gray700,
            opacity: 0.3,
            type: 'solid',
          },
        },
        data: [
          [
            {x: baselineX, yAxis: 0},
            {x: baselineX, yAxis: 'max'},
          ],
        ],
        label: {
          show: false,
        },
      });
    } else {
      delete transformedSeries.markLine;
    }

    if (failureAreaX !== null) {
      transformedSeries.markArea = MarkArea({
        silent: true,
        itemStyle: {
          color: 'transparent',
          borderColor: theme.red400,
          borderWidth: 1.5,
          borderType: 'dashed',
        },
        data: [
          [
            {x: failureAreaX, yAxis: 0},
            {x: 'max', yAxis: 'max'},
          ],
        ],
      });
    } else {
      delete transformedSeries.markArea;
    }

    return transformedSeries;
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

type TagProps = {
  color: string;
};

const StyledTag = styled(Tag)<TagProps>`
  background-color: ${p => p.color};
  color: ${p => p.theme.white};
`;

export default TransactionVitals;
