import {
    Behavior,
    CopyBehavior,
    ICopyFromHeaderQuery,
    ICopyFromPathBody,
    IResponseBuilder,
    IsResponse,
    IsResponseBuilder,
    ProxyResponse,
    ProxyResponseBuilder,
    ProxyResponseOptions,
    StandardResponse,
} from '../interfaces';

export class ResponseBuilder {
    is!: IsResponse;
    proxy!: ProxyResponseOptions;
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
    }: IResponseBuilder) {
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
    }

    private handleIsResponse({ body, headers, status, data }: IsResponseBuilder) {
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

    private handleProxyResponse({ url, proxyMode }: ProxyResponseBuilder) {
        this.proxy = {
            to: url || '',
            mode: proxyMode || 'proxyAlways',
        };
        return this;
    }

    // TODO: Remove any;
    handleDecorate(decorate: any) {
        const decorateType = typeof decorate;

        switch (decorateType) {
            case 'function':
                this.addDecorate(decorate.toString());
                break;
            case 'string':
                this.addDecorate(decorate);
                break;
            case 'object':
                decorate.map((item: any) => {
                    if (typeof item === 'string') {
                        this.addDecorate(item);
                    } else {
                        this.addDecorate(item.toString());
                    }
                });
        }
    }

    addCopyFromHeaderQuery({ type, copyFrom }: { type: 'headers' | 'query'; copyFrom?: ICopyFromHeaderQuery }) {
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

    addCopyFromPathBody({ from, copyFrom }: { from: 'path' | 'body'; copyFrom?: ICopyFromPathBody }) {
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

    addDecorate(decorate: string) {
        this.behaviors.push({ decorate: decorate });
    }

    generate(): StandardResponse {
        const isReponse: StandardResponse = {
            is: this.is,
            behaviors: this.behaviors,
            repeat: this.repeat,
        };
        return isReponse;
    }

    generateProxy(): ProxyResponse {
        const proxy: ProxyResponse = {
            proxy: this.proxy,
            behaviors: this.behaviors,
        };
        return proxy;
    }
}
