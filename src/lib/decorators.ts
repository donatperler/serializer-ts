/**
 * Created by perlerd on 2017-07-09.
 */

import {ConfigurationError} from "./errors";
import * as metaData from "./meta-data";
import {identity, serializable, Type} from "./types";

export function version<U>(classVersion: metaData.Version, converter?: metaData.Migrator<U>) {
    return <C extends Function>(constructor: C): C => { // tslint:disable-line ban-types
        if (converter == null) {
            const parentsVersionMetaData = metaData.getVersionMetaData(constructor.prototype);
            if (parentsVersionMetaData && (parentsVersionMetaData.migrator != null)) {
                converter = parentsVersionMetaData.migrator as metaData.Migrator<U>;
            }
        }
        metaData.setVersion(constructor, classVersion, converter);
        return constructor;
    };
}

export function name(objectKeyName: metaData.PropertyName) {
    return (...args: any[]) => {
        assureForPropertyAndConstructorDecorator(args);
        const propertyName: string = args[1] || extractParamterName(args[0].toString(), args[2]);
        if (isPropertyDecorator(args) && isStatic(args)) {
            metaData.setStaticProperty(
                args[0], propertyName, "name", objectKeyName, () => args[0][propertyName]
            );
        } else {
            metaData.setInstanceProperty(args[0], propertyName, "name", objectKeyName);
        }
    };
}

export function type<T, U>(typeMapper: Type<T, U | object> | Function) { // tslint:disable-line ban-types
    return (...args: any[]) => {
        assureForPropertyAndConstructorDecorator(args);
        const propertyName: string = args[1] || extractParamterName(args[0].toString(), args[2]);
        if (typeof typeMapper === "function") {
            typeMapper = serializable(typeMapper);
        }
        if (isPropertyDecorator(args) && isStatic(args)) {
            metaData.setStaticProperty(args[0], propertyName, "type", typeMapper, () => args[0][propertyName]);
        } else {
            metaData.setInstanceProperty(args[0], propertyName, "type", typeMapper);
        }
    };
}

export function validate(validator: metaData.Validator<any>) {
    return (...args: any[]) => {
        assureForNonStaticPropertyAndConstructorDecorator(args);
        const propertyName: string = args[1] || extractParamterName(args[0].toString(), args[2]);
        metaData.setInstanceProperty(args[0], propertyName, "validator", validator);
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
        const match = line.match(/constructor\(([^)]*)\)/);
        if (match) {
            const parmeterNames = match[1].split(",");
            if (parameterIndex < parmeterNames.length) {
                return parmeterNames[parameterIndex].trim();
            }
        }
    }
    throw new Error(`Failed to extract parameter name: No parameter names found in '${functionStub}'`);
}
