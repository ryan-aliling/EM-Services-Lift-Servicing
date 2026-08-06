import { Box, Card, CardContent, Stack, Typography } from '@mui/material';

export default function StatCard({ label, value, icon, color = 'primary.main' }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ color, display: 'flex', fontSize: 32 }}>{icon}</Box>
          <Box>
            <Typography variant="h5">{value ?? '—'}</Typography>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
