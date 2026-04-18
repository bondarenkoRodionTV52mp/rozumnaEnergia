import { type ReactElement } from 'react';
import { Handle, Position, useNodes, useReactFlow, type NodeProps } from '@xyflow/react';

import type { NodeData } from './types';
import '../css/nodes.css';

// House Node Component
export function HouseNode({ id, data }: NodeProps): ReactElement {
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
        <div className="custom-node house-node relative group">
            <button
                className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center border-2 border-white opacity-0 invisible group-hover:opacity-100 group-hover:visible hover:bg-red-600 hover:scale-110 transition-all duration-200 z-10"
                onClick={onDelete}
                title="Delete node"
                style={{
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>

            <Handle type="target" position={Position.Left} style={{ borderRadius: '2px' }} />

            <div style={{ fontWeight: 'bold', color: '#007acc' }}>
                HOUSE: {label}
            </div>

            {connectedHeaters.length > 0 && (
                <div style={{ fontSize: '11px', color: '#444' }}>
                    Sources: {connectedLabels.join(', ')}
                </div>
            )}

            <div className="custom-tooltip">
                ID: {label} • {connectedHeaters.length} sources
            </div>
        </div>
    );
}

// Heat Node Component
export function HeatNode({ id, data }: NodeProps): ReactElement {
    const { deleteElements } = useReactFlow();

    const onDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        deleteElements({ nodes: [{ id }] });
    };

    const { label } = data as unknown as NodeData;

    return (
        <div className="custom-node heat-node relative group">
            <button
                className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center border-2 border-white opacity-0 invisible group-hover:opacity-100 group-hover:visible hover:bg-red-600 hover:scale-110 transition-all duration-200 z-10"
                onClick={onDelete}
                title="Delete node"
                style={{
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>

            <div style={{ fontWeight: 'bold', color: '#e34c26' }}>
                HEAT SRC: {label}
            </div>

            <Handle type="source" position={Position.Right} style={{ borderRadius: '2px', background: '#e34c26' }} />

            <div className="custom-tooltip">
                Click and drag to connect
            </div>
        </div>
    );
}

// Node types export
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
