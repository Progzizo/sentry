import React from 'react';
import styled from '@emotion/styled';

import RelatedEvents from 'app/components/events/relatedEvents';
import DiscoverButton from 'app/components/events/relatedEvents/discoverButton';
import withOrganization from 'app/utils/withOrganization';
import {Organization} from 'app/types';
import space from 'app/styles/space';
import Feature from 'app/components/acl/feature';

type RelatedEventsProps = React.ComponentProps<typeof RelatedEvents>;

export type GroupRelatedEventsProps = Pick<
  RelatedEventsProps,
  'eventView' | 'relatedEvents' | 'location'
>;

type Props = {
  organization: Organization;
} & GroupRelatedEventsProps;

const GroupRelatedEvents = ({
  eventView,
  organization,
  relatedEvents,
  location,
}: Props) => (
  <React.Fragment>
    {relatedEvents.length > 0 && (
      <Action>
        <DiscoverButton orgSlug={organization.slug} eventView={eventView} />
      </Action>
    )}
    <RelatedEvents
      eventView={eventView}
      relatedEvents={relatedEvents}
      organization={organization}
      location={location}
    />
  </React.Fragment>
);

const GroupRelatedEventsContainer = ({organization, ...props}: Props) => (
  <Feature features={['related-events']} organization={organization}>
    <Feature
      features={['discover-basic', 'performance-view']}
      organization={organization}
      requireAll={false}
    >
      <GroupRelatedEvents organization={organization} {...props} />
    </Feature>
  </Feature>
);

export default withOrganization(GroupRelatedEventsContainer);

const Action = styled('div')`
  display: flex;
  justify-content: flex-end;
  margin-bottom: ${space(2)};
`;
