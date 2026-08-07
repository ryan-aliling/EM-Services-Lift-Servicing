import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import StatusChip from '../../components/StatusChip';
import { fetchSchedules } from '../../api/scheduleApi';
import { fetchInspections } from '../../api/inspectionApi';
import { fetchDefects } from '../../api/defectApi';
import { fetchRectifications } from '../../api/rectificationApi';
import { formatDate } from '../../utils/formatDate';
import {
  SCHEDULE_STATUS_COLORS,
  INSPECTION_STATUS_COLORS,
  DEFECT_STATUS_COLORS,
  RECTIFICATION_STATUS_COLORS,
} from '../../theme/statusColors';

const TABS = ['Schedules', 'Inspections', 'Defects', 'Rectifications'];

/**
 * Shows every other module's records for one lift, so a Manager can see the full service
 * history without leaving the Lift Management page - the "pages rely on data from other pages"
 * requirement, applied at the level of a single lift.
 */
export default function LiftDetailDialog({ open, lift, onClose }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ schedules: [], inspections: [], defects: [], rectifications: [] });

  useEffect(() => {
    if (!open || !lift) return;
    setLoading(true);
    // Scheduling/Inspections/Defects/Rectifications backend routes aren't built yet, so each
    // call is allowed to fail independently (falling back to an empty list) instead of one
    // 404 blanking out the whole dialog via Promise.all's fail-fast behaviour.
    const safe = (promise) => promise.catch(() => []);
    Promise.all([
      safe(fetchSchedules({ lift: lift._id })),
      safe(fetchInspections({ lift: lift._id })),
      safe(fetchDefects({ lift: lift._id })),
      safe(fetchRectifications({ lift: lift._id })),
    ])
      .then(([schedules, inspections, defects, rectifications]) =>
        setData({ schedules, inspections, defects, rectifications })
      )
      .finally(() => setLoading(false));
  }, [open, lift]);

  if (!lift) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {lift.liftCode} — Blk {lift.block}, {lift.unit}
      </DialogTitle>
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ px: 3 }}>
        {TABS.map((label, i) => (
          <Tab key={label} label={`${label} (${data[label.toLowerCase()]?.length ?? 0})`} value={i} />
        ))}
      </Tabs>
      <Divider />
      <DialogContent sx={{ minHeight: 320 }}>
        {loading && <Typography color="text.secondary">Loading…</Typography>}

        {!loading && tab === 0 && (
          <RecordList
            items={data.schedules}
            empty="No servicing schedules for this lift yet."
            onClick={() => {
              onClose();
              navigate('/scheduling');
            }}
            render={(s) => (
              <ListItemText primary={`${s.blockAddress} — ${s.liftCompany}`} secondary={formatDate(s.scheduledDate)} />
            )}
            status={(s) => <StatusChip value={s.status} colorMap={SCHEDULE_STATUS_COLORS} />}
          />
        )}

        {!loading && tab === 1 && (
          <RecordList
            items={data.inspections}
            empty="No inspections recorded for this lift yet."
            onClick={() => {
              onClose();
              navigate('/inspections');
            }}
            render={(i) => (
              <ListItemText primary={`${i.reportNo} — ${i.contractor}`} secondary={formatDate(i.inspectionDate)} />
            )}
            status={(i) => <StatusChip value={i.overallStatus} colorMap={INSPECTION_STATUS_COLORS} />}
          />
        )}

        {!loading && tab === 2 && (
          <RecordList
            items={data.defects}
            empty="No defects reported for this lift."
            onClick={() => {
              onClose();
              navigate('/defects');
            }}
            render={(d) => <ListItemText primary={`${d.defectNo} — ${d.title}`} secondary={d.location} />}
            status={(d) => <StatusChip value={d.status} colorMap={DEFECT_STATUS_COLORS} />}
          />
        )}

        {!loading && tab === 3 && (
          <RecordList
            items={data.rectifications}
            empty="No rectifications logged for this lift."
            onClick={() => {
              onClose();
              navigate('/rectifications');
            }}
            render={(r) => (
              <ListItemText
                primary={r.rectificationId}
                secondary={r.defect ? `${r.defect.defectNo} — ${r.defect.title}` : 'Legacy record'}
              />
            )}
            status={(r) => <StatusChip value={r.status} colorMap={RECTIFICATION_STATUS_COLORS} />}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RecordList({ items, empty, render, status, onClick }) {
  if (items.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        {empty}
      </Typography>
    );
  }

  return (
    <List>
      {items.map((item) => (
        <ListItemButton key={item._id} onClick={onClick} divider>
          <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%">
            <Box>{render(item)}</Box>
            {status(item)}
          </Stack>
        </ListItemButton>
      ))}
    </List>
  );
}
