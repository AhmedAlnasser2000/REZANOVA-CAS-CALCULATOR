type SettingsSwitchProps = {
  checked: boolean;
  className?: string;
  label: string;
  onChange: (checked: boolean) => void;
  testId?: string;
};

export function SettingsSwitch({
  checked,
  className,
  label,
  onChange,
  testId,
}: SettingsSwitchProps) {
  const classNames = ['settings-switch', className].filter(Boolean).join(' ');

  return (
    <label className={classNames}>
      <input
        aria-checked={checked}
        aria-label={label}
        checked={checked}
        data-testid={testId}
        role="switch"
        type="checkbox"
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span className="settings-switch-track" aria-hidden="true">
        <span className="settings-switch-thumb" />
      </span>
    </label>
  );
}
