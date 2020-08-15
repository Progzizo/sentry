import React from 'react';
import styled from '@emotion/styled';
import capitalize from 'lodash/capitalize';
import {Location} from 'history';

import space from 'app/styles/space';
import {t, tct} from 'app/locale';
import DateTime from 'app/components/dateTime';
import {Organization} from 'app/types';
import EventView from 'app/utils/discover/eventView';
import {getTransactionDetailsUrl} from 'app/views/performance/utils';
import {PanelTable, PanelItem} from 'app/components/panels';
import Link from 'app/components/links/link';
import {TableDataRow} from 'app/utils/discover/discoverQuery';
import Tooltip from 'app/components/tooltip';
import {generateEventSlug, eventDetailsRouteWithEventView} from 'app/utils/discover/urls';
import {IconClock, IconFire, IconSpan, IconCopy} from 'app/icons';
import ProjectBadge from 'app/components/idBadge/projectBadge';
import TimeSince from 'app/components/timeSince';
import Projects from 'app/utils/projects';
import Clipboard from 'app/components/clipboard';

enum EVENT_TYPE {
  ERROR = 'error',
  TRANSACTION = 'transaction',
}

type Props = {
  relatedEvents: Array<TableDataRow>;
  eventView: EventView;
  organization: Organization;
  location: Location;
  isOriginDiscover?: boolean;
};

// List events that have the same tracing ID as the current Event
const RelatedEvents = ({
  isOriginDiscover = false,
  eventView,
  relatedEvents,
  organization,
  location,
}: Props) => {
  const orgSlug = organization.slug;

  const getTransactionLink = (transactionName: string, eventSlug: string) => {
    return getTransactionDetailsUrl(
      organization,
      eventSlug,
      transactionName,
      location.query
    );
  };

  const getEventTarget = (dataRow: TableDataRow & {type: EVENT_TYPE}) => {
    if (isOriginDiscover) {
      const eventSlug = generateEventSlug(dataRow);

      return eventDetailsRouteWithEventView({
        orgSlug,
        eventSlug,
        eventView,
      });
    }

    if (dataRow.type === EVENT_TYPE.ERROR) {
      return `/organizations/${orgSlug}/issues/${dataRow['issue.id']}/events/${dataRow.id}/`;
    }

    const eventSlug = generateEventSlug(dataRow);

    return getTransactionLink(String(dataRow.title), eventSlug);
  };

  const renderEventId = (dataRow: TableDataRow & {type: EVENT_TYPE}) => {
    const value = String(dataRow.id);
    return (
      <EventID>
        <Tooltip title={t('View Event')}>
          <StyledLink to={getEventTarget(dataRow)}>{value.slice(0, 7)}</StyledLink>
        </Tooltip>
        <Clipboard value={value}>
          <TooltipClipboardIconWrapper>
            <IconCopy />
          </TooltipClipboardIconWrapper>
        </Clipboard>
      </EventID>
    );
  };

  const renderIcon = (type: EVENT_TYPE) => {
    if (type === EVENT_TYPE.TRANSACTION) {
      return <IconSpan color="pink400" />;
    }
    return <IconFire color="red400" />;
  };

  const getEmptyMessage = () => {
    const timerangeStart = eventView?.start;
    const timerangeEnd = eventView?.end;

    if (timerangeStart && timerangeEnd) {
      return tct(
        'No related events were found for this event in the time period between [start] and [end].',
        {
          start: <DateTime date={timerangeStart} timeAndDate />,
          end: <DateTime date={timerangeEnd} timeAndDate />,
        }
      );
    }

    // this should not happen
    return t('No related events have been found for this event.');
  };

  return (
    <PanelTable
      isEmpty={!relatedEvents.length}
      emptyMessage={getEmptyMessage()}
      headers={[t('Id'), t('Title'), t('Type'), t('Project'), t('Created')]}
    >
      {relatedEvents.map((row, index) => {
        const {id, title, timestamp} = row;
        const project = String(row.project);

        const eventType = row['event.type'] as EVENT_TYPE;
        const isLast = index === relatedEvents.length - 1;

        return (
          <React.Fragment key={id}>
            <StyledPanelItem isLast={isLast}>
              {renderEventId({...row, type: eventType})}
            </StyledPanelItem>
            <StyledPanelItem isLast={isLast}>{title}</StyledPanelItem>
            <StyledPanelItem isLast={isLast}>
              <TypeWrapper>
                {renderIcon(eventType)}
                {capitalize(eventType)}
              </TypeWrapper>
            </StyledPanelItem>
            <StyledPanelItem isLast={isLast}>
              <Projects orgId={orgSlug} slugs={[project]}>
                {({projects}) => {
                  const proj = projects.find(p => p.slug === project);
                  return (
                    <ProjectBadge
                      project={proj ? proj : {slug: project}}
                      avatarSize={16}
                    />
                  );
                }}
              </Projects>
            </StyledPanelItem>
            <StyledPanelItem isLast={isLast}>
              <TimeWrapper>
                <IconClock size="16px" />
                <StyledTimeSince date={timestamp} />
                <div>{'\u2014'}</div>
                <DateTime date={timestamp} />
              </TimeWrapper>
            </StyledPanelItem>
          </React.Fragment>
        );
      })}
    </PanelTable>
  );
};

export default RelatedEvents;

// const Action = styled('div')`
//   display: flex;
//   justify-content: flex-end;
//   margin-bottom: ${space(2)};
// `;

const StyledPanelItem = styled(PanelItem)<{isLast: boolean}>`
  padding: ${space(1)} ${space(2)};
  font-size: ${p => p.theme.fontSizeMedium};
  align-items: center;
  ${p => p.isLast && `border-bottom: none`};
  min-width: auto;
`;

const StyledTimeSince = styled(TimeSince)`
  color: ${p => p.theme.gray800};
`;

const StyledLink = styled(Link)`
  > div {
    display: inline;
  }
`;

const TimeWrapper = styled('div')`
  display: grid;
  grid-template-columns: max-content max-content max-content max-content;
  grid-gap: ${space(1)};
  align-items: center;
  color: ${p => p.theme.gray500};
`;

const TypeWrapper = styled('div')`
  display: grid;
  grid-template-columns: max-content 1fr;
  grid-gap: ${space(1)};
  align-items: center;
`;

const EventID = styled('div')`
  display: grid;
  grid-template-columns: max-content 1fr;
  grid-gap: ${space(1)};
  align-items: center;
`;

const TooltipClipboardIconWrapper = styled('span')`
  line-height: 1;
  &:hover {
    cursor: pointer;
  }
`;
