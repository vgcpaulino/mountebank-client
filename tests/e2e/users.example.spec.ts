import { addUserStubs } from '../../examples/users-service/stubs';
import { test } from '@playwright/test';

test.describe('Suite', () => {
    test.beforeAll(async () => {
        await addUserStubs();
    });

    test('Test 1', async () => {
        // ....
    });
});
