// SPDX-FileCopyrightText: 2022 Blocktech.dk
// SPDX-License-Identifier: MPL-2.0

import { Readable } from 'stream';
import { TextDecoder } from 'util';

/**
 * Function that reags an output of specified type from {@link Readable}.
 * 
 * @typeParam T - output type 
 */
export interface Deserial<T> {
    (source: Readable): T;
}

/**
 * Map of contract names to contract schemas.
 */
export type Module = Record<string, Contract>;

/**
 * Reads {@link Module} from the given {@link Readable}.
 * 
 * @param source input stream 
 * @returns module (contract map)
 */
export function deserialModule(source: Readable): Module {
    return deserialMapFn<string, Contract>(deserialString, deserialContract)(source);
}

/**
 * Contract schema.
 */
export type Contract = {
    /** Optional schema for the contract state. */
    state: Type | null;
    /** Optional schema for init function parameters. */
    init: Type | null;
    /** Map of receive function names to schemas for their respective parameters. */
    receive: Record<string, Type>;
}

/**
 * Reads {@link Contract} from the given {@link Readable}.
 * 
 * @param source input stream
 * @returns contract
 */
export function deserialContract(source: Readable): Contract {
    return {
        state: deserialOptionFn<Type>(deserialType)(source),
        init: deserialOptionFn<Type>(deserialType)(source),
        receive: deserialMapFn<string, Type>(deserialString, deserialType)(source)
    }
}

/**
 * Size length of a {@link Type}, represented as an unsigned integer.
 */
 export enum SizeLength {
    /** Takes 1 byte and represents a possible size range of 0..255. */
    U8 = 0,
    /** Takes 2 bytes and represents a possible size range of 0..65535. */
    U16,
    /** Takes 4 bytes and represents a possible size range of 0..4294967295. */
    U32,
    /** Takes 8 bytes and represents a possible size range of 0..2^64-1. */
    U64
}

/**
 * {@link Type} tag.
 */
export enum TypeTag {
    /** Nothing. */
    Unit = 0,
    /** Boolean (`true` or `false`). */
    Bool,
    /** Unsigned 8-bit integer. */
    U8,
    /** Unsigned 16-bit integer. */
    U16,
    /** Unsigned 32-bit integer. */
    U32,
    /** Unsigned 64-bit integer. */
    U64,
    /** Signed 8-bit integer. */
    I8,
    /** Signed 16-bit integer. */
    I16,
    /** Signed 32-bit integer. */
    I32,
    /** Signed 64-bit integer. */
    I64,
    /** Token amount in microGTU (10^-6 GTU). */
    Amount,
    /** Sender account address. */
    AccountAddress,
    /** Address of the contract instance consisting of an index and a subindex. */
    ContractAddress,
    /** Unsigned 64-bit integer storing milliseconds since UNIX epoch and representing a timestamp. */
    Timestamp,
    /** Unsigned 64-bit integer storing milliseconds and representing a duration. */
    Duration,
    /** Tuple. */
    Pair,
    /** Variable size list. */
    List,
    /** Unordered collection of unique elements. */
    Set,
    /** Unordered map from keys to values.  */
    Map,
    /** Fixed size array. */
    Array,
    /** Struct. */
    Struct,
    /** Enum. */
    Enum,
    /** List of bytes representing a string. */
    String,
    /** Unsigned 128-bit integer. */
    U128,
    /** Signed 128-bit integer. */
    I128,
    /** Name of the contract. */
    ContractName,
    /** Receive function name. */
    ReceiveName
}

/**
 * Contract schema type.
 */
export type Type = {
    typeTag: TypeTag.Unit | TypeTag.Bool | TypeTag.U8 | TypeTag.U16
           | TypeTag.U32 | TypeTag.U64 | TypeTag.U128 | TypeTag.I8
           | TypeTag.I16 | TypeTag.I32 | TypeTag.I64 | TypeTag.I128
           | TypeTag.Amount | TypeTag.AccountAddress
           | TypeTag.ContractAddress | TypeTag.Timestamp
           | TypeTag.Duration;
} | {
    typeTag: TypeTag.Pair;
    ofLeft: Type;
    ofRight: Type;
} | {
    typeTag: TypeTag.List | TypeTag.Set;
    sizeLength: SizeLength;
    of: Type;
} | {
    typeTag: TypeTag.Map;
    sizeLength: SizeLength;
    ofKeys: Type;
    ofValues: Type;
} | {
    typeTag: TypeTag.Array;
    size: number;
    of: Type;
} | {
    typeTag: TypeTag.Struct;
    fields: Fields;
} | {
    typeTag: TypeTag.Enum;
    variants: [string, Fields][];
} | {
    typeTag: TypeTag.String | TypeTag.ContractName | TypeTag.ReceiveName;
    sizeLength: SizeLength.U32;
}

/**
 * Reads {@link Type} from the given {@link Readable}.
 * 
 * @param source input stream 
 * @returns contract schema type
 */
export function deserialType(source: Readable): Type {
    const tag = deserialUint8(source);
    switch(tag) {
        case TypeTag.Unit:
        case TypeTag.Bool:
        case TypeTag.U8:
        case TypeTag.U16:
        case TypeTag.U32:
        case TypeTag.U64:
        case TypeTag.U128:
        case TypeTag.I8:
        case TypeTag.I16:
        case TypeTag.I32:
        case TypeTag.I64:
        case TypeTag.I128:
        case TypeTag.Amount:
        case TypeTag.AccountAddress:
        case TypeTag.ContractAddress:
        case TypeTag.Timestamp:
        case TypeTag.Duration:
            return { typeTag: tag };
        case TypeTag.Pair:
            return {
                typeTag: tag,
                ofLeft: deserialType(source),
                ofRight: deserialType(source)
            };
        case TypeTag.List:
        case TypeTag.Set:
            return {
                typeTag: tag,
                sizeLength: deserialUint8(source),
                of: deserialType(source)
            };
        case TypeTag.Map:
            return {
                typeTag: tag,
                sizeLength: deserialUint8(source),
                ofKeys: deserialType(source),
                ofValues: deserialType(source)
            };
        case TypeTag.Array:
            return {
                typeTag: tag,
                size: deserialUint32(source),
                of: deserialType(source)
            };
        case TypeTag.Struct:
            return {
                typeTag: tag,
                fields: deserialFields(source)
            }
        case TypeTag.Enum:
            return {
                typeTag: tag,
                variants: deserialArrayFn<[string, Fields]>(deserialTupleFn<string, Fields>(deserialString, deserialFields))(source)
            }
        case TypeTag.String:
        case TypeTag.ContractName:
        case TypeTag.ReceiveName:
            return {
                typeTag: tag,
                sizeLength: deserialUint8(source)
            };
        default:
            throw new Error(`unsupported type tag: ${tag}`);
    }
}

/**
 * {@link Fields} tag.
 */
export enum FieldsTag {
    /**
     * Represents named fields such as in
     * `struct RGB { r: u8, g: u8, b: u8 }`.
     */
    Named = 0,
    /**
     * Represents unnamed (anonymous) struct fields such as in
     * `struct Point { u32, u32 }`.
     */
    Unnamed,
    /**
     * Represents lack of fields in a struct or an enum, as is the case
     * with `Cat` in `enum Animal { Cat, Dog, Human }`.
     */
    None
}

/**
 * Rust flavored struct/enum fields.
 */
export type Fields = {
    fieldsTag: FieldsTag.Named;
    contents: [string, Type][];
} | {
    fieldsTag: FieldsTag.Unnamed;
    contents: Type[];
} | {
    fieldsTag: FieldsTag.None;
}

/**
 * Reads {@link Fields} from the given {@link Readable}.
 * 
 * @param source input stream 
 * @returns struct or enum variant fields
 */
export function deserialFields(source: Readable): Fields {
    const tag = deserialUint8(source);
    switch(tag) {
        case FieldsTag.Named:
            return {
                fieldsTag: tag,
                contents: deserialArrayFn<[string, Type]>(deserialTupleFn<string, Type>(deserialString, deserialType))(source)
            }
        case FieldsTag.Unnamed:
            return {
                fieldsTag: tag,
                contents: deserialArrayFn<Type>(deserialType)(source)
            };
        case FieldsTag.None:
            return { fieldsTag: tag };
        default:
            throw new Error(`unsupported fields tag: ${tag}`)
    }
}

/**
 * Reads a string from the given {@link Readable}.
 * 
 * @param source input stream 
 * @returns string
 */
export function deserialString(source: Readable): string {
    const bytes = deserialArrayFn<number>(deserialUint8)(source);
    const uint8Array = Uint8Array.from(bytes);

    return new TextDecoder().decode(uint8Array);
}

/**
 * Takes a {@link Deserial} function of the given type and returns another
 * {@link Deserial} function that can read an array of the same type.
 * 
 * @typeParam T - {@link Deserial} output type
 * @param deserial function that takes {@link Readable} and returns `T`
 * @returns function that takes {@link Readable} and returns an array of `T`
 */
export function deserialArrayFn<T>(deserial: Deserial<T>): Deserial<T[]> {
    return function(source: Readable): T[] {
        const len = deserialUint32(source);
        const arr: T[] = [];

        for (let i = 0; i < len; i++) {
            arr.push(deserial(source));
        }

        return arr;
    }
}

/**
 * Takes two {@link Deserial} functions of two given types: one for keys
 * and the other one for values. Returns another {@link Deserial} function
 * that can read a map with keys and values of corresponding types.
 * 
 * @typeParam K - {@link Deserial} output type for keys
 * @typeParam V - {@link Deserial} output type for values
 * @param deserialKey function that takes {@link Readable} and returns `K`
 * @param deserialValue function that takes {@link Readable} and returns `V`
 * @returns function that takes {@link Readable} and returns a map from `K` to `V`
 */
export function deserialMapFn<K extends string, V>(deserialKey: Deserial<K>, deserialValue: Deserial<V>): Deserial<Record<K, V>> {
    return function(source: Readable): Record<K, V> {
        const len = deserialUint32(source);
        const obj: Record<string, V> = {};

        for (let i = 0; i < len; i++) {
            const k = deserialKey(source);
            const v = deserialValue(source);

            obj[k] = v;
        }

        return obj
    }
}

/**
 * Option tag.
 * 
 * Options are equivalent to nullable types. They can be either
 * {@link OptionTag.None}, which means that the value is `null`, or
 * {@link OptionTag.Some}, which means that a non-`null` value is present.
 */
export enum OptionTag {
    /** Means that there's no value. */
    None = 0,
    /** Means that there's a value. */
    Some
}

/**
 * Takes a {@link Deserial} function of the given type and returns another
 * {@link Deserial} function that can read an option wrapped (nullable)
 * version of the same type.
 * 
 * @typeParam T - {@link Deserial} output type
 * @param deserial function that takes {@link Readable} and returns `T`
 * @returns function that takes {@link Readable} and returns `T` or `null`
 */
export function deserialOptionFn<T>(deserial: Deserial<T>): Deserial<T | null> {
    return function(source: Readable): T | null {
        const tag = deserialUint8(source);
        switch(tag) {
            case OptionTag.None:
                return null;
            case OptionTag.Some:
                return deserial(source);
            default:
                throw new Error(`unsupported option tag: ${tag}`)
        }
    }
}

/**
 * Takes two {@link Deserial} functions of two given types: one for left
 * values and the other one for right values. Returns another {@link Deserial}
 * function that can read a tuple with left and right values of corresponding
 * types.
 * 
 * @typeParam L - {@link Deserial} output type for left values
 * @typeParam R - {@link Deserial} output type for right values
 * @param deserialLeft function that takes {@link Readable} and returns `L`
 * @param deserialRight function that takes {@link Readable} and returns `R`
 * @returns function that takes {@link Readable} and returns a tuple of `L` and `R`
 */
export function deserialTupleFn<L, R>(deserialLeft: Deserial<L>, deserialRight: Deserial<R>): Deserial<[L, R]> {
    return function(source: Readable): [L, R] {
        const left = deserialLeft(source);
        const right = deserialRight(source);

        return [left, right];
    }
}

/**
 * Reads an unsigned 8-bit integer from the given {@link Readable}.
 * 
 * @param source input stream 
 * @returns number from 0 to 255
 */
export function deserialUint8(source: Readable): number {
    return source.read(1).readUInt8(0);
}

/**
 * Reads an unsigned 32-bit integer from the given {@link Readable}.
 * 
 * @param source input stream 
 * @returns number from 0 to 4294967295
 */
export function deserialUint32(source: Readable): number {
    return source.read(4).readUInt32LE(0);
}
