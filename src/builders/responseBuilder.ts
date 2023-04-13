import {
    StandardResponse,
    IsResponse,
    IResponseBuilder,
    Behavior,
    CopyBehavior,
    ICopyFromHeader,
    ICopyFromPath,
} from '../interfaces';

export class ResponseBuilder {
    is: IsResponse;
    behaviors: Behavior[];
    repeat!: number;

    constructor({ status, headers, body, wait, decorate, repeat, copyFromHeader, copyFromPath }: IResponseBuilder) {
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

        this.addCopyFromHeader(copyFromHeader);
        this.addCopyFromPath(copyFromPath);
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

    addCopyFromHeader(copyFromHeader?: ICopyFromHeader) {
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
        return this;
    }

    addCopyFromPath(copyFromPath?: ICopyFromPath) {
        if (copyFromPath) {
            const copyBehavior: CopyBehavior = {
                from: 'path',
                into: copyFromPath.into,
                using: copyFromPath.using,
            };
            this.behaviors.push({ copy: copyBehavior });
        }
        return this;
    }

    addDecorate(decorate: string) {
        this.behaviors.push({ decorate: decorate });
    }

    generate(): StandardResponse {
        return this;
    }
}
