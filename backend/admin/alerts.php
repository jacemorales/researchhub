<?php if (isset($_SESSION['success_message']) || isset($_SESSION['error_message'])): ?>
<script src="<?= dirname($_SERVER['PHP_SELF']) ?>/assets/js/toast.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        <?php if (isset($_SESSION['success_message'])): ?>
            showToast('success', '<?php echo addslashes($_SESSION['success_message']); ?>');
            <?php unset($_SESSION['success_message']); ?>
        <?php endif; ?>

        <?php if (isset($_SESSION['error_message'])): ?>
            showToast('error', '<?php echo addslashes($_SESSION['error_message']); ?>');
            <?php unset($_SESSION['error_message']); ?>
        <?php endif; ?>
    });
</script>
<?php endif; ?>