# Ralph Loop - Complete Workflow

## Swimlane Diagram (Mermaid)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#e1f5fe', 'secondaryColor': '#fff3e0', 'tertiaryColor': '#f3e5f5'}}}%%

flowchart TB
    subgraph HUMAN["👤 HUMAN"]
        direction TB
        H1[/"Write Feature Spec<br/>docs/features/[name].md"/]
        H2[/"Answer Clarifications<br/>(1A, 2B format)"/]
        H3[/"Review PRD<br/>Approve or Revise"/]
        H4[/"Run Daily Sync<br/>branch-check.sh"/]
        H5[/"Review & Merge PR<br/>to main"/]
        H6{{"Manual Fix<br/>(if needed)"}}
    end

    subgraph PRD_CREATOR["🤖 PRD CREATOR AGENT"]
        direction TB
        P1["Phase 1: Research<br/>• Read spec<br/>• Search codebase<br/>• Review docs"]
        P2["Phase 2: Analysis<br/>• Flag blockers 🔴<br/>• List clarifications 🟡<br/>• Suggest improvements 🟢"]
        P3["Phase 3: Decisions<br/>• Document answers<br/>• Update spec if needed"]
        P4["Phase 4: Generate PRD<br/>• Create prd.json<br/>• Create progress.txt<br/>• Create parent-task-id.txt"]
        P5["Phase 5: Workspace<br/>• Create workspace dir<br/>• Create feature branch<br/>• Record branch in prd.json<br/>• Commit workspace"]
        P6["Phase 6: Confirm<br/>• Present summary<br/>• Show story count<br/>• Display next steps"]
    end

    subgraph RALPH_LOOP["🔄 RALPH LOOP (ralph.sh)"]
        direction TB
        R1["Preflight<br/>• Validate workspace<br/>• Check baseline<br/>• Verify branch"]
        R2["Load Story<br/>• Read prd.json<br/>• Get next pending story"]
        R3["Implement<br/>• Write code<br/>• Follow patterns<br/>• Update files"]
        R4["Quality Gates<br/>• npm run check<br/>• npm run lint<br/>• npm run test"]
        R5{{"Pass?"}}
        R6["Commit & Update<br/>• Git commit<br/>• Mark story complete<br/>• Update progress.txt"]
        R7["Auto-Fix<br/>• Attempt repair<br/>• Max 2 tries"]
        R8{{"More Stories?"}}
        R9["Postflight<br/>• Final validation<br/>• Archive workspace<br/>• Extract patterns"]
    end

    subgraph GIT["📦 GIT / SYSTEM"]
        direction TB
        G1[("feature branch<br/>created")]
        G2[("commits per<br/>story")]
        G3[("merge to<br/>main")]
        G4[("workspace<br/>archived")]
    end

    %% Flow connections
    H1 --> P1
    P1 --> P2
    P2 -->|"Issues Found"| H2
    H2 --> P3
    P2 -->|"No Issues"| P4
    P3 --> P4
    P4 --> P5
    P5 --> G1
    P5 --> P6
    P6 --> H3
    H3 -->|"Approved"| H4
    H3 -->|"Revise"| P1

    H4 --> R1
    R1 --> R2
    R2 --> R3
    R3 --> R4
    R4 --> R5
    R5 -->|"Yes"| R6
    R6 --> G2
    R6 --> R8
    R5 -->|"No"| R7
    R7 -->|"Fixed"| R4
    R7 -->|"Failed"| H6
    H6 --> R4
    R8 -->|"Yes"| R2
    R8 -->|"No"| R9
    R9 --> G4
    R9 --> H5
    H5 --> G3

    %% Styling
    classDef human fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef agent fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef loop fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef git fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    classDef decision fill:#ffecb3,stroke:#ffa000,stroke-width:2px

    class H1,H2,H3,H4,H5 human
    class P1,P2,P3,P4,P5,P6 agent
    class R1,R2,R3,R4,R6,R7,R9 loop
    class G1,G2,G3,G4 git
    class R5,R8,H6 decision
```

## Simplified Linear View

```mermaid
graph LR
    A["📝 Spec"] --> B["🤖 PRD Creator"]
    B --> C["📋 PRD + Workspace"]
    C --> D["🔄 Daily Sync"]
    D --> E["⚙️ Ralph Loop"]
    E --> F["✅ Stories Complete"]
    F --> G["🔀 Merge to Main"]
    G --> H["📦 Archive"]

    style A fill:#e3f2fd
    style B fill:#fff3e0
    style C fill:#fff3e0
    style D fill:#e8f5e9
    style E fill:#f3e5f5
    style F fill:#f3e5f5
    style G fill:#e8f5e9
    style H fill:#e8f5e9
```

## Detailed Phase Breakdown

### Phase 1: Spec Creation (Human)
```
docs/features/
└── my-feature.md    ← Human writes this
    ├── Problem Statement
    ├── Proposed Solution
    ├── User Stories (rough)
    ├── Technical Considerations
    └── Non-Goals
```

### Phase 2: PRD Creation (Agent)
```
agents/ralph/workspaces/{feature}/
├── parent-task-id.txt   ← Feature identifier
├── prd.json             ← Structured stories + metadata
│   ├── feature
│   ├── branch           ← NEW: Tracks expected branch
│   ├── base_branch      ← NEW: What to sync from
│   ├── research
│   └── stories[]
│       ├── id
│       ├── title
│       ├── status: pending|in_progress|completed
│       ├── dependencies
│       └── acceptance_criteria
└── progress.txt         ← Implementation log
```

### Phase 3: Ralph Loop Execution
```
┌─────────────────────────────────────────────────────────────┐
│                     RALPH LOOP                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│  │ Preflight│───▶│ Story   │───▶│ Implement│───▶│ Quality │   │
│  │ Checks  │    │ Load    │    │ Code    │    │ Gates   │   │
│  └─────────┘    └─────────┘    └─────────┘    └────┬────┘   │
│                                                     │        │
│                      ┌──────────────────────────────┤        │
│                      │                              │        │
│                      ▼                              ▼        │
│                 ┌─────────┐                   ┌─────────┐   │
│                 │ Pass ✓  │                   │ Fail ✗  │   │
│                 └────┬────┘                   └────┬────┘   │
│                      │                              │        │
│                      ▼                              ▼        │
│                 ┌─────────┐                   ┌─────────┐   │
│                 │ Commit  │                   │ Auto-Fix│   │
│                 │ Story   │                   │ (2 max) │   │
│                 └────┬────┘                   └────┬────┘   │
│                      │                              │        │
│                      ▼                              │        │
│                 ┌─────────┐                         │        │
│                 │ More    │◀────────────────────────┘        │
│                 │ Stories?│                                  │
│                 └────┬────┘                                  │
│                      │                                       │
│           ┌─────────┴─────────┐                             │
│           ▼                   ▼                             │
│      ┌─────────┐        ┌─────────┐                         │
│      │ Yes     │        │ No      │                         │
│      │ (loop)  │        │ (done)  │                         │
│      └─────────┘        └────┬────┘                         │
│                              │                               │
│                              ▼                               │
│                        ┌─────────┐                           │
│                        │Postflight│                          │
│                        │ Archive │                           │
│                        └─────────┘                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Phase 4: Completion
```
┌─────────────────────────────────────────────────────────────┐
│  Feature Complete!                                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📦 Workspace archived to:                                    │
│     agents/ralph/archive/{timestamp}-{feature}/              │
│                                                               │
│  🌿 Feature branch ready:                                     │
│     feature/{parent-task-id}                                 │
│                                                               │
│  📊 Patterns extracted to:                                    │
│     agents/ralph/patterns/                                   │
│                                                               │
│  ✅ Human reviews and merges PR                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## State Transitions

```mermaid
stateDiagram-v2
    [*] --> Spec: Human writes spec

    state "PRD Creation" as PRD {
        Research --> Analysis
        Analysis --> Clarify: Issues found
        Clarify --> Decisions
        Decisions --> Generate
        Analysis --> Generate: No issues
        Generate --> Workspace
        Workspace --> Confirm
    }

    Spec --> PRD: Invoke PRD Creator

    state "Development" as Dev {
        DailySync --> Preflight
        Preflight --> StoryLoop

        state StoryLoop {
            Load --> Implement
            Implement --> QualityGates
            QualityGates --> Commit: Pass
            QualityGates --> AutoFix: Fail
            AutoFix --> QualityGates: Retry
            AutoFix --> ManualFix: Max retries
            ManualFix --> QualityGates
            Commit --> Load: More stories
        }

        StoryLoop --> Postflight: All done
    }

    PRD --> Dev: Approved
    PRD --> PRD: Revisions needed

    state "Completion" as Complete {
        Archive --> Review
        Review --> Merge
    }

    Dev --> Complete
    Complete --> [*]
```

## Key Integration Points

| Step | Input | Output | Actor |
|------|-------|--------|-------|
| Spec Creation | Idea/requirement | `docs/features/x.md` | Human |
| PRD Research | Spec file | Internal notes | Agent |
| PRD Clarify | Questions | Decisions | Human ↔ Agent |
| PRD Generate | Decisions | `prd.json`, `progress.txt` | Agent |
| Workspace Setup | PRD files | Feature branch + workspace | Agent |
| Daily Sync | Branch state | Merged branch | Human (script) |
| Story Implementation | Story from PRD | Code changes | Agent |
| Quality Gates | Code | Pass/Fail | System |
| Commit | Passing code | Git commit | Agent |
| Postflight | All stories done | Archived workspace | Agent |
| PR Review | Feature branch | Merged to main | Human |

## File Flow

```
docs/features/my-feature.md
        │
        ▼ (PRD Creator reads)
agents/ralph/workspaces/my-feature/
├── parent-task-id.txt
├── prd.json
└── progress.txt
        │
        ▼ (Ralph Loop reads/updates)
src/
├── lib/...  (code changes)
├── routes/... (code changes)
└── ...
        │
        ▼ (On completion)
agents/ralph/archive/{timestamp}-my-feature/
├── parent-task-id.txt
├── prd.json
├── progress.txt
└── COMPLETION_SUMMARY.md
```
