"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    Sparkles,
    ArrowLeft,
    BarChart3,
    Users,
    FileQuestion,
    Trophy,
    Clock
} from "lucide-react";
import { toast } from "sonner";

interface GameSession {
    id: string;
    pin: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    createdAt: string;
    quiz: {
        title: string;
    };
    _count: {
        players: number;
    };
}

export default function ReportsPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore();
    const [sessions, setSessions] = useState<GameSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
            fetchReports();
        }
    }, [isAuthenticated]);

    const fetchReports = async () => {
        try {
            const res = await fetch("/api/reports");
            const data = await res.json();
            if (data.success) {
                setSessions(data.data);
            }
        } catch {
            toast.error("ไม่สามารถโหลดรายงานได้");
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "FINISHED":
                return <Badge variant="default" className="bg-green-500">เสร็จสิ้น</Badge>;
            case "LOBBY":
                return <Badge variant="secondary">รอผู้เล่น</Badge>;
            case "PLAYING":
            case "QUESTION":
                return <Badge variant="default" className="bg-blue-500">กำลังเล่น</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    <Skeleton className="h-8 w-48 mb-8" />
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-24" />
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
                </div>
            </nav>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    กลับไปหน้า Dashboard
                </Link>

                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">รายงาน</h1>
                        <p className="text-muted-foreground">ดูประวัติการเล่นและสถิติ</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-24" />
                        ))}
                    </div>
                ) : sessions.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                <BarChart3 className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">ยังไม่มีรายงาน</h3>
                            <p className="text-muted-foreground mb-4 text-center">
                                เริ่มจัดเกมเพื่อดูรายงานการเล่น
                            </p>
                            <Link href="/quizzes">
                                <Button>ไปที่ Quiz ของฉัน</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {sessions.map((session) => (
                            <Card key={session.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <FileQuestion className="w-5 h-5 text-muted-foreground" />
                                                {session.quiz.title}
                                            </CardTitle>
                                            <CardDescription className="flex items-center gap-4 mt-2">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {formatDate(session.createdAt)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-4 h-4" />
                                                    {session._count.players} ผู้เล่น
                                                </span>
                                                <span className="font-mono text-sm">
                                                    PIN: {session.pin}
                                                </span>
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(session.status)}
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
