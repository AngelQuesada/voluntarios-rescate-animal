export const textFieldStyles = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: 'rgba(0, 0, 0, 0.23)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(0, 0, 0, 0.87)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'primary.main',
    },
  },
  '& .MuiInputLabel-root': {
    backgroundColor: 'background.paper',
    padding: '0 4px',
    marginLeft: '-4px',
  },
};

export const buttonStyles = {
  mt: 3,
  mb: 2,
  height: 48,
  position: 'relative',
};

export const containerStyles = {
  minHeight: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  transform: 'translateY(-10%)',
  backgroundColor: '#ffffff',
};

export const paperStyles = {
  marginTop: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: 4,
  backgroundColor: '#ffffff',
  border: '1px solid rgba(0, 0, 0, 0.1)',
  borderRadius: 2,
  boxShadow: 'none',
};
