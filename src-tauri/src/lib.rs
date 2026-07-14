pub mod notebook_storage;
pub mod ooe;

use mathexpr::{Executable, Expression};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, path::PathBuf, sync::Mutex};
use tauri::{Manager, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
enum ModeId {
    Calculate,
    Equation,
    Matrix,
    Vector,
    Table,
    Guide,
    Calculus,
    Trigonometry,
    Statistics,
    Geometry,
    Labs,
}

impl Default for ModeId {
    fn default() -> Self {
        Self::Calculate
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
enum AngleUnit {
    Deg,
    Rad,
    Grad,
}

impl Default for AngleUnit {
    fn default() -> Self {
        Self::Deg
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
enum OutputStyle {
    Exact,
    Decimal,
    Both,
}

impl Default for OutputStyle {
    fn default() -> Self {
        Self::Both
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
enum MathNotationDisplay {
    Rendered,
    PlainText,
    Latex,
}

impl Default for MathNotationDisplay {
    fn default() -> Self {
        Self::Rendered
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct Settings {
    language_code: String,
    angle_unit: AngleUnit,
    output_style: OutputStyle,
    equation_answer_mode: String,
    equation_domain_intent: String,
    complex_exact_form: String,
    math_notation_display: MathNotationDisplay,
    history_enabled: bool,
    calculator_memory_enabled: bool,
    calculator_memory_autosave_mode: String,
    calculator_memory_autosave_interval_seconds: i32,
    auto_switch_to_equation: bool,
    ui_scale: i32,
    math_scale: i32,
    result_scale: i32,
    high_contrast: bool,
    symbolic_display_mode: String,
    flatten_nested_roots_when_safe: bool,
    approx_digits: i32,
    numeric_notation_mode: String,
    scientific_notation_style: String,
    detailed_facts_enabled: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            language_code: "en".into(),
            angle_unit: AngleUnit::Deg,
            output_style: OutputStyle::Both,
            equation_answer_mode: "exact".into(),
            equation_domain_intent: "real".into(),
            complex_exact_form: "rectangular".into(),
            math_notation_display: MathNotationDisplay::Rendered,
            history_enabled: true,
            calculator_memory_enabled: true,
            calculator_memory_autosave_mode: "settled".into(),
            calculator_memory_autosave_interval_seconds: 20,
            auto_switch_to_equation: false,
            ui_scale: 100,
            math_scale: 100,
            result_scale: 100,
            high_contrast: false,
            symbolic_display_mode: "auto".into(),
            flatten_nested_roots_when_safe: true,
            approx_digits: 6,
            numeric_notation_mode: "decimal".into(),
            scientific_notation_style: "times10".into(),
            detailed_facts_enabled: false,
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsPatch {
    language_code: Option<String>,
    angle_unit: Option<AngleUnit>,
    output_style: Option<OutputStyle>,
    equation_answer_mode: Option<String>,
    equation_domain_intent: Option<String>,
    complex_exact_form: Option<String>,
    math_notation_display: Option<MathNotationDisplay>,
    history_enabled: Option<bool>,
    calculator_memory_enabled: Option<bool>,
    calculator_memory_autosave_mode: Option<String>,
    calculator_memory_autosave_interval_seconds: Option<i32>,
    auto_switch_to_equation: Option<bool>,
    ui_scale: Option<i32>,
    math_scale: Option<i32>,
    result_scale: Option<i32>,
    high_contrast: Option<bool>,
    symbolic_display_mode: Option<String>,
    flatten_nested_roots_when_safe: Option<bool>,
    approx_digits: Option<i32>,
    numeric_notation_mode: Option<String>,
    scientific_notation_style: Option<String>,
    detailed_facts_enabled: Option<bool>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MathDocument {
    latex: String,
    math_json: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EvaluateRequest {
    mode: ModeId,
    document: MathDocument,
    angle_unit: AngleUnit,
    output_style: OutputStyle,
    variables: HashMap<String, String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EvaluateResponse {
    exact_latex: Option<String>,
    approx_text: Option<String>,
    normalized_math_json: Option<serde_json::Value>,
    warnings: Vec<String>,
    error: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MenuNode {
    id: String,
    label: String,
    hotkey: Option<String>,
    children: Option<Vec<MenuNode>>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LauncherLaunchTarget {
    mode: ModeId,
    calculate_screen: Option<String>,
    equation_screen: Option<String>,
    advanced_calc_screen: Option<String>,
    trig_screen: Option<String>,
    statistics_screen: Option<String>,
    geometry_screen: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LauncherAppEntry {
    id: String,
    label: String,
    description: String,
    hotkey: String,
    launch: LauncherLaunchTarget,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LauncherCategory {
    id: String,
    label: String,
    description: String,
    hotkey: String,
    entries: Vec<LauncherAppEntry>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredVariableValue {
    name: String,
    value_latex: String,
    numeric_value: f64,
    updated_at: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MatrixRequest {
    operation: String,
    matrix_a: Vec<Vec<f64>>,
    matrix_b: Option<Vec<Vec<f64>>>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MatrixResponse {
    result_latex: Option<String>,
    approx_text: Option<String>,
    warnings: Vec<String>,
    error: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VectorRequest {
    operation: String,
    vector_a: Vec<f64>,
    vector_b: Option<Vec<f64>>,
    angle_unit: AngleUnit,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VectorResponse {
    result_latex: Option<String>,
    approx_text: Option<String>,
    warnings: Vec<String>,
    error: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableRow {
    x: String,
    primary: String,
    secondary: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableRequest {
    primary_expression: MathDocument,
    secondary_expression: Option<MathDocument>,
    variable: String,
    start: f64,
    end: f64,
    step: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableResponse {
    headers: Vec<String>,
    rows: Vec<TableRow>,
    warnings: Vec<String>,
    error: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NumericOdeRequest {
    expression: String,
    x0: f64,
    y0: f64,
    x_end: f64,
    step: f64,
    method: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NumericOdePoint {
    x: f64,
    y: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NumericOdeResponse {
    final_x: f64,
    final_y: f64,
    samples: Vec<NumericOdePoint>,
    warnings: Vec<String>,
    error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModeState {
    active_mode: ModeId,
    menu: Vec<MenuNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppBootstrap {
    current_mode: ModeId,
    settings: Settings,
    mode_tree: Vec<MenuNode>,
    history_count: usize,
    variable_memory: Vec<StoredVariableValue>,
    version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct PersistedState {
    current_mode: ModeId,
    settings: Settings,
    history: Vec<serde_json::Value>,
    variable_memory: Vec<StoredVariableValue>,
    calculator_memory: Option<serde_json::Value>,
}

impl Default for PersistedState {
    fn default() -> Self {
        Self {
            current_mode: ModeId::Calculate,
            settings: Settings::default(),
            history: Vec::new(),
            variable_memory: Vec::new(),
            calculator_memory: None,
        }
    }
}

const HISTORY_ENTRY_LIMIT: usize = 80;
const HISTORY_ENTRY_MAX_SERIALIZED_BYTES: usize = 2_000_000;

fn history_envelope_string<'a>(
    entry: &'a serde_json::Value,
    field: &str,
) -> Result<&'a str, String> {
    entry
        .as_object()
        .ok_or_else(|| "History entry must be a JSON object.".to_string())?
        .get(field)
        .and_then(serde_json::Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| format!("History entry requires a non-empty {field}."))
}

fn validate_history_envelope(
    entry: &serde_json::Value,
    enforce_append_size: bool,
) -> Result<(), String> {
    history_envelope_string(entry, "id")?;
    let mode = history_envelope_string(entry, "mode")?;
    if !matches!(
        mode,
        "calculate"
            | "equation"
            | "matrix"
            | "vector"
            | "table"
            | "guide"
            | "calculus"
            | "trigonometry"
            | "statistics"
            | "geometry"
            | "labs"
    ) {
        return Err("History entry mode is not supported.".into());
    }
    history_envelope_string(entry, "inputLatex")?;
    history_envelope_string(entry, "timestamp")?;

    if enforce_append_size {
        let serialized_bytes = serde_json::to_vec(entry)
            .map_err(|error| format!("History entry could not be serialized: {error}"))?
            .len();
        if serialized_bytes > HISTORY_ENTRY_MAX_SERIALIZED_BYTES {
            return Err(format!(
                "History entry exceeds the {HISTORY_ENTRY_MAX_SERIALIZED_BYTES}-byte append limit."
            ));
        }
    }

    Ok(())
}

fn history_result_document_version(entry: &serde_json::Value) -> Option<u64> {
    entry
        .get("resultDocument")
        .and_then(serde_json::Value::as_object)
        .and_then(|document| document.get("version"))
        .and_then(serde_json::Value::as_u64)
}

fn is_future_history_value(entry: &serde_json::Value) -> bool {
    history_result_document_version(entry).is_some_and(|version| version > 1)
}

fn validate_current_history_append(entry: &serde_json::Value) -> Result<(), String> {
    validate_history_envelope(entry, true)?;
    if history_result_document_version(entry) != Some(1) {
        return Err("History append requires a version-1 canonical result document.".into());
    }
    let object = entry
        .as_object()
        .ok_or_else(|| "History entry must be a JSON object.".to_string())?;
    for field in [
        "resolvedInputLatex",
        "resultLatex",
        "exactSupplementLatex",
        "approxText",
        "detailSections",
        "systemReadback",
        "answerDomain",
        "solutionKind",
        "variableSubstitutions",
        "resultDocumentOmissionReason",
    ] {
        if object.contains_key(field) {
            return Err(format!("History append contains removed legacy field {field}."));
        }
    }
    Ok(())
}

fn preserve_history_envelopes(history: Vec<serde_json::Value>) -> Vec<serde_json::Value> {
    history
        .into_iter()
        .filter(|entry| validate_history_envelope(entry, false).is_ok())
        .collect()
}

fn sanitize_history_values(history: Vec<serde_json::Value>) -> Vec<serde_json::Value> {
    let mut current_count = 0;
    let mut retained = preserve_history_envelopes(history)
        .into_iter()
        .rev()
        .filter(|entry| {
            if is_future_history_value(entry) {
                return true;
            }
            current_count += 1;
            current_count <= HISTORY_ENTRY_LIMIT
        })
        .collect::<Vec<_>>();
    retained.reverse();
    retained
}

fn sanitize_language_code(language_code: String) -> String {
    if language_code == "en" {
        language_code
    } else {
        "en".into()
    }
}

fn sanitize_settings(settings: &mut Settings) {
    if settings.language_code != "en" {
        settings.language_code = "en".into();
    }
    if !matches!(
        settings.equation_answer_mode.as_str(),
        "exact" | "isolate"
    ) {
        settings.equation_answer_mode = "exact".into();
    }
    if !matches!(settings.equation_domain_intent.as_str(), "real" | "complex") {
        settings.equation_domain_intent = "real".into();
    }
    if !matches!(
        settings.complex_exact_form.as_str(),
        "rectangular" | "polar" | "cis"
    ) {
        settings.complex_exact_form = "rectangular".into();
    }
    if settings.calculator_memory_autosave_mode != "interval" {
        settings.calculator_memory_autosave_mode = "settled".into();
    }
    settings.calculator_memory_autosave_interval_seconds =
        settings.calculator_memory_autosave_interval_seconds.max(20);
    settings.approx_digits = settings.approx_digits.clamp(0, 20);
}

struct AppState {
    storage_dir: PathBuf,
    state: Mutex<PersistedState>,
}

impl AppState {
    fn load(storage_dir: PathBuf) -> Result<Self, String> {
        fs::create_dir_all(&storage_dir).map_err(|error| error.to_string())?;
        let file_path = storage_dir.join("calculator-state.json");
        let mut persisted = match fs::read_to_string(&file_path) {
            Ok(contents) => serde_json::from_str::<PersistedState>(&contents).unwrap_or_default(),
            Err(_) => PersistedState::default(),
        };
        persisted.history = preserve_history_envelopes(persisted.history);
        sanitize_settings(&mut persisted.settings);

        Ok(Self {
            storage_dir,
            state: Mutex::new(persisted),
        })
    }

    fn file_path(&self) -> PathBuf {
        self.storage_dir.join("calculator-state.json")
    }

    fn save_snapshot(&self, snapshot: &PersistedState) -> Result<(), String> {
        let contents = serde_json::to_string_pretty(snapshot).map_err(|error| error.to_string())?;
        let temporary_path = self.storage_dir.join("calculator-state.json.tmp");
        fs::write(&temporary_path, contents).map_err(|error| error.to_string())?;
        fs::rename(temporary_path, self.file_path()).map_err(|error| error.to_string())
    }
}

fn append_history_value(entry: serde_json::Value, state: &AppState) -> Result<(), String> {
    validate_current_history_append(&entry)?;
    let mut snapshot = state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?;
    snapshot.history.push(entry);
    snapshot.history = sanitize_history_values(std::mem::take(&mut snapshot.history));
    let clone = snapshot.clone();
    drop(snapshot);
    state.save_snapshot(&clone)
}

fn load_history_values(state: &AppState) -> Result<Vec<serde_json::Value>, String> {
    let history = state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?
        .history
        .clone();
    Ok(preserve_history_envelopes(history))
}

fn replace_history_values(
    entries: Vec<serde_json::Value>,
    state: &AppState,
) -> Result<(), String> {
    for entry in &entries {
        validate_history_envelope(entry, false)?;
        if !is_future_history_value(entry) {
            validate_current_history_append(entry)?;
        }
    }
    let mut snapshot = state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?;
    snapshot.history = sanitize_history_values(entries);
    let clone = snapshot.clone();
    drop(snapshot);
    state.save_snapshot(&clone)
}

fn clear_history_values(state: &AppState) -> Result<(), String> {
    let mut snapshot = state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?;
    snapshot.history.retain(is_future_history_value);
    let clone = snapshot.clone();
    drop(snapshot);
    state.save_snapshot(&clone)
}

fn delete_history_value(id: &str, state: &AppState) -> Result<(), String> {
    let mut snapshot = state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?;
    snapshot
        .history
        .retain(|entry| entry.get("id").and_then(serde_json::Value::as_str) != Some(id));
    let clone = snapshot.clone();
    drop(snapshot);
    state.save_snapshot(&clone)
}

fn save_calculator_memory_value(
    calculator_memory: serde_json::Value,
    state: &AppState,
) -> Result<Option<serde_json::Value>, String> {
    let mut persisted = state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?;
    persisted.calculator_memory = Some(calculator_memory);
    let saved = persisted.calculator_memory.clone();
    let clone = persisted.clone();
    drop(persisted);
    state.save_snapshot(&clone)?;
    Ok(saved)
}

fn load_calculator_memory_value(state: &AppState) -> Result<Option<serde_json::Value>, String> {
    Ok(state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?
        .calculator_memory
        .clone())
}

fn menu_children(items: &[(&str, &str, &str)]) -> Vec<MenuNode> {
    items
        .iter()
        .map(|(id, label, hotkey)| MenuNode {
            id: (*id).to_string(),
            label: (*label).to_string(),
            hotkey: Some((*hotkey).to_string()),
            children: None,
        })
        .collect()
}

fn mode_tree() -> Vec<MenuNode> {
    vec![
        MenuNode {
            id: "calculate".into(),
            label: "Calculate".into(),
            hotkey: Some("Ctrl+1".into()),
            children: Some(menu_children(&[
                ("simplify", "Simplify", "F1"),
                ("factor", "Factor", "F2"),
                ("expand", "Expand", "F3"),
                ("numeric", "Numeric", "F4"),
                ("clear", "Clear", "F5"),
                ("history", "History", "F6"),
            ])),
        },
        MenuNode {
            id: "equation".into(),
            label: "Equation".into(),
            hotkey: Some("Ctrl+2".into()),
            children: Some(menu_children(&[
                ("solve", "Solve", "F1"),
                ("symbolic", "Symbolic", "F2"),
                ("linear2", "2x2", "F3"),
                ("linear3", "3x3", "F4"),
                ("clear", "Clear", "F5"),
                ("history", "History", "F6"),
            ])),
        },
        MenuNode {
            id: "matrix".into(),
            label: "Matrix".into(),
            hotkey: Some("Ctrl+3".into()),
            children: Some(menu_children(&[
                ("add", "A+B", "F1"),
                ("subtract", "A-B", "F2"),
                ("multiply", "A×B", "F3"),
                ("det", "det(A)", "F4"),
                ("inverse", "A⁻¹", "F5"),
                ("transpose", "Aᵀ", "F6"),
            ])),
        },
        MenuNode {
            id: "vector".into(),
            label: "Vector".into(),
            hotkey: Some("Ctrl+4".into()),
            children: Some(menu_children(&[
                ("dot", "Dot", "F1"),
                ("cross", "Cross", "F2"),
                ("norm", "‖A‖", "F3"),
                ("angle", "∠", "F4"),
                ("add", "A+B", "F5"),
                ("subtract", "A-B", "F6"),
            ])),
        },
        MenuNode {
            id: "table".into(),
            label: "Table".into(),
            hotkey: Some("Ctrl+5".into()),
            children: Some(menu_children(&[
                ("build", "Build", "F1"),
                ("toggleSecondary", "g(x)", "F2"),
                ("clear", "Clear", "F3"),
                ("history", "History", "F4"),
            ])),
        },
        MenuNode {
            id: "guide".into(),
            label: "Guide".into(),
            hotkey: Some("Ctrl+6".into()),
            children: Some(menu_children(&[
                ("open", "Open", "F1"),
                ("search", "Search", "F2"),
                ("symbols", "Symbols", "F3"),
                ("modes", "Modes", "F4"),
                ("back", "Back", "F5"),
                ("exit", "Exit", "F6"),
            ])),
        },
        MenuNode {
            id: "calculus".into(),
            label: "Calculus".into(),
            hotkey: Some("Ctrl+8".into()),
            children: Some(menu_children(&[
                ("open", "Open", "F1"),
                ("guide", "Guide", "F2"),
                ("back", "Back", "F5"),
                ("exit", "Exit", "F6"),
            ])),
        },
        MenuNode {
            id: "trigonometry".into(),
            label: "Trigonometry".into(),
            hotkey: Some("Ctrl+9".into()),
            children: Some(menu_children(&[
                ("open", "Open", "F1"),
                ("guide", "Guide", "F2"),
                ("back", "Back", "F5"),
                ("exit", "Exit", "F6"),
            ])),
        },
        MenuNode {
            id: "statistics".into(),
            label: "Statistics".into(),
            hotkey: Some("Ctrl+Shift+1".into()),
            children: Some(menu_children(&[
                ("open", "Open", "F1"),
                ("guide", "Guide", "F2"),
                ("back", "Back", "F5"),
                ("exit", "Exit", "F6"),
            ])),
        },
        MenuNode {
            id: "geometry".into(),
            label: "Geometry".into(),
            hotkey: Some("Ctrl+Shift+2".into()),
            children: Some(menu_children(&[
                ("open", "Open", "F1"),
                ("guide", "Guide", "F2"),
                ("back", "Back", "F5"),
                ("exit", "Exit", "F6"),
            ])),
        },
        MenuNode {
            id: "labs".into(),
            label: "Labs".into(),
            hotkey: Some("Dev flag".into()),
            children: Some(menu_children(&[
                ("open", "Open", "F1"),
                ("back", "Back", "F5"),
                ("exit", "Exit", "F6"),
            ])),
        },
    ]
}

fn launcher_categories() -> Vec<LauncherCategory> {
    vec![
        LauncherCategory {
            id: "core".into(),
            label: "Core".into(),
            description: "Core calculator and equation work".into(),
            hotkey: "1".into(),
            entries: vec![
                LauncherAppEntry {
                    id: "calculate".into(),
                    label: "Calculate".into(),
                    description: "Exact and numeric textbook calculations".into(),
                    hotkey: "1".into(),
                    launch: LauncherLaunchTarget {
                        mode: ModeId::Calculate,
                        ..LauncherLaunchTarget::default()
                    },
                },
                LauncherAppEntry {
                    id: "equation".into(),
                    label: "Equation".into(),
                    description: "Symbolic, polynomial, and simultaneous systems".into(),
                    hotkey: "2".into(),
                    launch: LauncherLaunchTarget {
                        mode: ModeId::Equation,
                        equation_screen: Some("home".into()),
                        ..LauncherLaunchTarget::default()
                    },
                },
                LauncherAppEntry {
                    id: "table".into(),
                    label: "Table".into(),
                    description: "Function tables over a range".into(),
                    hotkey: "3".into(),
                    launch: LauncherLaunchTarget {
                        mode: ModeId::Table,
                        ..LauncherLaunchTarget::default()
                    },
                },
            ],
        },
        LauncherCategory {
            id: "linear".into(),
            label: "Linear".into(),
            description: "Matrix and vector workflows".into(),
            hotkey: "2".into(),
            entries: vec![
                LauncherAppEntry {
                    id: "matrix".into(),
                    label: "Matrix".into(),
                    description: "Matrix operations and transforms".into(),
                    hotkey: "1".into(),
                    launch: LauncherLaunchTarget {
                        mode: ModeId::Matrix,
                        ..LauncherLaunchTarget::default()
                    },
                },
                LauncherAppEntry {
                    id: "vector".into(),
                    label: "Vector".into(),
                    description: "Vector operations and angles".into(),
                    hotkey: "2".into(),
                    launch: LauncherLaunchTarget {
                        mode: ModeId::Vector,
                        ..LauncherLaunchTarget::default()
                    },
                },
            ],
        },
        LauncherCategory {
            id: "calculus".into(),
            label: "Calculus".into(),
            description: "Derivatives, integrals, limits, series, ODEs, and partials".into(),
            hotkey: "3".into(),
            entries: vec![
                LauncherAppEntry {
                    id: "calculus".into(),
                    label: "Calculus".into(),
                    description: "Unified guided calculus workspace".into(),
                    hotkey: "1".into(),
                    launch: LauncherLaunchTarget {
                        mode: ModeId::Calculus,
                        advanced_calc_screen: Some("home".into()),
                        ..LauncherLaunchTarget::default()
                    },
                },
            ],
        },
        LauncherCategory {
            id: "shapeMath".into(),
            label: "Shape Math".into(),
            description: "Trig and geometry workflows".into(),
            hotkey: "4".into(),
            entries: vec![
                LauncherAppEntry {
                    id: "trigonometry".into(),
                    label: "Trigonometry".into(),
                    description: "Trig functions, identities, equations, and triangle solvers"
                        .into(),
                    hotkey: "1".into(),
                    launch: LauncherLaunchTarget {
                        mode: ModeId::Trigonometry,
                        trig_screen: Some("home".into()),
                        ..LauncherLaunchTarget::default()
                    },
                },
                LauncherAppEntry {
                    id: "geometry".into(),
                    label: "Geometry".into(),
                    description: "Formula-first shapes, circles, triangles, and coordinate tools"
                        .into(),
                    hotkey: "2".into(),
                    launch: LauncherLaunchTarget {
                        mode: ModeId::Geometry,
                        geometry_screen: Some("home".into()),
                        ..LauncherLaunchTarget::default()
                    },
                },
            ],
        },
        LauncherCategory {
            id: "data".into(),
            label: "Data".into(),
            description: "Dataset and probability workflows".into(),
            hotkey: "5".into(),
            entries: vec![LauncherAppEntry {
                id: "statistics".into(),
                label: "Statistics".into(),
                description:
                    "Dataset entry, descriptive statistics, probability, and regression basics"
                        .into(),
                hotkey: "1".into(),
                launch: LauncherLaunchTarget {
                    mode: ModeId::Statistics,
                    statistics_screen: Some("home".into()),
                    ..LauncherLaunchTarget::default()
                },
            }],
        },
    ]
}

fn menu_for_mode(mode: &ModeId) -> Vec<MenuNode> {
    let id = match mode {
        ModeId::Calculate => "calculate",
        ModeId::Equation => "equation",
        ModeId::Matrix => "matrix",
        ModeId::Vector => "vector",
        ModeId::Table => "table",
        ModeId::Guide => "guide",
        ModeId::Calculus => "calculus",
        ModeId::Trigonometry => "trigonometry",
        ModeId::Statistics => "statistics",
        ModeId::Geometry => "geometry",
        ModeId::Labs => "labs",
    };

    mode_tree()
        .into_iter()
        .find(|node| node.id == id)
        .and_then(|node| node.children)
        .unwrap_or_default()
}

fn frontend_engine_warning() -> Vec<String> {
    vec![
    "Version 1 uses the TypeScript symbolic adapter for CAS operations while Rust owns persistence and shell state."
      .into(),
  ]
}

fn compile_ode_expression(expression: &str) -> Result<Executable, String> {
    Expression::parse(expression)
        .map_err(|error| error.to_string())?
        .compile(&["x", "y"])
        .map_err(|error| error.to_string())
}

fn eval_ode_expression(expr: &Executable, x: f64, y: f64) -> Result<f64, String> {
    let value = expr.eval(&[x, y]).map_err(|error| error.to_string())?;
    if value.is_finite() {
        Ok(value)
    } else {
        Err("The numeric ODE solver encountered a non-finite step.".into())
    }
}

fn rk4_step(expr: &Executable, x: f64, y: f64, h: f64) -> Result<f64, String> {
    let k1 = eval_ode_expression(expr, x, y)?;
    let k2 = eval_ode_expression(expr, x + h / 2.0, y + (h * k1) / 2.0)?;
    let k3 = eval_ode_expression(expr, x + h / 2.0, y + (h * k2) / 2.0)?;
    let k4 = eval_ode_expression(expr, x + h, y + h * k3)?;
    Ok(y + (h / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4))
}

fn solve_ode_rk4(
    request: &NumericOdeRequest,
    expr: &Executable,
) -> Result<NumericOdeResponse, String> {
    let direction = if request.x_end >= request.x0 {
        1.0
    } else {
        -1.0
    };
    let step = request.step.abs() * direction;
    let mut x = request.x0;
    let mut y = request.y0;
    let mut samples = vec![NumericOdePoint { x, y }];

    while (direction > 0.0 && x < request.x_end - 1e-12)
        || (direction < 0.0 && x > request.x_end + 1e-12)
    {
        let h = if (request.x_end - x).abs() < step.abs() {
            request.x_end - x
        } else {
            step
        };
        y = rk4_step(expr, x, y, h)?;
        x += h;
        samples.push(NumericOdePoint { x, y });
    }

    Ok(NumericOdeResponse {
        final_x: x,
        final_y: y,
        samples,
        warnings: Vec::new(),
        error: None,
    })
}

fn solve_ode_rk45(
    request: &NumericOdeRequest,
    expr: &Executable,
) -> Result<NumericOdeResponse, String> {
    let direction = if request.x_end >= request.x0 {
        1.0
    } else {
        -1.0
    };
    let tolerance = 1e-6;
    let mut h = request
        .step
        .abs()
        .min((request.x_end - request.x0).abs())
        .max(1e-6)
        * direction;
    let mut x = request.x0;
    let mut y = request.y0;
    let mut samples = vec![NumericOdePoint { x, y }];
    let mut warnings = Vec::new();
    let mut guard = 0usize;

    while ((direction > 0.0 && x < request.x_end - 1e-12)
        || (direction < 0.0 && x > request.x_end + 1e-12))
        && guard < 100_000
    {
        guard += 1;
        let remaining = request.x_end - x;
        if remaining.abs() < h.abs() {
            h = remaining;
        }

        let y_full = rk4_step(expr, x, y, h)?;
        let y_half = rk4_step(expr, x, y, h / 2.0)?;
        let y_half_twice = rk4_step(expr, x + h / 2.0, y_half, h / 2.0)?;
        let error = (y_half_twice - y_full).abs();
        let scale = y.abs().max(y_half_twice.abs()).max(1.0);

        if error <= tolerance * scale || h.abs() <= 1e-8 {
            x += h;
            y = y_half_twice;
            samples.push(NumericOdePoint { x, y });
            let growth = if error == 0.0 {
                2.0
            } else {
                (0.9 * (tolerance * scale / error).powf(0.2)).clamp(0.5, 2.0)
            };
            h *= growth;
        } else {
            h *= 0.5;
        }
    }

    if guard >= 100_000 {
        warnings.push("Adaptive ODE solver reached its step limit.".into());
    }

    Ok(NumericOdeResponse {
        final_x: x,
        final_y: y,
        samples,
        warnings,
        error: None,
    })
}

fn solve_numeric_ode(request: NumericOdeRequest) -> Result<NumericOdeResponse, String> {
    if request.expression.trim().is_empty() {
        return Err(
            "Numeric IVP requires a supported RHS expression and numeric initial values.".into(),
        );
    }
    if !request.x0.is_finite()
        || !request.y0.is_finite()
        || !request.x_end.is_finite()
        || !request.step.is_finite()
        || request.step <= 0.0
    {
        return Err(
            "Numeric IVP requires a supported RHS expression and numeric initial values.".into(),
        );
    }

    let expr = compile_ode_expression(&request.expression)?;
    match request.method.as_str() {
        "rk4" => solve_ode_rk4(&request, &expr),
        "rk45" => solve_ode_rk45(&request, &expr),
        _ => Err("Unsupported ODE method.".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn unique_test_storage_dir(label: &str) -> PathBuf {
        let nonce = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time should follow the Unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("calcwiz-{label}-{}-{nonce}", std::process::id()))
    }

    #[test]
    fn compiles_supported_numeric_ode_math_surface() {
        let expr = compile_ode_expression(
            "sin(x)+cos(y)+tan(x)+exp(x)+pow(x,2)+ln(abs(y)+1)+sqrt(abs(x))+log(abs(y)+1)",
        )
        .expect("supported ODE expression should compile");

        let value = eval_ode_expression(&expr, 0.5, -1.25).expect("expression should evaluate");
        assert!(value.is_finite());
    }

    #[test]
    fn rejects_non_finite_numeric_ode_steps() {
        let expr = compile_ode_expression("sqrt(-1)").expect("expression should compile");
        let error = eval_ode_expression(&expr, 0.0, 0.0).expect_err("NaN step should fail");
        assert_eq!(
            error,
            "The numeric ODE solver encountered a non-finite step."
        );
    }

    #[test]
    fn solves_simple_numeric_ode_with_compiled_expression() {
        let response = solve_numeric_ode(NumericOdeRequest {
            expression: "y".into(),
            x0: 0.0,
            y0: 1.0,
            x_end: 1.0,
            step: 0.1,
            method: "rk4".into(),
        })
        .expect("simple IVP should solve");

        assert_eq!(response.samples.first().map(|point| point.x), Some(0.0));
        let final_x = response
            .samples
            .last()
            .map(|point| point.x)
            .expect("solver should emit at least one sample");
        assert!((final_x - 1.0).abs() < 1e-12);
        assert!(response.final_y.is_finite());
        assert!(response.final_y > 2.0 && response.final_y < 3.0);
    }

    #[test]
    fn defaults_and_sanitizes_equation_domain_intent_settings() {
        let mut settings = Settings::default();
        assert_eq!(settings.language_code, "en");
        assert_eq!(settings.equation_answer_mode, "exact");
        assert_eq!(settings.equation_domain_intent, "real");
        assert_eq!(settings.complex_exact_form, "rectangular");

        settings.equation_answer_mode = "isolate".into();
        settings.equation_domain_intent = "complex".into();
        settings.complex_exact_form = "polar".into();
        sanitize_settings(&mut settings);
        assert_eq!(settings.equation_answer_mode, "isolate");
        assert_eq!(settings.equation_domain_intent, "complex");
        assert_eq!(settings.complex_exact_form, "polar");

        settings.complex_exact_form = "cis".into();
        sanitize_settings(&mut settings);
        assert_eq!(settings.complex_exact_form, "cis");

        settings.equation_answer_mode = "approximate".into();
        settings.equation_domain_intent = "atomic-complex".into();
        settings.complex_exact_form = "auto".into();
        settings.language_code = "ar".into();
        sanitize_settings(&mut settings);
        assert_eq!(settings.language_code, "en");
        assert_eq!(settings.equation_answer_mode, "exact");
        assert_eq!(settings.equation_domain_intent, "real");
        assert_eq!(settings.complex_exact_form, "rectangular");

        assert_eq!(sanitize_language_code("en".into()), "en");
        assert_eq!(sanitize_language_code("fr".into()), "en");
    }

    #[test]
    fn preserves_history_extensions_across_native_and_calculator_memory_restart() {
        let storage_dir = unique_test_storage_dir("history-parity");
        let entry = serde_json::json!({
            "id": "history.rich.1",
            "mode": "equation",
            "inputLatex": "x+y=3",
            "calculusScreen": "finiteLimit",
            "calculusSeed": {"bodyLatex": "1/x", "target": "0"},
            "trigSeed": {
                "screen": "periodPhase",
                "request": {"kind": "periodPhase", "expressionLatex": "sin(x)", "variable": "x"}
            },
            "matrixSeed": {"operation": "rankA", "matrixA": [[1.0]]},
            "vectorSeed": {"operation": "normA", "vectorA": [1.0], "angleUnit": "rad"},
            "equationScreen": "symbolic",
            "equationSeed": {"screen": "symbolic", "equationLatex": "x+y=3"},
            "runtimeElapsedMs": 17,
            "replaySnapshot": {"version": 1, "futureReplayField": {"kept": true}},
            "resultDocument": {
                "version": 1,
                "outcomeKind": "success",
                "title": "Solved system",
                "primaryMath": {"canonicalLatex": "(x,y)=(1,2)"},
                "details": [{
                    "title": "Verification",
                    "lines": [[{"kind": "math", "math": {"canonicalLatex": "x+y=3"}}]]
                }],
                "systemReadback": {
                    "variables": [{"canonicalLatex": "x"}, {"canonicalLatex": "y"}],
                    "rows": [{"values": [
                        {"canonicalLatex": "1"},
                        {"canonicalLatex": "2"}
                    ]}],
                    "source": "linear-system"
                },
                "warnings": []
            },
            "futureHistoryExtension": {"version": 2, "payload": [1, 2, 3]},
            "timestamp": "2026-07-11T00:00:00.000Z"
        });
        let calculator_memory = serde_json::json!({
            "version": 1,
            "history": [entry.clone()],
            "futureMemoryExtension": {"version": 3}
        });

        {
            let state = AppState::load(storage_dir.clone()).expect("state should initialize");
            append_history_value(entry.clone(), &state).expect("history should append");
            save_calculator_memory_value(calculator_memory.clone(), &state)
                .expect("calculator memory should save");
        }

        {
            let restarted = AppState::load(storage_dir.clone()).expect("state should restart");
            assert_eq!(
                load_history_values(&restarted).unwrap(),
                vec![entry.clone()]
            );
            assert_eq!(
                load_calculator_memory_value(&restarted).unwrap(),
                Some(calculator_memory)
            );
            delete_history_value("history.rich.1", &restarted)
                .expect("history deletion should persist");
        }

        let restarted = AppState::load(storage_dir.clone()).expect("state should restart again");
        assert!(load_history_values(&restarted).unwrap().is_empty());
        fs::remove_dir_all(storage_dir).expect("temporary state should be removed");
    }

    #[test]
    fn rejects_invalid_or_oversized_history_appends() {
        let storage_dir = unique_test_storage_dir("history-validation");
        let state = AppState::load(storage_dir.clone()).expect("state should initialize");

        let invalid = serde_json::json!({
            "id": "history.invalid",
            "mode": "retired-mode",
            "inputLatex": "1+1",
            "timestamp": "2026-07-11T00:00:00.000Z"
        });
        assert!(append_history_value(invalid, &state).is_err());

        let oversized = serde_json::json!({
            "id": "history.oversized",
            "mode": "calculate",
            "inputLatex": "1+1",
            "futurePayload": "x".repeat(HISTORY_ENTRY_MAX_SERIALIZED_BYTES),
            "timestamp": "2026-07-11T00:00:00.000Z"
        });
        let error =
            append_history_value(oversized, &state).expect_err("oversized history should fail");
        assert!(error.contains("append limit"));
        assert!(load_history_values(&state).unwrap().is_empty());
        fs::remove_dir_all(storage_dir).expect("temporary state should be removed");
    }

    #[test]
    fn sanitizes_sparse_history_without_stripping_extensions_and_keeps_newest_eighty() {
        let mut history = vec![serde_json::json!({"id": "invalid"})];
        history.extend((0..85).map(|index| {
            serde_json::json!({
                "id": format!("history.{index}"),
                "mode": "calculate",
                "inputLatex": format!("{index}+1"),
                "resultDocument": {
                    "version": 1,
                    "outcomeKind": "success",
                    "title": "Result",
                    "primaryMath": {"canonicalLatex": format!("{}", index + 1)},
                    "warnings": []
                },
                "futureExtension": {"index": index},
                "timestamp": "2026-07-11T00:00:00.000Z"
            })
        }));

        let sanitized = sanitize_history_values(history);
        assert_eq!(sanitized.len(), HISTORY_ENTRY_LIMIT);
        assert_eq!(sanitized[0]["id"], "history.5");
        assert_eq!(sanitized[79]["futureExtension"]["index"], 84);
    }

    #[test]
    fn preserves_future_history_rows_through_retention_clear_and_restart() {
        let storage_dir = unique_test_storage_dir("history-future-preservation");
        let future = serde_json::json!({
            "id": "history.future.v2",
            "mode": "calculate",
            "inputLatex": "future()",
            "resultDocument": {
                "version": 2,
                "title": "Future result",
                "payload": ["kept", "verbatim"]
            },
            "timestamp": "2026-07-13T00:00:00.000Z"
        });
        let current = serde_json::json!({
            "id": "history.current.v1",
            "mode": "calculate",
            "inputLatex": "2+2",
            "resultDocument": {
                "version": 1,
                "outcomeKind": "success",
                "title": "Calculate",
                "primaryMath": {"canonicalLatex": "4"},
                "warnings": []
            },
            "timestamp": "2026-07-13T00:00:01.000Z"
        });

        {
            let state = AppState::load(storage_dir.clone()).expect("state should initialize");
            replace_history_values(vec![future.clone(), current], &state)
                .expect("mixed-version ledger should persist");
            clear_history_values(&state).expect("clear should preserve future rows");
            assert_eq!(load_history_values(&state).unwrap(), vec![future.clone()]);
        }

        let restarted = AppState::load(storage_dir.clone()).expect("state should restart");
        assert_eq!(load_history_values(&restarted).unwrap(), vec![future]);
        fs::remove_dir_all(storage_dir).expect("temporary state should be removed");
    }
}

#[tauri::command]
fn boot_app(state: State<'_, AppState>) -> Result<AppBootstrap, String> {
    let snapshot = state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?
        .clone();

    Ok(AppBootstrap {
        current_mode: snapshot.current_mode,
        settings: snapshot.settings,
        mode_tree: mode_tree(),
        history_count: snapshot
            .history
            .iter()
            .filter(|entry| {
                validate_history_envelope(entry, false).is_ok()
                    && history_result_document_version(entry) == Some(1)
            })
            .count(),
        variable_memory: snapshot.variable_memory,
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

#[tauri::command]
fn get_mode_tree() -> Vec<MenuNode> {
    mode_tree()
}

#[tauri::command]
fn get_launcher_categories() -> Vec<LauncherCategory> {
    launcher_categories()
}

#[tauri::command]
fn set_mode(mode_id: ModeId, state: State<'_, AppState>) -> Result<ModeState, String> {
    let mut snapshot = state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?;
    snapshot.current_mode = mode_id.clone();
    let clone = snapshot.clone();
    drop(snapshot);
    state.save_snapshot(&clone)?;

    Ok(ModeState {
        active_mode: mode_id.clone(),
        menu: menu_for_mode(&mode_id),
    })
}

#[tauri::command]
fn evaluate_math(req: EvaluateRequest) -> EvaluateResponse {
    if req.document.latex.trim().is_empty() {
        return EvaluateResponse {
            warnings: frontend_engine_warning(),
            error: Some("Enter an expression before evaluating.".into()),
            ..EvaluateResponse::default()
        };
    }

    EvaluateResponse {
        exact_latex: Some(req.document.latex),
        approx_text: None,
        normalized_math_json: req.document.math_json,
        warnings: frontend_engine_warning(),
        error: None,
    }
}

#[tauri::command]
fn solve_expression(req: EvaluateRequest) -> EvaluateResponse {
    if req.document.latex.trim().is_empty() {
        return EvaluateResponse {
            warnings: frontend_engine_warning(),
            error: Some("Enter an equation before solving.".into()),
            ..EvaluateResponse::default()
        };
    }

    EvaluateResponse {
        exact_latex: Some(req.document.latex),
        approx_text: None,
        normalized_math_json: req.document.math_json,
        warnings: frontend_engine_warning(),
        error: None,
    }
}

#[tauri::command]
fn matrix_command(_req: MatrixRequest) -> MatrixResponse {
    MatrixResponse {
        warnings: frontend_engine_warning(),
        error: None,
        ..MatrixResponse::default()
    }
}

#[tauri::command]
fn vector_command(_req: VectorRequest) -> VectorResponse {
    VectorResponse {
        warnings: frontend_engine_warning(),
        error: None,
        ..VectorResponse::default()
    }
}

#[tauri::command]
fn generate_table(_req: TableRequest) -> TableResponse {
    TableResponse {
        warnings: frontend_engine_warning(),
        error: None,
        ..TableResponse::default()
    }
}

#[tauri::command]
fn save_settings(patch: SettingsPatch, state: State<'_, AppState>) -> Result<Settings, String> {
    let mut snapshot = state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?;

    if let Some(angle_unit) = patch.angle_unit {
        snapshot.settings.angle_unit = angle_unit;
    }
    if let Some(output_style) = patch.output_style {
        snapshot.settings.output_style = output_style;
    }
    if let Some(language_code) = patch.language_code {
        snapshot.settings.language_code = sanitize_language_code(language_code);
    }
    if let Some(equation_answer_mode) = patch.equation_answer_mode {
        snapshot.settings.equation_answer_mode = match equation_answer_mode.as_str() {
            "isolate" => equation_answer_mode,
            _ => "exact".into(),
        };
    }
    if let Some(equation_domain_intent) = patch.equation_domain_intent {
        snapshot.settings.equation_domain_intent = match equation_domain_intent.as_str() {
            "complex" => equation_domain_intent,
            _ => "real".into(),
        };
    }
    if let Some(complex_exact_form) = patch.complex_exact_form {
        snapshot.settings.complex_exact_form = match complex_exact_form.as_str() {
            "polar" | "cis" => complex_exact_form,
            _ => "rectangular".into(),
        };
    }
    if let Some(math_notation_display) = patch.math_notation_display {
        snapshot.settings.math_notation_display = math_notation_display;
    }
    if let Some(history_enabled) = patch.history_enabled {
        snapshot.settings.history_enabled = history_enabled;
    }
    if let Some(calculator_memory_enabled) = patch.calculator_memory_enabled {
        snapshot.settings.calculator_memory_enabled = calculator_memory_enabled;
    }
    if let Some(calculator_memory_autosave_mode) = patch.calculator_memory_autosave_mode {
        snapshot.settings.calculator_memory_autosave_mode =
            if calculator_memory_autosave_mode == "interval" {
                "interval".into()
            } else {
                "settled".into()
            };
    }
    if let Some(calculator_memory_autosave_interval_seconds) =
        patch.calculator_memory_autosave_interval_seconds
    {
        snapshot
            .settings
            .calculator_memory_autosave_interval_seconds =
            calculator_memory_autosave_interval_seconds.max(20);
    }
    if let Some(auto_switch_to_equation) = patch.auto_switch_to_equation {
        snapshot.settings.auto_switch_to_equation = auto_switch_to_equation;
    }
    if let Some(ui_scale) = patch.ui_scale {
        snapshot.settings.ui_scale = ui_scale;
    }
    if let Some(math_scale) = patch.math_scale {
        snapshot.settings.math_scale = math_scale;
    }
    if let Some(result_scale) = patch.result_scale {
        snapshot.settings.result_scale = result_scale;
    }
    if let Some(high_contrast) = patch.high_contrast {
        snapshot.settings.high_contrast = high_contrast;
    }
    if let Some(symbolic_display_mode) = patch.symbolic_display_mode {
        snapshot.settings.symbolic_display_mode = symbolic_display_mode;
    }
    if let Some(flatten_nested_roots_when_safe) = patch.flatten_nested_roots_when_safe {
        snapshot.settings.flatten_nested_roots_when_safe = flatten_nested_roots_when_safe;
    }
    if let Some(approx_digits) = patch.approx_digits {
        snapshot.settings.approx_digits = approx_digits.clamp(0, 20);
    }
    if let Some(numeric_notation_mode) = patch.numeric_notation_mode {
        snapshot.settings.numeric_notation_mode = numeric_notation_mode;
    }
    if let Some(scientific_notation_style) = patch.scientific_notation_style {
        snapshot.settings.scientific_notation_style = scientific_notation_style;
    }
    if let Some(detailed_facts_enabled) = patch.detailed_facts_enabled {
        snapshot.settings.detailed_facts_enabled = detailed_facts_enabled;
    }

    let settings = snapshot.settings.clone();
    let clone = snapshot.clone();
    drop(snapshot);
    state.save_snapshot(&clone)?;
    Ok(settings)
}

#[tauri::command]
fn append_history(entry: serde_json::Value, state: State<'_, AppState>) -> Result<(), String> {
    append_history_value(entry, &state)
}

#[tauri::command]
fn load_history(state: State<'_, AppState>) -> Result<Vec<serde_json::Value>, String> {
    load_history_values(&state)
}

#[tauri::command]
fn replace_history(entries: Vec<serde_json::Value>, state: State<'_, AppState>) -> Result<(), String> {
    replace_history_values(entries, &state)
}

#[tauri::command]
fn clear_history(state: State<'_, AppState>) -> Result<(), String> {
    clear_history_values(&state)
}

#[tauri::command]
fn delete_history_entry(id: String, state: State<'_, AppState>) -> Result<(), String> {
    delete_history_value(&id, &state)
}

#[tauri::command]
fn save_variable_memory(
    entries: Vec<StoredVariableValue>,
    state: State<'_, AppState>,
) -> Result<Vec<StoredVariableValue>, String> {
    let mut snapshot = state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?;
    snapshot.variable_memory = entries.clone();
    let clone = snapshot.clone();
    drop(snapshot);
    state.save_snapshot(&clone)?;
    Ok(entries)
}

#[tauri::command]
fn load_calculator_memory(state: State<'_, AppState>) -> Result<Option<serde_json::Value>, String> {
    load_calculator_memory_value(&state)
}

#[tauri::command]
fn save_calculator_memory(
    snapshot: serde_json::Value,
    state: State<'_, AppState>,
) -> Result<Option<serde_json::Value>, String> {
    save_calculator_memory_value(snapshot, &state)
}

#[tauri::command]
fn clear_calculator_memory(state: State<'_, AppState>) -> Result<(), String> {
    let mut snapshot = state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?;
    snapshot.calculator_memory = None;
    let clone = snapshot.clone();
    drop(snapshot);
    state.save_snapshot(&clone)
}

#[tauri::command]
fn solve_ode_numeric(request: NumericOdeRequest) -> Result<NumericOdeResponse, String> {
    solve_numeric_ode(request)
}

#[tauri::command]
fn sample_ode_solution(request: NumericOdeRequest) -> Result<NumericOdeResponse, String> {
    solve_numeric_ode(request)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            let storage_dir = app
                .path()
                .app_data_dir()
                .map_err(|error| tauri::Error::Io(std::io::Error::other(error.to_string())))?;

            app.manage(
                AppState::load(storage_dir)
                    .map_err(|error| tauri::Error::Io(std::io::Error::other(error)))?,
            );
            let notebook_storage_dir = app
                .path()
                .app_data_dir()
                .map_err(|error| tauri::Error::Io(std::io::Error::other(error.to_string())))?
                .join("notebook-library");
            app.manage(
                notebook_storage::NotebookStorage::load(notebook_storage_dir)
                    .map_err(|error| tauri::Error::Io(std::io::Error::other(error)))?,
            );
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            boot_app,
            get_mode_tree,
            get_launcher_categories,
            set_mode,
            evaluate_math,
            solve_expression,
            matrix_command,
            vector_command,
            generate_table,
            save_settings,
            append_history,
            load_history,
            replace_history,
            clear_history,
            delete_history_entry,
            save_variable_memory,
            load_calculator_memory,
            save_calculator_memory,
            clear_calculator_memory,
            solve_ode_numeric,
            sample_ode_solution,
            notebook_storage::notebook_list_records,
            notebook_storage::notebook_load_record,
            notebook_storage::notebook_save_record,
            notebook_storage::notebook_delete_record,
            notebook_storage::notebook_put_asset,
            notebook_storage::notebook_load_asset,
            notebook_storage::notebook_delete_asset,
            notebook_storage::notebook_export_package,
            notebook_storage::notebook_inspect_package,
            notebook_storage::notebook_import_package,
            ooe::commands::ooe_list_builtin_plans,
            ooe::commands::ooe_list_builtin_hosts,
            ooe::commands::ooe_get_builtin_plan,
            ooe::commands::ooe_get_builtin_host,
            ooe::commands::ooe_validate_plan
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
