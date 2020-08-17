import React from 'react';
import {Location} from 'history';
import * as Sentry from '@sentry/react';
import pick from 'lodash/pick';

import {Tag} from 'app/actionCreators/events';
import {Client} from 'app/api';
import {URL_PARAM} from 'app/constants/globalSelectionHeader';
import {Organization} from 'app/types';
import EventView, {isAPIPayloadSimilar} from 'app/utils/discover/eventView';
import withApi from 'app/utils/withApi';

type ChildrenProps = {
  isLoading: boolean;
  error: string | null;
  tags: Tag[] | null;
};

type Props = {
  api: Client;
  eventView: EventView;
  location: Location;
  organization: Organization;
  children: (props: ChildrenProps) => React.ReactNode;
  tagKeys: string[];
};

type State = {
  isLoading: boolean;
  error: string | null;
  tags: Tag[] | null;
};

class TagQuery extends React.Component<Props, State> {
  state: State = {
    isLoading: true,
    error: null,
    tags: null,
  };

  componentDidMount() {
    this.fetchData();
  }

  componentDidUpdate(prevProps: Props) {
    if (this.shouldRefetchData(prevProps)) {
      this.fetchData();
    }
  }

  shouldRefetchData = (prevProps: Props): boolean => {
    const thisAPIPayload = this.props.eventView.getFacetsAPIPayload(this.props.location);
    const otherAPIPayload = prevProps.eventView.getFacetsAPIPayload(prevProps.location);

    return !isAPIPayloadSimilar(thisAPIPayload, otherAPIPayload);
  };

  fetchData = async () => {
    const {api, organization, eventView, location, tagKeys} = this.props;
    this.setState({isLoading: true, error: null, tags: []});

    try {
      const query = eventView.getFacetsAPIPayload(location);
      const tags = await api.requestPromise(
        `/organizations/${organization.slug}/events-facets/`,
        {
          query: {
            ...pick(query, Object.values(URL_PARAM)),
            query: query.query,
            tag: tagKeys,
          },
        }
      );
      this.setState({isLoading: false, tags});
    } catch (err) {
      Sentry.captureException(err);
      this.setState({isLoading: false, error: err});
    }
  };

  render() {
    const {children} = this.props;
    const {isLoading, error, tags} = this.state;
    return children({isLoading, error, tags});
  }
}

export default withApi(TagQuery);
