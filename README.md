# KaQuiz

แพลตฟอร์มสร้างและเล่น Quiz แบบสด ผู้จัดสร้างคำถาม เปิดห้องด้วย Game PIN และให้ผู้เล่นเข้าร่วมผ่านโทรศัพท์ได้ทันที รองรับการสร้างคำถามด้วย AI, รายงานสรุปเกม และระบบผู้ดูแล

## ฟีเจอร์ปัจจุบัน

### บัญชีผู้ใช้

- สมัครสมาชิกและเข้าสู่ระบบด้วยอีเมล/รหัสผ่าน
- Authentication แบบ JWT ผ่าน HTTP-only cookie
- หน้าเข้าสู่ระบบ ลงทะเบียน ลืมรหัสผ่าน และตั้งรหัสผ่านใหม่
- หน้า Settings สำหรับดูข้อมูลบัญชีและออกจากระบบ
- รองรับธีมสว่าง/มืด

> หมายเหตุ: ระบบรีเซ็ตรหัสผ่านสำหรับผู้ใช้ทั่วไปในปัจจุบันเป็น flow แบบง่ายที่ใช้อีเมลและรหัสใหม่ โดยยังไม่มีการยืนยันอีเมลหรือ OTP ส่วนบัญชีที่อยู่ใน `ADMIN_EMAILS` จะถูกปิดกั้นจาก flow นี้

### การจัดการ Quiz

- สร้าง แก้ไข และลบ Quiz ของตนเอง
- กำหนดชื่อและคำอธิบาย Quiz
- เพิ่ม แก้ไข ลบ และเรียงคำถาม
- กำหนดเวลา 5–120 วินาทีและคะแนน 100–2,000 คะแนนต่อคำถาม
- เพิ่มตัวเลือกและกำหนดคำตอบที่ถูกต้อง
- อัปโหลดรูปประกอบคำถามผ่าน UploadThing
- สร้างชุดคำถามภาษาไทยด้วย AI พร้อม preview ก่อนบันทึก
- AI รองรับ model fallback ระหว่าง OpenRouter และ NVIDIA
- ตรวจและตัดคำถามซ้ำจากผลลัพธ์ AI
- กรอกชื่อและคำอธิบาย Quiz จากผล AI ให้อัตโนมัติ

Schema รองรับ `MULTIPLE_CHOICE`, `TRUE_FALSE` และ `TYPE_ANSWER` แต่หน้าเล่นในปัจจุบันเน้นคำถามแบบเลือกคำตอบเป็นหลัก และยังไม่มีช่องพิมพ์คำตอบสำหรับ `TYPE_ANSWER`

### การเปิดห้องและเล่นเกม

- สร้าง Game PIN 6 หลัก
- Lobby แสดงรายชื่อผู้เล่นและ QR Code สำหรับเข้าร่วม
- คลิก QR Code เพื่อขยายเต็มหน้าจอ
- ผู้เล่นเข้าร่วมด้วย PIN และชื่อเล่น โดยไม่ต้องสมัครบัญชี
- ป้องกันชื่อเล่นซ้ำภายในห้องเดียวกัน
- แสดงคำถาม ตัวเลือก และเวลานับถอยหลัง
- คำนวณคะแนนตามความเร็วในการตอบ
- แสดงเฉลย ตารางคะแนน และอันดับสุดท้าย
- Auto Play สำหรับเดินเกมจากเฉลยไปยังข้อถัดไป
- เสียงประกอบ เพลง และปุ่ม mute สำหรับ Host
- Host heartbeat ทุก 15 วินาที
- Admin ปิดห้องที่ขาด heartbeat เกิน 60 วินาทีเมื่อโหลดข้อมูล Admin

การอัปเดตสถานะเกมปัจจุบันใช้ **REST API polling ทุกประมาณ 1 วินาที** ผ่าน Next.js และ PostgreSQL ไม่ได้พึ่ง WebSocket ใน flow หลัก

### Dashboard และรายงาน

Dashboard แสดง:

- จำนวน Quiz
- จำนวนเกมที่เคยเปิด
- จำนวนผู้เล่นรวม
- คะแนนเฉลี่ย
- Quiz ที่แก้ไขล่าสุด

หน้ารายงานแสดงประวัติเซสชันที่ผู้ใช้เป็น Host เช่น Quiz, PIN, วันที่, สถานะ และจำนวนผู้เล่น ปัจจุบันยังไม่มี CSV export หรือรายงานคำถามที่ตอบผิดบ่อย

### ระบบผู้ดูแล

ผู้ใช้ที่มีอีเมลอยู่ใน `ADMIN_EMAILS` สามารถเข้า `/admin` เพื่อ:

- ดูจำนวนผู้ใช้ Quiz เซสชัน และผู้เล่นทั้งระบบ
- ดูห้องที่ยังไม่จบและตรวจหาห้องที่ขาด heartbeat
- ดูรายการผู้ใช้ Quiz และเซสชันล่าสุด
- บังคับจบเซสชัน
- ลบ Quiz ที่ยังไม่มีประวัติการเล่น
- ลบผู้ใช้ทั่วไปที่ยังไม่มี Quiz หรือประวัติการเปิดเกม

API Admin ตรวจสิทธิ์จาก HTTP-only cookie และตรวจอีเมลกับ `ADMIN_EMAILS` ฝั่ง server ทุกครั้ง ไม่ได้อาศัยการซ่อนเมนูฝั่ง client เพียงอย่างเดียว

## เส้นทางหลัก

| Route | รายละเอียด | สิทธิ์ |
|---|---|---|
| `/` | หน้า Landing | สาธารณะ |
| `/login` | เข้าสู่ระบบ | สาธารณะ |
| `/register` | สมัครสมาชิก | สาธารณะ |
| `/forgot-password` | กรอกอีเมลเพื่อเปลี่ยนรหัส | สาธารณะ |
| `/reset-password` | ตั้งรหัสผ่านใหม่ | สาธารณะ |
| `/dashboard` | ภาพรวมบัญชี | ผู้ใช้ที่เข้าสู่ระบบ |
| `/quizzes` | รายการ Quiz ของตนเอง | ผู้ใช้ที่เข้าสู่ระบบ |
| `/quizzes/new` | สร้าง Quiz เองหรือด้วย AI | ผู้ใช้ที่เข้าสู่ระบบ |
| `/quizzes/[id]/edit` | แก้ไข Quiz และคำถาม | เจ้าของ Quiz |
| `/quizzes/[id]/host` | สร้างห้องเกม | เจ้าของ Quiz |
| `/host/[pin]` | หน้าควบคุมเกม | Host ของห้อง |
| `/join` | กรอก Game PIN | สาธารณะ |
| `/play/[pin]` | เข้าร่วมและเล่นเกม | สาธารณะ |
| `/reports` | ประวัติเกมที่เป็น Host | ผู้ใช้ที่เข้าสู่ระบบ |
| `/settings` | ข้อมูลบัญชี | ผู้ใช้ที่เข้าสู่ระบบ |
| `/admin` | ระบบจัดการส่วนกลาง | อีเมลใน `ADMIN_EMAILS` |

## เทคโนโลยี

- Next.js 16 (App Router) และ React 19
- TypeScript
- Tailwind CSS 4 และ Radix UI
- Prisma 7 และ PostgreSQL/Neon
- Zustand
- React Hook Form และ Zod
- JWT (`jose`) และ bcryptjs
- UploadThing
- OpenAI-compatible SDK สำหรับ OpenRouter/NVIDIA
- Vercel

> `socket.io` และ standalone socket server ยังคงอยู่ใน repository แต่ frontend ปัจจุบันใช้ polling และ `useSocket()` เป็น compatibility layer แบบ no-op

## Environment variables

สร้างไฟล์ `.env` ที่ root ของโปรเจกต์:

```env
# Required
DATABASE_URL="postgresql://..."
JWT_SECRET="replace-with-a-long-random-secret"

# Admin: คั่นหลายอีเมลด้วย comma
ADMIN_EMAILS="admin@example.com"

# Upload images
UPLOADTHING_TOKEN="..."

# AI: ตั้งอย่างน้อยหนึ่ง provider
OPENROUTER_API_KEY="..."
NVIDIA_API_KEY="..."

# Optional; default 240000 ms
AI_GENERATION_BUDGET_MS="240000"
```

รายละเอียด:

| Variable | การใช้งาน |
|---|---|
| `DATABASE_URL` | เชื่อมต่อ PostgreSQL/Neon และ Prisma migrations |
| `JWT_SECRET` | ลงนามและตรวจสอบ auth token ควรเป็นค่าสุ่มยาวอย่างน้อย 32 bytes |
| `ADMIN_EMAILS` | รายชื่ออีเมล Admin คั่นด้วย comma บัญชีต้องสมัครในระบบแล้ว |
| `UPLOADTHING_TOKEN` | จำเป็นเมื่อใช้อัปโหลดรูป |
| `OPENROUTER_API_KEY` | ใช้สร้างคำถาม AI ผ่าน OpenRouter |
| `NVIDIA_API_KEY` | AI provider สำรองหรือ provider หลักอีกตัว |
| `AI_GENERATION_BUDGET_MS` | งบเวลารวมของ model fallback หน่วยมิลลิวินาที |

## เริ่มต้นพัฒนา

### ความต้องการ

- Node.js 20.9 ขึ้นไป
- npm
- PostgreSQL หรือ Neon database

### ติดตั้ง

```bash
git clone <repository-url>
cd kaquiz
npm install
```

สร้าง `.env` ตามหัวข้อ Environment variables จากนั้นรัน migration:

```bash
npx prisma migrate dev
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

### คำสั่งที่ใช้บ่อย

```bash
npm run dev       # Development server
npm run lint      # ESLint
npx tsc --noEmit  # TypeScript check
npm run build     # Deploy migrations แล้ว production build
npm run start     # Production server
```

`npm install` จะรัน `prisma generate` ผ่าน `postinstall` และ `npm run build` จะรันคำสั่งต่อไปนี้:

```bash
prisma migrate deploy && next build
```

## Deployment บน Vercel

1. เชื่อม repository กับ Vercel
2. เพิ่ม environment variables ที่ต้องใช้
3. ตั้ง Function Max Duration เป็น 300 วินาทีสำหรับ AI generation
4. Deploy หรือ Redeploy

Production build จะใช้ `prisma migrate deploy` ก่อน Next.js build โดยอัตโนมัติ ดูรายละเอียดเพิ่มเติมใน [VERCEL_DEPLOY.md](VERCEL_DEPLOY.md)

ปัจจุบันไม่จำเป็นต้อง deploy Socket.IO server แยกเพื่อให้ flow เกมหลักทำงาน เพราะระบบใช้ API polling

## ข้อจำกัดที่ทราบ

- Polling ทุกประมาณ 1 วินาทีทำให้ API และฐานข้อมูลมีภาระเพิ่มตามจำนวนผู้เล่น
- `TYPE_ANSWER` ยังไม่มี UI สำหรับพิมพ์คำตอบระหว่างเกม
- รูปคำถามถูกอัปโหลดและบันทึกได้ แต่ยังไม่แสดงในหน้าการเล่น
- `coverImage` มีใน schema แต่ยังไม่มี UI ใช้งานครบวงจร
- Settings ยังแก้ไขโปรไฟล์ไม่ได้
- รายงานยังไม่มี CSV export และการวิเคราะห์รายคำถาม
- ยังไม่มี automated test suite
- Public game state เปิดตาม PIN เพื่อให้ผู้เล่นเข้าร่วมได้

## Roadmap

### คลัง Quiz สาธารณะ

ในอนาคตระบบจะเพิ่มการเผยแพร่ Quiz เข้าสู่คลังสาธารณะ เพื่อให้ผู้ใช้อื่นสามารถ:

- ค้นหา Quiz ที่เผยแพร่แล้ว
- ดูรายละเอียด จำนวนคำถาม หมวดหมู่ และระดับความยาก
- นำ Quiz สาธารณะไปเปิดห้องเล่นกับเพื่อนหรือในห้องเรียน
- คัดลอก Quiz มาแก้ไขเป็นชุดของตนเอง

ขณะนี้การเผยแพร่และคลัง Quiz สาธารณะยังไม่เปิดใช้งาน ผู้สร้างสามารถใช้ Quiz ของตนเองเปิดห้องเล่นได้ตามปกติ

### แนวทางพัฒนาต่อ

- ใช้ token หรือ OTP สำหรับ password reset
- รองรับคำถามแบบพิมพ์คำตอบครบวงจร
- แสดงรูปคำถามระหว่างเล่น
- เพิ่มรายงานเชิงลึกและ CSV export
- เพิ่ม rate limiting สำหรับ auth, AI และ game APIs
- ลดภาระ polling หรือกลับมาใช้ real-time transport ที่รองรับ production
- เพิ่ม automated tests

## เอกสารเพิ่มเติม

- [VERCEL_DEPLOY.md](VERCEL_DEPLOY.md) — การ deploy และ environment variables
- [design.md](design.md) — แนวคิดสถาปัตยกรรมและการออกแบบเดิม
