import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: "https://integrate.api.nvidia.com/v1",
});

interface GeneratedQuestion {
    questionText: string;
    answers: {
        answerText: string;
        isCorrect: boolean;
        color: "red" | "blue" | "green" | "yellow";
        order: number;
    }[];
    timeLimit: number;
    points: number;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { topic, questionCount, difficulty = "medium" } = body;

        if (!topic || !questionCount) {
            return NextResponse.json(
                { success: false, error: "กรุณากรอกหัวข้อและจำนวนคำถาม" },
                { status: 400 }
            );
        }

        const count = Math.min(Math.max(parseInt(questionCount), 1), 20);

        const prompt = `สร้างคำถามแบบ Quiz จำนวน ${count} ข้อ เกี่ยวกับหัวข้อ: "${topic}"
ระดับความยาก: ${difficulty === "easy" ? "ง่าย" : difficulty === "hard" ? "ยาก" : "ปานกลาง"}

กรุณาตอบเป็น JSON array เท่านั้น ไม่ต้องมี markdown หรือข้อความอื่น โดยแต่ละคำถามต้องมีรูปแบบดังนี้:
[
  {
    "questionText": "คำถาม",
    "answers": [
      {"answerText": "ตัวเลือก 1", "isCorrect": true, "color": "red", "order": 0},
      {"answerText": "ตัวเลือก 2", "isCorrect": false, "color": "blue", "order": 1},
      {"answerText": "ตัวเลือก 3", "isCorrect": false, "color": "green", "order": 2},
      {"answerText": "ตัวเลือก 4", "isCorrect": false, "color": "yellow", "order": 3}
    ],
    "timeLimit": 20,
    "points": 1000
  }
]

กฎสำคัญ:
1. แต่ละคำถามต้องมี 4 ตัวเลือก
2. มีคำตอบที่ถูกต้องเพียง 1 ข้อ (isCorrect: true)
3. color ต้องเป็น "red", "blue", "green", "yellow" ตามลำดับ
4. timeLimit ควรเป็น 20-30 วินาที
5. points ควรเป็น 1000
6. คำถามและคำตอบต้องเป็นภาษาไทย (ยกเว้นหัวข้อเป็นภาษาอื่น)
7. ห้ามมี markdown หรือ code block ใดๆ ตอบเป็น JSON array ล้วนๆ`;

        const completion = await openai.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            top_p: 1,
            max_tokens: 4096,
        });

        const responseText = completion.choices[0]?.message?.content || "";

        // Try to parse JSON from response
        let questions: GeneratedQuestion[] = [];

        try {
            // Clean the response - remove markdown code blocks if present
            let cleanedResponse = responseText.trim();

            // Remove ```json and ``` if present
            if (cleanedResponse.startsWith("```")) {
                cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
            }

            questions = JSON.parse(cleanedResponse);

            // Validate and fix the questions
            questions = questions.map((q, index) => {
                // Shuffle answers to ensure correct answer isn't always first
                const answers = [...(q.answers || [])];
                for (let i = answers.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [answers[i], answers[j]] = [answers[j], answers[i]];
                }

                return {
                    questionText: q.questionText || `คำถามที่ ${index + 1}`,
                    answers: answers.slice(0, 4).map((a, i) => ({
                        answerText: a.answerText || `ตัวเลือก ${i + 1}`,
                        isCorrect: a.isCorrect === true,
                        color: (["red", "blue", "green", "yellow"] as const)[i],
                        order: i,
                    })),
                    timeLimit: q.timeLimit || 20,
                    points: q.points || 1000,
                };
            });

            // Ensure each question has exactly one correct answer
            questions = questions.map(q => {
                const hasCorrect = q.answers.some(a => a.isCorrect);
                if (!hasCorrect && q.answers.length > 0) {
                    q.answers[0].isCorrect = true;
                }
                return q;
            });

        } catch (parseError) {
            console.error("Failed to parse AI response:", parseError);
            console.error("Raw response:", responseText);
            return NextResponse.json(
                { success: false, error: "AI สร้างคำถามไม่สำเร็จ กรุณาลองใหม่" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                questions,
                topic,
                generatedCount: questions.length,
            },
        });
    } catch (error) {
        console.error("AI Generation Error:", error);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการสร้างคำถาม" },
            { status: 500 }
        );
    }
}
