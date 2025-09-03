import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const LOCATION_API_KEY = process.env.REACT_APP_LOCATION_API_KEY;

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [userLocation, setUserLocation] = useState('Fetching...');

    useEffect(() => {
        if (isOpen) {
            const fetchLocation = async () => {
                if (!LOCATION_API_KEY) {
                    setUserLocation('API key not configured');
                    return;
                }
                try {
                    const response = await axios.get(`https://api.ipgeolocation.io/v2/ipgeo?apiKey=${LOCATION_API_KEY}`);
                    const { city, country_name } = response.data;
                    setUserLocation(`${city}, ${country_name}`);
                } catch (error) {
                    console.error('Error fetching location:', error);
                    setUserLocation('Could not fetch location');
                }
            };
            fetchLocation();
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('sending');
        setStatusMessage('Please wait while we send your message.');

        try {
            const response = await axios.post(`${API_BASE_URL}/user/processes.php`, {
                action: 'process_contact',
                ...formData
            });

            if (response.data.success) {
                setStatus('success');
                setStatusMessage(response.data.message);
                setTimeout(() => {
                    onClose();
                    setStatus('idle');
                    setFormData({ name: '', email: '', subject: '', message: '' });
                }, 3000);
            } else {
                throw new Error(response.data.error || 'Failed to send message');
            }
        } catch (error: any) {
            setStatus('error');
            setStatusMessage(error.message);
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal" id="contactModal" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <span className="close-modal" onClick={onClose}>&times;</span>
                <div className="modal-header">
                    <h2 className="modal-title">Contact Us</h2>
                    <p className="modal-subtitle">Get in touch with our support team</p>
                </div>
                <div className="modal-body">
                    {status !== 'idle' ? (
                        <div className="contact-status">
                            <h3 id="contactStatusTitle">{status.toUpperCase()}</h3>
                            <p id="contactStatusMessage">{statusMessage}</p>
                        </div>
                    ) : (
                        <form id="contactForm" onSubmit={handleSubmit}>
                            {/* Form inputs */}
                            <div className="form-group">
                                <label htmlFor="contactName">Full Name</label>
                                <input type="text" id="contactName" name="name" value={formData.name} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="contactEmail">Email Address</label>
                                <input type="email" id="contactEmail" name="email" value={formData.email} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="contactSubject">Subject</label>
                                <input type="text" id="contactSubject" name="subject" value={formData.subject} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="contactMessage">Message</label>
                                <textarea id="contactMessage" name="message" rows={5} value={formData.message} onChange={handleChange} required></textarea>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    <i className="fas fa-paper-plane"></i> Send Message
                                </button>
                            </div>
                        </form>
                    )}
                    <div className="contact-info">
                        <div className="contact-item">
                            <i className="fas fa-location-dot"></i>
                            <div><strong>Your Location:</strong> <span id="userLocation">{userLocation}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactModal;
