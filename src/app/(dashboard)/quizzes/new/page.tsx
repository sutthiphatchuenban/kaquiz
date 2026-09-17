"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { readApiResponse } from "@/lib/api-response";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PageHeading } from "@/components/page-heading";
import {
    Sparkles,
    Loader2,
    Wand2,
    PenLine,
    CheckCircle2,
    XCircle,
    Brain
} from "lucide-react";
import { toast } from "sonner";

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

const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
        red: "bg-[var(--answer-red)]",
        blue: "bg-[var(--answer-blue)]",
        green: "bg-[var(--answer-green)]",
        yellow: "bg-[var(--answer-yellow)]",
    };
    return colors[color] || colors.red;
};

export default function NewQuizPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [mode, setMode] = useState<"manual" | "ai">("manual");

    // AI Generation States
    const [aiTopic, setAiTopic] = useState("");
    const [aiQuestionCount, setAiQuestionCount] = useState("5");
    const [aiDifficulty, setAiDifficulty] = useState("medium");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    // Manual creation - just creates quiz and redirects to edit
    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            toast.error("กรุณากรอกชื่อ Quiz");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/quizzes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, description }),
            });

            const data = await readApiResponse<{ id: string }>(res);

            if (data.success && data.data) {
                toast.success("สร้าง Quiz สำเร็จ!");
                router.push(`/quizzes/${data.data.id}/edit`);
            } else {
                toast.error(data.error || "สร้าง Quiz ไม่สำเร็จ");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
        } finally {
            setIsLoading(false);
        }
    };

    // AI Generation
    const handleGenerateQuestions = async () => {
        if (!aiTopic.trim()) {
            toast.error("กรุณากรอกหัวข้อที่ต้องการสร้างคำถาม");
            return;
        }

        setIsGenerating(true);
        setGeneratedQuestions([]);
        setShowPreview(false);

        try {
            const res = await fetch("/api/ai/generate-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic: aiTopic,
                    count: aiQuestionCount,
                    difficulty: aiDifficulty,
                }),
            });

            const data = await readApiResponse<{
                questions: GeneratedQuestion[];
                model?: string;
            }>(res);

            if (data.success && data.data?.questions?.length) {
                const generatedCount = data.data.questions.length;
                const topic = aiTopic.trim();
                const difficultyLabels: Record<string, string> = {
                    easy: "ง่าย",
                    medium: "ปานกลาง",
                    hard: "ยาก",
                };
                const difficultyLabel = difficultyLabels[aiDifficulty] || aiDifficulty;

                setGeneratedQuestions(data.data.questions);
                setShowPreview(true);
                // Fill metadata for the user, but preserve anything they entered.
                setTitle((current) => current.trim() || `แบบทดสอบ ${topic} ${generatedCount} ข้อ`);
                setDescription(
                    (current) => current.trim() ||
                        `คำถามเกี่ยวกับ ${topic} จำนวน ${generatedCount} ข้อ ระดับ${difficultyLabel} แบบปรนัย 4 ตัวเลือก`
                );
                toast.success(`สร้างคำถามสำเร็จ ${generatedCount} ข้อ!`, {
                    description: data.data.model
                        ? `ใช้โมเดล ${data.data.model} — ตรวจสอบและแก้ไขคำถามด้านล่างได้เลยครับ`
                        : "ตรวจสอบและแก้ไขคำถามด้านล่างได้เลยครับ",
                });
            } else {
                toast.error(data.error || "สร้างคำถามไม่สำเร็จ", { duration: 8000 });
            }
        } catch (error) {
            console.error("AI Generation Error:", error);
            toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ AI");
        } finally {
            setIsGenerating(false);
        }
    };

    // Create quiz with AI-generated questions
    const handleCreateWithAI = async () => {
        if (generatedQuestions.length === 0) {
            toast.error("กรุณาสร้างคำถามก่อน");
            return;
        }

        const quizTitle = title.trim() || `Quiz: ${aiTopic}`;
        const quizDescription = description.trim() || `คำถามเกี่ยวกับ ${aiTopic} จำนวน ${generatedQuestions.length} ข้อ`;

        setIsLoading(true);

        try {
            // First create the quiz
            const quizRes = await fetch("/api/quizzes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: quizTitle,
                    description: quizDescription
                }),
            });

            const quizData = await readApiResponse<{ id: string }>(quizRes);

            if (!quizData.success || !quizData.data) {
                toast.error(quizData.error || "สร้าง Quiz ไม่สำเร็จ");
                return;
            }

            const quizId = quizData.data.id;

            // Then add all questions
            let addedCount = 0;
            for (let i = 0; i < generatedQuestions.length; i++) {
                const question = generatedQuestions[i];
                try {
                    const qRes = await fetch(`/api/quizzes/${quizId}/questions`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            questionText: question.questionText,
                            type: "MULTIPLE_CHOICE",
                            timeLimit: question.timeLimit,
                            points: question.points,
                            imageUrl: null,
                            order: i,
                            answers: question.answers,
                        }),
                    });
                    const qData = await readApiResponse(qRes);
                    if (qData.success) {
                        addedCount++;
                    }
                } catch (err) {
                    console.error(`Failed to add question ${i + 1}:`, err);
                }
            }

            toast.success(`สร้าง Quiz พร้อม ${addedCount} คำถามสำเร็จ!`);
            router.push(`/quizzes/${quizId}/edit`);
        } catch {
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading && !isAuthenticated) {
        return (
            <div className="grid place-items-center py-24">
                <div className="grid place-items-center gap-3 border-[3px] border-line bg-paper px-10 py-12 shadow-hard">
                    <Loader2 className="size-8 animate-spin text-arcade" />
                    <p className="kq-pixel text-[9px] text-ink">LOADING...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-4xl">
            <PageHeading
                overline="02 / NEW QUIZ"
                title="สร้าง Quiz ใหม่"
                description="เลือกวิธีสร้าง Quiz ของคุณ — พิมพ์เองทั้งหมด หรือให้ AI ช่วยร่างให้ก่อนนำไปปรับต่อ"
            />

            <div className="kq-card p-5 sm:p-8">
                <Tabs value={mode} onValueChange={(v) => setMode(v as "manual" | "ai")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manual" className="flex items-center gap-2">
                            <PenLine className="size-4" />
                            พิมพ์เอง
                        </TabsTrigger>
                        <TabsTrigger value="ai" className="flex items-center gap-2">
                            <Wand2 className="size-4" />
                            ให้ AI ช่วยร่าง
                        </TabsTrigger>
                    </TabsList>

                    {/* Manual Creation Tab */}
                    <TabsContent value="manual">
                        <form onSubmit={handleManualSubmit} className="grid gap-6">
                            <div>
                                <label htmlFor="title" className="kq-label">ชื่อ Quiz *</label>
                                <input
                                    id="title"
                                    placeholder="เช่น ทดสอบความรู้ภาษาไทย"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    disabled={isLoading}
                                    className="kq-input"
                                    maxLength={100}
                                />
                                <p className="mt-1 text-right text-xs font-bold text-muted-foreground">
                                    {title.length}/100
                                </p>
                            </div>

                            <div>
                                <label htmlFor="description" className="kq-label">
                                    คำอธิบาย (ไม่บังคับ)
                                </label>
                                <textarea
                                    id="description"
                                    placeholder="อธิบายเกี่ยวกับ Quiz ของคุณ..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={isLoading}
                                    rows={4}
                                    maxLength={500}
                                    className="kq-textarea"
                                />
                                <p className="mt-1 text-right text-xs font-bold text-muted-foreground">
                                    {description.length}/500
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    disabled={isLoading}
                                    className="kq-btn kq-btn-paper flex-1"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || !title.trim()}
                                    className="kq-btn kq-btn-yellow flex-1"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin" />
                                            กำลังสร้าง...
                                        </>
                                    ) : (
                                        "สร้าง Quiz"
                                    )}
                                </button>
                            </div>
                        </form>
                    </TabsContent>

                    {/* AI Creation Tab */}
                    <TabsContent value="ai">
                        <div className="grid gap-6">
                            {/* AI Settings */}
                            <div className="border-[3px] border-line bg-cream p-5 shadow-hard-sm">
                                <div className="mb-5 flex items-center gap-3">
                                    <span className="kq-stat-icon">
                                        <Brain className="size-5" strokeWidth={2.5} />
                                    </span>
                                    <h3 className="text-lg font-bold text-ink">ตั้งค่าการสร้างด้วย AI</h3>
                                </div>

                                <div className="grid gap-4">
                                    <div>
                                        <label htmlFor="aiTopic" className="kq-label">
                                            หัวข้อที่ต้องการสร้างคำถาม *
                                        </label>
                                        <textarea
                                            id="aiTopic"
                                            placeholder="เช่น ประวัติศาสตร์ไทยสมัยสุโขทัย, วิทยาศาสตร์เรื่องระบบสุริยะ, คำศัพท์ภาษาอังกฤษเกี่ยวกับอาหาร..."
                                            value={aiTopic}
                                            onChange={(e) => setAiTopic(e.target.value)}
                                            disabled={isGenerating || isLoading}
                                            rows={3}
                                            className="kq-textarea resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <span className="kq-label">จำนวนคำถาม</span>
                                            <Select value={aiQuestionCount} onValueChange={setAiQuestionCount} disabled={isGenerating || isLoading}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[3, 5, 10, 15, 20].map((n) => (
                                                        <SelectItem key={n} value={n.toString()}>{n} ข้อ</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <span className="kq-label">ระดับความยาก</span>
                                            <Select value={aiDifficulty} onValueChange={setAiDifficulty} disabled={isGenerating || isLoading}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="easy">ง่าย</SelectItem>
                                                    <SelectItem value="medium">ปานกลาง</SelectItem>
                                                    <SelectItem value="hard">ยาก</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {isGenerating && (
                                        <div className="animate-bounce-in grid gap-2" aria-live="polite">
                                            <p className="flex items-center justify-center gap-2 text-sm font-bold text-ink">
                                                <Loader2 className="size-4 animate-spin" />
                                                AI กำลังสร้างคำถามให้คุณ...
                                            </p>
                                            <div className="h-3 w-full border-[3px] border-line bg-paper">
                                                <div className="h-full w-1/3 animate-pulse bg-candy" />
                                            </div>
                                            <p className="text-center text-xs font-semibold text-muted-foreground">
                                                ระบบจะลองไล่โมเดลไปเรื่อย ๆ อาจใช้เวลาถึง ~45 วินาที
                                                กรุณาอย่าปิดหน้านี้
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleGenerateQuestions}
                                        disabled={isGenerating || !aiTopic.trim()}
                                        className="kq-btn kq-btn-purple kq-btn-block kq-btn-lg"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Sparkles className="size-5 animate-pulse" />
                                                กำลังประมวลผล...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="size-5" />
                                                สร้างคำถามด้วย AI
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Quiz Title/Description (Optional for AI) */}
                            {showPreview && (
                                <div className="grid gap-4">
                                    <div>
                                        <label htmlFor="aiTitle" className="kq-label">
                                            ชื่อ Quiz (ไม่บังคับ ระบบจะใช้ชื่อหัวข้อแทน)
                                        </label>
                                        <input
                                            id="aiTitle"
                                            placeholder={`Quiz: ${aiTopic}`}
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            disabled={isLoading}
                                            className="kq-input"
                                            maxLength={100}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="aiDescription" className="kq-label">
                                            คำอธิบาย (ไม่บังคับ)
                                        </label>
                                        <textarea
                                            id="aiDescription"
                                            placeholder={`คำถามเกี่ยวกับ ${aiTopic} จำนวน ${generatedQuestions.length} ข้อ`}
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            disabled={isLoading}
                                            rows={2}
                                            maxLength={500}
                                            className="kq-textarea"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Preview Generated Questions */}
                            {showPreview && generatedQuestions.length > 0 && (
                                <div className="grid gap-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <h3 className="flex items-center gap-3 text-lg font-bold text-ink">
                                            <span className="kq-stat-icon">
                                                <CheckCircle2 className="size-5" strokeWidth={2.5} />
                                            </span>
                                            ตัวอย่างคำถามที่สร้าง ({generatedQuestions.length} ข้อ)
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={handleGenerateQuestions}
                                            disabled={isGenerating}
                                            className="kq-btn kq-btn-sm kq-btn-paper"
                                        >
                                            <Wand2 className="size-4" />
                                            สร้างใหม่
                                        </button>
                                    </div>

                                    <div className="kq-scroll max-h-96 space-y-3 pr-2">
                                        {generatedQuestions.map((q, index) => (
                                            <div key={index} className="kq-card-flat p-4">
                                                <div className="flex items-start gap-3">
                                                    <span className="kq-rank">
                                                        {String(index + 1).padStart(2, "0")}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-ink">{q.questionText}</p>
                                                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                            {q.answers.map((a, i) => (
                                                                <div
                                                                    key={i}
                                                                    className={`flex items-center gap-2 border-[3px] border-line px-2.5 py-2 text-sm font-bold text-[var(--on-arcade)] shadow-hard-sm ${getColorClass(a.color)}`}
                                                                >
                                                                    {a.isCorrect ? (
                                                                        <CheckCircle2 className="size-4 shrink-0" />
                                                                    ) : (
                                                                        <XCircle className="size-4 shrink-0 opacity-60" />
                                                                    )}
                                                                    <span className="truncate">{a.answerText}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Create Button */}
                                    <hr className="kq-divider" />
                                    <div className="flex flex-col gap-3 pb-1 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowPreview(false);
                                                setGeneratedQuestions([]);
                                            }}
                                            disabled={isLoading}
                                            className="kq-btn kq-btn-paper flex-1"
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCreateWithAI}
                                            disabled={isLoading}
                                            className="kq-btn kq-btn-yellow flex-1"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="size-4 animate-spin" />
                                                    กำลังสร้าง...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="size-4" />
                                                    สร้าง Quiz พร้อมคำถามทั้งหมด
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
