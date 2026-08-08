import { Step, StepButton, Stepper } from '@mui/material';
import { WORKFLOW_STEPS } from './workflowSteps';

// Header stepper for the Lift Workflow page. Unlike StatusStepper (scheduling/StatusStepper.jsx),
// which just visualises where a record's status sits, this one is `nonLinear` and every step is
// a clickable StepButton — the user asked to be able to jump straight to any of the 4 steps,
// not just move one at a time with Next/Back.
export default function WorkflowStepper({ activeStep, onStepChange }) {
  return (
    <Stepper nonLinear activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
      {WORKFLOW_STEPS.map((step, index) => (
        <Step key={step.key}>
          <StepButton onClick={() => onStepChange(index)}>{`(${index + 1}) ${step.label}`}</StepButton>
        </Step>
      ))}
    </Stepper>
  );
}
