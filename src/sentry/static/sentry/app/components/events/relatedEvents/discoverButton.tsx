import React from 'react';

import {t} from 'app/locale';
import Button from 'app/components/button';
import {IconTelescope} from 'app/icons';
import EventView from 'app/utils/discover/eventView';
import {Organization} from 'app/types';

type Props = {
  orgSlug: Organization['slug'];
  eventView: EventView;
};

const DiscoverButton = ({eventView, orgSlug}: Props) => (
  <Button
    size="small"
    to={eventView.getResultsViewUrlTarget(orgSlug)}
    icon={<IconTelescope size="xs" />}
  >
    {t('Open in Discover')}
  </Button>
);

export default DiscoverButton;
