import { ImposterBuilder } from '../../src';
import {
    stubGetUser,
    stubPatchUser,
} from './stubs';

const stubs = [
    stubGetUser,
    stubPatchUser,
];

export const imposterUsersService = new ImposterBuilder({ 
        port: 8080, 
        protocol: 'http' 
    })
    .addDefaultResponse({
        status: 500,
        body: 'ERR',
    })
    .addStubs(stubs);
