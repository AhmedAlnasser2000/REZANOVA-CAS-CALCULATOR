param(
  [Parameter(Position = 0, Mandatory = $true)]
  [string]$Command,
  [string]$TaskId,
  [string]$Message
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

function Invoke-GitSafe {
  param(
    [string[]]$GitArgs
  )

  $repoRoot = Get-RepoRoot
  try {
    $output = & git -C $repoRoot @GitArgs 2>&1
    $exitCode = $LASTEXITCODE
    return [pscustomobject]@{
      Success  = ($exitCode -eq 0)
      ExitCode = $exitCode
      Output   = ($output | Out-String).Trim()
    }
  } catch {
    return [pscustomobject]@{
      Success  = $false
      ExitCode = 1
      Output   = $_.Exception.Message
    }
  }
}

function Write-ListSection {
  param(
    [string]$Title,
    [string[]]$Items
  )

  Write-Output ("{0}:" -f $Title)
  if (-not $Items -or $Items.Count -eq 0 -or ($Items.Count -eq 1 -and [string]::IsNullOrWhiteSpace($Items[0]))) {
    Write-Output "- none"
    return
  }

  foreach ($item in $Items) {
    if (-not [string]::IsNullOrWhiteSpace($item)) {
      Write-Output "- $item"
    }
  }
}

function Get-BranchName {
  $symbolic = Invoke-GitSafe -GitArgs @('symbolic-ref', '--short', 'HEAD')
  if ($symbolic.Success -and -not [string]::IsNullOrWhiteSpace($symbolic.Output)) {
    return $symbolic.Output
  }

  $branch = Invoke-GitSafe -GitArgs @('branch', '--show-current')
  if ($branch.Success -and -not [string]::IsNullOrWhiteSpace($branch.Output)) {
    return $branch.Output
  }

  return 'unavailable (git metadata unavailable)'
}

function Get-StatusLines {
  $status = Invoke-GitSafe -GitArgs @('status', '--short')
  if (-not $status.Success) {
    return [pscustomobject]@{
      Success = $false
      Lines   = @()
    }
  }

  $lines = @($status.Output -split "`r?`n") | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  return [pscustomobject]@{
    Success = $true
    Lines   = $lines
  }
}

function Get-TaskTmpDirty {
  $repoRoot = Get-RepoRoot
  $taskTmpRoot = Join-Path $repoRoot '.task_tmp'
  if (-not (Test-Path $taskTmpRoot)) {
    return 'no'
  }

  $items = Get-ChildItem -Force -Recurse -Path $taskTmpRoot -ErrorAction SilentlyContinue
  if (@($items).Count -gt 0) {
    return 'yes'
  }

  return 'no'
}

switch ($Command.ToLowerInvariant()) {
  'commit-plan' {
    if ([string]::IsNullOrWhiteSpace($Message)) {
      throw 'Message is required for commit-plan.'
    }

    $branch = Get-BranchName
    $status = Get-StatusLines

    $stagedFiles = @()
    $unstagedFiles = @()
    $untrackedFiles = @()
    if ($status.Success) {
      foreach ($line in $status.Lines) {
        $code = $line.Substring(0, 2)
        $path = $line.Substring(3).Trim()
        if ($code -eq '??') {
          $untrackedFiles += $path
          continue
        }

        if ($code[0] -ne ' ') {
          $stagedFiles += $path
        }

        if ($code[1] -ne ' ') {
          $unstagedFiles += $path
        }
      }
    }

    $durableMemoryStatus = 'unavailable (git metadata unavailable)'
    if ($status.Success) {
      $durableLines = @(@($status.Lines) | Where-Object {
        $_ -match '(^|\s)\.memory/' -or $_ -match '(^|\s)docs/checkpoints/' -or $_ -match '(^|\s)docs/app_summary_latest\.md'
      })
      $durableMemoryStatus = if (@($durableLines).Count -gt 0) { 'yes' } else { 'no' }
    }

    Write-Output ('TaskId: {0}' -f $(if ($TaskId) { $TaskId } else { 'not provided' }))
    Write-Output ('Active Branch: {0}' -f $branch)
    Write-Output ('Tracked Changes Summary: {0}' -f $(if ($status.Success) {
      $lineCount = @($status.Lines).Count
      if ($lineCount -eq 0) { 'clean' } else { "$lineCount changed path(s)" }
    } else {
      'unavailable (git metadata unavailable)'
    }))
    Write-ListSection -Title 'Staged Files' -Items $stagedFiles
    Write-ListSection -Title 'Unstaged Files' -Items $unstagedFiles
    Write-ListSection -Title 'Untracked Files' -Items $untrackedFiles
    Write-Output ('Task Tmp Dirty: {0}' -f (Get-TaskTmpDirty))
    Write-Output ('Durable Memory Changed: {0}' -f $durableMemoryStatus)
    Write-Output ('Proposed Commit Message: {0}' -f $Message)
    Write-Output ('Commit Command: git commit -m "{0}"' -f ($Message -replace '"', '\"'))
    break
  }

  'push-plan' {
    $branch = Get-BranchName

    $upstreamInfo = Invoke-GitSafe -GitArgs @('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}')
    $upstream = if ($upstreamInfo.Success -and -not [string]::IsNullOrWhiteSpace($upstreamInfo.Output)) { $upstreamInfo.Output } else { 'none' }

    $aheadBehind = 'unavailable (git metadata unavailable)'
    $aheadCommits = @()
    if ($upstream -ne 'none') {
      $counts = Invoke-GitSafe -GitArgs @('rev-list', '--left-right', '--count', "$upstream...HEAD")
      if ($counts.Success) {
        $parts = $counts.Output -split '\s+'
        if ($parts.Count -ge 2) {
          $behind = [int]$parts[0]
          $ahead = [int]$parts[1]
          if ($ahead -gt 0 -and $behind -gt 0) {
            $aheadBehind = "diverged (ahead $ahead, behind $behind)"
          } elseif ($ahead -gt 0) {
            $aheadBehind = "ahead $ahead"
          } elseif ($behind -gt 0) {
            $aheadBehind = "behind $behind"
          } else {
            $aheadBehind = 'up to date'
          }
        }
      }

      $aheadLog = Invoke-GitSafe -GitArgs @('log', '--oneline', "$upstream..HEAD")
      if ($aheadLog.Success -and -not [string]::IsNullOrWhiteSpace($aheadLog.Output)) {
        $aheadCommits = @($aheadLog.Output -split "`r?`n")
      }
    }

    Write-Output ('Active Branch: {0}' -f $branch)
    Write-Output ('Upstream Branch: {0}' -f $upstream)
    Write-Output ('Ahead/Behind: {0}' -f $aheadBehind)
    Write-ListSection -Title 'Commits Ahead Of Upstream' -Items $aheadCommits
    if ($branch -like 'unavailable*') {
      Write-Output 'Push Command: git push'
    } elseif ($upstream -eq 'none') {
      Write-Output ('Push Command: git push --set-upstream origin {0}' -f $branch)
    } else {
      Write-Output 'Push Command: git push'
    }
    break
  }

  default {
    throw "Unknown command '$Command'."
  }
}
