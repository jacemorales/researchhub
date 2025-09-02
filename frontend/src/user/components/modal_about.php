<div class="modal" id="aboutModal" style="display: none;">
        <div class="modal-content">
            <span class="close-modal" onclick="closeModal('aboutModal')">×</span>
            
            <div class="modal-header">
                <h2 class="modal-title">About <?php echo getConfig('SITE_NAME'); ?></h2>
                <p class="modal-subtitle"><?php echo getConfig('ABOUT_SUBTITLE'); ?></p>
            </div>
            
            <div class="modal-body">
                <h3><?php echo getConfig('ABOUT_STORY_TITLE'); ?></h3>
                <p><?php echo getConfig('ABOUT_STORY_CONTENT'); ?></p>
                
                <h3><?php echo getConfig('ABOUT_MISSION_TITLE'); ?></h3>
                <p><?php echo getConfig('ABOUT_MISSION_CONTENT'); ?></p>
                
                <h3><?php echo getConfig('ABOUT_TEAM_TITLE'); ?></h3>
                <p><?php echo getConfig('ABOUT_TEAM_INTRO'); ?></p>
                
                <div class="team-grid">
                    <div class="team-member">
                        <img src="<?php echo getConfig('TEAM_MEMBER_1_IMG'); ?>" alt="<?php echo getConfig('TEAM_MEMBER_1_NAME'); ?>" class="team-img">
                        <h4 class="team-name"><?php echo getConfig('TEAM_MEMBER_1_NAME'); ?></h4>
                        <p class="team-role"><?php echo getConfig('TEAM_MEMBER_1_ROLE'); ?></p>
                    </div>
                    <div class="team-member">
                        <img src="<?php echo getConfig('TEAM_MEMBER_2_IMG'); ?>" alt="<?php echo getConfig('TEAM_MEMBER_2_NAME'); ?>" class="team-img">
                        <h4 class="team-name"><?php echo getConfig('TEAM_MEMBER_2_NAME'); ?></h4>
                        <p class="team-role"><?php echo getConfig('TEAM_MEMBER_2_ROLE'); ?></p>
                    </div>
                    <div class="team-member">
                        <img src="<?php echo getConfig('TEAM_MEMBER_3_IMG'); ?>" alt="<?php echo getConfig('TEAM_MEMBER_3_NAME'); ?>" class="team-img">
                        <h4 class="team-name"><?php echo getConfig('TEAM_MEMBER_3_NAME'); ?></h4>
                        <p class="team-role"><?php echo getConfig('TEAM_MEMBER_3_ROLE'); ?></p>
                    </div>
                    <div class="team-member">
                        <img src="<?php echo getConfig('TEAM_MEMBER_4_IMG'); ?>" alt="<?php echo getConfig('TEAM_MEMBER_4_NAME'); ?>" class="team-img">
                        <h4 class="team-name"><?php echo getConfig('TEAM_MEMBER_4_NAME'); ?></h4>
                        <p class="team-role"><?php echo getConfig('TEAM_MEMBER_4_ROLE'); ?></p>
                    </div>
                </div>
                
                <h3><?php echo getConfig('ABOUT_VALUES_TITLE'); ?></h3>
                <ul>
                    <li><strong><?php echo getConfig('ABOUT_VALUE_1_TITLE'); ?>:</strong> <?php echo getConfig('ABOUT_VALUE_1_DESC'); ?></li>
                    <li><strong><?php echo getConfig('ABOUT_VALUE_2_TITLE'); ?>:</strong> <?php echo getConfig('ABOUT_VALUE_2_DESC'); ?></li>
                    <li><strong><?php echo getConfig('ABOUT_VALUE_3_TITLE'); ?>:</strong> <?php echo getConfig('ABOUT_VALUE_3_DESC'); ?></li>
                    <li><strong><?php echo getConfig('ABOUT_VALUE_4_TITLE'); ?>:</strong> <?php echo getConfig('ABOUT_VALUE_4_DESC'); ?></li>
                </ul>
            </div>
        </div>
    </div>