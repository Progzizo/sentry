import React from 'react';
import {Location} from 'history';
import {browserHistory, InjectedRouter} from 'react-router';
import styled from '@emotion/styled';
import omit from 'lodash/omit';

import {Client} from 'app/api';
import {t} from 'app/locale';
import space from 'app/styles/space';
import {Organization, Project} from 'app/types';
import EventsChart from 'app/components/charts/eventsChart';
import {SectionHeading} from 'app/components/charts/styles';
import * as Layout from 'app/components/layouts/thirds';
import {getParams} from 'app/components/organizations/globalSelectionHeader/getParams';
import {Panel, PanelItem} from 'app/components/panels';
import EventView from 'app/utils/discover/eventView';
import SearchBar from 'app/views/events/searchBar';
import {decodeScalar} from 'app/utils/queryString';
import withApi from 'app/utils/withApi';
import withProjects from 'app/utils/withProjects';

import TransactionHeader from './header';

type Props = {
  router: InjectedRouter;
  location: Location;
  eventView: EventView;
  transactionName: string;
  organization: Organization;
  totalValues: number | null;
  projects: Project[];
};

class RealUserMonitoring extends React.Component<Props> {
  handleSearch = (query: string) => {
    const {location} = this.props;

    const queryParams = getParams({
      ...(location.query || {}),
      query,
    });

    // do not propagate pagination when making a new search
    const searchQueryParams = omit(queryParams, 'cursor');

    browserHistory.push({
      pathname: location.pathname,
      query: searchQueryParams,
    });
  };

  render() {
    const {
      router,
      transactionName,
      location,
      eventView,
      projects,
      organization,
    } = this.props;
    const query = decodeScalar(location.query.query) || '';

    return (
      <React.Fragment>
        <TransactionHeader
          eventView={eventView}
          location={location}
          organization={organization}
          projects={projects}
          transactionName={transactionName}
        />
        <Layout.Body>
          <Layout.Main>
            <StyledSearchBar
              organization={organization}
              projectIds={eventView.project}
              query={query}
              fields={eventView.fields}
              onSearch={this.handleSearch}
            />
          </Layout.Main>
          <Layout.Side>more stuff on the side</Layout.Side>
          <Layout.Main fullWidth>
            <Panel>
              {/* no tti here because perfume doesnt report it */}
              {['fcp', 'lcp', 'fid', 'tbt'].map(metric => (
                <MetricCard
                  key={metric}
                  metric={metric as WEB_VITAL_METRICS}
                  router={router}
                  organization={organization}
                  query={query}
                />
              ))}
            </Panel>
          </Layout.Main>
        </Layout.Body>
      </React.Fragment>
    );
  }
}

type WEB_VITAL_METRICS = 'fcp' | 'lcp' | 'fid' | 'tti' | 'tbt';

const METRIC_LONG_NAME: Record<WEB_VITAL_METRICS, string> = {
  fcp: t('First Contentful Paint (FCP)'),
  lcp: t('Largest Contentful Paint (LCP)'),
  fid: t('First Input Delay (FID)'),
  tti: t('Time To Interactive (TTI)'),
  tbt: t('Total Blocking Time (TBT)'),
};

const METRIC_DESCRIPTION: Record<WEB_VITAL_METRICS, string> = {
  fcp: t(
    "Must go faster. You're a very talented young man, with your own clever thoughts."
  ),
  lcp: t(
    "Must go faster. You're a very talented young man, with your own clever thoughts."
  ),
  fid: t(
    "Must go faster. You're a very talented young man, with your own clever thoughts."
  ),
  tti: t(
    "Must go faster. You're a very talented young man, with your own clever thoughts."
  ),
  tbt: t(
    "Must go faster. You're a very talented young man, with your own clever thoughts."
  ),
};

type MetricProps = {
  api: Client;
  router: InjectedRouter;
  metric: WEB_VITAL_METRICS;
  organization: Organization;
  query: string;
};

type Results = {
  [key: string]: React.ReactNode;
} | null;

class _MetricCard extends React.Component<MetricProps> {
  renderMetricSummary(stats: Results) {
    const {metric} = this.props;

    return (
      <CardSummary>
        <StyledSectionHeading>{METRIC_LONG_NAME[metric]}</StyledSectionHeading>
        <StatNumber>{!stats ? '\u2014' : stats[metric]}</StatNumber>
        <Description>{METRIC_DESCRIPTION[metric]}</Description>
      </CardSummary>
    );
  }

  renderMetricGraph() {
    const {api, router, metric, organization, query} = this.props;
    const name = `metrics.${metric}`;
    return (
      <CardGraph>
        <EventsChart
          api={api}
          router={router}
          organization={organization}
          projects={[]}
          environments={[]}
          query={query}
          yAxis={name}
          start={null}
          end={null}
          period="24h"
          disablePrevious
          disableReleases
          field={[name]}
          showHistogram
        />
      </CardGraph>
    );
  }

  render() {
    return (
      <Card>
        {this.renderMetricSummary(null)}
        {this.renderMetricGraph()}
      </Card>
    );
  }
}

const MetricCard = withApi(_MetricCard);

const StyledSearchBar = styled(SearchBar)`
  margin-bottom: ${space(1)};
`;

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

const CardGraph = styled(CardSection)`
  grid-column: 2/3;
  max-width: 100%;
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

export default withProjects(RealUserMonitoring);
