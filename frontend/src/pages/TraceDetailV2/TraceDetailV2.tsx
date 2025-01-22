import './TraceDetailV2.styles.scss';

import { Button, Tabs } from 'antd';
import TraceFlamegraph from 'container/PaginatedTraceFlamegraph/PaginatedTraceFlamegraph';
import TraceMetadata from 'container/TraceMetadata/TraceMetadata';
import TraceWaterfall, {
	IInterestedSpan,
} from 'container/TraceWaterfall/TraceWaterfall';
import useGetTraceV2 from 'hooks/trace/useGetTraceV2';
import useUrlQuery from 'hooks/useUrlQuery';
import { DraftingCompass } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TraceDetailV2URLProps } from 'types/api/trace/getTraceV2';

import NoData from './NoData/NoData';

function TraceDetailsV2(): JSX.Element {
	const { id: traceId } = useParams<TraceDetailV2URLProps>();
	const urlQuery = useUrlQuery();
	const [interestedSpanId, setInterestedSpanId] = useState<IInterestedSpan>(
		() => ({
			spanId: urlQuery.get('spanId') || '',
			isUncollapsed: urlQuery.get('spanId') !== '',
		}),
	);

	useEffect(() => {
		setInterestedSpanId({
			spanId: urlQuery.get('spanId') || '',
			isUncollapsed: urlQuery.get('spanId') !== '',
		});
	}, [urlQuery]);

	const [uncollapsedNodes, setUncollapsedNodes] = useState<string[]>([]);
	const {
		data: traceData,
		isFetching: isFetchingTraceData,
		error: errorFetchingTraceData,
	} = useGetTraceV2({
		traceId,
		uncollapsedSpans: uncollapsedNodes,
		selectedSpanId: interestedSpanId.spanId,
		isSelectedSpanIDUnCollapsed: interestedSpanId.isUncollapsed,
	});

	useEffect(() => {
		if (traceData && traceData.payload && traceData.payload.uncollapsedSpans) {
			setUncollapsedNodes(traceData.payload.uncollapsedSpans);
		}
	}, [traceData]);

	const items = [
		{
			label: (
				<Button
					type="text"
					icon={<DraftingCompass size="14" />}
					className="flamegraph-waterfall-toggle"
				>
					Flamegraph
				</Button>
			),
			key: 'flamegraph',
			children: (
				<>
					<TraceFlamegraph
						serviceExecTime={traceData?.payload?.serviceNameToTotalDurationMap || {}}
						startTime={traceData?.payload?.startTimestampMillis || 0}
						endTime={traceData?.payload?.endTimestampMillis || 0}
					/>
					<TraceWaterfall
						traceData={traceData}
						isFetchingTraceData={isFetchingTraceData}
						errorFetchingTraceData={errorFetchingTraceData}
						traceId={traceId}
						interestedSpanId={interestedSpanId}
						setInterestedSpanId={setInterestedSpanId}
						uncollapsedNodes={uncollapsedNodes}
					/>
				</>
			),
		},
	];

	return (
		<div className="trace-layout">
			<TraceMetadata
				traceID={traceId}
				duration={
					(traceData?.payload?.endTimestampMillis || 0) -
					(traceData?.payload?.startTimestampMillis || 0)
				}
				startTime={(traceData?.payload?.startTimestampMillis || 0) / 1e3}
				rootServiceName={traceData?.payload?.rootServiceName || ''}
				rootSpanName={traceData?.payload?.rootServiceEntryPoint || ''}
				totalErrorSpans={traceData?.payload?.totalErrorSpansCount || 0}
				totalSpans={traceData?.payload?.totalSpansCount || 0}
				notFound={(traceData?.payload?.spans.length || 0) === 0}
			/>
			{(traceData?.payload?.spans.length || 0) > 0 ? (
				<Tabs items={items} animated className="settings-tabs" />
			) : (
				<NoData />
			)}
		</div>
	);
}

export default TraceDetailsV2;
