<footer>
    <p><?php echo getConfig('FOOTER_COPYRIGHT', '© ' . date('Y') . ' ' . SITE_NAME . '. All rights reserved.'); ?></p>
    <p><?php echo getConfig('FOOTER_DESCRIPTION', SITE_DESC); ?></p>
    
    <div class="social-links">
        <?php if (getConfig('SOCIAL_FACEBOOK')): ?>
            <a href="<?php echo getConfig('SOCIAL_FACEBOOK'); ?>" target="_blank" title="Facebook">
                <i class="fab fa-facebook"></i>
            </a>
        <?php endif; ?>
        
        <?php if (getConfig('SOCIAL_TWITTER')): ?>
            <a href="<?php echo getConfig('SOCIAL_TWITTER'); ?>" target="_blank" title="Twitter">
                <i class="fab fa-twitter"></i>
            </a>
        <?php endif; ?>
        
        <?php if (getConfig('SOCIAL_LINKEDIN')): ?>
            <a href="<?php echo getConfig('SOCIAL_LINKEDIN'); ?>" target="_blank" title="LinkedIn">
                <i class="fab fa-linkedin"></i>
            </a>
        <?php endif; ?>
        
        <?php if (getConfig('SOCIAL_INSTAGRAM')): ?>
            <a href="<?php echo getConfig('SOCIAL_INSTAGRAM'); ?>" target="_blank" title="Instagram">
                <i class="fab fa-instagram"></i>
            </a>
        <?php endif; ?>
    </div>
</footer>
<script src="<?php echo JS_PATH; ?>script.js"></script>
</body>
</html>