import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const FileDownload: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState<string>('Validating your download link...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const downloadFile = async () => {
            const token = searchParams.get('access');

            if (!token) {
                setError('No access token provided. Please check the link and try again.');
                setStatus('error');
                return;
            }

            try {
                setMessage('Preparing your file, please wait...');
                const response = await fetch(`${API_BASE_URL}/download_file.php?token=${token}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to initiate download. The link may be invalid or expired.');
                }

                const data = await response.json();

                if (data.success && data.presigned_url) {
                    setMessage('Redirecting you to a secure download link...');
                    setStatus('success');
                    // Redirect to the presigned URL to start the download
                    window.location.href = data.presigned_url;
                } else {
                    throw new Error(data.error || 'The server returned an invalid response. Please try again later.');
                }

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred. Please contact support.';
                setError(errorMessage);
                setStatus('error');
            }
        };

        // Delay to allow the user to read the initial message
        const timer = setTimeout(downloadFile, 2000);

        return () => clearTimeout(timer);
    }, [searchParams]);

    const StatusIcon: React.FC<{ status: 'loading' | 'success' | 'error' }> = ({ status }) => {
        switch (status) {
            case 'loading':
                return (
                    <svg className="spinner" viewBox="0 0 50 50">
                        <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                    </svg>
                );
            case 'success':
                return (
                    <div className="success-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                );
            case 'error':
                return (
                    <div className="error-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                );
            default:
                return null;
        }
    };

    const getStatusInfo = () => {
        switch (status) {
            case 'loading':
                return { title: 'Preparing Download', color: '#3498db' };
            case 'success':
                return { title: 'Success!', color: '#2ecc71' };
            case 'error':
                return { title: 'Download Failed', color: '#e74c3c' };
            default:
                return { title: 'Status', color: '#333' };
        }
    };

    const { title, color } = getStatusInfo();

    return (
        <>
            <div className="file-download-container">
                <div className="file-download-card">
                    <div className="card-header" style={{ backgroundColor: color }}>
                        <StatusIcon status={status} />
                    </div>
                    <div className="card-body">
                        <h2 className="card-title" style={{ color }}>{title}</h2>
                        <p className="card-message">
                            {status === 'error' ? error : message}
                        </p>
                        {status === 'success' && (
                            <p className="card-sub-message">
                                Your download should start automatically. If it doesn't, please try refreshing the page.
                            </p>
                        )}
                        {status === 'error' && (
                            <a href="/" className="home-link">
                                Return to Homepage
                            </a>
                        )}
                    </div>
                </div>
                <footer className="page-footer">
                    <p>&copy; {new Date().getFullYear()} Research Hub. All Rights Reserved.</p>
                </footer>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');

                body, html {
                    margin: 0;
                    padding: 0;
                    height: 100%;
                    font-family: 'Poppins', sans-serif;
                    background-color: #f0f2f5;
                }

                .file-download-container {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    padding: 20px;
                }

                .file-download-card {
                    background-color: #ffffff;
                    border-radius: 16px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                    width: 100%;
                    max-width: 450px;
                    text-align: center;
                    overflow: hidden;
                    transform: translateY(-20px);
                    animation: floatUp 0.5s ease-out forwards;
                }
                
                @keyframes floatUp {
                    to {
                        transform: translateY(0);
                    }
                }

                .card-header {
                    padding: 40px 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    transition: background-color 0.3s ease;
                }

                .spinner {
                    animation: rotate 2s linear infinite;
                    width: 60px;
                    height: 60px;
                }
                .spinner .path {
                    stroke: #fff;
                    stroke-linecap: round;
                    animation: dash 1.5s ease-in-out infinite;
                }
                @keyframes rotate { 100% { transform: rotate(360deg); } }
                @keyframes dash {
                    0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
                    50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
                    100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
                }

                .success-icon svg, .error-icon svg {
                    width: 60px;
                    height: 60px;
                    stroke: #fff;
                }

                .card-body {
                    padding: 30px;
                }

                .card-title {
                    font-size: 28px;
                    font-weight: 600;
                    margin: 0 0 15px;
                    transition: color 0.3s ease;
                }

                .card-message {
                    font-size: 16px;
                    color: #555;
                    line-height: 1.6;
                    margin-bottom: 10px;
                }
                
                .card-sub-message {
                    font-size: 14px;
                    color: #888;
                }

                .home-link {
                    display: inline-block;
                    margin-top: 25px;
                    padding: 12px 30px;
                    background-color: #3498db;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    transition: background-color 0.3s ease, transform 0.2s ease;
                }

                .home-link:hover {
                    background-color: #2980b9;
                    transform: translateY(-2px);
                }

                .page-footer {
                    position: absolute;
                    bottom: 20px;
                    color: #aaa;
                    font-size: 14px;
                }
            `}</style>
        </>
    );
};

export default FileDownload;