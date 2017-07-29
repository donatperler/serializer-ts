# serializer-ts

Typescript library using decorators to (de-)serialize class instances to and from JSON. Note, this is an alpha version and is therefore not suitable for production.

```typescript
import {version, type, name} from "serializer-ts/lib/decorators";
import {date} from "serializer-ts/lib/types";
import {instanceToObject, objectToInstance, serialize, deserialize} from "serializer-ts";

class AClass {
    @name("aNumber")
    protected _aNumber: number;
    
    constructor(
        @type(date) public readonly aDate: Date
        @type(AnotherClass) public readonly anotherInstance: AnotherClass
    ) {
        this._aNumber = 42;
    }
    
    get aNumber(): number {
        return this._aNumber;
    }
}

@version(1)
class AnotherClass {
    constructor(
        public readonly aField: string
    ) {}
}
```

Transform AClass instance to an object made of types supported by JSON and tranform 
it back to an instance of AClass.

```typescript
const instance = new AClass(new Date("2000-01-01"), new AnotherClass("A string"));

// create an object containing only JSON types
const object = instanceToObject(instance);
/*
  object = {
      aNumber: 42,
      aDate: 946684800000,
      anotherInstance: {
          version: 1,
          aField: "A string"
      }
  }
*/

// create an instance of AClass from the object
const newInstance = objectToInstance(AClass, object);

newInstance.aNumber; // 42

```

Serialize an AClass instance to JSON and parse the JSON string to get back an instance of the same type.

```typescript

const instance = new AClass(new Date("2000-01-01"), new AnotherClass("A string"));

// convert to JSON
const jsonString = serialize(instance);
/*
  {
      "aNumber": 42,
      "aDate": 946684800000,
      "anotherInstance": {
          "version": 1,
          "aField": "A string"
      }
  }
*/

// create an AClass instance from the JSON string
const instanceFromJson = deserialize(AClass, jsonString);

instanceFromJson.aNumber; // 42

```

## Installation

```shell
$ npm install serializer-ts
```

## Features
Following features are supported:
- ES6 classes
- Nesting of classes
- Inheritance
- Support for serializing and deseralizing dates another common data types
- Support datastructures such as array, set, and map
- Versioning
- Validation

## Documentation

Comming soon...

## Tests

To run the tests, install first the dependencies and then run `npm test`

```shell
$ npm install serializer-ts
```

## Licence

[Apache 2.0](./LICENSE)
