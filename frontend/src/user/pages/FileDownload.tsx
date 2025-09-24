import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const FileDownload: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [message, setMessage] = useState<string>('Preparing your download...');

    useEffect(() => {
        const downloadFile = async () => {
            const token = searchParams.get('access');

            if (!token) {
                setError('No access token provided. Please check the link.');
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/backend/download_file.php?token=${token}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to initiate download. The link may be invalid or expired.');
                }

                const data = await response.json();

                if (data.success && data.presigned_url) {
                    setMessage('Your download will begin shortly...');
                    setLoading(false);
                    window.location.href = data.presigned_url;
                } else {
                    throw new Error(data.error || 'Invalid response from server.');
                }

            } catch (err) {
                const message = err instanceof Error ? err.message : 'An unknown error occurred.';
                setError(message);
                setLoading(false);
            }
        };

        const timer = setTimeout(() => {
            downloadFile();
        }, 1500);

        return () => clearTimeout(timer);
    }, [searchParams]);

    return (
        <>
            <div className="file-download-container">
                <div className="file-download-box">
                    {loading && (
                        <div className="loading-section">
                            <div className="spinner"></div>
                            <h2>Loading...</h2>
                            <p>{message}</p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="error-section">
                            <div className="error-icon">
                                <i className="fas fa-exclamation-triangle"></i>
                            </div>
                            <h2>Download Failed</h2>
                            <p className="error-message">{error}</p>
                            <a href="/" className="home-link">Go to Homepage</a>
                        </div>
                    )}

                    {!loading && !error && (
                        <div className="success-section">
                            <div className="success-icon">
                                <i className="fas fa-check-circle"></i>
                            </div>
                            <h2>Success!</h2>
                            <p>{message}</p>
                            <p>If your download does not start automatically, please refresh the page.</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                *{margin:0;padding:0;box-sizing:border-box;}

                body{
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: system-ui, calibri, sans-serif;
                }

                .file-download-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    background-color: #f4f7f6;
                }

                .file-download-box {
                    text-align: center;
                    padding: 40px;
                    background-color: #ffffff;
                    box-shadow: 0px 0px 20px rgb(117 117 117 / 48%);
                    border-radius: 10px;
                    width: 500px;
                }

                /* Loading Section */
                .loading-section .spinner {
                    border: 6px solid #f3f3f3;
                    border-top: 6px solid #3498db;
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .loading-section h2 {
                    color: #333;
                    font-size: 24px;
                    margin-bottom: 10px;
                }

                .loading-section p {
                    color: #666;
                    font-size: 16px;
                }

                

                .home-link {
                    padding: 15px 25px;
                    background-color: #3498db;
                    color: #ffffff;
                    text-decoration: none;
                    display: flex;
                    text-align: center;
                    justify-content: center;
                    line-height: 1;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 600;
                    transition: background-color 0.3s ease;
                }

                .home-link:hover {
                    background-color: #2980b9;
                }

                /* Error/Success Section */
                .error-section .error-icon,
                .error-section h2 {
                    color: #e74c3c;
                }

                .success-section .success-icon,
                .success-section h2 {
                    color: #2ecc71;
                }

                .error-section .error-icon,
                .success-section .success-icon{
                    font-size: 50px;
                }

                .error-section h2,
                .success-section h2 {
                    font-size: 24px;
                }

                .error-section .error-message {color: #555;}
                .success-section p {color: #666;}

                .error-section .error-message,
                .success-section p {
                    font-size: 16px;
                    line-height: 1.5;
                    margin: 5px 0 20px 0;
                    font-weight: 500;
                }
            `}</style>
        </>
    );
};

export default FileDownload;