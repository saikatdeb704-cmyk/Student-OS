# STUDENT OS — API Contracts & Streaming Protocol

**Base Path:** `/api/*` (Next.js App Router Server Route Handlers)  
**Validation Library:** Zod (`src/types/student-os.ts`)  
**Authentication:** Server-side Supabase session verification (`createSupabaseServerClient()`) + Local Dev Profile Fallback

---

## 1. Core API Route Matrix

| Method | Endpoint | Status | Purpose |
|---|---|---|---|
| `POST` | `/api/ceo/chat` | Implemented | Send natural-language directive to AI CEO; streams NDJSON `CEOEvent`s or returns JSON |
| `POST` | `/api/ceo/voice` | Planned (Phase 9) | Server-side audio transcription / voice intent processing fallback |
| `GET` | `/api/dashboard` | Implemented | Aggregated student profile, subjects, tasks, goals, projects, opportunities, approvals & AI token usage |
| `GET` | `/api/profile` | Implemented | Retrieve student profile & onboarding preferences |
| `POST` | `/api/profile` | Implemented | Complete onboarding or update student profile & daily study hours |
| `GET` | `/api/agents` | Implemented | List all 16 registered agents with capabilities, tools, department & status |
| `GET` | `/api/agents/:id` | Planned (Phase 4) | Detailed single-agent configuration, execution history & token telemetry |
| `POST` | `/api/agents/run` | Planned (Phase 5) | Trigger a direct/background workflow run |
| `GET` | `/api/agent-runs/:id` | Planned (Phase 5) | Poll/inspect execution state & task tree for a specific run |
| `POST` | `/api/approvals/:id/decision` | Implemented | Approve or reject a pending human-in-the-loop action (`approved` / `rejected`) |
| `GET` | `/api/tasks` | Implemented | List student tasks ordered by creation/priority |
| `POST` | `/api/tasks` | Implemented | Create a manual or agent-sourced task |
| `PATCH` | `/api/tasks` | Implemented | Update task status (`pending`, `in_progress`, `completed`, `cancelled`) |
| `GET` | `/api/conversations` | Planned (Phase 3) | List persistent CEO conversation threads |
| `GET` | `/api/conversations/:id` | Planned (Phase 3) | Fetch full message history and associated `agent_runs` for a thread |
| `GET` | `/api/goals` | Planned (Phase 8) | List and filter student goals |
| `POST` | `/api/documents` | Planned (Phase 9) | Upload syllabus/research PDF to Supabase Storage & queue embedding extraction |
| `GET` | `/api/reports/weekly` | Planned (Phase 12) | Generate grounded weekly intelligence report via Performance Agent |
| `GET` | `/api/notifications` | Planned (Phase 10) | Fetch unread deadline, approval, and briefing notifications |

---

## 2. Detailed Endpoint Specifications

### 2.1 `POST /api/ceo/chat`
Executes the 15-step AI CEO Orchestration Lifecycle.

**Request Body (`application/json`):**
```json
{
  "message": "Analyse my CS301 syllabus and create a 7-day study schedule, plus draft an internship email",
  "conversationId": "conv-default",
  "stream": true
}
```

**Streaming Response (`application/x-ndjson; charset=utf-8`):**
Each line is a valid JSON object conforming to `CEOEvent`:

```ts
type CEOEvent =
  | { type: "message_start"; runId: string }
  | {
      type: "plan_created";
      plan: {
        intent: string;
        selectedAgents: AgentSlug[];
        steps: { agent: AgentSlug; objective: string }[];
      };
    }
  | { type: "agent_started"; agent: AgentSlug; agentName: string; objective: string }
  | { type: "agent_completed"; agent: AgentSlug; agentName: string; result: AgentResult }
  | {
      type: "approval_required";
      approvalId: string;
      actionType: string;
      title: string;
      description: string;
    }
  | { type: "message_delta"; text: string }
  | {
      type: "message_complete";
      messageId: string;
      runId: string;
      status: ExecutionStatus;
      consolidatedText: string;
      agentResults: Record<string, AgentResult>;
    }
  | { type: "error"; message: string };
```

---

### 2.2 `POST /api/approvals/:id/decision`
Resolves a pending consequential action in the Approval Service.

**Request Body:**
```json
{
  "decision": "approved"
}
```

**Response (`200 OK`):**
```json
{
  "approval": {
    "id": "appr-201",
    "runId": "run-initial-01",
    "agentSlug": "communication",
    "actionType": "draft_external_email",
    "title": "Send Research Internship Inquiry to Prof. R. Verma (AI Lab)",
    "status": "approved",
    "decidedAt": "2026-11-05T02:15:00.000Z"
  }
}
```

---

### 2.3 `GET /api/tasks`, `POST /api/tasks`, `PATCH /api/tasks`
- **`POST /api/tasks` Input Schema:**
  ```json
  {
    "title": "Complete CS301 Unit 3 Graph Problems",
    "description": "Practice BFS, DFS, Dijkstra",
    "priority": "high",
    "dueAt": "2026-11-08T18:00:00.000Z"
  }
  ```
- **`PATCH /api/tasks` Input Schema:**
  ```json
  {
    "id": "task-101",
    "status": "completed"
  }
  ```

---

### 2.4 `GET /api/profile` & `POST /api/profile`
Validates student onboarding inputs using `OnboardingProfileSchema`:
- `fullName` (`string`, min 2 chars)
- `institution` (`string`, min 2 chars)
- `degree` (`string`, min 2 chars)
- `department` (`string`, min 2 chars)
- `semester` (`number`, integer `1..16`)
- `careerGoal` (`string`, min 2 chars)
- `persona` (`"confused_fresher" | "ambitious_builder" | "overwhelmed_organizer" | "research_explorer"`)
- `dailyStudyHours` (`number`, `1..14`)

