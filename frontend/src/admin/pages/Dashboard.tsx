import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import DriveFileList from '../components/DriveFileList';
import FileDetailsForm from '../components/FileDetailsForm';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    size: string;
    modifiedTime: string;
    webViewLink: string;
}

interface SelectedFile extends DriveFile {
    description: string;
    category: string;
    level: string;
    price: number;
}

const AdminDashboard = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authUrl, setAuthUrl] = useState<string | null>(null);
    const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<Partial<SelectedFile> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAdminData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/drive_api.php?action=get_files`);
            const data = response.data;

            if (data.auth_url) {
                setIsLoggedIn(false);
                setAuthUrl(data.auth_url);
                setError(data.error || 'Authentication required.');
            } else if (data.files) {
                setIsLoggedIn(true);
                setDriveFiles(data.files);
                setError(null);
            } else {
                throw new Error(data.error || 'An unexpected error occurred.');
            }
        } catch (err: any) {
            setError(err.message);
            setIsLoggedIn(false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdminData();
    }, [fetchAdminData]);

    const handleFileSelect = (file: DriveFile) => {
        setSelectedFile({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
            modifiedTime: file.modifiedTime,
            webViewLink: file.webViewLink,
        });
        toast.success(`Selected: ${file.name}`);
    };

    const handleFormClear = () => {
        setSelectedFile(null);
        toast.info('Form cleared');
    };

    const handleFormSave = async (formData: Omit<SelectedFile, 'id' | 'webViewLink'>) => {
        if (!selectedFile?.id) {
            toast.error('No file selected!');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/admin/save_file_details.php`, {
                fileDriveId: selectedFile.id,
                ...formData
            });

            if (response.data.success) {
                toast.success('File details saved successfully!');
                handleFormClear();
            } else {
                throw new Error(response.data.error || 'Failed to save details.');
            }
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="drive-content">
            {!isLoggedIn ? (
                <div className="auth-prompt">
                    <div className="auth-card">
                        <h2>Connect to Google Drive</h2>
                        <p>{error}</p>
                        {authUrl && <a href={authUrl} className="btn-auth">Sign in with Google</a>}
                    </div>
                </div>
            ) : (
                <div className="content-grid">
                    <DriveFileList files={driveFiles} onFileSelect={handleFileSelect} onRefresh={fetchAdminData} selectedFileId={selectedFile?.id || null} />
                    <FileDetailsForm selectedFile={selectedFile} onSave={handleFormSave} onClear={handleFormClear} />
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
