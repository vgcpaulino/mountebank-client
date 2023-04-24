import { ImposterBuilder, PredicateBuilder, StubBuilder } from '../builders';
import { graphQLSchema } from './graphqlSchema';

const users = [
    {
        id: 10,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@doe.com',
        active: true,
    },
    {
        id: 11,
        firstName: 'Elvis',
        lastName: 'Presley',
        email: 'elvis@presley.com',
        active: false,
    },
];

const user = (id: number) => {
    return users.find((user) => user.id === id);
};

const posts = [
    {
        id: 99,
        user: user(10),
        title: 'Testing GraphQL Plugin',
    },
];

const stubGetAllUsers = new StubBuilder().any({ query: 'getAllUsers' }).response({
    status: 200,
    data: users,
});

const stubGetUser = new StubBuilder()
    .any({ query: 'getUser', args: { id: 10 } })
    .response({ status: 200, data: user(10) });

const stubGetAllPosts = new StubBuilder().any({ query: 'getAllPosts' }).response({
    status: 200,
    data: posts,
});

const stubCreateUser = new StubBuilder()
    .any({
        mutation: 'createUser',
        args: {
            firstName: 'Mungo',
            lastName: 'Jerry',
            email: 'mungo@jerry.com',
            active: true,
        },
    })
    .response({
        status: 200,
        data: { id: 12, firstName: 'Mungo', lastName: 'Jerry', email: 'mungo@jerry.com', active: true },
    });

export const imposter = new ImposterBuilder({
    port: 7117,
    protocol: 'graphql',
    name: 'Example',
    schema: graphQLSchema,
})
    .addStub(stubGetAllUsers)
    .addStub(stubGetUser)
    .addStub(stubGetAllPosts)
    .addStub(stubCreateUser);
