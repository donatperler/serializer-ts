/**
 * Created by perlerd on 2017-07-15.
 */

import {expect} from "chai";

import {ConfigurationError} from "../../src/lib/errors";
import * as meta from "../../src/lib/meta-data";
import {instanceMetaDataSymbol, staticMetaDataSymbol, versionMetaDataSymbol} from "../../src/lib/symbols";
import {identity} from "../../src/lib/types";

describe("Test module meta-data", () => {
    describe("Test function getInstanceMetaData", () => {
        const instance = Object.create(Object.assign(Object.create({
            [instanceMetaDataSymbol]: {
                p2: {name: "q2", isIncluded: true, type: identity},
                p3: {name: "q3", isIncluded: true, type: identity},
                p4: {name: "q4", isIncluded: true, type: identity},
            }
        }), {
            [instanceMetaDataSymbol]: {
                p1: {name: "p1", isIncluded: true, type: identity},
                p2: {name: "p2", isIncluded: true, type: identity},
                p3: {name: "p3", isIncluded: false, type: identity},
            }
        }));
        expect(meta.getInstanceMetaData(instance)).to.be.eql({
            p2: {name: "p2", isIncluded: true, type: identity},
            p3: {name: "p3", isIncluded: false, type: identity},
            p4: {name: "q4", isIncluded: true, type: identity},
            p1: {name: "p1", isIncluded: true, type: identity}
        });
    });

    describe("Test function getStaticMetaData", () => {
        const metaData = [
            {q1: {name: "q1", type: identity, getStaticValue: () => 2}},
            {p1: {name: "p1", type: identity, getStaticValue: () => 1}},
        ];
        const parents = Object.create({[staticMetaDataSymbol]: metaData[1]});
        parents[staticMetaDataSymbol] = metaData[0];
        const instance = Object.create(parents);
        expect(meta.getStaticMetaData(instance)).to.be.eql(metaData);
    });

    describe("Test function getVersionMetaData", () => {
        it("should get version meta data", () => {
            const parents = Object.create({
                [versionMetaDataSymbol]: {version: 1},
            });
            parents[versionMetaDataSymbol] = {version: 2};
            const instance = Object.create(parents);
            expect(meta.getVersionMetaData(instance)).to.be.eql(parents[versionMetaDataSymbol]);
        });
    });

    describe("Test function getStaticObjectProperties", () => {
        it("should return a set of object properties", () => {
            const metaData: meta.StaticMetaData[] = [{
                p1: {name: "s1", type: identity, getStaticValue: () => 1},
                p2: {name: "s2", type: identity, getStaticValue: () => 2},
            }, {
                q2: {name: "s2", type: identity, getStaticValue: () => 2},
                q3: {name: "s3", type: identity, getStaticValue: () => 3}
            }];
            expect(meta.getStaticObjectProperties(metaData)).to.be.eql(new Set(["s1", "s2", "s3"]));
        });
    });

    describe("Test function invert", () => {
        it("should compute the inverse of the meta data", () => {
            const metaData: meta.InstanceMetaData = {
                p1: {name: "s1", isIncluded: true, type: identity},
                p2: {name: "s2", isIncluded: false, type: identity},
            };
            expect(meta.invert(metaData)).to.be.eql({
                s1: {name: "p1", isIncluded: true, type: identity},
                s2: {name: "p2", isIncluded: false, type: identity},
            });
        });
        it("should fail to compute the inverse", () => {
            const metaData: meta.InstanceMetaData = {
                p1: {name: "s", isIncluded: true, type: identity},
                p2: {name: "s", isIncluded: false, type: identity},
            };
            expect(() => meta.invert(metaData)).to.throw(ConfigurationError, /already used/);
        });
    });

    describe("Test function setInstanceProperty", () => {
        it("should set property name for a constructor function", () => {
            function ConstructorFn() { return undefined; }
            meta.setInstanceProperty(ConstructorFn, "property", "name", "newName");
            expect(ConstructorFn.prototype[instanceMetaDataSymbol].property.name).to.be.equal("newName");
        });
        it("should set property name for an instance", () => {
            const target = {};
            meta.setInstanceProperty(target, "property", "name", "newName");
            expect(target[instanceMetaDataSymbol].property.name).to.be.equal("newName");
        });
        it("should refuse to set property isIncluded", () => {
            const target = {};
            expect(() => meta.setInstanceProperty(target, "property", "isIncluded", false))
                .to.throw(ConfigurationError, /to set property 'isIncluded'/);
        });
        it("should refuse to set any property if the field was previously decorated by ignore", () => {
            const target = {
                [instanceMetaDataSymbol]: {property: {name: "property", type: identity, isIncluded: false}}
            };
            expect(() => meta.setInstanceProperty(target, "property", "name", "newName"))
                .to.throw(ConfigurationError, /Decorator ignore/);
        });
    });

    describe("Test function setStaticProperty", () => {
        it("should set property name", () => {
            const initialGetStaticValue = () => 1;
            const getStaticValue = () => 2;
            function ConstructorFn() { return undefined; }
            ConstructorFn.prototype[staticMetaDataSymbol] = {
                property: {name: "name", type: identity, getStaticValue: initialGetStaticValue}
            };
            meta.setStaticProperty(ConstructorFn, "property", "name", "newName", getStaticValue);
            expect(ConstructorFn.prototype[staticMetaDataSymbol].property.name).to.be.equal("newName");
            expect(ConstructorFn.prototype[staticMetaDataSymbol].property.getStaticValue)
                .to.be.eql(initialGetStaticValue);
        });
    });

    describe("Test function setVersion", () => {
        it("should throw error when version already set", () => {
            function ContructorFn() { return undefined; }
            ContructorFn.prototype[versionMetaDataSymbol] = {version: 1};
            expect(() => meta.setVersion(ContructorFn, 2)).to.throw(ConfigurationError, /Version already set/);
        });
        it("should set the version", () => {
            function ConstructorFn() { return undefined; }
            function migrate(): number { return 4; }
            meta.setVersion(ConstructorFn, 1, migrate);
            expect(ConstructorFn.prototype[versionMetaDataSymbol]).to.be.eql({version: 1, migrator: migrate});
        });
    });

    describe("Test function getOrCreateOwnInstanceMetaData", () => {
        it("should return instance meta data", () => {
            const target = {[instanceMetaDataSymbol]: {}};
            expect(meta.getOrCreateOwnInstanceMetaData(target)).to.be.equal(target[instanceMetaDataSymbol]);
        });
        it("should create and return new instance meta data", () => {
            const target = {};
            expect(meta.getOrCreateOwnInstanceMetaData(target)).to.be.equal(target[instanceMetaDataSymbol]);
        });
    });

    describe("Test function getOrCreateOwnStaticMetaData", () => {
        it("should return static meta data", () => {
            const target = {[staticMetaDataSymbol]: {}};
            expect(meta.getOrCreateOwnStaticMetaData(target)).to.be.equal(target[staticMetaDataSymbol]);
        });
        it("should create and return new static meta data", () => {
            const target = {};
            expect(meta.getOrCreateOwnStaticMetaData(target)).to.be.equal(target[staticMetaDataSymbol]);
        });
    });

    describe("Test function getOrCreateInstanceMetaDataItem", () => {
        let metaData: meta.InstanceMetaData;
        beforeEach(() => {
            metaData = {
                property: {name: "property", type: identity, isIncluded: true}
            };
        });

        it("should get a instance meta data item", () => {
            expect(meta.getOrCreateInstanceMataDataItem(metaData, "property"))
                .to.be.eql(metaData.property);
        });

        it("should create a new instance meta data item", () => {
            const defaultMetaDataItem: meta.InstanceMetaDataItem<any, any> = {
                name: "newProperty", type: identity, isIncluded: true
            };
            expect(meta.getOrCreateInstanceMataDataItem(metaData, "newProperty"))
                .to.be.eql(defaultMetaDataItem);
            expect(metaData.newProperty).to.be.eql(defaultMetaDataItem);
        });
    });

    describe("Test function getOrCreateStaticMataDataItem", () => {
        const newGetStaticValue = () => 2;
        let metaData: meta.StaticMetaData;

        beforeEach(() => {
            metaData = {
                staticProperty: {name: "serializeProperty", type: identity, getStaticValue: () => 1}
            };
        });

        it("should get static meta data item", () => {
            expect(meta.getOrCreateStaticMataDataItem(metaData, "staticProperty", newGetStaticValue))
                .to.be.eql(metaData.staticProperty);
        });

        it("should create a new MetaDataItem", () => {
            expect(meta.getOrCreateStaticMataDataItem(metaData, "newProperty", newGetStaticValue))
                .to.be.eql({name: "newProperty", type: identity, getStaticValue: newGetStaticValue});
            expect(metaData.newProperty).to.be.eql({
                name: "newProperty", type: identity, getStaticValue: newGetStaticValue
            });
        });
    });
});
