import type { Node, Edge } from '@xyflow/react';

export interface BaseNodeData extends Record<string, unknown> {
    label: string;
    type: string;
}

export interface HouseNodeData extends BaseNodeData {
    type: 'house';
    connectedHeaters: AppNode[];
}
export interface HeatSourceNodeData extends BaseNodeData {
    type: 'heat';
    capacity?: number;
}

export type NodeData = HouseNodeData | HeatSourceNodeData;

export type AppNode = Node<NodeData>;

export type AppEdge = Edge;

export interface ConnectionStats {
    totalHouses: number;
    totalHeaters: number;
    connectedHouses: number;
    totalConnections: number;
}

export const isHouseNode = (node: AppNode): node is Node<HouseNodeData> => {
    return (
        node.type === 'house' ||
        'connectedHeaters' in node.data
    );
};

export const isHeatNode = (node: AppNode): node is Node<HeatSourceNodeData> => {
    return (
        node.type === 'heat' ||
        (!('connectedHeaters' in node.data) && node.type !== 'house')
    );
};
