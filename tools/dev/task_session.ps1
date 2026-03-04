param(
  [Parameter(Position = 0, Mandatory = $true)]
  [string]$Command,
  [string]$Id,
  [string]$Title,
  [string]$Text,
  [string]$Name,
  [ValidateSet('ui', 'backend')]
  [string]$Kind,
  [ValidateSet('pass', 'fail', 'blocked')]
  [string]$Result,
  [string]$Evidence,
  [switch]$Delete
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

function Assert-TaskId {
  param([string]$TaskId)

  if ([string]::IsNullOrWhiteSpace($TaskId)) {
    throw 'Task id is required.'
  }

  if ($TaskId -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]*$') {
    throw "Invalid task id '$TaskId'. Use letters, numbers, dot, underscore, and dash only."
  }
}

function Get-TaskRoot {
  param([string]$TaskId)

  Assert-TaskId -TaskId $TaskId
  return Join-Path (Join-Path (Get-RepoRoot) '.task_tmp') $TaskId
}

function Get-StatePath {
  param([string]$TaskId)

  return Join-Path (Get-TaskRoot -TaskId $TaskId) 'state.json'
}

function Get-NotesPath {
  param([string]$TaskId)

  return Join-Path (Get-TaskRoot -TaskId $TaskId) 'notes.md'
}

function Get-GatesRoot {
  param([string]$TaskId)

  return Join-Path (Get-TaskRoot -TaskId $TaskId) 'gates'
}

function Get-IsoNow {
  return (Get-Date).ToString('yyyy-MM-ddTHH:mm:sszzz')
}

function Get-CurrentBranch {
  $repoRoot = Get-RepoRoot
  try {
    $branch = git -C $repoRoot branch --show-current 2>$null
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($branch)) {
      return $branch.Trim()
    }
  } catch {
  }

  return 'unknown (git metadata unavailable)'
}

function Ensure-TaskExists {
  param([string]$TaskId)

  if (-not (Test-Path (Get-TaskRoot -TaskId $TaskId))) {
    throw "Task '$TaskId' does not exist."
  }
}

function Read-State {
  param([string]$TaskId)

  Ensure-TaskExists -TaskId $TaskId
  $statePath = Get-StatePath -TaskId $TaskId
  return Get-Content -Raw -Path $statePath | ConvertFrom-Json
}

function Write-State {
  param(
    [string]$TaskId,
    [object]$State
  )

  $statePath = Get-StatePath -TaskId $TaskId
  $json = $State | ConvertTo-Json -Depth 8
  Set-Content -Path $statePath -Value ($json + [Environment]::NewLine) -Encoding utf8
}

function Append-Notes {
  param(
    [string]$TaskId,
    [string]$Line
  )

  $notesPath = Get-NotesPath -TaskId $TaskId
  Add-Content -Path $notesPath -Value $Line -Encoding utf8
}

function New-GateFile {
  param(
    [string]$TaskId,
    [string]$GateName,
    [string]$GateKind,
    [int]$GateNumber
  )

  $safeName = ($GateName -replace '[^A-Za-z0-9._-]', '-').ToLowerInvariant()
  $fileName = '{0:D2}-{1}.md' -f $GateNumber, $safeName
  $relativePath = Join-Path 'gates' $fileName
  $fullPath = Join-Path (Get-TaskRoot -TaskId $TaskId) $relativePath
  $openedAt = Get-IsoNow
  $content = @"
# Gate

## Gate Name
- $GateName

## Kind
- $GateKind

## Opened At
- $openedAt

## Scope
- 

## Files Touched
- 

## Verification Plan
- 

## Verification Evidence
- 

## Result
- open

## Follow-Up Notes
- 
"@
  Set-Content -Path $fullPath -Value ($content + [Environment]::NewLine) -Encoding utf8
  return $relativePath
}

switch ($Command.ToLowerInvariant()) {
  'start' {
    Assert-TaskId -TaskId $Id
    if ([string]::IsNullOrWhiteSpace($Title)) {
      throw 'Title is required for start.'
    }

    $taskRoot = Get-TaskRoot -TaskId $Id
    if (Test-Path $taskRoot) {
      throw "Task '$Id' already exists."
    }

    New-Item -ItemType Directory -Path $taskRoot | Out-Null
    New-Item -ItemType Directory -Path (Get-GatesRoot -TaskId $Id) | Out-Null

    $startedAt = Get-IsoNow
    $state = [ordered]@{
      taskId        = $Id
      title         = $Title
      branch        = Get-CurrentBranch
      status        = 'active'
      startedAt     = $startedAt
      lastUpdatedAt = $startedAt
      currentGate   = $null
      gates         = @()
    }

    Write-State -TaskId $Id -State $state
    Set-Content -Path (Get-NotesPath -TaskId $Id) -Value "# Notes`n" -Encoding utf8
    Write-Output "STARTED: $taskRoot"
    break
  }

  'note' {
    Ensure-TaskExists -TaskId $Id
    if ([string]::IsNullOrWhiteSpace($Text)) {
      throw 'Text is required for note.'
    }

    $state = Read-State -TaskId $Id
    $timestamp = Get-IsoNow
    Append-Notes -TaskId $Id -Line ("- [{0}] {1}" -f $timestamp, $Text)
    $state.lastUpdatedAt = $timestamp
    Write-State -TaskId $Id -State $state
    Write-Output "NOTED: $Id"
    break
  }

  'gate-open' {
    Ensure-TaskExists -TaskId $Id
    if ([string]::IsNullOrWhiteSpace($Name)) {
      throw 'Name is required for gate-open.'
    }
    if ([string]::IsNullOrWhiteSpace($Kind)) {
      throw 'Kind is required for gate-open.'
    }

    $state = Read-State -TaskId $Id
    foreach ($gate in $state.gates) {
      if ($gate.status -eq 'open') {
        throw "Gate '$($gate.name)' is already open."
      }
    }

    $gateNumber = @($state.gates).Count + 1
    $relativeFile = New-GateFile -TaskId $Id -GateName $Name -GateKind $Kind -GateNumber $gateNumber
    $openedAt = Get-IsoNow
    $gateEntry = [ordered]@{
      name     = $Name
      kind     = $Kind
      status   = 'open'
      openedAt = $openedAt
      closedAt = $null
      file     = $relativeFile
    }

    $gates = @($state.gates)
    $gates += $gateEntry
    $state.gates = $gates
    $state.currentGate = $Name
    $state.lastUpdatedAt = $openedAt
    Write-State -TaskId $Id -State $state
    Write-Output "GATE OPENED: $Name"
    break
  }

  'gate-close' {
    Ensure-TaskExists -TaskId $Id
    if ([string]::IsNullOrWhiteSpace($Name)) {
      throw 'Name is required for gate-close.'
    }
    if ([string]::IsNullOrWhiteSpace($Result)) {
      throw 'Result is required for gate-close.'
    }

    $state = Read-State -TaskId $Id
    $gateFound = $false
    $closedAt = Get-IsoNow
    $updatedGates = @()

    foreach ($gate in $state.gates) {
      if ($gate.name -eq $Name -and $gate.status -eq 'open') {
        $gate.status = $Result
        $gate.closedAt = $closedAt
        $gateFound = $true
        $gateFile = Join-Path (Get-TaskRoot -TaskId $Id) $gate.file
        Add-Content -Path $gateFile -Value "" -Encoding utf8
        Add-Content -Path $gateFile -Value "## Closed At" -Encoding utf8
        Add-Content -Path $gateFile -Value "- $closedAt" -Encoding utf8
        Add-Content -Path $gateFile -Value "" -Encoding utf8
        Add-Content -Path $gateFile -Value "## Closeout Evidence" -Encoding utf8
        Add-Content -Path $gateFile -Value ("- {0}" -f ($(if ([string]::IsNullOrWhiteSpace($Evidence)) { 'No evidence text supplied.' } else { $Evidence }))) -Encoding utf8
        Add-Content -Path $gateFile -Value "" -Encoding utf8
        Add-Content -Path $gateFile -Value "## Final Result" -Encoding utf8
        Add-Content -Path $gateFile -Value ("- {0}" -f $Result) -Encoding utf8
      }
      $updatedGates += $gate
    }

    if (-not $gateFound) {
      throw "Open gate '$Name' was not found."
    }

    $state.gates = $updatedGates
    $state.currentGate = $null
    $state.lastUpdatedAt = $closedAt
    Write-State -TaskId $Id -State $state
    Write-Output "GATE CLOSED: $Name -> $Result"
    break
  }

  'status' {
    Ensure-TaskExists -TaskId $Id
    $state = Read-State -TaskId $Id
    Write-Output ("Task: {0}" -f $state.taskId)
    Write-Output ("Title: {0}" -f $state.title)
    Write-Output ("Branch: {0}" -f $state.branch)
    Write-Output ("Status: {0}" -f $state.status)
    Write-Output ("Current Gate: {0}" -f $(if ($state.currentGate) { $state.currentGate } else { 'none' }))
    Write-Output ("Updated: {0}" -f $state.lastUpdatedAt)
    Write-Output "Gates:"
    if (@($state.gates).Count -eq 0) {
      Write-Output "- none"
    } else {
      foreach ($gate in $state.gates) {
        Write-Output ("- {0} [{1}] {2}" -f $gate.name, $gate.kind, $gate.status)
      }
    }
    break
  }

  'finalize' {
    Ensure-TaskExists -TaskId $Id
    $taskRoot = Get-TaskRoot -TaskId $Id

    if (-not $Delete) {
      Write-Output "DRY RUN (no deletion performed)"
      Write-Output "TARGET: $taskRoot"
      break
    }

    Remove-Item -Recurse -Force -Path $taskRoot
    Write-Output "DELETED: $taskRoot"
    break
  }

  default {
    throw "Unknown command '$Command'."
  }
}
