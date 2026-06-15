import { Component, type ErrorInfo, type ReactNode } from 'react';
import type { CompartmentId } from '../../lib/compartments/manifest';
import { recordCompartmentUiBoundaryError } from '../../lib/compartments/ui-boundary-records';

type CompartmentErrorBoundaryProps = {
  compartmentId: CompartmentId;
  compartmentLabel: string;
  surfaceLabel: string;
  children: ReactNode;
};

type CompartmentErrorBoundaryState = {
  errorMessage: string | null;
};

export class CompartmentErrorBoundary extends Component<
  CompartmentErrorBoundaryProps,
  CompartmentErrorBoundaryState
> {
  state: CompartmentErrorBoundaryState = {
    errorMessage: null,
  };

  static getDerivedStateFromError(error: unknown): CompartmentErrorBoundaryState {
    return {
      errorMessage: error instanceof Error && error.message
        ? error.message
        : 'This compartment failed to render.',
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    recordCompartmentUiBoundaryError({
      compartmentId: this.props.compartmentId,
      compartmentLabel: this.props.compartmentLabel,
      error,
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  render() {
    if (!this.state.errorMessage) {
      return this.props.children;
    }

    return (
      <section
        className="compartment-error-boundary mode-panel"
        data-testid="compartment-error-boundary"
        role="alert"
      >
        <span className="compartment-error-boundary__kicker">
          {this.props.compartmentLabel}
        </span>
        <h2>{this.props.surfaceLabel} stopped rendering</h2>
        <p>{this.state.errorMessage}</p>
        <p className="compartment-error-boundary__hint">
          The app shell is still available. Open OOE Diagnostics to inspect the compartment record.
        </p>
      </section>
    );
  }
}
