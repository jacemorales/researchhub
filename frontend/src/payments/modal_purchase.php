<div class="modal" id="purchaseModal">
  <div class="modal-content">
    <span class="close-modal" data-modal="purchaseModal">&times;</span>
    
    <div class="modal-header">
      <h2 class="modal-title"><?php echo getConfig('PURCHASE_TITLE', 'Complete Your Purchase'); ?></h2>
      <p class="modal-subtitle" id="purchaseProductName"><?php echo getConfig('PURCHASE_SUBTITLE', 'Academic Resource'); ?></p>
    </div>
    
    <div class="modal-body">
      <form id="checkoutForm">
        <input type="hidden" id="fileId" name="file_id">
        <input type="hidden" id="filePrice" name="file_price">
        
        <div class="form-row">
          <div class="form-group">
            <label for="fullName"><?php echo getConfig('PURCHASE_NAME_LABEL', 'Full Name'); ?></label>
            <input type="text" id="fullName" name="customer_name" required>
          </div>
          <div class="form-group">
            <label for="email"><?php echo getConfig('PURCHASE_EMAIL_LABEL', 'Email Address'); ?></label>
            <input type="email" id="email" name="customer_email" required>
          </div>
        </div>
        
        <div class="form-group">
          <label for="phone"><?php echo getConfig('PURCHASE_PHONE_LABEL', 'Phone Number'); ?></label>
          <input type="tel" id="phone" name="customer_phone">
        </div>
        
        <div class="payment-summary">
          <h3><?php echo getConfig('PURCHASE_SUMMARY_TITLE', 'Order Summary'); ?></h3>
          <div class="summary-row">
            <span><?php echo getConfig('PURCHASE_PRODUCT_LABEL', 'Product'); ?>:</span>
            <span id="summaryProduct">-</span>
          </div>
          <div class="summary-row">
            <span><?php echo getConfig('PURCHASE_PRICE_LABEL', 'Price'); ?>:</span>
            <span id="summaryPrice">$0.00</span>
          </div>
          <div class="summary-row">
            <span><?php echo getConfig('PURCHASE_TAX_LABEL', 'Tax'); ?>:</span>
            <span id="summaryTax">$0.00</span>
          </div>
          <div class="summary-row total">
            <span><?php echo getConfig('PURCHASE_TOTAL_LABEL', 'Total'); ?>:</span>
            <span id="summaryTotal">$0.00</span>
          </div>
        </div>
        
        <div class="payment-methods">
          <h3><?php echo getConfig('PURCHASE_METHOD_TITLE', 'Payment Method'); ?></h3>
          <div class="payment-options">
            <label class="payment-option">
              <input type="radio" name="payment_method" value="stripe" checked>
              <div class="payment-card">
                <i class="fab fa-cc-stripe"></i>
                <span><?php echo getConfig('PURCHASE_STRIPE_LABEL', 'Credit/Debit Card'); ?></span>
              </div>
            </label>
            <label class="payment-option">
              <input type="radio" name="payment_method" value="paypal">
              <div class="payment-card">
                <i class="fab fa-paypal"></i>
                <span><?php echo getConfig('PURCHASE_PAYPAL_LABEL', 'PayPal'); ?></span>
              </div>
            </label>
            <label class="payment-option">
              <input type="radio" name="payment_method" value="bank_transfer">
              <div class="payment-card">
                <i class="fas fa-university"></i>
                <span><?php echo getConfig('PURCHASE_BANK_LABEL', 'Bank Transfer'); ?></span>
              </div>
            </label>
            <label class="payment-option">
              <input type="radio" name="payment_method" value="crypto">
              <div class="payment-card">
                <i class="fab fa-bitcoin"></i>
                <span><?php echo getConfig('PURCHASE_CRYPTO_LABEL', 'Cryptocurrency'); ?></span>
              </div>
            </label>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" id="submitPayment">
            <i class="fas fa-lock"></i> <?php echo getConfig('PURCHASE_BUTTON', 'Complete Purchase'); ?>
          </button>
          <button type="button" class="btn btn-secondary" onclick="closeModal('purchaseModal')">
            <?php echo getConfig('PURCHASE_CANCEL', 'Cancel'); ?>
          </button>
        </div>
      </form>
      
      <div id="paymentStatus" style="display: none;">
        <div class="payment-status">
          <div class="status-icon">
            <i class="fas fa-spinner fa-spin"></i>
          </div>
          <h3 id="statusTitle">Processing Payment...</h3>
          <p id="statusMessage">Please wait while we process your payment.</p>
        </div>
      </div>
    </div>
  </div>
</div>






<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Pay — Research Hub</title>
  <link rel="stylesheet" href="main.css">
</head>
<body>
  <div class="payment-card">
    <div class="payment-header">
      <h2>Research Hub — Payment</h2>
      <p class="sub">Enter your email and amount. Fee (1.5%) shown for reference.</p>
    </div>

    <div class="payment-body" id="payment-form-container">
      <form id="payment-form" autocomplete="off">
        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" class="form-control" placeholder="you@example.com" required>
        </div>

        <div class="form-group">
          <label for="amount">Amount (₦)</label>
          <input id="amount" name="amount" type="number" step="0.01" min="0.01" class="form-control" placeholder="1000.00" required>
          <div class="fee-info"><i>i</i> Fee (1.5% displayed): ₦<span id="fee-amount">0.00</span></div>
          <div class="fee-info"><i>i</i> Total (display): ₦<span id="total-amount">0.00</span></div>
        </div>

        <button type="submit" id="pay-btn" class="btn btn-primary">Pay ₦0.00</button>
      </form>

      <div id="notification" class="slide-notification"></div>
    </div>

    <div id="loader-container" class="loader-container" style="display:none;">
      <div class="loader"></div>
      <div class="status-text">Processing... please wait</div>
    </div>

    <div id="payment-result" style="display:none;"></div>
  </div>

<script src="errorStates.js"></script>
<script src="main.js"></script>
</body>
</html>

