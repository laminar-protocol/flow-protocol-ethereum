declare module 'openzeppelin-test-helpers' {
  export const expectRevert: (
    promise: Promise<any>,
    msg: string,
  ) => Promise<any>;
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
