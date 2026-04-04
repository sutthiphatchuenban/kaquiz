"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sparkles,
    ArrowLeft,
    Loader2,
    FileQuestion,
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
    const [aiModel, setAiModel] = useState("mistral-small-4");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);

    useEffect(() => {
        checkAuth();
    }, []);

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

            const data = await res.json();

            if (data.success) {
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
                    model: aiModel,
                }),
            });

            const data = await res.json();

            if (data.success && data.data.questions) {
                setGeneratedQuestions(data.data.questions);
                setShowPreview(true);
                toast.success(`สร้างคำถามสำเร็จ ${data.data.questions.length} ข้อ!`, {
                    description: "ตรวจสอบและแก้ไขคำถามด้านล่างได้เลยครับ",
                });
            } else if (data.hint === "change_model") {
                toast.error(data.error || "AI สร้างคำถามไม่สำเร็จ", {
                    description: "💡 ลองเปลี่ยน AI Model ในตัวเลือกด้านบน แล้วกดสร้างใหม่อีกครั้ง",
                    duration: 6000,
                });
            } else {
                toast.error(data.error || "สร้างคำถามไม่สำเร็จ");
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

            const quizData = await quizRes.json();

            if (!quizData.success) {
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
                    const qData = await qRes.json();
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
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Navigation */}
            <nav className="border-b bg-card sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <img src="/favicon.ico" alt="KaQuiz" className="w-10 h-10 rounded-xl object-contain" />
                        <span className="text-xl font-bold tracking-tight">KaQuiz</span>
                    </Link>
                </div>
            </nav>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    กลับไปหน้า Dashboard
                </Link>

                <Card className="border-none shadow-lg">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <FileQuestion className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">สร้าง Quiz ใหม่</CardTitle>
                        <CardDescription>เลือกวิธีการสร้าง Quiz ของคุณ</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={mode} onValueChange={(v) => setMode(v as "manual" | "ai")} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6">
                                <TabsTrigger value="manual" className="flex items-center gap-2">
                                    <PenLine className="w-4 h-4" />
                                    สร้างเอง
                                </TabsTrigger>
                                <TabsTrigger value="ai" className="flex items-center gap-2">
                                    <Wand2 className="w-4 h-4" />
                                    สร้างด้วย AI
                                </TabsTrigger>
                            </TabsList>

                            {/* Manual Creation Tab */}
                            <TabsContent value="manual">
                                <form onSubmit={handleManualSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">ชื่อ Quiz *</Label>
                                        <Input
                                            id="title"
                                            placeholder="เช่น ทดสอบความรู้ภาษาไทย"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            disabled={isLoading}
                                            className="h-12"
                                            maxLength={100}
                                        />
                                        <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">คำอธิบาย (ไม่บังคับ)</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="อธิบายเกี่ยวกับ Quiz ของคุณ..."
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            disabled={isLoading}
                                            rows={4}
                                            maxLength={500}
                                        />
                                        <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => router.back()}
                                            disabled={isLoading}
                                            className="flex-1"
                                        >
                                            ยกเลิก
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isLoading || !title.trim()}
                                            className="flex-1"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    กำลังสร้าง...
                                                </>
                                            ) : (
                                                "สร้าง Quiz"
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </TabsContent>

                            {/* AI Creation Tab */}
                            <TabsContent value="ai">
                                <div className="space-y-6">
                                    {/* AI Settings */}
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-pink-500/10 border border-purple-500/20">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Brain className="w-5 h-5 text-purple-500" />
                                            <h3 className="font-semibold">ตั้งค่าการสร้างด้วย AI</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="aiTopic">หัวข้อที่ต้องการสร้างคำถาม *</Label>
                                                <Textarea
                                                    id="aiTopic"
                                                    placeholder="เช่น ประวัติศาสตร์ไทยสมัยสุโขทัย, วิทยาศาสตร์เรื่องระบบสุริยะ, คำศัพท์ภาษาอังกฤษเกี่ยวกับอาหาร..."
                                                    value={aiTopic}
                                                    onChange={(e) => setAiTopic(e.target.value)}
                                                    disabled={isGenerating || isLoading}
                                                    rows={3}
                                                    className="resize-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label>จำนวนคำถาม</Label>
                                                    <Select value={aiQuestionCount} onValueChange={setAiQuestionCount} disabled={isGenerating || isLoading}>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {[3, 5, 10, 15, 20].map((n) => (
                                                                <SelectItem key={n} value={n.toString()}>{n} ข้อ</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>ระดับความยาก</Label>
                                                    <Select value={aiDifficulty} onValueChange={setAiDifficulty} disabled={isGenerating || isLoading}>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="easy">ง่าย</SelectItem>
                                                            <SelectItem value="medium">ปานกลาง</SelectItem>
                                                            <SelectItem value="hard">ยาก</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>AI Model</Label>
                                                    <Select value={aiModel} onValueChange={setAiModel} disabled={isGenerating || isLoading}>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {/* NVIDIA Models */}
                                                            <SelectItem value="gpt-oss-120b">
                                                                <div className="flex items-center gap-2">
                                                                    <img src="https://static.vecteezy.com/system/resources/previews/022/841/109/non_2x/chatgpt-logo-transparent-background-free-png.png" alt="OpenAI" className="w-4 h-4" />
                                                                    <span>GPT-OSS 120B</span>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="gpt-oss-20b">
                                                                <div className="flex items-center gap-2">
                                                                    <img src="https://static.vecteezy.com/system/resources/previews/022/841/109/non_2x/chatgpt-logo-transparent-background-free-png.png" alt="OpenAI" className="w-4 h-4" />
                                                                    <span>GPT-OSS 20B</span>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="mistral-small-4">
                                                                <div className="flex items-center gap-2">
                                                                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Mistral_AI_logo_%282025%E2%80%93%29.svg/960px-Mistral_AI_logo_%282025%E2%80%93%29.svg.png" alt="Mistral" className="w-4 h-4 object-contain" />
                                                                    <span>Mistral Small 4</span>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="gemma-3n">
                                                                <div className="flex items-center gap-2">
                                                                    <img src="https://www.gstatic.com/lamda/images/gemini_favicon_f069958c85030456e93de685481c559f160ea06b.png" alt="Google" className="w-4 h-4 rounded-full" />
                                                                    <span>Gemma 3N</span>
                                                                </div>
                                                            </SelectItem>

                                                            {/* OpenRouter Models */}
                                                            <SelectItem value="qwen-3-next">
                                                                <div className="flex items-center gap-2">
                                                                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Qwen_logo.svg/3840px-Qwen_logo.svg.png" alt="Qwen" className="w-4 h-4" />
                                                                    <span>Qwen3 Next 80B</span>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="minimax-m2-5">
                                                                <div className="flex items-center gap-2">
                                                                    <img src="https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/minimax-color.png" alt="MiniMax" className="w-4 h-4" />
                                                                    <span>MiniMax M2.5</span>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="nemotron-3-super">
                                                                <div className="flex items-center gap-2">
                                                                    <img src="https://companieslogo.com/img/orig/NVDA-220e1e03.png?t=1722952498" alt="NVIDIA" className="w-4 h-4" />
                                                                    <span>Nemotron 3 Super 120B</span>
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                            </div>

                                            {isGenerating && (
                                                <div className="space-y-2 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                    <div className="flex justify-center text-sm font-medium text-purple-600 dark:text-purple-400">
                                                        <span className="flex items-center gap-2">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            AI กำลังสร้างคำถามให้คุณ...
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                        <div className="h-full w-1/3 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite] shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                                                    </div>
                                                </div>
                                            )}

                                            <Button
                                                type="button"
                                                onClick={handleGenerateQuestions}
                                                disabled={isGenerating || !aiTopic.trim()}
                                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-12 text-lg shadow-lg hover:shadow-purple-500/20 transition-all"
                                            >
                                                {isGenerating ? (
                                                    <>
                                                        <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
                                                        กำลังประมวลผล...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Wand2 className="mr-2 h-5 w-5" />
                                                        สร้างคำถามด้วย AI
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Quiz Title/Description (Optional for AI) */}
                                    {showPreview && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="aiTitle">ชื่อ Quiz (ไม่บังคับ ระบบจะใช้ชื่อหัวข้อแทน)</Label>
                                                <Input
                                                    id="aiTitle"
                                                    placeholder={`Quiz: ${aiTopic}`}
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value)}
                                                    disabled={isLoading}
                                                    className="h-12"
                                                    maxLength={100}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="aiDescription">คำอธิบาย (ไม่บังคับ)</Label>
                                                <Textarea
                                                    id="aiDescription"
                                                    placeholder={`คำถามเกี่ยวกับ ${aiTopic} จำนวน ${generatedQuestions.length} ข้อ`}
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                    disabled={isLoading}
                                                    rows={2}
                                                    maxLength={500}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Preview Generated Questions */}
                                    {showPreview && generatedQuestions.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold flex items-center gap-2">
                                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                    ตัวอย่างคำถามที่สร้าง ({generatedQuestions.length} ข้อ)
                                                </h3>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleGenerateQuestions}
                                                    disabled={isGenerating}
                                                >
                                                    <Wand2 className="w-4 h-4 mr-2" />
                                                    สร้างใหม่
                                                </Button>
                                            </div>

                                            <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                                                {generatedQuestions.map((q, index) => (
                                                    <div key={index} className="p-4 rounded-lg border bg-card">
                                                        <div className="flex items-start gap-3">
                                                            <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                                                {index + 1}
                                                            </span>
                                                            <div className="flex-1">
                                                                <p className="font-medium mb-3">{q.questionText}</p>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {q.answers.map((a, i) => (
                                                                        <div
                                                                            key={i}
                                                                            className={`p-2 rounded-lg text-white text-sm flex items-center gap-2 ${getColorClass(a.color)}`}
                                                                        >
                                                                            {a.isCorrect ? (
                                                                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                                            ) : (
                                                                                <XCircle className="w-4 h-4 shrink-0 opacity-50" />
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
                                            <div className="flex gap-3 pt-4 border-t">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setShowPreview(false);
                                                        setGeneratedQuestions([]);
                                                    }}
                                                    disabled={isLoading}
                                                    className="flex-1"
                                                >
                                                    ยกเลิก
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={handleCreateWithAI}
                                                    disabled={isLoading}
                                                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                                                >
                                                    {isLoading ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            กำลังสร้าง...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles className="mr-2 h-4 w-4" />
                                                            สร้าง Quiz พร้อมคำถามทั้งหมด
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
