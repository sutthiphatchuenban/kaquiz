"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/stores/auth-store";
import { UploadButton } from "@/lib/uploadthing-components";
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
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import {
    ArrowLeft,
    Plus,
    Edit,
    Trash2,
    Save,
    Play,
    Loader2,
    GripVertical,
    Check,
    X,
    ImageIcon,
    Clock,
    Trophy,
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

const QUESTION_TYPE_LABEL: Record<Question["type"], string> = {
    MULTIPLE_CHOICE: "MULTIPLE CHOICE",
    TRUE_FALSE: "TRUE / FALSE",
    TYPE_ANSWER: "TYPE ANSWER",
};

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

    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

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

    const handleQuestionSubmit = async () => {
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
            const endpoint = `/api/quizzes/${id}/questions`;
            const method = editingQuestionId ? "PUT" : "POST";
            const body = {
                ...newQuestion,
                order: editingQuestionId ? undefined : (quiz?.questions.length || 0),
                answers: filledAnswers,
                questionId: editingQuestionId // Include ID for updates
            };

            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (data.success) {
                if (editingQuestionId) {
                    // Update existing question in state
                    setQuiz(prev => prev ? {
                        ...prev,
                        questions: prev.questions.map(q => q.id === editingQuestionId ? data.data : q)
                    } : null);
                    toast.success("แก้ไขคำถามสำเร็จ");
                } else {
                    // Add new question
                    setQuiz(prev => prev ? {
                        ...prev,
                        questions: [...prev.questions, data.data],
                    } : null);
                    toast.success("เพิ่มคำถามสำเร็จ");
                }
                setShowAddQuestion(false);
                resetNewQuestion();
            } else {
                toast.error(data.error || (editingQuestionId ? "แก้ไขคำถามไม่สำเร็จ" : "เพิ่มคำถามไม่สำเร็จ"));
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    const handleEditQuestion = (question: Question) => {
        setEditingQuestionId(question.id);
        setNewQuestion({
            questionText: question.questionText,
            type: question.type,
            timeLimit: question.timeLimit,
            points: question.points,
            imageUrl: question.imageUrl || "",
            answers: [
                ...question.answers.map(a => ({
                    ...a,
                    color: a.color as "red" | "blue" | "green" | "yellow"
                })),
                // Fill remaining slots if less than 4 answers
                ...Array(4 - question.answers.length).fill(null).map((_, i) => ({
                    answerText: "",
                    isCorrect: false,
                    color: ANSWER_COLORS[question.answers.length + i],
                    order: question.answers.length + i
                }))
            ].slice(0, 4) // Ensure max 4
        });
        setShowAddQuestion(true);
    };

    const handleDeleteQuestion = async (questionId: string) => {
        if (!confirm("คุณต้องการลบคำถามนี้ใช่หรือไม่?")) return;

        try {
            const res = await fetch(`/api/quizzes/${id}/questions?questionId=${questionId}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (data.success) {
                setQuiz(prev => prev ? {
                    ...prev,
                    questions: prev.questions.filter(q => q.id !== questionId)
                } : null);
                toast.success("ลบคำถามสำเร็จ");
            } else {
                toast.error(data.error || "ลบคำถามไม่สำเร็จ");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    const resetNewQuestion = () => {
        setEditingQuestionId(null);
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

    const handleSetAnswerColor = (index: number, color: Answer["color"]) => {
        setNewQuestion(prev => ({
            ...prev,
            answers: prev.answers.map((a, i) => (i === index ? { ...a, color } : a)),
        }));
    };

    if (authLoading || isLoading) {
        return (
            <div>
                <Skeleton className="h-10 w-56" />
                <Skeleton className="mt-3 h-5 w-72" />
                <Skeleton className="mt-8 h-56" />
                <Skeleton className="mt-6 h-44" />
            </div>
        );
    }

    if (!quiz) return null;

    const hostDisabled = quiz.questions.length === 0;

    return (
        <>
            <PageHeading
                overline="01 / QUIZ EDITOR"
                title="แก้ไข Quiz"
                description={quiz?.title}
                actions={
                    <>
                        <Link href="/quizzes" className="kq-btn kq-btn-sm kq-btn-paper">
                            <ArrowLeft className="size-4" />
                            กลับ
                        </Link>
                        <button
                            type="button"
                            onClick={handleSaveQuiz}
                            disabled={isSaving}
                            className="kq-btn kq-btn-sm kq-btn-cyan"
                        >
                            {isSaving ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Save className="size-4" />
                            )}
                            บันทึก
                        </button>
                        <Link
                            href={`/quizzes/${id}/host`}
                            aria-disabled={hostDisabled}
                            className={`kq-btn kq-btn-sm kq-btn-yellow ${
                                hostDisabled ? "pointer-events-none opacity-45" : ""
                            }`}
                        >
                            <Play className="size-4" />
                            โฮสต์เกม
                        </Link>
                    </>
                }
            />

            {/* ================= QUIZ SETTINGS ================= */}
            <section className="kq-card">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b-[3px] border-line bg-cream px-5 py-4">
                    <div>
                        <p className="kq-overline">QUIZ SETTINGS</p>
                        <h2 className="kq-title mt-1 text-xl">ข้อมูล Quiz</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <span
                            className={`kq-badge ${
                                quiz.isPublished ? "kq-badge-mint" : "kq-badge-paper"
                            }`}
                        >
                            {quiz.isPublished ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
                        </span>
                        <label htmlFor="published" className="kq-label mb-0 cursor-pointer">
                            เผยแพร่
                        </label>
                        <Switch
                            id="published"
                            checked={quiz.isPublished}
                            onCheckedChange={async (checked) => {
                                setQuiz({ ...quiz, isPublished: checked });
                                // Auto-save when toggling publish status
                                try {
                                    const res = await fetch(`/api/quizzes/${id}`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            ...quiz,
                                            isPublished: checked,
                                        }),
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        toast.success(checked ? "เผยแพร่แล้ว" : "ยกเลิกการเผยแพร่แล้ว");
                                    } else {
                                        toast.error(data.error || "บันทึกไม่สำเร็จ");
                                        setQuiz({ ...quiz, isPublished: !checked });
                                    }
                                } catch {
                                    toast.error("เกิดข้อผิดพลาด");
                                    setQuiz({ ...quiz, isPublished: !checked });
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="grid gap-5 p-5">
                    <div>
                        <label htmlFor="quiz-title" className="kq-label">
                            ชื่อ Quiz
                        </label>
                        <input
                            id="quiz-title"
                            value={quiz.title}
                            onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                            className="kq-input text-lg font-bold"
                            placeholder="ชื่อ Quiz"
                        />
                    </div>

                    <div>
                        <label htmlFor="quiz-description" className="kq-label">
                            คำอธิบาย
                        </label>
                        <textarea
                            id="quiz-description"
                            value={quiz.description || ""}
                            onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
                            className="kq-textarea"
                            placeholder="เพิ่มคำอธิบาย..."
                            rows={2}
                        />
                    </div>
                </div>
            </section>

            {/* ================= QUESTION LIST ================= */}
            <div className="mb-5 mt-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="kq-overline">02 / QUESTION LIST</p>
                    <h2 className="kq-title mt-1 text-2xl">
                        คำถาม ({quiz.questions.length})
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={() => setShowAddQuestion(true)}
                    className="kq-btn kq-btn-yellow"
                >
                    <Plus className="size-4" />
                    เพิ่มคำถาม
                </button>
            </div>

            {quiz.questions.length === 0 ? (
                <EmptyState
                    title="ยังไม่มีคำถาม"
                    description="เริ่มต้นด้วยการเพิ่มคำถามแรก แล้วชวนเพื่อน ๆ มาแข่งกัน!"
                    icon={<Plus className="size-8 text-ink" />}
                    action={
                        <button
                            type="button"
                            onClick={() => setShowAddQuestion(true)}
                            className="kq-btn kq-btn-yellow"
                        >
                            <Plus className="size-4" />
                            เพิ่มคำถาม
                        </button>
                    }
                />
            ) : (
                <div className="grid gap-7">
                    {quiz.questions.map((question, index) => (
                        <article key={question.id} className="kq-card">
                            <div className="flex flex-wrap items-start gap-4 p-5">
                                <div className="flex shrink-0 flex-col items-center gap-2">
                                    <GripVertical
                                        className="size-5 cursor-grab text-muted-foreground"
                                        aria-hidden
                                    />
                                    <span className="kq-rank">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>
                                </div>

                                {question.imageUrl ? (
                                    <div className="relative size-20 shrink-0 overflow-hidden border-[3px] border-line shadow-hard-sm">
                                        <Image
                                            src={question.imageUrl}
                                            alt={`ภาพประกอบคำถามข้อ ${index + 1}`}
                                            fill
                                            className="object-cover"
                                            sizes="80px"
                                        />
                                    </div>
                                ) : null}

                                <div className="min-w-0 flex-1">
                                    <h3 className="text-lg font-bold text-ink">
                                        {question.questionText}
                                    </h3>
                                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                        <span className="kq-badge kq-badge-grape">
                                            {QUESTION_TYPE_LABEL[question.type]}
                                        </span>
                                        <span className="kq-badge kq-badge-cyan">
                                            <Clock className="size-3" aria-hidden />
                                            {question.timeLimit} วินาที
                                        </span>
                                        <span className="kq-badge kq-badge-mint">
                                            <Trophy className="size-3" aria-hidden />
                                            {question.points} คะแนน
                                        </span>
                                    </div>
                                </div>

                                <div className="flex shrink-0 flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleEditQuestion(question)}
                                        className="kq-btn kq-btn-sm kq-btn-paper"
                                    >
                                        <Edit className="size-3.5" />
                                        แก้ไข
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteQuestion(question.id)}
                                        className="kq-btn kq-btn-sm kq-btn-danger"
                                    >
                                        <Trash2 className="size-3.5" />
                                        ลบ
                                    </button>
                                </div>
                            </div>

                            <div className="border-t-2 border-dashed border-line/30 bg-cream px-5 py-4">
                                <div className="grid gap-2.5 sm:grid-cols-2">
                                    {question.answers.map((answer) => (
                                        <div
                                            key={answer.id}
                                            className="flex items-center gap-2.5 border-[3px] border-line bg-paper px-3 py-2 shadow-hard-sm"
                                        >
                                            <span
                                                className={`size-5 shrink-0 border-[3px] border-line ${getColorClass(answer.color)}`}
                                                aria-hidden
                                            />
                                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                                                {answer.answerText}
                                            </span>
                                            {answer.isCorrect ? (
                                                <span className="kq-badge kq-badge-mint">ข้อถูก</span>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {/* ================= ADD / EDIT QUESTION ================= */}
            <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <p className="kq-overline">
                            {editingQuestionId ? "EDIT QUESTION" : "NEW QUESTION"}
                        </p>
                        <DialogTitle>
                            {editingQuestionId ? "แก้ไขคำถาม" : "เพิ่มคำถามใหม่"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingQuestionId
                                ? "แก้ไขรายละเอียดคำถามและตัวเลือก"
                                : "กรอกข้อมูลคำถามและตัวเลือกคำตอบ"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-2">
                        {/* Question Text */}
                        <div>
                            <label htmlFor="question-text" className="kq-label">
                                คำถาม *
                            </label>
                            <textarea
                                id="question-text"
                                value={newQuestion.questionText}
                                onChange={(e) =>
                                    setNewQuestion({ ...newQuestion, questionText: e.target.value })
                                }
                                className="kq-textarea"
                                placeholder="พิมพ์คำถามของคุณ..."
                                rows={3}
                            />
                        </div>

                        {/* Settings */}
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <label htmlFor="question-type" className="kq-label">
                                    ประเภทคำถาม
                                </label>
                                <Select
                                    value={newQuestion.type}
                                    onValueChange={(v) =>
                                        setNewQuestion({
                                            ...newQuestion,
                                            type: v as "MULTIPLE_CHOICE" | "TRUE_FALSE" | "TYPE_ANSWER",
                                        })
                                    }
                                >
                                    <SelectTrigger id="question-type" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MULTIPLE_CHOICE">
                                            ปรนัย 4 ตัวเลือก
                                        </SelectItem>
                                        <SelectItem value="TRUE_FALSE">ถูก / ผิด</SelectItem>
                                        <SelectItem value="TYPE_ANSWER">พิมพ์คำตอบ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label htmlFor="question-time" className="kq-label">
                                    เวลา (วินาที)
                                </label>
                                <Select
                                    value={newQuestion.timeLimit.toString()}
                                    onValueChange={(v) =>
                                        setNewQuestion({ ...newQuestion, timeLimit: parseInt(v) })
                                    }
                                >
                                    <SelectTrigger id="question-time" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[5, 10, 15, 20, 30, 45, 60, 90, 120].map((t) => (
                                            <SelectItem key={t} value={t.toString()}>
                                                {t} วินาที
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label htmlFor="question-points" className="kq-label">
                                    คะแนน
                                </label>
                                <Select
                                    value={newQuestion.points.toString()}
                                    onValueChange={(v) =>
                                        setNewQuestion({ ...newQuestion, points: parseInt(v) })
                                    }
                                >
                                    <SelectTrigger id="question-points" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[500, 1000, 1500, 2000].map((p) => (
                                            <SelectItem key={p} value={p.toString()}>
                                                {p} คะแนน
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Image Upload */}
                        <div>
                            <span className="kq-label flex items-center gap-2">
                                <ImageIcon className="size-4" aria-hidden />
                                รูปภาพประกอบ (ไม่บังคับ)
                            </span>
                            {newQuestion.imageUrl ? (
                                <div className="relative">
                                    <div className="relative h-48 w-full overflow-hidden border-[3px] border-line shadow-hard-sm">
                                        <Image
                                            src={newQuestion.imageUrl}
                                            alt="ภาพประกอบคำถาม"
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 672px) 100vw, 672px"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setNewQuestion({ ...newQuestion, imageUrl: "" })
                                        }
                                        aria-label="ลบรูปภาพ"
                                        className="kq-btn kq-btn-sm kq-btn-danger absolute -right-2 -top-3"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="grid place-items-center border-[3px] border-dashed border-line/40 bg-cream p-4">
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
                                </div>
                            )}
                        </div>

                        {/* Answers */}
                        <div>
                            <span className="kq-label">
                                คำตอบ (คลิกช่องสีเพื่อตั้งข้อถูก · เลือกสีได้ที่แถว COLOR)
                            </span>
                            <div className="grid gap-3">
                                {newQuestion.answers.map((answer, index) => (
                                    <div
                                        key={index}
                                        className="border-[3px] border-line bg-cream p-3 shadow-hard-sm"
                                    >
                                        <div className="flex flex-wrap items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => handleSetCorrectAnswer(index)}
                                                aria-pressed={answer.isCorrect}
                                                aria-label={
                                                    answer.isCorrect
                                                        ? `คำตอบที่ ${index + 1} เป็นข้อถูก`
                                                        : `ตั้งคำตอบที่ ${index + 1} เป็นข้อถูก`
                                                }
                                                className={`grid size-10 shrink-0 place-items-center border-[3px] border-line ${getColorClass(
                                                    answer.color
                                                )} ${answer.isCorrect ? "opacity-100" : "opacity-55"}`}
                                            >
                                                {answer.isCorrect ? (
                                                    <Check
                                                        className="size-5 text-[#211543]"
                                                        strokeWidth={3}
                                                    />
                                                ) : (
                                                    <X
                                                        className="size-5 text-[#211543]"
                                                        strokeWidth={3}
                                                    />
                                                )}
                                            </button>
                                            <input
                                                value={answer.answerText}
                                                onChange={(e) => {
                                                    const newAnswers = [...newQuestion.answers];
                                                    newAnswers[index] = {
                                                        ...newAnswers[index],
                                                        answerText: e.target.value,
                                                    };
                                                    setNewQuestion({ ...newQuestion, answers: newAnswers });
                                                }}
                                                placeholder={`คำตอบที่ ${index + 1}`}
                                                aria-label={`คำตอบที่ ${index + 1}`}
                                                className="kq-input min-w-32 flex-1"
                                            />
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-13">
                                            <span className="kq-pixel text-[8px] text-muted-foreground">
                                                COLOR
                                            </span>
                                            {ANSWER_COLORS.map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => handleSetAnswerColor(index, c)}
                                                    aria-label={`เลือกสี ${c}`}
                                                    title={c}
                                                    className={`size-5 border-2 border-line ${getColorClass(
                                                        c
                                                    )} ${
                                                        answer.color === c
                                                            ? "outline-2 outline-offset-2 outline-line"
                                                            : "opacity-40 hover:opacity-80"
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <button
                            type="button"
                            className="kq-btn kq-btn-paper"
                            onClick={() => {
                                setShowAddQuestion(false);
                                resetNewQuestion();
                            }}
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            className="kq-btn kq-btn-yellow"
                            onClick={handleQuestionSubmit}
                        >
                            {editingQuestionId ? (
                                <Save className="size-4" />
                            ) : (
                                <Plus className="size-4" />
                            )}
                            {editingQuestionId ? "บันทึกการแก้ไข" : "เพิ่มคำถาม"}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
