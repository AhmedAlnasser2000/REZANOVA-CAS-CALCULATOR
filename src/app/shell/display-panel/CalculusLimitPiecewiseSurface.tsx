/* eslint-disable @typescript-eslint/no-explicit-any */
import { MathEditor } from '../../../components/MathEditor';
import { MathStatic } from '../../../components/MathStatic';
import {
  limitPiecewiseReadbackBodyLatex,
  parseLimitPiecewiseDraft,
} from '../../../lib/calculus/limit-piecewise-row-editor';
import { LimitPiecewiseRowEditor } from './LimitPiecewiseRowEditor';

type CalculusLimitEditorHostProps = {
  activeFieldRef: { current: any };
  keyboardLayouts: any;
  mainFieldRef: any;
  onChange: (latex: string) => void;
  onSubmit?: () => void;
  placeholder: string;
  requestLatex: string;
  screenHint: string;
};

export function CalculusLimitEditorHost({
  activeFieldRef,
  keyboardLayouts,
  mainFieldRef,
  onChange,
  onSubmit,
  placeholder,
  requestLatex,
  screenHint,
}: CalculusLimitEditorHostProps) {
  const piecewiseDraft = parseLimitPiecewiseDraft(requestLatex);

  if (piecewiseDraft) {
    return (
      <LimitPiecewiseRowEditor
        ref={mainFieldRef}
        requestLatex={requestLatex}
        onChange={onChange}
        onSubmit={onSubmit}
      />
    );
  }

  return (
    <MathEditor
      ref={mainFieldRef}
      dataTestId="main-editor"
      className="main-mathfield"
      value={requestLatex}
      modeId="calculus"
      screenHint={screenHint}
      onSubmit={onSubmit}
      onChange={onChange}
      keyboardLayouts={keyboardLayouts}
      onFocus={(field) => {
        activeFieldRef.current = field;
      }}
      placeholder={placeholder}
    />
  );
}

export function CalculusLimitReadbackBody({ bodyLatex }: { bodyLatex: string }) {
  return (
    <MathStatic
      className="calculus-readback-math calculus-limit-readback__math"
      latex={limitPiecewiseReadbackBodyLatex(bodyLatex)}
      deferRender
    />
  );
}
