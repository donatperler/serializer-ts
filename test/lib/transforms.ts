/**
 * Created by perlerd on 2017-07-16.
 */

import {expect} from "chai";

import {ignore, name, type, validate, version} from "../../src/lib/decorators";
import {RuntimeError} from "../../src/lib/errors";
import * as trans from "../../src/lib/transforms";
import {date} from "../../src/lib/types";

describe("Test module transforms", () => {
    describe("Test objectToSelf", () => {
        it("should rename a property", () => {
            class A {
                @name("q1")
                public p1 = 1;
            }
            expect(trans.objectToSelf(A.prototype, A.name, {q1: 1})).to.be.eql({p1: 1});
        });
        it("should ignore a property and set default value", () => {
            class A {
                @ignore(1)
                public p1: number;
            }
            expect(trans.objectToSelf(A.prototype, A.name, {})).to.be.eql({p1: 1});
        });
        it("should transform type", () => {
            class A {
                @type(date)
                public myDate: Date;
            }
            expect(trans.objectToSelf(A.prototype, A.name, {myDate: 0})).to.be.eql({myDate: new Date(0)});
        });
        it("should throw error if validation fails", () => {
            class A {
                @validate((v) => v !== 0)
                public p1: number;
            }
            expect(() => trans.objectToSelf(A.prototype, A.name, {p1: 0})).to.throw(RuntimeError, /validating/);
        });
        it("should ignore static property (using name decorator)", () => {
            class A {
                @name("p1")
                public static sp1 = 10;
            }
            expect(trans.objectToSelf(A.prototype, A.name, {p1: 10})).to.be.eql({});
        });
        it("should ignore static property (using type decorator)", () => {
            class A {
                @type(date)
                public static sp1 = new Date();
            }
            expect(trans.objectToSelf(A.prototype, A.name, {sp1: A.sp1.getTime()})).to.be.eql({});
        });
    });

    describe("Test isSerializable", () => {
        it("should recognise object as serializable", () => {
            expect(trans.isSerializable(new (version(1)(class {
            })))).to.be.true; // tslint:disable-line
        });
        it("should recoginse object as not serializable", () => {
            expect(trans.isSerializable({})).to.be.false; // tslint:disable-line
        });
    });

    describe("Test function isIterable", () => {
        it("should recognise array as iterable", () => {
            expect(trans.isIterable([])).to.be.true; // tslint:disable-line no-unused-expression
        });
    });
});
