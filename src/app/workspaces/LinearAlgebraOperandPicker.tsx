import { ChevronDown } from 'lucide-react';

type LinearAlgebraOperandOption = {
  id: string;
  name: string;
};

type LinearAlgebraOperandPickerProps = {
  activeId: string;
  ariaLabel: string;
  label: string;
  onChange: (id: string) => void;
  options: readonly LinearAlgebraOperandOption[];
};

function LinearAlgebraOperandPicker({
  activeId,
  ariaLabel,
  label,
  onChange,
  options,
}: LinearAlgebraOperandPickerProps) {
  const activeOption = options.find((option) => option.id === activeId) ?? options[0] ?? null;

  function selectOption(id: string, element: HTMLElement) {
    onChange(id);
    const menu = element.closest('details');
    if (menu instanceof HTMLDetailsElement) {
      menu.open = false;
    }
  }

  return (
    <label className="linear-algebra-operand-picker">
      <span>{label}</span>
      <details className="linear-algebra-operand-menu">
        <summary
          aria-label={ariaLabel}
          className="linear-algebra-operand-menu-button"
          data-value={activeOption?.id ?? ''}
        >
          <span>{activeOption?.name ?? '?'}</span>
          <ChevronDown aria-hidden="true" size={16} />
        </summary>
        <div
          className="linear-algebra-operand-menu-list"
          role="listbox"
          aria-label={`${ariaLabel} options`}
        >
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={option.id === activeId}
              className="linear-algebra-operand-option"
              onClick={(event) => selectOption(option.id, event.currentTarget)}
            >
              {option.name}
            </button>
          ))}
        </div>
      </details>
    </label>
  );
}

export { LinearAlgebraOperandPicker };
