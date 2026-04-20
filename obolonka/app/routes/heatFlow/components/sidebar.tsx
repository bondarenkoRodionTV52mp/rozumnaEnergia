import '@xyflow/react/dist/style.css';
import React, { useState, useCallback, useEffect, type ReactElement } from 'react';

interface SidebarProps {
    width: number;
    setWidth: (width: number) => void;
}

export function Sidebar({ width, setWidth }: SidebarProps): ReactElement {
    const [isResizing, setIsResizing] = useState<boolean>(false);

    const startResizing = useCallback((e: React.MouseEvent<HTMLDivElement>): void => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback(
        (e: MouseEvent): void => {
            if (isResizing) {
                const newWidth = e.clientX;
                if (newWidth > 200 && newWidth < 500) {
                    setWidth(newWidth);
                    localStorage.setItem('sidebar-width', newWidth.toString());
                }
            }
        },
        [isResizing, setWidth]
    );

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);

            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            document.body.style.pointerEvents = 'none';
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
            document.body.style.pointerEvents = 'auto';
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);


    const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string): void => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside
            className="relative flex flex-col h-full border-r border-gray-200 bg-slate-50 transition-all duration-40"
            style={{
                width: `${width}px`,
                minWidth: `${width}px`,
                willChange: 'width'
            }}
        >
            <div className="px-5 py-6 flex items-center gap-2 select-none pointer-events-none">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <h2 className="text-[11px] font-black uppercase tracking-[1.5px] text-slate-400">
                    Node Library
                </h2>
            </div>

            <div className="px-4 flex flex-col gap-3">

                {/* House Card */}
                <div
                    draggable
                    onDragStart={(e) => onDragStart(e, 'house')}
                    className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md transition-all duration-200"
                >
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-sm font-bold text-slate-700 leading-tight">House</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Consumer</span>
                    </div>
                </div>

                {/* Heat Source Card */}
                <div
                    draggable
                    onDragStart={(e) => onDragStart(e, 'heat')}
                    className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-orange-400 hover:shadow-md transition-all duration-200"
                >
                    <div className="flex items-center justify-center w-10 h-10 bg-orange-50 rounded-lg text-orange-600 group-hover:scale-110 transition-transform">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.5 3.5 6.5 1.5 2 1 4.5-1 6.5A2.5 2.5 0 0 1 12 20a2.5 2.5 0 0 1-3.5-5.5z" />
                        </svg>
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-sm font-bold text-slate-700 leading-tight">Heat Source</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Producer</span>
                    </div>
                </div>
            </div>

            <div
                onMouseDown={startResizing}
                className={`
                    absolute right-0 top-0 bottom-0 z-[100]
                    flex items-center justify-center
                    w-[16px] cursor-col-resize
                `}
            >
                <div
                    className={`w-[6px] h-[24px] rounded-[2px]
                        flex flex-col justify-between py-1
                        ${isResizing ? 'bg-blue-600' : 'bg-slate-400'}
                    `}
                >
                </div>
            </div>
        </aside>
    );
}
