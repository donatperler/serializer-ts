/**
 * Created by perlerd on 2017-07-09.
 */

import {PropertyName} from "./interfaces";

export class ConfigurationError extends Error {}

export class RuntimeError extends Error {}

export class ValidationError extends Error {

    constructor(message: string, public readonly errors: Map<PropertyName, Error> = new Map<PropertyName, Error>()) {
        super(message);
    }
}
