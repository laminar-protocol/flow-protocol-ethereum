declare module 'openzeppelin-test-helpers' {
  export interface ExpectRevert {
    (promise: Promise<any>, msg: string): Promise<any>;
    assertion: (promise: Promise<any>) => Promise<any>;
    unspecified: (promise: Promise<any>) => Promise<any>;
  }
  export const expectRevert: ExpectRevert;
  export const time: {
    increase: (n: number) => Promise<any>;
    latest: () => Promise<any>;
    duration: {
      seconds: (n: number) => any;
      minutes: (n: number) => any;
      hours: (n: number) => any;
      days: (n: number) => any;
      weeks: (n: number) => any;
      years: (n: number) => any;
    };
  };
  export const constants: any;
  export const expectEvent: (
    receipt: Truffle.TransactionResponse<Truffle.AnyEvent>,
    eventName: string,
    eventArgs: {},
  ) => Promise<any>;
}

declare namespace Chai {
  interface Assertion {
    bignumber: Assertion;
  }
}

declare module 'chai-bn' {
  const f: (bn: any) => (chai: any, utils: any) => null;
  export = f;
}
