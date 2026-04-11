import { RoomType } from './ProceduralDungeonGenerator';

export interface RoomConfig {
    type: RoomType;
    width: number;
    height: number;
    enemyCount: number;
}

export const RoomEvents = {
    ROOM_CLEARED:  'room-cleared',
    ROOM_CHANGED:  'room-changed',
    DOOR_UNLOCKED: 'door-unlocked',
} as const;
