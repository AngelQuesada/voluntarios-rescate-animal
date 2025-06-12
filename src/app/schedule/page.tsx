'use client';

import { useState } from 'react';
import ScheduleContent from '@/components/schedule/schedule-content';
import { Header } from '@/components/schedule/header';
import { startOfDay } from 'date-fns';
import RoleProtected from '@/components/auth/RoleProtected';

export interface ScheduleContentProps {
  startDate: Date;
  endDate: Date;
}

export default function SchedulePage() {
  const [dateRange] = useState(() => {
    const start = startOfDay(new Date());
    const end = startOfDay(new Date());
    end.setDate(start.getDate() + 14);
    return { start, end };
  });

  return (
    <RoleProtected>
      <div>
        <div className="shadow">
          <Header />
        </div>
        <ScheduleContent startDate={dateRange.start} endDate={dateRange.end} />
      </div>
    </RoleProtected>
  );
}
