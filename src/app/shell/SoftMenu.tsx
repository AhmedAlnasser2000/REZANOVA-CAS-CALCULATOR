type SoftMenuAction = {
  id: string;
  hotkey?: string;
  label: string;
};

type SoftMenuProps = {
  actions: SoftMenuAction[];
  onAction: (actionId: string) => void;
};

function SoftMenu({ actions, onAction }: SoftMenuProps) {
  return (
    <nav className="soft-menu">
      {actions.map((action) => (
        <button
          key={action.id}
          data-testid={`soft-action-${action.id}`}
          onClick={() => onAction(action.id)}
        >
          <span>{action.hotkey}</span>
          <strong>{action.label}</strong>
        </button>
      ))}
    </nav>
  );
}

export { SoftMenu };
