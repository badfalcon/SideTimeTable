import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import chromeMock from './mocks/chrome-mock';

global.chrome = chromeMock;

describe('Options Page', () => {
  let options;
  
  beforeEach(() => {
    jest.resetAllMocks();
    
    jest.resetModules();
    
    document.body.innerHTML = `
      <div class="container mt-4">
        <h1 class="mb-4" data-localize="__MSG_optionsTitle__">SideTimeTable 設定</h1>
        <div class="card mb-4">
          <div class="card-body">
            <h2 class="card-title" data-localize="__MSG_integration__">連携</h2>
            <p class="card-text" data-localize="__MSG_googleIntegration__">Google カレンダーと連携して予定を表示します。</p>
            <div class="d-flex align-items-center">
              <button class="gsi-material-button" id="google-integration-button">
                <div class="gsi-material-button-state"></div>
                <div class="gsi-material-button-content-wrapper">
                  <div class="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"
                         xmlns:xlink="http://www.w3.org/1999/xlink" style="display: block;">
                      <path fill="#EA4335"
                            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4"
                            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05"
                            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853"
                            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span class="gsi-material-button-contents">Sign in with Google</span>
                  <span style="display: none;">Sign in with Google</span>
                </div>
              </button>
              <span id="google-integration-status" class="ms-2" data-localize="__MSG_notIntegrated__">未連携</span>
            </div>
          </div>
        </div>
        <div class="card mb-4">
          <div class="card-body">
            <h2 class="card-title" data-localize="__MSG_timeSettings__">時間設定</h2>
            <form>
              <div class="mb-3">
                <label for="open-time" class="form-label" data-localize="__MSG_workHours__">就業時間:</label>
                <div class="input-group">
                  <input type="time" list="time-list" class="form-control" id="open-time" step="900" value="09:00">
                  <span class="input-group-text" data-localize="__MSG_to__">～</span>
                  <input type="time" list="time-list" class="form-control" id="close-time" step="900" value="18:00">
                </div>
              </div>
              <div class="mb-3">
                <label for="break-time-fixed" class="form-label" data-localize="__MSG_breakTime__">休憩時間:</label>
                <div class="form-check mb-2">
                  <input type="checkbox" class="form-check-input" id="break-time-fixed">
                  <label class="form-check-label" for="break-time-fixed" data-localize="__MSG_fixed__">固定</label>
                </div>
                <div class="input-group">
                  <input type="time" list="time-list" class="form-control" id="break-time-start" step="900" value="12:00" disabled="disabled">
                  <span class="input-group-text" data-localize="__MSG_to__">～</span>
                  <input type="time" list="time-list" class="form-control" id="break-time-end" step="900" value="13:00" disabled="disabled">
                </div>
              </div>
            </form>
          </div>
        </div>
        <div class="card mb-4">
          <div class="card-body">
            <h2 class="card-title" data-localize="__MSG_colorSettings__">色設定</h2>
            <form>
              <div class="row">
                <div class="col-md-4 mb-3">
                  <label for="work-time-color" class="form-label" data-localize="__MSG_workTimeColor__">業務時間:</label>
                  <input type="color" class="form-control form-control-color" id="work-time-color" value="#d4d4d4">
                </div>
                <div class="col-md-4 mb-3">
                  <label for="local-event-color" class="form-label" data-localize="__MSG_localEventColor__">ローカルイベント:</label>
                  <input type="color" class="form-control form-control-color" id="local-event-color" value="#bbf2b1">
                </div>
                <div class="col-md-4 mb-3">
                  <label for="google-event-color" class="form-label" data-localize="__MSG_googleEventColor__">Google イベント:</label>
                  <input type="color" class="form-control form-control-color" id="google-event-color" value="#c3d6f7">
                </div>
              </div>
            </form>
          </div>
        </div>
        <button id="saveButton" class="btn btn-primary" data-localize="__MSG_save__">保存</button>
        <datalist id="time-list"></datalist>
      </div>
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
      if (message.action === 'checkAuth') {
        callback({
          success: true,
          authenticated: true
        });
      }
    });
    
    options = require('../src/options/options');
  });
  
  test('should load settings from chrome.storage on initialization', () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    expect(chrome.storage.sync.get).toHaveBeenCalled();
    
    const openTimeInput = document.querySelector('#open-time');
    const closeTimeInput = document.querySelector('#close-time');
    const breakTimeFixedCheckbox = document.querySelector('#break-time-fixed');
    const breakTimeStartInput = document.querySelector('#break-time-start');
    const breakTimeEndInput = document.querySelector('#break-time-end');
    const workTimeColorInput = document.querySelector('#work-time-color');
    const localEventColorInput = document.querySelector('#local-event-color');
    const googleEventColorInput = document.querySelector('#google-event-color');
    
    expect(openTimeInput.value).toBe('09:00');
    expect(closeTimeInput.value).toBe('18:00');
    expect(breakTimeFixedCheckbox.checked).toBe(false);
    expect(breakTimeStartInput.value).toBe('12:00');
    expect(breakTimeEndInput.value).toBe('13:00');
    expect(workTimeColorInput.value).toBe('#d4d4d4');
    expect(localEventColorInput.value).toBe('#bbf2b1');
    expect(googleEventColorInput.value).toBe('#c3d6f7');
  });
  
  test('should save settings when save button is clicked', () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    const openTimeInput = document.querySelector('#open-time');
    const closeTimeInput = document.querySelector('#close-time');
    const workTimeColorInput = document.querySelector('#work-time-color');
    
    openTimeInput.value = '08:00';
    closeTimeInput.value = '17:00';
    workTimeColorInput.value = '#e0e0e0';
    
    const saveButton = document.querySelector('#saveButton');
    saveButton.click();
    
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({
        openTime: '08:00',
        closeTime: '17:00',
        workTimeColor: '#e0e0e0'
      }),
      expect.any(Function)
    );
  });
  
  test('should enable break time inputs when break time fixed checkbox is checked', () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    const breakTimeFixedCheckbox = document.querySelector('#break-time-fixed');
    const breakTimeStartInput = document.querySelector('#break-time-start');
    const breakTimeEndInput = document.querySelector('#break-time-end');
    
    expect(breakTimeStartInput.disabled).toBe(true);
    expect(breakTimeEndInput.disabled).toBe(true);
    
    breakTimeFixedCheckbox.checked = true;
    breakTimeFixedCheckbox.dispatchEvent(new Event('change'));
    
    expect(breakTimeStartInput.disabled).toBe(false);
    expect(breakTimeEndInput.disabled).toBe(false);
    
    breakTimeFixedCheckbox.checked = false;
    breakTimeFixedCheckbox.dispatchEvent(new Event('change'));
    
    expect(breakTimeStartInput.disabled).toBe(true);
    expect(breakTimeEndInput.disabled).toBe(true);
  });
  
  test('should check Google auth status on initialization', () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'checkAuth' }),
      expect.any(Function)
    );
    
    const integrationStatus = document.querySelector('#google-integration-status');
    expect(integrationStatus.textContent).not.toBe('未連携');
  });
  
  test('should handle Google auth button click', () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    const googleIntegrationButton = document.querySelector('#google-integration-button');
    googleIntegrationButton.click();
    
    expect(chrome.identity.getAuthToken).toHaveBeenCalled();
  });
});
