// src/components/common/LoadingSpinner.js
import React from 'react';

export const LoadingSpinner = ({ size = 'medium', fullScreen = false, message = 'Loading...' }) => {
    const sizeClasses = {
        small: 'w-6 h-6 border-2',
        medium: 'w-12 h-12 border-4',
        large: 'w-16 h-16 border-4'
    };

    const spinner = (
        <div className="flex flex-col items-center justify-center gap-3">
            <div className={`${sizeClasses[size]} border-focusPurple border-t-transparent rounded-full animate-spin`} />
            {message && <p className="text-sm text-gray-500 font-medium animate-pulse">{message}</p>}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
                {spinner}
            </div>
        );
    }

    return spinner;
};

export const SkeletonLoader = ({ type = 'card', count = 1 }) => {
    const skeletons = [];
    
    for (let i = 0; i < count; i++) {
        if (type === 'card') {
            skeletons.push(
                <div key={i} className="bg-[#f0f2f5] rounded-2xl p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
            );
        } else if (type === 'list') {
            skeletons.push(
                <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>
            );
        } else if (type === 'table') {
            skeletons.push(
                <div key={i} className="animate-pulse">
                    <div className="h-10 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-10 bg-gray-100 rounded w-full mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-10 bg-gray-100 rounded w-full"></div>
                </div>
            );
        }
    }
    
    return <>{skeletons}</>;
};