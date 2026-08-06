import { Chip } from '@mui/material';

// colorMap: { [statusValue]: MUI Chip color ('success' | 'warning' | 'error' | 'default' | ...) }
export default function StatusChip({ value, colorMap = {} }) {
  return <Chip label={value} color={colorMap[value] || 'default'} size="small" />;
}
