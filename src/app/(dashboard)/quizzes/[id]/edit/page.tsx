"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/stores/auth-store";
import { UploadButton } from "@/lib/uploadthing-components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Sparkles,
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    Play,
    Loader2,
    GripVertical,
    Check,
    X,
    ImageIcon
} from "lucide-react";
import { toast } from "sonner";

interface Answer {
    id?: string;
    answerText: string;
    isCorrect: boolean;
    color: "red" | "blue" | "green" | "yellow";
    order: number;
}

interface Question {
    id: string;
    questionText: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "TYPE_ANSWER";
    timeLimit: number;
    points: number;
    imageUrl: string | null;
    order: number;
    answers: Answer[];
}

interface Quiz {
    id: string;
    title: string;
    description: string | null;
    isPublished: boolean;
    questions: Question[];
}

const ANSWER_COLORS: ("red" | "blue" | "green" | "yellow")[] = ["red", "blue", "green", "yellow"];

const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
        red: "bg-[var(--answer-red)]",
        blue: "bg-[var(--answer-blue)]",
        green: "bg-[var(--answer-green)]",
        yellow: "bg-[var(--answer-yellow)]",
    };
    return colors[color] || colors.red;
};

export default function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore();

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showAddQuestion, setShowAddQuestion] = useState(false);

    // New question form state
    const [newQuestion, setNewQuestion] = useState({
        questionText: "",
        type: "MULTIPLE_CHOICE" as "MULTIPLE_CHOICE" | "TRUE_FALSE" | "TYPE_ANSWER",
        timeLimit: 20,
        points: 1000,
        imageUrl: "" as string,
        answers: [
            { answerText: "", isCorrect: true, color: "red" as const, order: 0 },
            { answerText: "", isCorrect: false, color: "blue" as const, order: 1 },
            { answerText: "", isCorrect: false, color: "green" as const, order: 2 },
            { answerText: "", isCorrect: false, color: "yellow" as const, order: 3 },
        ],
    });

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated && id) {
            fetchQuiz();
        }
    }, [isAuthenticated, id]);

    const fetchQuiz = async () => {
        try {
            const res = await fetch(`/api/quizzes/${id}`);
            const data = await res.json();
            if (data.success) {
                setQuiz(data.data);
            } else {
                toast.error("ไม่พบ Quiz");
                router.push("/quizzes");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveQuiz = async () => {
        if (!quiz) return;
        setIsSaving(true);

        try {
            const res = await fetch(`/api/quizzes/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: quiz.title,
                    description: quiz.description,
                    isPublished: quiz.isPublished,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("บันทึกสำเร็จ");
            } else {
                toast.error(data.error || "บันทึกไม่สำเร็จ");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddQuestion = async () => {
        if (!newQuestion.questionText.trim()) {
            toast.error("กรุณากรอกคำถาม");
            return;
        }

        const hasCorrectAnswer = newQuestion.answers.some(a => a.isCorrect);
        if (!hasCorrectAnswer) {
            toast.error("กรุณาเลือกคำตอบที่ถูกต้อง");
            return;
        }

        const filledAnswers = newQuestion.answers.filter(a => a.answerText.trim());
        if (filledAnswers.length < 2) {
            toast.error("กรุณากรอกคำตอบอย่างน้อย 2 ตัวเลือก");
            return;
        }

        try {
            const res = await fetch(`/api/quizzes/${id}/questions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...newQuestion,
                    order: quiz?.questions.length || 0,
                    answers: filledAnswers,
                }),
            });
            const data = await res.json();

            if (data.success) {
                setQuiz(prev => prev ? {
                    ...prev,
                    questions: [...prev.questions, data.data],
                } : null);
                setShowAddQuestion(false);
                resetNewQuestion();
                toast.success("เพิ่มคำถามสำเร็จ");
            } else {
                toast.error(data.error || "เพิ่มคำถามไม่สำเร็จ");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    const resetNewQuestion = () => {
        setNewQuestion({
            questionText: "",
            type: "MULTIPLE_CHOICE",
            timeLimit: 20,
            points: 1000,
            imageUrl: "",
            answers: [
                { answerText: "", isCorrect: true, color: "red", order: 0 },
                { answerText: "", isCorrect: false, color: "blue", order: 1 },
                { answerText: "", isCorrect: false, color: "green", order: 2 },
                { answerText: "", isCorrect: false, color: "yellow", order: 3 },
            ],
        });
    };

    const handleSetCorrectAnswer = (index: number) => {
        setNewQuestion(prev => ({
            ...prev,
            answers: prev.answers.map((a, i) => ({
                ...a,
                isCorrect: i === index,
            })),
        }));
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <nav className="border-b bg-card sticky top-0 z-50">
                    <div className="container mx-auto px-4 h-16 flex items-center">
                        <Skeleton className="h-10 w-32" />
                    </div>
                </nav>
                <div className="container mx-auto px-4 py-8">
                    <Skeleton className="h-8 w-64 mb-4" />
                    <Skeleton className="h-48 mb-4" />
                    <Skeleton className="h-32" />
                </div>
            </div>
        );
    }

    if (!quiz) return null;

    return (
        <div className="min-h-screen bg-background">
            {/* Navigation */}
            <nav className="border-b bg-card sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">KaQuiz</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={handleSaveQuiz} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            บันทึก
                        </Button>
                        <Link href={`/quizzes/${id}/host`}>
                            <Button disabled={quiz.questions.length === 0}>
                                <Play className="w-4 h-4 mr-2" />
                                เริ่มเกม
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <Link href="/quizzes" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    กลับไปหน้า Quiz ของฉัน
                </Link>

                {/* Quiz Info */}
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex-1 space-y-2">
                                <Input
                                    value={quiz.title}
                                    onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                                    className="text-2xl font-bold h-auto py-2 border-none shadow-none focus-visible:ring-0 px-0"
                                    placeholder="ชื่อ Quiz"
                                />
                                <Textarea
                                    value={quiz.description || ""}
                                    onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
                                    className="resize-none border-none shadow-none focus-visible:ring-0 px-0"
                                    placeholder="เพิ่มคำอธิบาย..."
                                    rows={2}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="published" className="text-sm text-muted-foreground">
                                    เผยแพร่
                                </Label>
                                <Switch
                                    id="published"
                                    checked={quiz.isPublished}
                                    onCheckedChange={(checked) => setQuiz({ ...quiz, isPublished: checked })}
                                />
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Questions List */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">คำถาม ({quiz.questions.length})</h2>
                    <Button onClick={() => setShowAddQuestion(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        เพิ่มคำถาม
                    </Button>
                </div>

                {quiz.questions.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                <Plus className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">ยังไม่มีคำถาม</h3>
                            <p className="text-muted-foreground mb-4">เริ่มต้นด้วยการเพิ่มคำถามแรก</p>
                            <Button onClick={() => setShowAddQuestion(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                เพิ่มคำถาม
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {quiz.questions.map((question, index) => (
                            <Card key={question.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start gap-4">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <GripVertical className="w-5 h-5" />
                                            <span className="text-lg font-bold">{index + 1}</span>
                                        </div>
                                        <div className="flex-1">
                                            <CardTitle className="text-lg">{question.questionText}</CardTitle>
                                            <div className="flex gap-2 mt-2">
                                                <Badge variant="outline">{question.timeLimit} วินาที</Badge>
                                                <Badge variant="outline">{question.points} คะแนน</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-2">
                                        {question.answers.map((answer) => (
                                            <div
                                                key={answer.id}
                                                className={`p-3 rounded-lg text-white font-medium flex items-center gap-2 ${getColorClass(answer.color)}`}
                                            >
                                                {answer.isCorrect && <Check className="w-4 h-4" />}
                                                {answer.answerText}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            {/* Add Question Dialog */}
            <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>เพิ่มคำถามใหม่</DialogTitle>
                        <DialogDescription>กรอกข้อมูลคำถามและตัวเลือกคำตอบ</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Question Text */}
                        <div className="space-y-2">
                            <Label>คำถาม *</Label>
                            <Textarea
                                value={newQuestion.questionText}
                                onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                                placeholder="พิมพ์คำถามของคุณ..."
                                rows={3}
                            />
                        </div>

                        {/* Image Upload */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                รูปภาพประกอบ (ไม่บังคับ)
                            </Label>
                            {newQuestion.imageUrl ? (
                                <div className="relative">
                                    <Image
                                        src={newQuestion.imageUrl}
                                        alt="Question image"
                                        width={400}
                                        height={200}
                                        className="rounded-lg object-cover w-full max-h-48"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="absolute top-2 right-2"
                                        onClick={() => setNewQuestion({ ...newQuestion, imageUrl: "" })}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <UploadButton
                                    endpoint="questionImage"
                                    onClientUploadComplete={(res) => {
                                        if (res?.[0]) {
                                            setNewQuestion({ ...newQuestion, imageUrl: res[0].url });
                                            toast.success("อัปโหลดรูปสำเร็จ");
                                        }
                                    }}
                                    onUploadError={(error: Error) => {
                                        toast.error(`อัปโหลดไม่สำเร็จ: ${error.message}`);
                                    }}
                                />
                            )}
                        </div>

                        {/* Settings */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>เวลา (วินาที)</Label>
                                <Select
                                    value={newQuestion.timeLimit.toString()}
                                    onValueChange={(v) => setNewQuestion({ ...newQuestion, timeLimit: parseInt(v) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[5, 10, 15, 20, 30, 45, 60, 90, 120].map((t) => (
                                            <SelectItem key={t} value={t.toString()}>{t} วินาที</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>คะแนน</Label>
                                <Select
                                    value={newQuestion.points.toString()}
                                    onValueChange={(v) => setNewQuestion({ ...newQuestion, points: parseInt(v) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[500, 1000, 1500, 2000].map((p) => (
                                            <SelectItem key={p} value={p.toString()}>{p} คะแนน</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Answers */}
                        <div className="space-y-3">
                            <Label>คำตอบ (คลิกเพื่อเลือกคำตอบที่ถูกต้อง)</Label>
                            {newQuestion.answers.map((answer, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleSetCorrectAnswer(index)}
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all ${getColorClass(ANSWER_COLORS[index])} ${answer.isCorrect ? "ring-2 ring-offset-2 ring-primary" : "opacity-50"}`}
                                    >
                                        {answer.isCorrect ? <Check className="w-5 h-5 text-white" /> : <X className="w-5 h-5 text-white/50" />}
                                    </button>
                                    <Input
                                        value={answer.answerText}
                                        onChange={(e) => {
                                            const newAnswers = [...newQuestion.answers];
                                            newAnswers[index] = { ...newAnswers[index], answerText: e.target.value };
                                            setNewQuestion({ ...newQuestion, answers: newAnswers });
                                        }}
                                        placeholder={`คำตอบที่ ${index + 1}`}
                                        className="flex-1"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowAddQuestion(false); resetNewQuestion(); }}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleAddQuestion}>
                            <Plus className="w-4 h-4 mr-2" />
                            เพิ่มคำถาม
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
