// script.js - Complete JavaScript for Academic Resource Marketplace

document.addEventListener('DOMContentLoaded', function() {
  // ======================
  // MODAL FUNCTIONALITY
  // ======================
  
  // Improved modal handling with better close functionality
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }
  
  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  // Make closeModal available globally
  window.closeModal = closeModal;
  
  // Close buttons for all modals
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', function() {
      closeModal(this.closest('.modal').id);
    });
  });
  
  // Close when clicking outside modal content
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeModal(this.id);
      }
    });
  });
  
  // Close with Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(modal => {
        closeModal(modal.id);
      });
    }
  });
  
  // ======================
  // PURCHASE FUNCTIONALITY
  // ======================
  
  window.openPurchaseModal = function(fileId, fileName, filePrice) {
    const modal = document.getElementById('purchaseModal');
    if (!modal) return;
    
    // Convert price to number if it's a string
    const price = parseFloat(filePrice) || 0;
    
    // Set hidden form fields
    document.getElementById('fileId').value = fileId;
    document.getElementById('filePrice').value = price;
    
    // Set resource info
    document.getElementById('purchaseProductName').textContent = fileName;
    document.getElementById('summaryProduct').textContent = fileName;
    document.getElementById('summaryPrice').textContent = '$' + price.toFixed(2);
    
    // Calculate tax and total (10% tax rate)
    const tax = price * 0.1;
    const total = price + tax;
    
    document.getElementById('summaryTax').textContent = '$' + tax.toFixed(2);
    document.getElementById('summaryTotal').textContent = '$' + total.toFixed(2);
    
    // Open modal
    openModal('purchaseModal');
  };
  
  // Purchase form submission
  const purchaseForm = document.getElementById('checkoutForm');
  if (purchaseForm) {
    purchaseForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      const filePrice = parseFloat(document.getElementById('filePrice').value);
      const tax = filePrice * 0.1;
      const total = filePrice + tax;
      
      formData.append('amount', total.toFixed(2));
      formData.append('file_id', document.getElementById('fileId').value);
      
      // Show processing status
      document.getElementById('checkoutForm').style.display = 'none';
      document.getElementById('paymentStatus').style.display = 'block';
      document.getElementById('statusTitle').textContent = 'Processing Payment...';
      document.getElementById('statusMessage').textContent = 'Please wait while we process your payment.';
      
      // Submit payment
      // Add action parameter
      formData.append('action', 'process_payment');
      
      fetch('../processes.php', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          document.getElementById('statusTitle').textContent = 'Payment Successful!';
          document.getElementById('statusMessage').textContent = data.message;
          document.querySelector('.status-icon i').className = 'fas fa-check-circle';
          document.querySelector('.status-icon i').style.color = '#4ade80';
          
          // Show toast notification
          showToast('Payment successful!', 'success');
          
          // Close modal after 5 seconds
          setTimeout(() => {
            closeModal('purchaseModal');
            // Reset form
            document.getElementById('checkoutForm').reset();
            document.getElementById('checkoutForm').style.display = 'block';
            document.getElementById('paymentStatus').style.display = 'none';
          }, 5000);
        } else {
          throw new Error(data.error || 'Payment failed');
        }
      })
      .catch(error => {
        document.getElementById('statusTitle').textContent = 'Payment Failed';
        document.getElementById('statusMessage').textContent = error.message;
        document.querySelector('.status-icon i').className = 'fas fa-times-circle';
        document.querySelector('.status-icon i').style.color = '#f87171';
        
        // Show toast notification
        showToast('Payment failed: ' + error.message, 'error');
        
        // Show retry button
        setTimeout(() => {
          document.getElementById('checkoutForm').style.display = 'block';
          document.getElementById('paymentStatus').style.display = 'none';
        }, 3000);
      });
    });
  }
  
  // ======================
  // PREVIEW FUNCTIONALITY
  // ======================
  
  window.previewResource = function(fileId, fileName, description) {
    const modal = document.getElementById('previewModal');
    if (!modal) return;
    
    const previewTitle = document.getElementById('previewTitle');
    const previewDescription = document.getElementById('previewDescription');
    
    if (previewTitle) previewTitle.textContent = fileName;
    if (previewDescription) {
      previewDescription.textContent = description || `This is a preview of "${fileName}". In the full application, this would show actual content from the resource.`;
    }
    
    openModal('previewModal');
  };
  
  // ======================
  // NOTIFICATION SYSTEM
  // ======================
  
  function showNotification(title, message) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.querySelector('h4').textContent = title;
    notification.querySelector('p').textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
      notification.classList.remove('show');
    }, 5000);
  }
  
  // Manual notification close
  const closeNotificationBtn = document.querySelector('.close-notification');
  if (closeNotificationBtn) {
    closeNotificationBtn.addEventListener('click', function() {
      document.getElementById('notification').classList.remove('show');
    });
  }
  
  // ======================
  // MARKETPLACE FUNCTIONALITY
  // ======================
  
  // Unified search functionality (works for both resourceSearch and categorySearch)
  const searchInput = document.getElementById('resourceSearch') || document.getElementById('categorySearch');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      const table = document.querySelector('.resources-table') || document.querySelector('.files-table');
      
      if (table) {
        table.querySelectorAll('tbody tr').forEach(row => {
          const rowText = row.textContent.toLowerCase();
          row.style.display = rowText.includes(searchTerm) ? '' : 'none';
        });
      }
    });
  }
  
  // Filter functionality
  const resourceFilter = document.getElementById('resourceFilter');
  if (resourceFilter) {
    resourceFilter.addEventListener('change', function() {
      const category = this.value;
      const table = document.querySelector('.resources-table tbody') || document.querySelector('.files-table tbody');
      
      if (table) {
        table.querySelectorAll('tr').forEach(row => {
          if (category === 'all') {
            row.style.display = '';
          } else {
            const rowCategory = row.cells[2]?.textContent.toLowerCase();
            row.style.display = rowCategory?.includes(category) ? '' : 'none';
          }
        });
      }
    });
  }
  
  // Sort functionality
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', function() {
      const table = document.querySelector('.resources-table tbody') || document.querySelector('.files-table tbody');
      if (!table) return;
      
      const rows = Array.from(table.querySelectorAll('tr'));
      
      rows.sort((a, b) => {
        const priceA = parseFloat(a.querySelector('.file-price')?.textContent.replace('$', '') || '0');
        const priceB = parseFloat(b.querySelector('.file-price')?.textContent.replace('$', '') || '0');
        
        switch(this.value) {
          case 'price-low': return priceA - priceB;
          case 'price-high': return priceB - priceA;
          case 'newest': return 0; // Date comparison would go here
          default: return 0;
        }
      });
      
      // Re-insert sorted rows
      rows.forEach(row => table.appendChild(row));
    });
  }
  
  // ======================
  // NAVIGATION MODALS
  // ======================
  
  // Author Profile
  const viewProfileBtn = document.getElementById('viewProfileBtn');
  if (viewProfileBtn) {
    viewProfileBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openModal('authorModal');
    });
  }
  
  // Blog Modal
  const blogLink = document.getElementById('blogLink');
  if (blogLink) {
    blogLink.addEventListener('click', function(e) {
      e.preventDefault();
      openModal('blogModal');
    });
  }
  
  // About Modal
  const aboutLink = document.getElementById('aboutLink');
  if (aboutLink) {
    aboutLink.addEventListener('click', function(e) {
      e.preventDefault();
      openModal('aboutModal');
    });
  }
  
  // Contact Modal
  const contactLink = document.getElementById('contactLink');
  if (contactLink) {
    contactLink.addEventListener('click', function(e) {
      e.preventDefault();
      openModal('contactModal');
    });
  }
  
  // Contact Form Submission
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      // Form submission is handled in modal_contact.php
    });
  }
  
  // ======================
  // PAGINATION
  // ======================
  
  document.querySelectorAll('.page-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Update active state
      document.querySelectorAll('.page-link').forEach(el => {
        el.classList.remove('active');
      });
      
      if (!this.querySelector('i')) {
        this.classList.add('active');
      }
      
      // In real app: Load new page content
    });
  });
  
  // ======================
  // LEVEL CARDS (Homepage)
  // ======================
  
// Enhanced level card interactions
document.querySelectorAll('.level-card').forEach(card => {
    // Click handler
    card.addEventListener('click', function() {
        const level = this.querySelector('h3').textContent.toLowerCase();
        window.location.href = `pages/marketplace.php?level=${level}`;
    });
    
    // Keyboard accessibility
    card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
        }
    });
    
    // Hover effects for touch devices
    card.addEventListener('touchstart', function() {
        this.classList.add('hover-effect');
    }, {passive: true});
    
    card.addEventListener('touchend', function() {
        this.classList.remove('hover-effect');
    }, {passive: true});
});
  
  // ======================
  // PUSH NOTIFICATIONS
  // ======================
  
  setTimeout(() => {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      if (confirm("Would you like to receive notifications about your purchases?")) {
        Notification.requestPermission();
      }
    }
  }, 3000);
});