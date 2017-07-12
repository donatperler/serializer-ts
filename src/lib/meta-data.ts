/**
 * Created by perlerd on 2017-07-12.
 */

import {ConfigurationError} from "./errors";
import {Converter, PropertyName, Type, Validator, Version} from "./interfaces";
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
    converter: Converter<U>;
}

export function getInstanceMetaData(prototype: object): InstanceMetaData {
    const parentsMetaData = Object.getPrototypeOf(prototype)
        ? getInstanceMetaData(prototype)
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

export function getStaticObjectProperties(prototype: object): Set<PropertyName> {
    return getStaticMetaData(prototype)
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

export function setInstanceMetaDataProperty<T>(target: any,
                                               propertyName: PropertyName,
                                               key: keyof InstanceMetaDataItem<T, any>,
                                               value: any) {
    const metaData = getOrCreateOwnInstanceMetaData((typeof target === "function") ? target.prototype : target);
    const metaDataItem = getOrCreateOwnInstanceMataDataItem<T>(metaData, propertyName);
    if (!metaDataItem.isIncluded) {
        throw new ConfigurationError(`Decorator type cannot be combined with any of the other decorators`);
    }
    metaDataItem[key] = value;
}

export function setStaticMetaDataProperty<T>(target: any,
                                             propertyName: PropertyName,
                                             key: keyof StaticMetaDataItem<T, any>,
                                             value: any,
                                             getStaticValue: () => T) {
    const metaData = getOrCreateOwnStaticMetaData(target.prototype);
    const metaDataItem = getOrCreateOwnStaticMataDataItem<T>(metaData, propertyName, getStaticValue);
    metaDataItem[key] = value;
}

export function setVersion<U>(constructor: Function, // tslint:disable-line: ban-types
                              version: Version,
                              converter?: Converter<U>) {
    if (constructor.prototype.hasOwnProperty(versionMetaDataSymbol)) {
        throw new ConfigurationError(`Failed setting version for class ${constructor.name}: Version already set`);
    }
    constructor.prototype[versionMetaDataSymbol] = {version, converter};

}

export function getOrCreateOwnInstanceMetaData(target: any): InstanceMetaData {
    if (target.hasOwnProperty(instanceMetaDataSymbol)) {
        return target[instanceMetaDataSymbol];
    }
    target[instanceMetaDataSymbol] = {};
    return target[instanceMetaDataSymbol];
}

export function getOrCreateOwnStaticMetaData(target: any): StaticMetaData {
    if (target.hasOwnProperty(staticMetaDataSymbol)) {
        return target[staticMetaDataSymbol];
    }
    target[instanceMetaDataSymbol] = {};
    return target[instanceMetaDataSymbol];
}

export function getOrCreateOwnInstanceMataDataItem<T>(metaData: InstanceMetaData,
                                                      key: PropertyName): InstanceMetaDataItem<T, any> {
    if (metaData.hasOwnProperty(key)) {
        return metaData[key] as InstanceMetaDataItem<any, any>;
    }
    const metaDataItem: InstanceMetaDataItem<T, any> = {
        name: key,
        isIncluded: true,
        type: identity
    };
    metaData[key] = metaDataItem;
    return metaDataItem;
}

export function getOrCreateOwnStaticMataDataItem<T>(metaData: StaticMetaData,
                                                    key: PropertyName,
                                                    getStaticValue: () => T): StaticMetaDataItem<T, any> {
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
