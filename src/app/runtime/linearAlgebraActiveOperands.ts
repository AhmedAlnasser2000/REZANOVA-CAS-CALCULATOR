import type { SoftAction } from '../../lib/navigation/menu';
import {
  buildActiveMatrixRuntimeRequest,
  buildActiveVectorRuntimeRequest,
  matrixActionLabel,
  vectorActionLabel,
} from '../../lib/linear-algebra/runtime-request';

export function buildMatrixSoftActions(leftName: string, rightName: string): SoftAction[] {
  return [
    { id: 'add', label: matrixActionLabel('add', leftName, rightName), hotkey: 'F1' },
    { id: 'subtract', label: matrixActionLabel('subtract', leftName, rightName), hotkey: 'F2' },
    { id: 'multiply', label: matrixActionLabel('multiply', leftName, rightName), hotkey: 'F3' },
    { id: 'detA', label: matrixActionLabel('detA', leftName, rightName), hotkey: 'F4' },
    { id: 'inverseA', label: matrixActionLabel('inverseA', leftName, rightName), hotkey: 'F5' },
    { id: 'transposeA', label: matrixActionLabel('transposeA', leftName, rightName), hotkey: 'F6' },
  ];
}

export function buildVectorSoftActions(leftName: string, rightName: string): SoftAction[] {
  return [
    { id: 'dot', label: vectorActionLabel('dot', leftName, rightName), hotkey: 'F1' },
    { id: 'cross', label: vectorActionLabel('cross', leftName, rightName), hotkey: 'F2' },
    { id: 'normA', label: vectorActionLabel('normA', leftName, rightName), hotkey: 'F3' },
    { id: 'angle', label: vectorActionLabel('angle', leftName, rightName), hotkey: 'F4' },
    { id: 'add', label: vectorActionLabel('add', leftName, rightName), hotkey: 'F5' },
    { id: 'subtract', label: vectorActionLabel('subtract', leftName, rightName), hotkey: 'F6' },
  ];
}

export {
  buildActiveMatrixRuntimeRequest as buildActiveMatrixRequest,
  buildActiveVectorRuntimeRequest as buildActiveVectorRequest,
};
