/**
 * Created by perlerd on 2017-07-09.
 */

import {RuntimeError} from "./errors";
import * as metaData from "./meta-data";
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
    const prototype = Object.getPrototypeOf(instance);
    const object: object = metaData
        .getStaticMetaData(prototype)
        .reverse()
        .reduce((obj, meta) => Object
            .keys(meta)
            .reduce((o, key) => {
                    const metaItem = meta[key];
                    if (obj.hasOwnProperty(metaItem.name)) {
                        throw new RuntimeError(
                            "Failed to transform instance into an object: There is already a property with name '" +
                            metaItem.name + "' from an ancestor class"
                        );
                    }
                    const tmp = metaItem.type.instanceToObject(metaItem.getStaticValue());
                    if (tmp !== undefined) {
                        o[metaItem.name] = tmp;
                    }
                    return o;
                },
                obj), {});
    const instanceMetaData = metaData.getInstanceMetaData(prototype);
    for (const key in instance) { // tslint:disable-line forin
        if (instanceMetaData.hasOwnProperty(key)) {
            const metaItem = instanceMetaData[key];
            if (object.hasOwnProperty(metaItem.name)) {
                throw new RuntimeError("Failed to transform instance into an object: There is already a property " +
                    "with name '" + metaItem.name + "' from a static property"
                );
            }
            const tmp = metaItem.type.instanceToObject(instToObj(instance[key], set));
            if (tmp !== undefined) {
                object[metaItem.name] = tmp;
            }
        } else {
            const tmp = instToObj(instance[key], set);
            if (tmp !== undefined) {
                object[key] = tmp;
            }
        }
    }
    const versionMetaData = metaData.getVersionMetaData(prototype);
    if (versionMetaData) {
        if (object.hasOwnProperty("version")) {
            throw new RuntimeError(
                "Failed to transform instance into an object: There is already a property with name 'version'"
            );
        }
        object["version"] = versionMetaData.version; // tslint:disable-line no-string-literal
    }
    return object;
}

function iterableToObj(iterable: Iterable<any>, set: Set<object>): any[] {
    const array = (iterable instanceof Array) ? iterable : Array.from(iterable);
    return array.map((item) => {
        const tmp = instToObj(item, set);
        return (tmp === undefined) ? null : tmp;
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

export function objectToInstance<T>(constructor: { new: (...args: any[]) => T, prototype: object, name: string },
                                    obj: object): T {
    const prototype = constructor.prototype;
    let self = {};
    if (isSerializable(obj)) {
        objectToSelf(prototype, constructor.name, obj);
    } else {
        self = obj;
    }
    const instance = Object.create(prototype);
    return Object.assign(instance, self);
}

export function objectToSelf(prototype: object,
                             constructorName: string,
                             obj: object): object {
    const self = {};
    const versionMetaData = metaData.getVersionMetaData(prototype);
    const staticMetaData = metaData.getStaticMetaData(prototype);
    const staticObjectProperties = metaData.getStaticObjectProperties(staticMetaData);
    const instanceMetaData = metaData.invert(metaData.getInstanceMetaData(prototype));
    if (versionMetaData) {
        staticObjectProperties.add("version");
        if (versionMetaData.migrator != null) {
            obj = versionMetaData.migrator(obj);
        }
    }
    Object.keys(obj).forEach((key) => {
        if (!staticObjectProperties.has(key)) {
            if (instanceMetaData.hasOwnProperty(key)) {
                const meta = instanceMetaData[key];
                if (meta.isIncluded) {
                    self[meta.name] = meta.type.objectToInstance(obj[key]);
                    if ((meta.validator) && (!meta.validator(self[meta.name]))) {
                        throw new RuntimeError(`Failed validating ${constructorName}.${key}`);
                    }
                }
            } else {
                self[key] = obj[key];
            }
        }
    });
    Object.keys(instanceMetaData)
        .filter((key) => (!instanceMetaData[key].isIncluded))
        .forEach((key) => {
            const meta = instanceMetaData[key];
            self[meta.name] = meta.defaultValue;
        });
    return self;
}

export function serialize<T>(instance: T): string {
    return JSON.stringify(instanceToObject(instance));
}

export function deserialize<T>(cls: { new: (...args: any[]) => T, prototype: object, name: string },
                               jsonString: string): T {
    return objectToInstance(cls, JSON.parse(jsonString));
}

export function isSerializable(obj: object): boolean {
    return (instanceMetaDataSymbol in obj) ||
        (staticMetaDataSymbol in obj) ||
        (versionMetaDataSymbol in obj);
}

export function isIterable(obj: object): boolean {
    return obj[Symbol.iterator] != null;
}
