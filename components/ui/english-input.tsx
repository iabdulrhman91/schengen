"use client"

import * as React from "react"
import { Input, InputProps } from "@/components/ui/core"

const toEnglishDigits = (str: string) => {
    return str.replace(/[٠-٩]/g, d => "0123456789"['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
}

export interface EnglishNumberInputProps extends InputProps { }

export const EnglishNumberInput = React.forwardRef<HTMLInputElement, EnglishNumberInputProps>(
    ({ onChange, ...props }, ref) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const originalValue = e.target.value;
            const englishValue = toEnglishDigits(originalValue);

            if (originalValue !== englishValue) {
                e.target.value = englishValue;
            }

            if (onChange) {
                onChange(e);
            }
        };

        return (
            <Input
                {...props}
                ref={ref}
                onChange={handleChange}
                // Force LTR and Sans font
                className={`${props.className || ''} font-sans`}
                // Use type="text" to prevent browser locale from hijacking digits
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
            />
        )
    }
)
EnglishNumberInput.displayName = "EnglishNumberInput"
