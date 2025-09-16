// src/pages/Admin.tsx
import React, { useEffect, useState, useRef } from "react";
import Header from "./components/Header";
import { useCUD } from "../hooks/useCUD";
import { AdminToast } from "../hooks/Toast"; // Import your Toast component

// 👇 DECLARE TYPES — NO MORE 'any'
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token: string }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
    gapi: {
      load: (feature: string, callback: () => void) => void;
      client: {
        init: () => Promise<void>;
        load: (api: string, version: string) => Promise<void>;
        setToken: (token: { access_token: string }) => void;
        drive: {
          files: {
            list: (params: {
              pageSize: number;
              fields: string;
            }) => Promise<{
              result: {
                files: DriveFile[];
              };
            }>;
          };
        };
      };
    };
  }
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface UserProfile {
  name: string;
  email: string;
  picture?: string;
}

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export default function Admin() {
  const { execute, loading, error, success } = useCUD();
  const [tokenClient, setTokenClient] = useState<{
    requestAccessToken: (options?: { prompt?: string }) => void;
  } | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [showDriveContent, setShowDriveContent] = useState(false);
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);

  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  // 👇 HELPER TO SET TOKEN ON GAPI CLIENT
  const setGapiToken = (token: string) => {
    if (window.gapi?.client) {
      window.gapi.client.setToken({
        access_token: token,
      });
    } else {
      console.warn("gapi.client not ready yet");
    }
  };

  // 👇 Helper function to show toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // 👇 LOAD GAPI + GIS
  useEffect(() => {
    const loadGapi = () => {
      window.gapi.load("client", async () => {
        await window.gapi.client.init({});
        await window.gapi.client.load("drive", "v3");
        setIsGapiReady(true);
      });
    };

    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = loadGapi;
    document.body.appendChild(script);

    const gisScript = document.createElement("script");
    gisScript.src = "https://accounts.google.com/gsi/client";
    gisScript.onload = () => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
        callback: (tokenResponse: { access_token: string }) => {
          const token = tokenResponse.access_token;
          setAccessToken(token);
          setGapiToken(token);

          // Fetch user profile
          fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => res.json())
            .then((profile: UserProfile) => {
              setUserProfile(profile);
              sessionStorage.setItem("drive_access_token", token);
              sessionStorage.setItem("user_profile", JSON.stringify(profile));
            })
            .catch(console.warn);

          // 👇 WAIT FOR GAPI BEFORE LISTING FILES
          const waitForGapi = () => {
            if (isGapiReady) {
              listFiles(token);
            } else {
              setTimeout(waitForGapi, 100);
            }
          };
          waitForGapi();
        },
      });
      setTokenClient(client);
    };
    document.body.appendChild(gisScript);

    return () => {
      document.body.removeChild(script);
      document.body.removeChild(gisScript);
    };
  }, [isGapiReady]);

  // 👇 RESTORE ON RELOAD
  useEffect(() => {
    const savedToken = sessionStorage.getItem("drive_access_token");
    const savedProfile = sessionStorage.getItem("user_profile");

    if (savedToken && savedProfile) {
      setAccessToken(savedToken);
      setUserProfile(JSON.parse(savedProfile));
      setGapiToken(savedToken);

      // 👇 WAIT FOR GAPI BEFORE LISTING FILES
      const waitForGapi = () => {
        if (isGapiReady) {
          listFiles(savedToken);
        } else {
          setTimeout(waitForGapi, 100);
        }
      };
      waitForGapi();
    }
  }, [isGapiReady]);

  // 👇 LIST FILES — WAITS FOR GAPI
  const listFiles = async (token: string) => {
    if (!isGapiReady) {
      console.warn("gapi.client not ready yet — retrying in 100ms");
      setTimeout(() => listFiles(token), 100);
      return;
    }

    try {
      const res = await window.gapi.client.drive.files.list({
        pageSize: 100,
        fields: "files(id, name, mimeType, modifiedTime, size, webViewLink)",
      });
      setFiles(res.result.files || []);
    } catch (err) {
      console.error("Error listing files:", err);
    }
  };

  const handleLogin = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    }
  };

  const handleLogout = () => {
    setAccessToken(null);
    setUserProfile(null);
    setFiles([]);
    setSelectedFile(null);
    setShowDriveContent(false);

    sessionStorage.removeItem("drive_access_token");
    sessionStorage.removeItem("user_profile");

    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
  };

  // 👇 INACTIVITY TIMER
  useEffect(() => {
    if (!accessToken) return;

    const resetTimer = () => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
      inactivityTimer.current = setTimeout(() => {
        handleLogout();
        showToast("You were logged out due to inactivity.", 'error');
      }, INACTIVITY_TIMEOUT);
    };

    const events = ["mousemove", "keypress", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [accessToken]);

  const handleSelectFile = (file: DriveFile) => {
    setSelectedFile(file);

    (document.getElementById("fileDriveId") as HTMLInputElement).value = file.id;
    (document.getElementById("fileName") as HTMLInputElement).value = file.name;
    (document.getElementById("fileType") as HTMLInputElement).value = formatFileType(file);
    (document.getElementById("fileSize") as HTMLInputElement).value =
      file.size ? `${(Number(file.size) / (1024 * 1024)).toFixed(2)} MB` : "Unknown";
    (document.getElementById("fileDate") as HTMLInputElement).value = file.modifiedTime || "";
  };

  // ✅ Updated handleSubmit to use toast notifications
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    // Get values from form
    const drive_file_id = formData.get('fileDriveId') as string;
    const file_name = formData.get('fileName') as string;
    const file_type = formData.get('fileType') as string;
    const file_size = formData.get('fileSize') as string;
    const modified_date = formData.get('fileDate') as string;
    const description = formData.get('fileDescription') as string;
    const category = formData.get('fileCategory') as string;
    const level = formData.get('fileLevel') as string;
    const price_usd = parseFloat(formData.get('filePrice') as string) || 0;
    const price_ngn = parseFloat(formData.get('filePriceNGN') as string) || 0;

    // Validate required fields
    if (!drive_file_id || !file_name || !category || !level) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    // Validate category and level
    const valid_categories = ['research', 'thesis', 'dissertation', 'assignment', 'project', 'presentation', 'other'];
    const valid_levels = ['undergraduate', 'postgraduate'];
    
    if (!valid_categories.includes(category)) {
      showToast('Invalid category selected', 'error');
      return;
    }
    
    if (!valid_levels.includes(level)) {
      showToast('Invalid level selected', 'error');
      return;
    }

    // Normalize prices
    const price_usd_normalized = price_usd < 0 ? 0 : price_usd;
    const price_ngn_normalized = price_ngn < 0 ? 0 : price_ngn;

    // Build price JSON
    const price = {
      usd: parseFloat(price_usd_normalized.toFixed(2)),
      ngn: parseFloat(price_ngn_normalized.toFixed(2))
    };

    // Convert date format
    const modified_datetime = new Date(modified_date).toISOString().slice(0, 19).replace('T', ' ');

    try {
      // ✅ Use useCUD hook to save/update file
      const result = await execute(
        { table: 'academic_files', action: 'insert' },
        {
          drive_file_id,
          file_name,
          file_type,
          file_size,
          modified_date: modified_datetime,
          description,
          category,
          level,
          price
        }
      );

      if (result.success) {
        showToast("File details saved successfully!", 'success');
        form.reset();
        setSelectedFile(null);
      } else {
        showToast(`Error saving file details: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error("Error saving file details:", err.message);
        showToast(`Error saving file details: ${err.message}`, 'error');
      }
    }
  };

  const formatFileType = (file: DriveFile): string => {
    const mimeToLabel: Record<string, string> = {
      "application/pdf": "PDF Document",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
      "application/msword": "Word Document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
      "application/vnd.ms-excel": "Excel Spreadsheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint Presentation",
      "application/vnd.ms-powerpoint": "PowerPoint Presentation",
      "text/plain": "Text File",
      "text/csv": "CSV File",
      "image/jpeg": "JPEG Image",
      "image/png": "PNG Image",
      "image/gif": "GIF Image",
      "image/webp": "WEBP Image",
      "image/svg+xml": "SVG Image",
      "application/zip": "ZIP Archive",
      "application/x-rar-compressed": "RAR Archive",
      "application/json": "JSON File",
      "application/xml": "XML File",
      "text/html": "HTML File",
      "text/css": "CSS File",
      "application/javascript": "JavaScript File",
      "application/x-python-code": "Python File",
      "text/x-python": "Python File",
    };

    if (mimeToLabel[file.mimeType]) {
      return mimeToLabel[file.mimeType];
    }

    const lastDotIndex = file.name.lastIndexOf(".");
    if (lastDotIndex > -1) {
      const extension = file.name.slice(lastDotIndex);
      return `${extension} file`;
    }

    return "Unknown file type";
  };

  return (
    <div className="admin-container">
      <Header/>

      {/* ✅ Add Toast Container */}
      {toast && (
        <div className="toast-container">
          <AdminToast
            message={toast.message}
            type={toast.type}
            duration={3000}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      <div className="drive-content">
        {!userProfile ? (
          <div className="auth-prompt">
            <div className="auth-card">
              <div className="auth-icon">
                <i className="fab fa-google-drive"></i>
              </div>
              <h2>Connect to Google Drive</h2>
              <p>Sign in to access your documents and automatically fill file details</p>
              <button onClick={handleLogin} className="btn-auth">
                <i className="fab fa-google"></i> Sign in with Google
              </button>
            </div>
          </div>
        ) : !showDriveContent ? (
          <div className="auth-prompt">
            <div className="auth-card">
              <div className="user-profile">
                {userProfile.picture && (
                  <img
                    src={userProfile.picture}
                    alt={userProfile.name}
                    className="user-avatar"
                  />
                )}
                <h3>Welcome, {userProfile.name}</h3>
                <p>{userProfile.email}</p>
              </div>
              <button
                onClick={() => setShowDriveContent(true)}
                className="btn-view-files"
              >
                <i className="fas fa-folder-open"></i> View Your Drive Files
              </button>

              <button onClick={handleLogout} className="btn-logout">
                <i className="fas fa-sign-out-alt"></i> Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="content-grid">
            {/* File Selection Section */}
            <div className="file-selection-section">
              <div className="section-header">
                <h2>
                  <i className="fab fa-google-drive"></i> Your Drive Files
                </h2>
                <div className="header-actions">
                  <div className="search-box">
                    <i className="fas fa-search"></i>
                    <input type="text" placeholder="Search files..." />
                  </div>
                  <button
                    className="btn-icon"
                    onClick={() => {
                      if (accessToken) {
                        setGapiToken(accessToken);
                        // 👇 WAIT FOR GAPI
                        const waitForGapi = () => {
                          if (isGapiReady) {
                            listFiles(accessToken);
                          } else {
                            setTimeout(waitForGapi, 100);
                          }
                        };
                        waitForGapi();
                      }
                    }}
                  >
                    <i className="fas fa-sync-alt"></i>
                  </button>
                </div>
              </div>

              <div className="drive-file-list">
                {files.map((file) => (
                  <div key={file.id} className="drive-file">
                    <div className="file-icon">
                      <i className="fas fa-file"></i>
                    </div>
                    <div className="file-details">
                      <h3>{file.name}</h3>
                      <div className="file-meta">
                        <span>
                          <i className="fas fa-calendar"></i>{" "}
                          {file.modifiedTime
                            ? new Date(file.modifiedTime).toLocaleDateString()
                            : "N/A"}
                        </span>
                        <span>
                          <i className="fas fa-weight-hanging"></i>{" "}
                          {file.size
                            ? `${(Number(file.size) / (1024 * 1024)).toFixed(2)} MB`
                            : "Unknown"}
                        </span>
                        <span>
                          <i className="fas fa-file"></i> {formatFileType(file)}
                        </span>
                      </div>
                    </div>
                    <div className="file-actions">
                      <button className="btn-select-file" onClick={() => handleSelectFile(file)}>
                        <i className="fas fa-check"></i> Select
                      </button>
                      {file.webViewLink && (
                        <a href={file.webViewLink} target="_blank" className="btn-view">
                          <i className="fas fa-external-link-alt"></i>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* File Details Form Section */}
            <div className="file-details-section">
              <div className="section-header">
                <h2>
                  <i className="fas fa-edit"></i> File Details
                </h2>
                {selectedFile && (
                  <div className="selected-file-info">
                    <span className="selected-label">Selected:</span>
                    <span className="selected-name">{selectedFile.name}</span>
                  </div>
                )}
              </div>

              <form className="file-details-form" onSubmit={handleSubmit}>
                <input type="hidden" id="fileDriveId" name="fileDriveId" />
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="fileName">
                      <i className="fas fa-file"></i> File Name
                    </label>
                    <input type="text" id="fileName" name="fileName" required readOnly />
                  </div>

                  <div className="form-group">
                    <label htmlFor="fileType">
                      <i className="fas fa-tag"></i> File Type
                    </label>
                    <input type="text" id="fileType" name="fileType" readOnly />
                  </div>

                  <div className="form-group">
                    <label htmlFor="fileSize">
                      <i className="fas fa-weight-hanging"></i> File Size
                    </label>
                    <input type="text" id="fileSize" name="fileSize" readOnly />
                  </div>

                  <div className="form-group">
                    <label htmlFor="fileDate">
                      <i className="fas fa-calendar"></i> Modified Date
                    </label>
                    <input type="text" id="fileDate" name="fileDate" readOnly />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="fileDescription">
                      <i className="fas fa-align-left"></i> Description
                    </label>
                    <textarea id="fileDescription" name="fileDescription" rows={3}></textarea>
                  </div>

                  <div className="form-group">
                    <label htmlFor="fileCategory">
                      <i className="fas fa-folder"></i> Category
                    </label>
                    <select id="fileCategory" name="fileCategory" required>
                      <option value="">Select category</option>
                      <option value="research">Research Paper</option>
                      <option value="thesis">Thesis</option>
                      <option value="dissertation">Dissertation</option>
                      <option value="assignment">Assignment</option>
                      <option value="project">Project</option>
                      <option value="presentation">Presentation</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="fileLevel">
                      <i className="fas fa-graduation-cap"></i> Level
                    </label>
                    <select id="fileLevel" name="fileLevel" required>
                      <option value="">Select level</option>
                      <option value="undergraduate">Undergraduate</option>
                      <option value="postgraduate">Postgraduate</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="filePrice">
                      <i className="fas fa-dollar-sign"></i> Price (USD)
                    </label>
                    <div className="price-input">
                      <span>$</span>
                      <input
                        type="number"
                        id="filePrice"
                        name="filePrice"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="filePriceNGN">
                      <i className="fas fa-naira-sign"></i> Price (NGN)
                    </label>
                    <div className="price-input">
                      <span>₦</span>
                      <input
                        type="number"
                        id="filePriceNGN"
                        name="filePriceNGN"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                    ) : (
                      <><i className="fas fa-save"></i> Save Details</>
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setSelectedFile(null)}
                    disabled={loading}
                  >
                    <i className="fas fa-eraser"></i> Clear Form
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}