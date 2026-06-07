use super::{
    OoeCancellationPolicy, OoeHostId, OoeResultStability, OoeTaskClass, OoeThreadSafety,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeHostKind {
    MainThreadTypeScript,
    WebWorker,
    Iframe,
    TauriCommandRust,
    ProgressiveRunner,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeHostBudgetPolicy {
    Unbudgeted,
    Debounced,
    Cooperative,
    Isolated,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OoeBuiltinHostDescriptor {
    pub host_id: OoeHostId,
    pub host_kind: OoeHostKind,
    pub thread_safety: OoeThreadSafety,
    pub supported_task_classes: Vec<OoeTaskClass>,
    pub budget_policy: OoeHostBudgetPolicy,
    pub cancellation_policy: OoeCancellationPolicy,
    pub default_result_stability: OoeResultStability,
    pub description: String,
}

struct OoeBuiltinHostDefinition {
    host_id: &'static str,
    host_kind: OoeHostKind,
    thread_safety: OoeThreadSafety,
    supported_task_classes: &'static [OoeTaskClass],
    budget_policy: OoeHostBudgetPolicy,
    cancellation_policy: OoeCancellationPolicy,
    default_result_stability: OoeResultStability,
    description: &'static str,
}

const EXPLICIT_ONLY: &[OoeTaskClass] = &[OoeTaskClass::Explicit];
const EDITOR_ANALYSIS_TASKS: &[OoeTaskClass] = &[
    OoeTaskClass::Deferred,
    OoeTaskClass::RenderLimited,
];

const BUILTIN_HOST_DEFINITIONS: &[OoeBuiltinHostDefinition] = &[
    OoeBuiltinHostDefinition {
        host_id: "expression-runtime",
        host_kind: OoeHostKind::MainThreadTypeScript,
        thread_safety: OoeThreadSafety::MainThreadOnly,
        supported_task_classes: EXPLICIT_ONLY,
        budget_policy: OoeHostBudgetPolicy::Unbudgeted,
        cancellation_policy: OoeCancellationPolicy::StaleDrop,
        default_result_stability: OoeResultStability::Draft,
        description: "Current main-thread TypeScript host for Calculate expression work.",
    },
    OoeBuiltinHostDefinition {
        host_id: "equation-runtime",
        host_kind: OoeHostKind::MainThreadTypeScript,
        thread_safety: OoeThreadSafety::MainThreadOnly,
        supported_task_classes: EXPLICIT_ONLY,
        budget_policy: OoeHostBudgetPolicy::Unbudgeted,
        cancellation_policy: OoeCancellationPolicy::StaleDrop,
        default_result_stability: OoeResultStability::Draft,
        description: "Current main-thread TypeScript host for Equation solve work.",
    },
    OoeBuiltinHostDefinition {
        host_id: "equation-worker-runtime",
        host_kind: OoeHostKind::WebWorker,
        thread_safety: OoeThreadSafety::WorkerSafe,
        supported_task_classes: EXPLICIT_ONLY,
        budget_policy: OoeHostBudgetPolicy::Isolated,
        cancellation_policy: OoeCancellationPolicy::HardStop,
        default_result_stability: OoeResultStability::Draft,
        description: "Isolated Web Worker host for full Equation solve runtime-shell work.",
    },
    OoeBuiltinHostDefinition {
        host_id: "equation-direct-symbolic-worker-runtime",
        host_kind: OoeHostKind::WebWorker,
        thread_safety: OoeThreadSafety::WorkerSafe,
        supported_task_classes: EXPLICIT_ONLY,
        budget_policy: OoeHostBudgetPolicy::Isolated,
        cancellation_policy: OoeCancellationPolicy::HardStop,
        default_result_stability: OoeResultStability::Draft,
        description: "Isolated Web Worker helper host for Equation direct-symbolic fallback work.",
    },
    OoeBuiltinHostDefinition {
        host_id: "table-runtime",
        host_kind: OoeHostKind::MainThreadTypeScript,
        thread_safety: OoeThreadSafety::MainThreadOnly,
        supported_task_classes: EXPLICIT_ONLY,
        budget_policy: OoeHostBudgetPolicy::Cooperative,
        cancellation_policy: OoeCancellationPolicy::Cooperative,
        default_result_stability: OoeResultStability::Draft,
        description: "Cooperative main-thread TypeScript fallback host for Table builds.",
    },
    OoeBuiltinHostDefinition {
        host_id: "table-worker-runtime",
        host_kind: OoeHostKind::WebWorker,
        thread_safety: OoeThreadSafety::WorkerSafe,
        supported_task_classes: EXPLICIT_ONLY,
        budget_policy: OoeHostBudgetPolicy::Isolated,
        cancellation_policy: OoeCancellationPolicy::HardStop,
        default_result_stability: OoeResultStability::Draft,
        description: "Isolated Web Worker host for active Table builds.",
    },
    OoeBuiltinHostDefinition {
        host_id: "editor-analysis-runtime",
        host_kind: OoeHostKind::MainThreadTypeScript,
        thread_safety: OoeThreadSafety::MainThreadOnly,
        supported_task_classes: EDITOR_ANALYSIS_TASKS,
        budget_policy: OoeHostBudgetPolicy::Debounced,
        cancellation_policy: OoeCancellationPolicy::StaleDrop,
        default_result_stability: OoeResultStability::Draft,
        description: "Current debounced main-thread TypeScript host for editor analysis lanes.",
    },
    OoeBuiltinHostDefinition {
        host_id: "calculus-runtime",
        host_kind: OoeHostKind::MainThreadTypeScript,
        thread_safety: OoeThreadSafety::MainThreadOnly,
        supported_task_classes: EXPLICIT_ONLY,
        budget_policy: OoeHostBudgetPolicy::Cooperative,
        cancellation_policy: OoeCancellationPolicy::Cooperative,
        default_result_stability: OoeResultStability::Draft,
        description: "Cooperative main-thread TypeScript fallback host for Calculus evaluation.",
    },
    OoeBuiltinHostDefinition {
        host_id: "calculus-worker-runtime",
        host_kind: OoeHostKind::WebWorker,
        thread_safety: OoeThreadSafety::WorkerSafe,
        supported_task_classes: EXPLICIT_ONLY,
        budget_policy: OoeHostBudgetPolicy::Isolated,
        cancellation_policy: OoeCancellationPolicy::HardStop,
        default_result_stability: OoeResultStability::Draft,
        description: "Isolated Web Worker host for active Calculus evaluation.",
    },
    OoeBuiltinHostDefinition {
        host_id: "trigonometry-runtime",
        host_kind: OoeHostKind::MainThreadTypeScript,
        thread_safety: OoeThreadSafety::MainThreadOnly,
        supported_task_classes: EXPLICIT_ONLY,
        budget_policy: OoeHostBudgetPolicy::Unbudgeted,
        cancellation_policy: OoeCancellationPolicy::StaleDrop,
        default_result_stability: OoeResultStability::Draft,
        description: "Current main-thread TypeScript host for Trigonometry provenance.",
    },
    OoeBuiltinHostDefinition {
        host_id: "statistics-runtime",
        host_kind: OoeHostKind::MainThreadTypeScript,
        thread_safety: OoeThreadSafety::MainThreadOnly,
        supported_task_classes: EXPLICIT_ONLY,
        budget_policy: OoeHostBudgetPolicy::Unbudgeted,
        cancellation_policy: OoeCancellationPolicy::StaleDrop,
        default_result_stability: OoeResultStability::Draft,
        description: "Current main-thread TypeScript host for Statistics provenance.",
    },
    OoeBuiltinHostDefinition {
        host_id: "statistics-worker-runtime",
        host_kind: OoeHostKind::WebWorker,
        thread_safety: OoeThreadSafety::WorkerSafe,
        supported_task_classes: EXPLICIT_ONLY,
        budget_policy: OoeHostBudgetPolicy::Isolated,
        cancellation_policy: OoeCancellationPolicy::HardStop,
        default_result_stability: OoeResultStability::Draft,
        description: "Isolated Web Worker host for active Statistics evaluation.",
    },
    OoeBuiltinHostDefinition {
        host_id: "geometry-runtime",
        host_kind: OoeHostKind::MainThreadTypeScript,
        thread_safety: OoeThreadSafety::MainThreadOnly,
        supported_task_classes: EXPLICIT_ONLY,
        budget_policy: OoeHostBudgetPolicy::Unbudgeted,
        cancellation_policy: OoeCancellationPolicy::StaleDrop,
        default_result_stability: OoeResultStability::Draft,
        description: "Current main-thread TypeScript host for Geometry provenance.",
    },
    OoeBuiltinHostDefinition {
        host_id: "linear-algebra-runtime",
        host_kind: OoeHostKind::MainThreadTypeScript,
        thread_safety: OoeThreadSafety::MainThreadOnly,
        supported_task_classes: EXPLICIT_ONLY,
        budget_policy: OoeHostBudgetPolicy::Unbudgeted,
        cancellation_policy: OoeCancellationPolicy::StaleDrop,
        default_result_stability: OoeResultStability::Draft,
        description: "Current main-thread TypeScript host for Matrix and Vector provenance.",
    },
];

fn descriptor_from_definition(definition: &OoeBuiltinHostDefinition) -> OoeBuiltinHostDescriptor {
    OoeBuiltinHostDescriptor {
        host_id: OoeHostId::from(definition.host_id),
        host_kind: definition.host_kind.clone(),
        thread_safety: definition.thread_safety.clone(),
        supported_task_classes: definition.supported_task_classes.to_vec(),
        budget_policy: definition.budget_policy.clone(),
        cancellation_policy: definition.cancellation_policy.clone(),
        default_result_stability: definition.default_result_stability.clone(),
        description: definition.description.to_string(),
    }
}

pub fn list_builtin_ooe_host_descriptors() -> Vec<OoeBuiltinHostDescriptor> {
    BUILTIN_HOST_DEFINITIONS
        .iter()
        .map(descriptor_from_definition)
        .collect()
}

pub fn get_builtin_ooe_host(host_id: &OoeHostId) -> Option<OoeBuiltinHostDescriptor> {
    list_builtin_ooe_host_descriptors()
        .into_iter()
        .find(|descriptor| &descriptor.host_id == host_id)
}

pub fn builtin_ooe_host_map() -> BTreeMap<String, OoeBuiltinHostDescriptor> {
    list_builtin_ooe_host_descriptors()
        .into_iter()
        .map(|descriptor| (descriptor.host_id.as_str().to_string(), descriptor))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ooe::{list_builtin_ooe_plans, OoeHostId};
    use std::collections::BTreeSet;

    #[test]
    fn builtin_host_descriptors_serde_round_trip() {
        for descriptor in list_builtin_ooe_host_descriptors() {
            let serialized = serde_json::to_string(&descriptor).unwrap();
            let deserialized: OoeBuiltinHostDescriptor = serde_json::from_str(&serialized).unwrap();

            assert_eq!(deserialized, descriptor);
        }
    }

    #[test]
    fn registers_exact_current_active_host_ids() {
        let host_ids: BTreeSet<_> = list_builtin_ooe_host_descriptors()
            .iter()
            .map(|descriptor| descriptor.host_id.as_str().to_string())
            .collect();

        assert_eq!(host_ids, BTreeSet::from([
            "calculus-runtime".to_string(),
            "calculus-worker-runtime".to_string(),
            "editor-analysis-runtime".to_string(),
            "equation-direct-symbolic-worker-runtime".to_string(),
            "equation-runtime".to_string(),
            "equation-worker-runtime".to_string(),
            "expression-runtime".to_string(),
            "geometry-runtime".to_string(),
            "linear-algebra-runtime".to_string(),
            "statistics-runtime".to_string(),
            "statistics-worker-runtime".to_string(),
            "table-runtime".to_string(),
            "table-worker-runtime".to_string(),
            "trigonometry-runtime".to_string(),
        ]));
    }

    #[test]
    fn every_builtin_plan_uses_a_known_host_descriptor() {
        let hosts = builtin_ooe_host_map();

        for plan in list_builtin_ooe_plans() {
            for node in plan.nodes {
                assert!(
                    hosts.contains_key(node.host_id.as_str()),
                    "plan {} referenced unknown host {}",
                    plan.id.as_str(),
                    node.host_id.as_str(),
                );
            }
        }
    }

    #[test]
    fn plan_task_classes_are_supported_by_host_descriptors() {
        let hosts = builtin_ooe_host_map();

        for plan in list_builtin_ooe_plans() {
            for node in plan.nodes {
                let host = hosts.get(node.host_id.as_str()).unwrap();
                assert!(
                    host.supported_task_classes.contains(&node.task_class),
                    "host {} does not support task class {:?} for plan {}",
                    host.host_id.as_str(),
                    node.task_class,
                    plan.id.as_str(),
                );
            }
        }
    }

    #[test]
    fn lookup_returns_known_host_and_none_for_unknown() {
        let host = get_builtin_ooe_host(&OoeHostId::from("equation-runtime"))
            .expect("equation host should exist");

        assert_eq!(host.host_id, OoeHostId::from("equation-runtime"));
        assert_eq!(host.host_kind, OoeHostKind::MainThreadTypeScript);
        assert!(get_builtin_ooe_host(&OoeHostId::from("unknown-runtime")).is_none());
    }

    #[test]
    fn future_host_kind_schema_values_serde_round_trip() {
        for host_kind in [
            OoeHostKind::WebWorker,
            OoeHostKind::Iframe,
            OoeHostKind::TauriCommandRust,
            OoeHostKind::ProgressiveRunner,
        ] {
            let descriptor = OoeBuiltinHostDescriptor {
                host_id: OoeHostId::from("future-host"),
                host_kind,
                thread_safety: OoeThreadSafety::WorkerSafe,
                supported_task_classes: vec![OoeTaskClass::Heavy],
                budget_policy: OoeHostBudgetPolicy::Cooperative,
                cancellation_policy: OoeCancellationPolicy::Cooperative,
                default_result_stability: OoeResultStability::Draft,
                description: "Future inactive host shape.".to_string(),
            };

            let serialized = serde_json::to_string(&descriptor).unwrap();
            let deserialized: OoeBuiltinHostDescriptor = serde_json::from_str(&serialized).unwrap();

            assert_eq!(deserialized, descriptor);
        }
    }
}
