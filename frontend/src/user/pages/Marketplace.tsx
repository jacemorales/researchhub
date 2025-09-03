import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

// Assuming these components will be created from the .php files
// import Header from '../components/Header';
// import Footer from '../components/Footer';
// import ContactModal from '../components/ContactModal';
// import AboutModal from '../components/AboutModal';
// import BlogModal from '../components/BlogModal';
// import PurchaseModal from '../../payments/PurchaseModal';
// import PreviewModal from '../components/PreviewModal';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface AcademicFile {
    id: number;
    file_name: string;
    category: string;
    file_type: string;
    file_size: string;
    description: string;
    price: number;
    level: string;
}

const Marketplace = () => {
    const [searchParams] = useSearchParams();
    const level = searchParams.get('level') || 'undergraduate';
    const page_title = `${level.charAt(0).toUpperCase() + level.slice(1)} Resources | Research Hub`;

    const [files, setFiles] = useState<AcademicFile[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Modal States
    const [, setPreviewModalOpen] = useState(false);
    const [, setPurchaseModalOpen] = useState(false);
    const [, setSelectedFile] = useState<AcademicFile | null>(null);

    useEffect(() => {
        document.title = page_title;

        const fetchFiles = async () => {
            try {
                setLoading(true);
                // The backend endpoint needs to be created to handle this request.
                // Assuming an endpoint at /backend/user/processes.php that can filter by level.
                const response = await axios.get(`${API_BASE_URL}/user/processes.php`, {
                    params: {
                        action: 'get_files_by_level',
                        level: level
                    }
                });
                if (response.data.success) {
                    setFiles(response.data.files);
                } else {
                    setError(response.data.message || 'Failed to fetch resources.');
                }
            } catch (e) {
                console.error("Database error in marketplace:", e);
                setError('An error occurred while fetching resources.');
            } finally {
                setLoading(false);
            }
        };

        fetchFiles();
    }, [level, page_title]);

    const filteredFiles = useMemo(() => {
        return files
            .filter(file => selectedCategory === 'all' || file.category === selectedCategory)
            .filter(file => {
                const term = searchTerm.toLowerCase();
                return file.file_name.toLowerCase().includes(term) || file.description.toLowerCase().includes(term);
            });
    }, [files, searchTerm, selectedCategory]);

    const openPreviewModal = (file: AcademicFile) => {
        setSelectedFile(file);
        setPreviewModalOpen(true);
    };

    const openPurchaseModal = (file: AcademicFile) => {
        setSelectedFile(file);
        setPurchaseModalOpen(true);
    };

    return (
        <>
            {/* <Header /> */}
            <div className="marketplace-container" id="levelCards">
                <div className="breadcrumb">
                    <a href="/">Home</a>
                    <span>/</span>
                    <a href="#" className="active">{level.charAt(0).toUpperCase() + level.slice(1)} Resources</a>
                </div>

                <div className="marketplace-header">
                    <h1>{level.charAt(0).toUpperCase() + level.slice(1)} Resources</h1>
                    <div className="controls">
                        <div className="search-box">
                            <i className="fas fa-search"></i>
                            <input
                                type="text"
                                placeholder="Search resources..."
                                id="resourceSearch"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            id="resourceFilter"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            <option value="research">Research Papers</option>
                            <option value="thesis">Thesis</option>
                            <option value="dissertation">Dissertation</option>
                            <option value="assignment">Assignment</option>
                            <option value="project">Project</option>
                            <option value="presentation">Presentation</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="resources-grid">
                    {loading && <p>Loading resources...</p>}
                    {error && <p className="error-message">{error}</p>}
                    {!loading && !error && (
                        filteredFiles.length === 0 ? (
                            <div className="no-resources">
                                <i className="fas fa-folder-open"></i>
                                <h3>No resources available</h3>
                                <p>No {level} resources match your criteria. Please check back later or adjust your filters.</p>
                            </div>
                        ) : (
                            filteredFiles.map(file => (
                                <div className="resource-card" data-category={file.category} key={file.id}>
                                    <div className="resource-header">
                                        <div className="file-icon"><i className="fas fa-file"></i></div>
                                        <div className="resource-info">
                                            <h3>{file.file_name}</h3>
                                            <p className="file-meta">
                                                <span><i className="fas fa-tag"></i> {file.category}</span>
                                                <span><i className="fas fa-file"></i> {file.file_type}</span>
                                                <span><i className="fas fa-weight-hanging"></i> {file.file_size}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="resource-description">
                                        <p>{file.description || 'No description available'}</p>
                                    </div>
                                    <div className="resource-footer">
                                        <div className="price">
                                            <span className="price-amount">${file.price.toFixed(2)}</span>
                                        </div>
                                        <div className="actions">
                                            <button className="btn btn-sm btn-outline" onClick={() => openPreviewModal(file)}>
                                                <i className="fas fa-eye"></i> Preview
                                            </button>
                                            <button className="btn btn-sm btn-primary" onClick={() => openPurchaseModal(file)}>
                                                <i className="fas fa-shopping-cart"></i> Purchase
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>
            </div>

            {/* Modals will be rendered here based on state */}
            {/* {isPreviewModalOpen && selectedFile && <PreviewModal file={selectedFile} onClose={() => setPreviewModalOpen(false)} />} */}
            {/* {isPurchaseModalOpen && selectedFile && <PurchaseModal file={selectedFile} onClose={() => setPurchaseModalOpen(false)} />} */}

            {/* <ContactModal /> */}
            {/* <AboutModal /> */}
            {/* <BlogModal /> */}
            {/* <Footer /> */}
        </>
    );
};

export default Marketplace;
