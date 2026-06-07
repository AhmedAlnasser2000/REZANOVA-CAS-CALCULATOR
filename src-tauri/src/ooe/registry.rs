use super::{
    validate_ooe_plan, OoeCancellationPolicy, OoeCapabilityId, OoeCheckpointPolicy,
    OoeChunkingPolicy, OoeCommitPolicy, OoeComputeTopology, OoeHostId, OoeMaterializationPolicy,
    OoeNode, OoeNodeId, OoePhaseId, OoePlan, OoePlanId, OoePriorityClass, OoeResourcePolicy,
    OoeResultStability, OoeSolverMode, OoeStreamingPolicy, OoeTaskClass, OoeThreadSafety,
    OoeValidationError, OOE_SCHEMA_VERSION,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeBuiltinPlanCategory {
    AdvancedCalculus,
    Calculus,
    Calculate,
    Expression,
    Equation,
    Editor,
    Geometry,
    LinearAlgebra,
    Statistics,
    Table,
    Trigonometry,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OoeBuiltinPlanDescriptor {
    pub category: OoeBuiltinPlanCategory,
    pub plan_id: OoePlanId,
    pub capability_id: OoeCapabilityId,
    pub host_id: OoeHostId,
    pub entrypoint: String,
    pub description: String,
}

struct OoeBuiltinPlanDefinition {
    category: OoeBuiltinPlanCategory,
    capability_id: &'static str,
    host_id: &'static str,
    entrypoint: &'static str,
    description: &'static str,
    task_class: OoeTaskClass,
    priority_class: OoePriorityClass,
    commit_policy: OoeCommitPolicy,
}

const BUILTIN_PLAN_DEFINITIONS: &[OoeBuiltinPlanDefinition] = &[
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Expression,
        capability_id: "expression.evaluate",
        host_id: "expression-runtime",
        entrypoint: "runExpressionAction",
        description: "Evaluate a Calculate expression through the shared expression runtime.",
        task_class: OoeTaskClass::Explicit,
        priority_class: OoePriorityClass::UserBlocking,
        commit_policy: OoeCommitPolicy::CommitLatestOnly,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Expression,
        capability_id: "expression.simplify",
        host_id: "expression-runtime",
        entrypoint: "runExpressionAction",
        description: "Simplify a Calculate expression through the shared expression runtime.",
        task_class: OoeTaskClass::Explicit,
        priority_class: OoePriorityClass::UserBlocking,
        commit_policy: OoeCommitPolicy::CommitLatestOnly,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Expression,
        capability_id: "expression.factor",
        host_id: "expression-runtime",
        entrypoint: "runExpressionAction",
        description: "Factor a Calculate expression through the shared expression runtime.",
        task_class: OoeTaskClass::Explicit,
        priority_class: OoePriorityClass::UserBlocking,
        commit_policy: OoeCommitPolicy::CommitLatestOnly,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Expression,
        capability_id: "expression.expand",
        host_id: "expression-runtime",
        entrypoint: "runExpressionAction",
        description: "Expand a Calculate expression through the shared expression runtime.",
        task_class: OoeTaskClass::Explicit,
        priority_class: OoePriorityClass::UserBlocking,
        commit_policy: OoeCommitPolicy::CommitLatestOnly,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Calculate,
        capability_id: "calculate.workbench",
        host_id: "expression-runtime",
        entrypoint: "runCalculateWorkbenchAction",
        description: "Evaluate a non-standard Calculate workbench request for provenance diagnostics.",
        task_class: OoeTaskClass::Explicit,
        priority_class: OoePriorityClass::UserBlocking,
        commit_policy: OoeCommitPolicy::CommitLatestOnly,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Calculate,
        capability_id: "calculate.algebraTransform",
        host_id: "expression-runtime",
        entrypoint: "runCalculateAlgebraTransformAction",
        description: "Apply a Calculate algebra transform for provenance diagnostics.",
        task_class: OoeTaskClass::Explicit,
        priority_class: OoePriorityClass::UserBlocking,
        commit_policy: OoeCommitPolicy::CommitLatestOnly,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Equation,
        capability_id: "equation.solve",
        host_id: "equation-worker-runtime",
        entrypoint: "runEquationWorkerRuntime",
        description: "Solve an Equation workflow through the isolated Equation worker runtime shell.",
        task_class: OoeTaskClass::Explicit,
        priority_class: OoePriorityClass::UserBlocking,
        commit_policy: OoeCommitPolicy::CommitLatestOnly,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Editor,
        capability_id: "editor.variableHints",
        host_id: "editor-analysis-runtime",
        entrypoint: "runEditorAnalysis",
        description: "Analyze editor input for variable hint metadata.",
        task_class: OoeTaskClass::Deferred,
        priority_class: OoePriorityClass::Low,
        commit_policy: OoeCommitPolicy::CommitIfCurrent,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Editor,
        capability_id: "editor.equationTargetDiscovery",
        host_id: "editor-analysis-runtime",
        entrypoint: "runEditorAnalysis",
        description: "Analyze Equation input for selected-target candidates.",
        task_class: OoeTaskClass::Deferred,
        priority_class: OoePriorityClass::Normal,
        commit_policy: OoeCommitPolicy::CommitIfCurrent,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Editor,
        capability_id: "editor.calculateTransformEligibility",
        host_id: "editor-analysis-runtime",
        entrypoint: "runEditorAnalysis",
        description: "Analyze Calculate input for algebra transform eligibility.",
        task_class: OoeTaskClass::Deferred,
        priority_class: OoePriorityClass::Low,
        commit_policy: OoeCommitPolicy::CommitIfCurrent,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Editor,
        capability_id: "editor.equationTransformEligibility",
        host_id: "editor-analysis-runtime",
        entrypoint: "runEditorAnalysis",
        description: "Analyze Equation input for algebra transform eligibility.",
        task_class: OoeTaskClass::Deferred,
        priority_class: OoePriorityClass::Low,
        commit_policy: OoeCommitPolicy::CommitIfCurrent,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Editor,
        capability_id: "editor.previewRender",
        host_id: "editor-analysis-runtime",
        entrypoint: "runEditorAnalysis",
        description: "Prepare live editor preview input for render-limited display.",
        task_class: OoeTaskClass::RenderLimited,
        priority_class: OoePriorityClass::Low,
        commit_policy: OoeCommitPolicy::CommitIfCurrent,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Table,
        capability_id: "table.build",
        host_id: "table-worker-runtime",
        entrypoint: "buildTableWorker",
        description: "Build a numeric table through the isolated Table worker runtime.",
        task_class: OoeTaskClass::Explicit,
        priority_class: OoePriorityClass::UserVisible,
        commit_policy: OoeCommitPolicy::CommitLatestOnly,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Calculus,
        capability_id: "calculus.evaluate",
        host_id: "calculus-worker-runtime",
        entrypoint: "runCalculusWorkerRuntime",
        description: "Evaluate a Calculus workbench request through the isolated Calculus worker runtime shell.",
        task_class: OoeTaskClass::Explicit,
        priority_class: OoePriorityClass::UserVisible,
        commit_policy: OoeCommitPolicy::CommitLatestOnly,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Trigonometry,
        capability_id: "trigonometry.evaluate",
        host_id: "trigonometry-runtime",
        entrypoint: "runTrigonometryCoreDraft",
        description: "Evaluate a Trigonometry workspace request for provenance diagnostics.",
        task_class: OoeTaskClass::Explicit,
        priority_class: OoePriorityClass::UserVisible,
        commit_policy: OoeCommitPolicy::CommitLatestOnly,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Statistics,
        capability_id: "statistics.evaluate",
        host_id: "statistics-runtime",
        entrypoint: "runStatisticsCoreDraft",
        description: "Evaluate a Statistics workspace request for provenance diagnostics.",
        task_class: OoeTaskClass::Explicit,
        priority_class: OoePriorityClass::UserVisible,
        commit_policy: OoeCommitPolicy::CommitLatestOnly,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Geometry,
        capability_id: "geometry.evaluate",
        host_id: "geometry-runtime",
        entrypoint: "runGeometryCoreDraft",
        description: "Evaluate a Geometry workspace request for provenance diagnostics.",
        task_class: OoeTaskClass::Explicit,
        priority_class: OoePriorityClass::UserVisible,
        commit_policy: OoeCommitPolicy::CommitLatestOnly,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::LinearAlgebra,
        capability_id: "linearAlgebra.matrix",
        host_id: "linear-algebra-runtime",
        entrypoint: "runMatrixMode",
        description: "Evaluate a Matrix workspace request for provenance diagnostics.",
        task_class: OoeTaskClass::Explicit,
        priority_class: OoePriorityClass::UserVisible,
        commit_policy: OoeCommitPolicy::CommitLatestOnly,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::LinearAlgebra,
        capability_id: "linearAlgebra.vector",
        host_id: "linear-algebra-runtime",
        entrypoint: "runVectorMode",
        description: "Evaluate a Vector workspace request for provenance diagnostics.",
        task_class: OoeTaskClass::Explicit,
        priority_class: OoePriorityClass::UserVisible,
        commit_policy: OoeCommitPolicy::CommitLatestOnly,
    },
];

pub fn list_builtin_ooe_plan_descriptors() -> Vec<OoeBuiltinPlanDescriptor> {
    BUILTIN_PLAN_DEFINITIONS
        .iter()
        .map(descriptor_from_definition)
        .collect()
}

pub fn list_builtin_ooe_plans() -> Vec<OoePlan> {
    list_builtin_ooe_plan_descriptors()
        .iter()
        .map(plan_from_descriptor)
        .collect()
}

pub fn get_builtin_ooe_plan(plan_id: &OoePlanId) -> Option<OoePlan> {
    list_builtin_ooe_plan_descriptors()
        .into_iter()
        .find(|descriptor| &descriptor.plan_id == plan_id)
        .map(|descriptor| plan_from_descriptor(&descriptor))
}

pub fn validate_builtin_ooe_plans() -> Result<(), Vec<OoeValidationError>> {
    let mut errors = Vec::new();

    for plan in list_builtin_ooe_plans() {
        if let Err(plan_errors) = validate_ooe_plan(&plan) {
            errors.extend(plan_errors);
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

fn descriptor_from_definition(definition: &OoeBuiltinPlanDefinition) -> OoeBuiltinPlanDescriptor {
    OoeBuiltinPlanDescriptor {
        category: definition.category.clone(),
        plan_id: OoePlanId::from(format!("plan.{}", definition.capability_id)),
        capability_id: OoeCapabilityId::from(definition.capability_id),
        host_id: OoeHostId::from(definition.host_id),
        entrypoint: definition.entrypoint.into(),
        description: definition.description.into(),
    }
}

fn plan_from_descriptor(descriptor: &OoeBuiltinPlanDescriptor) -> OoePlan {
    let definition = BUILTIN_PLAN_DEFINITIONS
        .iter()
        .find(|definition| definition.capability_id == descriptor.capability_id.as_str())
        .expect("built-in descriptor should have a matching definition");
    let worker_runtime_host = matches!(
        definition.host_id,
        "equation-worker-runtime" | "table-worker-runtime" | "calculus-worker-runtime"
    );

    OoePlan {
        id: descriptor.plan_id.clone(),
        schema_version: OOE_SCHEMA_VERSION,
        nodes: vec![OoeNode {
            id: OoeNodeId::from(format!("node.{}", descriptor.capability_id)),
            capability_id: descriptor.capability_id.clone(),
            host_id: descriptor.host_id.clone(),
            phase_id: OoePhaseId::from(descriptor.capability_id.as_str()),
            task_class: definition.task_class.clone(),
            priority_class: definition.priority_class.clone(),
            cancellation_policy: if worker_runtime_host {
                OoeCancellationPolicy::HardStop
            } else {
                OoeCancellationPolicy::StaleDrop
            },
            commit_policy: definition.commit_policy.clone(),
            thread_safety: if worker_runtime_host {
                OoeThreadSafety::WorkerSafe
            } else {
                OoeThreadSafety::MainThreadOnly
            },
            result_stability: OoeResultStability::Draft,
            solver_mode: OoeSolverMode::Classic,
            chunking_policy: OoeChunkingPolicy::None,
            checkpoint_policy: OoeCheckpointPolicy::None,
            streaming_policy: OoeStreamingPolicy::FinalOnly,
            materialization_policy: OoeMaterializationPolicy::Full,
            compute_topology: OoeComputeTopology::Local,
            resource_policy: OoeResourcePolicy::Normal,
            depends_on: Vec::new(),
            is_terminal_result: true,
        }],
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    const KNOWN_HOST_IDS: &[&str] = &[
        "expression-runtime",
        "equation-runtime",
        "equation-worker-runtime",
        "equation-direct-symbolic-worker-runtime",
        "calculus-runtime",
        "calculus-worker-runtime",
        "editor-analysis-runtime",
        "geometry-runtime",
        "linear-algebra-runtime",
        "statistics-runtime",
        "table-runtime",
        "table-worker-runtime",
        "trigonometry-runtime",
    ];

    #[test]
    fn validates_all_builtin_plans() {
        assert!(validate_builtin_ooe_plans().is_ok());
    }

    #[test]
    fn registers_current_kernel_and_editor_analysis_capabilities() {
        let descriptors = list_builtin_ooe_plan_descriptors();
        let capability_ids: Vec<&str> = descriptors
            .iter()
            .map(|descriptor| descriptor.capability_id.as_str())
            .collect();

        assert_eq!(
            capability_ids,
            vec![
                "expression.evaluate",
                "expression.simplify",
                "expression.factor",
                "expression.expand",
                "calculate.workbench",
                "calculate.algebraTransform",
                "equation.solve",
                "editor.variableHints",
                "editor.equationTargetDiscovery",
                "editor.calculateTransformEligibility",
                "editor.equationTransformEligibility",
                "editor.previewRender",
                "table.build",
                "calculus.evaluate",
                "trigonometry.evaluate",
                "statistics.evaluate",
                "geometry.evaluate",
                "linearAlgebra.matrix",
                "linearAlgebra.vector",
            ]
        );
    }

    #[test]
    fn builtins_have_unique_plan_and_capability_ids() {
        let descriptors = list_builtin_ooe_plan_descriptors();
        let mut plan_ids = HashSet::new();
        let mut capability_ids = HashSet::new();

        for descriptor in &descriptors {
            assert!(plan_ids.insert(descriptor.plan_id.clone()));
            assert!(capability_ids.insert(descriptor.capability_id.clone()));
        }
    }

    #[test]
    fn every_descriptor_has_a_matching_plan() {
        let descriptors = list_builtin_ooe_plan_descriptors();
        let plans = list_builtin_ooe_plans();

        assert_eq!(plans.len(), descriptors.len());

        for descriptor in descriptors {
            let plan = plans
                .iter()
                .find(|plan| plan.id == descriptor.plan_id)
                .expect("descriptor should have a matching plan");
            let node = plan
                .nodes
                .first()
                .expect("builtin plan should have one node");

            assert_eq!(plan.schema_version, OOE_SCHEMA_VERSION);
            assert_eq!(plan.nodes.len(), 1);
            assert_eq!(
                node.id.as_str(),
                format!("node.{}", descriptor.capability_id)
            );
            assert_eq!(node.capability_id, descriptor.capability_id);
            assert_eq!(node.host_id, descriptor.host_id);
            assert_eq!(node.phase_id.as_str(), descriptor.capability_id.as_str());
            assert!(node.depends_on.is_empty());
            assert!(node.is_terminal_result);
        }
    }

    #[test]
    fn every_plan_uses_a_known_host_id() {
        for plan in list_builtin_ooe_plans() {
            let node = plan
                .nodes
                .first()
                .expect("builtin plan should have one node");
            assert!(KNOWN_HOST_IDS.contains(&node.host_id.as_str()));
        }
    }

    #[test]
    fn editor_analysis_plans_use_deferred_commit_if_current_policy() {
        for plan in list_builtin_ooe_plans()
            .into_iter()
            .filter(|plan| plan.id.as_str().starts_with("plan.editor."))
        {
            let node = plan
                .nodes
                .first()
                .expect("builtin plan should have one node");

            assert_eq!(node.host_id.as_str(), "editor-analysis-runtime");
            assert_eq!(node.commit_policy, OoeCommitPolicy::CommitIfCurrent);
            assert_eq!(node.cancellation_policy, OoeCancellationPolicy::StaleDrop);
            assert!(matches!(
                node.task_class,
                OoeTaskClass::Deferred | OoeTaskClass::RenderLimited
            ));
        }
    }

    #[test]
    fn lookup_returns_known_plan_and_none_for_unknown() {
        let known_id = OoePlanId::from("plan.equation.solve");
        let unknown_id = OoePlanId::from("plan.unknown");

        let plan = get_builtin_ooe_plan(&known_id).expect("known plan should exist");
        assert_eq!(plan.id, known_id);
        assert!(get_builtin_ooe_plan(&unknown_id).is_none());
    }

    #[test]
    fn builtin_policy_defaults_are_current_reality_conservative() {
        for plan in list_builtin_ooe_plans()
            .into_iter()
            .filter(|plan| !plan.id.as_str().starts_with("plan.editor."))
        {
            let node = plan
                .nodes
                .first()
                .expect("builtin plan should have one node");

            assert_eq!(node.task_class, OoeTaskClass::Explicit);
            if matches!(
                node.capability_id.as_str(),
                "equation.solve" | "table.build" | "calculus.evaluate"
            ) {
                assert_eq!(node.cancellation_policy, OoeCancellationPolicy::HardStop);
                assert_eq!(node.thread_safety, OoeThreadSafety::WorkerSafe);
            } else {
                assert_eq!(node.cancellation_policy, OoeCancellationPolicy::StaleDrop);
                assert_eq!(node.thread_safety, OoeThreadSafety::MainThreadOnly);
            }
            assert_eq!(node.commit_policy, OoeCommitPolicy::CommitLatestOnly);
            assert_eq!(node.result_stability, OoeResultStability::Draft);
            assert_eq!(node.solver_mode, OoeSolverMode::Classic);
            assert_eq!(node.chunking_policy, OoeChunkingPolicy::None);
            assert_eq!(node.checkpoint_policy, OoeCheckpointPolicy::None);
            assert_eq!(node.streaming_policy, OoeStreamingPolicy::FinalOnly);
            assert_eq!(node.materialization_policy, OoeMaterializationPolicy::Full);
            assert_eq!(node.compute_topology, OoeComputeTopology::Local);
            assert_eq!(node.resource_policy, OoeResourcePolicy::Normal);

            if matches!(
                node.capability_id.as_str(),
                "table.build"
                    | "calculus.evaluate"
                    | "trigonometry.evaluate"
                    | "statistics.evaluate"
                    | "geometry.evaluate"
                    | "linearAlgebra.matrix"
                    | "linearAlgebra.vector"
            ) {
                assert_eq!(node.priority_class, OoePriorityClass::UserVisible);
            } else {
                assert_eq!(node.priority_class, OoePriorityClass::UserBlocking);
            }
        }
    }

    #[test]
    fn descriptors_and_plans_serde_round_trip() {
        let descriptor = list_builtin_ooe_plan_descriptors()
            .into_iter()
            .next()
            .expect("builtin descriptor should exist");
        let serialized_descriptor = serde_json::to_string(&descriptor).unwrap();
        let deserialized_descriptor: OoeBuiltinPlanDescriptor =
            serde_json::from_str(&serialized_descriptor).unwrap();
        assert_eq!(deserialized_descriptor, descriptor);

        let plan = list_builtin_ooe_plans()
            .into_iter()
            .next()
            .expect("builtin plan should exist");
        let serialized_plan = serde_json::to_string(&plan).unwrap();
        let deserialized_plan: OoePlan = serde_json::from_str(&serialized_plan).unwrap();
        assert_eq!(deserialized_plan, plan);
    }
}
