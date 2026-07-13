import { DisplayPanel } from '../app/shell/DisplayPanel';
import { canonicalDisplayOutcomeFixture } from './canonical-display-outcome';

export function CanonicalDisplayPanel(props: Parameters<typeof DisplayPanel>[0]) {
  return (
    <DisplayPanel
      {...props}
      displayOutcome={canonicalDisplayOutcomeFixture(props.displayOutcome)}
    />
  );
}
