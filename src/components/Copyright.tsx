import React from 'react';
import { Typography, Link as MuiLink } from '@mui/material';

const Copyright = () => {
  return (
    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 5 }}>
      {'Copyright © '}
      <MuiLink color="inherit" href="#">
        Rescate Animal Granada
      </MuiLink>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
};

export default Copyright;
