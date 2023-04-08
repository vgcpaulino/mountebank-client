import { AxiosResponse } from 'axios';

type errorCodeTypes = 'ADD_IMPOSTER' | 'ADD_STUB';

const errorCodeTypesStatusOnSuccess = {
    ADD_IMPOSTER: 201,
    ADD_STUB: 200,
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
        case 'ADD_STUB':
            return `ERROR: The stub was NOT created! (${response.status} / ${JSON.stringify(response.data)})`;
        default:
            return 'GENERIC ERROR!';
    }
}

const throwError = (message: string) => {
    throw new Error(message);
};
