/**
 * Created by perlerd on 2017-07-09.
 */

import {ConfigurationError} from "./errors";
import {
    Converter,
    InstanceMetaData, InstanceMetaDataItem, PropertyName, StaticMetaData, StaticMetaDataItem, Type,
    Validator, Version, VersionMetaData
} from "./interfaces";
import {instanceMetaDataSymbol, staticMetaDataSymbol, versionMetaDataSymbol} from "./symbols";
import {identity} from "./types";

export function version<U>(classVersion: Version, converter?: Converter<U>) {
    return (constructor: Function) => { // tslint:disable-line ban-types
        constructor.prototype.hasOwnProperty[versionMetaDataSymbol] = {
            version: classVersion,
            converter
        };
    };
}

export function name(objectKeyName: PropertyName) {
    return (...args: any[]) => {
        assureForPropertyAndConstructorDecorator(args);
        const propertyName: string = args[1] || extractParamterName(args[0].toString(), args[2]);
        if (isPropertyDecorator(args) && isStatic(args)) {
            setStaticMetaDataProperty(args[0], propertyName, "name", objectKeyName, () => args[0][propertyName]);
        } else {
            setInstanceMetaDataProperty(args[0], propertyName, "name", objectKeyName);
        }
    };
}

export function type<T, U>(typeMapper: Type<T, U>) {
    return (...args: any[]) => {
        assureForPropertyAndConstructorDecorator(args);
        const propertyName: string = args[1] || extractParamterName(args[0].toString(), args[2]);
        if (isPropertyDecorator(args) && isStatic(args)) {
            setStaticMetaDataProperty(args[0], propertyName, "type", typeMapper, () => args[0][propertyName]);
        } else {
            setInstanceMetaDataProperty(args[0], propertyName, "type", typeMapper);
        }
    };
}

export function validate(validator: Validator<any>) {
    return (...args: any[]) => {
        assureForNonStaticPropertyAndConstructorDecorator(args);
        const propertyName: string = args[1] || extractParamterName(args[0].toString(), args[2]);
        setInstanceMetaDataProperty(args[0], propertyName, "validator", validator);
    };
}

export function ignore(defaultValue?: any) {
    return (...args: any[]) => { // tslint:disable-line only-arrow-functions
        assureForNonStaticPropertyAndConstructorDecorator(args);
        let propertyName: string;
        if (isParameterDecorator(args)) {
            propertyName = extractParamterName(args[0].toString(), args[2]);
        } else {
            propertyName = args[1];
        }
        const metaData = getOrCreateInstanceMetaData(
            (typeof args[0] === "function")
                ? args[0].prototype
                : args[0]
        );
        if (metaData.hasOwnProperty(propertyName)) {
            throw new ConfigurationError(`Decorator ignore cannot be combined with any of the other decorators`);
        }
        metaData[propertyName] = {
            name: propertyName,
            isIncluded: false,
            type: identity,
            defaultValue
        };
    };
}

function isParameterDecorator(args: any[]): boolean {
    return typeof args[2] === "number";
}

function isPropertyDecorator(args: any[]): boolean {
    return args[2] == null;
}

function isStatic(args: any[]): boolean {
    return typeof args[0] === "function";
}

function assureForPropertyAndConstructorDecorator(args: any[]) {
    if (!((isParameterDecorator(args) && isStatic(args)) || isPropertyDecorator(args))) {
        throw new ConfigurationError(`Decorator can only be applied on properties`);
    }
}

function assureForNonStaticPropertyAndConstructorDecorator(args: any[]) {
    if (!((isParameterDecorator(args) && isStatic(args)) || (isPropertyDecorator(args) && !isStatic(args)))) {
        throw new ConfigurationError("Decorator can only be applied to non-static properties");
    }

}

function extractParamterName(functionStub: string, parameterIndex: number): string {
    for (const line of functionStub.split("\n")) {
        const match = line.match(/constructor\(([^\)]*)\)/);
        if (match) {
            const parmeterNames = match[1].split(",");
            if (parameterIndex < parmeterNames.length) {
                return parmeterNames[parameterIndex].trim();
            }
        }
    }
    throw new Error(`Failed to extract parameter name: No parameter names found in '${functionStub}'`);
}

function setInstanceMetaDataProperty<T>(target: any,
                                        propertyName: PropertyName,
                                        key: keyof InstanceMetaDataItem<T, any>,
                                        value: any) {
    const metaData = getOrCreateInstanceMetaData((typeof target === "function") ? target.prototype : target);
    const metaDataItem = getOrCreateInstanceMataDataItem<T>(metaData, propertyName);
    if (!metaDataItem.isIncluded) {
        throw new ConfigurationError(`Decorator type cannot be combined with any of the other decorators`);
    }
    metaDataItem[key] = value;
}

function setStaticMetaDataProperty<T>(target: any,
                                      propertyName: PropertyName,
                                      key: keyof StaticMetaDataItem<T, any>,
                                      value: any,
                                      getStaticValue: () => T) {
    const metaData = getOrCreateStaticMetaData(target.prototype);
    const metaDataItem = getOrCreateStaticMataDataItem<T>(metaData, propertyName, getStaticValue);
    metaDataItem[key] = value;
}

function getOrCreateInstanceMetaData(target: any): InstanceMetaData {
    if (target.hasOwnProperty(instanceMetaDataSymbol)) {
        return target[instanceMetaDataSymbol];
    }
    target[instanceMetaDataSymbol] = {};
    return target[instanceMetaDataSymbol];
}

function getOrCreateStaticMetaData(target: any): StaticMetaData {
    if (target.hasOwnProperty(staticMetaDataSymbol)) {
        return target[staticMetaDataSymbol];
    }
    target[instanceMetaDataSymbol] = {};
    return target[instanceMetaDataSymbol];
}

function getOrCreateVersionMetaData(target: any): VersionMetaData<any> {
    if (target.hasOwnProperty(versionMetaDataSymbol)) {
        return target[versionMetaDataSymbol];
    }
    target[versionMetaDataSymbol] = {};
    return target[versionMetaDataSymbol];
}

function getOrCreateInstanceMataDataItem<T>(metaData: InstanceMetaData,
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

function getOrCreateStaticMataDataItem<T>(metaData: StaticMetaData,
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
