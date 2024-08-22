/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Imposter, ImposterDefaultResponse, ImposterProtocol, LogLevel, Stub } from '../interfaces';
import { checkError } from './errorHelper';
import axios from 'axios';

const defaultProviderUrl = process.env.MOUNTEBANK_URL || 'http://localhost:2525';
const defaultImposterPort = parseInt(process.env.MOUNTEBANK_IMPOSTER_DEFAULT_PORT || '') || 7117;

interface IAddImposter {
  providerUrl?: string;
  port?: number;
  protocol: ImposterProtocol;
  name?: string;
  schema?: string;
  defaultResponse?: ImposterDefaultResponse;
  stubs?: Stub[];
}

export async function addImposter({
  providerUrl = defaultProviderUrl,
  port = defaultImposterPort,
  protocol = 'https',
  name = '',
  schema = '',
  defaultResponse = undefined,
  stubs = [],
}: IAddImposter) {
  const body: {
    port: string | number;
    protocol: ImposterProtocol;
    name?: string;
    schema?: string;
    defaultResponse?: ImposterDefaultResponse;
    stubs: Stub[];
  } = {
    port,
    protocol,
    name,
    schema,
    defaultResponse,
    stubs,
  };

  const response = await axios.post(`${providerUrl}/imposters`, stringify(body), {
    validateStatus: null,
  });

  if (response.status === 400) {
    return;
  }

  checkError({ errorCode: 'ADD_IMPOSTER', response, });
}

export async function getImposter({ providerUrl = defaultProviderUrl, port = defaultImposterPort, } = {}) {
  const response = await axios.get(`${providerUrl}/imposters/${port}`, {
    validateStatus: null,
  });

  checkError({ errorCode: 'GET_IMPOSTER', response, });

  return response.data;
}

export async function addStub({
  providerUrl = defaultProviderUrl,
  imposterPort = defaultImposterPort,
  stub,
}: {
  providerUrl?: string;
  imposterPort?: string | number;
  stub: Stub;
}) {
  const response = await axios.post(
    `${providerUrl}/imposters/${imposterPort}/stubs`,
    stringify({ stub: { ...stub, }, }),
    { validateStatus: null, }
  );

  checkError({ errorCode: 'ADD_STUB', response, });
}

export async function deleteStubByID({
  providerUrl = defaultProviderUrl,
  imposterPort = defaultImposterPort,
  stubID,
}: {
  providerUrl?: string;
  imposterPort?: number;
  stubID?: string;
} = {}) {
  const response = await getImposter({ providerUrl, port: imposterPort, });
  const stub = response.stubs.find((s: Stub) => s.stubID === stubID);
  const stubIndex = getStubIndex(stub);

  return deleteStubByIndex({ providerUrl, imposterPort, stubIndex, });
}

export async function deleteStubsByID({
  providerUrl = defaultProviderUrl,
  imposterPort = defaultImposterPort,
  stubIDs,
}: {
  providerUrl?: string;
  imposterPort?: number;
  stubIDs?: string[];
} = {}) {
  if (!stubIDs) {
    return;
  }

  let previousReponse: Imposter | undefined;
  for (const stubID of stubIDs) {
    if (!previousReponse) {
      previousReponse = await deleteStubByID({
        providerUrl,
        imposterPort,
        stubID,
      });
    } else {
      const stub = previousReponse.stubs?.find(s => s.stubID === stubID);
      if (stub) {
        const stubIndex = getStubIndex(stub);
        previousReponse = await deleteStubByIndex({
          providerUrl,
          imposterPort,
          stubIndex,
        });
      }
    }
  }
  return previousReponse;
}

export async function deleteStubByIndex({
  providerUrl = defaultProviderUrl,
  imposterPort = defaultImposterPort,
  stubIndex,
}: {
  providerUrl?: string;
  imposterPort?: number;
  stubIndex?: string;
} = {}) {
  const response = await axios.delete(`${providerUrl}/imposters/${imposterPort}/stubs/${stubIndex}`, {
    validateStatus: null,
  });

  checkError({ errorCode: 'DELETE_STUB', response, });

  return response.data;
}

export async function getLogs({ providerUrl = defaultProviderUrl, } = {}) {
  const response = await axios.get(`${providerUrl}/logs`, {
    validateStatus: null,
  });

  checkError({ errorCode: 'GET_LOGS', response, });

  const logs: { level: LogLevel; message: string; timestamp: string; }[] = response.data?.logs;
  return logs;
}

const stringify = (object: Record<any, any>) => {
  return JSON.stringify(object);
};

function getStubIndex(stub: Stub) {
  const href = stub._links?.self.href;
  if (href) {
    const index = href.lastIndexOf('/');
    return href.slice(index + 1, href.length);
  }
  return undefined;
}
