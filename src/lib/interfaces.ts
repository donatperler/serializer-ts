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
