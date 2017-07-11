/**
 * Created by perlerd on 2017-07-09.
 */

import {ConfigurationError} from "./errors";
import {MetaData, MetaDataItem, PropertyName, Type, Validator} from "./interfaces";
import {metaDataSymbol} from "./symbols";
import {identity} from "./types";

export function name(objectKeyName: PropertyName) {
    return (...args: any[]) => {
        assureForPropertyAndConstructorDecorator(args);
        const propertyName: string = args[1] || extractParamterName(args[0].toString(), args[2]);
        if (isPropertyDecorator(args) && isStatic(args)) {
            setMetaDataProperty(args[0], propertyName, "name", objectKeyName, () => args[0][propertyName]);
        } else {
            setMetaDataProperty(args[0], propertyName, "name", objectKeyName);
        }
    };
}

export function type<T, U>(typeMapper: Type<T, U>) {
    return (...args: any[]) => {
        assureForPropertyAndConstructorDecorator(args);
        const propertyName: string = args[1] || extractParamterName(args[0].toString(), args[2]);
        if (isPropertyDecorator(args) && isStatic(args)) {
            setMetaDataProperty(args[0], propertyName, "type", typeMapper, () => args[0][propertyName]);
        } else {
            setMetaDataProperty(args[0], propertyName, "type", typeMapper);
        }
    };
}

export function validate(validator: Validator<any>) {
    return (...args: any[]) => {
        assureForNonStaticPropertyAndConstructorDecorator(args);
        const propertyName: string = args[1] || extractParamterName(args[0].toString(), args[2]);
        setMetaDataProperty(args[0], propertyName, "validator", validator);
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
        const metaData = getOrCreateMetaData(
            (typeof args[0] === "function")
                ? args[0].prototype
                : args[0]
        );
        if (metaData.has(propertyName)) {
            throw new ConfigurationError(`Decorator ignore cannot be combined with any of the other decorators`);
        }
        metaData.set(propertyName, {
            name: propertyName,
            isIncluded: false,
            isStatic: false,
            defaultValue
        });
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

function setMetaDataProperty<T>(target: any,
                                propertyName: PropertyName,
                                key: keyof MetaDataItem<T, any>,
                                value: any,
                                getStaticValue?: () => T) {
    const metaData = getOrCreateMetaData((typeof target === "function") ? target.prototype : target);
    const metaDataItem = getOrCreateMataDataItem<T>(metaData, propertyName, getStaticValue);
    if (!metaDataItem.isIncluded) {
        throw new ConfigurationError(`Decorator type cannot be combined with any of the other decorators`);
    }
    metaDataItem[key] = value;
}

function getOrCreateMetaData(target: any): MetaData {
    if (target[metaDataSymbol]) {
        return target[metaDataSymbol];
    }
    target[metaDataSymbol] = new Map<PropertyName, MetaDataItem<any, any>>();
    return target[metaDataSymbol];
}

function getOrCreateMataDataItem<T>(metaData: MetaData,
                                    key: PropertyName,
                                    getStaticValue?: () => T): MetaDataItem<T, any> {
    if (metaData.has(key)) {
        return metaData.get(key) as MetaDataItem<any, any>;
    }
    const metaDataItem: MetaDataItem<T, any> = {
        name: key,
        isIncluded: true,
        isStatic: getStaticValue != null,
        type: identity,
        getStaticValue
    };
    metaData.set(key, metaDataItem);
    return metaDataItem;
}
