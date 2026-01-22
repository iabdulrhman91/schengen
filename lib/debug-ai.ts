
"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export async function listModelsAction() {
    try {
        const result = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_AI_API_KEY}`);
        const data = await result.json();
        console.log("Available Models:", JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error("List Models Error:", error);
        return null;
    }
}
