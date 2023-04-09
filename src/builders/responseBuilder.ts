import { StandardResponse, IsResponse, IResponseBuilder } from '../interfaces';

export class ResponseBuilder {
    is: IsResponse;

    constructor({ status, headers, body }: IResponseBuilder) {
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
    }

    generate(): StandardResponse {
        return this;
    }
}
