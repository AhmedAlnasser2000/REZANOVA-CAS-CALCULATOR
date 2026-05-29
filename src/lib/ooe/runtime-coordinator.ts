import {
  completeOoeJob,
  failOoeJob,
  startOoeJob,
} from './active-job-registry';
import {
  buildOoeJobCommitContextForJob,
  buildOoeJobIdentity,
  type OoeJobCommitContext,
  type OoeJobContextOptions,
} from './job-contract';
import {
  buildOoeRuntimeEnvelope,
  prepareOoePlanPreflight,
  type OoePilotDefinition,
  type OoePilotStatus,
  type OoeRuntimeEnvelope,
  type OoeRuntimeMetadata,
} from './runtime-envelope';

type RunOoeRuntimeJobInput<
  TPayload,
  TDefinition extends OoePilotDefinition,
  TStatus extends OoePilotStatus<TDefinition['planId']>,
  TMetadata extends OoeRuntimeMetadata<TDefinition, TStatus>,
> = {
  definition: TDefinition;
  routeLabel: string;
  routeSnapshot: unknown;
  options?: OoeJobContextOptions;
  prepareStatus?: () => Promise<TStatus>;
  run: () => TPayload;
  buildMetadata: (input: {
    payload: TPayload;
    status: TStatus;
    jobContext: OoeJobCommitContext;
  }) => TMetadata;
};

export async function runOoeRuntimeJob<
  TPayload,
  TDefinition extends OoePilotDefinition,
  TStatus extends OoePilotStatus<TDefinition['planId']>,
  TMetadata extends OoeRuntimeMetadata<TDefinition, TStatus>,
>(
  input: RunOoeRuntimeJobInput<TPayload, TDefinition, TStatus, TMetadata>,
): Promise<OoeRuntimeEnvelope<TPayload, TMetadata>> {
  const job = buildOoeJobIdentity(input.definition, input.routeSnapshot);
  const activeJob = startOoeJob({
    job,
    routeLabel: input.routeLabel,
  });

  try {
    const status = input.prepareStatus
      ? await input.prepareStatus()
      : await prepareOoePlanPreflight(input.definition) as TStatus;
    const payload = input.run();
    const jobContext = buildOoeJobCommitContextForJob(job, input.options);
    const metadata = input.buildMetadata({ payload, status, jobContext });

    completeOoeJob(activeJob, metadata);
    return buildOoeRuntimeEnvelope(payload, metadata);
  } catch (error) {
    failOoeJob(activeJob, error);
    throw error;
  }
}
