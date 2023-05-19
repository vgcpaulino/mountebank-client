import { Imposter, LogLevel } from '../interfaces';
import { deleteStubByIndex, getImposter, getStubIndex } from '../client/mountebankClient';
import axios from 'axios';
import express, { Request, Response } from 'express';

const TIME_INTERVAL = 100;
const defaultImposrterPort = parseInt(process.env['MockProviderPorst'] || '') || 7118;

function logInformation(message: string, logLevel?: LogLevel) {
    if (logLevel === 'debug' || logLevel === 'warn') {
        console.log(message);
    }
}

export function deleteService({ port = 2526, logLevel }: { port: number; logLevel?: LogLevel }) {
    const router = express.Router();

    const queueDeleteIDs: string[] = [];
    let timerId: NodeJS.Timer | undefined;
    let previousImposerData: Imposter;

    router.post('/stubs', async (req: Request, res: Response) => {
        const stubsIDs = req.body.stubs;
        logInformation(`Recieved the IDs to remove: ${stubsIDs}`, logLevel);
        queueDeleteIDs.push(...stubsIDs);

        axios.post(`http://localhost:${port}/delete-service`).finally();

        res.sendStatus(200);
    });

    router.post('/delete-service', (req: Request, res: Response) => {
        if (queueDeleteIDs.length <= 0) {
            res.sendStatus(200).send('There is NOT IDs in the queue to delete!');
        }

        if (!timerId && queueDeleteIDs.length > 0) {
            let count = 0;
            timerId = setInterval(async () => {
                count++;

                logInformation(`Running the Delete Service! Queue Length: ${queueDeleteIDs.length}`, logLevel);
                // logInformation(`RUNNING ${new Date()}`, logLevel);

                if (queueDeleteIDs.length <= 0) {
                    clearInterval(timerId);
                    timerId = undefined;
                    return;
                }

                if (!previousImposerData) {
                    previousImposerData = await getImposter({ port: defaultImposrterPort });
                }

                const stubID = queueDeleteIDs[0];
                let stub = previousImposerData.stubs?.find((s) => s.stubID === stubID);
                if (!stub) {
                    previousImposerData = await getImposter({ port: defaultImposrterPort });
                }

                stub = previousImposerData.stubs?.find((s) => s.stubID === stubID);
                if (stub) {
                    const stubIndex = getStubIndex(stub);
                    if (stubIndex) {
                        previousImposerData = await deleteStubByIndex({
                            imposterPort: defaultImposrterPort,
                            stubIndex,
                        });
                        logInformation(`The StubID was found: ${stubID} (index: ${stubIndex})`, logLevel);
                    } else {
                        logInformation(`The StubID was NOT found: ${stubID}!`, logLevel);
                    }
                }

                queueDeleteIDs.shift();
            }, TIME_INTERVAL);
        }
    });

    const app = express();
    app.use(express.json());
    app.use(router);

    app.listen(port, () => {
        console.log(`Mock Provider - Delete Service listening at port ${port}!`);
    });
}
