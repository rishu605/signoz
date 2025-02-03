import { IOption } from 'hooks/useResourceAttribute/types';
import { cloneDeep } from 'lodash-es';
import { parse } from 'papaparse';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	OrderByPayload,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { ORDERBY_FILTERS } from './config';
import { SIGNOZ_VALUE } from './constants';

export const orderByValueDelimiter = '|';

const getOrderBy = (query: IBuilderQuery): OrderByPayload[] => {
	let orderBy = cloneDeep(query.orderBy);

	if (query.dataSource !== DataSource.LOGS) {
		return orderBy;
	}

	const isIdPresent = orderBy.some((item) => item.columnName === 'id');
	const timestampOrder = orderBy.find((item) => item.columnName === 'timestamp')
		?.order;
	const isTimestampPresent =
		orderBy.some((item) => item.columnName === 'timestamp') && timestampOrder;

	// Add ID if timestamp is present
	if (isTimestampPresent && !isIdPresent) {
		orderBy = [...orderBy, { columnName: 'id', order: timestampOrder }];
	}

	return orderBy;
};

export const transformToOrderByStringValues = (
	query: IBuilderQuery,
	entityVersion?: string,
): IOption[] => {
	const orderBy = getOrderBy(query);

	const prepareSelectedValue: IOption[] = orderBy.map((item) => {
		if (item.columnName === SIGNOZ_VALUE) {
			return {
				label: `${
					entityVersion === 'v4' ? query.spaceAggregation : query.aggregateOperator
				}(${query.aggregateAttribute.key}) ${item.order}`,
				value: `${item.columnName}${orderByValueDelimiter}${item.order}`,
			};
		}

		return {
			label: `${item.columnName} ${item.order}`,
			value: `${item.columnName}${orderByValueDelimiter}${item.order}`,
		};
	});

	return prepareSelectedValue;
};

export function mapLabelValuePairs(
	arr: BaseAutocompleteData[],
): Array<IOption>[] {
	return arr.map((item) => {
		const value = item.key;
		return [
			{
				label: `${value} ${ORDERBY_FILTERS.ASC}`,
				value: `${value}${orderByValueDelimiter}${ORDERBY_FILTERS.ASC}`,
			},
			{
				label: `${value} ${ORDERBY_FILTERS.DESC}`,
				value: `${value}${orderByValueDelimiter}${ORDERBY_FILTERS.DESC}`,
			},
		];
	});
}

export function getLabelFromValue(arr: IOption[]): string[] {
	return arr.flat().map((item) => {
		const match = parse(item.value, { delimiter: orderByValueDelimiter });
		if (match) {
			const [key] = match.data as string[];

			return key[0];
		}

		return item.value;
	});
}

export function checkIfKeyPresent(str: string, valueToCheck: string): boolean {
	return new RegExp(`\\(${valueToCheck}\\)`).test(str);
}

export function splitOrderByFromString(str: string): OrderByPayload | null {
	const splittedStr = str.split(' ');
	const order = splittedStr.pop() || ORDERBY_FILTERS.ASC;
	const columnName = splittedStr.join(' ');

	if (!columnName) return null;

	return { columnName, order };
}
