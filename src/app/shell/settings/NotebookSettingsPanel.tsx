import {
  BookOpen,
  CircleGauge,
  Eye,
  FileOutput,
  Image,
  Info,
  Layers,
  Save,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { SettingsSwitch } from '../../../components/SettingsSwitch';
import {
  NOTEBOOK_AUTOSAVE_SECONDS_OPTIONS,
  NOTEBOOK_GRID_STEP_PT_OPTIONS,
  NOTEBOOK_PERIODIC_VERSION_MINUTES_OPTIONS,
  NOTEBOOK_RETAINED_VERSION_OPTIONS,
  NOTEBOOK_RETENTION_DAYS_OPTIONS,
  type NotebookPreferences,
} from '../../../lib/notebook';

type NotebookSettingsPanelProps = {
  onChange: (preferences: NotebookPreferences) => void;
  preferences: NotebookPreferences;
};

function SettingsSection({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="settings-page-card">
      <div className="settings-page-card-heading">
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h2>{title}</h2>
      </div>
      <div className="settings-page-card-body">{children}</div>
    </section>
  );
}

function SettingsRow({
  children,
  hint,
  icon: Icon,
  label,
}: {
  children: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  label: string;
}) {
  return (
    <div className="settings-page-row">
      <div className="settings-page-row-label">
        {Icon ? <Icon aria-hidden="true" size={17} /> : <Info aria-hidden="true" size={15} />}
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </div>
      <div className="settings-page-row-control">{children}</div>
    </div>
  );
}

function SegmentedControl<T extends string | number>({
  getLabel,
  onChange,
  options,
  value,
}: {
  getLabel: (option: T) => string;
  onChange: (option: T) => void;
  options: readonly T[];
  value: T;
}) {
  return (
    <div className="settings-page-segmented">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={option === value ? 'is-active' : ''}
          onClick={() => onChange(option)}
        >
          {getLabel(option)}
        </button>
      ))}
    </div>
  );
}

function ToggleControl({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <SettingsSwitch
      checked={checked}
      className="settings-page-toggle"
      label={label}
      onChange={onChange}
    />
  );
}

function NumberStepper({
  max,
  min,
  onChange,
  value,
}: {
  max?: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  const decrement = Math.max(min, value - 1);
  const increment = typeof max === 'number' ? Math.min(max, value + 1) : value + 1;
  return (
    <div className="settings-page-stepper">
      <button type="button" onClick={() => onChange(decrement)}>-</button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      <button type="button" onClick={() => onChange(increment)}>+</button>
    </div>
  );
}

function optionTitle(option: string) {
  return option[0].toUpperCase() + option.slice(1);
}

export function NotebookSettingsPanel({
  onChange,
  preferences,
}: NotebookSettingsPanelProps) {
  function patchSection<K extends keyof NotebookPreferences>(
    section: K,
    patch: Partial<NotebookPreferences[K]>,
  ) {
    onChange({
      ...preferences,
      [section]: {
        ...preferences[section],
        ...patch,
      },
    } as NotebookPreferences);
  }

  return (
    <>
      <SettingsSection title="New Notebooks" eyebrow="Notebook">
        <SettingsRow icon={BookOpen} label="Default view" hint="Applies to newly opened Notebook sessions only.">
          <SegmentedControl
            value={preferences.newDocuments.defaultViewMode}
            options={['print', 'draft']}
            getLabel={(option) => option === 'print' ? 'Print Layout' : 'Draft'}
            onChange={(defaultViewMode) => patchSection('newDocuments', { defaultViewMode })}
          />
        </SettingsRow>
        <SettingsRow icon={BookOpen} label="Paper">
          <SegmentedControl
            value={preferences.newDocuments.paper}
            options={['a4', 'letter', 'legal']}
            getLabel={(option) => option === 'a4' ? 'A4' : option === 'letter' ? 'Letter' : 'Legal'}
            onChange={(paper) => patchSection('newDocuments', { paper })}
          />
        </SettingsRow>
        <SettingsRow icon={BookOpen} label="Orientation">
          <SegmentedControl
            value={preferences.newDocuments.orientation}
            options={['portrait', 'landscape']}
            getLabel={(option) => option === 'portrait' ? 'Portrait' : 'Landscape'}
            onChange={(orientation) => patchSection('newDocuments', { orientation })}
          />
        </SettingsRow>
        <SettingsRow icon={BookOpen} label="Margins">
          <SegmentedControl
            value={preferences.newDocuments.margins}
            options={['normal', 'narrow', 'moderate', 'wide']}
            getLabel={optionTitle}
            onChange={(margins) => patchSection('newDocuments', { margins })}
          />
        </SettingsRow>
        <SettingsRow icon={BookOpen} label="Page numbers">
          <ToggleControl
            label="Page numbers"
            checked={preferences.newDocuments.pageNumbering}
            onChange={(pageNumbering) => patchSection('newDocuments', { pageNumbering })}
          />
        </SettingsRow>
        <SettingsRow icon={BookOpen} label="Different first page">
          <ToggleControl
            label="Different first page"
            checked={preferences.newDocuments.differentFirstPage}
            onChange={(differentFirstPage) => patchSection('newDocuments', { differentFirstPage })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Object Authoring" eyebrow="Notebook">
        <SettingsRow icon={Layers} label="New object placement" hint="Existing documents keep their saved placement.">
          <SegmentedControl
            value={preferences.authoring.defaultObjectPlacement}
            options={['flow', 'floating']}
            getLabel={(option) => option === 'flow' ? 'Flow' : 'Floating'}
            onChange={(defaultObjectPlacement) => patchSection('authoring', { defaultObjectPlacement })}
          />
        </SettingsRow>
        <SettingsRow icon={Layers} label="Floating anchor">
          <SegmentedControl
            value={preferences.authoring.defaultFloatingAnchor}
            options={['paragraph', 'page']}
            getLabel={(option) => option === 'paragraph' ? 'Paragraph' : 'Page'}
            onChange={(defaultFloatingAnchor) => patchSection('authoring', { defaultFloatingAnchor })}
          />
        </SettingsRow>
        <SettingsRow icon={Layers} label="Wrap">
          <SegmentedControl
            value={preferences.authoring.defaultWrap}
            options={['square', 'top-and-bottom', 'in-front', 'behind']}
            getLabel={(option) => ({
              behind: 'Behind',
              'in-front': 'In front',
              square: 'Square',
              'top-and-bottom': 'Top/bottom',
            }[option])}
            onChange={(defaultWrap) => patchSection('authoring', { defaultWrap })}
          />
        </SettingsRow>
        <SettingsRow icon={Layers} label="Reference">
          <SegmentedControl
            value={preferences.authoring.defaultReference}
            options={['margins', 'page']}
            getLabel={(option) => option === 'margins' ? 'Margins' : 'Page'}
            onChange={(defaultReference) => patchSection('authoring', { defaultReference })}
          />
        </SettingsRow>
        <SettingsRow icon={Layers} label="Default object width" hint="Points, for future floating conversions.">
          <NumberStepper
            min={72}
            max={720}
            value={preferences.authoring.defaultObjectWidthPt}
            onChange={(defaultObjectWidthPt) => patchSection('authoring', { defaultObjectWidthPt })}
          />
        </SettingsRow>
        <SettingsRow icon={Layers} label="Text distance" hint="Points around floating objects.">
          <NumberStepper
            min={0}
            max={72}
            value={preferences.authoring.textDistancePt}
            onChange={(textDistancePt) => patchSection('authoring', { textDistancePt })}
          />
        </SettingsRow>
        <SettingsRow icon={Layers} label="Guides">
          <ToggleControl
            label="Guides"
            checked={preferences.authoring.showGuides}
            onChange={(showGuides) => patchSection('authoring', { showGuides })}
          />
        </SettingsRow>
        <SettingsRow icon={Layers} label="Grid">
          <ToggleControl
            label="Grid"
            checked={preferences.authoring.showGrid}
            onChange={(showGrid) => patchSection('authoring', { showGrid })}
          />
        </SettingsRow>
        <SettingsRow icon={Layers} label="Grid step">
          <SegmentedControl
            value={preferences.authoring.gridStepPt}
            options={NOTEBOOK_GRID_STEP_PT_OPTIONS}
            getLabel={(option) => `${option} pt`}
            onChange={(gridStepPt) => patchSection('authoring', { gridStepPt })}
          />
        </SettingsRow>
        <SettingsRow icon={Layers} label="Advanced Arrange controls">
          <ToggleControl
            label="Advanced Arrange controls"
            checked={preferences.authoring.advancedArrangeVisible}
            onChange={(advancedArrangeVisible) => patchSection('authoring', { advancedArrangeVisible })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Interface" eyebrow="Notebook">
        <SettingsRow icon={Eye} label="Initial Outline">
          <SegmentedControl
            value={preferences.interface.initialOutlineState}
            options={['open', 'collapsed']}
            getLabel={(option) => option === 'open' ? 'Open' : 'Collapsed'}
            onChange={(initialOutlineState) => patchSection('interface', { initialOutlineState })}
          />
        </SettingsRow>
        <SettingsRow icon={Eye} label="Initial Inspector">
          <SegmentedControl
            value={preferences.interface.initialInspectorMode}
            options={['auto', 'manual', 'pinned', 'collapsed']}
            getLabel={optionTitle}
            onChange={(initialInspectorMode) => patchSection('interface', { initialInspectorMode })}
          />
        </SettingsRow>
        <SettingsRow icon={Layers} label="Left rail default">
          <SegmentedControl
            value={preferences.interface.initialObjectsLayersState}
            options={['outline', 'objects']}
            getLabel={(option) => option === 'outline' ? 'Outline' : 'Objects'}
            onChange={(initialObjectsLayersState) => patchSection('interface', { initialObjectsLayersState })}
          />
        </SettingsRow>
        <SettingsRow icon={Eye} label="Contextual tabs">
          <SegmentedControl
            value={preferences.interface.contextualTabs}
            options={['automatic', 'manual']}
            getLabel={(option) => option === 'automatic' ? 'Automatic' : 'Manual'}
            onChange={(contextualTabs) => patchSection('interface', { contextualTabs })}
          />
        </SettingsRow>
        <SettingsRow icon={Eye} label="Status bar detail">
          <SegmentedControl
            value={preferences.interface.statusBarDetail}
            options={['standard', 'coordinates']}
            getLabel={(option) => option === 'standard' ? 'Standard' : 'Coordinates'}
            onChange={(statusBarDetail) => patchSection('interface', { statusBarDetail })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Saving and History" eyebrow="Notebook">
        <SettingsRow icon={Save} label="Autosave delay">
          <SegmentedControl
            value={preferences.savingHistory.autosaveSeconds}
            options={NOTEBOOK_AUTOSAVE_SECONDS_OPTIONS}
            getLabel={(option) => `${option}s`}
            onChange={(autosaveSeconds) => patchSection('savingHistory', { autosaveSeconds })}
          />
        </SettingsRow>
        <SettingsRow icon={Save} label="Periodic versions">
          <SegmentedControl
            value={preferences.savingHistory.periodicVersionMinutes}
            options={NOTEBOOK_PERIODIC_VERSION_MINUTES_OPTIONS}
            getLabel={(option) => `${option} min`}
            onChange={(periodicVersionMinutes) => patchSection('savingHistory', { periodicVersionMinutes })}
          />
        </SettingsRow>
        <SettingsRow icon={Save} label="Retained versions">
          <SegmentedControl
            value={preferences.savingHistory.retainedVersions}
            options={NOTEBOOK_RETAINED_VERSION_OPTIONS}
            getLabel={(option) => String(option)}
            onChange={(retainedVersions) => patchSection('savingHistory', { retainedVersions })}
          />
        </SettingsRow>
        <SettingsRow icon={Save} label="Retention window">
          <SegmentedControl
            value={preferences.savingHistory.retentionDays}
            options={NOTEBOOK_RETENTION_DAYS_OPTIONS}
            getLabel={(option) => `${option} days`}
            onChange={(retentionDays) => patchSection('savingHistory', { retentionDays })}
          />
        </SettingsRow>
        <SettingsRow icon={CircleGauge} label="Large documents">
          <SegmentedControl
            value={preferences.largeDocuments.openBehavior}
            options={['ask', 'draft']}
            getLabel={(option) => option === 'ask' ? 'Ask' : 'Open Draft'}
            onChange={(openBehavior) => patchSection('largeDocuments', { openBehavior })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Images" eyebrow="Notebook">
        <SettingsRow icon={Image} label="Default image width" hint="Points for future image insertions.">
          <NumberStepper
            min={72}
            max={720}
            value={preferences.images.defaultWidthPt}
            onChange={(defaultWidthPt) => patchSection('images', { defaultWidthPt })}
          />
        </SettingsRow>
        <SettingsRow icon={Image} label="Default alignment">
          <SegmentedControl
            value={preferences.images.defaultAlignment}
            options={['left', 'center', 'right']}
            getLabel={optionTitle}
            onChange={(defaultAlignment) => patchSection('images', { defaultAlignment })}
          />
        </SettingsRow>
        <SettingsRow icon={Image} label="Number captions by default">
          <ToggleControl
            label="Number captions by default"
            checked={preferences.images.numberCaptionsByDefault}
            onChange={(numberCaptionsByDefault) => patchSection('images', { numberCaptionsByDefault })}
          />
        </SettingsRow>
        <SettingsRow icon={Image} label="Non-fatal warnings">
          <SegmentedControl
            value={preferences.images.warningMode}
            options={['confirm', 'notify']}
            getLabel={(option) => option === 'confirm' ? 'Confirm' : 'Notify'}
            onChange={(warningMode) => patchSection('images', { warningMode })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Export" eyebrow="Notebook">
        <SettingsRow icon={FileOutput} label="Default scope">
          <SegmentedControl
            value={preferences.export.defaultScope}
            options={['document', 'sections']}
            getLabel={(option) => option === 'document' ? 'Document' : 'Selected sections'}
            onChange={(defaultScope) => patchSection('export', { defaultScope })}
          />
        </SettingsRow>
        <SettingsRow icon={FileOutput} label="Remember export choices">
          <ToggleControl
            label="Remember export choices"
            checked={preferences.export.rememberChoices}
            onChange={(rememberChoices) => patchSection('export', { rememberChoices })}
          />
        </SettingsRow>
      </SettingsSection>
    </>
  );
}
