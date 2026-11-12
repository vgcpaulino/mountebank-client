import { parsePortOffset } from '../../config/ports';

describe('parsePortOffset', () => {
    test('defaults to 0 when unset or empty', () => {
        expect(parsePortOffset(undefined)).toBe(0);
        expect(parsePortOffset('')).toBe(0);
    });

    test('parses a non-negative integer', () => {
        expect(parsePortOffset('1000')).toBe(1000);
        expect(parsePortOffset('0')).toBe(0);
    });

    test.each(['abc', '-1', '1.5'])('rejects %p', (value) => {
        expect(() => parsePortOffset(value)).toThrow('MB_TEST_PORT_OFFSET');
    });
});
