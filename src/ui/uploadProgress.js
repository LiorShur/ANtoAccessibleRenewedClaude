/**
 * Upload Progress Modal
 * 
 * Shows a beautiful modal with upload animation, progress bar,
 * and detailed status during cloud saves.
 */

class UploadProgressModal {
  constructor() {
    this.modal = null;
    this.isVisible = false;
    this.currentProgress = 0;
    this.stages = [];
    this.currentStage = 0;
  }

  /**
   * Create the modal DOM element
   */
  createModal() {
    if (this.modal) return;

    this.modal = document.createElement('div');
    this.modal.id = 'uploadProgressModal';
    this.modal.className = 'upload-progress-modal';
    this.modal.innerHTML = `
      <div class="upload-progress-backdrop"></div>
      <div class="upload-progress-content">
        <div class="upload-progress-header">
          <div class="upload-progress-icon">
            <svg class="upload-cloud-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 16v-8m0 0l-3 3m3-3l3 3"/>
              <path d="M20 16.2A4.5 4.5 0 0017.5 8h-1.8A7 7 0 104 14.9"/>
            </svg>
            <div class="upload-pulse"></div>
          </div>
          <h3 class="upload-progress-title">Uploading to Cloud</h3>
        </div>
        
        <div class="upload-progress-bar-container">
          <div class="upload-progress-bar">
            <div class="upload-progress-fill" id="uploadProgressFill"></div>
          </div>
          <span class="upload-progress-percent" id="uploadProgressPercent">0%</span>
        </div>
        
        <div class="upload-progress-stages" id="uploadProgressStages">
          <!-- Stages will be inserted here -->
        </div>
        
        <div class="upload-progress-status" id="uploadProgressStatus">
          Preparing...
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .upload-progress-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10010;
        align-items: center;
        justify-content: center;
      }
      
      .upload-progress-modal.visible {
        display: flex;
      }
      
      .upload-progress-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
      }
      
      .upload-progress-content {
        position: relative;
        background: white;
        border-radius: 16px;
        padding: 32px;
        width: 90%;
        max-width: 380px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: uploadModalIn 0.3s ease-out;
      }
      
      @keyframes uploadModalIn {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      
      .upload-progress-header {
        text-align: center;
        margin-bottom: 24px;
      }
      
      .upload-progress-icon {
        position: relative;
        width: 64px;
        height: 64px;
        margin: 0 auto 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .upload-cloud-icon {
        width: 48px;
        height: 48px;
        color: #2e7d32;
        animation: uploadBounce 1s ease-in-out infinite;
      }
      
      @keyframes uploadBounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
      
      .upload-pulse {
        position: absolute;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(46, 125, 50, 0.2);
        animation: uploadPulse 1.5s ease-out infinite;
      }
      
      @keyframes uploadPulse {
        0% {
          transform: scale(0.8);
          opacity: 1;
        }
        100% {
          transform: scale(1.5);
          opacity: 0;
        }
      }
      
      .upload-progress-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1a1a1a;
        margin: 0;
      }
      
      .upload-progress-bar-container {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 24px;
      }
      
      .upload-progress-bar {
        flex: 1;
        height: 8px;
        background: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .upload-progress-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #2e7d32, #4caf50);
        border-radius: 4px;
        transition: width 0.3s ease;
      }
      
      .upload-progress-percent {
        font-size: 0.9rem;
        font-weight: 600;
        color: #2e7d32;
        min-width: 45px;
        text-align: right;
      }
      
      .upload-progress-stages {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 20px;
      }
      
      .upload-stage {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border-radius: 8px;
        background: #f5f5f5;
        font-size: 0.9rem;
        color: #666;
        transition: all 0.3s ease;
      }
      
      .upload-stage.active {
        background: #e8f5e9;
        color: #2e7d32;
      }
      
      .upload-stage.completed {
        background: #e8f5e9;
        color: #1b5e20;
      }
      
      .upload-stage.error {
        background: #ffebee;
        color: #c62828;
      }
      
      .upload-stage-icon {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      }
      
      .upload-stage.active .upload-stage-icon {
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .upload-stage-text {
        flex: 1;
      }
      
      .upload-stage-detail {
        font-size: 0.8rem;
        opacity: 0.7;
      }
      
      .upload-progress-status {
        text-align: center;
        font-size: 0.85rem;
        color: #666;
        padding: 12px;
        background: #fafafa;
        border-radius: 8px;
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .upload-progress-content {
          background: #1e1e1e;
        }
        
        .upload-progress-title {
          color: #ffffff;
        }
        
        .upload-progress-bar {
          background: #333;
        }
        
        .upload-stage {
          background: #2a2a2a;
          color: #aaa;
        }
        
        .upload-stage.active,
        .upload-stage.completed {
          background: rgba(46, 125, 50, 0.2);
        }
        
        .upload-progress-status {
          background: #2a2a2a;
          color: #aaa;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(this.modal);
  }

  /**
   * Show the modal with initial stages
   * @param {string} title - Modal title
   * @param {Array} stages - Array of {id, label} objects
   */
  show(title = 'Uploading to Cloud', stages = []) {
    this.createModal();
    
    this.stages = stages;
    this.currentStage = 0;
    this.currentProgress = 0;
    
    // Update title
    const titleEl = this.modal.querySelector('.upload-progress-title');
    if (titleEl) titleEl.textContent = title;
    
    // Render stages
    const stagesEl = document.getElementById('uploadProgressStages');
    if (stagesEl) {
      stagesEl.innerHTML = stages.map((stage, index) => `
        <div class="upload-stage" id="uploadStage-${stage.id}" data-index="${index}">
          <span class="upload-stage-icon">○</span>
          <span class="upload-stage-text">${stage.label}</span>
          <span class="upload-stage-detail" id="uploadStageDetail-${stage.id}"></span>
        </div>
      `).join('');
    }
    
    // Reset progress
    this.setProgress(0);
    this.setStatus('Preparing...');
    
    // Show modal
    this.modal.classList.add('visible');
    this.isVisible = true;
  }

  /**
   * Hide the modal
   * @param {number} delay - Delay in ms before hiding
   */
  hide(delay = 0) {
    setTimeout(() => {
      if (this.modal) {
        this.modal.classList.remove('visible');
        this.isVisible = false;
      }
    }, delay);
  }

  /**
   * Set overall progress
   * @param {number} percent - 0-100
   */
  setProgress(percent) {
    this.currentProgress = Math.min(100, Math.max(0, percent));
    
    const fillEl = document.getElementById('uploadProgressFill');
    const percentEl = document.getElementById('uploadProgressPercent');
    
    if (fillEl) fillEl.style.width = `${this.currentProgress}%`;
    if (percentEl) percentEl.textContent = `${Math.round(this.currentProgress)}%`;
  }

  /**
   * Set status text
   * @param {string} text - Status message
   */
  setStatus(text) {
    const statusEl = document.getElementById('uploadProgressStatus');
    if (statusEl) statusEl.textContent = text;
  }

  /**
   * Mark a stage as active
   * @param {string} stageId - Stage ID
   * @param {string} detail - Optional detail text
   */
  setStageActive(stageId, detail = '') {
    const stageEl = document.getElementById(`uploadStage-${stageId}`);
    if (stageEl) {
      // Remove active from all stages
      document.querySelectorAll('.upload-stage').forEach(el => el.classList.remove('active'));
      
      stageEl.classList.add('active');
      stageEl.querySelector('.upload-stage-icon').textContent = '⟳';
      
      const detailEl = document.getElementById(`uploadStageDetail-${stageId}`);
      if (detailEl) detailEl.textContent = detail;
    }
  }

  /**
   * Mark a stage as completed
   * @param {string} stageId - Stage ID
   * @param {string} detail - Optional detail text
   */
  setStageCompleted(stageId, detail = '') {
    const stageEl = document.getElementById(`uploadStage-${stageId}`);
    if (stageEl) {
      stageEl.classList.remove('active');
      stageEl.classList.add('completed');
      stageEl.querySelector('.upload-stage-icon').textContent = '✓';
      
      const detailEl = document.getElementById(`uploadStageDetail-${stageId}`);
      if (detailEl) detailEl.textContent = detail;
    }
  }

  /**
   * Mark a stage as error
   * @param {string} stageId - Stage ID
   * @param {string} detail - Error detail
   */
  setStageError(stageId, detail = '') {
    const stageEl = document.getElementById(`uploadStage-${stageId}`);
    if (stageEl) {
      stageEl.classList.remove('active');
      stageEl.classList.add('error');
      stageEl.querySelector('.upload-stage-icon').textContent = '✗';
      
      const detailEl = document.getElementById(`uploadStageDetail-${stageId}`);
      if (detailEl) detailEl.textContent = detail;
    }
  }

  /**
   * Update photo upload progress
   * @param {number} current - Current photo number
   * @param {number} total - Total photos
   * @param {number} baseProgress - Base progress percent before photos
   * @param {number} photoProgressWeight - How much progress photos represent (0-100)
   */
  updatePhotoProgress(current, total, baseProgress = 10, photoProgressWeight = 50) {
    const photoProgress = (current / total) * photoProgressWeight;
    this.setProgress(baseProgress + photoProgress);
    this.setStageActive('photos', `${current}/${total}`);
    this.setStatus(`Uploading photo ${current} of ${total}...`);
  }

  /**
   * Show success state
   * @param {string} message - Success message
   */
  showSuccess(message = 'Upload complete!') {
    this.setProgress(100);
    this.setStatus(message);
    
    // Update icon to checkmark
    const iconContainer = this.modal.querySelector('.upload-progress-icon');
    if (iconContainer) {
      iconContainer.innerHTML = `
        <svg class="upload-cloud-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: none; color: #2e7d32;">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      `;
    }
    
    // Update title
    const titleEl = this.modal.querySelector('.upload-progress-title');
    if (titleEl) titleEl.textContent = 'Upload Complete!';
  }

  /**
   * Show error state
   * @param {string} message - Error message
   */
  showError(message = 'Upload failed') {
    this.setStatus(message);
    
    // Update icon to error
    const iconContainer = this.modal.querySelector('.upload-progress-icon');
    if (iconContainer) {
      iconContainer.innerHTML = `
        <svg class="upload-cloud-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: none; color: #c62828;">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      `;
    }
    
    // Update title
    const titleEl = this.modal.querySelector('.upload-progress-title');
    if (titleEl) titleEl.textContent = 'Upload Failed';
  }
}

// Export singleton
export const uploadProgress = new UploadProgressModal();
