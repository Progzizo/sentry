import React from 'react';

import Feature from 'app/components/acl/feature';

import Content from './content';

type Props = React.ComponentProps<typeof Content>;

const EventRelatedEvents = ({organization, ...props}: Props) => (
  <Feature
    organization={organization}
    features={['discover-basic', 'performance-view']}
    requireAll={false}
  >
    <Content organization={organization} {...props} />
  </Feature>
);

export default EventRelatedEvents;
