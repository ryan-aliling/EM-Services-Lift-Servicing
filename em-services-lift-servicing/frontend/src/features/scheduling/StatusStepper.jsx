// Visual progress indicator — client feedback: "easy user flow", staff should
// always know "where is this job right now" the way a Grab/Shopee tracker works.
const STEPS = ['Scheduled', 'Assigned', 'In Progress', 'Completed'];

export default function StatusStepper({ status }) {
  if (status === 'Cancelled') {
    return (
      <div className="status-stepper status-stepper--cancelled">
        <span className="status-pill status-pill--cancelled">Cancelled</span>
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(status);

  return (
    <ol className="status-stepper">
      {STEPS.map((step, index) => {
        let state = 'pending';
        if (index < currentIndex) state = 'done';
        else if (index === currentIndex) state = 'current';

        return (
          <li key={step} className={`status-step status-step--${state}`}>
            <span className="status-step__marker">{state === 'done' ? '✓' : index + 1}</span>
            <span className="status-step__label">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
