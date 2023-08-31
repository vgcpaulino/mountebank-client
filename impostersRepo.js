// impostersRepo.js
const repo = require('mountebank-redis-repository');
const logger = require('pino')();
const loggerChild = logger.child({ _context: 'mountebank-redis-repo' });

const redisHost = process.env.REDIS_HOST || 'http://localhsot';
const redisPort = process.env.REDIS_PORT || 6379;

const repoConfig = {
    redisOptions: {
        socket: {
            host: redisHost,
            port: redisPort,
        },
        password: process.env.REDIS_PASSWORD,
    },
};

function create(config) {
    const newConfig = {
        ...config,
        impostersRepositoryConfig: repoConfig,
    };
    return repo.create(newConfig, loggerChild);
}

create(repoConfig);

module.exports = {
    create,
};
