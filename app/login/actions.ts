'use server'

import { signIn } from "@/auth"
import { AuthError } from "next-auth"

export async function authenticate(prevState: any, formData: FormData) {
    try {
        await signIn('credentials', {
            ...Object.fromEntries(formData),
            redirect: false,
        })
        return { success: true };
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return { message: 'بيانات الدخول غير صحيحة. يرجى التحقق من اسم المستخدم وكلمة المرور.' };
                default:
                    return { message: 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.' };
            }
        }
        throw error
    }
}
