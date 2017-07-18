/**
 * Created by perlerd on 2017-07-16.
 */

import {expect} from "chai";

import {ignore, name, type, validate, version} from "../../src/lib/decorators";
import {RuntimeError} from "../../src/lib/errors";
import * as trans from "../../src/lib/transforms";
import {date} from "../../src/lib/types";

describe("Test module transforms", () => {
    describe("Test objectToInstance", () => {
        it("should tranform an object to an instance (arbitrary class)", () => {
            class A {
                private p1: number;
                constructor(p1: number) {
                    this.p1 = p1;
                }
                public getP1(): number { return this.p1; }
            }
            const instance = trans.objectToInstance(A, {p1: 42});
            expect(instance.getP1()).to.be.equal(42);
        });
        it("should tranform an object to an instance (serializable class)", () => {
            class A {
                @type(date)
                private p1: Date;
                public getIsoDate(): string {return this.p1.toISOString(); }
            }
            const aDate = new Date();
            const instance = trans.objectToInstance(A, {p1: aDate.getTime()});
            expect(instance.getIsoDate()).to.be.equal(aDate.toISOString());
        });
    });

    describe("Test parse", () => {
        it("should parse a json string and return an instance", () => {
            class A {
                private p1: number;
                public getP1(): number { return this.p1; }
            }
            const instance = trans.parse(A, "{\"p1\": 42}");
            expect(instance.getP1()).to.be.equal(42);
        });
    });
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
        it("should migrate data from an older version", () => {
            @version(2, (o) => ({q1: o["p1"]}))  // tslint:disable-line no-string-literal
            class A {
                public q1: number;
            }
            expect(trans.objectToSelf(A.prototype, A.name, {version: 1, p1: 42})).to.be.eql({q1: 42});
        });
        it("should not migrate if data is from the current version", () => {
            @version(2, (o) => ({q1: o["p1"]}))  // tslint:disable-line no-string-literal
            class A {
                public q1: number;
            }
            expect(trans.objectToSelf(A.prototype, A.name, {version: 2, q1: 42})).to.be.eql({q1: 42});
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
