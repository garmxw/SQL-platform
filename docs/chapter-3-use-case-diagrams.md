# Chapter 3 — Analysis & Conception: Use Case Diagrams

This section provides four use case diagrams for the SQL Learning Platform in:
- **Textual format** (PlantUML)
- **Visual description format** (actors, relations, preconditions, postconditions)

---

## 2.1 Global Use Case Diagram

### PlantUML
```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor Learner
actor Admin
actor System

rectangle "SQL Learning Platform" {
  usecase "Authenticate" as UC_AUTH
  usecase "Browse Learning Tracks" as UC_TRACKS
  usecase "Practice SQL in Editor" as UC_EDITOR
  usecase "Run Query" as UC_RUN
  usecase "Submit Solution" as UC_SUBMIT
  usecase "Track XP & Progress" as UC_PROGRESS
  usecase "View Leaderboard" as UC_LEADERBOARD
  usecase "Earn Badges" as UC_BADGES
  usecase "Manage Content" as UC_CONTENT
  usecase "Manage Users" as UC_USERS
  usecase "View Platform Analytics" as UC_ANALYTICS
  usecase "Execute SQL Sandbox" as UC_SANDBOX
}

Learner --> UC_AUTH
Learner --> UC_TRACKS
Learner --> UC_EDITOR
Learner --> UC_SUBMIT
Learner --> UC_PROGRESS
Learner --> UC_LEADERBOARD
Learner --> UC_BADGES

Admin --> UC_AUTH
Admin --> UC_CONTENT
Admin --> UC_USERS
Admin --> UC_ANALYTICS

System --> UC_SANDBOX
System --> UC_PROGRESS

UC_EDITOR .> UC_RUN : <<include>>
UC_SUBMIT .> UC_RUN : <<include>>
UC_SUBMIT .> UC_PROGRESS : <<include>>
UC_PROGRESS .> UC_BADGES : <<extend>>
@enduml
```

### Visual Description
- **Actors:** Learner, Admin, System
- **Learner capabilities:** authentication, track navigation, SQL practice, submission, progress/XP, leaderboard, badges
- **Admin capabilities:** content management, user management, analytics
- **System capabilities:** sandbox execution and automatic progress recalculation
- **Key relations:**
  - `Practice SQL in Editor` **includes** `Run Query`
  - `Submit Solution` **includes** `Run Query` and `Track XP & Progress`
  - `Earn Badges` **extends** `Track XP & Progress`

**Preconditions**
- Platform is available and backend services are running.
- User has an account for authenticated actions.

**Postconditions**
- User activity is persisted (submissions/progress where relevant).
- System updates XP, leaderboard, and badge eligibility when conditions are met.

---

## 2.2 Learner Use Case Diagram

### PlantUML
```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor Learner

rectangle "Learner Module" {
  usecase "Register/Login" as LU_AUTH
  usecase "Browse Tracks & Lessons" as LU_BROWSE
  usecase "Open SQL Problem" as LU_OPEN
  usecase "Use SQL Editor (Monaco)" as LU_EDITOR
  usecase "Run Query" as LU_RUN
  usecase "Submit SQL Answer" as LU_SUBMIT
  usecase "Get Auto Feedback" as LU_FEEDBACK
  usecase "Use Hint" as LU_HINT
  usecase "View Solution" as LU_SOLUTION
  usecase "Gain XP / Lose XP" as LU_XP
  usecase "Unlock Badge" as LU_BADGE
  usecase "Check Leaderboard" as LU_LEADERBOARD
  usecase "View Profile Progress" as LU_PROFILE
}

Learner --> LU_AUTH
Learner --> LU_BROWSE
Learner --> LU_OPEN
Learner --> LU_EDITOR
Learner --> LU_SUBMIT
Learner --> LU_HINT
Learner --> LU_SOLUTION
Learner --> LU_LEADERBOARD
Learner --> LU_PROFILE

LU_EDITOR .> LU_RUN : <<include>>
LU_SUBMIT .> LU_RUN : <<include>>
LU_SUBMIT .> LU_FEEDBACK : <<include>>
LU_SUBMIT .> LU_XP : <<include>>
LU_HINT .> LU_XP : <<include>>
LU_SOLUTION .> LU_XP : <<include>>
LU_XP .> LU_BADGE : <<extend>>
@enduml
```

### Visual Description
- **Primary actor:** Learner
- **Core flow:** learner opens a problem, writes SQL in Monaco editor, runs query, submits, receives feedback, and gets XP/badges
- **Gamification integration:** hints and solution viewing apply XP penalties; successful submissions increase XP and can trigger badges
- **Progress visibility:** learner views profile progression and leaderboard ranking

**Preconditions**
- Learner is authenticated.
- Target track/lesson/problem exists and is accessible.

**Postconditions**
- Submission and feedback are recorded.
- XP/level/badges/leaderboard state is updated based on result.

---

## 2.3 Admin Use Case Diagram

### PlantUML
```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor Admin

rectangle "Admin Module" {
  usecase "Admin Login" as AU_LOGIN
  usecase "Manage Tracks/Lessons" as AU_TRACKS
  usecase "Manage Problems" as AU_PROBLEMS
  usecase "Configure SQL Variants" as AU_SQLVAR
  usecase "Build Sandbox Templates" as AU_TEMPLATE
  usecase "Manage Exams & Badges" as AU_EXAMS
  usecase "Manage Users" as AU_USERS
  usecase "View Dashboard Analytics" as AU_ANALYTICS
  usecase "Monitor Submission Metrics" as AU_METRICS
}

Admin --> AU_LOGIN
Admin --> AU_TRACKS
Admin --> AU_PROBLEMS
Admin --> AU_EXAMS
Admin --> AU_USERS
Admin --> AU_ANALYTICS

AU_PROBLEMS .> AU_SQLVAR : <<include>>
AU_PROBLEMS .> AU_TEMPLATE : <<include>>
AU_ANALYTICS .> AU_METRICS : <<include>>
AU_EXAMS .> AU_PROBLEMS : <<extend>>
@enduml
```

### Visual Description
- **Primary actor:** Admin
- **Content domain:** CRUD over tracks, lessons, SQL problems, exams, badges
- **Operational domain:** user moderation and platform analytics
- **Automation relation:** saving/updating problems includes SQL variant configuration and template build for fast learner execution

**Preconditions**
- Admin is authenticated and has admin role.
- Required platform services (database/executor) are online.

**Postconditions**
- Learning content and platform configuration are persisted.
- User/account/status changes and analytics views are updated.

---

## 2.4 System Use Case Diagram

### PlantUML
```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Frontend (Next.js)" as FE
actor "Docker Engine" as DOCKER
actor "PostgreSQL DB" as DB
actor "Auth/JWT Layer" as AUTH

rectangle "Backend System (Express)" {
  usecase "Validate Auth Token" as SU_AUTH
  usecase "Load Problem SQL Variants" as SU_VARIANTS
  usecase "Clone Template DB" as SU_CLONE
  usecase "Execute SQL Query" as SU_EXEC
  usecase "Compare Expected Result" as SU_COMPARE
  usecase "Persist Submission" as SU_SAVE
  usecase "Update XP/Level/Badges" as SU_XP
  usecase "Update Leaderboard" as SU_LEADERBOARD
  usecase "Handle Execution Errors" as SU_ERRORS
  usecase "Cleanup Sandbox" as SU_CLEANUP
}

FE --> SU_AUTH
FE --> SU_EXEC
FE --> SU_SAVE
AUTH --> SU_AUTH
DB --> SU_VARIANTS
DB --> SU_SAVE
DOCKER --> SU_CLONE
DOCKER --> SU_EXEC
DOCKER --> SU_CLEANUP

SU_EXEC .> SU_CLONE : <<include>>
SU_SAVE .> SU_COMPARE : <<include>>
SU_SAVE .> SU_XP : <<include>>
SU_XP .> SU_LEADERBOARD : <<include>>
SU_EXEC .> SU_CLEANUP : <<include>>
SU_ERRORS .> SU_EXEC : <<extend>>
@enduml
```

### Visual Description
- **Technical actors:** Frontend (Next.js), Docker Engine, PostgreSQL DB, Auth/JWT layer
- **Execution pipeline:** token validation → load SQL variants → clone sandbox template → execute query → compare output (for submissions) → persist result → update XP/badges/leaderboard → cleanup sandbox
- **Error behavior:** execution and container/runtime failures are handled by dedicated error handling flow that extends execution behavior

**Preconditions**
- Auth secret, DB connection, and Docker services are available.
- Problem templates/sql variants exist for selected dialect.

**Postconditions**
- Query execution result is returned to frontend.
- Submission lifecycle is fully persisted and sandbox resources are cleaned up.

