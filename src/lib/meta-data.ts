/**
 * Created by perlerd on 2017-07-12.
 */

import {ConfigurationError} from "./errors";
import {Migrator, PropertyName, Type, Validator, Version} from "./interfaces";
import {instanceMetaDataSymbol, staticMetaDataSymbol, versionMetaDataSymbol} from "./symbols";
import {identity} from "./types";

export interface InstanceMetaDataItem<T, U> {
    name: PropertyName;
    isIncluded: boolean;
    type: Type<T, U>;
    defaultValue?: T;
    validator?: Validator<T>;
}

export interface StaticMetaDataItem<T, U> {
    name: PropertyName;
    type: Type<T, U>;
    getStaticValue: () => T;
}

export interface InstanceMetaData {
    [key: string]: InstanceMetaDataItem<any, any>;
}

export interface StaticMetaData {
    [key: string]: StaticMetaDataItem<any, any>;
}

export interface VersionMetaData<U> {
    version: Version;
    migrator: Migrator<U>;
}

export function getInstanceMetaData(prototype: object): InstanceMetaData {
    const parentsPrototype = Object.getPrototypeOf(prototype);
    const parentsMetaData = parentsPrototype
        ? getInstanceMetaData(parentsPrototype)
        : {};
    const myMetaData = (prototype.hasOwnProperty(instanceMetaDataSymbol))
        ? prototype[instanceMetaDataSymbol]
        : {};
    return Object.assign({}, parentsMetaData, myMetaData);
}

export function getStaticMetaData(prototype: object): StaticMetaData[] {
    const myMetaData = (prototype.hasOwnProperty(staticMetaDataSymbol))
        ? [prototype[staticMetaDataSymbol]]
        : [];
    const parentPrototype = Object.getPrototypeOf(prototype);
    const parrentsMetaData = (parentPrototype)
        ? getStaticMetaData(parentPrototype)
        : [];
    return myMetaData.concat(parrentsMetaData);
}

export function getVersionMetaData<U>(prototype: object): VersionMetaData<U> {
    return prototype[versionMetaDataSymbol];
}

export function getStaticObjectProperties(metaData: StaticMetaData[]): Set<PropertyName> {
    return metaData
        .reduce((set, meta) => {
            Object.keys(meta).forEach((key) => set.add(meta[key].name));
            return set;
        }, new Set<PropertyName>());
}

export function invert<M extends InstanceMetaData | StaticMetaData>(metaData: M): M {
    return Object.keys(metaData).reduce((inverted, key) => {
        const copy = Object.assign({}, metaData[key]);
        if (inverted.hasOwnProperty(copy.name)) {
            throw new ConfigurationError(`Name '${copy.name}' is already used`);
        }
        inverted[copy.name] = copy;
        copy.name = key;
        return inverted;
    }, {} as M);
}

export function setInstanceProperty<T, U, K extends keyof InstanceMetaDataItem<T, U>>(
    target: object | Function,  // tslint:disable-line ban-types
    propertyName: PropertyName,
    key: K,
    value: InstanceMetaDataItem<T, U>[K]
) {
    const metaData = getOrCreateOwnInstanceMetaData((typeof target === "function") ? target.prototype : target);
    const metaDataItem = getOrCreateInstanceMataDataItem<T, U>(metaData, propertyName);
    if (!metaDataItem.isIncluded) {
        throw new ConfigurationError(`Decorator ignore cannot be combined with any of the other decorators`);
    }
    if (key === "isIncluded") {
        throw new ConfigurationError(`This method cannot be used to set property 'isIncluded'`);
    }
    metaDataItem[key] = value;
}

export function setStaticProperty<T, U, K extends keyof StaticMetaDataItem<T, U>>(
    constructor: Function,  // tslint:disable-line ban-types
    propertyName: PropertyName,
    key: K,
    value: StaticMetaDataItem<T, U>[K],
    getStaticValue: () => T
) {
    const metaData = getOrCreateOwnStaticMetaData(constructor.prototype);
    const metaDataItem = getOrCreateStaticMataDataItem<T, U>(metaData, propertyName, getStaticValue);
    metaDataItem[key] = value;
}

export function setVersion<U>(constructor: Function, // tslint:disable-line: ban-types
                              version: Version,
                              migrator?: Migrator<U>) {
    if (constructor.prototype.hasOwnProperty(versionMetaDataSymbol)) {
        throw new ConfigurationError(`Failed setting version for class ${constructor.name}: Version already set`);
    }
    constructor.prototype[versionMetaDataSymbol] = {version, migrator};

}

export function getOrCreateOwnInstanceMetaData(target: object): InstanceMetaData {
    if (target.hasOwnProperty(instanceMetaDataSymbol)) {
        return target[instanceMetaDataSymbol];
    }
    target[instanceMetaDataSymbol] = {};
    return target[instanceMetaDataSymbol];
}

export function getOrCreateOwnStaticMetaData(target: object): StaticMetaData {
    if (target.hasOwnProperty(staticMetaDataSymbol)) {
        return target[staticMetaDataSymbol];
    }
    target[staticMetaDataSymbol] = {};
    return target[staticMetaDataSymbol];
}

export function getOrCreateInstanceMataDataItem<T, U>(metaData: InstanceMetaData,
                                                      key: PropertyName): InstanceMetaDataItem<T, U> {
    if (metaData.hasOwnProperty(key)) {
        return metaData[key] as InstanceMetaDataItem<any, any>;
    }
    const metaDataItem: InstanceMetaDataItem<T, U> = {
        name: key,
        isIncluded: true,
        type: identity
    };
    metaData[key] = metaDataItem;
    return metaDataItem;
}

export function getOrCreateStaticMataDataItem<T, U>(metaData: StaticMetaData,
                                                    key: PropertyName,
                                                    getStaticValue: () => T): StaticMetaDataItem<T, U> {
    if (metaData.hasOwnProperty(key)) {
        return metaData[key] as StaticMetaDataItem<any, any>;
    }
    const metaDataItem: StaticMetaDataItem<T, any> = {
        name: key,
        type: identity,
        getStaticValue
    };
    metaData[key] = metaDataItem;
    return metaDataItem;
}
