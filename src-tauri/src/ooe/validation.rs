use super::types::{
    OoeCheckpointPolicy, OoeChunkingPolicy, OoeMaterializationPolicy, OoeNode, OoeNodeId, OoePlan,
    OoeResourcePolicy, OoeSolverMode, OoeStreamingPolicy,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    fmt,
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum OoeValidationError {
    EmptyPlanId,
    EmptyNodeId {
        index: usize,
    },
    EmptyCapabilityId {
        node_id: String,
    },
    EmptyHostId {
        node_id: String,
    },
    EmptyPhaseId {
        node_id: String,
    },
    DuplicateNodeId {
        node_id: String,
    },
    MissingDependency {
        node_id: String,
        dependency_id: String,
    },
    CycleDetected {
        node_id: String,
    },
    MissingTerminalResult,
    ClassicExecutionPolicyMismatch {
        node_id: String,
        policy: String,
    },
    ProgressiveRequiresChunking {
        node_id: String,
    },
}

impl fmt::Display for OoeValidationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyPlanId => formatter.write_str("OOE plan ID must not be empty."),
            Self::EmptyNodeId { index } => {
                write!(formatter, "OOE node at index {index} must have a non-empty ID.")
            }
            Self::EmptyCapabilityId { node_id } => {
                write!(formatter, "OOE node '{node_id}' must reference a non-empty capability ID.")
            }
            Self::EmptyHostId { node_id } => {
                write!(formatter, "OOE node '{node_id}' must reference a non-empty host ID.")
            }
            Self::EmptyPhaseId { node_id } => {
                write!(formatter, "OOE node '{node_id}' must reference a non-empty phase ID.")
            }
            Self::DuplicateNodeId { node_id } => {
                write!(formatter, "OOE node ID '{node_id}' is duplicated.")
            }
            Self::MissingDependency {
                node_id,
                dependency_id,
            } => write!(
                formatter,
                "OOE node '{node_id}' depends on missing node '{dependency_id}'."
            ),
            Self::CycleDetected { node_id } => {
                write!(formatter, "OOE dependency graph contains a cycle at node '{node_id}'.")
            }
            Self::MissingTerminalResult => {
                formatter.write_str("OOE plan must include at least one terminal result node.")
            }
            Self::ClassicExecutionPolicyMismatch { node_id, policy } => write!(
                formatter,
                "OOE node '{node_id}' uses classic solver mode but has incompatible {policy} metadata."
            ),
            Self::ProgressiveRequiresChunking { node_id } => write!(
                formatter,
                "OOE node '{node_id}' uses progressive solver mode and must use chunked execution."
            ),
        }
    }
}

impl std::error::Error for OoeValidationError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum VisitState {
    Visiting,
    Visited,
}

pub fn validate_ooe_plan(plan: &OoePlan) -> Result<(), Vec<OoeValidationError>> {
    let mut errors = Vec::new();

    if plan.id.is_blank() {
        errors.push(OoeValidationError::EmptyPlanId);
    }

    let mut seen_node_ids = HashSet::new();
    let mut graph: HashMap<OoeNodeId, Vec<OoeNodeId>> = HashMap::new();

    for (index, node) in plan.nodes.iter().enumerate() {
        validate_node_ids(node, index, &mut errors);
        validate_node_execution_policy(node, &mut errors);

        if !seen_node_ids.insert(node.id.clone()) {
            errors.push(OoeValidationError::DuplicateNodeId {
                node_id: node.id.to_string(),
            });
        }

        graph
            .entry(node.id.clone())
            .or_insert_with(|| node.depends_on.clone());
    }

    if !plan.nodes.iter().any(|node| node.is_terminal_result) {
        errors.push(OoeValidationError::MissingTerminalResult);
    }

    validate_dependencies(plan, &graph, &mut errors);
    validate_acyclic(&graph, &mut errors);

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

fn validate_node_ids(node: &OoeNode, index: usize, errors: &mut Vec<OoeValidationError>) {
    let node_id = node.id.to_string();

    if node.id.is_blank() {
        errors.push(OoeValidationError::EmptyNodeId { index });
    }

    if node.capability_id.is_blank() {
        errors.push(OoeValidationError::EmptyCapabilityId {
            node_id: node_id.clone(),
        });
    }

    if node.host_id.is_blank() {
        errors.push(OoeValidationError::EmptyHostId {
            node_id: node_id.clone(),
        });
    }

    if node.phase_id.is_blank() {
        errors.push(OoeValidationError::EmptyPhaseId { node_id });
    }
}

fn validate_node_execution_policy(node: &OoeNode, errors: &mut Vec<OoeValidationError>) {
    match &node.solver_mode {
        OoeSolverMode::Classic => {
            validate_classic_node_execution_policy(node, errors);
        }
        OoeSolverMode::Progressive => {
            if node.chunking_policy != OoeChunkingPolicy::Chunked {
                errors.push(OoeValidationError::ProgressiveRequiresChunking {
                    node_id: node.id.to_string(),
                });
            }
        }
    }
}

fn push_classic_policy_mismatch(
    node: &OoeNode,
    policy: &str,
    errors: &mut Vec<OoeValidationError>,
) {
    errors.push(OoeValidationError::ClassicExecutionPolicyMismatch {
        node_id: node.id.to_string(),
        policy: policy.into(),
    });
}

fn validate_classic_node_execution_policy(node: &OoeNode, errors: &mut Vec<OoeValidationError>) {
    if node.chunking_policy != OoeChunkingPolicy::None {
        push_classic_policy_mismatch(node, "chunkingPolicy", errors);
    }
    if node.checkpoint_policy != OoeCheckpointPolicy::None {
        push_classic_policy_mismatch(node, "checkpointPolicy", errors);
    }
    if node.streaming_policy != OoeStreamingPolicy::FinalOnly {
        push_classic_policy_mismatch(node, "streamingPolicy", errors);
    }
    if node.materialization_policy != OoeMaterializationPolicy::Full {
        push_classic_policy_mismatch(node, "materializationPolicy", errors);
    }
    if node.resource_policy != OoeResourcePolicy::Normal {
        push_classic_policy_mismatch(node, "resourcePolicy", errors);
    }
}

fn validate_dependencies(
    plan: &OoePlan,
    graph: &HashMap<OoeNodeId, Vec<OoeNodeId>>,
    errors: &mut Vec<OoeValidationError>,
) {
    for node in &plan.nodes {
        for dependency_id in &node.depends_on {
            if !graph.contains_key(dependency_id) {
                errors.push(OoeValidationError::MissingDependency {
                    node_id: node.id.to_string(),
                    dependency_id: dependency_id.to_string(),
                });
            }
        }
    }
}

fn validate_acyclic(
    graph: &HashMap<OoeNodeId, Vec<OoeNodeId>>,
    errors: &mut Vec<OoeValidationError>,
) {
    let mut states: HashMap<OoeNodeId, VisitState> = HashMap::new();

    for node_id in graph.keys() {
        if matches!(states.get(node_id), Some(VisitState::Visited)) {
            continue;
        }

        if let Some(cycle_node_id) = find_cycle(node_id, graph, &mut states) {
            errors.push(OoeValidationError::CycleDetected {
                node_id: cycle_node_id.to_string(),
            });
            return;
        }
    }
}

fn find_cycle(
    node_id: &OoeNodeId,
    graph: &HashMap<OoeNodeId, Vec<OoeNodeId>>,
    states: &mut HashMap<OoeNodeId, VisitState>,
) -> Option<OoeNodeId> {
    match states.get(node_id) {
        Some(VisitState::Visiting) => return Some(node_id.clone()),
        Some(VisitState::Visited) => return None,
        None => {}
    }

    states.insert(node_id.clone(), VisitState::Visiting);

    if let Some(dependencies) = graph.get(node_id) {
        for dependency_id in dependencies {
            if !graph.contains_key(dependency_id) {
                continue;
            }

            if let Some(cycle_node_id) = find_cycle(dependency_id, graph, states) {
                return Some(cycle_node_id);
            }
        }
    }

    states.insert(node_id.clone(), VisitState::Visited);
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ooe::types::{
        OoeCancellationPolicy, OoeCapabilityId, OoeCheckpointPolicy, OoeChunkingPolicy,
        OoeCommitPolicy, OoeComputeTopology, OoeHostId, OoeMaterializationPolicy, OoeNode,
        OoeNodeId, OoePhaseId, OoePlan, OoePlanId, OoePriorityClass, OoeResourcePolicy,
        OoeResultStability, OoeSolverMode, OoeStreamingPolicy, OoeTaskClass, OoeThreadSafety,
        OOE_SCHEMA_VERSION,
    };

    fn node(id: &str, dependencies: &[&str], is_terminal_result: bool) -> OoeNode {
        OoeNode {
            id: OoeNodeId::from(id),
            capability_id: OoeCapabilityId::from("equation.solve"),
            host_id: OoeHostId::from("equation-runtime"),
            phase_id: OoePhaseId::from("solve"),
            task_class: OoeTaskClass::Explicit,
            priority_class: OoePriorityClass::UserBlocking,
            cancellation_policy: OoeCancellationPolicy::StaleDrop,
            commit_policy: OoeCommitPolicy::CommitLatestOnly,
            thread_safety: OoeThreadSafety::WorkerSafe,
            result_stability: OoeResultStability::Draft,
            solver_mode: OoeSolverMode::Classic,
            chunking_policy: OoeChunkingPolicy::None,
            checkpoint_policy: OoeCheckpointPolicy::None,
            streaming_policy: OoeStreamingPolicy::FinalOnly,
            materialization_policy: OoeMaterializationPolicy::Full,
            compute_topology: OoeComputeTopology::Local,
            resource_policy: OoeResourcePolicy::Normal,
            depends_on: dependencies.iter().map(|id| OoeNodeId::from(*id)).collect(),
            is_terminal_result,
        }
    }

    fn valid_plan() -> OoePlan {
        OoePlan {
            id: OoePlanId::from("plan.equation.solve"),
            schema_version: OOE_SCHEMA_VERSION,
            nodes: vec![node("solve", &[], true)],
        }
    }

    fn validation_errors(plan: &OoePlan) -> Vec<OoeValidationError> {
        validate_ooe_plan(plan).expect_err("plan should be invalid")
    }

    #[test]
    fn accepts_minimal_valid_terminal_plan() {
        assert!(validate_ooe_plan(&valid_plan()).is_ok());
    }

    #[test]
    fn rejects_empty_plan_id() {
        let mut plan = valid_plan();
        plan.id = OoePlanId::from(" ");

        let errors = validation_errors(&plan);
        assert!(errors.contains(&OoeValidationError::EmptyPlanId));
    }

    #[test]
    fn rejects_empty_node_and_reference_ids() {
        let mut plan = valid_plan();
        let node = plan.nodes.first_mut().unwrap();
        node.id = OoeNodeId::from("");
        node.capability_id = OoeCapabilityId::from(" ");
        node.host_id = OoeHostId::from("");
        node.phase_id = OoePhaseId::from(" ");

        let errors = validation_errors(&plan);
        assert!(errors.contains(&OoeValidationError::EmptyNodeId { index: 0 }));
        assert!(errors.contains(&OoeValidationError::EmptyCapabilityId {
            node_id: String::new()
        }));
        assert!(errors.contains(&OoeValidationError::EmptyHostId {
            node_id: String::new()
        }));
        assert!(errors.contains(&OoeValidationError::EmptyPhaseId {
            node_id: String::new()
        }));
    }

    #[test]
    fn rejects_duplicate_node_ids() {
        let mut plan = valid_plan();
        plan.nodes.push(node("solve", &[], false));

        let errors = validation_errors(&plan);
        assert!(errors.contains(&OoeValidationError::DuplicateNodeId {
            node_id: "solve".into()
        }));
    }

    #[test]
    fn rejects_missing_dependency_references() {
        let mut plan = valid_plan();
        plan.nodes = vec![node("solve", &["missing"], true)];

        let errors = validation_errors(&plan);
        assert!(errors.contains(&OoeValidationError::MissingDependency {
            node_id: "solve".into(),
            dependency_id: "missing".into()
        }));
    }

    #[test]
    fn rejects_simple_cycle() {
        let mut plan = valid_plan();
        plan.nodes = vec![node("solve", &["solve"], true)];

        let errors = validation_errors(&plan);
        assert!(errors
            .iter()
            .any(|error| matches!(error, OoeValidationError::CycleDetected { .. })));
    }

    #[test]
    fn rejects_multi_node_cycle() {
        let mut plan = valid_plan();
        plan.nodes = vec![
            node("prepare", &["solve"], false),
            node("solve", &["prepare"], true),
        ];

        let errors = validation_errors(&plan);
        assert!(errors
            .iter()
            .any(|error| matches!(error, OoeValidationError::CycleDetected { .. })));
    }

    #[test]
    fn rejects_plan_without_terminal_result() {
        let mut plan = valid_plan();
        plan.nodes[0].is_terminal_result = false;

        let errors = validation_errors(&plan);
        assert!(errors.contains(&OoeValidationError::MissingTerminalResult));
    }

    #[test]
    fn rejects_classic_nodes_with_progressive_policy_metadata() {
        let mut plan = valid_plan();
        let node = plan.nodes.first_mut().unwrap();
        node.chunking_policy = OoeChunkingPolicy::Chunked;
        node.checkpoint_policy = OoeCheckpointPolicy::IdempotentLedger;
        node.streaming_policy = OoeStreamingPolicy::CommittedArtifacts;
        node.materialization_policy = OoeMaterializationPolicy::SearchFirst;

        let errors = validation_errors(&plan);

        assert!(
            errors.contains(&OoeValidationError::ClassicExecutionPolicyMismatch {
                node_id: "solve".into(),
                policy: "chunkingPolicy".into()
            })
        );
        assert!(
            errors.contains(&OoeValidationError::ClassicExecutionPolicyMismatch {
                node_id: "solve".into(),
                policy: "checkpointPolicy".into()
            })
        );
        assert!(
            errors.contains(&OoeValidationError::ClassicExecutionPolicyMismatch {
                node_id: "solve".into(),
                policy: "streamingPolicy".into()
            })
        );
        assert!(
            errors.contains(&OoeValidationError::ClassicExecutionPolicyMismatch {
                node_id: "solve".into(),
                policy: "materializationPolicy".into()
            })
        );
    }

    #[test]
    fn accepts_coherent_progressive_metadata() {
        let mut plan = valid_plan();
        let node = plan.nodes.first_mut().unwrap();
        node.solver_mode = OoeSolverMode::Progressive;
        node.chunking_policy = OoeChunkingPolicy::Chunked;
        node.checkpoint_policy = OoeCheckpointPolicy::IdempotentLedger;
        node.streaming_policy = OoeStreamingPolicy::CommittedArtifacts;
        node.materialization_policy = OoeMaterializationPolicy::SearchFirst;
        node.compute_topology = OoeComputeTopology::SingleExternal;

        assert!(validate_ooe_plan(&plan).is_ok());
    }

    #[test]
    fn rejects_progressive_metadata_without_chunking() {
        let mut plan = valid_plan();
        let node = plan.nodes.first_mut().unwrap();
        node.solver_mode = OoeSolverMode::Progressive;

        let errors = validation_errors(&plan);
        assert!(
            errors.contains(&OoeValidationError::ProgressiveRequiresChunking {
                node_id: "solve".into()
            })
        );
    }

    #[test]
    fn serde_round_trips_valid_plan_and_validation_errors() {
        let plan = valid_plan();
        let serialized_plan = serde_json::to_string(&plan).unwrap();
        let deserialized_plan: OoePlan = serde_json::from_str(&serialized_plan).unwrap();
        assert_eq!(deserialized_plan, plan);

        let error = OoeValidationError::MissingDependency {
            node_id: "solve".into(),
            dependency_id: "prepare".into(),
        };
        let serialized_error = serde_json::to_string(&error).unwrap();
        let deserialized_error: OoeValidationError =
            serde_json::from_str(&serialized_error).unwrap();
        assert_eq!(deserialized_error, error);
        assert!(error.to_string().contains("missing node"));

        let policy_error = OoeValidationError::ClassicExecutionPolicyMismatch {
            node_id: "solve".into(),
            policy: "chunkingPolicy".into(),
        };
        let serialized_policy_error = serde_json::to_string(&policy_error).unwrap();
        let deserialized_policy_error: OoeValidationError =
            serde_json::from_str(&serialized_policy_error).unwrap();
        assert_eq!(deserialized_policy_error, policy_error);
        assert!(policy_error.to_string().contains("classic solver mode"));
    }
}
