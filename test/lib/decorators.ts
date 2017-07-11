/**
 * Created by perlerd on 2017-07-09.
 */

import {expect} from "chai";

import {ignore, name, type, validate} from "../../src/lib/decorators";
import {metaDataSymbol} from "../../src/lib/symbols";
import {date, identity} from "../../src/lib/types";
import {MetaDataItem, PropertyName} from "../../src/lib/interfaces";

class Foo {
    @name("foo_bar")
    @type(date)
    private fooBar: number;

    @ignore("Nothing")
    private nothing: string;

    @name("static_value")
    private static staticValue = "Hello";

    constructor(foo: string,
                @name("bar_foo") public readonly barFoo: string,
                test: number) {
    }
}

//console.log(`Meta: ${Array.from(Foo.prototype[metaDataSymbol].entries()).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ")}`);

describe("Test module decorators", () => {
    const propertyName = "aName";
    describe("Test decorator name", () => {
        const alternativeName = "a_name";
        it("should register an alternative name for a non-static property", () => {
            const target = {};
            name(alternativeName)(target, propertyName, undefined);
            expect(getMetaInfo(target, propertyName).name).to.be.equal(alternativeName);
            expect(getMetaInfo(target, propertyName).type).to.be.equal(identity);
            expect(getMetaInfo(target, propertyName).isIncluded).to.be.equal(true);
            expect(getMetaInfo(target, propertyName).isStatic).to.be.equal(false);
        });
        it("should register an alternative name for a static property", () => {
            function Test() {
                this.foo = 1;
            }
            Test[propertyName] = 2;
            name(alternativeName)(Test, propertyName, undefined);
            expect(getMetaInfo(Test.prototype, propertyName).name).to.be.equal(alternativeName);
            expect(getMetaInfo(Test.prototype, propertyName).type).to.be.equal(identity);
            expect(getMetaInfo(Test.prototype, propertyName).isIncluded).to.be.equal(true);
            expect(getMetaInfo(Test.prototype, propertyName).isStatic).to.be.equal(true);
            expect((getMetaInfo(Test.prototype, propertyName) as any).getStaticValue()).to.be.equal(Test[propertyName]);
        });
    });
    describe("Test decorator type", () => {
        it("should register a type for a non-static property", () => {
            const target = {};
            type(date)(target, propertyName, undefined);
            expect(getMetaInfo(target, propertyName).name).to.be.equal(propertyName);
            expect(getMetaInfo(target, propertyName).type).to.be.equal(date);
            expect(getMetaInfo(target, propertyName).isIncluded).to.be.equal(true);
            expect(getMetaInfo(target, propertyName).isStatic).to.be.equal(false);
        });
        it("should register a type for a static property", () => {
            function Test() {
                this.foo = 1;
            }
            Test[propertyName] = 2;
            type(date)(Test, propertyName, undefined);
            expect(getMetaInfo(Test.prototype, propertyName).name).to.be.equal(propertyName);
            expect(getMetaInfo(Test.prototype, propertyName).type).to.be.equal(date);
            expect(getMetaInfo(Test.prototype, propertyName).isIncluded).to.be.equal(true);
            expect(getMetaInfo(Test.prototype, propertyName).isStatic).to.be.equal(true);
            expect((getMetaInfo(Test.prototype, propertyName) as any).getStaticValue()).to.be.equal(Test[propertyName]);
        });
    });
    describe("Test decorator validate", () => {
        const validator = (a: any) => true;
        it("should register a validator for a non-static property", () => {
            const target = {};
            validate(validator)(target, propertyName, undefined);
            expect(getMetaInfo(target, propertyName).name).to.be.equal(propertyName);
            expect(getMetaInfo(target, propertyName).type).to.be.equal(identity);
            expect(getMetaInfo(target, propertyName).isIncluded).to.be.equal(true);
            expect(getMetaInfo(target, propertyName).isStatic).to.be.equal(false);
            expect(getMetaInfo(target, propertyName).validator).to.be.eql(validator);
        });
        it("should reject to decorate a static property", () => {
            function Test() {
                this.foo = 1;
            }
            Test[propertyName] = 2;
            expect(() => validate(validator)(Test, propertyName, undefined)).to.throw; // tslint:disable-line
        });
    });
    describe("Test decorator ingore", () => {
        const aValue = "aValue";
        it("should register the ignore flag for a non-static property", () => {
            const target = {};
            ignore(aValue)(target, propertyName, undefined);
            expect(getMetaInfo(target, propertyName).name).to.be.equal(propertyName);
            expect(getMetaInfo(target, propertyName).type).to.be.equal(undefined);
            expect(getMetaInfo(target, propertyName).isIncluded).to.be.equal(false);
            expect(getMetaInfo(target, propertyName).isStatic).to.be.equal(false);
            expect(getMetaInfo(target, propertyName).defaultValue).to.be.equal(aValue);
        });
        it("should reject to decorate a static property", () => {
            function Test() {
                this.foo = 1;
            }
            Test[propertyName] = 2;
            expect(() => ignore(aValue)(Test, propertyName, undefined)).to.throw; // tslint:disable-line
        });
    });
});

function getMetaInfo<T, U>(target: object, propertyName: PropertyName): MetaDataItem<T, U> {
    return target[metaDataSymbol].get(propertyName);
}
