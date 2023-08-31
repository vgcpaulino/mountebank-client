import { ImposterBuilder, StubBuilder } from '../builders';
import { Config } from '../interfaces';

const stubWithEndsWith = new StubBuilder()
    .get('/path/endsWith', { operator: 'endsWith' })
    .response({ status: 200, body: 'Work!' });

const stubWithStartsWith = new StubBuilder()
    .get('/startsWith', { operator: 'startsWith' })
    .response({ status: 200, body: 'Work!' });

const stubWithMatches = new StubBuilder()
    .get('/users/[{]?[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}[}]?/details', { operator: 'matches' })
    .response({ status: 200, body: 'Work' });

const stubGenerateStateInformation = new StubBuilder().get('/state').response({
    status: 200,
    body: { id: 1 },
    decorate: (config: Config) => {
        config.logger.warn('HERE');

        function roughSizeOfObject(object: any) {
            var objectList: any[] = [];
            var stack = [object];
            var bytes = 0;

            while (stack.length) {
                var value: boolean | string | number | Record<string, any> = stack.pop();
                if (typeof value === 'boolean') {
                    bytes += 4;
                } else if (typeof value === 'string') {
                    bytes += value.length * 2;
                } else if (typeof value === 'number') {
                    bytes += 8;
                } else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
                    objectList.push(value);

                    for (var i in value) {
                        stack.push(value[i]);
                    }
                }
            }
            return bytes;
        }

        if (!config.state.xpto) {
            config.state.xpto = [];
        }

        config.state.xpto.push(Date.now());
        config.logger.warn(config.state.xpto.length);
        config.logger.warn(roughSizeOfObject(config.state.xpto).toString());
    },
});

export const imposter = new ImposterBuilder({ port: 7117, protocol: 'http', name: 'Imposter HTTP' })
    .addDefaultReponse({
        status: 404,
        body: 'Not Found!',
    })
    .addStub(stubWithEndsWith)
    .addStub(stubWithStartsWith)
    .addStub(stubWithMatches)
    .addStub(stubGenerateStateInformation);
