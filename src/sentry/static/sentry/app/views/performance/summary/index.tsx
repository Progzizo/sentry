import React from 'react';
import styled from '@emotion/styled';
import {Location} from 'history';

import {Client} from 'app/api';
import LightWeightNoProjectMessage from 'app/components/lightWeightNoProjectMessage';
import SentryDocumentTitle from 'app/components/sentryDocumentTitle';
import GlobalSelectionHeader from 'app/components/organizations/globalSelectionHeader';
import {t} from 'app/locale';
import {PageContent} from 'app/styles/organization';
import {GlobalSelection, Organization, Project} from 'app/types';
import withApi from 'app/utils/withApi';
import withGlobalSelection from 'app/utils/withGlobalSelection';
import withOrganization from 'app/utils/withOrganization';
import withProjects from 'app/utils/withProjects';

import {getTransactionName} from '../utils';

type Props = {
  api: Client;
  location: Location;
  selection: GlobalSelection;
  isGlobalSelectionReady: boolean;
  organization: Organization;
  projects: Project[];
  children: React.ReactNode;
};

class TransactionPerformance extends React.Component<Props> {
  getTransactionSummaryDocumentTitle(): string {
    const {location} = this.props;
    const name = getTransactionName(location);

    const hasTransactionName = typeof name === 'string' && String(name).trim().length > 0;

    if (hasTransactionName) {
      return [String(name).trim(), t('Performance')].join(' - ');
    }

    return [t('Summary'), t('Performance')].join(' - ');
  }

  getRealUserMonitoringDocumentTitle(): string {
    const {location} = this.props;
    const name = getTransactionName(location);

    const hasTransactionName = typeof name === 'string' && String(name).trim().length > 0;

    if (hasTransactionName) {
      return [String(name).trim(), t('RUM')].join(' - ');
    }

    return [t('Summary'), t('RUM')].join(' - ');
  }

  getDocumentTitle(): string {
    const pathName = this.props.location.pathname;
    if (pathName.endsWith('/performance/summary/')) {
      return this.getTransactionSummaryDocumentTitle();
    } else if (pathName.endsWith('/performance/summary/rum/')) {
      return this.getRealUserMonitoringDocumentTitle();
    } else {
      throw new Error(`Unknown path name: ${pathName}`);
    }
  }

  render() {
    const {organization, children} = this.props;

    return (
      <SentryDocumentTitle title={this.getDocumentTitle()} objSlug={organization.slug}>
        <GlobalSelectionHeader>
          <StyledPageContent>
            <LightWeightNoProjectMessage organization={organization}>
              {children}
            </LightWeightNoProjectMessage>
          </StyledPageContent>
        </GlobalSelectionHeader>
      </SentryDocumentTitle>
    );
  }
}

const StyledPageContent = styled(PageContent)`
  padding: 0;
`;

export default withApi(
  withGlobalSelection(withProjects(withOrganization(TransactionPerformance)))
);
