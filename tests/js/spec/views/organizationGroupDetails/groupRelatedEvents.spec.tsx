import React from 'react';

import {mountWithTheme} from 'sentry-test/enzyme';

import GroupRelatedEvents, {
  GroupRelatedEventsProps,
} from 'app/views/organizationGroupDetails/groupRelatedEvents';
import {DEFAULT_EVENT_VIEW} from 'app/views/eventsV2/data';
import EventView from 'app/utils/discover/eventView';

describe('GroupRelatedEvents', () => {
  const eventView = EventView.fromSavedQuery(DEFAULT_EVENT_VIEW);
  // @ts-ignore Cannot find name 'TestStubs'
  const organization = TestStubs.Organization({
    features: ['discover-basic', 'related-events'],
  });

  // @ts-ignore Cannot find name 'TestStubs'
  const project = TestStubs.Project();

  // @ts-ignore Cannot find name 'TestStubs'
  const group = TestStubs.Group();

  // @ts-ignore Cannot find name 'TestStubs'
  const location = TestStubs.location({
    pathname: `/organizations/${organization.slug}/${project.slug}/${group.groupID}/`,
    query: {},
  });

  const relatedEvents: GroupRelatedEventsProps['relatedEvents'] = [
    {
      'event.type': 'transaction',
      id: 'transactiontest1',
      issue: 'unknown',
      'issue.id': '1',
      lastSeen: '',
      project: 'issues',
      'project.id': '1',
      timestamp: '2020-08-10T13:25:27+00:00',
      title: 'GET /users',
      'trace.span': 'transaction1',
    },
    {
      'event.type': 'error',
      id: 'errortest1',
      issue: 'unknown',
      'issue.id': '2',
      lastSeen: '',
      project: 'issues',
      'project.id': '2',
      timestamp: '2020-08-10T13:24:26+00:00',
      title: '/',
      'trace.span': 'error1',
    },
  ];

  it('displays empty state', () => {
    const wrapper = mountWithTheme(
      <GroupRelatedEvents
        organization={organization}
        eventView={eventView}
        relatedEvents={[]}
        location={location}
      />
    );

    const emptyStateWarning = wrapper.find('EmptyStateWarning');
    expect(emptyStateWarning).toHaveLength(1);
    expect(emptyStateWarning.text()).toEqual(
      'No related events have been found for this event.'
    );
  });

  it('displays a list of Related Events', () => {
    const wrapper = mountWithTheme(
      <GroupRelatedEvents
        organization={organization}
        eventView={eventView}
        relatedEvents={relatedEvents}
        location={location}
      />,
      // @ts-ignore
      TestStubs.routerContext()
    );

    const emptyStateWarning = wrapper.find('EmptyStateWarning');
    expect(emptyStateWarning).toHaveLength(0);

    const openInDiscoverButton = wrapper.find('Button');
    expect(openInDiscoverButton).toHaveLength(1);
    expect(openInDiscoverButton.text()).toEqual('Open in Discover');

    const panelTable = wrapper.find('PanelTable');
    expect(panelTable).toHaveLength(1);

    const paneltableHeader = wrapper.find('PanelTableHeader');
    expect(paneltableHeader).toHaveLength(5);

    const panelItems = wrapper.find('StyledPanelItem');
    expect(panelItems).toHaveLength(10);

    const styledLinks = panelItems.find('StyledLink');
    expect(styledLinks).toHaveLength(2);
    expect(styledLinks.at(0).text()).toEqual(String(relatedEvents[0].id).slice(0, 7));
    expect(styledLinks.at(1).text()).toEqual(String(relatedEvents[1].id).slice(0, 7));

    expect(styledLinks.at(0).props().to).toStrictEqual({
      pathname: `/organizations/org-slug/performance/issues:${relatedEvents[0].id}/`,
      query: {
        transaction: relatedEvents[0].title,
      },
    });

    expect(styledLinks.at(1).props().to).toEqual(
      `/organizations/${organization.slug}/${relatedEvents[1].project}/${relatedEvents[1]['issue.id']}/events/${relatedEvents[1].id}/`
    );
  });
});
