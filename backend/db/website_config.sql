-- Website Configuration Database Schema

-- Drop existing table if exists
DROP TABLE IF EXISTS website_config;

-- Create website_config table
CREATE TABLE website_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    config_type ENUM('text', 'textarea', 'image', 'number', 'boolean') DEFAULT 'text',
    config_category VARCHAR(50) DEFAULT 'general',
    config_description TEXT,
    is_editable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at VARCHAR(50) NULL,
    INDEX idx_config_key (config_key),
    INDEX idx_config_category (config_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default website configuration values
INSERT INTO website_config (config_key, config_value, config_type, config_category, config_description) VALUES
-- Site Information
('SITE_NAME', 'Research Hub', 'text', 'site', 'Website name displayed in header and title'),
('SITE_DESC', 'Premium Academic Resources', 'text', 'site', 'Website description/tagline'),
('SITE_RESOURCE_BIO', 'Empowering academic excellence through mentorship and research leadership', 'textarea', 'site', 'Main resource section description'),
('SITE_RESOURCES_TITLE', 'Academic Resources', 'text', 'site', 'Main resources section title'),

-- Author Information
('AUTHOR_NAME', 'Chikwe Eleazer', 'text', 'author', 'Author/Founder name'),
('AUTHOR_TITLE', 'Research Leader & Academic Mentor', 'text', 'author', 'Author title/position'),
('AUTHOR_IMG', 'assets/img/author.png', 'image', 'author', 'Author profile image path'),
('AUTHOR_BIO', 'Chikwe Eleazer, President of Research Hub, holds B.Sc and M.Sc in Hospitality Management from UNIPORT. With a 90% student success rate, he has mentored 100+ students and published 5 international articles.', 'textarea', 'author', 'Author biography'),
('AUTHOR_UNIVERSITY', 'University of Port Harcourt', 'text', 'author', 'Author university affiliation'),
('AUTHOR_EMAIL', 'chikwe@researchhub.edu', 'text', 'author', 'Author email address'),
('AUTHOR_CREDENTIALS_TITLE', 'Academic Credentials', 'text', 'author', 'Author credentials section title'),
('AUTHOR_CREDENTIALS_DESC', 'B.Sc & M.Sc in Hospitality Management (University of Port Harcourt)<br>Currently pursuing Ph.D in Hospitality & Tourism Marketing', 'textarea', 'author', 'Author credentials description'),
('AUTHOR_MENTORSHIP_TITLE', 'Mentorship Achievements', 'text', 'author', 'Author mentorship section title'),
('AUTHOR_MENTORSHIP_DESC', 'Mentored 100+ students with 90% distinction rate<br>Guided research across multiple disciplines', 'textarea', 'author', 'Author mentorship description'),
('AUTHOR_PUBLICATIONS_TITLE', 'Publications', 'text', 'author', 'Author publications section title'),
('AUTHOR_PUBLICATIONS_DESC', '5 published international articles in peer-reviewed journals', 'textarea', 'author', 'Author publications description'),

-- Contact Information
('CONTACT_EMAIL', 'contact@researchhub.com', 'text', 'contact', 'Primary contact email'),
('CONTACT_PHONE', '+234 123 456 7890', 'text', 'contact', 'Contact phone number'),
('CONTACT_ADDRESS', 'Port Harcourt, Rivers State, Nigeria', 'textarea', 'contact', 'Physical address'),
('CONTACT_TITLE', 'Contact Us', 'text', 'contact', 'Contact page title'),
('CONTACT_SUBTITLE', 'Get in touch with our support team', 'textarea', 'contact', 'Contact page subtitle'),
('CONTACT_NAME_LABEL', 'Full Name', 'text', 'contact', 'Contact form name label'),
('CONTACT_EMAIL_LABEL', 'Email Address', 'text', 'contact', 'Contact form email label'),
('CONTACT_SUBJECT_LABEL', 'Subject', 'text', 'contact', 'Contact form subject label'),
('CONTACT_MESSAGE_LABEL', 'Message', 'text', 'contact', 'Contact form message label'),
('CONTACT_SUBMIT_BUTTON', 'Send Message', 'text', 'contact', 'Contact form submit button text'),

-- Social Media
('SOCIAL_FACEBOOK', 'https://facebook.com/researchhub', 'text', 'social', 'Facebook page URL'),
('SOCIAL_TWITTER', 'https://twitter.com/researchhub', 'text', 'social', 'Twitter profile URL'),
('SOCIAL_LINKEDIN', 'https://linkedin.com/company/researchhub', 'text', 'social', 'LinkedIn company page URL'),
('SOCIAL_INSTAGRAM', 'https://instagram.com/researchhub', 'text', 'social', 'Instagram profile URL'),

-- About Page Content
('ABOUT_STORY_TITLE', 'Our Story', 'text', 'about', 'About page story section title'),
('ABOUT_STORY_CONTENT', 'Founded in 2015, Research Hub began as a small collection of academic resources created by our founder Chikwe Eleazer. What started as a side project quickly grew into a thriving marketplace serving thousands of students, researchers, and academics worldwide.', 'textarea', 'about', 'About page story content'),
('ABOUT_MISSION_TITLE', 'Our Mission', 'text', 'about', 'About page mission section title'),
('ABOUT_MISSION_CONTENT', 'We believe in empowering students and researchers with high-quality academic resources that save time and elevate their work. Our carefully curated collection helps academics accelerate their research and maintain academic excellence.', 'textarea', 'about', 'About page mission content'),
('ABOUT_SUBTITLE', 'Empowering creators with premium resources since 2015', 'text', 'about', 'About page subtitle'),
('ABOUT_TEAM_TITLE', 'Our Team', 'text', 'about', 'About page team section title'),
('ABOUT_TEAM_INTRO', 'Behind every great resource is a team of dedicated professionals committed to quality and innovation.', 'textarea', 'about', 'About page team introduction'),
('ABOUT_VALUES_TITLE', 'Our Values', 'text', 'about', 'About page values section title'),
('ABOUT_VALUE_1_TITLE', 'Quality First', 'text', 'about', 'About page value 1 title'),
('ABOUT_VALUE_1_DESC', 'Every resource undergoes rigorous review before publication', 'textarea', 'about', 'About page value 1 description'),
('ABOUT_VALUE_2_TITLE', 'Creator Focused', 'text', 'about', 'About page value 2 title'),
('ABOUT_VALUE_2_DESC', 'We build tools that solve real problems for creatives', 'textarea', 'about', 'About page value 2 description'),
('ABOUT_VALUE_3_TITLE', 'Continuous Improvement', 'text', 'about', 'About page value 3 title'),
('ABOUT_VALUE_3_DESC', 'Regular updates keep our resources current', 'textarea', 'about', 'About page value 3 description'),
('ABOUT_VALUE_4_TITLE', 'Community Driven', 'text', 'about', 'About page value 4 title'),
('ABOUT_VALUE_4_DESC', 'We listen to and implement customer feedback', 'textarea', 'about', 'About page value 4 description'),

-- Team Information
('TEAM_MEMBER_1_NAME', 'Chikwe Eleazer', 'text', 'team', 'Team member 1 name'),
('TEAM_MEMBER_1_ROLE', 'Founder & CEO', 'text', 'team', 'Team member 1 role'),
('TEAM_MEMBER_1_IMG', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80', 'image', 'team', 'Team member 1 image URL'),
('TEAM_MEMBER_1_BIO', 'Founder and CEO of Research Hub with extensive experience in academic research and mentorship.', 'textarea', 'team', 'Team member 1 biography'),
('TEAM_MEMBER_2_NAME', 'Sarah Williams', 'text', 'team', 'Team member 2 name'),
('TEAM_MEMBER_2_ROLE', 'Head of Design', 'text', 'team', 'Team member 2 role'),
('TEAM_MEMBER_2_IMG', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80', 'image', 'team', 'Team member 2 image URL'),
('TEAM_MEMBER_2_BIO', 'Head of Design with expertise in user experience and visual design.', 'textarea', 'team', 'Team member 2 biography'),
('TEAM_MEMBER_3_NAME', 'Michael Chen', 'text', 'team', 'Team member 3 name'),
('TEAM_MEMBER_3_ROLE', 'Lead Developer', 'text', 'team', 'Team member 3 role'),
('TEAM_MEMBER_3_IMG', 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80', 'image', 'team', 'Team member 3 image URL'),
('TEAM_MEMBER_3_BIO', 'Lead Developer with extensive experience in web development and system architecture.', 'textarea', 'team', 'Team member 3 biography'),
('TEAM_MEMBER_4_NAME', 'Emma Rodriguez', 'text', 'team', 'Team member 4 name'),
('TEAM_MEMBER_4_ROLE', 'Content Manager', 'text', 'team', 'Team member 4 role'),
('TEAM_MEMBER_4_IMG', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80', 'image', 'team', 'Team member 4 image URL'),
('TEAM_MEMBER_4_BIO', 'Content Manager responsible for curating and managing academic resources.', 'textarea', 'team', 'Team member 4 biography'),

-- Blog Content
('BLOG_TITLE', 'Academic Insights & Research Updates', 'text', 'blog', 'Blog page title'),
('BLOG_DESCRIPTION', 'Stay updated with the latest academic research, study tips, and educational insights from our team of experts.', 'textarea', 'blog', 'Blog page description'),
('BLOG_LATEST_TITLE', 'Latest Articles', 'text', 'blog', 'Blog latest articles section title'),
('BLOG_LATEST_DESC', 'Explore our collection of articles designed to help you get the most from our resources and stay ahead in your academic work.', 'textarea', 'blog', 'Blog latest articles description'),
('BLOG_ARTICLE_1_TITLE', 'Research Methodology Guide', 'text', 'blog', 'Blog article 1 title'),
('BLOG_ARTICLE_1_IMG', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&q=80', 'image', 'blog', 'Blog article 1 image URL'),
('BLOG_ARTICLE_1_DATE', 'June 15, 2023', 'text', 'blog', 'Blog article 1 date'),
('BLOG_ARTICLE_1_READ_TIME', '8 min read', 'text', 'blog', 'Blog article 1 read time'),
('BLOG_ARTICLE_1_EXCERPT', 'Learn how to implement effective research methodologies that are both rigorous and accessible...', 'textarea', 'blog', 'Blog article 1 excerpt'),
('BLOG_ARTICLE_2_TITLE', 'Academic Writing Tips', 'text', 'blog', 'Blog article 2 title'),
('BLOG_ARTICLE_2_IMG', 'https://images.unsplash.com/photo-1547658719-da2b51169166?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&q=80', 'image', 'blog', 'Blog article 2 image URL'),
('BLOG_ARTICLE_2_DATE', 'June 5, 2023', 'text', 'blog', 'Blog article 2 date'),
('BLOG_ARTICLE_2_READ_TIME', '12 min read', 'text', 'blog', 'Blog article 2 read time'),
('BLOG_ARTICLE_2_EXCERPT', 'Explore the most useful academic writing techniques for modern research...', 'textarea', 'blog', 'Blog article 2 excerpt'),
('BLOG_ARTICLE_3_TITLE', 'Study Techniques', 'text', 'blog', 'Blog article 3 title'),
('BLOG_ARTICLE_3_IMG', 'https://images.unsplash.com/photo-1559028012-481c04fa702d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&q=80', 'image', 'blog', 'Blog article 3 image URL'),
('BLOG_ARTICLE_3_DATE', 'May 28, 2023', 'text', 'blog', 'Blog article 3 date'),
('BLOG_ARTICLE_3_READ_TIME', '6 min read', 'text', 'blog', 'Blog article 3 read time'),
('BLOG_ARTICLE_3_EXCERPT', 'Discover the emerging study techniques that will dominate academic success...', 'textarea', 'blog', 'Blog article 3 excerpt'),
('BLOG_CATEGORIES_TITLE', 'Popular Categories', 'text', 'blog', 'Blog categories section title'),
('BLOG_CAT_1_TITLE', 'Research Tutorials', 'text', 'blog', 'Blog category 1 title'),
('BLOG_CAT_1_DESC', 'Step-by-step guides for researchers', 'textarea', 'blog', 'Blog category 1 description'),
('BLOG_CAT_2_TITLE', 'Study Tips', 'text', 'blog', 'Blog category 2 title'),
('BLOG_CAT_2_DESC', 'Academic strategies and best practices', 'textarea', 'blog', 'Blog category 2 description'),
('BLOG_CAT_3_TITLE', 'Academic News', 'text', 'blog', 'Blog category 3 title'),
('BLOG_CAT_3_DESC', 'Updates on educational tools and trends', 'textarea', 'blog', 'Blog category 3 description'),
('BLOG_CAT_4_TITLE', 'Case Studies', 'text', 'blog', 'Blog category 4 title'),
('BLOG_CAT_4_DESC', 'How students use our resources', 'textarea', 'blog', 'Blog category 4 description'),
('BLOG_CAT_5_TITLE', 'Resource Updates', 'text', 'blog', 'Blog category 5 title'),
('BLOG_CAT_5_DESC', 'New releases and improvements', 'textarea', 'blog', 'Blog category 5 description'),
('BLOG_NEWSLETTER_TITLE', 'Subscribe to Our Newsletter', 'text', 'blog', 'Blog newsletter section title'),
('BLOG_NEWSLETTER_DESC', 'Get the latest articles and resources delivered straight to your inbox every week.', 'textarea', 'blog', 'Blog newsletter description'),
('BLOG_NEWSLETTER_PLACEHOLDER', 'Your email address', 'text', 'blog', 'Blog newsletter email placeholder'),
('BLOG_NEWSLETTER_BUTTON', 'Subscribe', 'text', 'blog', 'Blog newsletter button text'),

-- Footer Information
('FOOTER_COPYRIGHT', '© 2024 Research Hub. All rights reserved.', 'text', 'footer', 'Footer copyright text'),
('FOOTER_DESCRIPTION', 'Empowering academic excellence through quality research resources and mentorship.', 'textarea', 'footer', 'Footer description'),

-- SEO Settings
('SEO_META_DESCRIPTION', 'Research Hub - Premium academic resources, research papers, thesis, and study materials for undergraduate and postgraduate students.', 'textarea', 'seo', 'Default meta description'),
('SEO_META_KEYWORDS', 'academic resources, research papers, thesis, dissertation, study materials, undergraduate, postgraduate', 'textarea', 'seo', 'Default meta keywords'),

-- Purchase Settings
('PURCHASE_TITLE', 'Complete Your Purchase', 'text', 'purchase', 'Purchase modal title'),
('PURCHASE_SUBTITLE', 'Academic Resource', 'text', 'purchase', 'Purchase modal subtitle'),
('PURCHASE_NAME_LABEL', 'Full Name', 'text', 'purchase', 'Purchase form name label'),
('PURCHASE_EMAIL_LABEL', 'Email Address', 'text', 'purchase', 'Purchase form email label'),
('PURCHASE_PHONE_LABEL', 'Phone Number', 'text', 'purchase', 'Purchase form phone label'),
('PURCHASE_SUMMARY_TITLE', 'Order Summary', 'text', 'purchase', 'Purchase summary section title'),
('PURCHASE_PRODUCT_LABEL', 'Product', 'text', 'purchase', 'Purchase summary product label'),
('PURCHASE_PRICE_LABEL', 'Price', 'text', 'purchase', 'Purchase summary price label'),
('PURCHASE_TAX_LABEL', 'Tax', 'text', 'purchase', 'Purchase summary tax label'),
('PURCHASE_TOTAL_LABEL', 'Total', 'text', 'purchase', 'Purchase summary total label'),
('PURCHASE_METHOD_TITLE', 'Payment Method', 'text', 'purchase', 'Purchase payment method title'),
('PURCHASE_STRIPE_LABEL', 'Stripe', 'text', 'purchase', 'Stripe payment option label'),
('PURCHASE_PAYPAL_LABEL', 'PayPal', 'text', 'purchase', 'PayPal payment option label'),
('PURCHASE_BANK_LABEL', 'Bank Transfer', 'text', 'purchase', 'Bank transfer payment option label'),
('PURCHASE_CRYPTO_LABEL', 'Cryptocurrency', 'text', 'purchase', 'Cryptocurrency payment option label'),
('PURCHASE_BUTTON', 'Complete Purchase', 'text', 'purchase', 'Purchase submit button text'),
('PURCHASE_CANCEL', 'Cancel', 'text', 'purchase', 'Purchase cancel button text'),

-- Contact Settings
('CONTACT_CANCEL', 'Cancel', 'text', 'contact', 'Contact form cancel button text'),

-- Technical Settings
('TECHNICAL_MAINTENANCE_MODE', '0', 'boolean', 'technical', 'Enable maintenance mode (0=off, 1=on)'),
('TECHNICAL_MAX_FILE_SIZE', '50', 'number', 'technical', 'Maximum file upload size in MB'),
('TECHNICAL_ALLOWED_FILE_TYPES', 'pdf,doc,docx,xls,xlsx,ppt,pptx,txt,rtf,jpg,jpeg,png,gif,zip,rar', 'text', 'technical', 'Comma-separated list of allowed file extensions'); 