/**
 * Created by perlerd on 2017-07-09.
 */

import {expect} from "chai";

import {ignore, name, type, validate, version} from "../../src/lib/decorators";
import {ConfigurationError} from "../../src/lib/errors";
import {PropertyName} from "../../src/lib/interfaces";
import {getVersionMetaData, InstanceMetaDataItem, StaticMetaDataItem} from "../../src/lib/meta-data";
import {instanceMetaDataSymbol, staticMetaDataSymbol} from "../../src/lib/symbols";
import {date, identity} from "../../src/lib/types";

class Foo {
    @name("static_value")
    private static staticValue = "Hello";

    @name("foo_bar")
    @type(date)
    private fooBar: number;

    @ignore("Nothing")
    private nothing: string;

    constructor(foo: string,
                @name("bar_foo") public readonly barFoo: string,
                test: number) {
    }
}

describe("Test module decorators", () => {
    const propertyName = "aName";

    describe("Test decorator version", () => {
        function migrator(o: object) {
            return undefined;
        }

        function ConstructorFn() {
            return undefined;
        }

        version(1, migrator)(ConstructorFn);
        expect(getVersionMetaData(Object.create(ConstructorFn.prototype))).to.be.eql({version: 1, migrator});
    });

    describe("Test decorator name", () => {
        const alternativeName = "a_name";
        it("should register an alternative name for a non-static property", () => {
            const target = {};
            name(alternativeName)(target, propertyName, undefined);
            expect(getInstanceMetaInfo(target, propertyName).name).to.be.equal(alternativeName);
            expect(getInstanceMetaInfo(target, propertyName).type).to.be.equal(identity);
            expect(getInstanceMetaInfo(target, propertyName).isIncluded).to.be.equal(true);
        });
        it("should register an alternative name for a static property", () => {
            function Test() {
                this.foo = 1;
            }

            Test[propertyName] = 2;
            name(alternativeName)(Test, propertyName, undefined);
            expect(getStaticMetaInfo(Test, propertyName).name).to.be.equal(alternativeName);
            expect(getStaticMetaInfo(Test, propertyName).type).to.be.equal(identity);
            expect(getStaticMetaInfo(Test, propertyName).getStaticValue()).to.be.equal(Test[propertyName]);
        });
    });
    describe("Test decorator type", () => {
        it("should register a type for a non-static property", () => {
            const target = {};
            type(date)(target, propertyName, undefined);
            expect(getInstanceMetaInfo(target, propertyName).name).to.be.equal(propertyName);
            expect(getInstanceMetaInfo(target, propertyName).type).to.be.equal(date);
            expect(getInstanceMetaInfo(target, propertyName).isIncluded).to.be.equal(true);
        });
        it("should register a type for a static property", () => {
            function Test() {
                this.foo = 1;
            }

            Test[propertyName] = 2;
            type(date)(Test, propertyName, undefined);
            expect(getStaticMetaInfo(Test, propertyName).name).to.be.equal(propertyName);
            expect(getStaticMetaInfo(Test, propertyName).type).to.be.equal(date);
            expect(getStaticMetaInfo(Test, propertyName).getStaticValue()).to.be.equal(Test[propertyName]);
        });
    });
    describe("Test decorator validate", () => {
        const validator = (a: any) => true;
        it("should register a validator for a non-static property", () => {
            const target = {};
            validate(validator)(target, propertyName, undefined);
            expect(getInstanceMetaInfo(target, propertyName).name).to.be.equal(propertyName);
            expect(getInstanceMetaInfo(target, propertyName).type).to.be.equal(identity);
            expect(getInstanceMetaInfo(target, propertyName).isIncluded).to.be.equal(true);
            expect(getInstanceMetaInfo(target, propertyName).validator).to.be.eql(validator);
        });
        it("should reject to decorate a static property", () => {
            function Test() {
                this.foo = 1;
            }

            Test[propertyName] = 2;
            expect(() => validate(validator)(Test, propertyName, undefined)).to.throw(ConfigurationError, /non-static/);
        });
    });
    describe("Test decorator ignore", () => {
        const aValue = "aValue";
        it("should register the ignore flag for a non-static property", () => {
            const target = {};
            ignore(aValue)(target, propertyName, undefined);
            expect(getInstanceMetaInfo(target, propertyName).name).to.be.equal(propertyName);
            expect(getInstanceMetaInfo(target, propertyName).type).to.be.equal(identity);
            expect(getInstanceMetaInfo(target, propertyName).isIncluded).to.be.equal(false);
            expect(getInstanceMetaInfo(target, propertyName).defaultValue).to.be.equal(aValue);
        });
        it("should reject to decorate a static property", () => {
            function Test() {
                this.foo = 1;
            }

            Test[propertyName] = 2;
            expect(() => ignore(aValue)(Test, propertyName, undefined)).to.throw(ConfigurationError, /non-static/);
        });
    });
});

function getInstanceMetaInfo<T, U>(target: object, propertyName: PropertyName): InstanceMetaDataItem<T, U> {
    return target[instanceMetaDataSymbol][propertyName];
}

function getStaticMetaInfo<T, U>(constructor: Function, // tslint:disable-line ban-types
                                 propertyName: PropertyName): StaticMetaDataItem<T, U> {
    return constructor.prototype[staticMetaDataSymbol][propertyName];
}
