/**
 * Created by perlerd on 2017-07-16.
 */

import {expect} from "chai";

import {ignore, name, type, validate, version} from "../../src/lib/decorators";
import {RuntimeError} from "../../src/lib/errors";
import * as trans from "../../src/lib/transforms";
import {date} from "../../src/lib/types";

describe("Test module transforms", () => {
    describe("Test instanceToObject", () => {
        it("should transform a boolean", () => {
            expect(trans.instanceToObject(true)).to.be.equal(true);
        });
    });
    describe("Test serialize", () => {
        it("should serialize a boolean to JSON", () => {
            expect(trans.serialize(true)).to.be.eql("true");
        });
    });
    describe("Test parse", () => {
        class A {
            constructor(@name("q1") public readonly p1: number) {}
        }
        expect(trans.parse(A, "{\"q1\": 4}")).to.be.eql(new A(4));
    });
    describe("Test instToObj", () => {
        it("should transform a Boolean", () => {
            expect(trans.instToObj(Boolean(true), new Set())).to.be.eql(Boolean(true));
        });
        it("should transform a Date", () => {
            expect(trans.instToObj(new Date(0), new Set())).to.be.eql(new Date(0));
        });
        it("should transform an Error", () => {
            const err = Error("Err");
            expect(trans.instToObj(err, new Set())).to.be.eql(err);
        });
        it("should transform a Number", () => {
            expect(trans.instToObj(Number(4), new Set())).to.be.eql(Number(4));
        });
        it("should transform a String", () => {
            expect(trans.instToObj(String("Hello"), new Set())).to.be.eql(String("Hello"));
        });
        it("should transform a decorated instance", () => {
            class A {
                constructor(@name("q1") public readonly p1: number) {}
            }
            expect(trans.instToObj(new A(4), new Set())).to.be.eql({q1: 4});
        });
        it("should transform an array", () => {
            expect(trans.instToObj([1, 2], new Set())).to.be.eql([1, 2]);
        });
        it("should transform an ordinary object", () => {
            expect(trans.instToObj({p1: 2}, new Set())).to.be.eql({p1: 2});
        });
        it("should transform a boolean", () => {
            expect(trans.instToObj(true, new Set())).to.be.equal(true);
        });
        it("should transform a number", () => {
            expect(trans.instToObj(10, new Set())).to.be.equal(10);
        });
        it("should transform a string", () => {
            expect(trans.instToObj("hello", new Set())).to.be.equal("hello");
        });
    });

    describe("Test decoratedInstanceToObj", () => {
        it("should transform a renamed field", () => {
            class A {
                constructor(@name("q1") public readonly p1: number) {}
            }
            expect(trans.decoratedInstToObj(new A(4), new Set())).to.be.eql({q1: 4});
        });
        it("should transform a typed field", () => {
            class A {
                constructor(@type(date) public readonly p1: Date) {}
            }
            expect(trans.decoratedInstToObj(new A(new Date(0)), new Set())).to.be.eql({p1: 0});
        });
        it("should ignore field declared as ignore", () => {
            class A {
                constructor(@ignore() public readonly p1: number) {}
            }
            expect(trans.decoratedInstToObj(new A(3), new Set())).to.be.eql({});
        });
        it("should transform a renamed static field", () => {
            class A {
                @name("q1")
                public static sp1 = 1;
            }
            expect(trans.decoratedInstToObj(new A(), new Set())).to.be.eql({q1: 1});
        });
        it("should tranform a typed static field", () => {
            class A {
                @type(date)
                public static sp1 = new Date();
            }
            expect(trans.decoratedInstToObj(new A(), new Set())).to.be.eql({sp1: A.sp1.getTime()});
        });
        it("should add version for versioned classes", () => {
            @version(1)
            class A {}
            expect(trans.decoratedInstToObj(new A(), new Set())).to.be.eql({version: 1});
        });
        it("should throw when there is already equally named property from an ancestor", () => {
            class A {
                @name("sp1")
                public static sp1 = 1;
            }
            class B extends A {
                @name("sp1")
                public static sp1 = 2;
            }
            expect(() => trans.decoratedInstToObj(new B(), new Set())).to.throw(RuntimeError, /already a property/);
        });
        it("should throw when there is already equally named static property (non-decorated property)", () => {
            class A {
                @name("p1")
                public static sp1 = 2;
                constructor(public readonly p1: number) {}
            }
            expect(() => trans.decoratedInstToObj(new A(3), new Set())).to.throw(RuntimeError, /renamed/);
        });
        it("should throw when there is already equally named static property (decorated property)", () => {
            class A {
                @name("q1")
                public static sp1 = 2;
                constructor(@name("q1") public readonly p1: number) {}
            }
            expect(() => trans.decoratedInstToObj(new A(3), new Set())).to.throw(RuntimeError, /with name/);
        });
    });

    describe("Test iterableToObj", () => {
        it("should transform an ordianry iterable", () => {
            expect(trans.iterableToObj([new Date(1), () => 2, 1], new Set())).to.be.eql([new Date(1), null, 1]);
        });
    });

    describe("Test ordinaryInstToObj", () => {
        it("should transform an ordinary object", () => {
            expect(trans.ordinaryInstToObj({p1: 1, p2: () => 1}, new Set())).to.be.eql({p1: 1});
        });
    });

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
