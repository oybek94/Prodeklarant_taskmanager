import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  export interface ParamsDictionary {
    [key: string]: string;
  }
}
