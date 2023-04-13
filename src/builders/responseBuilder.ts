import { StandardResponse, IsResponse, IResponseBuilder, Behavior, CopyBehavior } from '../interfaces';

export class ResponseBuilder {
    is: IsResponse;
    behaviors: Behavior[];
    repeat!: number;

    constructor({ status, headers, body, wait, decorate, repeat, copyFromHeader }: IResponseBuilder) {
        this.behaviors = [];

        const isAppJson = typeof body === 'object';

        if (isAppJson) {
            headers = {
                ...headers,
                'content-type': 'application/json',
            };
        }

        this.is = {
            statusCode: status,
            headers,
            body,
        };

        if (decorate) {
            this.handleDecorate(decorate);
        }

        if (wait) {
            this.behaviors.push({ wait });
        }

        if (repeat) {
            this.repeat = repeat;
        }

        if (copyFromHeader) {
            const copyBehavior: CopyBehavior = {
                from: { headers: copyFromHeader.name },
                into: copyFromHeader.into,
                using: {
                    method: 'regex',
                    selector: '.+',
                },
            };
            this.behaviors.push({ copy: copyBehavior });
        }
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

    addDecorate(decorate: string) {
        this.behaviors.push({ decorate: decorate });
    }

    generate(): StandardResponse {
        return this;
    }
}
