declare module 'openzeppelin-test-helpers' {
    export const expectRevert: (promise: Promise<any>, msg: string) => Promise<any>;
    export const time: {
        increase: (n: number) => Promise<any>
    }
}

declare module Chai {
    interface Assertion {
        bignumber: Assertion;
    }
}