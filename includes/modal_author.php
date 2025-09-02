<div class="modal" id="authorModal">
    <div class="modal-content">
       <span class="close-modal" data-modal="authorModal">&times;</span>
        
        <div class="author-profile-header">
            <img src="<?php echo getConfig('AUTHOR_IMG', AUTHOR_IMG); ?>" alt="<?php echo getConfig('AUTHOR_NAME', AUTHOR_NAME); ?>" class="author-profile-img">
            <div class="author-profile-info">
                <h2 class="author-profile-name"><?php echo getConfig('AUTHOR_NAME', AUTHOR_NAME); ?></h2>
                <p class="author-profile-title"><?php echo getConfig('AUTHOR_TITLE', AUTHOR_TITLE); ?></p>
                <p class="author-profile-contact"><i class="fas fa-university"></i> <?php echo getConfig('AUTHOR_UNIVERSITY', 'University of Port Harcourt'); ?></p>
                <p class="author-profile-contact"><i class="fas fa-envelope"></i> <?php echo getConfig('AUTHOR_EMAIL', 'chikwe@researchhub.edu'); ?></p>
            </div>
        </div>
        
        <div class="author-profile-bio">
            <p><?php echo getConfig('AUTHOR_BIO', AUTHOR_BIO); ?></p>
        </div>
        
        <div class="author-highlights">
                <div class="highlight-item">
                    <div class="highlight-icon">
                        <i class="fas fa-graduation-cap"></i>
                    </div>
                    <div class="highlight-content">
                        <h4><?php echo getConfig('AUTHOR_CREDENTIALS_TITLE', 'Academic Credentials'); ?></h4>
                        <p><?php echo getConfig('AUTHOR_CREDENTIALS_DESC', 'B.Sc & M.Sc in Hospitality Management (University of Port Harcourt)<br>Currently pursuing Ph.D in Hospitality & Tourism Marketing'); ?></p>
                    </div>
                </div>
                
                <div class="highlight-item">
                    <div class="highlight-icon">
                        <i class="fas fa-chalkboard-teacher"></i>
                    </div>
                    <div class="highlight-content">
                        <h4><?php echo getConfig('AUTHOR_MENTORSHIP_TITLE', 'Mentorship Achievements'); ?></h4>
                        <p><?php echo getConfig('AUTHOR_MENTORSHIP_DESC', 'Mentored 100+ students with 90% distinction rate<br>Guided research across multiple disciplines'); ?></p>
                    </div>
                </div>
                
                <div class="highlight-item">
                    <div class="highlight-icon">
                        <i class="fas fa-book"></i>
                    </div>
                    <div class="highlight-content">
                        <h4><?php echo getConfig('AUTHOR_PUBLICATIONS_TITLE', 'Publications'); ?></h4>
                        <p><?php echo getConfig('AUTHOR_PUBLICATIONS_DESC', '5 published international articles in peer-reviewed journals'); ?></p>
                    </div>
                </div>
            </div>
    </div>
</div>