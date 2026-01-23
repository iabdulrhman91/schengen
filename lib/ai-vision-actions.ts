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
    const startTime = Date.now();

    // 1. Log Start & Image Size
    const sizeInBytes = Buffer.byteLength(base64Image, 'utf8');
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    console.log(`[AI Vision] Starting extraction. Image size: ${sizeInKB} KB`);

    if (!process.env.GOOGLE_AI_API_KEY) {
        console.error("[AI Vision] Critical Error: GOOGLE_AI_API_KEY is missing in environment variables.");
        return null;
    }

    try {
        // List of models to try in order of preference
        const modelsToTry = [
            process.env.GOOGLE_AI_MODEL, // 1. Primary from environment
            "gemini-1.5-flash",          // 2. Standard Flash (Stable)
            "gemini-2.0-flash",          // 3. New Flash (if available)
            "gemini-pro-vision"          // 4. Legacy Pro Vision (Backup)
        ].filter(Boolean) as string[];

        // Extract mime type and base64 data
        const mimeMatch = base64Image.match(/^data:([^;]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const base64Data = base64Image.replace(/^data:[^;]+;base64,/, "");

        // Remove duplicates
        const uniqueModels = [...new Set(modelsToTry)];

        let result;
        let lastError;
        let successModel = "";

        // Try each model until one works
        for (const modelName of uniqueModels) {
            try {
                console.log(`[AI Vision] Trying model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });

                result = await model.generateContent([
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType,
                        },
                    },
                    { text: prompt },
                ]);

                successModel = modelName;
                console.log(`[AI Vision] Success with model: ${modelName}`);
                break; // If successful, exit the loop
            } catch (error: any) {
                const duration = Date.now() - startTime;
                console.warn(`[AI Vision] Failed with model ${modelName} after ${duration}ms: ${error.message}`);
                lastError = error;

                // If it's a 404 (Not Found), try the next model immediately
                if (error.message?.includes("404") || error.message?.includes("not found")) {
                    continue;
                }

                // For other errors (like 429), we could retry the same model, but for simplicity/robustness we move to next
                continue;
            }
        }

        if (!result) {
            console.error(`[AI Vision] All models failed. Last error: ${lastError?.message}`);
            throw lastError || new Error("Failed to get response from any AI model");
        }

        if (!result) throw new Error("Failed to get response from AI (No result object)");

        const response = await result.response;
        let text = response.text().trim();

        console.log(`[AI Vision] Success! Raw response length: ${text.length}`);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log(`[AI Vision] JSON Parsing Successful. Execution time: ${Date.now() - startTime}ms`);
            return parsed;
        }

        throw new Error("Invalid JSON in AI response");
    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error("========================================");
        console.error("[AI Vision] FINAL ERROR LOG");
        console.error(`Duration: ${duration}ms`);
        console.error(`Image Size: ${sizeInKB} KB`);
        console.error("Error Message:", error.message);
        console.error("Stack Trace:", error.stack);
        console.error("========================================");

        if (error.message?.includes("429")) {
            throw new Error("عذراً، تم تجاوز الحد المسموح به لطلبات الذكاء الأصطناعي اليوم. يرجى الانتظار قليلاً أو إدخال البيانات يدوياً.");
        }
        if (error.message?.includes("404")) {
            throw new Error(`عذراً، الموديل ${process.env.GOOGLE_AI_MODEL} غير متوفر أو غير مدعوم في مفتاح API هذا.`);
        }
        if (error.message?.includes("503")) {
            throw new Error("خادم الذكاء الاصطناعي مشغول حالياً، يرجى المحاولة مرة أخرى.");
        }

        // Return generic error to client, but server logs have full details
        throw new Error(`حدث خطأ أثناء معالجة الصورة (${error.message}). يرجى المراجعة يدوياً.`);
    }
}
