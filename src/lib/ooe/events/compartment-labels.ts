import {
  listOoeBackedCompartmentOptions,
  resolveOoeBackedCompartment,
  type OoeBackedCompartmentId,
  type OoeBackedCompartmentMetadata,
} from '../../compartments/manifest';

export type OoeEventCompartmentId = OoeBackedCompartmentId;
export type OoeEventCompartmentMetadata = OoeBackedCompartmentMetadata;

export const OOE_EVENT_COMPARTMENT_OPTIONS = listOoeBackedCompartmentOptions();

export function resolveOoeEventCompartment(input: {
  capabilityId?: string;
  routeLabel?: string;
  hostId?: string;
}): OoeEventCompartmentMetadata | undefined {
  return resolveOoeBackedCompartment(input);
}
