/**
 * Created by perlerd on 2017-07-09.
 */

import {ignore, name, type} from "../src/lib/decorators";
import {date} from "../src/lib/types";

class Foo {
    @name("foo_bar")
    @type(date)
    private fooBar: number;

    @ignore("Nothing")
    private nothing: string;

    constructor(id: number,
                @name("bar_foo") public readonly barFoo: string,
                fooBar: number,
                nothing: string = "Nothing") {
        this.fooBar = fooBar;
        this.nothing = nothing;
    }
}
