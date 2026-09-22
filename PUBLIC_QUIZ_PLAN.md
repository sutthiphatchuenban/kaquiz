# Public Quiz — แผน実装 (Library + Publish + Fork + Host)

> สถานะปัจจุบัน: มี `Quiz.isPublished` ใน schema แต่ไม่มี flow ใช้งานจริง (`GET /api/quizzes` filter แค่ `userId`, ไม่มี public API/UI)
> เป้าหมาย: เจ้าของกดเผยแพร่ → คนอื่นค้นหา/ดู/เอาไปโฮสต์/ก๊อปมาแก้ของตัวเองได้
> อ้างอิง roadmap เดิม: `README.md:248-257`, idea `POST /publish` ใน `design.md:334`

---

## 1. Scope

### V1 (ทำรอบนี้)
- [ ] Toggle เผยแพร่/ยกเลิกเผยแพร่ (เจ้าของเท่านั้น)
- [ ] หน้าคลังสาธารณะ `/library` + ค้นหา + filter + sort + pagination
- [ ] หน้ารายละเอียด `/library/[id]`
- [ ] ปุ่ม **โฮสต์เลย** (เล่น quiz คนอื่นได้โดยไม่ต้องก๊อป)
- [ ] ปุ่ม **คัดลอกมาแก้** (fork deep-copy เป็นของตัวเอง)
- [ ] นับ `playCount` / `copyCount` อย่างง่าย

### V2 (ไม่ทำรอบนี้)
- หมวดหมู่แบบ taxonomy เต็ม, tag หลายอัน, ระดับความยากแบบ enum + filter ขั้นสูง
- Like / rating / report / moderation queue
- Full-text search (pg_trgm / meili), CSV export ของ public quiz
- Admin review ก่อน publish

---

## 2. สถาปัตย์เดิมที่กระทบ

| จุด | ไฟล์ | พฤติกรรมเดิม | ต้องเปลี่ยน |
|---|---|---|---|
| List quiz | `src/app/api/quizzes/route.ts:39-47` | `where: {userId}` | คงเดิม, แยก route public ใหม่ ไม่แตะของเดิม |
| Detail quiz | `src/app/api/quizzes/[id]/route.ts:31-65` | owner-only 403 ถ้าไม่ใช่เจ้าของ | คงเดิม, สร้าง `GET /api/quizzes/public/[id]` แยก |
| สร้างห้อง | `src/app/api/games/route.ts:66-71` | `quiz.userId !== userId → 403` | อนุญาตเพิ่ม: `owner OR quiz.isPublished` |
| Validation | `src/lib/validations/quiz.ts:27-35` | มี `isPublished` แล้ว | เพิ่ม `category/difficulty` optional |
| UI ของฉัน | `src/app/(dashboard)/quizzes/page.tsx` | โชว์แค่ของตัวเอง ไม่มี badge publish | เพิ่ม badge + ปุ่ม publish + ลิงก์ไป library |
| Edit | `src/app/(dashboard)/quizzes/[id]/edit/page.tsx` | ไม่มีสวิตช์ publish | เพิ่มสวิตช์ + เงื่อนไข (ต้องมี ≥1 ข้อ) |
| Middleware | `src/middleware.ts` | กัน `/dashboard,/quizzes,/reports,/admin` | เปิด `/library` เป็น public (ไม่ต้อง login ก็ดูได้, แต่ host/fork ต้อง login) |

---

## 3. DB Design

### 3.1 ใช้ของเดิม
```prisma
isPublished Boolean @default(false) // มีแล้ว
```

### 3.2 Migration ใหม่ (minimal)
```prisma
model Quiz {
  // ...เดิม
  isPublished  Boolean   @default(false)
  category     String?   // v1: free-text + datalist, v2 ค่อยเป็น enum/table
  difficulty   String?   // "ง่าย" | "ปานกลาง" | "ยาก" — v1 เก็บ string ธรรมดา
  publishedAt  DateTime? // set ตอน publish ครั้งแรก, null ตอน unpublish? เก็บไว้ sort ได้
  playCount    Int       @default(0) // increment ตอน POST /api/games สำเร็จ
  copyCount    Int       @default(0) // increment ตอน fork สำเร็จ
  forkedFromId String?
  forkedFrom   Quiz?     @relation("QuizFork", fields: [forkedFromId], references: [id], onDelete: SetNull)
  forks        Quiz[]    @relation("QuizFork")

  @@index([isPublished, updatedAt])
  @@index([isPublished, playCount])
  @@index([category])
}
```

> ถ้าอยากออกของเร็วสุดแบบ zero-migration: ใช้แค่ `isPublished` + `_count.gameSessions` แทน `playCount`, ไม่ต้องมี `category/difficulty/fork` ในรอบแรก แล้วค่อย migrate ทีหลังได้

### 3.3 กฎ
- publish ได้ต้องมี `questions >= 1`
- unpublish ไม่ลบห้องที่เปิดไปแล้ว (GameSession เดิมเล่นต่อได้)
- ลบ quiz ต้นฉบับ → fork ที่ก๊อปไปแล้วไม่ถูกลบ (`SetNull`)
- fork ของ fork ได้ (เก็บแค่ parent ชั้นเดียวพอ)

---

## 4. API Design (V1)

### 4.1 `PATCH /api/quizzes/[id]/publish` (auth, owner only)
```json
// request
{ "isPublished": true, "category": "วิทยาศาสตร์", "difficulty": "ปานกลาง" }
// response
{ "success": true, "data": { "id": "...", "isPublished": true, "publishedAt": "..." } }
```
- Logic:
  1. `getUserFromToken()` → 401 ถ้าไม่ login
  2. หา quiz → 404 / 403 ถ้าไม่ใช่เจ้าของ
  3. ถ้า `isPublished=true` ตรวจ `count questions >= 1` → 400 ถ้าไม่ผ่าน
  4. `publishedAt = now()` ตอน publish, คงค่าเดิมตอน unpublish? แนะนำ: set `null` ตอน unpublish เพื่อ sort ง่าย
- แทน `POST /:id/publish` ใน design เก่าด้วย `PATCH` ให้ตรง REST เดิม (`PUT /api/quizzes/[id]` มีอยู่แล้ว แต่แยก route ชัดกว่า)

### 4.2 `GET /api/quizzes/public` (public, ไม่ต้อง login)
```
GET /api/quizzes/public?search=ฟิสิกส์&category=วิทยาศาสตร์&difficulty=ง่าย&sort=newest|popular|copied&page=1&limit=12
```
Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "...", "title": "...", "description": "...",
      "category": "...", "difficulty": "...",
      "coverImage": null, "publishedAt": "...",
      "author": { "name": "..." },
      "_count": { "questions": 10, "gameSessions": 5 },
      "playCount": 5, "copyCount": 2
    }
  ],
  "pagination": { "page": 1, "limit": 12, "total": 42, "totalPages": 4 }
}
```
- `where: { isPublished: true }` เสมอ
- `search` → `OR: [{title contains}, {description contains}]` (`mode: insensitive`)
- `limit` clamp `1..50`, default `12`
- `sort`: `newest → publishedAt desc`, `popular → playCount desc`, `copied → copyCount desc`
- ห้าม select `questions.answers.isCorrect` ใน list (ประหยัด + กันโกง)

### 4.3 `GET /api/quizzes/public/[id]` (public)
- Return quiz + author + `_count` + `questions` preview
- **สำคัญ:** strip `isCorrect` ออกก่อนส่ง (เหมือน `GET /api/games/[pin]` ที่ซ่อนเฉลยให้ player)
```ts
questions: quiz.questions.map(q => ({
  ...q,
  answers: q.answers.map(({isCorrect, ...a}) => a)
}))
```
- ถ้า `isPublished=false` → 404 (ซ่อนของ private) ยกเว้น owner เรียกดูเอง → ให้ไปใช้ `GET /api/quizzes/[id]` เดิมแทน

### 4.4 `POST /api/quizzes/[id]/fork` (auth)
- ใครก็ได้ที่ login (ยกเว้นเจ้าของ — เจ้าของกด edit ของตัวเองอยู่แล้ว, ถ้ากดก็ return error หรือ redirect ไป edit)
- quiz ต้นฉบับต้อง `isPublished=true`
- ทำ transaction เดียว:
```ts
await prisma.$transaction(async (tx) => {
  const src = await tx.quiz.findUnique({ where:{id}, include:{ questions:{ include:{ answers:true } } } });
  // check published
  const copy = await tx.quiz.create({ data:{ title: src.title + " (สำเนา)", description: src.description, category: src.category, difficulty: src.difficulty, isPublished: false, userId: me, forkedFromId: src.id } });
  for (const q of src.questions) {
    const nq = await tx.question.create({ data:{ quizId: copy.id, questionText: q.questionText, type: q.type, timeLimit: q.timeLimit, points: q.points, imageUrl: q.imageUrl, order: q.order } });
    await tx.answer.createMany({ data: q.answers.map(a => ({ questionId: nq.id, answerText: a.answerText, isCorrect: a.isCorrect, color: a.color, order: a.order })) });
  }
  await tx.quiz.update({ where:{id}, data:{ copyCount:{ increment:1 } } });
  return copy;
});
```
- Response `201 { id: newId }` → client `router.push(/quizzes/newId/edit)`

### 4.5 แก้ `POST /api/games` (`src/app/api/games/route.ts:66-71`)
```ts
// เดิม: if (quiz.userId !== userId) 403
// ใหม่:
if (quiz.userId !== userId && !quiz.isPublished) 403
// + หลัง create session:
await prisma.quiz.update({ where:{id: quizId}, data:{ playCount:{ increment:1 } } });
```
- Host ของ public quiz = ใครก็ได้ที่ login (hostId = คนกดโฮสต์, ไม่ใช่เจ้าของ quiz)

---

## 5. UI/UX

### 5.1 `/library` (public page, อยู่ใน `(game)` หรือ route ใหม่นอก dashboard)
- Layout: `PageHeading overline="02 / PUBLIC LIBRARY"` + search input + category select + difficulty chips + sort select
- Grid card เหมือน `/quizzes` แต่เพิ่ม: ชื่อผู้แต่ง, จำนวนข้อ, เล่นไปกี่ครั้ง, ก๊อปไปกี่ครั้ง, badge หมวด/ยาก
- Debounce search 300ms, `useSearchParams` เก็บ state ไว้แชร์ลิงก์ได้
- Skeleton ตอนโหลด, EmptyState "ยังไม่มี quiz สาธารณะ"
- ไม่ login ก็ดูได้, แต่ปุ่ม Host/Fork → ถ้าไม่ login → `router.push(/login?redirect=/library/[id])`

### 5.2 `/library/[id]`
- Header: cover/title/desc/author/publishedAt/stats
- Preview คำถาม (ไม่โชว์เฉลย): `Q1. ... [4 ตัวเลือก] (20s, 1000pts)`
- Actions: `[โฮสต์เลย] [คัดลอกมาแก้]` + ถ้าเป็นเจ้าของเองโชว์ `[แก้ไขของฉัน]` แทน
- Host flow: `POST /api/games {quizId}` → `router.replace(/host/pin)` (reuse หน้า host เดิมได้เลย ไม่ต้องสร้างใหม่)

### 5.3 `/quizzes` (ของฉัน) — เพิ่ม
- Badge `สาธารณะ` / `ส่วนตัว` บน card
- ปุ่ม toggle publish (Globe / Lock icon) + confirm dialog ถ้า unpublish
- Toast success + optimistic update

### 5.4 `/quizzes/[id]/edit` — เพิ่ม
- Card "การเผยแพร่": Switch + category input (datalist) + difficulty select + คำเตือน "ต้องมีอย่างน้อย 1 ข้อ"
- Save ผ่าน `PATCH /publish` แยกจาก `PUT` ข้อมูล quiz

### 5.5 Nav
- เพิ่มลิงก์ `คลังสาธารณะ` ใน header/landing (`/library`)
- Middleware: ไม่ต้องเพิ่ม `/library` ใน protected list (public by default)

---

## 6. Validation (Zod)

```ts
// เพิ่มใน src/lib/validations/quiz.ts
export const publishQuizSchema = z.object({
  isPublished: z.boolean(),
  category: z.string().max(50).optional().nullable().or(z.literal("")),
  difficulty: z.enum(["ง่าย","ปานกลาง","ยาก"]).optional().nullable(),
});
export const publicQuerySchema = z.object({
  search: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  difficulty: z.enum(["ง่าย","ปานกลาง","ยาก"]).optional(),
  sort: z.enum(["newest","popular","copied"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
```

---

## 7. Security / Edge Cases

| เคส | วิธีรับมือ |
|---|---|
| ส่องเฉลยผ่าน public API | strip `isCorrect` ทุก response public |
| กด publish quiz เปล่า | block 400 `ต้องมีคำถามอย่างน้อย 1 ข้อ` |
| เจ้าของ unpublish ระหว่างมีห้อง LOBBY | ห้องเดิมเล่นต่อได้, แต่ค้นหาไม่เจอแล้ว |
| fork แล้วแก้ต้นฉบับ | fork เป็น snapshot ขาดการเชื่อม (ไม่ sync ตาม) |
| สแปม fork/play ปั่น count | V1 ยอมได้ (ไม่มี rate-limit), V2 ค่อยใส่ rate-limit + dedupe per user |
| XSS/ยาวเกิน | Zod limit title 100 / desc 500 / category 50 เหมือนเดิม |
| แย่งชื่อซ้ำ | ไม่ต้อง unique, อนุญาตซ้ำได้ |

---

## 8. Test Plan (manual, ไม่มี test suite ตอนนี้)

- [ ] สร้าง quiz 0 ข้อ → publish → ต้อง 400
- [ ] สร้าง quiz 3 ข้อ → publish → ขึ้น `/library`, `GET /public` เจอ, `GET /public/[id]` ไม่เห็น `isCorrect`
- [ ] ไม่ login เปิด `/library` ได้, กด Host → โดนส่งไป login
- [ ] login user B → Host quiz ของ A ได้ → `playCount+1`, PIN เล่นได้จบเกม
- [ ] login user B → Fork → ได้ quiz ใหม่ของ B (isPublished=false), `copyCount+1`, คำถาม/เฉลยครบ, แก้ของ B ไม่กระทบของ A
- [ ] เจ้าของ unpublish → หายจาก `/library`, ห้องเก่ายังเล่นได้, fork เก่ายังอยู่
- [ ] search/filter/sort/pagination ตรง (limit 50, page เกิน → data [])
- [ ] เจ้าของลบ quiz → fork ของคนอื่นยังอยู่ (`forkedFromId` → null)

---

## 9. งานเป็นเฟส + ไฟล์ที่แตะ

### Phase A — DB + Publish toggle (½ วัน)
1. `prisma/schema.prisma` + `npx prisma migrate dev --name add_public_quiz_fields`
2. `src/lib/validations/quiz.ts` (+ publish/public query schema)
3. `src/app/api/quizzes/[id]/publish/route.ts` (ใหม่ — PATCH)
4. `src/app/(dashboard)/quizzes/page.tsx` (+ badge + toggle)
5. `src/app/(dashboard)/quizzes/[id]/edit/page.tsx` (+ card เผยแพร่)

### Phase B — Public read (½ วัน)
6. `src/app/api/quizzes/public/route.ts` (ใหม่ — GET list)
7. `src/app/api/quizzes/public/[id]/route.ts` (ใหม่ — GET detail strip เฉลย)
8. `src/app/(game)/library/page.tsx` (ใหม่)
9. `src/app/(game)/library/[id]/page.tsx` (ใหม่)
10. Nav + landing link → `/library`

### Phase C — Fork + Host public (½ วัน)
11. `src/app/api/quizzes/[id]/fork/route.ts` (ใหม่ — POST transaction)
12. แก้ `src/app/api/games/route.ts:66-71` (allow published + increment playCount)
13. ปุ่ม Host/Fork บน `/library/[id]` + redirect logic
14. `README.md` อัปเดต roadmap (ลบ "ยังไม่เปิดใช้งาน")

### Acceptance V1
- publish/unpublish ได้, ขึ้น library ภายใน 5s
- ค้นหา/filter/sort/page ได้
- user อื่น host ได้จบเกม, fork ได้ครบทุกข้อพร้อมเฉลย
- public API ไม่หลุด `isCorrect`

---

## 10. คำถามค้าง (ต้องเลือกก่อนลงมือ)

1. `/library` ให้คนไม่ login ดูได้เลยไหม? (แนะนำ: ได้ — ตรงคอนเซปต์คลังสาธารณะ)
2. โชว์เฉลยใน preview ไหม? (แนะนำ: ไม่ — กันโกง + ตรงกับ player view)
3. `category` ให้พิมพ์เองหรือ fix list? (แนะนำ V1: input + datalist: วิทย์/คณิต/ภาษา/สังคม/อื่นๆ)
4. ต้องมี `playCount/copyCount` แยกไหม หรือใช้ `_count.gameSessions` พอ? (แนะนำ: มีแยก — sort ง่าย ไม่ต้อง join หนักตอน list)
