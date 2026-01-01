// FIXED: Timer functionality with proper resume support
export class TimerController {
  constructor() {
    this.startTime = null;
    this.elapsedTime = 0;
    this.isRunning = false;
    this.intervalId = null;
    this.pausedTime = 0;
  }

  initialize() {
    this.element = document.getElementById('timer');
    this.updateDisplay();
    console.log('✅ Timer controller initialized');
  }

  // FIXED: Start with optional elapsed time for restoration
  start(resumeFromElapsed = 0) {
  if (this.isRunning) return;

  console.log(`⏱️ Timer starting${resumeFromElapsed > 0 ? ` (resuming from ${this.formatTime(resumeFromElapsed)})` : ''}`);
  
  // Set the elapsed time first
  this.elapsedTime = resumeFromElapsed;
  
  // Set start time accounting for already elapsed time
  this.startTime = Date.now() - resumeFromElapsed;
  this.isRunning = true;
  
  this.timerInterval = setInterval(() => {
    this.updateTimer();  // Use your existing method name
    this.updateDisplay();
  }, 1000);
  
  this.updateDisplay();
}

  // FIXED: Stop and return final elapsed time
  stop() {
  if (!this.isRunning) return this.elapsedTime;

  this.isRunning = false;
  if (this.timerInterval) {  // Changed from intervalId to timerInterval
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }

  // Calculate final elapsed time
  this.elapsedTime = Date.now() - this.startTime;
  console.log(`⏱️ Timer stopped at: ${this.formatTime(this.elapsedTime)}`);
  
  return this.elapsedTime;
}

  // FIXED: Pause preserving elapsed time
  pause() {
  if (!this.isRunning) return;

  this.isRunning = false;
  if (this.timerInterval) {  // Changed from intervalId to timerInterval
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }

  // Save elapsed time at pause
  this.elapsedTime = Date.now() - this.startTime;
  console.log(`⏸️ Timer paused at: ${this.formatTime(this.elapsedTime)}`);
}

  // FIXED: Resume from paused elapsed time
  resume() {
    if (this.isRunning) return;

    console.log(`▶️ Timer resuming from: ${this.formatTime(this.elapsedTime)}`);
    
    // Restart timer from current elapsed time
    this.start(this.elapsedTime);
  }

  // NEW: Get current elapsed time
  getCurrentElapsed() {
    if (this.isRunning) {
      return Date.now() - this.startTime;
    }
    return this.elapsedTime;
  }

  // NEW: Set elapsed time (for restoration)
  setElapsedTime(elapsed) {
    this.elapsedTime = elapsed;
    this.updateDisplay();
    console.log(`⏱️ Timer set to: ${this.formatTime(elapsed)}`);
  }

  updateTimer() {
    if (!this.isRunning) return;

    this.elapsedTime = Date.now() - this.startTime;
    this.updateDisplay();
  }

  updateDisplay() {
    if (!this.element) return;

    this.element.textContent = this.formatTime(this.elapsedTime);
  }

  formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

  // NEW: Reset timer completely
  reset() {
    this.stop();
    this.elapsedTime = 0;
    this.startTime = null;
    this.updateDisplay();
    console.log('🔄 Timer reset');
  }

  getElapsedTime() {
    return this.getCurrentElapsed();
  }

  isTimerRunning() {
    return this.isRunning;
  }
}