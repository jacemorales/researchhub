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

<style>
    .payments-container {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .payments-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
    }

    .stat-card {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        border-radius: 15px;
        padding: 1.5rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .stat-icon {
        width: 3rem;
        height: 3rem;
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 1.25rem;
    }

    .stat-info h3 {
        margin: 0 0 0.5rem 0;
        font-size: 0.9rem;
        color: var(--gray);
        font-weight: 500;
    }

    .stat-value {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--dark);
    }

    .payments-table-container {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 2rem;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .table-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        flex-wrap: wrap;
        gap: 1rem;
    }

    .table-filters {
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    .table-filters select,
    .table-filters input {
        padding: 0.5rem 1rem;
        border: 2px solid rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        font-size: 0.9rem;
    }

    .payments-table-wrapper {
        overflow-x: auto;
    }

    .payments-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
    }

    .payments-table th,
    .payments-table td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }

    .payments-table th {
        background: rgba(0, 0, 0, 0.05);
        font-weight: 600;
        color: var(--dark);
    }

    .transaction-id {
        font-family: monospace;
        font-size: 0.85rem;
        background: rgba(0, 0, 0, 0.05);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
    }

    .customer-info strong {
        display: block;
        margin-bottom: 0.25rem;
    }

    .customer-info small {
        color: var(--gray);
    }

    .status {
        padding: 0.25rem 0.75rem;
        border-radius: 15px;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
    }

    .status-pending {
        background: #fef3c7;
        color: #92400e;
    }

    .status-completed {
        background: #d1fae5;
        color: #065f46;
    }

    .status-failed {
        background: #fee2e2;
        color: #991b1b;
    }

    .status-refunded {
        background: #e0e7ff;
        color: #3730a3;
    }

    .action-buttons {
        display: flex;
        gap: 0.5rem;
    }

    .btn-action {
        background: transparent;
        border: 2px solid var(--primary);
        color: var(--primary);
        padding: 0.5rem;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .btn-action:hover {
        background: var(--primary);
        color: white;
    }

    .no-payments {
        text-align: center;
        padding: 4rem 2rem;
        color: var(--gray);
    }

    .no-payments i {
        font-size: 4rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }

    /* Scrollbar for table */
    .payments-table-wrapper::-webkit-scrollbar {
        width: 6px;
        height: 6px;
    }

    .payments-table-wrapper::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 3px;
    }

    .payments-table-wrapper::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 3px;
    }

    @media (max-width: 768px) {
        .table-header {
            flex-direction: column;
            align-items: stretch;
        }

        .table-filters {
            flex-direction: column;
        }

        .payments-stats {
            grid-template-columns: 1fr;
        }
    }
</style>

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