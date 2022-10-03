export interface MetadataStatus {
    message: string;
    messageType: MetadataStatus.MessageTypeEnum;
}
export namespace MetadataStatus {
    export type MessageTypeEnum = 'DEBUG' | 'ERROR' | 'WARNING' | 'INFO';
    export const MessageTypeEnum = {
        DEBUG: 'DEBUG' as MessageTypeEnum,
        ERROR: 'ERROR' as MessageTypeEnum,
        WARNING: 'WARNING' as MessageTypeEnum,
        INFO: 'INFO' as MessageTypeEnum
    };
}
