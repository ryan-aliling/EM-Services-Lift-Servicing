import { Step, StepLabel, Stepper } from '@mui/material';
import StatusChip from '../../components/StatusChip';

// Visual progress indicator — client feedback: "easy user flow", staff should
// always know "where is this job right now" the way a Grab/Shopee tracker works.
// Built on MUI's Stepper for the same look/feel as the rest of the app.
const STEPS = ['Scheduled', 'Assigned', 'In Progress', 'Completed'];

export default function StatusStepper({ status }) {
  if (status === 'Cancelled') {
    return <StatusChip value="Cancelled" colorMap={{ Cancelled: 'default' }} />;
  }

  const activeStep = STEPS.indexOf(status);

  return (
    <Stepper activeStep={activeStep} alternativeLabel sx={{ minWidth: 320 }}>
      {STEPS.map((step) => (
        <Step key={step}>
          <StepLabel>{step}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}
