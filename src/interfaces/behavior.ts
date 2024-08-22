export interface ICopyFromHeaderQuery {
  name: string;
  into: string;
  using?: CopyConfiguration;
}

export interface ICopyFromPathBody {
  into: string;
  using: CopyConfiguration;
}

interface CopyConfiguration {
  method: 'regex' | 'xpath' | 'jsonpath';
  selector: string;
}

interface CopyFrom {
  headers?: string;
  query?: string;
}

export interface CopyBehavior {
  from: 'path' | 'body' | CopyFrom;
  into: string;
  using: CopyConfiguration;
}

export interface Behavior {
  wait?: number;
  decorate?: any;
  copy?: CopyBehavior;
}
