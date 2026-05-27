use super::{
    validate_ooe_plan, OoeCancellationPolicy, OoeCapabilityId, OoeCommitPolicy, OoeHostId,
    OoeNode, OoeNodeId, OoePhaseId, OoePlan, OoePlanId, OoePriorityClass, OoeResultStability,
    OoeTaskClass, OoeThreadSafety, OoeValidationError, OOE_SCHEMA_VERSION,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OoeBuiltinPlanCategory {
    Expression,
    Equation,
    Table,
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
    priority_class: OoePriorityClass,
}

const BUILTIN_PLAN_DEFINITIONS: &[OoeBuiltinPlanDefinition] = &[
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Expression,
        capability_id: "expression.evaluate",
        host_id: "expression-runtime",
        entrypoint: "runExpressionAction",
        description: "Evaluate a Calculate expression through the shared expression runtime.",
        priority_class: OoePriorityClass::UserBlocking,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Expression,
        capability_id: "expression.simplify",
        host_id: "expression-runtime",
        entrypoint: "runExpressionAction",
        description: "Simplify a Calculate expression through the shared expression runtime.",
        priority_class: OoePriorityClass::UserBlocking,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Expression,
        capability_id: "expression.factor",
        host_id: "expression-runtime",
        entrypoint: "runExpressionAction",
        description: "Factor a Calculate expression through the shared expression runtime.",
        priority_class: OoePriorityClass::UserBlocking,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Expression,
        capability_id: "expression.expand",
        host_id: "expression-runtime",
        entrypoint: "runExpressionAction",
        description: "Expand a Calculate expression through the shared expression runtime.",
        priority_class: OoePriorityClass::UserBlocking,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Equation,
        capability_id: "equation.solve",
        host_id: "equation-runtime",
        entrypoint: "runEquationMode",
        description: "Solve an Equation workflow through the guarded equation runtime.",
        priority_class: OoePriorityClass::UserBlocking,
    },
    OoeBuiltinPlanDefinition {
        category: OoeBuiltinPlanCategory::Table,
        capability_id: "table.build",
        host_id: "table-runtime",
        entrypoint: "buildTable",
        description: "Build a numeric table through the shared table runtime.",
        priority_class: OoePriorityClass::UserVisible,
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
    let priority_class = BUILTIN_PLAN_DEFINITIONS
        .iter()
        .find(|definition| definition.capability_id == descriptor.capability_id.as_str())
        .map(|definition| definition.priority_class.clone())
        .unwrap_or(OoePriorityClass::UserVisible);

    OoePlan {
        id: descriptor.plan_id.clone(),
        schema_version: OOE_SCHEMA_VERSION,
        nodes: vec![OoeNode {
            id: OoeNodeId::from(format!("node.{}", descriptor.capability_id)),
            capability_id: descriptor.capability_id.clone(),
            host_id: descriptor.host_id.clone(),
            phase_id: OoePhaseId::from(descriptor.capability_id.as_str()),
            task_class: OoeTaskClass::Explicit,
            priority_class,
            cancellation_policy: OoeCancellationPolicy::StaleDrop,
            commit_policy: OoeCommitPolicy::CommitLatestOnly,
            thread_safety: OoeThreadSafety::MainThreadOnly,
            result_stability: OoeResultStability::Draft,
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
        "table-runtime",
    ];

    #[test]
    fn validates_all_builtin_plans() {
        assert!(validate_builtin_ooe_plans().is_ok());
    }

    #[test]
    fn registers_exactly_current_kernel_capabilities() {
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
                "equation.solve",
                "table.build",
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
            let node = plan.nodes.first().expect("builtin plan should have one node");

            assert_eq!(plan.schema_version, OOE_SCHEMA_VERSION);
            assert_eq!(plan.nodes.len(), 1);
            assert_eq!(node.id.as_str(), format!("node.{}", descriptor.capability_id));
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
            let node = plan.nodes.first().expect("builtin plan should have one node");
            assert!(KNOWN_HOST_IDS.contains(&node.host_id.as_str()));
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
        for plan in list_builtin_ooe_plans() {
            let node = plan.nodes.first().expect("builtin plan should have one node");

            assert_eq!(node.task_class, OoeTaskClass::Explicit);
            assert_eq!(node.cancellation_policy, OoeCancellationPolicy::StaleDrop);
            assert_eq!(node.commit_policy, OoeCommitPolicy::CommitLatestOnly);
            assert_eq!(node.thread_safety, OoeThreadSafety::MainThreadOnly);
            assert_eq!(node.result_stability, OoeResultStability::Draft);

            if node.capability_id.as_str() == "table.build" {
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
