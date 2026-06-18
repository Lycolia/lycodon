import { useCallback, useEffect } from 'react';
import type { FC } from 'react';

import { FormattedMessage } from 'react-intl';

import { List as ImmutableList } from 'immutable';

import {
  expandTimelineByKey,
  timelineKey,
} from '@/mastodon/actions/timelines_typed';
import { AccountHeader } from '@/mastodon/components/account_header';
import { Column } from '@/mastodon/components/column';
import { ColumnBackButton } from '@/mastodon/components/column_back_button';
import { LimitedAccountHint } from '@/mastodon/components/limited_account_hint';
import { LoadingIndicator } from '@/mastodon/components/loading_indicator';
import { RemoteHint } from '@/mastodon/components/remote_hint';
import StatusList from '@/mastodon/components/status_list';
import { BundleColumnError } from '@/mastodon/features/ui/components/bundle_column_error';
import { useAccountId } from '@/mastodon/hooks/useAccountId';
import { useAccountVisibility } from '@/mastodon/hooks/useAccountVisibility';
import { selectTimelineByKey } from '@/mastodon/selectors/timelines';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

const emptyList = ImmutableList<string>();

const PinnedTimeline: FC<{ multiColumn: boolean }> = ({ multiColumn }) => {
  const accountId = useAccountId();

  if (accountId === null) {
    return <BundleColumnError multiColumn={multiColumn} errorType='routing' />;
  }

  if (!accountId) {
    return (
      <Column bindToDocument={!multiColumn}>
        <LoadingIndicator />
      </Column>
    );
  }

  return (
    <InnerPinnedTimeline
      accountId={accountId}
      key={accountId}
      multiColumn={multiColumn}
    />
  );
};

const InnerPinnedTimeline: FC<{ accountId: string; multiColumn: boolean }> = ({
  accountId,
  multiColumn,
}) => {
  const key = timelineKey({
    type: 'account',
    userId: accountId,
    pinned: true,
    boosts: true,
    replies: true,
  });

  const timeline = useAppSelector((state) => selectTimelineByKey(state, key));
  const { blockedBy, hidden, suspended } = useAccountVisibility(accountId);
  const forceEmptyState = blockedBy || hidden || suspended;

  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(expandTimelineByKey({ key }));
  }, [dispatch, key]);

  const handleLoadMore = useCallback(
    (maxId: number) => {
      dispatch(expandTimelineByKey({ key, maxId }));
    },
    [dispatch, key],
  );

  return (
    <Column bindToDocument={!multiColumn}>
      <ColumnBackButton />

      <StatusList
        alwaysPrepend
        prepend={
          <AccountHeader accountId={accountId} hideTabs={forceEmptyState} />
        }
        append={<RemoteHint accountId={accountId} />}
        scrollKey='pinned_timeline'
        statusIds={forceEmptyState ? emptyList : (timeline?.items ?? emptyList)}
        isLoading={!!timeline?.isLoading}
        hasMore={!forceEmptyState && !!timeline?.hasMore}
        onLoadMore={handleLoadMore}
        emptyMessage={<EmptyMessage accountId={accountId} />}
        bindToDocument={!multiColumn}
        timelineId='account'
        withCounters
      />
    </Column>
  );
};

const EmptyMessage: FC<{ accountId: string }> = ({ accountId }) => {
  const { blockedBy, hidden, suspended } = useAccountVisibility(accountId);

  if (suspended) {
    return (
      <FormattedMessage
        id='empty_column.account_suspended'
        defaultMessage='Account suspended'
      />
    );
  } else if (hidden) {
    return <LimitedAccountHint accountId={accountId} />;
  } else if (blockedBy) {
    return (
      <FormattedMessage
        id='empty_column.account_unavailable'
        defaultMessage='Profile unavailable'
      />
    );
  }

  return (
    <FormattedMessage
      id='empty_column.account_timeline'
      defaultMessage='No posts found'
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default PinnedTimeline;
