"use client";

import React from 'react';
import { cn } from '@/components/ui/core';
import { ColumnDataType } from './types';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import {
    Phone,
    Link as LinkIcon,
    Check,
    User,
    Calendar,
    AlertCircle
} from 'lucide-react';

interface NotionCellProps {
    value: any;
    type: ColumnDataType;
    options?: { label: string; value: string; color?: string }[];
    isEditable?: boolean;
    onUpdate?: (value: any) => void;
}

export function NotionCell({ value, type, options, isEditable, onUpdate }: NotionCellProps) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [localValue, setLocalValue] = React.useState(value);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            if (type === 'text' || type === 'number') {
                inputRef.current.select();
            }
        }
    }, [isEditing, type]);

    const handleBlur = () => {
        setIsEditing(false);
        if (localValue !== value) {
            onUpdate?.(localValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
        if (e.key === 'Escape') {
            setLocalValue(value);
            setIsEditing(false);
        }
    };

    if (isEditing && isEditable) {
        if (type === 'status' || type === 'select') {
            return (
                <select
                    className="w-full h-full bg-blue-50/50 outline-none border-none text-[13px] font-sans"
                    value={localValue || ''}
                    onChange={(e) => {
                        setLocalValue(e.target.value);
                        onUpdate?.(e.target.value);
                        setIsEditing(false);
                    }}
                    onBlur={() => setIsEditing(false)}
                    autoFocus
                >
                    <option value="">--</option>
                    {options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            );
        }
        return (
            <input
                ref={inputRef}
                className="w-full h-full bg-blue-50/50 outline-none border-none px-0 text-[13px] font-sans"
                value={localValue || ''}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
        );
    }

    const content = () => {
        if (value === null || value === undefined || value === '') {
            return <span className="opacity-0">--</span>;
        }

        switch (type) {
            case 'status':
            case 'select':
                const option = options?.find(opt => opt.value === value);
                const color = option?.color || 'gray';
                return (
                    <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border",
                        getStatusStyles(color)
                    )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", getDotColor(color))} />
                        <span className="truncate max-w-[120px]">{option?.label || value}</span>
                    </div>
                );

            case 'date':
                try {
                    const date = typeof value === 'string' ? parseISO(value) : value;
                    return (
                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                            <Calendar size={12} className="text-gray-400" />
                            <span>{format(date, "d MMM yyyy", { locale: arSA })}</span>
                        </div>
                    );
                } catch (e) {
                    return <span>{value}</span>;
                }

            case 'boolean':
                return (
                    <div
                        onClick={(e) => { e.stopPropagation(); onUpdate?.(!value); }}
                        className={cn(
                            "w-4 h-4 rounded flex items-center justify-center transition-colors cursor-pointer",
                            value ? "bg-emerald-500 text-white" : "border-2 border-gray-100 bg-gray-50 text-transparent"
                        )}
                    >
                        {value && <Check size={10} strokeWidth={4} />}
                    </div>
                );

            case 'person':
                return (
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold shadow-inner">
                            <User size={10} />
                        </div>
                        <span className="font-semibold text-gray-800">{value}</span>
                    </div>
                );

            case 'phone':
                return (
                    <div className="flex items-center gap-2 text-blue-600 font-mono">
                        <Phone size={12} className="opacity-40" />
                        <span>{value}</span>
                    </div>
                );

            case 'url':
                return (
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 hover:underline transition-all"
                    >
                        <LinkIcon size={12} className="opacity-40" />
                        <span className="truncate max-w-[150px]">{value}</span>
                    </a>
                );

            case 'number':
                return <span className="font-mono text-gray-900 font-bold">{value.toLocaleString()}</span>;

            default:
                return <span className="text-gray-900 font-medium">{value}</span>;
        }
    };

    return (
        <div
            className={cn(
                "w-full h-full flex items-center min-h-[32px]",
                isEditable && "cursor-text"
            )}
            onClick={(e) => {
                if (isEditable && type !== 'boolean') {
                    e.stopPropagation();
                    setIsEditing(true);
                }
            }}
        >
            {content()}
        </div>
    );
}

function getStatusStyles(color: string) {
    const map: any = {
        'blue': 'bg-blue-50 border-blue-100 text-blue-700',
        'red': 'bg-red-50 border-red-100 text-red-700',
        'orange': 'bg-orange-50 border-orange-100 text-orange-700',
        'purple': 'bg-purple-50 border-purple-100 text-purple-700',
        'green': 'bg-emerald-50 border-emerald-100 text-emerald-700',
        'gray': 'bg-gray-50 border-gray-100 text-gray-600',
        'amber': 'bg-amber-50 border-amber-100 text-amber-800',
    };
    return map[color] || map['gray'];
}

function getDotColor(color: string) {
    const map: any = {
        'blue': 'bg-blue-500',
        'red': 'bg-red-500',
        'orange': 'bg-orange-500',
        'purple': 'bg-purple-500',
        'green': 'bg-emerald-500',
        'gray': 'bg-gray-400',
        'amber': 'bg-amber-500',
    };
    return map[color] || map['gray'];
}
