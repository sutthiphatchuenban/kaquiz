# KaQuiz - System Design Document

> 🎮 **KaQuiz** - Real-time Interactive Quiz Platform  
> Version: 1.0.0  
> Last Updated: 2026-01-29

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Core Features](#core-features)
4. [Database Schema](#database-schema)
5. [API Design](#api-design)
6. [Page Structure](#page-structure)
7. [Real-time Architecture](#real-time-architecture)
8. [Authentication Flow](#authentication-flow)
9. [UI/UX Guidelines](#uiux-guidelines)

---

## 🎯 Project Overview

### Vision
KaQuiz เป็นแพลตฟอร์มทำ Quiz แบบ Real-time ที่ผู้ใช้สามารถสร้าง Quiz, แชร์ให้เพื่อน และเล่นพร้อมกันได้ทันที เหมาะสำหรับการเรียนการสอน, การฝึกอบรม, หรือความสนุกในกลุ่มเพื่อน

### Key Objectives
- ✅ สร้าง Quiz ได้ง่ายและรวดเร็ว
- ✅ เล่นพร้อมกันแบบ Real-time
- ✅ ระบบคะแนนและ Leaderboard
- ✅ รองรับหลายประเภทคำถาม
- ✅ UI/UX ที่สวยงามและใช้งานง่าย

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React Framework with App Router |
| **TypeScript** | Type Safety |
| **Tailwind CSS 4** | Styling |
| **shadcn/ui** | UI Components |
| **Lucide React** | Icons |
| **Socket.io Client** | Real-time Communication |
| **Zustand** | State Management |
| **React Hook Form** | Form Handling |
| **Zod** | Schema Validation |

### Backend
| Technology | Purpose |
|------------|---------|
| **Next.js API Routes** | RESTful API |
| **Prisma ORM** | Database Access |
| **PostgreSQL** | Primary Database |
| **Socket.io** | WebSocket Server |
| **NextAuth.js** | Authentication |
| **bcrypt** | Password Hashing |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **Vercel** | Hosting & Deployment |
| **Supabase / Neon** | PostgreSQL Database |
| **Upstash Redis** | Session & Cache (optional) |

---

## 🚀 Core Features

### 1. Quiz Management (Host)
- สร้าง Quiz ใหม่พร้อมตั้งชื่อและคำอธิบาย
- เพิ่ม/แก้ไข/ลบคำถามได้
- รองรับหลายประเภทคำถาม:
  - **Multiple Choice** (4 ตัวเลือก)
  - **True/False**
  - **Type Answer** (พิมพ์คำตอบ)
- ตั้งเวลาต่อคำถาม (5-60 วินาที)
- ตั้งคะแนนต่อคำถาม
- เพิ่มรูปภาพประกอบคำถาม
- บันทึกเป็น Draft หรือ Publish

### 2. Game Session (Live Play)
- สร้าง Game PIN สำหรับเข้าร่วม
- Lobby รอผู้เล่นเข้าร่วม
- แสดงคำถามพร้อมกันทุกคน
- นับถอยหลังเวลาตอบ
- แสดงผลคำตอบหลังจบแต่ละข้อ
- Leaderboard อัปเดตแบบ Real-time
- สรุปผลเมื่อจบเกม

### 3. Player Experience
- เข้าร่วมด้วย Game PIN
- ใส่ชื่อเล่น (Nickname)
- เห็นตัวเลือกบนหน้าจอตัวเอง
- ตอบคำถามด้วยการกดปุ่ม
- เห็นคะแนนและอันดับตัวเอง

### 4. Reports & Analytics
- ดูประวัติเกมที่เคยเล่น
- สถิติคำตอบถูก/ผิดของผู้เล่น
- Export ผลคะแนนเป็น CSV
- ดูคำถามที่ผู้เล่นตอบผิดบ่อย

### 5. User Management
- ลงทะเบียน / เข้าสู่ระบบ
- แก้ไขโปรไฟล์
- ดู Quiz ที่สร้างไว้
- ดูประวัติการเล่น

---

## 🗄 Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │    Quiz     │       │  Question   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │──┐    │ id          │──┐    │ id          │
│ email       │  │    │ title       │  │    │ quizId      │──┐
│ password    │  └───▶│ userId      │  └───▶│ questionText│  │
│ name        │       │ description │       │ type        │  │
│ avatar      │       │ coverImage  │       │ timeLimit   │  │
│ createdAt   │       │ isPublished │       │ points      │  │
│ updatedAt   │       │ createdAt   │       │ imageUrl    │  │
└─────────────┘       │ updatedAt   │       │ order       │  │
                      └─────────────┘       └─────────────┘  │
                                                             │
┌─────────────┐       ┌─────────────┐       ┌─────────────┐  │
│   Answer    │       │ GameSession │       │   Player    │  │
├─────────────┤       ├─────────────┤       ├─────────────┤  │
│ id          │◀──────│ id          │──┐    │ id          │  │
│ questionId  │───────│ quizId      │  │    │ sessionId   │──┘
│ answerText  │       │ hostId      │  └───▶│ nickname    │
│ isCorrect   │       │ pin         │       │ score       │
│ color       │       │ status      │       │ rank        │
│ order       │       │ currentQ    │       │ joinedAt    │
└─────────────┘       │ startedAt   │       └─────────────┘
                      │ endedAt     │
                      └─────────────┘
                             │
                             ▼
                      ┌─────────────┐
                      │PlayerAnswer │
                      ├─────────────┤
                      │ id          │
                      │ playerId    │
                      │ questionId  │
                      │ answerId    │
                      │ isCorrect   │
                      │ responseTime│
                      │ pointsEarned│
                      │ answeredAt  │
                      └─────────────┘
```

### Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String        @id @default(cuid())
  email        String        @unique
  password     String
  name         String
  avatar       String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  
  quizzes      Quiz[]
  gameSessions GameSession[]
}

model Quiz {
  id          String   @id @default(cuid())
  title       String
  description String?
  coverImage  String?
  isPublished Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  questions   Question[]
  gameSessions GameSession[]

  @@index([userId])
}

model Question {
  id           String   @id @default(cuid())
  questionText String
  type         QuestionType @default(MULTIPLE_CHOICE)
  timeLimit    Int      @default(20) // seconds
  points       Int      @default(1000)
  imageUrl     String?
  order        Int

  quizId       String
  quiz         Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)

  answers      Answer[]
  playerAnswers PlayerAnswer[]

  @@index([quizId])
}

enum QuestionType {
  MULTIPLE_CHOICE
  TRUE_FALSE
  TYPE_ANSWER
}

model Answer {
  id         String   @id @default(cuid())
  answerText String
  isCorrect  Boolean  @default(false)
  color      String   @default("#EF4444") // red, blue, green, yellow
  order      Int

  questionId String
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  playerAnswers PlayerAnswer[]

  @@index([questionId])
}

model GameSession {
  id          String      @id @default(cuid())
  pin         String      @unique
  status      GameStatus  @default(LOBBY)
  currentQuestionIndex Int @default(0)
  startedAt   DateTime?
  endedAt     DateTime?
  createdAt   DateTime    @default(now())

  quizId      String
  quiz        Quiz        @relation(fields: [quizId], references: [id])

  hostId      String
  host        User        @relation(fields: [hostId], references: [id])

  players     Player[]

  @@index([pin])
  @@index([quizId])
  @@index([hostId])
}

enum GameStatus {
  LOBBY
  PLAYING
  QUESTION
  SHOWING_ANSWER
  LEADERBOARD
  FINISHED
}

model Player {
  id        String   @id @default(cuid())
  nickname  String
  score     Int      @default(0)
  rank      Int      @default(0)
  joinedAt  DateTime @default(now())

  sessionId String
  session   GameSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  answers   PlayerAnswer[]

  @@index([sessionId])
}

model PlayerAnswer {
  id           String   @id @default(cuid())
  isCorrect    Boolean
  responseTime Int      // milliseconds
  pointsEarned Int      @default(0)
  answeredAt   DateTime @default(now())

  playerId     String
  player       Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)

  questionId   String
  question     Question @relation(fields: [questionId], references: [id])

  answerId     String?
  answer       Answer?  @relation(fields: [answerId], references: [id])

  @@index([playerId])
  @@index([questionId])
}
```

---

## 🔌 API Design

### Authentication APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | ลงทะเบียนผู้ใช้ใหม่ |
| POST | `/api/auth/login` | เข้าสู่ระบบ |
| POST | `/api/auth/logout` | ออกจากระบบ |
| GET | `/api/auth/me` | ดึงข้อมูลผู้ใช้ปัจจุบัน |

### Quiz APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quizzes` | ดึง Quiz ทั้งหมดของผู้ใช้ |
| GET | `/api/quizzes/:id` | ดึง Quiz เฉพาะตัว |
| POST | `/api/quizzes` | สร้าง Quiz ใหม่ |
| PUT | `/api/quizzes/:id` | แก้ไข Quiz |
| DELETE | `/api/quizzes/:id` | ลบ Quiz |
| POST | `/api/quizzes/:id/publish` | เผยแพร่ Quiz |

### Question APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quizzes/:quizId/questions` | ดึงคำถามทั้งหมด |
| POST | `/api/quizzes/:quizId/questions` | เพิ่มคำถามใหม่ |
| PUT | `/api/questions/:id` | แก้ไขคำถาม |
| DELETE | `/api/questions/:id` | ลบคำถาม |
| PUT | `/api/quizzes/:quizId/questions/reorder` | จัดลำดับคำถามใหม่ |

### Game Session APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/games` | สร้าง Game Session ใหม่ |
| GET | `/api/games/:pin` | ดึงข้อมูล Game ด้วย PIN |
| POST | `/api/games/:pin/join` | ผู้เล่นเข้าร่วมเกม |
| POST | `/api/games/:pin/start` | เริ่มเกม |
| POST | `/api/games/:pin/next` | ไปคำถามถัดไป |
| POST | `/api/games/:pin/end` | จบเกม |
| GET | `/api/games/:pin/leaderboard` | ดู Leaderboard |

### Player APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/games/:pin/answer` | ส่งคำตอบ |
| GET | `/api/players/:id/stats` | ดูสถิติผู้เล่น |

---

## 📄 Page Structure

### Public Pages
```
/                     → Landing Page (หน้าแรก)
/join                 → หน้าเข้าร่วมเกมด้วย PIN
/play/:pin            → หน้าเล่นเกม (Player View)
/auth/login           → หน้าเข้าสู่ระบบ
/auth/register        → หน้าลงทะเบียน
```

### Protected Pages (ต้อง Login)
```
/dashboard            → Dashboard ผู้ใช้
/quizzes              → รายการ Quiz ทั้งหมด
/quizzes/new          → สร้าง Quiz ใหม่
/quizzes/:id          → ดู/แก้ไข Quiz
/quizzes/:id/edit     → แก้ไข Quiz
/quizzes/:id/questions → จัดการคำถาม
/host/:pin            → หน้าจอสำหรับ Host (แสดงบนจอใหญ่)
/reports              → รายงานและสถิติ
/reports/:sessionId   → รายงานเกมเฉพาะรอบ
/profile              → โปรไฟล์ผู้ใช้
/settings             → ตั้งค่า
```

---

## ⚡ Real-time Architecture

### Socket.io Events

#### Host → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `host:create-room` | `{ quizId, pin }` | สร้างห้องเกม |
| `host:start-game` | `{ pin }` | เริ่มเกม |
| `host:next-question` | `{ pin }` | ไปคำถามถัดไป |
| `host:show-answer` | `{ pin }` | แสดงเฉลย |
| `host:show-leaderboard` | `{ pin }` | แสดง Leaderboard |
| `host:end-game` | `{ pin }` | จบเกม |

#### Server → Host
| Event | Payload | Description |
|-------|---------|-------------|
| `game:player-joined` | `{ player }` | มีผู้เล่นเข้ามา |
| `game:player-left` | `{ playerId }` | ผู้เล่นออกไป |
| `game:answer-received` | `{ count, total }` | มีคำตอบเข้ามา |
| `game:all-answered` | `{}` | ทุกคนตอบแล้ว |

#### Player → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `player:join` | `{ pin, nickname }` | เข้าร่วมเกม |
| `player:answer` | `{ questionId, answerId, time }` | ส่งคำตอบ |
| `player:leave` | `{ pin }` | ออกจากเกม |

#### Server → Player
| Event | Payload | Description |
|-------|---------|-------------|
| `game:waiting` | `{}` | รอ Host เริ่มเกม |
| `game:started` | `{}` | เกมเริ่มแล้ว |
| `game:question` | `{ question, answers, timeLimit }` | คำถามใหม่ |
| `game:time-up` | `{}` | หมดเวลา |
| `game:result` | `{ isCorrect, points, rank }` | ผลคำตอบ |
| `game:leaderboard` | `{ leaderboard }` | อันดับ |
| `game:ended` | `{ finalRank, totalScore }` | เกมจบ |

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        GAME FLOW                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │  LOBBY  │───▶│ PLAYING │───▶│QUESTION │───▶│ ANSWER  │  │
│  │         │    │         │    │         │    │         │  │
│  │ รอผู้เล่น │    │ เริ่มเกม │    │แสดงคำถาม│    │แสดงเฉลย │  │
│  └─────────┘    └─────────┘    └────┬────┘    └────┬────┘  │
│                                     │              │        │
│                                     │   ┌───────┐  │        │
│                                     │   │LEADER │  │        │
│                                     └──▶│ BOARD │◀─┘        │
│                                         └───┬───┘           │
│                                             │               │
│                           ┌─────────────────┴───────┐       │
│                           ▼                         ▼       │
│                     มีคำถามอีก               ไม่มีแล้ว       │
│                           │                         │       │
│                           ▼                         ▼       │
│                    ┌─────────┐              ┌─────────┐     │
│                    │QUESTION │              │FINISHED │     │
│                    │         │              │         │     │
│                    │คำถามถัดไป│              │ สรุปผล  │     │
│                    └─────────┘              └─────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

### Using NextAuth.js

```typescript
// Configuration
- Provider: Credentials (Email/Password)
- Session Strategy: JWT
- Token Expiry: 30 days
```

### Protected Routes Middleware
```typescript
// middleware.ts
- Check auth for: /dashboard/*, /quizzes/*, /host/*, /reports/*
- Redirect to /auth/login if not authenticated
- Store return URL for redirect after login
```

---

## 🎨 UI/UX Guidelines

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| **Primary** | `#4F46E5` (Indigo-600) | Buttons, Links, Accents |
| **Secondary** | `#7C3AED` (Purple-600) | Gradients, Highlights |
| **Success** | `#10B981` (Emerald-500) | Correct answers, Success |
| **Error** | `#EF4444` (Red-500) | Wrong answers, Errors |
| **Warning** | `#F59E0B` (Amber-500) | Warnings, Time running out |

### Answer Button Colors (Kahoot Style)
```
🔴 Red    - #EF4444
🔵 Blue   - #3B82F6
🟢 Green  - #22C55E
🟡 Yellow - #EAB308
```

### Typography
- **Headings**: Geist Sans, Bold
- **Body**: Geist Sans, Regular
- **Monospace**: Geist Mono (for PINs)

### Animations
- Page transitions: `fade-in` 300ms
- Button hover: `scale(1.02)` 150ms
- Card hover: `shadow-lg` transition
- Loading: Skeleton shimmer
- Correct answer: Confetti burst 🎉
- Wrong answer: Shake animation

### Responsive Breakpoints
```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

### Accessibility
- ✅ Keyboard navigation support
- ✅ ARIA labels for interactive elements
- ✅ Color contrast ratio ≥ 4.5:1
- ✅ Focus visible indicators
- ✅ Screen reader compatibility

---

## 📁 Project Structure

```
kaquiz/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
│   └── images/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── quizzes/
│   │   │   ├── reports/
│   │   │   └── profile/
│   │   ├── (game)/
│   │   │   ├── join/
│   │   │   ├── play/[pin]/
│   │   │   └── host/[pin]/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── quizzes/
│   │   │   ├── questions/
│   │   │   ├── games/
│   │   │   └── socket/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/           # shadcn components
│   │   ├── forms/        # Form components
│   │   ├── game/         # Game-specific components
│   │   ├── quiz/         # Quiz builder components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── prisma.ts     # Prisma client
│   │   ├── auth.ts       # Auth config
│   │   ├── socket.ts     # Socket.io client
│   │   ├── utils.ts      # Utility functions
│   │   └── validations/  # Zod schemas
│   ├── hooks/            # Custom React hooks
│   ├── stores/           # Zustand stores
│   └── types/            # TypeScript types
├── .env
├── .env.local
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

---

## 🚦 Implementation Phases

### Phase 1: Foundation (Week 1)
- [x] ตั้งค่าโปรเจกต์ Next.js + Tailwind + shadcn
- [ ] ตั้งค่า Prisma + PostgreSQL
- [ ] สร้าง Database Schema
- [ ] ตั้งค่า NextAuth.js
- [ ] สร้างหน้า Auth (Login/Register)

### Phase 2: Quiz Builder (Week 2)
- [ ] หน้า Dashboard
- [ ] CRUD Quiz
- [ ] CRUD Questions
- [ ] CRUD Answers
- [ ] Image Upload

### Phase 3: Game Engine (Week 3)
- [ ] ตั้งค่า Socket.io
- [ ] สร้าง Game Session
- [ ] หน้า Host (แสดงคำถาม)
- [ ] หน้า Player (ตอบคำถาม)
- [ ] ระบบคะแนน

### Phase 4: Polish & Deploy (Week 4)
- [ ] Leaderboard
- [ ] Reports
- [ ] Responsive Design
- [ ] Testing
- [ ] Deploy to Vercel

---

## 📝 Notes

### Performance Considerations
- ใช้ React Server Components เมื่อเป็นไปได้
- Lazy load components ที่ไม่จำเป็นตอนแรก
- Optimize images with Next.js Image
- Cache API responses ที่เหมาะสม

### Security Considerations
- ตรวจสอบ PIN collision ก่อนสร้าง
- Rate limiting สำหรับ API
- Input sanitization
- CSRF protection

---

*Document created for KaQuiz Development Team*
