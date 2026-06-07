use super::{
    get_builtin_ooe_host, get_builtin_ooe_plan, list_builtin_ooe_host_descriptors,
    list_builtin_ooe_plan_descriptors, validate_ooe_plan, OoeBuiltinHostDescriptor,
    OoeBuiltinPlanDescriptor, OoeHostId, OoePlan, OoePlanId, OoeValidationError,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OoeValidationReport {
    pub ok: bool,
    pub errors: Vec<OoeValidationError>,
}

pub fn list_builtin_plans_for_command() -> Vec<OoeBuiltinPlanDescriptor> {
    list_builtin_ooe_plan_descriptors()
}

pub fn list_builtin_hosts_for_command() -> Vec<OoeBuiltinHostDescriptor> {
    list_builtin_ooe_host_descriptors()
}

pub fn get_builtin_plan_for_command(plan_id: OoePlanId) -> Option<OoePlan> {
    get_builtin_ooe_plan(&plan_id)
}

pub fn get_builtin_host_for_command(host_id: OoeHostId) -> Option<OoeBuiltinHostDescriptor> {
    get_builtin_ooe_host(&host_id)
}

pub fn validate_plan_for_command(plan: OoePlan) -> OoeValidationReport {
    match validate_ooe_plan(&plan) {
        Ok(()) => OoeValidationReport {
            ok: true,
            errors: Vec::new(),
        },
        Err(errors) => OoeValidationReport { ok: false, errors },
    }
}

#[tauri::command]
pub fn ooe_list_builtin_plans() -> Vec<OoeBuiltinPlanDescriptor> {
    list_builtin_plans_for_command()
}

#[tauri::command]
pub fn ooe_list_builtin_hosts() -> Vec<OoeBuiltinHostDescriptor> {
    list_builtin_hosts_for_command()
}

#[tauri::command]
pub fn ooe_get_builtin_plan(plan_id: OoePlanId) -> Option<OoePlan> {
    get_builtin_plan_for_command(plan_id)
}

#[tauri::command]
pub fn ooe_get_builtin_host(host_id: OoeHostId) -> Option<OoeBuiltinHostDescriptor> {
    get_builtin_host_for_command(host_id)
}

#[tauri::command]
pub fn ooe_validate_plan(plan: OoePlan) -> OoeValidationReport {
    validate_plan_for_command(plan)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ooe::{
        OoeCancellationPolicy, OoeCapabilityId, OoeCheckpointPolicy, OoeChunkingPolicy,
        OoeCommitPolicy, OoeComputeTopology, OoeHostId, OoeMaterializationPolicy, OoeNode,
        OoeNodeId, OoePhaseId, OoePlan, OoePriorityClass, OoeResourcePolicy, OoeResultStability,
        OoeSolverMode, OoeStreamingPolicy, OoeTaskClass, OoeThreadSafety, OOE_SCHEMA_VERSION,
    };

    fn valid_plan() -> OoePlan {
        OoePlan {
            id: OoePlanId::from("plan.test"),
            schema_version: OOE_SCHEMA_VERSION,
            nodes: vec![OoeNode {
                id: OoeNodeId::from("node.test"),
                capability_id: OoeCapabilityId::from("expression.evaluate"),
                host_id: OoeHostId::from("expression-runtime"),
                phase_id: OoePhaseId::from("expression.evaluate"),
                task_class: OoeTaskClass::Explicit,
                priority_class: OoePriorityClass::UserBlocking,
                cancellation_policy: OoeCancellationPolicy::StaleDrop,
                commit_policy: OoeCommitPolicy::CommitLatestOnly,
                thread_safety: OoeThreadSafety::MainThreadOnly,
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

    #[test]
    fn list_command_helper_returns_builtin_descriptors() {
        assert_eq!(list_builtin_plans_for_command().len(), 19);
    }

    #[test]
    fn list_host_command_helper_returns_builtin_host_descriptors() {
        assert_eq!(list_builtin_hosts_for_command().len(), 14);
    }

    #[test]
    fn get_command_helper_returns_known_plan() {
        let plan = get_builtin_plan_for_command(OoePlanId::from("plan.equation.solve"))
            .expect("known built-in plan should exist");

        assert_eq!(plan.id, OoePlanId::from("plan.equation.solve"));
    }

    #[test]
    fn get_host_command_helper_returns_known_host() {
        let host = get_builtin_host_for_command(OoeHostId::from("equation-runtime"))
            .expect("known built-in host should exist");

        assert_eq!(host.host_id, OoeHostId::from("equation-runtime"));
    }

    #[test]
    fn get_host_command_helper_returns_none_for_unknown_host() {
        assert!(get_builtin_host_for_command(OoeHostId::from("unknown-runtime")).is_none());
    }

    #[test]
    fn get_command_helper_returns_none_for_unknown_plan() {
        assert!(get_builtin_plan_for_command(OoePlanId::from("plan.unknown")).is_none());
    }

    #[test]
    fn validate_command_helper_reports_valid_plan() {
        let report = validate_plan_for_command(valid_plan());

        assert!(report.ok);
        assert!(report.errors.is_empty());
    }

    #[test]
    fn validate_command_helper_reports_invalid_plan_as_data() {
        let mut plan = valid_plan();
        plan.id = OoePlanId::from("");

        let report = validate_plan_for_command(plan);

        assert!(!report.ok);
        assert!(report.errors.contains(&OoeValidationError::EmptyPlanId));
    }

    #[test]
    fn validation_report_serde_round_trips() {
        let report = OoeValidationReport {
            ok: false,
            errors: vec![OoeValidationError::MissingTerminalResult],
        };
        let serialized = serde_json::to_string(&report).unwrap();
        let deserialized: OoeValidationReport = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized, report);
    }
}
