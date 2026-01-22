
export interface ParsedPassportData {
    fullName: string;
    passportNumber: string;
    birthDate: string; // YYYY-MM-DD
    expiryDate: string; // YYYY-MM-DD
    issueDate?: string; // YYYY-MM-DD
    sex: string;
    nationality: string;
    placeOfBirth?: string;
    isIncomplete?: boolean;
    confidence?: Record<string, number>;
    rawText?: string;
}

export interface PassportValidationResult {
    isValid: boolean;
    errors: string[];
    uncertainFields: string[];
    isHighConfidence: boolean;
}

/**
 * Validates passport data extracted from AI Vision.
 * Implements age, future expiry, and logical date relations.
 */
export function validatePassportData(data: Partial<ParsedPassportData>): PassportValidationResult {
    const uncertainFields: string[] = [];
    const now = new Date();

    // 1. Passport Number Pattern (Min 6 chars, alphanumeric)
    if (data.passportNumber) {
        const pNum = data.passportNumber.toString().trim();
        const validPattern = /^[A-Z0-9]{6,15}$/i.test(pNum);
        if (!validPattern || pNum.length < 6) uncertainFields.push('passportNumber');
    } else {
        uncertainFields.push('passportNumber');
    }

    // 2. Date of Birth (0-120 years)
    if (data.birthDate) {
        const bDate = new Date(data.birthDate);
        const age = now.getFullYear() - bDate.getFullYear();
        if (isNaN(bDate.getTime()) || age < 0 || age > 120) {
            uncertainFields.push('birthDate');
        }
    } else {
        uncertainFields.push('birthDate');
    }

    // 3. Expiry Date (Must be in future)
    if (data.expiryDate) {
        const eDate = new Date(data.expiryDate);
        if (isNaN(eDate.getTime()) || eDate <= now) {
            uncertainFields.push('expiryDate');
        }
    } else {
        uncertainFields.push('expiryDate');
    }

    // 4. Issue Date (Before expiry and after birth)
    if (data.issueDate) {
        const iDate = new Date(data.issueDate);
        const eDate = data.expiryDate ? new Date(data.expiryDate) : null;
        const bDate = data.birthDate ? new Date(data.birthDate) : null;

        if (isNaN(iDate.getTime()) || iDate > now) {
            uncertainFields.push('issueDate');
        } else {
            if (eDate && !isNaN(eDate.getTime()) && iDate >= eDate) uncertainFields.push('issueDate');
            if (bDate && !isNaN(bDate.getTime()) && iDate <= bDate) uncertainFields.push('issueDate');
        }
    } else {
        uncertainFields.push('issueDate');
    }

    // 5. Conflict Resolution (Identical dates that shouldn't be)
    if (data.birthDate && data.issueDate && data.birthDate === data.issueDate) {
        if (!uncertainFields.includes('birthDate')) uncertainFields.push('birthDate');
        if (!uncertainFields.includes('issueDate')) uncertainFields.push('issueDate');
    }

    if (data.issueDate && data.expiryDate && data.issueDate === data.expiryDate) {
        if (!uncertainFields.includes('issueDate')) uncertainFields.push('issueDate');
        if (!uncertainFields.includes('expiryDate')) uncertainFields.push('expiryDate');
    }

    // Threshold for high confidence based on uncertainty and custom confidence score if available
    const confidenceThreshold = 0.8;
    const avgConfidence = data.confidence ?
        Object.values(data.confidence).reduce((a: number, b: number) => a + b, 0) / Object.keys(data.confidence).length : 1;

    return {
        isValid: uncertainFields.length === 0,
        errors: [],
        uncertainFields,
        isHighConfidence: uncertainFields.length <= 1 && avgConfidence >= confidenceThreshold
    };
}

/**
 * Normalizes date strings to YYYY-MM-DD
 */
export function normalizeAIDate(dateStr: string): string {
    if (!dateStr) return '';

    // Check if already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}
