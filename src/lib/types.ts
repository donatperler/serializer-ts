/**
 * Created by perlerd on 2017-07-09.
 */

import {RuntimeError} from "./errors";
import {decoratedInstToObj, instToObj, objectToSelf} from "./transforms";

export interface Type<T, U> {
    instanceToObject: (v: T, cycle: Set<object>) => U;
    objectToInstance: (v: U) => T;
}

export const identity: Type<any, any> = {
    instanceToObject: (v: any, cycle: Set<object>) => instToObj(v, cycle),
    objectToInstance: (v: any) => v
};

export const date: Type<Date | null, number | null> = {
    instanceToObject: (dt: Date | null) => ((dt == null) ? null : dt.getTime()),
    objectToInstance: (value: number | null) => ((value == null) ? null : new Date(value))
};

export function array<T, U>(type: Type<T, U> = identity): Type<T[] | null, U[] | null> {
    return {
        instanceToObject: (arry: T[] | null, cycle: Set<object>) => {
            if (arry == null) {
                return arry;
            } else {
                if (cycle.has(arry)) {
                    throw new RuntimeError("Circular dependency detected");
                }
                cycle.add(arry);
                const tmp = arry.map((value) => type.instanceToObject(value, cycle));
                cycle.delete(arry);
                return tmp;
            }
        },
        objectToInstance: (arry: U[] | null) => handleNull(arry, (a) => a.map((v) => type.objectToInstance(v)))
    };
}

export function map<VT, VU, KT, KU>(valueType: Type<VT, VU> = identity,
                                    keyType: Type<KT, KU> = identity): Type<Map<KT, VT>|null, Array<[KU, VU]> | null> {
    return {
        instanceToObject: (mp: Map<KT, VT> | null, cycle: Set<object>) => {
            if (mp == null) {
                return mp;
            } else {
                if (cycle.has(mp)) {
                    throw new RuntimeError("Circular dependency detected");
                }
                cycle.add(mp);
                const tmp = Array.from(mp.entries()).map(([key, value]): [KU, VU] =>
                    [keyType.instanceToObject(key, cycle), valueType.instanceToObject(value, cycle)]
                );
                cycle.delete(mp);
                return tmp;
            }
        },
        objectToInstance: (arry: Array<[KU, VU]> | null) => handleNull(arry, (a) => new Map<KT, VT>(a
            .map(([key, value]): [KT, VT] => [keyType.objectToInstance(key), valueType.objectToInstance(value)])
        ))
    };
}

export function serializable<T extends object>(constructor: new(...args: any[]) => T): Type<T, object | undefined> {
    return {
        instanceToObject: (instance: T, cycle: Set<object>): object | undefined => instToObj(instance, cycle),
        objectToInstance: (obj: object): T => {
            const prototype = constructor.prototype;
            const instance = Object.create(prototype);
            return Object.assign(instance, objectToSelf(prototype, constructor.name, obj));
        }
    };
}

export function set<T, U>(type: Type<T, U> = identity): Type<Set<T> | null, U[] | null> {
    return {
        instanceToObject: (st: Set<T> | null, cycle: Set<object>) => {
            if (st == null) {
                return st;
            } else {
                if (cycle.has(st)) {
                    throw new RuntimeError("Circular dependency detected");
                }
                cycle.add(st);
                const tmp = Array.from(st).map((value) => type.instanceToObject(value, cycle));
                cycle.delete(st);
                return tmp;
            }
        },
        objectToInstance: (arry: U[] | null) => handleNull(arry,
            (a) => new Set<T>(a.map((v) => type.objectToInstance(v))))
    };
}

export function toString<T extends ({ toString: () => string })>(
    constr: new(s: string) => T
): Type<T | null, string | null> {
    return {
        instanceToObject: (obj: T) => handleNull(obj, (o) => o.toString()),
        objectToInstance: (str: string) => handleNull(str, (s) => new constr(s))
    };
}

export function toJSON<T extends ({ toJSON: () => string })>(
    constructor: new (s: string) => T
): Type<T | null, string | null> {
    return {
        instanceToObject: (obj: T) => handleNull(obj, (o) => o.toJSON()),
        objectToInstance: (str: string | null) => handleNull(str, (s) => new constructor(s))
    };
}

function handleNull<T, U>(v: T | null, fn: (v: T) => U): U | null {
    return (v == null) ? null : fn(v);
}
