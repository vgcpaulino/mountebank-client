import { AxiosResponse } from "axios";

type errorCodeTypes = 'ADD_IMPOSTER';

const errorCodeTypesStatusOnSuccess = {
    'ADD_IMPOSTER': 201,
};

export function checkError({ errorCode, response }: { errorCode: errorCodeTypes, response: AxiosResponse }) { 
    if (response.status != errorCodeTypesStatusOnSuccess[errorCode]) {
        console.log(response.status);
        throwError(getErrormessage({ errorCode, response }));
    }

}

function getErrormessage({ errorCode, response }: { errorCode: errorCodeTypes, response: AxiosResponse }) { 
    switch (errorCode) {
        case 'ADD_IMPOSTER':
            return 'ERROR: Imposter was NOT created!'
        default:
            return 'GENERIC ERROR!';
    }
}

const throwError = (message: string) =>  { throw new Error(message) };