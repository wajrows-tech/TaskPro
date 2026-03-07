import React from 'react';
import { cn } from '../../utils.ts';

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                'animate-pulse rounded-md bg-gray-800/60',
                className
            )}
        />
    );
}

// Pre-built layout skeletons for common page types
export function DashboardSkeleton() {
    return (
        <div className="p-8 space-y-6">
            <Skeleton className="h-10 w-64 mb-8" />

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                <div className="lg:col-span-2 space-y-4">
                    <Skeleton className="h-8 w-48 mb-4" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-8 w-40 mb-4" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                </div>
            </div>
        </div>
    );
}

export function TableSkeleton() {
    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center mb-8">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
            </div>

            <div className="bg-[#1A1A24] rounded-xl border border-gray-800 p-4">
                {/* Header */}
                <div className="flex justify-between border-b border-gray-800 pb-4 mb-4 gap-4">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                </div>

                {/* Rows */}
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="flex justify-between py-4 border-b border-gray-800/50 gap-4">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}
