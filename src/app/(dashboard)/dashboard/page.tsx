"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sparkles,
    Plus,
    LayoutDashboard,
    FileQuestion,
    BarChart3,
    Settings,
    LogOut,
    ChevronRight,
    PlayCircle,
    Users,
    Trophy
} from "lucide-react";

export default function DashboardPage() {
    const router = useRouter();
    const { user, isLoading, isAuthenticated, checkAuth, logout } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isLoading, isAuthenticated, router]);

    const handleLogout = async () => {
        await logout();
        router.push("/");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="border-b bg-card">
                    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                </div>
                <div className="container mx-auto px-4 py-8">
                    <Skeleton className="h-8 w-64 mb-8" />
                    <div className="grid md:grid-cols-3 gap-6">
                        <Skeleton className="h-40" />
                        <Skeleton className="h-40" />
                        <Skeleton className="h-40" />
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return null;
    }

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

                    <div className="flex items-center gap-4">
                        <Link href="/quizzes/new">
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                สร้าง Quiz
                            </Button>
                        </Link>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback className="bg-primary text-primary-foreground">
                                            {user.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end">
                                <div className="flex items-center gap-2 p-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                            {user.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{user.name}</span>
                                        <span className="text-xs text-muted-foreground">{user.email}</span>
                                    </div>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard" className="cursor-pointer">
                                        <LayoutDashboard className="w-4 h-4 mr-2" />
                                        Dashboard
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/quizzes" className="cursor-pointer">
                                        <FileQuestion className="w-4 h-4 mr-2" />
                                        Quiz ของฉัน
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/reports" className="cursor-pointer">
                                        <BarChart3 className="w-4 h-4 mr-2" />
                                        รายงาน
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/settings" className="cursor-pointer">
                                        <Settings className="w-4 h-4 mr-2" />
                                        ตั้งค่า
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                                    <LogOut className="w-4 h-4 mr-2" />
                                    ออกจากระบบ
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">สวัสดี, {user.name}! 👋</h1>
                    <p className="text-muted-foreground">ยินดีต้อนรับกลับมา พร้อมสร้าง Quiz สุดมันส์หรือยัง?</p>
                </div>

                {/* Quick Actions */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Card className="group hover:shadow-lg transition-shadow cursor-pointer border-none bg-gradient-to-br from-primary to-primary/80">
                        <Link href="/quizzes/new">
                            <CardHeader className="text-primary-foreground">
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                    <ChevronRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <CardTitle className="text-xl">สร้าง Quiz ใหม่</CardTitle>
                                <CardDescription className="text-primary-foreground/80">
                                    เริ่มต้นสร้าง Quiz ของคุณเลย
                                </CardDescription>
                            </CardHeader>
                        </Link>
                    </Card>

                    <Card className="group hover:shadow-lg transition-shadow cursor-pointer">
                        <Link href="/quizzes">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                                        <FileQuestion className="w-6 h-6 text-primary" />
                                    </div>
                                    <ChevronRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                                </div>
                                <CardTitle className="text-xl">Quiz ของฉัน</CardTitle>
                                <CardDescription>
                                    จัดการ Quiz ทั้งหมดของคุณ
                                </CardDescription>
                            </CardHeader>
                        </Link>
                    </Card>

                    <Card className="group hover:shadow-lg transition-shadow cursor-pointer">
                        <Link href="/reports">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                                        <BarChart3 className="w-6 h-6 text-primary" />
                                    </div>
                                    <ChevronRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                                </div>
                                <CardTitle className="text-xl">รายงาน</CardTitle>
                                <CardDescription>
                                    ดูสถิติและผลการเล่น
                                </CardDescription>
                            </CardHeader>
                        </Link>
                    </Card>
                </div>

                {/* Stats Overview */}
                <div className="grid md:grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(70, 23, 143, 0.1)" }}>
                                    <FileQuestion className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">0</p>
                                    <p className="text-sm text-muted-foreground">Quiz ทั้งหมด</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(102, 191, 57, 0.1)" }}>
                                    <PlayCircle className="w-6 h-6" style={{ color: "var(--answer-green)" }} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">0</p>
                                    <p className="text-sm text-muted-foreground">เกมที่เล่น</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(69, 163, 229, 0.1)" }}>
                                    <Users className="w-6 h-6" style={{ color: "var(--answer-blue)" }} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">0</p>
                                    <p className="text-sm text-muted-foreground">ผู้เล่นทั้งหมด</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(235, 103, 15, 0.1)" }}>
                                    <Trophy className="w-6 h-6" style={{ color: "var(--answer-yellow)" }} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">0</p>
                                    <p className="text-sm text-muted-foreground">คะแนนเฉลี่ย</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Quizzes */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Quiz ล่าสุด</CardTitle>
                                <CardDescription>Quiz ที่คุณสร้างล่าสุด</CardDescription>
                            </div>
                            <Link href="/quizzes">
                                <Button variant="outline" size="sm">
                                    ดูทั้งหมด
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                <FileQuestion className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">ยังไม่มี Quiz</h3>
                            <p className="text-muted-foreground mb-4">เริ่มต้นสร้าง Quiz แรกของคุณเลย!</p>
                            <Link href="/quizzes/new">
                                <Button>
                                    <Plus className="w-4 h-4 mr-2" />
                                    สร้าง Quiz
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
