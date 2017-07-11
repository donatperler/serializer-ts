/**
 * Created by perlerd on 2017-07-09.
 */

export type Validator<T> = (v: T) => boolean;
export type Converter<U> = (o: object) => U;
export type PropertyName = string;
export type Version = number;

export interface Type<T, U> {
    instanceToObject: (v: T) => U;
    objectToInstance: (v: U) => T;
}

export interface InstanceMetaDataItem<T, U> {
    name: string;
    isIncluded: boolean;
    type: Type<T, U>;
    defaultValue?: T;
    validator?: Validator<T>;
}

export interface StaticMetaDataItem<T, U> {
    name: string;
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
