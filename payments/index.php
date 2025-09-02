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