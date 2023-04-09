import { StandardResponse, IsResponse, IResponseBuilder, Behavior } from '../interfaces';

export class ResponseBuilder {
    is: IsResponse;
    behaviors: Behavior[];

    constructor({ status, headers, body, wait, decorate }: IResponseBuilder) {
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
    }

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
