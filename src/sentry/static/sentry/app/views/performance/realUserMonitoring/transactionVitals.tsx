import React from 'react';
import {Location} from 'history';
import styled from '@emotion/styled';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';

import {t} from 'app/locale';
import AsyncComponent from 'app/components/asyncComponent';
import BarChart from 'app/components/charts/barChart';
import {SectionHeading} from 'app/components/charts/styles';
import {Panel, PanelItem} from 'app/components/panels';
import space from 'app/styles/space';
import {Organization} from 'app/types';
import EventView from 'app/utils/discover/eventView';
import {getDuration} from 'app/utils/formatters';
import theme from 'app/utils/theme';

const NUM_BUCKETS = 25;
const PERCENTILE = 0.75;
const QUERY_KEYS = [
  'environment',
  'project',
  'query',
  'start',
  'end',
  'statsPeriod',
] as const;

enum WebVital {
  FCP = 'fcp',
  LCP = 'lcp',
  FID = 'fid',
  // TTI = 'tti,
  TBT = 'tbt',
}

type ViewProps = Pick<EventView, typeof QUERY_KEYS[number]>;

type Props = AsyncComponent['props'] &
  ViewProps & {
    organization: Organization;
    location: Location;
  };

// type StatsApiResultFCP = {
//   histogram_metrics_fcp_50: number;
//   count: number;
// };
//
// type StatsApiResultLCP = {
//   histogram_metrics_lcp_50: number;
//   count: number;
// };
//
// type StatsApiResultFID = {
//   histogram_metrics_fid_50: number;
//   count: number;
// };
//
// // type StatsApiResultTTI = {
// //   histogram_metrics_tti_50: number;
// //   count: number;
// // };
//
// type StatsApiResultTBT = {
//   histogram_metrics_tbt_50: number;
//   count: number;
// };
//
// type StatsApiResult = {
//   histogram: number;
//   count: number;
// };

type SummaryApiResult = {
  percentile_metrics_fcp_0_75: number;
  percentile_metrics_lcp_0_75: number;
  percentile_metrics_fid_0_75: number;
  // percentile_metrics_tti_0_75: number;
  percentile_metrics_tbt_0_75: number;
};

type State = AsyncComponent['state'] & {
  // fcp: {data: StatsApiResultFCP[]} | null;
  // lcp: {data: StatsApiResultLCP[]} | null;
  // fid: {data: StatsApiResultFID[]} | null;
  // // tti: {data: StatsApiResultTTI[]} | null;
  // tbt: {data: StatsApiResultTBT[]} | null;
  summary: {data: [SummaryApiResult]} | null;
};

type Endpoints = ReturnType<AsyncComponent['getEndpoints']>;

class TransactionVitals extends AsyncComponent<Props, State> {
  getEndpoints(): Endpoints {
    const {
      organization,
      query,
      start,
      end,
      statsPeriod,
      environment,
      project,
      location,
    } = this.props;

    const vitals = Object.values(WebVital).map(vital => `metrics.${vital}`);

    const vitals_key = vitals.join('_').replace(/\./g, '_');
    const orderby = `multihistogram_${vitals_key}_${NUM_BUCKETS}`;

    const eventViewHistograms = EventView.fromSavedQuery({
      id: '',
      name: '',
      version: 2,
      fields: [`multihistogram(${vitals.join(', ')}, ${NUM_BUCKETS})`, 'count()'],
      orderby,
      projects: project,
      range: statsPeriod,
      query,
      environment,
      start,
      end,
    });

    const histogramsApiPayload = eventViewHistograms.getEventsAPIPayload(location);
    histogramsApiPayload.referrer = `api.performance.webvitals.histograms`;

    const eventViewSummary = EventView.fromSavedQuery({
      id: '',
      name: '',
      version: 2,
      fields: Object.values(WebVital).map(
        vital => `percentile(metrics.${vital}, ${PERCENTILE})`
      ),
      projects: project,
      range: statsPeriod,
      query,
      environment,
      start,
      end,
    });

    const summaryApiPayload = eventViewSummary.getEventsAPIPayload(location);
    summaryApiPayload.referrer = `api.performance.webvitals.summary`;

    return [
      [
        'histograms',
        `/organizations/${organization.slug}/eventsv2/`,
        {query: histogramsApiPayload},
      ],
      [
        'summary',
        `/organizations/${organization.slug}/eventsv2/`,
        {query: summaryApiPayload},
      ],
    ];
  }

  componentDidUpdate(prevProps: Props) {
    if (this.shouldRefetchData(prevProps)) {
      this.fetchData();
    }
  }

  shouldRefetchData(prevProps: Props) {
    if (this.state.loading) {
      return false;
    }
    return !isEqual(pick(prevProps, QUERY_KEYS), pick(this.props, QUERY_KEYS));
  }

  renderVitals({loading = false, error = false}) {
    const colors = theme.charts.getColorPalette(4);

    return (
      <React.Fragment>
        {Object.values(WebVital).map((vital, index) => {
          const data = []; // this.getFormattedData(vital);
          const summary = this.getFormattedSummary(vital);
          return (
            <VitalCard
              key={vital}
              loading={loading}
              error={error}
              colors={[colors[index]]}
              vital={vital}
              chartData={data}
              summary={summary}
            />
          );
        })}
      </React.Fragment>
    );
  }

  // getFormattedData(vital: WebVital): StatsApiResult[] {
  //   const chartData = this.state[vital]?.data ?? [];
  //   switch (vital) {
  //     case WebVital.FCP:
  //       return ((chartData as unknown) as StatsApiResultFCP[]).map(result => ({
  //         histogram: result[`histogram_metrics_fcp_${NUM_BUCKETS}`],
  //         count: result.count,
  //       }));
  //     case WebVital.LCP:
  //       return ((chartData as unknown) as StatsApiResultLCP[]).map(result => ({
  //         histogram: result[`histogram_metrics_lcp_${NUM_BUCKETS}`],
  //         count: result.count,
  //       }));
  //     case WebVital.FID:
  //       return ((chartData as unknown) as StatsApiResultFID[]).map(result => ({
  //         histogram: result[`histogram_metrics_fid_${NUM_BUCKETS}`],
  //         count: result.count,
  //       }));
  //     // case WebVital.TTI:
  //     //   return ((chartData as unknown) as StatsApiResultTTI[]).map(result => ({
  //     //     histogram: result[`histogram_metrics_tti_${NUM_BUCKETS}`],
  //     //     count: result.count,
  //     //   }));
  //     case WebVital.TBT:
  //       return ((chartData as unknown) as StatsApiResultTBT[]).map(result => ({
  //         histogram: result[`histogram_metrics_tbt_${NUM_BUCKETS}`],
  //         count: result.count,
  //       }));
  //     default:
  //       throw new Error('Unexpected Web Vital Type');
  //   }
  // }

  getFormattedSummary(vital: WebVital): string | null {
    const summary = this.state.summary?.data[0] ?? null;
    switch (vital) {
      case WebVital.FCP:
        return summary === null
          ? null
          : getDuration(summary.percentile_metrics_fcp_0_75 / 1000, 2, true);
      case WebVital.LCP:
        return summary === null
          ? null
          : getDuration(summary.percentile_metrics_lcp_0_75 / 1000, 2, true);
      case WebVital.FID:
        return summary === null
          ? null
          : getDuration(summary.percentile_metrics_fid_0_75 / 1000, 2, true);
      // case WebVital.TTI:
      //   return summary === null
      //     ? null
      //     : getDuration(summary.percentile_metrics_tti_0_75 / 1000, 2, true);
      case WebVital.TBT:
        return summary === null
          ? null
          : getDuration(summary.percentile_metrics_tbt_0_75 / 1000, 2, true);
      default:
        throw new Error('Unexpected Web Vital Type');
    }
  }

  render() {
    return <Panel>{this.renderComponent()}</Panel>;
  }

  renderLoading() {
    return this.renderVitals({loading: true});
  }

  renderError() {
    return this.renderVitals({error: true});
  }

  renderBody() {
    return this.renderVitals({});
  }
}

const VITAL_LONG_NAME: Record<WebVital, string> = {
  fcp: t('First Contentful Paint (FCP)'),
  lcp: t('Largest Contentful Paint (LCP)'),
  fid: t('First Input Delay (FID)'),
  // tti: t('Time To Interactive (TTI)'),
  tbt: t('Total Blocking Time (TBT)'),
};

const VITAL_DESCRIPTION: Record<WebVital, string> = {
  fcp: t(
    "Must go faster. You're a very talented young man, with your own clever thoughts."
  ),
  lcp: t(
    "Must go faster. You're a very talented young man, with your own clever thoughts."
  ),
  fid: t(
    "Must go faster. You're a very talented young man, with your own clever thoughts."
  ),
  // tti: t(
  //   "Must go faster. You're a very talented young man, with your own clever thoughts."
  // ),
  tbt: t(
    "Must go faster. You're a very talented young man, with your own clever thoughts."
  ),
};

type VitalProps = {
  loading: boolean;
  error: boolean;
  vital: WebVital;
  summary: string | null;
  // chartData: StatsApiResult[];
  colors: [string]; // i have no idea what the type here should be...
};

class VitalCard extends React.Component<VitalProps> {
  renderSummary() {
    const {summary, vital} = this.props;

    return (
      <CardSummary>
        <StyledSectionHeading>{VITAL_LONG_NAME[vital]}</StyledSectionHeading>
        <StatNumber>{summary ?? '\u2014'}</StatNumber>
        <Description>{VITAL_DESCRIPTION[vital]}</Description>
      </CardSummary>
    );
  }

  renderHistogram() {
    return null;

    // const {chartData, colors} = this.props;

    // const xAxis = {
    //   type: 'category',
    //   truncate: true,
    //   axisLabel: {
    //     margin: 20,
    //   },
    //   axisTick: {
    //     interval: 0,
    //     alignWithLabel: true,
    //   },
    // };

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

    // return (
    //   <BarChart
    //     grid={{left: '10px', right: '10px', top: '40px', bottom: '0px'}}
    //     xAxis={xAxis}
    //     yAxis={{type: 'value'}}
    //     tooltip={tooltip}
    //     color={colors}
    //     series={transformData(chartData, NUM_BUCKETS)}
    //   />
    // );
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

const Card = styled(PanelItem)`
  flex-grow: 1;
  padding: 0;

  @media (min-width: ${p => p.theme.breakpoints[1]}) {
    display: grid;
    grid-template-columns: auto 66%;
    align-content: start;
    grid-gap: ${space(3)};
  }

  @media (min-width: ${p => p.theme.breakpoints[2]}) {
    grid-template-columns: 325px minmax(100px, auto);
  }
`;

const CardSection = styled('div')`
  padding: ${space(3)};
`;

const CardSummary = styled(CardSection)`
  border-right: 1px solid ${p => p.theme.borderLight};
  grid-column: 1/1;
`;

const StyledSectionHeading = styled(SectionHeading)`
  margin: ${space(1)} 0px;
`;

const StatNumber = styled('div')`
  font-size: 36px;
  margin: ${space(2)} 0px;
  color: ${p => p.theme.gray700};
`;

const Description = styled('p')`
  font-size: 14px;
  margin: ${space(1)} 0px;
`;

// function transformData(data: StatsApiResult[], bucketWidth: number) {
//   const seriesData = data.map(item => {
//     const bucket = item.histogram;
//     const midPoint = bucketWidth > 1 ? Math.ceil(bucket + bucketWidth / 2) : bucket;
//     return {
//       value: item.count,
//       name: getDuration(midPoint / 1000, 2, true),
//     };
//   });
//
//   return [
//     {
//       seriesName: t('Count'),
//       data: seriesData,
//     },
//   ];
// }

export default TransactionVitals;
