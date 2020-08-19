import React from 'react';
import {Location} from 'history';
import {browserHistory} from 'react-router';
import styled from '@emotion/styled';
import omit from 'lodash/omit';

import * as Layout from 'app/components/layouts/thirds';
import {getParams} from 'app/components/organizations/globalSelectionHeader/getParams';
import space from 'app/styles/space';
import {Organization, Project} from 'app/types';
import EventView from 'app/utils/discover/eventView';
import {decodeScalar} from 'app/utils/queryString';
import SearchBar from 'app/views/events/searchBar';

import TransactionVitals from './transactionVitals';
import BaselineValues from './baselineValues';
import TransactionHeader from '../transactionSummary/header';

type Props = {
  location: Location;
  eventView: EventView;
  transactionName: string;
  organization: Organization;
  projects: Project[];
};

class RumContent extends React.Component<Props> {
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

  handleTransactionFilterChange = (_value: string) => {};

  render() {
    const {transactionName, location, eventView, projects, organization} = this.props;
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
          <Layout.Main fullWidth>
            <StyledSearchBar
              organization={organization}
              projectIds={eventView.project}
              query={query}
              fields={eventView.fields}
              onSearch={this.handleSearch}
            />
            <BaselineValues
              organization={organization}
              location={location}
              eventView={eventView}
              transactionName={transactionName}
            />
            <TransactionVitals
              organization={organization}
              location={location}
              eventView={eventView}
            />
          </Layout.Main>
        </Layout.Body>
      </React.Fragment>
    );
  }
}

const StyledSearchBar = styled(SearchBar)`
  margin-bottom: ${space(3)};
`;

export default RumContent;
