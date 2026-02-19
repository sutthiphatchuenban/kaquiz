# KaQuiz

Real-time Interactive Quiz Platform - แพลตฟอร์มทำ Quiz แบบเรียลไทม์ที่ผู้ใช้สามารถสร้าง Quiz, แชร์ให้เพื่อน และเล่นพร้อมกันได้ทันที

---

## ✨ Features

### 📋 การจัดการ Quiz (สำหรับ Host)

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

### 🎮 การเล่นเกมแบบเรียลไทม์ (Game Session)

- สร้าง Game PIN สำหรับเข้าร่วม
- Lobby รอผู้เล่นเข้าร่วม
- แสดงคำถามพร้อมกันทุกคน
- นับถอยหลังเวลาตอบ
- แสดงผลคำตอบหลังจบแต่ละข้อ
- Leaderboard อัปเดตแบบ Real-time
- สรุปผลเมื่อจบเกม

### 🎮 ประสบการณ์ของผู้เล่น

- เข้าร่วมด้วย Game PIN
- ใส่ชื่อเล่น (Nickname)
- เห็นตัวเลือกบนหน้าจอตัวเอง
- ตอบคำถามด้วยการกดปุ่ม
- เห็นคะแนนและอันดับตัวเอง

### 📊 รายงานและสถิติ

- ดูประวัติเกมที่เคยเล่น
- สถิติคำตอบถูก/ผิดของผู้เล่น
- Export ผลคะแนนเป็น CSV
- ดูคำถามที่ผู้เล่นตอบผิดบ่อย

### 👤 การจัดการผู้ใช้

- ลงทะเบียน / เข้าสู่ระบบ
- แก้ไขโปรไฟล์
- ดู Quiz ที่สร้างไว้
- ดูประวัติการเล่น

---

## 🛠 Tech Stack

Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Lucide React, Socket.io Client, Zustand, React Hook Form, Zod, Next.js API Routes, Prisma ORM, PostgreSQL, Socket.io, NextAuth.js, bcrypt, Vercel, Supabase, Neon

---

## 📁 Project Structure

```
kaquiz/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   ├── (game)/
│   │   ├── api/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── ui/
│   ├── lib/
│   ├── hooks/
│   ├── stores/
│   ├── types/
│   └── utils/
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL Database
- npm / yarn / pnpm / bun

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd kaquiz

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and other configs

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📝 Detailed Documentation

See [design.md](design.md) for complete system architecture, API documentation, and development roadmap.

---

## 📄 License

MIT License
