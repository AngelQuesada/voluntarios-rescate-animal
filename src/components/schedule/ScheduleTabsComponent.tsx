import React from 'react';
import { Tabs, Tab, Box, Badge } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import HistoryIcon from '@mui/icons-material/History';
import { triggerVibration } from '@/lib/vibration';

interface ScheduleTabsProps {
  activeTab: number;
  myShiftsCount: number;
  handleTabChange: (event: React.SyntheticEvent, newValue: number) => void;
}

const ScheduleTabsComponent: React.FC<ScheduleTabsProps> = ({
  activeTab,
  myShiftsCount,
  handleTabChange,
}) => {
  const handleTabChangeWithVibration = (event: React.SyntheticEvent, newValue: number) => {
    triggerVibration(30);
    handleTabChange(event, newValue);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs
        value={activeTab}
        onChange={handleTabChangeWithVibration}
        aria-label="Pestañas de calendario"
        variant="fullWidth"
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab icon={<CalendarTodayIcon />} label="Turnos" id="tab-0" aria-controls="tabpanel-0" />
        <Tab
          icon={
            <Badge
              badgeContent={myShiftsCount}
              color="primary"
              max={99}
              sx={{
                '& .MuiBadge-badge': {
                  right: -3,
                  top: 3,
                },
              }}
            >
              <AssignmentIndIcon />
            </Badge>
          }
          label="Mis turnos"
          id="tab-1"
          aria-controls="tabpanel-1"
        />
        <Tab icon={<HistoryIcon />} label="Mi historial" id="tab-2" aria-controls="tabpanel-2" />
      </Tabs>
    </Box>
  );
};

export default ScheduleTabsComponent;
