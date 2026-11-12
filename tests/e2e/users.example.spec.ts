import { stubsUser } from '../../examples/users-service/stubs';
import { test } from '@playwright/test';

test.describe('Suite', () => {
    test.beforeAll(async () => {
        await stubsUser().addStubs();
    });

    test('Test 1', async () => {
        // ....
    });
});
