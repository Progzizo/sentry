import React from 'react';
import {Location} from 'history';
import uniqBy from 'lodash/uniqBy';
import moment from 'moment-timezone';

import {t} from 'app/locale';
import {Organization, Event} from 'app/types';
import EventView from 'app/utils/discover/eventView';
import DiscoverQuery from 'app/utils/discover/discoverQuery';
import LoadingIndicator from 'app/components/loadingIndicator';
import EventDataSection from 'app/components/events/eventDataSection';
import {ALL_ACCESS_PROJECTS} from 'app/constants/globalSelectionHeader';
import {getTraceDateTimeRange} from 'app/components/events/interfaces/spans/utils';
import EmptyStateWarning from 'app/components/emptyStateWarning';
import {Panel} from 'app/components/panels';

import RelatedEvents from '../relatedEvents';
import DiscoverButton from '../relatedEvents/discoverButton';

type Props = {
  location: Location;
  event: Event;
  organization: Organization;
  isOriginDiscover: boolean;
};

const Content = ({event, organization, location, isOriginDiscover}: Props) => {
  const orgFeatures = organization.features;

  const getEventView = () => {
    const traceID = event.contexts?.trace?.trace_id;

    if (!traceID) {
      return undefined;
    }

    const dateCreated = moment(event.dateCreated).valueOf() / 1000;
    const pointInTime = event.dateReceived
      ? moment(event.dateReceived).valueOf() / 1000
      : dateCreated;

    const {start, end} = getTraceDateTimeRange({
      start: pointInTime,
      end: pointInTime,
    });

    return EventView.fromSavedQuery({
      id: undefined,
      name: `Events with Trace ID ${traceID}`,
      fields: [
        'title',
        'event.type',
        'project',
        'project.id',
        'trace.span',
        'timestamp',
        'lastSeen',
        'issue',
      ],
      orderby: '-timestamp',
      query: `trace:${traceID}`,
      projects: orgFeatures.includes('global-views')
        ? [ALL_ACCESS_PROJECTS]
        : [Number(event.projectID)],
      version: 2,
      start,
      end,
    });
  };

  const eventView = getEventView();
  const orgSlug = organization.slug;

  const eventDataSectionProps = {
    type: 'related-events',
    title: t('Related Events'),
  };

  return eventView ? (
    <DiscoverQuery location={location} eventView={eventView} orgSlug={orgSlug}>
      {discoverData => {
        if (discoverData.isLoading) {
          return <LoadingIndicator />;
        }

        const relatedEvents = uniqBy(discoverData.tableData?.data, 'id').filter(
          evt => evt.id !== event.id
        );

        return (
          <EventDataSection
            {...eventDataSectionProps}
            actions={
              relatedEvents.length > 0 &&
              !isOriginDiscover && (
                <DiscoverButton orgSlug={orgSlug} eventView={eventView} />
              )
            }
          >
            <RelatedEvents
              relatedEvents={relatedEvents}
              eventView={eventView}
              organization={organization}
              location={location}
              isOriginDiscover={isOriginDiscover}
            />
          </EventDataSection>
        );
      }}
    </DiscoverQuery>
  ) : (
    <EventDataSection {...eventDataSectionProps}>
      <Panel>
        <EmptyStateWarning small>
          {t(
            'This event has no trace id, therefore it was not possible to fetch the Related Events by trace id.'
          )}
        </EmptyStateWarning>
      </Panel>
    </EventDataSection>
  );
};

export default Content;
