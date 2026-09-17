export function Stepper({ step, total }: { step: number; total: number }) {
  return (
    <div className="stepper" aria-label={`Step ${step + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < step ? 'done' : i === step ? 'now' : ''} />
      ))}
    </div>
  )
}

interface ActionsProps {
  onBack?: () => void
  onNext: () => void
  onSkip?: () => void
  nextLabel?: string
  isLast?: boolean
}

export function StepActions({ onBack, onNext, onSkip, nextLabel, isLast }: ActionsProps) {
  return (
    <div className="step-actions">
      {onBack && <button type="button" className="btn btn-ghost" onClick={onBack}>Back</button>}
      {onSkip && !isLast && <button type="button" className="btn btn-quiet" onClick={onSkip}>Skip this one</button>}
      <button type="button" className="btn btn-primary" onClick={onNext}>{nextLabel ?? (isLast ? 'Finish' : 'Next')}</button>
    </div>
  )
}
