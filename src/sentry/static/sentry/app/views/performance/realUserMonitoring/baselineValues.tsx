import React from 'react';
import {Location} from 'history';
import styled from '@emotion/styled';

import {Panel} from 'app/components/panels';
import {
  // IconCreditCard,
  IconLaptop,
  IconLocation,
  // IconNetwork,
  IconWindow,
  // IconImage,
} from 'app/icons';
import space from 'app/styles/space';
import {Organization} from 'app/types';
import EventView from 'app/utils/discover/eventView';
import BaselineQuery from 'app/views/performance/transactionSummary/baselineQuery';
import {formatPercentage} from 'app/utils/formatters';

import {
  Card,
  CardSummary,
  CardSectionHeading,
  StatNumber,
  Description,
  formatDuration,
} from './styles';
import TagQuery from './tagQuery';

type Props = {
  organization: Organization;
  location: Location;
  eventView: EventView;
};

enum KeyTag {
  device = 'device.family',
  browser = 'browser.name',
  region = 'geo.country_code',
}

type KeyTagDisplay = {
  name: string;
  icon: React.ReactNode;
  heading: string;
  formatter: (name: string, count: number, total: number) => string;
};

const KEY_TAG_DISPLAY: Record<KeyTag, KeyTagDisplay> = {
  [KeyTag.device]: {
    name: KeyTag.device,
    icon: <IconLaptop />,
    heading: 'Device Specifications',
    formatter: (name, count, total) =>
      `${formatPercentage(count / total, 0)} with ${name}`,
  },
  [KeyTag.browser]: {
    name: KeyTag.browser,
    icon: <IconWindow />,
    heading: 'Browser Specifications',
    formatter: (name, count, total) =>
      `${formatPercentage(count / total, 0)} with ${name}`,
  },
  [KeyTag.region]: {
    name: KeyTag.region,
    icon: <IconLocation />,
    heading: 'Region',
    formatter: (name, count, total) => `${formatPercentage(count / total, 0)} in ${name}`,
  },
};

class BaselineValues extends React.Component<Props> {
  renderBaselineSummary() {
    const {eventView, location, organization} = this.props;

    return (
      <BaselineSummary>
        <TagQuery
          eventView={eventView}
          location={location}
          organization={organization}
          tagKeys={Object.values(KeyTag)}
        >
          {({isLoading, error, tags}) => {
            if (isLoading) {
              return null;
            }

            if (error) {
              return null;
            }

            return (tags ?? []).map(({key, topValues}) => {
              const total = topValues.reduce(
                (current, segment) => current + segment.count,
                0
              );

              const topValue = topValues.reduce((current, segment) =>
                current.count > segment.count ? current : segment
              );

              const {name, icon, heading, formatter} = KEY_TAG_DISPLAY[key];
              const details = formatter(topValue.name, topValue.count, total);

              return (
                <TransactionTag
                  key={name}
                  icon={icon}
                  heading={heading}
                  details={details}
                />
              );
            });
          }}
        </TagQuery>
      </BaselineSummary>
    );
  }

  render() {
    const {eventView, organization} = this.props;

    return (
      <BaselineQuery orgSlug={organization.slug} eventView={eventView}>
        {baselineResults => {
          const {isLoading, error, results} = baselineResults;
          const eventId = results?.id ?? null;
          const duration = results?.['transaction.duration'] ?? null;

          return (
            <Panel>
              <Card>
                <CardSummary>
                  <CardSectionHeading>Baseline Duration</CardSectionHeading>
                  <StatNumber>
                    {isLoading || error !== null || duration === null
                      ? '\u2014'
                      : formatDuration(duration)}
                  </StatNumber>
                  {eventId !== null && <Description>ID: {eventId}</Description>}
                </CardSummary>
                {this.renderBaselineSummary()}
              </Card>
            </Panel>
          );
        }}
      </BaselineQuery>
    );
  }
}

type TagProps = {
  icon: React.ReactNode;
  heading: string;
  details: string;
};

class TransactionTag extends React.Component<TagProps> {
  render() {
    const {icon, heading, details} = this.props;

    return (
      <SummaryItem>
        <SummaryIcon>{icon}</SummaryIcon>
        <SummaryDescription>
          <div>{heading}</div>
          <div>{details}</div>
        </SummaryDescription>
      </SummaryItem>
    );
  }
}

const BaselineSummary = styled('div')`
  display: grid;
  align-content: start;
  grid-template: 1fr 1fr / 1fr 1fr 1fr;
`;

const SummaryItem = styled('div')`
  display: grid;
  grid-template-columns: 20px auto;
  padding: ${space(3)} ${space(4)};
  font-size: 14px;
`;

const SummaryIcon = styled('div')`
  justify-self: center;
  padding: ${space(0.25)};
`;

const SummaryDescription = styled('div')`
  padding-left: ${space(1.5)};
`;

export default BaselineValues;
