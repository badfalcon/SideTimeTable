/**
 * Tests for GoogleEventContentBuilder.setMeetInfo() rendering order.
 *
 * Locks in that the non-Meet video link is rendered before the Meet link
 * when both are present, matching the notification button priority
 * (video > meet) in alarm-manager / selectNotificationUrl.
 */

function makeMockElement() {
    const children = [];
    return {
        tagName: 'DIV',
        className: '',
        style: { cssText: '' },
        href: '',
        target: '',
        textContent: '',
        children,
        innerHTML: '',
        appendChild(child) { children.push(child); return child; },
        setAttribute() {},
    };
}

beforeEach(() => {
    global.document = {
        createElement: () => makeMockElement(),
    };
    global.window.getLocalizedMessage = (key) => key;
});

afterEach(() => {
    delete global.document;
    delete global.window.getLocalizedMessage;
});

describe('GoogleEventContentBuilder.setMeetInfo render order', () => {
    test('renders non-Meet video link before Meet link when both exist', async () => {
        const { GoogleEventContentBuilder } = await import('../../src/side_panel/components/modals/google-event-content-builder.js');
        const builder = new GoogleEventContentBuilder();
        const meetElement = makeMockElement();

        builder.setMeetInfo(meetElement, {
            hangoutLink: 'https://meet.google.com/abc-defg-hij',
            description: 'Backup: https://us02web.zoom.us/j/42',
        });

        // 4 children: [videoIcon, videoLink, meetIcon, meetLink]
        expect(meetElement.children).toHaveLength(4);
        expect(meetElement.children[1].href).toBe('https://us02web.zoom.us/j/42');
        expect(meetElement.children[3].href).toBe('https://meet.google.com/abc-defg-hij');
    });

    test('renders only video link when no Meet URL', async () => {
        const { GoogleEventContentBuilder } = await import('../../src/side_panel/components/modals/google-event-content-builder.js');
        const builder = new GoogleEventContentBuilder();
        const meetElement = makeMockElement();

        builder.setMeetInfo(meetElement, {
            description: 'https://us02web.zoom.us/j/77',
        });

        expect(meetElement.children).toHaveLength(2);
        expect(meetElement.children[1].href).toBe('https://us02web.zoom.us/j/77');
    });

    test('renders only Meet link when no other video URL', async () => {
        const { GoogleEventContentBuilder } = await import('../../src/side_panel/components/modals/google-event-content-builder.js');
        const builder = new GoogleEventContentBuilder();
        const meetElement = makeMockElement();

        builder.setMeetInfo(meetElement, {
            hangoutLink: 'https://meet.google.com/abc-defg-hij',
        });

        expect(meetElement.children).toHaveLength(2);
        expect(meetElement.children[1].href).toBe('https://meet.google.com/abc-defg-hij');
    });

    test('renders nothing when no conference URL', async () => {
        const { GoogleEventContentBuilder } = await import('../../src/side_panel/components/modals/google-event-content-builder.js');
        const builder = new GoogleEventContentBuilder();
        const meetElement = makeMockElement();

        builder.setMeetInfo(meetElement, { description: 'No links here' });

        expect(meetElement.children).toHaveLength(0);
    });
});
