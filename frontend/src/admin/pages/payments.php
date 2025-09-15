<?php
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/database.php';
require_once __DIR__ . '/includes/drive_api.php';

// Handle logout
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    googleDriveLogout();
    header('Location: index.php');
    exit;
}

// Get payments data with file details
try {
    $stmt = $pdo->prepare("
        SELECT p.*, af.file_name, af.drive_file_id 
        FROM payments p 
        LEFT JOIN academic_files af ON p.file_id = af.id 
        ORDER BY p.created_at DESC
    ");
    $stmt->execute();
    $payments = $stmt->fetchAll();
} catch (PDOException $e) {
    $payments = [];
    error_log("Error fetching payments: " . $e->getMessage());
}

include __DIR__ . '/includes/admin_header.php';
?>

<div class="config-content">
    <div class="config-header">
        <h1><i class="fas fa-credit-card"></i> Payment Management</h1>
        <p>View and manage payment transactions from customers.</p>
    </div>

    <div class="payments-container">
        <div class="payments-stats">
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="stat-info">
                    <h3>Total Revenue</h3>
                    <p class="stat-value">$<?php
                                            $totalRevenue = array_sum(array_column($payments, 'amount'));
                                            echo number_format($totalRevenue, 2);
                                            ?></p>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <div class="stat-info">
                    <h3>Total Transactions</h3>
                    <p class="stat-value"><?php echo count($payments); ?></p>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-info">
                    <h3>Completed</h3>
                    <p class="stat-value"><?php
                                            $completed = array_filter($payments, function ($p) {
                                                return $p['status'] === 'completed';
                                            });
                                            echo count($completed);
                                            ?></p>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-info">
                    <h3>Pending</h3>
                    <p class="stat-value"><?php
                                            $pending = array_filter($payments, function ($p) {
                                                return $p['status'] === 'pending';
                                            });
                                            echo count($pending);
                                            ?></p>
                </div>
            </div>
        </div>

        <div class="payments-table-container">
            <div class="table-header">
                <h2>Recent Transactions</h2>
                <div class="table-filters">
                    <select id="statusFilter">
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                    </select>
                    <input type="text" id="searchPayments" placeholder="Search transactions...">
                </div>
            </div>

            <?php if (empty($payments)): ?>
                <div class="no-payments">
                    <i class="fas fa-credit-card"></i>
                    <h3>No payments found</h3>
                    <p>No payment transactions have been made yet.</p>
                </div>
            <?php else: ?>
                <div class="payments-table-wrapper">
                    <table class="payments-table">
                        <thead>
                            <tr>
                                <th>Transaction ID</th>
                                <th>Customer</th>
                                <th>File</th>
                                <th>Amount</th>
                                <th>Payment Method</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($payments as $payment): ?>
                                <tr data-status="<?php echo $payment['status']; ?>">
                                    <td>
                                        <span class="transaction-id"><?php echo htmlspecialchars($payment['transaction_id']); ?></span>
                                    </td>
                                    <td>
                                        <div class="customer-info">
                                            <strong><?php echo htmlspecialchars($payment['customer_name']); ?></strong>
                                            <small><?php echo htmlspecialchars($payment['customer_email']); ?></small>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="file-name"><?php echo htmlspecialchars($payment['file_name'] ?? 'Unknown File'); ?></span>
                                    </td>
                                    <td>
                                        <span class="amount">$<?php echo number_format($payment['amount'], 2); ?></span>
                                    </td>
                                    <td>
                                        <span class="payment-method">
                                            <i class="<?php echo getPaymentIcon($payment['payment_method']); ?>"></i>
                                            <?php echo ucfirst($payment['payment_method']); ?>
                                        </span>
                                    </td>
                                    <td>
                                        <span class="status status-<?php echo $payment['status']; ?>">
                                            <?php echo ucfirst($payment['status']); ?>
                                        </span>
                                    </td>
                                    <td>
                                        <span class="date"><?php echo date('M d, Y H:i', strtotime($payment['created_at'])); ?></span>
                                    </td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="btn-action" onclick="viewPaymentDetails(<?php echo $payment['id']; ?>)" title="View Details">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <?php if ($payment['status'] === 'pending'): ?>
                                                <button class="btn-action" onclick="updatePaymentStatus(<?php echo $payment['id']; ?>, 'completed')" title="Mark as Completed">
                                                    <i class="fas fa-check"></i>
                                                </button>
                                            <?php endif; ?>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- Payment Details Modal -->
<div class="modal" id="paymentDetailsModal" style="display: none;">
    <div class="modal-content payments-modal">
        <span class="close-modal" onclick="closeModal('paymentDetailsModal')">×</span>

        <div class="modal-header">
            <h2 class="modal-title">Payment Details</h2>
        </div>

        <div class="modal-body" id="paymentDetailsContent">
            <!-- Content will be loaded via AJAX -->
        </div>
    </div>
</div>

<script>
    // Filter functionality
    document.getElementById('statusFilter').addEventListener('change', function() {
        const selectedStatus = this.value;
        const rows = document.querySelectorAll('.payments-table tbody tr');

        rows.forEach(row => {
            const status = row.dataset.status;
            if (selectedStatus === 'all' || status === selectedStatus) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });

    // Search functionality
    document.getElementById('searchPayments').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('.payments-table tbody tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });

    // View payment details
    function viewPaymentDetails(paymentId) {
        fetch(`includes/get_payment_details.php?id=${paymentId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('paymentDetailsContent').innerHTML = data.html;
                    openModal('paymentDetailsModal');
                } else {
                    alert('Failed to load payment details');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Failed to load payment details');
            });
    }

    // Update payment status
    function updatePaymentStatus(paymentId, status) {
        if (confirm(`Are you sure you want to mark this payment as ${status}?`)) {
            fetch('includes/update_payment_status.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        payment_id: paymentId,
                        status: status
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        location.reload();
                    } else {
                        alert('Failed to update payment status');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Failed to update payment status');
                });
        }
    }

    // Modal functions
    function openModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        document.body.style.overflow = 'auto';
    }
</script>


</body>

</html>

<?php
function getPaymentIcon($method)
{
    $icons = [
        'stripe' => 'fab fa-cc-stripe',
        'paypal' => 'fab fa-paypal',
        'bank_transfer' => 'fas fa-university',
        'crypto' => 'fab fa-bitcoin'
    ];
    return $icons[$method] ?? 'fas fa-credit-card';
}
?>