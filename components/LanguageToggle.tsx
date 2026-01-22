'use client';

import { useState } from 'react';
import { Button } from './ui/core';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
    const [lang, setLang] = useState<'AR' | 'EN'>('AR');

    const toggle = () => {
        const next = lang === 'AR' ? 'EN' : 'AR';
        setLang(next);
        document.documentElement.dir = next === 'AR' ? 'rtl' : 'ltr';
        document.documentElement.lang = next === 'AR' ? 'ar' : 'en';
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-all"
        >
            <Globe size={16} />
            <span>{lang === 'AR' ? 'English' : 'عربي'}</span>
        </Button>
    );
}
