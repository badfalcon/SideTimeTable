import { sendMessage } from '../../src/lib/chrome-messaging.js';

describe('chrome-messaging', () => {
    beforeEach(() => {
        chrome.runtime.lastError = null;
        chrome.runtime.sendMessage.mockClear();
    });

    describe('sendMessage', () => {
        test('resolves with response on success', async () => {
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                callback({ data: 'test' });
            });

            const result = await sendMessage({ action: 'test' });
            expect(result).toEqual({ data: 'test' });
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                { action: 'test' },
                expect.any(Function)
            );
        });

        test('rejects with lastError when present', async () => {
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                chrome.runtime.lastError = { message: 'Connection failed' };
                callback(undefined);
            });

            await expect(sendMessage({ action: 'fail' }))
                .rejects.toEqual({ message: 'Connection failed' });
        });

        test('resolves with undefined response', async () => {
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                callback(undefined);
            });

            const result = await sendMessage({ action: 'void' });
            expect(result).toBeUndefined();
        });

        test('passes the complete message object', async () => {
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                callback({});
            });

            await sendMessage({ action: 'getEvents', date: '2025-03-15' });
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                { action: 'getEvents', date: '2025-03-15' },
                expect.any(Function)
            );
        });
    });
});
