import { randomInt } from 'crypto';

interface UserBuilderProperties {
    id?: number;
}

export class UserBuilder {
    id: number;

    constructor({ id }: UserBuilderProperties = {}) {
        this.id = id || randomInt(1, 200);
    }

    generate() {
        return {
            id: this.id,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
        };
    }
}
