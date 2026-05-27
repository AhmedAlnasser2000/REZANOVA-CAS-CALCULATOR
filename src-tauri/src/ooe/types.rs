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
    Failed,
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
    pub plan_id: OoePlanId,
    pub node_id: Option<OoeNodeId>,
    pub phase_id: Option<OoePhaseId>,
    pub status: OoeTraceStatus,
    pub result_stability: OoeResultStability,
    pub duration_ms: Option<u64>,
    pub message: Option<String>,
}
