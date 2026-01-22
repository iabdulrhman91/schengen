"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TableEngineV2 } from "./TableEngineV2";
import { getCasesPaginatedAction } from "@/lib/actions/table-v2";
import { Loader2 } from "lucide-react";

interface TableEngineV2ClientProps {
    initialCases?: any[];
}

/**
 * Client wrapper for TableEngineV2 with React Query integration
 * Handles server-side pagination and data fetching
 */
export function TableEngineV2Client({ initialCases = [] }: TableEngineV2ClientProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(50);
    const [filters, setFilters] = useState<Record<string, any>>({});
    const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([]);
    const [search, setSearch] = useState("");

    const queryClient = useQueryClient();

    // Fetch paginated data with React Query
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['cases-paginated', currentPage, pageSize, filters, sorting, search],
        queryFn: () => getCasesPaginatedAction({
            page: currentPage,
            pageSize,
            filters,
            sorting,
            search
        }),
        placeholderData: initialCases.length > 0 ? {
            data: initialCases,
            total: initialCases.length,
            page: 1,
            pageSize: initialCases.length,
            totalPages: 1
        } : undefined,
        staleTime: 30000, // 30 seconds
    });

    const handlePageChange = useCallback((newPage: number) => {
        setCurrentPage(newPage);
    }, []);

    if (!data && isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-blue-500" size={40} />
                <span className="ml-3 text-gray-500 font-bold">جاري تحميل البيانات...</span>
            </div>
        );
    }

    return (
        <TableEngineV2
            cases={data?.data || []}
            totalCount={data?.total}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
        />
    );
}
