/**
 * Created by perlerd on 2017-07-09.
 */

export type DefaultValue = any;
export type Validator<T> = (v: T) => boolean;
export type PropertyName = string;

export interface Type<T, U> {
    instanceToObject: (v: T) => U;
    objectToInstance: (v: U) => T;
}

export interface MetaDataItem<T, U> {
    name: string;
    isIncluded: boolean;
    isStatic: boolean;
    type?: Type<T, U>;
    defaultValue?: T;
    getStaticValue?: () => T;
    validator?: Validator<T>;
}

export type MetaData = Map<PropertyName, MetaDataItem<any, any>>;
