"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export interface ParsedPassportData {
    fullName: string;
    passportNumber: string;
    birthDate: string; // YYYY-MM-DD
    expiryDate: string; // YYYY-MM-DD
    issueDate?: string; // YYYY-MM-DD
    sex: string;
    nationality: string;
    placeOfBirth?: string;
    confidence?: Record<string, number>;
    rawText?: string;
}

export async function extractPassportAction(base64Image: string) {
    if (!process.env.GOOGLE_AI_API_KEY) {
        console.warn("GOOGLE_AI_API_KEY is missing.");
        return null;
    }

    try {
        const modelName = process.env.GOOGLE_AI_MODEL || "gemini-1.5-flash";
        const model = genAI.getGenerativeModel({ model: modelName });

        // Extract mime type and base64 data
        const mimeMatch = base64Image.match(/^data:([^;]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const base64Data = base64Image.replace(/^data:[^;]+;base64,/, "");

        const prompt = `
            Extract passport data from this image.
            Return ONLY a JSON object:
            {
                "passportNumber": "string",
                "fullNameLatin": "string",
                "nationality": "ISO 3-letter",
                "sex": "M/F",
                "dateOfBirth": "YYYY-MM-DD",
                "dateOfIssue": "YYYY-MM-DD",
                "dateOfExpiry": "YYYY-MM-DD",
                "placeOfBirth": "string",
                "confidence": {"field": 0-1},
                "rawText": "string"
            }
        `;

        let attempt = 0;
        const maxRetries = 2;
        let result;

        while (attempt <= maxRetries) {
            try {
                result = await model.generateContent([
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType,
                        },
                    },
                    { text: prompt },
                ]);
                break; // Success!
            } catch (error: any) {
                const isRetryable = error.message?.includes("503") || error.message?.includes("429");

                if (isRetryable && attempt < maxRetries) {
                    const waitTime = error.message?.includes("429") ? 5000 * (attempt + 1) : 2000 * (attempt + 1);
                    console.warn(`Gemini API error (${error.message?.includes("429") ? '429' : '503'}), retrying in ${waitTime}ms... attempt ${attempt + 1}`);
                    attempt++;
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                throw error;
            }
        }

        if (!result) throw new Error("Failed to get response from AI");

        const response = await result.response;
        let text = response.text().trim();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        throw new Error("Invalid JSON in AI response");
    } catch (error: any) {
        console.error("AI Vision Detailed Error:", error);
        if (error.message?.includes("429")) {
            throw new Error("عذراً، تم تجاوز الحد المسموح به لطلبات الذكاء الأصطناعي اليوم. يرجى الانتظار قليلاً أو إدخال البيانات يدوياً.");
        }
        if (error.message?.includes("404")) {
            throw new Error("عذراً، نوع الحساب الخاص بالذكاء الاصطناعي لا يدعم هذا النموذج حالياً.");
        }
        if (error.message?.includes("503")) {
            throw new Error("خادم الذكاء الاصطناعي مشغول حالياً، يرجى المحاولة مرة أخرى.");
        }
        throw new Error("حدث خطأ أثناء معالجة الصورة، يرجى المحاولة مرة أخرى أو الإدخال يدوياً.");
    }
}
