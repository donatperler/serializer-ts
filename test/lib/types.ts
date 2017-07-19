/**
 * Created by perlerd on 2017-07-09.
 */

import {expect} from "chai";
import * as types from "../../src/lib/types";

const timestamps = [1000, 2000];
describe("Test module types", () => {
    const cycle = new Set<object>();
    describe("Test identity", () => {
        it("should apply identity's instance to object transformer", () => {
            expect(types.identity.instanceToObject(1, cycle)).to.be.equal(1);
        });
        it("should apply identity's object to instance transformer", () => {
            expect(types.identity.objectToInstance(2)).to.be.equal(2);
        });
    });

    describe("Test date", () => {
        it("should transform a date into a number", () => {
            const timestamp = 10000;
            expect(types.date.instanceToObject(new Date(timestamp), cycle)).to.be.eql(timestamp);
        });
        it("should transform a timestamp into a Date", () => {
            const date = new Date();
            expect(types.date.objectToInstance(date.getTime())).to.be.eql(date);
        });
    });

    describe("Test array", () => {
        it("should transform the dates in the array into number", () => {
            expect(types.array(types.date).instanceToObject(timestamps.map((v) => new Date(v)), cycle))
                .to.be.eql(timestamps);
        });
        it("should transform the numbers in the array into dates", () => {
            const dates = [new Date(), new Date(), new Date()];
            expect(types.array(types.date).objectToInstance(dates.map((d) => d.getTime()))).to.be.eql(dates);
        });
    });

    describe("Test map", () => {
        const map = new Map(timestamps.map((v, i): [string, Date] => [`key ${i}`, new Date(v)]));
        it("should transform a map into an array", () => {
            expect(types.map(types.date).instanceToObject(map, cycle))
                .to.be.eql(timestamps.map((v, i) => [`key ${i}`, v]));
        });
        it("should transform an array into a map", () => {
            expect(types.map(types.date).objectToInstance(timestamps.map((v, i): [string, number] => [`key ${i}`, v])))
                .to.be.eql(map);
        });
    });

    describe("Test set", () => {
        const set = new Set(timestamps.map((n) => new Date(n)));
        it("should transform a set into an array", () => {
            expect(types.set(types.date).instanceToObject(set, cycle)).to.be.eql(timestamps);
        });
        it("should transform an array into a set", () => {
            expect(types.set(types.date).objectToInstance(timestamps)).to.be.eql(set);
        });
    });

    /*
    describe("Test serializable", () => {
        class A {
            @type(types.date)
            public date: Date;
        }
        it("should transform object of class A to")
    });*/

    describe("Test toString", () => {
        const n = new Number(1); // tslint:disable-line no-construct
        const str = "1";
        it("should convert a number into a string", () => {
            expect(types.toString(Number).instanceToObject(n, cycle)).to.be.equal(str);
        });
        it("should convert a string into a number", () => {
            expect(types.toString(Number).objectToInstance(str)).to.be.eql(n);
        });
    });

    describe("Test toJSON", () => {
        const date = new Date();
        const str = date.toJSON();
        it("should convert a date into a string", () => {
            expect(types.toJSON(Date).instanceToObject(date, cycle)).to.be.eql(str);
        });
        it("should convert a string into a date", () => {
            expect(types.toJSON(Date).objectToInstance(str)).to.be.eql(date);
        });
    });
});
