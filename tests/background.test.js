import chromeMock from './mocks/chrome-mock';

global.chrome = chromeMock;

describe('Background Script', () => {
  let background;
  
  beforeEach(() => {
    jest.resetAllMocks();
    
    jest.resetModules();
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'event1',
            summary: 'Test Event 1',
            start: { dateTime: '2025-05-09T10:00:00Z' },
            end: { dateTime: '2025-05-09T11:00:00Z' }
          }
        ]
      })
    });
    
    background = require('../src/background');
  });
  
  test('getCalendarEvents should fetch events from Google Calendar', async () => {
    chrome.identity.getAuthToken.mockImplementation((details, callback) => {
      callback('mock-token');
    });
    
    const message = { action: 'getCalendarEvents' };
    const sender = {};
    const sendResponse = jest.fn();
    
    const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    await messageListener(message, sender, sendResponse);
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://www.googleapis.com/calendar/v3/calendars/primary/events'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token'
        })
      })
    );
    
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      events: expect.arrayContaining([
        expect.objectContaining({
          id: 'event1',
          summary: 'Test Event 1'
        })
      ])
    });
  });
  
  test('checkAuth should return auth status', () => {
    chrome.identity.getAuthToken.mockImplementation((details, callback) => {
      callback('mock-token');
    });
    
    const message = { action: 'checkAuth' };
    const sender = {};
    const sendResponse = jest.fn();
    
    const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    messageListener(message, sender, sendResponse);
    
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      authenticated: true
    });
  });
  
  test('should handle errors when fetching events', async () => {
    chrome.identity.getAuthToken.mockImplementation((details, callback) => {
      callback('mock-token');
    });
    
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    
    const message = { action: 'getCalendarEvents' };
    const sender = {};
    const sendResponse = jest.fn();
    
    const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    await messageListener(message, sender, sendResponse);
    
    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: expect.any(String)
    });
  });
  
  test('should handle auth errors', () => {
    chrome.identity.getAuthToken.mockImplementation((details, callback) => {
      callback(undefined);
    });
    
    const message = { action: 'checkAuth' };
    const sender = {};
    const sendResponse = jest.fn();
    
    const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    messageListener(message, sender, sendResponse);
    
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      authenticated: false
    });
  });
});
