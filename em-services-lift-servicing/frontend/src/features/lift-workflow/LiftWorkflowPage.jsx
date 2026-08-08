import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardOutlined';
import ChangeCircleOutlinedIcon from '@mui/icons-material/ChangeCircleOutlined';
import StatusChip from '../../components/StatusChip';
import LiftSearchScreen from './LiftSearchScreen';
import WorkflowStepper from './WorkflowStepper';
import SchedulingStep from './steps/SchedulingStep';
import InspectionsStep from './steps/InspectionsStep';
import DefectsStep from './steps/DefectsStep';
import RectificationsStep from './steps/RectificationsStep';
import { WORKFLOW_STEPS } from './workflowSteps';
import { LIFT_STATUS_COLORS } from '../../theme/statusColors';

const STEP_COMPONENTS = [SchedulingStep, InspectionsStep, DefectsStep, RectificationsStep];

// Orchestrator for the combined Scheduling -> Inspections -> Defects -> Rectifications
// workflow. Each of those four modules keeps its own separate API/controller/model
// (see steps/*.jsx) - this page only picks which lift to work on and which step's scoped
// list+CRUD to show, mirroring the app's existing tab-based (not nested-route) navigation.
export default function LiftWorkflowPage() {
  const [selectedLift, setSelectedLift] = useState(null);
  const [activeStep, setActiveStep] = useState(0);

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
        <Button
          startIcon={<ArrowBackIcon />}
          disabled={activeStep === 0}
          onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
        >
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
