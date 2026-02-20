// Beautiful animated notifications system

function showNotification(message, type = 'info', duration = 4000) {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  
  const icon = getIcon(type);
  
  notification.innerHTML = `
    <div class="notification-icon">${icon}</div>
    <div class="notification-content">
      <div class="notification-message">${message}</div>
    </div>
    <button class="notification-close" onclick="this.parentElement.remove()">✕</button>
  `;
  
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Auto remove
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

function getIcon(type) {
  const icons = {
    'success': '✓',
    'error': '✕',
    'warning': '⚠',
    'info': 'ℹ'
  };
  return icons[type] || icons.info;
}

// Convenience functions
function showSuccess(message, duration) {
  showNotification(message, 'success', duration);
}

function showError(message, duration) {
  showNotification(message, 'error', duration);
}

function showWarning(message, duration) {
  showNotification(message, 'warning', duration);
}

function showInfo(message, duration) {
  showNotification(message, 'info', duration);
}
