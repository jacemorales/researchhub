<div class="modal" id="blogModal" style="display: none;">
        <div class="modal-content">
            <span class="close-modal" onclick="closeModal('blogModal')">×</span>
            
            <div class="modal-header">
                <h2 class="modal-title"><?php echo getConfig('BLOG_TITLE', 'Academic Insights & Research Updates'); ?></h2>
                <p class="modal-subtitle"><?php echo getConfig('BLOG_DESCRIPTION', 'Stay updated with the latest academic research, study tips, and educational insights from our team of experts.'); ?></p>
            </div>
            
            <div class="modal-body">
                <h3><?php echo getConfig('BLOG_LATEST_TITLE', 'Latest Articles'); ?></h3>
                <p><?php echo getConfig('BLOG_LATEST_DESC', 'Explore our collection of articles designed to help you get the most from our resources and stay ahead in your academic work.'); ?></p>
                
                <div class="blog-grid">
                    <div class="blog-card">
                        <img src="<?php echo getConfig('BLOG_ARTICLE_1_IMG', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&q=80'); ?>" alt="<?php echo getConfig('BLOG_ARTICLE_1_TITLE', 'Research Methodology Guide'); ?>" class="blog-img">
                        <div class="blog-content">
                            <h4 class="blog-title"><?php echo getConfig('BLOG_ARTICLE_1_TITLE', 'Research Methodology Guide'); ?></h4>
                            <div class="blog-meta">
                                <span><i class="far fa-calendar"></i> <?php echo getConfig('BLOG_ARTICLE_1_DATE', 'June 15, 2023'); ?></span>
                                <span><i class="far fa-clock"></i> <?php echo getConfig('BLOG_ARTICLE_1_READ_TIME', '8 min read'); ?></span>
                            </div>
                            <p class="blog-excerpt"><?php echo getConfig('BLOG_ARTICLE_1_EXCERPT', 'Learn how to implement effective research methodologies that are both rigorous and accessible...'); ?></p>
                            <a href="#" class="read-more">Read More <i class="fas fa-arrow-right"></i></a>
                        </div>
                    </div>
                    
                    <div class="blog-card">
                        <img src="<?php echo getConfig('BLOG_ARTICLE_2_IMG', 'https://images.unsplash.com/photo-1547658719-da2b51169166?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&q=80'); ?>" alt="<?php echo getConfig('BLOG_ARTICLE_2_TITLE', 'Academic Writing Tips'); ?>" class="blog-img">
                        <div class="blog-content">
                            <h4 class="blog-title"><?php echo getConfig('BLOG_ARTICLE_2_TITLE', 'Academic Writing Tips'); ?></h4>
                            <div class="blog-meta">
                                <span><i class="far fa-calendar"></i> <?php echo getConfig('BLOG_ARTICLE_2_DATE', 'June 5, 2023'); ?></span>
                                <span><i class="far fa-clock"></i> <?php echo getConfig('BLOG_ARTICLE_2_READ_TIME', '12 min read'); ?></span>
                            </div>
                            <p class="blog-excerpt"><?php echo getConfig('BLOG_ARTICLE_2_EXCERPT', 'Explore the most useful academic writing techniques for modern research...'); ?></p>
                            <a href="#" class="read-more">Read More <i class="fas fa-arrow-right"></i></a>
                        </div>
                    </div>
                    
                    <div class="blog-card">
                        <img src="<?php echo getConfig('BLOG_ARTICLE_3_IMG', 'https://images.unsplash.com/photo-1559028012-481c04fa702d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&q=80'); ?>" alt="<?php echo getConfig('BLOG_ARTICLE_3_TITLE', 'Study Techniques'); ?>" class="blog-img">
                        <div class="blog-content">
                            <h4 class="blog-title"><?php echo getConfig('BLOG_ARTICLE_3_TITLE', 'Study Techniques'); ?></h4>
                            <div class="blog-meta">
                                <span><i class="far fa-calendar"></i> <?php echo getConfig('BLOG_ARTICLE_3_DATE', 'May 28, 2023'); ?></span>
                                <span><i class="far fa-clock"></i> <?php echo getConfig('BLOG_ARTICLE_3_READ_TIME', '6 min read'); ?></span>
                            </div>
                            <p class="blog-excerpt"><?php echo getConfig('BLOG_ARTICLE_3_EXCERPT', 'Discover the emerging study techniques that will dominate academic success...'); ?></p>
                            <a href="#" class="read-more">Read More <i class="fas fa-arrow-right"></i></a>
                        </div>
                    </div>
                </div>
                
                <h3><?php echo getConfig('BLOG_CATEGORIES_TITLE', 'Popular Categories'); ?></h3>
                <ul>
                    <li><strong><?php echo getConfig('BLOG_CAT_1_TITLE', 'Research Tutorials'); ?>:</strong> <?php echo getConfig('BLOG_CAT_1_DESC', 'Step-by-step guides for researchers'); ?></li>
                    <li><strong><?php echo getConfig('BLOG_CAT_2_TITLE', 'Study Tips'); ?>:</strong> <?php echo getConfig('BLOG_CAT_2_DESC', 'Academic strategies and best practices'); ?></li>
                    <li><strong><?php echo getConfig('BLOG_CAT_3_TITLE', 'Academic News'); ?>:</strong> <?php echo getConfig('BLOG_CAT_3_DESC', 'Updates on educational tools and trends'); ?></li>
                    <li><strong><?php echo getConfig('BLOG_CAT_4_TITLE', 'Case Studies'); ?>:</strong> <?php echo getConfig('BLOG_CAT_4_DESC', 'How students use our resources'); ?></li>
                    <li><strong><?php echo getConfig('BLOG_CAT_5_TITLE', 'Resource Updates'); ?>:</strong> <?php echo getConfig('BLOG_CAT_5_DESC', 'New releases and improvements'); ?></li>
                </ul>
                
                <h3><?php echo getConfig('BLOG_NEWSLETTER_TITLE', 'Subscribe to Our Newsletter'); ?></h3>
                <p><?php echo getConfig('BLOG_NEWSLETTER_DESC', 'Get the latest articles and resources delivered straight to your inbox every week.'); ?></p>
                <form style="margin-top: 20px;">
                    <input type="email" placeholder="<?php echo getConfig('BLOG_NEWSLETTER_PLACEHOLDER', 'Your email address'); ?>" style="padding: 12px 15px; width: 100%; max-width: 400px; border: 2px solid var(--light-gray); border-radius: var(--border-radius); margin-right: 10px;">
                    <button type="submit" style="padding: 12px 25px; background: var(--primary); color: white; border: none; border-radius: var(--border-radius); font-weight: 600; margin-top: 10px; cursor: pointer;"><?php echo getConfig('BLOG_NEWSLETTER_BUTTON', 'Subscribe'); ?></button>
                </form>
            </div>
        </div>
    </div>