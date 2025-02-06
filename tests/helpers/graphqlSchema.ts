export const graphQLSchema = `
    type User {
        id: Int 
        firstName: String 
        lastName: String 
        email: String 
        active: Boolean
    }

    type Post {
        id: Int
        user: User
        title: String
    }

    type Query {
        getAllUsers: [User]
        getUser(id: Int): User
        getAllPosts: [Post]
    }

    type Mutation { 
        createUser(
            firstName: String!
            lastName: String !
            email: String
            active: Boolean!): User
    }
`;
