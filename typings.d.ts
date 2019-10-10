declare module 'openzeppelin-test-helpers' {
  export const expectRevert: (promise: Promise<any>, msg: string) => Promise<any>;
  export const time: {
    increase: (n: number) => Promise<any>;
  };
  export const constants: any;
}

declare namespace Chai {
  interface Assertion {
    bignumber: Assertion;
  }
}
