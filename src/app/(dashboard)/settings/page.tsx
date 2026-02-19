"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
    Sparkles,
    ArrowLeft,
    Settings,
    User,
    LogOut,
    Palette
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, checkAuth, logout } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    const handleLogout = async () => {
        await logout();
        toast.success("ออกจากระบบสำเร็จ");
        router.push("/");
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    <Skeleton className="h-8 w-48 mb-8" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        );
    }

    if (!user) return null;

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
            <main className="container mx-auto px-4 py-8 max-w-2xl">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    กลับไปหน้า Dashboard
                </Link>

                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Settings className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">ตั้งค่า</h1>
                        <p className="text-muted-foreground">จัดการบัญชีและการตั้งค่าของคุณ</p>
                    </div>
                </div>

                {/* Profile Section */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5" />
                            โปรไฟล์
                        </CardTitle>
                        <CardDescription>ข้อมูลบัญชีของคุณ</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <Avatar className="w-16 h-16">
                                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                                    {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-lg font-medium">{user.name}</p>
                                <p className="text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Appearance */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="w-5 h-5" />
                            การแสดงผล
                        </CardTitle>
                        <CardDescription>ปรับแต่งธีมและการแสดงผล</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">
                            (ธีมสีม่วง KaQuiz เป็นค่าเริ่มต้น)
                        </p>
                    </CardContent>
                </Card>

                <Separator className="my-6" />

                {/* Logout */}
                <Button
                    variant="destructive"
                    onClick={handleLogout}
                    className="w-full"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    ออกจากระบบ
                </Button>
            </main>
        </div>
    );
}
