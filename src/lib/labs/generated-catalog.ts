import type { LabExperimentSummary } from './types';

export const LABS_CATALOG_DIGEST = 'ba22dee55a4e9f1591c7158fafcabcf3a3929930f7df513685e5dd06fd8b61fb';

export const LABS_CATALOG_SOURCE = 'playground/manifests/*.yaml + playground/records/INDEX.md';

export const LABS_EXPERIMENTS = [
  {
    "experimentId": "sym-search-planner-ordering",
    "title": "Symbolic Search Planner Ordering and Heuristic Ranking",
    "laneTopic": "symbolic-search",
    "currentLevel": "level-0-research",
    "status": "active",
    "owner": "unassigned",
    "recordPath": "playground/records/sym-search-planner-ordering.md",
    "manifestPath": "playground/manifests/sym-search-planner-ordering.yaml",
    "lastReviewed": "2026-04-14",
    "nextReview": "2026-04-18",
    "candidateStableHome": "equation symbolic orchestration",
    "nextStep": "Keep the symbolic-search result unchanged while reusing it as the first external-compute remote workload proof."
  },
  {
    "experimentId": "expression-baseline-probe",
    "title": "Expression Baseline Probe",
    "laneTopic": "visual-labs",
    "currentLevel": "level-0-research",
    "status": "active",
    "owner": "unassigned",
    "recordPath": "playground/records/expression-baseline-probe.md",
    "manifestPath": "playground/manifests/expression-baseline-probe.yaml",
    "lastReviewed": "2026-05-21",
    "nextReview": "after PGL-VIS1 manual smoke",
    "candidateStableHome": "dev-only labs runner bridge / future incubation tooling",
    "nextStep": "Use as the first expression-shaped visual Labs runner proof without adding product math behavior."
  },
  {
    "experimentId": "ext-compute-ssh-foundations",
    "title": "External Compute SSH Foundations and Local Harness",
    "laneTopic": "external-compute",
    "currentLevel": "level-0-research",
    "status": "promoted",
    "owner": "unassigned",
    "recordPath": "playground/records/ext-compute-ssh-foundations.md",
    "manifestPath": "playground/manifests/ext-compute-ssh-foundations.yaml",
    "lastReviewed": "2026-04-14",
    "nextReview": "closed - promoted into ext-compute-ssh-vm-pilot",
    "candidateStableHome": "future remote execution adapters / orchestration layer",
    "nextStep": "Foundations are complete; the follow-on work is now the real SSH VM pilot."
  },
  {
    "experimentId": "ext-compute-ssh-vm-pilot",
    "title": "External Compute SSH VM Pilot With Artifact Pullback",
    "laneTopic": "external-compute",
    "currentLevel": "level-2-bounded-prototypes",
    "status": "promoted",
    "owner": "unassigned",
    "recordPath": "playground/records/ext-compute-ssh-vm-pilot.md",
    "manifestPath": "playground/manifests/ext-compute-ssh-vm-pilot.yaml",
    "lastReviewed": "2026-04-14",
    "nextReview": "closed - promoted into ext-compute-ssh-vm-hardening",
    "candidateStableHome": "future remote execution adapters / orchestration layer",
    "nextStep": "The VM-first SSH transport proof is complete; the follow-on work is now hardening and adoption gating."
  },
  {
    "experimentId": "ext-compute-ssh-vm-hardening",
    "title": "External Compute SSH VM Hardening and Adoption Gate",
    "laneTopic": "external-compute",
    "currentLevel": "level-3-integration-candidates",
    "status": "paused",
    "owner": "unassigned",
    "recordPath": "playground/records/ext-compute-ssh-vm-hardening.md",
    "manifestPath": "playground/manifests/ext-compute-ssh-vm-hardening.yaml",
    "lastReviewed": "2026-04-24",
    "nextReview": "deferred until core calculator stability and solver roadmap progress justify remote execution again",
    "candidateStableHome": "future remote execution adapters / orchestration layer",
    "nextStep": "The hardening gate is proven and preserved, but external compute is postponed until core calculator stability and additional solver work justify reopening the lane."
  },
  {
    "experimentId": "fricas-context-atlas",
    "title": "FriCAS Architecture Context Atlas and Reference Corpora",
    "laneTopic": "source-context",
    "currentLevel": "level-0-research",
    "status": "active",
    "owner": "unassigned",
    "recordPath": "playground/records/fricas-context-atlas.md",
    "manifestPath": "playground/manifests/fricas-context-atlas.yaml",
    "lastReviewed": "2026-05-01",
    "nextReview": "after the first fit-matrix review chooses a bounded Calcwiz-native prototype candidate",
    "candidateStableHome": "future algebra/kernel/orchestrator/incubation proposals only",
    "nextStep": "Use the atlas, fit matrix, idea ledger, and context corpus to choose a bounded Calcwiz-native prototype candidate; do not adopt FriCAS code or identity."
  }
] as const satisfies readonly LabExperimentSummary[];
