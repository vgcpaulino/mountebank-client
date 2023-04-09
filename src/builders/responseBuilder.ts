import { StandardResponse, IsResponse, IResponseBuilder, Behavior } from '../interfaces';

export class ResponseBuilder {
    is: IsResponse;
    behaviors: Behavior[];

    constructor({ status, headers, body, wait }: IResponseBuilder) {
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

        if (wait) {
            this.behaviors.push({ wait });
        }
    }

    generate(): StandardResponse {
        return this;
    }
}
