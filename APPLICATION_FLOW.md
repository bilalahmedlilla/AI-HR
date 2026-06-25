# AI-HR — Application Flow

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **UI Library** | React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 |
| **Database** | SQLite (via Prisma ORM) |
| **AI / LLM** | OpenAI API (configurable — `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`) |
| **Linting** | ESLint 9 with `eslint-config-next` |

---

## Landing Page (`/`)

Static server-rendered page. Two cards:

- **HR Portal** — links to `/hr`
- **Candidate Interview** — info card only; candidates need their specific interview URL

---

## HR Flow (3 pages)

### 1. HR Portal (`/hr`)

- Company registration form (name + email)
- `POST /api/company` — finds existing company by email or creates a new one
- After registering, loads interviews via `GET /api/company/{companyId}/interviews`
- Lists all interviews with status badges and overall score
- **"+ New Interview"** button → `/hr/create`

### 2. Create Interview (`/hr/create`)

Single form with 3 sections:

- **Company Details** — name, email
- **Job Description** — title, full JD text
- **Candidate Details** — name, email

On submit → `POST /api/interview` triggers a multi-step backend pipeline:

1. Find or create company in DB
2. **AI parses the job description** — extracts title, skills list, experience level, maps skills to 19 predefined technical subjects
3. Store `JobDescription` row in DB
4. **AI generates questions** — scenario-based questions matched to skills and level
5. Create `Interview` + `Question` rows in DB
6. Returns candidate link: `/interview/{interviewId}`

UI shows the link to copy/share with the candidate.

### 3. Interview Review (`/hr/interview/{id}`)

- Loads full interview via `GET /api/interview/{id}`
- Shows job title, candidate info, experience level, status, overall score (color-coded)
- Lists all questions with their answers, AI scores, and AI feedback
- **"← Back to Dashboard"** → `/hr`

---

## Candidate Flow (1 page, progressive)

### Candidate Interview (`/interview/{id}`)

- Loads interview via `GET /api/interview/{id}`
- **Progress bar** at top — shows question X of N
- One question at a time, sequential flow:

1. Shows question with subject tag
2. Candidate types answer in textarea
3. **Submit Answer** → `POST /api/interview/{id}/answer`:
   - Saves answer to DB
   - **AI evaluates** on: technical accuracy, depth, practical experience, communication clarity
   - Returns score (0–100) + detailed feedback
   - Updates interview status to `in_progress`
4. Shows feedback screen: submitted answer, score, and AI feedback
5. **"Next Question →"** or **"Complete Interview"** on last question
6. On complete → `POST /api/interview/{id}/complete`:
   - Averages all question scores → `overallScore`
   - Sets status to `completed`
   - Shows "Interview Complete!" screen with final score

---

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/company` | Register / find company |
| `GET` | `/api/company/{id}/interviews` | List interviews for a company |
| `POST` | `/api/interview` | Create interview (JD parsing + question generation via AI) |
| `GET` | `/api/interview/{id}` | Get full interview with questions & answers |
| `POST` | `/api/interview/{id}/answer` | Submit & AI-evaluate an answer |
| `POST` | `/api/interview/{id}/complete` | Finalize interview, calculate overall score |

---

## Database Schema

```
Company → JobDescription → Interview → Question → Answer
```

Each model cascading with foreign keys. SQLite via Prisma.

---

## AI Integration (`lib/ai.ts`)

Three AI calls in the flow:

| Step | What it does |
|------|-------------|
| **JD Parsing** | Extracts title, skills, experience level, and subject mapping from raw JD text |
| **Question Generation** | Creates scenario-based questions mapped to 19 technical subjects |
| **Answer Evaluation** | Scores each answer 0–100 with detailed feedback |

Configurable via environment variables: `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`.

---

## Complete User Journey

```
Landing Page → HR Portal (register company)
                    ↓
            Create Interview (fill form)
                    ↓
            AI parses JD + generates questions
                    ↓
            Share link with candidate
                    ↓
       ┌────────────────────────────┐
       │  Candidate answers Q1      │
       │      → AI evaluates        │
       │      → Shows feedback      │
       │      → Next Question       │
       └────────────────────────────┘
              ↓ (repeat for all Qs)
       Interview Complete → Overall Score
              ↓
       HR views results in dashboard
       → per-interview detail page
```
