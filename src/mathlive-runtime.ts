import { MathfieldElement } from 'mathlive';

export const MATHLIVE_SOUNDS_DIRECTORY = null;

type MathLiveRuntimeTarget = {
  soundsDirectory: string | null;
  keypressSound?: null | string | {
    spacebar?: null | string;
    return?: null | string;
    delete?: null | string;
    default?: null | string;
  };
  plonkSound?: string | null;
};

export function configureMathLiveRuntime(
  target: MathLiveRuntimeTarget = MathfieldElement,
) {
  target.soundsDirectory = MATHLIVE_SOUNDS_DIRECTORY;
  target.keypressSound = null;
  target.plonkSound = null;
}
