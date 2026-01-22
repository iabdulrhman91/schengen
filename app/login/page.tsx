'use client';

import { useActionState, useEffect } from 'react';
import { authenticate } from './actions';
import { Button } from "@/components/ui/core";
import LanguageToggle from "@/components/LanguageToggle";
import { User, Lock, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(authenticate, undefined);

    useEffect(() => {
        if (state?.success) {
            window.location.replace('/requests');
        }
    }, [state]);

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white" dir="rtl">
            {/* Left Decor Pane - Visible only on LG */}
            <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-700 to-indigo-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 rounded-full -ml-32 -mb-32 blur-2xl" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                            <ShieldCheck className="text-blue-700" size={24} />
                        </div>
                        <span className="text-xl font-extrabold tracking-tight font-premium uppercase">Tejwal Hub</span>
                    </div>

                    <h1 className="text-5xl font-black mb-6 leading-tight font-premium">
                        الجيل القادم من <br />
                        <span className="text-blue-300">تشغيل الشنغن.</span>
                    </h1>
                    <p className="text-lg text-blue-100 max-w-md leading-relaxed opacity-90">
                        منصة موحدة تربط الوكلاء والموظفين لإدارة طلبات التأشيرة بكفاءة وأمان تام.
                    </p>
                </div>

                <div className="relative z-10 border-t border-white/10 pt-8 mt-auto">
                    <p className="text-sm font-medium opacity-70">© 2026 Tejwal Schengen System. All rights reserved.</p>
                </div>
            </div>

            {/* Right Form Pane */}
            <div className="flex flex-col relative">
                {/* Header with Language Toggle */}
                <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-white/80 backdrop-blur-sm z-20">
                    <div className="lg:hidden flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                            <ShieldCheck className="text-white" size={18} />
                        </div>
                        <span className="text-sm font-bold text-gray-900 font-premium">Tejwal Hub</span>
                    </div>
                    <div className="mr-auto" />
                    <LanguageToggle />
                </header>

                <main className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16 max-w-xl mx-auto w-full">
                    <div className="w-full space-y-8">
                        <div className="text-right">
                            <h2 className="text-3xl font-black text-gray-900 font-premium">تسجيل الدخول</h2>
                            <p className="text-gray-500 mt-2">أهلاً بك مجدداً، يرجى إدخال بياناتك</p>
                        </div>

                        <form action={formAction} className="space-y-5">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700 mr-1">اسم المستخدم</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        name="username"
                                        type="text"
                                        className="w-full h-12 pr-11 pl-4 bg-gray-50 border border-gray-200 rounded-xl text-right focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white outline-none transition-all"
                                        placeholder="user_tejwal"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700 mr-1 text-right">كلمة المرور</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        name="password"
                                        type="password"
                                        className="w-full h-12 pr-11 pl-4 bg-gray-50 border border-gray-200 rounded-xl text-right focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white outline-none transition-all font-mono"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            {state?.message && (
                                <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="w-2 h-2 rounded-full bg-red-600" />
                                    {state.message}
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={isPending}
                                className={`w-full h-12 rounded-xl text-white font-black text-lg shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 ${isPending ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98]'
                                    }`}
                            >
                                {isPending ? 'جاري التحقق...' : (
                                    <>
                                        <span>دخول للنظام</span>
                                        <ArrowRight size={20} className="rotate-180" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="pt-8 text-center">
                            <p className="text-sm text-gray-400">
                                هل نسيت بيانات الدخول؟
                                <a href="#" className="text-blue-600 font-bold mr-1 hover:underline">تواصل مع الدعم الفني</a>
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
