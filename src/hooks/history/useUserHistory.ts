import { useState, useMemo } from 'react';
import { useGetUserShiftsQuery } from '../../store/api/shiftsApi';
import { subMonths, formatISO, parseISO, startOfDay } from 'date-fns';

export interface UserHistoryShift {
  id: string;
  date: string;
  area: string;
}

declare global {
  interface Window {
    __E2E_MOCK_USER_HISTORY__?: {
      data: UserHistoryShift[] | null;
      isLoading?: boolean;
      error?: Error | null;
    };
  }
}

interface UseUserHistoryParams {
  userId?: string;
}

export function useUserHistory({ userId }: UseUserHistoryParams) {
  let isLoadingQuery: boolean = false;
  let isFetchingQuery: boolean = false;
  let errorQuery: Error | null = null;
  let refetchQuery: () => Promise<void> = () => Promise.resolve();

  const e2eMock =
    typeof window !== 'undefined' && window.__E2E_MOCK_USER_HISTORY__ !== undefined
      ? window.__E2E_MOCK_USER_HISTORY__
      : null;

  if (e2eMock) {
    isLoadingQuery = e2eMock.isLoading !== undefined ? e2eMock.isLoading : false;
    isFetchingQuery = e2eMock.isLoading !== undefined ? e2eMock.isLoading : false;
    errorQuery = e2eMock.error !== undefined ? e2eMock.error : null;
    refetchQuery = () => Promise.resolve();
  }

  const [dateRange] = useState(() => {
    const endDate = new Date();
    const startDate = subMonths(endDate, 3);
    return {
      startDate: formatISO(startDate),
      endDate: formatISO(endDate),
    };
  });

  const queryResult = useGetUserShiftsQuery(
    {
      userId: userId!,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
    {
      skip: !userId || !!e2eMock,
    }
  );

  if (!e2eMock) {
    isLoadingQuery = queryResult.isLoading;
    isFetchingQuery = queryResult.isFetching;
    errorQuery = queryResult.error as Error | null;
    refetchQuery = async () => {
      await queryResult.refetch();
    };
  }

  const threeMonthShiftsFromApi = useMemo(() => {
    if (e2eMock || !queryResult.data) {
      return e2eMock ? e2eMock.data || [] : [];
    }

    const allShifts: UserHistoryShift[] = [];
    Object.keys(queryResult.data).forEach((dateKey) => {
      const dayShifts = queryResult.data![dateKey];
      if (dayShifts.M) {
        allShifts.push({
          id: `${dateKey}_M`,
          date: dateKey,
          area: 'Mañana',
        });
      }
      if (dayShifts.T) {
        allShifts.push({
          id: `${dateKey}_T`,
          date: dateKey,
          area: 'Tarde',
        });
      }
    });
    allShifts.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    return allShifts;
  }, [e2eMock, queryResult.data]);

  const sourceShifts = useMemo(
    () => (e2eMock ? e2eMock.data || [] : threeMonthShiftsFromApi),
    [e2eMock, threeMonthShiftsFromApi]
  );

  const filteredShifts = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const threeMonthsAgo = startOfDay(subMonths(new Date(), 3));

    return sourceShifts.filter((shift) => {
      const shiftDate = parseISO(shift.date);
      return shiftDate < todayStart && shiftDate >= threeMonthsAgo;
    });
  }, [sourceShifts]);

  return {
    shifts: filteredShifts,
    isLoading: isLoadingQuery,
    isFetching: isFetchingQuery,
    error: errorQuery,
    refetch: refetchQuery,
  };
}
