/**
 * Created by perlerd on 2017-07-09.
 */

import {Type} from "./interfaces";
import {objectToSelf} from "./transforms";

export const identity: Type<any, any> = {
    instanceToObject: (v: any) => v,
    objectToInstance: (v: any) => v
};

export const date: Type<Date | null, number | null> = {
    instanceToObject: (dt: Date | null) => ((dt == null) ? null : dt.getTime()),
    objectToInstance: (value: number | null) => ((value == null) ? null : new Date(value))
};

export function array<T, U>(type: Type<T, U> = identity): Type<T[] | null, U[] | null> {
    return {
        instanceToObject: (arry: T[] | null) => handleNull(arry, (a) => a.map((v) => type.instanceToObject(v))),
        objectToInstance: (arry: U[] | null) => handleNull(arry, (a) => a.map((v) => type.objectToInstance(v)))
    };
}

export function map<VT, VU, KT, KU>(valueType: Type<VT, VU> = identity,
                                    keyType: Type<KT, KU> = identity): Type<Map<KT, VT>|null, Array<[KU, VU]> | null> {
    return {
        instanceToObject: (mp: Map<KT, VT> | null) => handleNull(mp,
            (m) => Array.from(m.entries()).map(
                ([key, value]): [KU, VU] => [keyType.instanceToObject(key), valueType.instanceToObject(value)]
            )),
        objectToInstance: (arry: Array<[KU, VU]> | null) => handleNull(arry, (a) => new Map<KT, VT>(a
            .map(([key, value]): [KT, VT] => [keyType.objectToInstance(key), valueType.objectToInstance(value)])
        ))
    };
}

export function serializable<T, U extends object>(constructor: Function): Type<T, U> { // tslint:disable-line ban-types
    return {
        instanceToObject: identity.instanceToObject,
        objectToInstance: (obj: U): T => {
            const prototype = constructor.prototype;
            const instance = Object.create(prototype);
            return Object.assign(instance, objectToSelf(prototype, constructor.name, obj));
        }
    };
}

export function set<T, U>(type: Type<T, U> = identity): Type<Set<T> | null, U[] | null> {
    return {
        instanceToObject: (st: Set<T> | null) => handleNull(st,
            (s) => Array.from(s).map((v) => type.instanceToObject(v))),
        objectToInstance: (arry: U[] | null) => handleNull(arry,
            (a) => new Set<T>(a.map((v) => type.objectToInstance(v))))
    };
}

export function toString<T extends ({ toString: () => string })>(
    constr: { new(s: string): T }
): Type<T | null, string | null> {
    return {
        instanceToObject: (obj: T) => handleNull(obj, (o) => o.toString()),
        objectToInstance: (str: string) => handleNull(str, (s) => new constr(s))
    };
}

export function toJSON<T extends ({ toJSON: () => string })>(
    constructor: ({ new (s: string): T })
): Type<T | null, string | null> {
    return {
        instanceToObject: (obj: T) => handleNull(obj, (o) => o.toJSON()),
        objectToInstance: (str: string | null) => handleNull(str, (s) => new constructor(s))
    };
}

function handleNull<T, U>(v: T | null, fn: (v: T) => U): U | null {
    return (v == null) ? null : fn(v);
}
