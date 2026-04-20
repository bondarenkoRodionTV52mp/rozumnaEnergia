import { type ReactElement } from 'react';
import { Handle, Position, useNodes, useReactFlow, type NodeProps } from '@xyflow/react';
import type { NodeData } from '../types/types';
import '../css/nodes.css';

// House Node Component
export function HouseNode({ id, data, selected }: NodeProps): ReactElement {
    const { deleteElements } = useReactFlow();

    const onDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        deleteElements({ nodes: [{ id }] });
    };

    const allNodes = useNodes();
    const label = data.label as string;
    const connectedHeaters = (data.connectedHeaters as string[]) || [];

    const connectedLabels = connectedHeaters.map(id => {
        const sourceNode = allNodes.find(n => n.id === id);
        return sourceNode?.data?.label || id;
    });

    return (
        <div className={`custom-node house-node ${selected ? 'selected' : ''}`}>
            <button
                className="delete-button"
                onClick={onDelete}
                title="Delete node"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>

            <Handle type="target" position={Position.Left} style={{ borderRadius: '2px' }} />

            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black uppercase rounded border border-blue-200 leading-none">
                        House
                    </span>
                </div>

                <div className="text-sm font-bold text-gray-800">
                    {label}
                </div>
            </div>

            {connectedHeaters.length > 0 && (
                // ВИДАЛИТИ ЦЕЙ РЯДОК З border-t
                <div className="pt-1 text-[10px] text-gray-500 italic leading-tight">
                    <span className="font-semibold not-italic">Sources:</span> {connectedLabels.join(', ')}
                </div>
            )}

            <div className="custom-tooltip">
                ID: {label} | {connectedHeaters.length} sources
            </div>
        </div>
    );
}

// Heat Node Component
export function HeatNode({ id, data, selected }: NodeProps): ReactElement {
    const { deleteElements } = useReactFlow();

    const onDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        deleteElements({ nodes: [{ id }] });
    };

    const { label } = data as unknown as NodeData;

    return (
        <div className={`custom-node heat-node ${selected ? 'selected' : ''}`}>
            <button
                className="delete-button"
                onClick={onDelete}
                title="Delete node"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>

            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-black uppercase rounded border border-orange-200 leading-none">
                        Heat Source
                    </span>
                </div>

                <div className="text-sm font-bold text-gray-800 tracking-tight">
                    {label}
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                style={{ borderRadius: '2px', background: '#f97316' }}
            />

            <div className="custom-tooltip">
                Click and drag to connect
            </div>
        </div>
    );
}

export const nodeTypes = {
    house: HouseNode,
    heat: HeatNode,
};

export function createNodeData(type: string, index: number): NodeData {
    switch (type) {
        case 'house':
            return {
                type: 'house',
                label: `House ${index}`,
                connectedHeaters: [],
            };
        case 'heat':
            return {
                type: 'heat',
                label: `Heat ${index}`,
            };
        default:
            return {
                type,
                label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${index}`,
            } as NodeData;
    }
}
