import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { QueryParams } from 'constants/query';
import {
	initialQueryBuilderFormValues,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { DEFAULT_PER_PAGE_VALUE } from 'container/Controls/config';
import { getPaginationQueryDataV2 } from 'lib/newQueryBuilder/getPaginationQueryData';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ILog } from 'types/api/logs/log';
import {
	IBuilderQuery,
	OrderByPayload,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { QueryDataV3 } from 'types/api/widgets/getQuery';
import { GlobalReducer } from 'types/reducer/globalTime';

import { LogTimeRange } from './logs/types';
import { useCopyLogLink } from './logs/useCopyLogLink';
import { useGetExplorerQueryRange } from './queryBuilder/useGetExplorerQueryRange';
import useUrlQueryData from './useUrlQueryData';

export const useLogsData = ({
	result,
	panelType,
	stagedQuery,
}: {
	result: QueryDataV3[] | undefined;
	panelType: PANEL_TYPES;
	stagedQuery: Query | null;
}): {
	logs: ILog[];
	handleEndReached: (index: number) => void;
	isFetching: boolean;
} => {
	const [logs, setLogs] = useState<ILog[]>([]);
	const [page, setPage] = useState<number>(1);
	const [requestData, setRequestData] = useState<Query | null>(null);
	const [shouldLoadMoreLogs, setShouldLoadMoreLogs] = useState<boolean>(false);

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { queryData: pageSize } = useUrlQueryData(
		QueryParams.pageSize,
		DEFAULT_PER_PAGE_VALUE,
	);

	const listQuery = useMemo(() => {
		if (!stagedQuery || stagedQuery?.builder?.queryData?.length < 1) return null;

		return stagedQuery.builder?.queryData.find((item) => !item.disabled) || null;
	}, [stagedQuery]);

	const isLimit: boolean = useMemo(() => {
		if (!listQuery) return false;
		if (!listQuery.limit) return false;

		return logs.length >= listQuery.limit;
	}, [logs.length, listQuery]);

	useEffect(() => {
		if (panelType !== PANEL_TYPES.LIST) return;
		const currentData = result || [];
		if (currentData.length > 0 && currentData[0].list) {
			const currentLogs: ILog[] = currentData[0].list.map((item) => ({
				...item.data,
				timestamp: item.timestamp,
			}));
			const newLogs = [...currentLogs];

			setLogs(newLogs);
		} else {
			setLogs([]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [result]);

	const getRequestData = useCallback(
		(
			query: Query | null,
			params: { orderBy: OrderByPayload[]; page: number; pageSize: number },
		) => {
			if (!query) return null;

			const { orderBy, page, pageSize } = params;

			const paginateDataV2 = getPaginationQueryDataV2({
				orderBy,
				page,
				pageSize,
			});

			const queryData: IBuilderQuery[] =
				query.builder.queryData.length > 1
					? query.builder.queryData
					: [
							{
								...(listQuery || initialQueryBuilderFormValues),
								...paginateDataV2,
							},
					  ];

			const data: Query = {
				...query,
				builder: {
					...query.builder,
					queryData,
				},
			};

			return data;
		},
		[listQuery],
	);

	const { activeLogId, onTimeRangeChange } = useCopyLogLink();

	const { data, isFetching } = useGetExplorerQueryRange(
		requestData,
		panelType,
		DEFAULT_ENTITY_VERSION,
		{
			keepPreviousData: true,
			enabled: !isLimit && !!requestData,
		},
		{
			...(activeLogId &&
				!logs.length && {
					start: minTime,
					end: maxTime,
				}),
		},
		shouldLoadMoreLogs,
	);

	useEffect(() => {
		const currentParams = data?.params as Omit<LogTimeRange, 'pageSize'>;
		const currentData = data?.payload?.data?.newResult?.data?.result || [];
		if (currentData.length > 0 && currentData[0].list) {
			const currentLogs: ILog[] = currentData[0].list.map((item) => ({
				...item.data,
				timestamp: item.timestamp,
			}));
			const newLogs = [...logs, ...currentLogs];

			setLogs(newLogs);
			onTimeRangeChange({
				start: currentParams?.start,
				end: currentParams?.end,
				pageSize: newLogs.length,
			});
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data]);

	const handleEndReached = useCallback(() => {
		if (!listQuery) return;

		if (isLimit) return;
		if (logs.length < pageSize) return;

		const { orderBy } = listQuery;

		if (!stagedQuery) return;

		const newRequestDataV2 = getRequestData(stagedQuery, {
			orderBy,
			page: page + 1,
			pageSize,
		});

		setPage((prevPage) => prevPage + 1);

		setRequestData(newRequestDataV2);
		setShouldLoadMoreLogs(true);
	}, [
		listQuery,
		isLimit,
		logs.length,
		pageSize,
		stagedQuery,
		getRequestData,
		page,
	]);

	return { logs, handleEndReached, isFetching };
};
