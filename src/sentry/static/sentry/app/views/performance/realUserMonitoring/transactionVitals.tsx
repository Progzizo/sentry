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
import {FIRE_SVG_PATH} from 'app/icons/iconFire';
import space from 'app/styles/space';
import {Organization} from 'app/types';
import EventView from 'app/utils/discover/eventView';
import DiscoverQuery from 'app/utils/discover/discoverQuery';
import theme from 'app/utils/theme';
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
  colors: [string];
};

type VitalState = {
  failureThresholdX: number | null;
  topY: number | null;
  rightX: number | null;
};

class VitalCard extends React.Component<VitalProps, VitalState> {
  state = {
    failureThresholdX: null,
    topY: null,
    rightX: null,
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
            <StyledTag color={theme.purple500}>{t('pass')}</StyledTag>
          ) : (
            <StyledTag color={theme.red400}>{t('fail')}</StyledTag>
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

  convertToPixel(point, bottomLeftPoint, topRightPoint, bottomLeftPixel, topRightPixel) {
    const [pointX, pointY] = point;
    const [xAxis1, yAxis1] = bottomLeftPoint;
    const [xAxis2, yAxis2] = topRightPoint;
    const [x1, y1] = bottomLeftPixel;
    const [x2, y2] = topRightPixel;

    const xPercentage = (pointX - xAxis1) / (xAxis2 - xAxis1);
    const yPercentage = (pointY - yAxis1) / (yAxis2 - yAxis1);

    return [x1 + (x2 - x1) * xPercentage, y1 + (y2 - y1) * yPercentage];
  }

  handleFinished = (_, chartRef) => {
    const {chartData, vital} = this.props;
    const {topY, rightX, failureThresholdX} = this.state;

    if (chartData.length <= 1) {
      return;
    }

    // compute the pixel coordinate of the bottom left corner axis coordinate
    const dataMin = chartData.reduce((cur, next) =>
      cur.count < next.count ? cur : next
    );
    const bottomLeft = chartRef.convertToPixel({xAxisIndex: 0, yAxisIndex: 0}, [
      0,
      dataMin.count,
    ]);

    // compute the pixel coordinate of the top right corner axis coordinate
    const lastIdx = chartData.length - 1;
    const dataMax = chartData.reduce((cur, next) =>
      cur.count > next.count ? cur : next
    );
    const topRight = chartRef.convertToPixel({xAxisIndex: 0, yAxisIndex: 0}, [
      lastIdx,
      dataMax.count,
    ]);

    // make sure these bounds are computed properly before we proceed
    if (
      isNaN(bottomLeft[0]) ||
      isNaN(bottomLeft[1]) ||
      isNaN(topRight[0]) ||
      isNaN(topRight[1])
    ) {
      return;
    }

    const halfBucketWidth = this.bucketWidth() / 2;

    // compute the top right most pixel coordinate on the graph
    // this is different from the top right axis coordinate because the right
    // most coordinate is the center of the right most histogram
    const [newRightX, newTopY] = this.convertToPixel(
      [chartData[lastIdx].histogram + halfBucketWidth, dataMax.count],
      [0, dataMin.count],
      [chartData[chartData.length - 1].histogram, dataMax.count],
      bottomLeft,
      topRight
    );
    if (
      topY === null ||
      rightX === null ||
      Math.abs(topY! - newTopY) > 1 ||
      Math.abs(rightX! - newRightX) > 1
    ) {
      this.setState({
        topY: newTopY,
        rightX: newRightX,
      });
    }

    // compute the left coordinate for the failure box
    const failureThreshold = VITAL_FAILURE_THRESHOLD[vital];
    const failureBucket = this.findNearestBucketIndex(failureThreshold);
    if (failureBucket !== null) {
      const failureXAxis = chartData[failureBucket].histogram - halfBucketWidth;
      const newFailureThresholdX = this.convertToPixel(
        [failureXAxis, 0],
        [0, dataMin.count],
        [chartData[chartData.length - 1].histogram, dataMax.count],
        bottomLeft,
        topRight
      )[0];

      if (
        failureThresholdX === null ||
        Math.abs(failureThresholdX! - newFailureThresholdX) > 1
      ) {
        this.setState({failureThresholdX: newFailureThresholdX});
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
        grid={{left: space(3), right: space(3), top: space(3), bottom: space(1.5)}}
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

  findNearestBucketIndex(xAxis: number): number | null {
    const {chartData} = this.props;
    if (
      !chartData.length ||
      xAxis < chartData[0].histogram ||
      xAxis > chartData[chartData.length - 1].histogram
    ) {
      return null;
    }

    const bucketWidth = this.bucketWidth();

    let l = 0;
    let r = chartData.length;
    let m = Math.floor((l + r) / 2);

    while (Math.abs(xAxis - chartData[m].histogram) > bucketWidth) {
      if (xAxis > chartData[m].histogram) {
        l = m + 1;
      } else {
        r = m - 1;
      }
      m = Math.floor((l + r) / 2);
    }

    return m;
  }

  getTransformedData() {
    const {chartData, summary} = this.props;
    const {failureThresholdX, topY, rightX} = this.state;
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

    if (summary !== null) {
      const summaryBucket = this.findNearestBucketIndex(summary);
      if (summaryBucket === null) {
        delete transformedSeries.markLine;
      } else {
        transformedSeries.markLine = MarkLine({
          silent: true,
          lineStyle: {
            normal: {
              color: theme.gray700,
              opacity: 0.3,
              type: 'solid',
            },
          },
          data: [{xAxis: summaryBucket}],
          label: {
            show: false,
          },
        });
      }
    }

    if (failureThresholdX === null) {
      delete transformedSeries.markArea;
    } else {
      transformedSeries.markArea = MarkArea({
        silent: true,
        itemStyle: {
          color: 'transparent',
          borderColor: theme.red400,
          borderWidth: 1.5,
          borderType: 'dashed',
          zLevel: theme.zIndex.tooltip,
        },
        data: [
          [
            {x: failureThresholdX, yAxis: 'min'},
            {x: 'max', yAxis: 'max'},
          ],
        ],
      });
    }

    if (topY === null || rightX === null) {
      delete transformedSeries.markPoint;
    } else {
      transformedSeries.markPoint = MarkPoint({
        silent: true,
        symbol: `path://${FIRE_SVG_PATH}`,
        symbolSize: [14, 16],
        symbolKeepAspect: true,
        itemStyle: {
          color: theme.red400,
        },
        data: [{x: rightX! - 16, y: topY! + 16}],
      });
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
  position: absolute;
  right: ${space(3)};

  background-color: ${p => p.color};
  color: ${p => p.theme.white};
  text-transform: uppercase;
  font-weight: 500;
`;

export default TransactionVitals;
