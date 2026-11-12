import {
    Behavior,
    Chaos,
    DecorateInput,
    ChaosBehavior,
    CopyBehavior,
    CopyFromHeaderOrQuery,
    CopyFromPathOrBody,
    ResponseBuilderOptions,
    IsResponse,
    ResponseOptions,
    ProxyResponseDefinition,
    ProxyOptions,
    ProxyConfig,
    IsResponseDefinition,
} from '../interfaces';

export class ResponseBuilder {
    is!: IsResponse;
    proxy!: ProxyConfig;
    behaviors: Behavior[];
    repeat!: number;

    constructor({
        status,
        headers,
        body,
        data,
        wait,
        decorate,
        repeat,
        copyFromHeader,
        copyFromPath,
        copyFromBody,
        copyFromQuery,
        url,
        proxyMode,
        chaos,
    }: ResponseBuilderOptions) {
        this.behaviors = [];

        if (url) {
            this.handleProxyResponse({ url, proxyMode });
        }

        if (!url) {
            this.handleIsResponse({ status, headers, body, data });
        }

        if (decorate) {
            this.handleDecorate(decorate);
        }

        if (wait) {
            this.behaviors.push({ wait });
        }

        if (repeat) {
            this.repeat = repeat;
        }

        this.addCopyFromHeaderQuery({
            type: 'headers',
            copyFrom: copyFromHeader,
        });
        this.addCopyFromHeaderQuery({ type: 'query', copyFrom: copyFromQuery });
        this.addCopyFromPathBody({ from: 'path', copyFrom: copyFromPath });
        this.addCopyFromPathBody({ from: 'body', copyFrom: copyFromBody });

        // Last, so an injected error replaces whatever the other behaviors produced.
        if (chaos) {
            this.addChaos(chaos);
        }
    }

    private handleIsResponse({ body, headers, status, data }: ResponseOptions) {
        const isAppJson = typeof body === 'object';

        if (isAppJson) {
            headers = {
                'content-type': 'application/json',
                ...headers,
            };
        }

        this.is = {
            statusCode: status,
            headers,
            body,
            data,
        };

        return this;
    }

    private handleProxyResponse({ url, proxyMode }: ProxyOptions) {
        this.proxy = {
            to: url || '',
            mode: proxyMode || 'proxyAlways',
            addWaitBehavior: true,
        };
        return this;
    }

    handleDecorate(decorate: DecorateInput) {
        const items = Array.isArray(decorate) ? decorate : [decorate];
        items.forEach((item) => {
            this.addDecorate(typeof item === 'string' ? item : item.toString());
        });
    }

    addCopyFromHeaderQuery({ type, copyFrom }: { type: 'headers' | 'query'; copyFrom?: CopyFromHeaderOrQuery }) {
        if (copyFrom) {
            const copyBehavior: CopyBehavior = {
                from: { [type]: copyFrom.name },
                into: copyFrom.into,
                using: copyFrom.using || {
                    method: 'regex',
                    selector: '.+',
                },
            };
            this.behaviors.push({ copy: copyBehavior });
        }
        return this;
    }

    addCopyFromPathBody({ from, copyFrom }: { from: 'path' | 'body'; copyFrom?: CopyFromPathOrBody }) {
        if (copyFrom) {
            const copyBehavior: CopyBehavior = {
                from,
                into: copyFrom.into,
                using: copyFrom.using,
            };
            this.behaviors.push({ copy: copyBehavior });
        }
        return this;
    }

    addChaos({ errorRate, errorStatus, latencyRate, maxLatency, implementation = 'injection' }: Chaos) {
        assertRate('errorRate', errorRate);
        assertRate('latencyRate', latencyRate);
        assertNonNegativeInteger('errorStatus', errorStatus);
        assertNonNegativeInteger('maxLatency', maxLatency);

        if (implementation === 'injection') {
            this.addDecorate(chaosDecorateSource({ errorRate, errorStatus, latencyRate, maxLatency }));
            return this;
        }
        // The types allow only 'injection' | 'native', but JavaScript callers can pass anything.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (implementation !== 'native') {
            throw new Error(`chaos.implementation must be 'injection' or 'native', got ${implementation}`);
        }

        const chaos: ChaosBehavior = {};
        if (errorRate !== undefined) chaos.errorRate = errorRate;
        if (errorStatus !== undefined) chaos.errorStatusCode = errorStatus;
        if (latencyRate !== undefined) chaos.latencyRate = latencyRate;
        if (maxLatency !== undefined) chaos.maxLatencyMs = maxLatency;

        this.behaviors.push({ chaos });
        return this;
    }

    addDecorate(decorate: string) {
        this.behaviors.push({ decorate: decorate });
    }

    generate(): IsResponseDefinition {
        const isResponse: IsResponseDefinition = {
            is: this.is,
            behaviors: this.behaviors,
            repeat: this.repeat,
        };
        return isResponse;
    }

    generateProxy(): ProxyResponseDefinition {
        const proxy: ProxyResponseDefinition = {
            proxy: this.proxy,
            behaviors: this.behaviors,
        };
        return proxy;
    }
}

function assertRate(name: string, value?: number) {
    if (value !== undefined && !(typeof value === 'number' && value >= 0 && value <= 1)) {
        throw new Error(`chaos.${name} must be a number between 0 and 1, got ${value}`);
    }
}

function assertNonNegativeInteger(name: string, value?: number) {
    if (value !== undefined && !(Number.isInteger(value) && value >= 0)) {
        throw new Error(`chaos.${name} must be a non-negative integer, got ${value}`);
    }
}

/**
 * Source of a `decorate` function that reproduces mountebank's `chaos` behavior (mountebank 2.9.6+) on any
 * mountebank version. mountebank resolves a returned Promise, which is how the latency is added. The function is
 * sent as text and runs inside mountebank, so every value it needs is written into it.
 */
function chaosDecorateSource({ errorRate = 0, errorStatus = 500, latencyRate = 0, maxLatency = 1000 }: Chaos) {
    return `(config) => {
    const errorRate = ${errorRate}, errorStatus = ${errorStatus}, latencyRate = ${latencyRate}, maxLatency = ${maxLatency};
    const maybeInjectError = () => {
        if (errorRate > 0 && Math.random() < errorRate) {
            config.response.statusCode = errorStatus;
            config.response.body = '';
        }
        return config.response;
    };
    if (latencyRate > 0 && maxLatency > 0 && Math.random() < latencyRate) {
        const delay = Math.floor(Math.random() * maxLatency);
        return new Promise((resolve) => setTimeout(() => resolve(maybeInjectError()), delay));
    }
    return maybeInjectError();
}`;
}
