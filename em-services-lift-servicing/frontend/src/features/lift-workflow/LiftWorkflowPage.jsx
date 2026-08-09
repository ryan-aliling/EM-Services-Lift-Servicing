import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Button, Chip, Stack, Tooltip, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardOutlined';
import ChangeCircleOutlinedIcon from '@mui/icons-material/ChangeCircleOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined';
import StatusChip from '../../components/StatusChip';
import LiftSearchScreen from './LiftSearchScreen';
import WorkflowStepper from './WorkflowStepper';
import SchedulingStep from './steps/SchedulingStep';
import InspectionsStep from './steps/InspectionsStep';
import DefectsStep from './steps/DefectsStep';
import RectificationsStep from './steps/RectificationsStep';
import { WORKFLOW_STEPS } from './workflowSteps';
import { useLiftWorkflowStatus } from './useLiftWorkflowStatus';
import { LIFT_STATUS_COLORS } from '../../theme/statusColors';

const STEP_COMPONENTS = [SchedulingStep, InspectionsStep, DefectsStep, RectificationsStep];

// Orchestrator for the combined Scheduling -> Inspections -> Defects -> Rectifications
// workflow. Each of those four modules keeps its own separate API/controller/model
// (see steps/*.jsx) - this page only picks which lift to work on and which step's scoped
// list+CRUD to show, mirroring the app's existing tab-based (not nested-route) navigation.
export default function LiftWorkflowPage() {
  // LiftDetailDialog (Lifts page's "View history" action) deep-links here by passing the
  // lift + target step via navigate(..., { state }) - this page has no URL/query-param
  // routing of its own, so that's the only way in besides picking a lift from
  // LiftSearchScreen. Read once on mount; only relevant the instant this page is navigated
  // to, so a later in-place state change (there isn't one) doesn't need to be tracked.
  const location = useLocation();
  const [selectedLift, setSelectedLift] = useState(location.state?.lift ?? null);
  const [activeStep, setActiveStep] = useState(location.state?.step ?? 0);

  // Hooks can't be called conditionally, so this runs even before a lift is picked -
  // useLiftWorkflowStatus no-ops until it's given a real liftId. Keyed on activeStep too
  // so stepping Back/Next re-fetches and picks up anything just created/updated in the
  // step the user came from.
  const { stage, attentionReasons } = useLiftWorkflowStatus(selectedLift?._id, activeStep);

  if (!selectedLift) {
    return (
      <LiftSearchScreen
        onSelectLift={(lift) => {
          setSelectedLift(lift);
          setActiveStep(0);
        }}
      />
    );
  }

  const StepComponent = STEP_COMPONENTS[activeStep];

  // From step 0 (Scheduling) there's no previous step to go back to, so "Back" instead
  // backs out to lift search - same action as "Change Lift" above. Resetting activeStep
  // here too (rather than relying on it already being 0) keeps this correct even if a
  // future step ever gets inserted before Scheduling.
  const handleBack = () => {
    if (activeStep === 0) {
      setSelectedLift(null);
      setActiveStep(0);
    } else {
      setActiveStep((s) => Math.max(0, s - 1));
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {selectedLift.liftCode}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Blk {selectedLift.block}, {selectedLift.unit}
          </Typography>
          <StatusChip value={selectedLift.status} colorMap={LIFT_STATUS_COLORS} />
          {stage && <Chip label={stage.label} color={stage.color} size="small" variant="outlined" />}
          {attentionReasons.length > 0 && (
            <Tooltip
              title={
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  {attentionReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </Box>
              }
            >
              <WarningAmberIcon fontSize="small" color="warning" />
            </Tooltip>
          )}
        </Stack>
        <Button
          size="small"
          startIcon={<ChangeCircleOutlinedIcon />}
          onClick={() => setSelectedLift(null)}
        >
          Change Lift
        </Button>
      </Stack>

      <WorkflowStepper activeStep={activeStep} onStepChange={setActiveStep} />

      <Box sx={{ mb: 3 }}>
        <StepComponent lift={selectedLift} />
      </Box>

      <Stack direction="row" justifyContent="space-between">
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
          Back
        </Button>
        <Button
          endIcon={<ArrowForwardIcon />}
          variant="contained"
          disabled={activeStep === WORKFLOW_STEPS.length - 1}
          onClick={() => setActiveStep((s) => Math.min(WORKFLOW_STEPS.length - 1, s + 1))}
        >
          Next
        </Button>
      </Stack>
    </Box>
  );
}
