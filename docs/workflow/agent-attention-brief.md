# REZANOVA Agent Attention — Brief

Status: v1 approved and implemented on branch `rezanova-agent-attention`; sound design and phone replies remain future work.

## 1. Purpose

REZANOVA Agent Attention is a small development-side utility for the REZANOVA CAS repository.

Its purpose is to remove the need for me to continuously watch or mentally monitor coding agents while they work.

I may be:

- studying on the same PC,
- doing unrelated work,
- using another application,
- handling personal responsibilities,
- away from the computer,
- outside,
- or simply taking a break.

In all of these situations, I should be able to stop paying attention to the agents until my attention is genuinely required.

The desired experience is:

> Start the agent, return to my own life or work, and trust the attention system to tell me when something actually matters.

This is not simply a remote-notification feature for when I leave the PC. It is an attention-management workflow intended to eliminate the need to repeatedly check VS Code, agent terminals, or planning sessions throughout the day.

The system should reduce situations where I feel I need to keep checking:

- whether an agent is still running,
- whether it has finished,
- whether it encountered an error,
- whether it is waiting for an answer,
- whether the unanswered question is important,
- or whether ignoring it could cause a dangerous decision.

The system therefore acts as a boundary between my attention and autonomous agent work. Normal autonomous work should remain invisible. Only meaningful events should interrupt me.

## 2. Core Goal

The core principle is:

> My attention should be event-driven, not monitoring-driven.

I should not need to watch agents continuously. The workflow should be:

```
Start agent
    ↓
Stop monitoring the agent
    ↓
Study / work / use PC / leave PC / continue daily life
    ↓
Agent works independently
    ↓
Attention system evaluates events
    ↓
No user attention required
    └── remain silent

User attention required
    └── notify me

Agent finishes
    └── send completion notification

Agent encounters a critical decision
    └── notify me and block safely

Required question expires unanswered
    └── stop the agent safely and notify me
```

The system should allow me to trust that I will be informed when something important happens, without needing to keep part of my attention focused on the agents.

## 3. What Problem This Solves

Long-running coding agents can interrupt normal life and study because the user does not know when an agent might:

- ask a question,
- enter a planning decision,
- require approval,
- encounter an unsafe ambiguity,
- stop unexpectedly,
- fail,
- or complete its work.

Without an attention system, this encourages repeated checking:

```
study for 10 minutes
↓
check agent

continue studying
↓
wonder whether agent is waiting

check again

leave room
↓
worry that a critical question appeared

return and check again
```

REZANOVA Agent Attention should eliminate this workflow. Instead:

```
Start agent
↓
Focus fully on studying

Agent has nothing important to ask
↓
No interruption

Agent genuinely needs a decision
↓
Desktop/mobile notification

Respond
↓
Return immediately to studying
```

The user should not need to supervise the agent in real time.

## 4. Design Principle

The application should optimize for **attention independence**.

- **Agents should handle ordinary decisions themselves.** Minor reversible decisions should not interrupt the user.
- **Important decisions should reach the user reliably.** The user should not have to discover them by checking VS Code.
- **Critical unanswered decisions should fail safely.** Silence must never be interpreted as approval.
- **Completion should be visible without being intrusive.** The user should know that work finished without having to monitor progress.
- **Failures should not remain hidden.** If an agent crashes, becomes unresponsive, or exits unexpectedly, the system should notify the user.

The purpose is not to increase communication with agents. The purpose is to make agent communication rare, meaningful, and reliable.

Being at the PC or away from it should make no difference. The user should be able to study, work, or live normally while agents run in the background, without the constant thought of needing to check on them.

## 5. v1 Decisions (2026-09-28)

Implemented in [`tools/agent-attention/`](../../tools/agent-attention/README.md).

- **Notify only.** No reply channel in v1. Replying later goes through SSH over Tailscale into the agent's tmux session. SSH is never exposed publicly.
- **Agents:** Claude Code (CLI and VS Code) via its hooks, and Codex CLI via its `notify` program. Cloud sessions are out of scope.
- **Channels:** Pushover on the iPhone, plus Linux desktop notifications.
- **Signal:** agents end a blocking turn with `ATTENTION: critical — …` or `ATTENTION: question — …`. The rule lives in `AGENTS.md` under "Agent Attention Signals". A turn without a marker is reported as finished.
- **Critical questions:** re-alert after 30 minutes and expire after 2 hours. On expiry nothing is approved, the agent stays stopped, and a handoff note is written.
- **Failures and stalls:** `attn launch` runs agents in tmux, reports crashes from their exit status, and flags working sessions with no activity for 30 minutes.
- **Completion:** alerts with sound, except turns shorter than 60 seconds, where the user was probably watching.
- **Sounds:** each event type has its own sound. None may be harsh, including critical. The final set is still to be chosen with the user; v1 ships gentle placeholders.
- **Boundary:** a development-side utility, installed into user-level agent config. The calculator app never depends on it.
