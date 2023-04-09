import { StandardResponse, IsResponse } from '../interfaces';

interface IResponseBuilder extends Omit<IsResponse, 'statusCode'> {
    status: number;
}

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
