"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Sparkles,
    Plus,
    MoreVertical,
    Play,
    Edit,
    Trash2,
    FileQuestion,
    ArrowLeft
} from "lucide-react";
import { toast } from "sonner";

interface Quiz {
    id: string;
    title: string;
    description: string | null;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
    _count: {
        questions: number;
        gameSessions: number;
    };
}

export default function QuizzesPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchQuizzes();
        }
    }, [isAuthenticated]);

    const fetchQuizzes = async () => {
        try {
            const res = await fetch("/api/quizzes");
            const data = await res.json();
            if (data.success) {
                setQuizzes(data.data);
            }
        } catch {
            toast.error("ไม่สามารถโหลด Quiz ได้");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            const res = await fetch(`/api/quizzes/${deleteId}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (data.success) {
                setQuizzes(quizzes.filter(q => q.id !== deleteId));
                toast.success("ลบ Quiz สำเร็จ");
            } else {
                toast.error(data.error || "ลบ Quiz ไม่สำเร็จ");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setDeleteId(null);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    <Skeleton className="h-8 w-48 mb-8" />
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-48" />
                        ))}
                    </div>
                </div>
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
                    <Link href="/quizzes/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            สร้าง Quiz
                        </Button>
                    </Link>
                </div>
            </nav>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    กลับไปหน้า Dashboard
                </Link>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Quiz ของฉัน</h1>
                        <p className="text-muted-foreground">จัดการ Quiz ทั้งหมดของคุณ</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-48" />
                        ))}
                    </div>
                ) : quizzes.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                <FileQuestion className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">ยังไม่มี Quiz</h3>
                            <p className="text-muted-foreground mb-4 text-center">
                                เริ่มต้นสร้าง Quiz แรกของคุณเลย!
                            </p>
                            <Link href="/quizzes/new">
                                <Button>
                                    <Plus className="w-4 h-4 mr-2" />
                                    สร้าง Quiz
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {quizzes.map((quiz) => (
                            <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-lg truncate">{quiz.title}</CardTitle>
                                            <CardDescription className="line-clamp-2 mt-1">
                                                {quiz.description || "ไม่มีคำอธิบาย"}
                                            </CardDescription>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="shrink-0">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/quizzes/${quiz.id}/edit`}>
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        แก้ไข
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/quizzes/${quiz.id}/host`}>
                                                        <Play className="w-4 h-4 mr-2" />
                                                        เริ่มเกม
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => setDeleteId(quiz.id)}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    ลบ
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Badge variant={quiz.isPublished ? "default" : "secondary"}>
                                            {quiz.isPublished ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
                                        </Badge>
                                        <Badge variant="outline">
                                            {quiz._count.questions} คำถาม
                                        </Badge>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link href={`/quizzes/${quiz.id}/edit`} className="flex-1">
                                            <Button variant="outline" className="w-full">
                                                <Edit className="w-4 h-4 mr-2" />
                                                แก้ไข
                                            </Button>
                                        </Link>
                                        <Link href={`/quizzes/${quiz.id}/host`} className="flex-1">
                                            <Button className="w-full">
                                                <Play className="w-4 h-4 mr-2" />
                                                เริ่มเกม
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการลบ Quiz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            การลบนี้จะไม่สามารถกู้คืนได้ คำถามและข้อมูลทั้งหมดจะถูกลบไปด้วย
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            ลบ Quiz
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
