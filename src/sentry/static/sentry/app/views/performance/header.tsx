import React from 'react';
import styled from '@emotion/styled';
import {Location} from 'history';

import Feature from 'app/components/acl/feature';
import ButtonBar from 'app/components/buttonBar';
import CreateAlertButton from 'app/components/createAlertButton';
import * as Layout from 'app/components/layouts/thirds';
import ListLink from 'app/components/links/listLink';
import NavTabs from 'app/components/navTabs';
import {t} from 'app/locale';
import {Organization, Project} from 'app/types';
import {trackAnalyticsEvent} from 'app/utils/analytics';
import EventView from 'app/utils/discover/eventView';
import withProjects from 'app/utils/withProjects';

import KeyTransactionButton from './transactionSummary/keyTransactionButton';
import Breadcrumb from './breadcrumb';

type Props = {
  eventView: EventView;
  location: Location;
  organization: Organization;
  projects: Project[];
  transactionName: string;
};

class TransactionHeader extends React.Component<Props> {
  trackAlertClick(errors?: Record<string, boolean>) {
    const {organization} = this.props;
    trackAnalyticsEvent({
      eventKey: 'performance_views.summary.create_alert_clicked',
      eventName: 'Performance Views: Create alert clicked',
      organization_id: organization.id,
      status: errors ? 'error' : 'success',
      errors,
      url: window.location.href,
    });
  }

  handleIncompatibleQuery: React.ComponentProps<
    typeof CreateAlertButton
  >['onIncompatibleQuery'] = (incompatibleAlertNoticeFn, errors) => {
    this.trackAlertClick(errors);
    const incompatibleAlertNotice = incompatibleAlertNoticeFn(() =>
      this.setState({incompatibleAlertNotice: null})
    );
    this.setState({incompatibleAlertNotice});
  };

  handleCreateAlertSuccess = () => {
    this.trackAlertClick();
  };

  renderCreateAlertButton() {
    const {eventView, organization, projects} = this.props;

    return (
      <CreateAlertButton
        eventView={eventView}
        organization={organization}
        projects={projects}
        onIncompatibleQuery={this.handleIncompatibleQuery}
        onSuccess={this.handleCreateAlertSuccess}
        referrer="performance"
      />
    );
  }

  renderKeyTransactionButton() {
    const {eventView, organization, transactionName} = this.props;

    return (
      <KeyTransactionButton
        transactionName={transactionName}
        eventView={eventView}
        organization={organization}
      />
    );
  }

  render() {
    const {location, organization, transactionName} = this.props;
    const orgId = organization.slug;
    const baseUrl = `/organizations/${orgId}/performance/summary/`;

    return (
      <Layout.Header>
        <Layout.HeaderContent>
          <Breadcrumb
            organization={organization}
            location={location}
            transactionName={transactionName}
          />
          <Layout.Title>{transactionName}</Layout.Title>
        </Layout.HeaderContent>
        <Layout.HeaderActions>
          <ButtonBar gap={1}>
            <Feature organization={organization} features={['incidents']}>
              {this.renderCreateAlertButton()}
            </Feature>
            {this.renderKeyTransactionButton()}
          </ButtonBar>
        </Layout.HeaderActions>
        <div style={{width: '100%'}} />
        <Layout.HeaderNavTabs>
          <StyledNavTabs>
            <ListLink
              to={`${baseUrl}${location.search}`}
              isActive={() => baseUrl === location.pathname}
            >
              {t('Overview')}
            </ListLink>
            <ListLink
              to={`${baseUrl}rum/${location.search}`}
              isActive={() => location.pathname.includes('/rum/')}
            >
              {t('Real User Monitoring')}
            </ListLink>
          </StyledNavTabs>
        </Layout.HeaderNavTabs>
      </Layout.Header>
    );
  }
}

const StyledNavTabs = styled(NavTabs)`
  margin-bottom: 0;
`;

export default withProjects(TransactionHeader);
