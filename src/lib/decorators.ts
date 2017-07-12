/**
 * Created by perlerd on 2017-07-09.
 */

import {ConfigurationError} from "./errors";
import {Converter, PropertyName, Type, Validator, Version} from "./interfaces";
import * as metaData from "./meta-data";
import {identity, serializable} from "./types";

export function version<U>(classVersion: Version, converter?: Converter<U>) {
    return (constructor: Function) => { // tslint:disable-line ban-types
        metaData.setVersion(constructor, classVersion, converter);
    };
}

export function name(objectKeyName: PropertyName) {
    return (...args: any[]) => {
        assureForPropertyAndConstructorDecorator(args);
        const propertyName: string = args[1] || extractParamterName(args[0].toString(), args[2]);
        if (isPropertyDecorator(args) && isStatic(args)) {
            metaData.setStaticMetaDataProperty(
                args[0], propertyName, "name", objectKeyName, () => args[0][propertyName]
            );
        } else {
            metaData.setInstanceMetaDataProperty(args[0], propertyName, "name", objectKeyName);
        }
    };
}

export function type<T, U>(typeMapper: Type<T, U> | Function) { // tslint:disable-line ban-types
    return (...args: any[]) => {
        assureForPropertyAndConstructorDecorator(args);
        const propertyName: string = args[1] || extractParamterName(args[0].toString(), args[2]);
        if (typeof typeMapper === "function") {
            typeMapper = serializable(typeMapper);
        }
        if (isPropertyDecorator(args) && isStatic(args)) {
            metaData.setStaticMetaDataProperty(args[0], propertyName, "type", typeMapper, () => args[0][propertyName]);
        } else {
            metaData.setInstanceMetaDataProperty(args[0], propertyName, "type", typeMapper);
        }
    };
}

export function validate(validator: Validator<any>) {
    return (...args: any[]) => {
        assureForNonStaticPropertyAndConstructorDecorator(args);
        const propertyName: string = args[1] || extractParamterName(args[0].toString(), args[2]);
        metaData.setInstanceMetaDataProperty(args[0], propertyName, "validator", validator);
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
        const instanceMetaData = metaData.getOrCreateOwnInstanceMetaData(
            (typeof args[0] === "function")
                ? args[0].prototype
                : args[0]
        );
        if (instanceMetaData.hasOwnProperty(propertyName)) {
            throw new ConfigurationError(`Decorator ignore cannot be combined with any of the other decorators`);
        }
        instanceMetaData[propertyName] = {
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

