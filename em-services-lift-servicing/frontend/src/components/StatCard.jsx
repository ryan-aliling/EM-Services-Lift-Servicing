import { alpha, Box, Card, CardContent, Stack, Typography } from '@mui/material';

export default function StatCard({ label, value, icon, color = 'primary.main' }) {
  const paletteKey = color.split('.')[0];

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={(theme) => ({
              width: 48,
              height: 48,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 24,
              color,
              bgcolor: alpha(theme.palette[paletteKey]?.main ?? theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.12),
            })}
          >
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {value ?? '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {label}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
