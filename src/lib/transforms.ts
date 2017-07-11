/**
 * Created by perlerd on 2017-07-09.
 */

import {ConfigurationError, RuntimeError, ValidationError} from "./errors";
import {InstanceMetaData, InstanceMetaDataItem, PropertyName, StaticMetaData, StaticMetaDataItem} from "./interfaces";
import {instanceMetaDataSymbol, staticMetaDataSymbol, versionMetaDataSymbol} from "./symbols";

export function instanceToObject(value: any): any {
    return instToObj(value, new Set<object>());
}

function instToObj(instance: any, set: Set<object>): object | undefined {
    let result: object | undefined;
    switch (typeof instance) {
        case "object":
            if (set.has(instance)) {
                throw new RuntimeError("Circular dependency detected");
            }
            set.add(instance);
            if (isSerializable(instance)) {
                result = decoratedInstToObj(instance, set);
            } else if (isIterable(instance)) {
                result = iterableToObj(instance, set);
            } else {
                result = ordinaryInstToObj(instance, set);
            }
            set.delete(instance);
            break;
        case "boolean":
        case "number":
        case "string":
            result = instance;
            break;
        default:
            result = undefined;
    }
    return result;
}

function decoratedInstToObj(instance: object, set: Set<object>): object {
    const metaData: InstanceMetaData = getMetaData(instance);
    const object = Array
        .from(metaData.entries())
        .filter(([key, info]) => (info.isStatic && (info.getStaticValue != null)))
        .reduce((obj, [key, info]) => {
            const tmp = (info as any).getStaticValue();
            if (tmp !== undefined) {
                obj[key] = tmp;
            }
            return tmp;
        });
    return Object.keys(instance).reduce((obj, key) => {
        if (metaData.has(key)) {
            const metaDef = metaData.get(key) as InstanceMetaDataItem<any, any>;
            if ((metaDef.isIncluded) && (metaDef.type)) {
                const tmp = metaDef.type.instanceToObject(instance[key]);
                if (tmp !== undefined) {
                    obj[metaDef.name] = tmp;
                }
            }
        } else {
            const tmp = instToObj(instance[key], set);
            if (tmp !== undefined) {
                obj[key] = tmp;
            }
        }
        return obj;
    }, object);
}

function iterableToObj(iterable: Iterable<any>, set: Set<object>): any[] {
    const array = (iterable instanceof Array) ? iterable : Array.from(iterable);
    return array.map((item) => {
        const tmp = instToObj(item, set);
        return (tmp === undefined) ? tmp : null;
    });
}

function ordinaryInstToObj(instance: object, set: Set<object>): object {
    return Object.keys(instance).reduce((obj, key): object => {
        const tmp = instToObj(instance[key], set);
        if (tmp !== undefined) {
            obj[key] = tmp;
        }
        return obj;
    }, {});
}


export function objectToInstance<T>(constructor: { new(...args: any[]): T }, obj: object): T {
    const metaData = invertMetaData(getMetaData(constructor));
    const undhandledKeys = new Set(metaData.keys());
    const errors = new Map<PropertyName, Error>();
    const instance = Object.keys(obj).reduce((instnc, key) => {
        if (metaData.has(key)) {
            const metaDef = metaData.get(key) as InstanceMetaDataItem<any, any>;
            undhandledKeys.delete(key);
            if ((metaDef.isIncluded) && (metaDef.type != null)) {
                instnc[metaDef.name] = metaDef.type.objectToInstance(obj[key]);
                try {
                    if (metaDef.validator != null) {
                        metaDef.validator(instnc[metaDef.name]);
                    }
                } catch (error) {
                    errors.set(metaDef.name, error);
                }
            }
        } else {
            instnc[key] = obj[key];
        }
        return instnc;
    }, {});
    if (errors.size) {
        throw new ValidationError(`Failed validating fields ${Array.from(errors.keys()).join(", ")}`, errors);
    }
    undhandledKeys.forEach((key) => {
        const metaDef = metaData.get(key) as InstanceMetaDataItem<any, any>;
        instance[metaDef.name] = metaDef.defaultValue;
    });
    return Object.assign(Object.create(constructor.prototype), instance);
}

export function serialize<T>(instance: T): string {
    return JSON.stringify(instanceToObject(instance));
}

export function deserialize<T>(cls: { new(...args: any[]): T }, jsonString: string): T {
    return objectToInstance(cls, JSON.parse(jsonString));
}

function getInstanceMetaData(myPrototype: any): InstanceMetaData {
    const parentsMetaData = Object.getPrototypeOf(myPrototype)
        ? getInstanceMetaData(myPrototype.prototype)
        : {};
    const myMetaData = (myPrototype.hasOwnProperty(instanceMetaDataSymbol))
        ? myPrototype[instanceMetaDataSymbol]
        : {};
    return Object.assign({}, parentsMetaData, myMetaData);
}

function getStaticMetaData(myPrototype: any):

function invertMetaData<M extends InstanceMetaData | StaticMetaData>(metaData: M): M {
    return Object.keys(metaData).reduce((inverted, key) => {
        const copy = Object.create(metaData[key]);
        inverted[copy.name] = copy;
        copy.name = key;
        return inverted;
    }, {} as M);
}

function toObject(target: object): object {
    const metaData: InstanceMetaData = getMetaData(target);
    return Object.keys(target).reduce((obj, key) => {
        if (metaData.has(key)) {
            const metaDef = metaData.get(key) as InstanceMetaDataItem<any, any>;
            if ((metaDef.isIncluded) && (metaDef.type)) {
                obj[metaDef.name] = metaDef.type.instanceToObject(target[key]);
            }
        } else {
            obj[key] = target[key];
        }
        return obj;
    }, {});
}

function isSerializable(obj: object): boolean {
    return (instanceMetaDataSymbol in obj) ||
        (staticMetaDataSymbol in obj) ||
        (versionMetaDataSymbol in obj);
}

function isIterable(obj: object): boolean {
    return obj[Symbol.iterator] != null;
}
