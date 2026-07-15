import type {
  LinearAlgebraScalarDomain,
  LinearAlgebraSubstitutionMode,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';

type LinearAlgebraScalarControlsProps = {
  domain: LinearAlgebraScalarDomain;
  onDomainChange: (domain: LinearAlgebraScalarDomain) => void;
  onSubstitutionModeChange: (mode: LinearAlgebraSubstitutionMode) => void;
  substitutionMode: LinearAlgebraSubstitutionMode;
  usedValues: readonly VariableSubstitutionSnapshot[];
};

export function LinearAlgebraScalarControls({
  domain,
  onDomainChange,
  onSubstitutionModeChange,
  substitutionMode,
  usedValues,
}: LinearAlgebraScalarControlsProps) {
  return (
    <div className="linear-algebra-scalar-controls" aria-label="Linear Algebra scalar settings">
      <label>
        <span>Domain</span>
        <select
          aria-label="Scalar domain"
          value={domain}
          onChange={(event) => onDomainChange(event.currentTarget.value as LinearAlgebraScalarDomain)}
        >
          <option value="real">Real</option>
          <option value="complex">Complex</option>
        </select>
      </label>
      <label>
        <span>Parameters</span>
        <select
          aria-label="Parameter substitution"
          value={substitutionMode}
          onChange={(event) => onSubstitutionModeChange(event.currentTarget.value as LinearAlgebraSubstitutionMode)}
        >
          <option value="symbolic">Symbolic</option>
          <option value="use-stored-values">Use Stored Values</option>
        </select>
      </label>
      {substitutionMode === 'use-stored-values' ? (
        <span className="linear-algebra-used-values" aria-live="polite">
          {usedValues.length > 0
            ? `Used: ${usedValues.map((entry) => `${entry.name}=${entry.valueLatex}`).join(', ')}`
            : 'No matching stored values'}
        </span>
      ) : null}
    </div>
  );
}
