import { AxiosResponse } from 'axios';

type errorCodeTypes = 'ADD_IMPOSTER' | 'GET_IMPOSTER' | 'ADD_STUB' | 'DELETE_STUB';

const errorCodeTypesStatusOnSuccess = {
    ADD_IMPOSTER: 201,
    GET_IMPOSTER: 200,
    ADD_STUB: 200,
    DELETE_STUB: 200,
};

export function checkError({ errorCode, response }: { errorCode: errorCodeTypes; response: AxiosResponse }) {
    if (response.status != errorCodeTypesStatusOnSuccess[errorCode]) {
        throwError(getErrormessage({ errorCode, response }));
    }
}

function getErrormessage({ errorCode, response }: { errorCode: errorCodeTypes; response: AxiosResponse }) {
    switch (errorCode) {
        case 'ADD_IMPOSTER':
            return 'ERROR: Imposter was NOT created!';
        case 'GET_IMPOSTER':
            return `ERROR: GET Imposter error! (${response.status} / ${JSON.stringify(response.data)})`;
        case 'ADD_STUB':
            return `ERROR: The stub was NOT created! (${response.status} / ${JSON.stringify(response.data)})`;
        default:
            return 'GENERIC ERROR!';
    }
}

const throwError = (message: string) => {
    throw new Error(message);
};
