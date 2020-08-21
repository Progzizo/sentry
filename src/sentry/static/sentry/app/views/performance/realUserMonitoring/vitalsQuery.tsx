import React from 'react';
import {Location} from 'history';

import {Organization} from 'app/types';
import EventView from 'app/utils/discover/eventView';
import {getAggregateAlias} from 'app/utils/discover/fields';
import DiscoverQuery from 'app/utils/discover/discoverQuery';

import {NUM_BUCKETS, PERCENTILE, DURATION_VITALS} from './constants';
import {MeasuresHistogramArgs, HistogramData, WebVital} from './types';
import {getMeasuresHistogramFunction} from './utils';

type ChildrenProps = {
  isLoading: boolean;
  errors: string[];
  summary: Record<WebVital, number | null>;
  histogram: Record<WebVital, HistogramData[]>;
};

type Props = {
  location: Location;
  organization: Organization;
  eventView: EventView;
  children: (props: ChildrenProps) => React.ReactNode;
};

class VitalsQuery extends React.Component<Props> {
  generateHistogramEventView(
    vitals: WebVital[],
    args: Omit<MeasuresHistogramArgs, 'buckets'> = {}
  ) {
    const {eventView} = this.props;

    const histogramColumn = getMeasuresHistogramFunction(vitals, {
      buckets: NUM_BUCKETS,
      ...args,
    });

    return EventView.fromSavedQuery({
      id: '',
      name: '',
      version: 2,
      fields: [histogramColumn, 'count()'],
      orderby: getAggregateAlias(histogramColumn),
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
      fields: Object.values(WebVital).map(vital => `percentile(${vital}, ${PERCENTILE})`),
      projects: eventView.project,
      range: eventView.statsPeriod,
      query: eventView.query,
      environment: eventView.environment,
      start: eventView.start,
      end: eventView.end,
    });
  }

  getSummary(summaryResults) {
    if (summaryResults.isLoading || summaryResults.error) {
      return Object.values(WebVital).reduce((summary, vital) => {
        summary[vital] = null;
        return summary;
      }, {}) as Record<WebVital, number | null>;
    }

    const summaryData = summaryResults?.tableData?.data ?? [];
    return Object.values(WebVital).reduce((summary, vital) => {
      const percentileString = PERCENTILE.toString().replace('.', '_');
      const vitalKey = vital.replace('.', '_');
      const summaryKey = `percentile_${vitalKey}_${percentileString}`;
      summary[vital] = summaryData?.[0]?.[summaryKey] ?? null;
      return summary;
    }, {}) as Record<WebVital, number | null>;
  }

  getHistograms(durationHistogramResults, clsHistogramResults) {
    const histograms = Object.values(WebVital).reduce((allHistograms, vital) => {
      allHistograms[vital] = [];
      return allHistograms;
    }, {}) as Record<WebVital, HistogramData[]>;

    if (
      durationHistogramResults.isLoading ||
      durationHistogramResults.errors ||
      clsHistogramResults.isLoading ||
      clsHistogramResults.errors
    ) {
      return histograms;
    }

    (durationHistogramResults?.tableData?.data ?? []).forEach(row => {
      const histogramColumn = getMeasuresHistogramFunction(DURATION_VITALS, {
        max: 1000,
        buckets: NUM_BUCKETS,
      });
      const key = getAggregateAlias(histogramColumn);
      const histogram = row[key];
      Object.values(DURATION_VITALS).forEach(vital => {
        histograms[vital].push({
          histogram,
          count: row[`${key}_${vital.replace('.', '_')}`],
        });
      });
    });

    (clsHistogramResults?.tableData?.data ?? []).forEach(row => {
      const histogramColumn = getMeasuresHistogramFunction([WebVital.CLS], {
        buckets: NUM_BUCKETS,
        min: 0,
        max: 1,
        precision: 2,
      });
      const key = getAggregateAlias(histogramColumn);
      histograms[WebVital.CLS].push({
        histogram: row[key],
        count: row[`${key}_${WebVital.CLS.replace('.', '_')}`],
      });
    });

    return histograms;
  }

  render() {
    const {location, organization, children} = this.props;

    return (
      <DiscoverQuery
        location={location}
        orgSlug={organization.slug}
        eventView={this.generateSummaryEventView()}
        limit={1}
      >
        {summaryResults => {
          return (
            <DiscoverQuery
              location={location}
              orgSlug={organization.slug}
              eventView={this.generateHistogramEventView(DURATION_VITALS, {
                max: 1000,
              })}
              limit={100}
            >
              {durationHistogramResults => {
                return (
                  <DiscoverQuery
                    location={location}
                    orgSlug={organization.slug}
                    eventView={this.generateHistogramEventView([WebVital.CLS], {
                      min: 0,
                      max: 1,
                      precision: 2,
                    })}
                    limit={100}
                  >
                    {clsHistogramResults => {
                      const isLoading =
                        summaryResults.isLoading ||
                        durationHistogramResults.isLoading ||
                        clsHistogramResults.isLoading;

                      const errors = [
                        summaryResults.error,
                        durationHistogramResults.error,
                        clsHistogramResults.error,
                      ].filter(error => error !== null) as string[];

                      return children({
                        isLoading,
                        errors,
                        summary: this.getSummary(summaryResults),
                        histogram: this.getHistograms(
                          durationHistogramResults,
                          clsHistogramResults
                        ),
                      });
                    }}
                  </DiscoverQuery>
                );
              }}
            </DiscoverQuery>
          );
        }}
      </DiscoverQuery>
    );
  }
}

export default VitalsQuery;
