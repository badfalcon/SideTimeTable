// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
    .setPanelBehavior({openPanelOnActionClick: true})
    .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");
});

function getCalendarEvents() {
    console.log("Getting calendar events");
    return new Promise((resolve, reject) => {
        console.log("Requesting auth token");
        const oauth2Manifest = chrome.runtime.getManifest().oauth2
        const clientId = oauth2Manifest.client_id
        const scopes = oauth2Manifest.scopes

        const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(chrome.identity.getRedirectURL())}&response_type=token&scope=${encodeURIComponent(scopes.join(' '))}`

        chrome.identity.launchWebAuthFlow(
            {interactive: true, url: authUrl},
            (responseUrl) => {
                const searchParams = new URL(responseUrl.replace(/#/, '?')).searchParams
                const token = searchParams.get('access_token')
                console.log("auth token", token);
                if (chrome.runtime.lastError || !token) {
                    console.error("Error getting auth token", chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                    return;
                }

                console.log("Fetching calendar events");
                fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=" + new Date(new Date().setHours(0, 0, 0)).toISOString() + "&timeMax=" + new Date(new Date().setHours(23, 59, 59)).toISOString() + "&singleEvents=true&orderBy=startTime", {
                    headers: {
                        Authorization: "Bearer " + token
                    }
                })
                    .then(response => response.json())
                    .then(data => resolve(data.items))
                    .catch(error => reject(error));
            })
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case "getEvents":
            getCalendarEvents()
                .then(events => sendResponse({events}))
                .catch(error => sendResponse({error: error.message}));
            return true; // 非同期応答を示す
        case "checkAuth":
            checkGoogleAuth()
                .then(isAuthenticated => sendResponse({isAuthenticated}))
                .catch(error => sendResponse({error: error.message}));
            return true; // 非同期応答を示す
    }
});

