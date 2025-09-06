import { gapi } from "gapi-script";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

export const initGoogleClient = (callback: () => void) => {
  gapi.load("client:auth2", () => {
    gapi.client.init({
      apiKey: GOOGLE_API_KEY,
      clientId: GOOGLE_CLIENT_ID,
      discoveryDocs: DISCOVERY_DOCS,
      scope: SCOPES,
    });
    gapi.auth2.getAuthInstance().isSignedIn.listen(callback);
    callback();
  });
};

export const signInToGoogle = () => {
  return gapi.auth2.getAuthInstance().signIn();
};

export const signOutFromGoogle = () => {
  return gapi.auth2.getAuthInstance().signOut();
};

export const fetchDriveFiles = async () => {
  const response = await gapi.client.drive.files.list({
    pageSize: 20,
    fields: "files(id, name, mimeType, webViewLink, createdTime, modifiedTime, size)",
    orderBy: "modifiedTime desc",
  });
  return response.result.files;
};
