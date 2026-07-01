# Surface Protocol Hostless v1 Contract

Status: internal-agent contract reference for the landed hostless spine.

Surface Protocol v1 is a hostless, read-only contract boundary for REZANOVA CLASSWIZ CALCULATOR. It exposes stable summaries and lifecycle facts for `calculate` and `equation` only. It does not mount a website, run host commands, expose History or Variables, implement Graphing, provide plugins, run remote compute, implement a Model Context Protocol adapter, or provide an external software development kit.

The canonical fixtures below are copied from `src/lib/surface-protocol/fixtures.ts`. If the code fixtures change, this page must change with them.

## Capability Manifest

```json
{
  "protocolVersion": 1,
  "workspaces": [
    {
      "protocolVersion": 1,
      "workspaceKind": "calculate",
      "label": "Calculate",
      "summary": "Compact committed-result summaries and lifecycle/query infrastructure for Calculate.",
      "capabilities": {
        "resultSummary": true,
        "lifecycleEvents": true,
        "currentResultQuery": true,
        "commands": false,
        "mount": false,
        "history": false,
        "variables": false,
        "graphing": false,
        "tabs": false
      }
    },
    {
      "protocolVersion": 1,
      "workspaceKind": "equation",
      "label": "Equation",
      "summary": "Compact committed-result summaries and lifecycle/query infrastructure for Equation.",
      "capabilities": {
        "resultSummary": true,
        "lifecycleEvents": true,
        "currentResultQuery": true,
        "commands": false,
        "mount": false,
        "history": false,
        "variables": false,
        "graphing": false,
        "tabs": false
      }
    }
  ]
}
```

## Current Result Query

```json
{
  "ok": true,
  "protocolVersion": 1,
  "value": {
    "protocolVersion": 1,
    "workspaceKind": "equation",
    "queryKind": "currentResult",
    "summary": {
      "protocolVersion": 1,
      "workspaceKind": "equation",
      "status": "success",
      "title": "Equation Result",
      "resultKind": "exact",
      "primaryLatex": "x=2",
      "approximateText": "x ≈ 2",
      "answerDomain": "real",
      "solutionKind": "exact-symbolic",
      "facts": [
        {
          "kind": "condition",
          "label": "Valid when",
          "latex": "x\\ne0"
        },
        {
          "kind": "summary",
          "label": "Solve summary",
          "text": "Solved exactly."
        },
        {
          "kind": "domain",
          "label": "Answer domain",
          "text": "real"
        }
      ],
      "warnings": [
        {
          "text": "Check denominator exclusions."
        }
      ],
      "counts": [
        {
          "kind": "roots",
          "count": 1,
          "label": "Roots"
        },
        {
          "kind": "rejectedCandidates",
          "count": 1,
          "label": "Rejected candidates"
        },
        {
          "kind": "warnings",
          "count": 1,
          "label": "Warnings"
        },
        {
          "kind": "facts",
          "count": 3,
          "label": "Facts"
        }
      ]
    }
  }
}
```

## Safe Settings Query

```json
{
  "ok": true,
  "protocolVersion": 1,
  "value": {
    "protocolVersion": 1,
    "workspaceKind": "calculate",
    "queryKind": "safeSettings",
    "angleUnit": "rad"
  }
}
```

## Lifecycle Event

```json
{
  "protocolVersion": 1,
  "eventId": "surface.event.7",
  "sequence": 7,
  "timestamp": 1234567890,
  "type": "surface.result.committed",
  "status": "committed",
  "severity": "info",
  "workspaceKind": "equation",
  "surfaceJobId": "job.equation.1",
  "summary": "Result committed."
}
```

## Structured Failure

```json
{
  "ok": false,
  "protocolVersion": 1,
  "error": {
    "protocolVersion": 1,
    "code": "unsupported-query",
    "message": "Unsupported query.",
    "field": "queryKind"
  }
}
```

## Deferred Areas

- Mounting waits for a later website-host audit.
- Event/query pagination and cursors wait for a host use case with real volume or replay requirements.
- Graphing waits for trustworthy numeric solving, domain, branch, discontinuity, and locus/set semantics.
- History and Variables wait for explicit privacy/storage policy.
- Model Context Protocol may later adapt this contract, but no adapter exists in v1.
