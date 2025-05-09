import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import chromeMock from './mocks/chrome-mock';

global.chrome = chromeMock;

describe('Side Panel', () => {
  let sidePanel;
  
  beforeEach(() => {
    jest.resetAllMocks();
    
    jest.resetModules();
    
    document.body.innerHTML = `
      <div id="sideTimeTableHeaderWrapper">
        <div id="sideTimeTableHeader">
          <i class="fas fa-plus-circle add-local-event-icon" id="addLocalEventButton" title="__MSG_addEvent__"></i>
          <h1>yyyyMMDDddd</h1>
          <i class="fas fa-cog settings-icon" id="settingsIcon" title="__MSG_settings__"></i>
        </div>
      </div>
      <div class="side-time-table" id="sideTimeTable">
        <div class="side-time-table-base" id="sideTimeTableBase"></div>
        <div class="side-time-table-events" id="sideTimeTableEvents">
          <div class="side-time-table-events-local" id="sideTimeTableEventsLocal"></div>
          <div class="side-time-table-events-google" id="sideTimeTableEventsGoogle"></div>
        </div>
        <div class="current-time-line" id="currentTimeLine"></div>
      </div>
      <div id="localEventDialog" class="modal" hidden>
        <div class="modal-content">
          <span class="close" id="closeDialog">&times;</span>
          <h2 data-localize="__MSG_eventDialogTitle__">予定を作成/編集</h2>
          <label for="eventTitle" data-localize="__MSG_eventTitle__">タイトル:</label>
          <input type="text" id="eventTitle" required>
          <label for="eventStartTime" data-localize="__MSG_startTime__">開始時刻:</label>
          <input type="time" list="time-list" id="eventStartTime" required>
          <label for="eventEndTime" data-localize="__MSG_endTime__">終了時刻:</label>
          <input type="time" list="time-list" id="eventEndTime" required>
          <button id="saveEventButton" class="btn btn-success" data-localize="__MSG_save__">保存</button>
          <button id="deleteEventButton" class="btn btn-danger" data-localize="__MSG_delete__">削除</button>
          <button id="cancelEventButton" class="btn btn-secondary" data-localize="__MSG_cancel__">キャンセル</button>
        </div>
      </div>
      <div id="alertModal" class="modal" hidden>
        <div class="modal-content">
          <span class="close" id="closeAlertModal">&times;</span>
          <p id="alertMessage"></p>
          <button id="closeAlertButton" class="btn btn-primary">閉じる</button>
        </div>
      </div>
      <datalist id="time-list"></datalist>
    `;
    
    chrome.storage.sync.get.mockImplementation((keys, callback) => {
      callback({
        openTime: '09:00',
        closeTime: '18:00',
        breakTimeFixed: false,
        breakTimeStart: '12:00',
        breakTimeEnd: '13:00',
        workTimeColor: '#d4d4d4',
        localEventColor: '#bbf2b1',
        googleEventColor: '#c3d6f7'
      });
    });
    
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (message.action === 'getCalendarEvents') {
        callback({
          success: true,
          events: [
            {
              id: 'google-event-1',
              summary: 'Google Event 1',
              start: { dateTime: '2025-05-09T10:00:00Z' },
              end: { dateTime: '2025-05-09T11:00:00Z' }
            }
          ]
        });
      } else if (message.action === 'checkAuth') {
        callback({
          success: true,
          authenticated: true
        });
      }
    });
    
    const mockDate = new Date('2025-05-09T14:30:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    
    sidePanel = require('../src/side_panel/side_panel');
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  test('should initialize the side panel with current date', () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    const dateHeader = document.querySelector('#sideTimeTableHeader h1');
    expect(dateHeader.textContent).toContain('2025');
  });
  
  test('should load settings from chrome.storage', () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    expect(chrome.storage.sync.get).toHaveBeenCalled();
    
    const timeTableBase = document.querySelector('#sideTimeTableBase');
    expect(timeTableBase.innerHTML).toContain('09:00');
    expect(timeTableBase.innerHTML).toContain('18:00');
  });
  
  test('should fetch Google Calendar events on initialization', () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'getCalendarEvents' }),
      expect.any(Function)
    );
    
    const googleEventsContainer = document.querySelector('#sideTimeTableEventsGoogle');
    expect(googleEventsContainer.innerHTML).toContain('Google Event 1');
  });
  
  test('should open event dialog when add button is clicked', () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    const addButton = document.querySelector('#addLocalEventButton');
    addButton.click();
    
    const dialog = document.querySelector('#localEventDialog');
    expect(dialog.hidden).toBe(false);
  });
  
  test('should save local event when save button is clicked', () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    const addButton = document.querySelector('#addLocalEventButton');
    addButton.click();
    
    const titleInput = document.querySelector('#eventTitle');
    const startTimeInput = document.querySelector('#eventStartTime');
    const endTimeInput = document.querySelector('#eventEndTime');
    
    titleInput.value = 'Test Event';
    startTimeInput.value = '10:00';
    endTimeInput.value = '11:00';
    
    const saveButton = document.querySelector('#saveEventButton');
    saveButton.click();
    
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({
        localEvents: expect.arrayContaining([
          expect.objectContaining({
            title: 'Test Event',
            startTime: '10:00',
            endTime: '11:00'
          })
        ])
      }),
      expect.any(Function)
    );
    
    const dialog = document.querySelector('#localEventDialog');
    expect(dialog.hidden).toBe(true);
    
    const localEventsContainer = document.querySelector('#sideTimeTableEventsLocal');
    expect(localEventsContainer.innerHTML).toContain('Test Event');
  });
  
  test('should update current time line position', () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    const currentTimeLine = document.querySelector('#currentTimeLine');
    
    const style = currentTimeLine.getAttribute('style');
    expect(style).toContain('top:');
    
    expect(currentTimeLine.style.display).not.toBe('none');
  });
});
