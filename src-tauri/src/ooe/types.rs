use serde::{Deserialize, Serialize};
use std::fmt;

pub const OOE_SCHEMA_VERSION: u32 = 1;

macro_rules! define_ooe_id {
    ($name:ident) => {
        #[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
        #[serde(transparent)]
        pub struct $name(pub String);

        impl $name {
            pub fn new(value: impl Into<String>) -> Self {
                Self(value.into())
            }

            pub fn as_str(&self) -> &str {
                self.0.as_str()
            }

            pub fn is_blank(&self) -> bool {
                self.as_str().trim().is_empty()
            }
        }

        impl From<&str> for $name {
            fn from(value: &str) -> Self {
                Self::new(value)
            }
        }

        impl From<String> for $name {
            fn from(value: String) -> Self {
                Self::new(value)
            }
        }

        impl fmt::Display for $name {
            fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str(self.as_str())
            }
        }
    };
}

define_ooe_id!(OoePlanId);
define_ooe_id!(OoeCapabilityId);
define_ooe_id!(OoeHostId);
define_ooe_id!(OoeNodeId);
define_ooe_id!(OoePhaseId);
define_ooe_id!(OoeTraceId);
define_ooe_id!(OoeJobId);
define_ooe_id!(OoeStageId);
define_ooe_id!(OoeInputRevisionId);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeTaskClass {
    Immediate,
    Deferred,
    Explicit,
    Heavy,
    RenderLimited,
    Background,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoePriorityClass {
    UserBlocking,
    UserVisible,
    Normal,
    Low,
    Idle,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeCancellationPolicy {
    NotCancellable,
    StaleDrop,
    Cooperative,
    HardStop,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeCommitPolicy {
    CommitLatestOnly,
    CommitIfCurrent,
    AlwaysCommit,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeThreadSafety {
    MainThreadOnly,
    WorkerSafe,
    RustThreadSafe,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeResultStability {
    Draft,
    Provisional,
    Stable,
    Stale,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeTraceStatus {
    Planned,
    Started,
    Completed,
    StaleDropped,
    Cancelled,
    Failed,
    SlowPhase,
    ProvisionalReady,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeCommitDecision {
    Committed,
    Skipped,
    StaleDropped,
    NotApplicable,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeSolverMode {
    Classic,
    Progressive,
}

impl Default for OoeSolverMode {
    fn default() -> Self {
        Self::Classic
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeChunkingPolicy {
    None,
    Chunked,
}

impl Default for OoeChunkingPolicy {
    fn default() -> Self {
        Self::None
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeCheckpointPolicy {
    None,
    IdempotentLedger,
}

impl Default for OoeCheckpointPolicy {
    fn default() -> Self {
        Self::None
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeStreamingPolicy {
    FinalOnly,
    CommittedArtifacts,
}

impl Default for OoeStreamingPolicy {
    fn default() -> Self {
        Self::FinalOnly
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeMaterializationPolicy {
    Full,
    SearchFirst,
}

impl Default for OoeMaterializationPolicy {
    fn default() -> Self {
        Self::Full
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeComputeTopology {
    Local,
    SingleExternal,
}

impl Default for OoeComputeTopology {
    fn default() -> Self {
        Self::Local
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeResourcePolicy {
    Normal,
}

impl Default for OoeResourcePolicy {
    fn default() -> Self {
        Self::Normal
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OoeNode {
    pub id: OoeNodeId,
    pub capability_id: OoeCapabilityId,
    pub host_id: OoeHostId,
    pub phase_id: OoePhaseId,
    pub task_class: OoeTaskClass,
    pub priority_class: OoePriorityClass,
    pub cancellation_policy: OoeCancellationPolicy,
    pub commit_policy: OoeCommitPolicy,
    pub thread_safety: OoeThreadSafety,
    pub result_stability: OoeResultStability,
    #[serde(default)]
    pub solver_mode: OoeSolverMode,
    #[serde(default)]
    pub chunking_policy: OoeChunkingPolicy,
    #[serde(default)]
    pub checkpoint_policy: OoeCheckpointPolicy,
    #[serde(default)]
    pub streaming_policy: OoeStreamingPolicy,
    #[serde(default)]
    pub materialization_policy: OoeMaterializationPolicy,
    #[serde(default)]
    pub compute_topology: OoeComputeTopology,
    #[serde(default)]
    pub resource_policy: OoeResourcePolicy,
    #[serde(default)]
    pub depends_on: Vec<OoeNodeId>,
    #[serde(default)]
    pub is_terminal_result: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OoePlan {
    pub id: OoePlanId,
    pub schema_version: u32,
    #[serde(default)]
    pub nodes: Vec<OoeNode>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OoeTraceEvent {
    #[serde(default)]
    pub trace_id: Option<OoeTraceId>,
    #[serde(default)]
    pub job_id: Option<OoeJobId>,
    pub plan_id: OoePlanId,
    #[serde(default)]
    pub node_id: Option<OoeNodeId>,
    #[serde(default)]
    pub capability_id: Option<OoeCapabilityId>,
    #[serde(default)]
    pub host_id: Option<OoeHostId>,
    #[serde(default)]
    pub phase_id: Option<OoePhaseId>,
    #[serde(default)]
    pub stage_id: Option<OoeStageId>,
    #[serde(default)]
    pub input_revision_id: Option<OoeInputRevisionId>,
    pub status: OoeTraceStatus,
    pub result_stability: OoeResultStability,
    #[serde(default)]
    pub duration_ms: Option<u64>,
    #[serde(default)]
    pub commit_decision: Option<OoeCommitDecision>,
    #[serde(default)]
    pub message: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extended_trace_event_serde_round_trips() {
        let event = OoeTraceEvent {
            trace_id: Some(OoeTraceId::from("trace.equation.solve.1")),
            job_id: Some(OoeJobId::from("job.equation.solve.1")),
            plan_id: OoePlanId::from("plan.equation.solve"),
            node_id: Some(OoeNodeId::from("node.equation.solve")),
            capability_id: Some(OoeCapabilityId::from("equation.solve")),
            host_id: Some(OoeHostId::from("equation-runtime")),
            phase_id: Some(OoePhaseId::from("equation.solve")),
            stage_id: Some(OoeStageId::from("direct-symbolic")),
            input_revision_id: Some(OoeInputRevisionId::from("input.42")),
            status: OoeTraceStatus::ProvisionalReady,
            result_stability: OoeResultStability::Provisional,
            duration_ms: Some(12),
            commit_decision: Some(OoeCommitDecision::Committed),
            message: Some("guarded stage returned an outcome".to_string()),
        };

        let serialized = serde_json::to_string(&event).unwrap();
        assert!(serialized.contains("\"status\":\"provisionalReady\""));
        assert!(serialized.contains("\"resultStability\":\"provisional\""));
        assert!(serialized.contains("\"commitDecision\":\"committed\""));

        let deserialized: OoeTraceEvent = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized, event);
    }

    #[test]
    fn trace_event_accepts_legacy_minimal_payloads() {
        let payload = r#"{
            "planId": "plan.equation.solve",
            "nodeId": null,
            "phaseId": null,
            "status": "completed",
            "resultStability": "stable",
            "durationMs": null,
            "message": null
        }"#;

        let event: OoeTraceEvent = serde_json::from_str(payload).unwrap();

        assert_eq!(event.trace_id, None);
        assert_eq!(event.job_id, None);
        assert_eq!(event.capability_id, None);
        assert_eq!(event.host_id, None);
        assert_eq!(event.stage_id, None);
        assert_eq!(event.input_revision_id, None);
        assert_eq!(event.commit_decision, None);
        assert_eq!(event.status, OoeTraceStatus::Completed);
        assert_eq!(event.result_stability, OoeResultStability::Stable);
    }

    #[test]
    fn node_accepts_legacy_payload_without_execution_policy_fields() {
        let payload = r#"{
            "id": "node.equation.solve",
            "capabilityId": "equation.solve",
            "hostId": "equation-runtime",
            "phaseId": "equation.solve",
            "taskClass": "explicit",
            "priorityClass": "userBlocking",
            "cancellationPolicy": "staleDrop",
            "commitPolicy": "commitLatestOnly",
            "threadSafety": "mainThreadOnly",
            "resultStability": "draft",
            "dependsOn": [],
            "isTerminalResult": true
        }"#;

        let node: OoeNode = serde_json::from_str(payload).unwrap();

        assert_eq!(node.solver_mode, OoeSolverMode::Classic);
        assert_eq!(node.chunking_policy, OoeChunkingPolicy::None);
        assert_eq!(node.checkpoint_policy, OoeCheckpointPolicy::None);
        assert_eq!(node.streaming_policy, OoeStreamingPolicy::FinalOnly);
        assert_eq!(node.materialization_policy, OoeMaterializationPolicy::Full);
        assert_eq!(node.compute_topology, OoeComputeTopology::Local);
        assert_eq!(node.resource_policy, OoeResourcePolicy::Normal);
    }

    #[test]
    fn progressive_execution_policy_serde_round_trips() {
        let node = OoeNode {
            id: OoeNodeId::from("node.equation.solve"),
            capability_id: OoeCapabilityId::from("equation.solve"),
            host_id: OoeHostId::from("equation-runtime"),
            phase_id: OoePhaseId::from("equation.solve"),
            task_class: OoeTaskClass::Heavy,
            priority_class: OoePriorityClass::UserVisible,
            cancellation_policy: OoeCancellationPolicy::Cooperative,
            commit_policy: OoeCommitPolicy::CommitLatestOnly,
            thread_safety: OoeThreadSafety::RustThreadSafe,
            result_stability: OoeResultStability::Draft,
            solver_mode: OoeSolverMode::Progressive,
            chunking_policy: OoeChunkingPolicy::Chunked,
            checkpoint_policy: OoeCheckpointPolicy::IdempotentLedger,
            streaming_policy: OoeStreamingPolicy::CommittedArtifacts,
            materialization_policy: OoeMaterializationPolicy::SearchFirst,
            compute_topology: OoeComputeTopology::SingleExternal,
            resource_policy: OoeResourcePolicy::Normal,
            depends_on: Vec::new(),
            is_terminal_result: true,
        };

        let serialized = serde_json::to_string(&node).unwrap();
        assert!(serialized.contains("\"solverMode\":\"progressive\""));
        assert!(serialized.contains("\"checkpointPolicy\":\"idempotentLedger\""));
        assert!(serialized.contains("\"computeTopology\":\"singleExternal\""));

        let deserialized: OoeNode = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized, node);
    }

    #[test]
    fn deferred_atomic_policy_is_not_an_active_schema_value() {
        let payload = r#"{
            "id": "node.equation.solve",
            "capabilityId": "equation.solve",
            "hostId": "equation-runtime",
            "phaseId": "equation.solve",
            "taskClass": "explicit",
            "priorityClass": "userBlocking",
            "cancellationPolicy": "staleDrop",
            "commitPolicy": "commitLatestOnly",
            "threadSafety": "mainThreadOnly",
            "resultStability": "draft",
            "solverMode": "atomic",
            "dependsOn": [],
            "isTerminalResult": true
        }"#;

        let error = serde_json::from_str::<OoeNode>(payload).unwrap_err();
        assert!(error.to_string().contains("atomic"));
    }
}
