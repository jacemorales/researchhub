// src/pages/Admin.tsx
import React, { useEffect, useState, useRef } from "react";
import Header from "./components/Header";
import { useCUD } from "../hooks/useCUD";
import { AdminToast } from "../hooks/Toast";

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

// Local file type (mimics DriveFile for consistency)
interface LocalFile {
  id: string; // We'll generate a UUID
  name: string;
  mimeType: string;
  size: string; // in bytes
  modifiedTime: string; // ISO string
  // No webViewLink for local files
}

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

// Helper to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function Admin() {
  const { execute, loading } = useCUD();
  const [tokenClient, setTokenClient] = useState<{
    requestAccessToken: (options?: { prompt?: string }) => void;
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DriveFile | LocalFile | null>(null);
  const [showDriveContent, setShowDriveContent] = useState(false);
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Track upload mode: 'drive' or 'local'
  const [uploadMode, setUploadMode] = useState<'drive' | 'local' | null>(null);

  // ✅ NEW: Store actual File object for local uploads
  const [selectedLocalFile, setSelectedLocalFile] = useState<File | null>(null);

  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // For local file upload

  // Helper to set token on gapi client
  const setGapiToken = (token: string) => {
    if (window.gapi?.client) {
      window.gapi.client.setToken({
        access_token: token,
      });
    } else {
      console.warn("gapi.client not ready yet");
    }
  };

  // Helper to show toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // List files — waits for GAPI
  const listFiles = React.useCallback(
    async (token: string) => {
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
    },
    [isGapiReady]
  );

  // Load GAPI + GIS
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
    script.onerror = () => console.error("Failed to load Google API script");
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
    gisScript.onerror = () => console.error("Failed to load Google Identity Services script");
    document.body.appendChild(gisScript);

    return () => {
      document.body.removeChild(script);
      document.body.removeChild(gisScript);
    };
  }, [isGapiReady, listFiles]);

  // Restore on reload
  useEffect(() => {
    const savedToken = sessionStorage.getItem("drive_access_token");
    const savedProfile = sessionStorage.getItem("user_profile");

    if (savedToken && savedProfile) {
      setAccessToken(savedToken);
      setUserProfile(JSON.parse(savedProfile));
      setGapiToken(savedToken);

      const waitForGapi = () => {
        if (isGapiReady) {
          listFiles(savedToken);
        } else {
          setTimeout(waitForGapi, 100);
        }
      };
      waitForGapi();
    }
  }, [isGapiReady, listFiles]);

  // Filter files based on search term
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.mimeType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogin = () => {
    console.log("handleLogin called");
    console.log("tokenClient:", tokenClient);
    if (tokenClient) {
      console.log("Requesting access token...");
      tokenClient.requestAccessToken();
    } else {
      console.warn("tokenClient not initialized yet!");
    }
  };

  const handleLogout = () => {
    setAccessToken(null);
    setUserProfile(null);
    setFiles([]);
    setSelectedFile(null);
    setSelectedLocalFile(null);
    setShowDriveContent(false);
    setUploadMode(null);

    sessionStorage.removeItem("drive_access_token");
    sessionStorage.removeItem("user_profile");

    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
  };

  // Inactivity timer
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

  // Handle local file selection
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ✅ CRITICAL: Save actual File object for upload
    setSelectedLocalFile(file);

    const fileId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const localFile: LocalFile = {
      id: fileId,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size.toString(),
      modifiedTime: file.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString(),
    };

    setSelectedFile(localFile);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    (document.getElementById("fileDriveId") as HTMLInputElement).value = fileId;
    (document.getElementById("fileName") as HTMLInputElement).value = file.name;
    (document.getElementById("fileType") as HTMLInputElement).value = formatFileType({ ...localFile, webViewLink: undefined });
    (document.getElementById("fileSize") as HTMLInputElement).value = file.size ? formatFileSize(Number(file.size)) : "Unknown";
    (document.getElementById("fileDate") as HTMLInputElement).value = file.lastModified ? new Date(file.lastModified).toLocaleString() : new Date().toLocaleString();
  };

  const handleSelectFile = (file: DriveFile) => {
    setSelectedFile(file);

    (document.getElementById("fileDriveId") as HTMLInputElement).value = file.id;
    (document.getElementById("fileName") as HTMLInputElement).value = file.name;
    (document.getElementById("fileType") as HTMLInputElement).value = formatFileType(file);
    (document.getElementById("fileSize") as HTMLInputElement).value = formatFileSize(Number(file.size));
    (document.getElementById("fileDate") as HTMLInputElement).value = file.modifiedTime || "";
  };

  // ✅ FIXED handleSubmit — uses selectedLocalFile, not fileInputRef
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const drive_file_id = formData.get('fileDriveId') as string;
    const file_name = formData.get('fileName') as string;
    const file_type = formData.get('fileType') as string;
    const file_size = formData.get('fileSize') as string;
    const description = formData.get('fileDescription') as string;
    const category = formData.get('fileCategory') as string;
    const level = formData.get('fileLevel') as string;
    const price_usd = parseFloat(formData.get('filePrice') as string) || 0;
    const price_ngn = parseFloat(formData.get('filePriceNGN') as string) || 0;

    if (!drive_file_id || !file_name || !category || !level) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

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

    const price_usd_normalized = price_usd < 0 ? 0 : price_usd;
    const price_ngn_normalized = price_ngn < 0 ? 0 : price_ngn;

    const price = {
      usd: parseFloat(price_usd_normalized.toFixed(2)),
      ngn: parseFloat(price_ngn_normalized.toFixed(2))
    };

    // ✅ Validate using selectedLocalFile — source of truth
    if (uploadMode === 'local' && !selectedLocalFile) {
      showToast('Please select a file to upload from your device.', 'error');
      return;
    }

    try {
      interface AcademicFileInsertPayload {
        drive_file_id: string;
        file_name: string;
        file_type: string;
        file_size: string;
        description: string;
        category: string;
        level: string;
        price: { usd: number; ngn: number };
        r2_upload_status: string;
      }

      const result = await execute<AcademicFileInsertPayload, { id: string | number }>(
        { table: 'academic_files', action: 'insert' },
        {
          drive_file_id,
          file_name,
          file_type,
          file_size,
          description,
          category,
          level,
          price,
          r2_upload_status: 'pending'
        }
      );

      if (result.success) {
        showToast("File details saved successfully! Starting R2 upload...", 'success');
        
        try {
          let uploadResponse;

          if (uploadMode === 'local') {
            // ✅ USE selectedLocalFile — not fileInputRef
            if (!selectedLocalFile) {
              throw new Error('No local file selected for upload');
            }

            const uploadFormData = new FormData();
            uploadFormData.append('action', 'local_file_upload');
            uploadFormData.append('file', selectedLocalFile);
            uploadFormData.append('file_name', file_name);

            // ✅ DO NOT set Content-Type — browser handles it
            uploadResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/backend/admin/r2_uploader.php`, {
              method: 'POST',
              body: uploadFormData,
            });
          } else if (uploadMode === 'drive') {
            uploadResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/backend/admin/r2_uploader.php?action=drive_file_upload`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                drive_file_id: drive_file_id,
                file_name: file_name,
                access_token: accessToken,
              })
            });
          } else {
            throw new Error('Unknown upload mode');
          }

          const uploadResult = await uploadResponse.json();
          
          if (uploadResult.success) {
            await execute(
              { table: 'academic_files', action: 'update' },
              {
                id: result.inserted_id || (result as { inserted_id?: string | number; file_id?: string | number }).file_id,
                r2_key: uploadResult.r2_key,
                r2_url: uploadResult.public_url,
                r2_upload_status: 'success'
              }
            );
            
            showToast("File uploaded to R2 successfully!", 'success');
          } else {
            await execute(
              { table: 'academic_files', action: 'update' },
              {
                id: result.inserted_id,
                r2_upload_status: 'failed',
                r2_upload_error: uploadResult.error
              }
            );
            
            showToast(`R2 upload failed: ${uploadResult.error}`, 'error');
          }
        } catch (uploadErr) {
          console.error("R2 upload error:", uploadErr);
          showToast("R2 upload failed. File details saved but upload failed.", 'error');
        }
        
        // Reset form and selected file — preserve uploadMode
        form.reset();
        setSelectedFile(null);
        setSelectedLocalFile(null); // ✅ Clear local file state
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
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

  const formatFileType = (file: DriveFile | LocalFile): string => {
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

      {/* Toast Container */}
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
        {showDriveContent ? (
          <div className="content-grid">
            {/* File Selection Section */}
            <div className="file-selection-section">
              <div className="section-header">
                <h2>
                  {uploadMode === 'local' ? (
                    <><i className="fas fa-upload"></i> Upload File</>
                  ) : (
                    <><i className="fab fa-google-drive"></i> Your Drive Files</>
                  )}
                </h2>
                
                {uploadMode === 'drive' && (
                  <div className="header-actions">
                    <div className="search-box">
                      <i className="fas fa-search"></i>
                      <input 
                        type="text" 
                        placeholder="Search files..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn-icon"
                      onClick={() => {
                        if (accessToken) {
                          setGapiToken(accessToken);
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
                )}
              </div>

              {uploadMode === 'local' ? (
                // Local file upload UI
                <div className="drive-file-list">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLocalFileSelect}
                    hidden
                    className="hidden"
                    id="localFileInput"
                  />
                  <div 
                    onClick={() => {
                      // ✅ Reset before opening dialog
                      if (formRef.current) {
                        formRef.current.reset();
                      }
                      setSelectedFile(null);
                      setSelectedLocalFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                      document.getElementById('localFileInput')?.click();
                    }}
                    className="upload-file-from-device"
                  >
                    <div className="upload-icon">
                      <i className="fas fa-cloud-upload-alt"></i>
                    </div>
                    <h3 className="upload-title">Upload File from Device</h3>
                    <p className="upload-description">Click to select a file from your computer</p>
                  </div>
                </div>
              ) : (
                // Drive files UI
                <div className="drive-file-list">
                  {filteredFiles.length === 0 ? (
                    <div className="no-files-found">
                      <i className="fas fa-search"></i>
                      <h3>No files found</h3>
                      <p>{searchTerm ? `No files match "${searchTerm}"` : "No files available"}</p>
                    </div>
                  ) : (
                    filteredFiles.map((file) => (
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
                                ? formatFileSize(Number(file.size))
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
                    ))
                  )}
                </div>
              )}
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

              <form className="file-details-form" onSubmit={handleSubmit} ref={formRef}>
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
                    disabled={loading || (uploadMode === 'local' && !selectedLocalFile)}
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
                    onClick={() => {
                      if (formRef.current) {
                        formRef.current.reset();
                      }
                      setSelectedFile(null);
                      setSelectedLocalFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    disabled={loading}
                  >
                    <i className="fas fa-eraser"></i> Clear Form
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : !userProfile ? (
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
              <button 
                onClick={() => {
                  setUploadMode('local');
                  setShowDriveContent(true);
                }}
                className="btn-auth"
                style={{ 
                  background: 'linear-gradient(135deg, #6c757d, #5a6268)',
                  marginTop: '1rem'
                }}
              >
                <i className="fas fa-upload"></i> Upload from Device
              </button>
            </div>
          </div>
        ) : (
          <div className="auth-prompt">
            <div className="auth-card welcome-card">
              <div className="user-profile">
                {userProfile.picture && (
                  <img
                    src={userProfile.picture}
                    alt={userProfile.name}
                    className="user-avatar"
                    onError={(e) => {
                      e.currentTarget.src = '/no_img.png';
                    }}
                  />
                )}
                <h3>Welcome, {userProfile.name}</h3>
                <p>{userProfile.email}</p>
              </div>
              <div className="welcome-actions">
                <button
                  onClick={() => {
                    setUploadMode('drive');
                    setShowDriveContent(true);
                  }}
                  className="btn btn-primary"
                >
                  <i className="fab fa-google-drive"></i> View Drive Files
                </button>
                <button
                  onClick={() => {
                    setUploadMode('local');
                    setShowDriveContent(true);
                  }}
                  className="btn btn-secondary"
                >
                  <i className="fas fa-upload"></i> Upload From Device
                </button>
                <button onClick={handleLogout} className="btn btn-danger">
                  <i className="fas fa-sign-out-alt"></i> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}