export interface GermplasmStorageTypes {
    code?: GermplasmStorageTypes.CodeEnum;
    description?: string;
}
export namespace GermplasmStorageTypes {
    export type CodeEnum = '10' | '11' | '12' | '13' | '20' | '30' | '40' | '50' | '99';
    export const CodeEnum = {
        _10: '10' as CodeEnum,
        _11: '11' as CodeEnum,
        _12: '12' as CodeEnum,
        _13: '13' as CodeEnum,
        _20: '20' as CodeEnum,
        _30: '30' as CodeEnum,
        _40: '40' as CodeEnum,
        _50: '50' as CodeEnum,
        _99: '99' as CodeEnum
    };
}
