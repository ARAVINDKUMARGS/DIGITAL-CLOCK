/**
 * ============================================================================
 * ChronoLuxe • Premium Digital Clock & Dashboard Engine
 * SpireX Foundation Internship - Task 6
 * Technology: Pure Vanilla JavaScript (Modular, Clean, Zero Dependencies)
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // ==========================================================================
  // 1. Audio Engine (Pure Web Audio API - Zero External Files)
  // ==========================================================================
  const AudioEngine = {
    ctx: null,
    alarmInterval: null,

    init() {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },

    playTick() {
      if (!State.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(950, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.02);

        gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.02);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.025);
      } catch (err) {
        console.warn('Audio tick error:', err);
      }
    },

    playBeep(freq = 600, duration = 0.08) {
      if (!State.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    },

    startAlarmChime() {
      this.init();
      this.stopAlarmChime();

      const playChord = () => {
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.12);

            gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.12 + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + idx * 0.12);
            osc.stop(this.ctx.currentTime + idx * 0.12 + 0.4);
          } catch (e) {}
        });
      };

      playChord();
      this.alarmInterval = setInterval(playChord, 1200);
    },

    stopAlarmChime() {
      if (this.alarmInterval) {
        clearInterval(this.alarmInterval);
        this.alarmInterval = null;
      }
    }
  };

  // ==========================================================================
  // 2. State & Storage Manager
  // ==========================================================================
  const State = {
    is24Hour: localStorage.getItem('chrono_24h') === 'true',
    soundEnabled: localStorage.getItem('chrono_sound') !== 'false',
    theme: localStorage.getItem('chrono_theme') || 'cyan',
    mode: localStorage.getItem('chrono_mode') || 'dark',
    alarms: JSON.parse(localStorage.getItem('chrono_alarms') || '[]'),
    worldClocks: JSON.parse(localStorage.getItem('chrono_world_clocks') || 'null'),

    save() {
      localStorage.setItem('chrono_24h', String(this.is24Hour));
      localStorage.setItem('chrono_sound', String(this.soundEnabled));
      localStorage.setItem('chrono_theme', this.theme);
      localStorage.setItem('chrono_mode', this.mode);
      localStorage.setItem('chrono_alarms', JSON.stringify(this.alarms));
      localStorage.setItem('chrono_world_clocks', JSON.stringify(this.worldClocks));
    }
  };

  // Default world clocks if none saved
  if (!State.worldClocks || !State.worldClocks.length) {
    State.worldClocks = [
      { id: 'nyc', timezone: 'America/New_York', city: 'New York', country: 'USA' },
      { id: 'ldn', timezone: 'Europe/London', city: 'London', country: 'UK' },
      { id: 'prs', timezone: 'Europe/Paris', city: 'Paris', country: 'France' },
      { id: 'dxb', timezone: 'Asia/Dubai', city: 'Dubai', country: 'UAE' },
      { id: 'tky', timezone: 'Asia/Tokyo', city: 'Tokyo', country: 'Japan' },
      { id: 'syd', timezone: 'Australia/Sydney', city: 'Sydney', country: 'Australia' }
    ];
    State.save();
  }

  // Default sample alarms if empty
  if (!State.alarms || !State.alarms.length) {
    State.alarms = [
      { id: 'alm_1', time: '07:30', label: 'Morning Standup', days: [1, 2, 3, 4, 5], enabled: true },
      { id: 'alm_2', time: '13:00', label: 'Lunch Break & Walk', days: [1, 2, 3, 4, 5, 6], enabled: true }
    ];
    State.save();
  }

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // ==========================================================================
  // 3. Clock Engine (Digital, Analog, Greeting, Progress)
  // ==========================================================================
  const ClockEngine = {
    hoursEl: document.getElementById('clock-hours'),
    minutesEl: document.getElementById('clock-minutes'),
    secondsEl: document.getElementById('clock-seconds'),
    ampmEl: document.getElementById('clock-ampm'),
    modeIndicatorEl: document.getElementById('clock-mode-indicator'),
    heroDayEl: document.getElementById('hero-day-badge'),
    heroTimezoneEl: document.getElementById('hero-timezone-text'),
    heroFullDateEl: document.getElementById('hero-full-date'),
    minuteProgressEl: document.getElementById('minute-progress-bar'),
    dayProgressFillEl: document.getElementById('day-progress-fill'),
    dayProgressPctEl: document.getElementById('day-progress-pct'),

    // Analog Hands
    analogHourHand: document.getElementById('analog-hour-hand'),
    analogMinuteHand: document.getElementById('analog-minute-hand'),
    analogSecondHand: document.getElementById('analog-second-hand'),

    // Greeting Elements
    greetingTextEl: document.getElementById('greeting-text'),
    greetingIconEl: document.getElementById('greeting-icon'),

    init() {
      this.detectLocalTimezone();
      this.update();
      setInterval(() => this.update(), 1000);
    },

    detectLocalTimezone() {
      try {
        const timeZoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const offsetMinutes = -new Date().getTimezoneOffset();
        const sign = offsetMinutes >= 0 ? '+' : '-';
        const absMins = Math.abs(offsetMinutes);
        const hrs = String(Math.floor(absMins / 60)).padStart(2, '0');
        const mins = String(absMins % 60).padStart(2, '0');
        this.heroTimezoneEl.textContent = `UTC${sign}${hrs}:${mins} • ${timeZoneName}`;
      } catch (e) {
        this.heroTimezoneEl.textContent = 'Local System Time';
      }
    },

    update() {
      const now = new Date();
      const rawHours = now.getHours();
      const rawMinutes = now.getMinutes();
      const rawSeconds = now.getSeconds();
      const rawMilliseconds = now.getMilliseconds();

      // 1. Digital Clock Formatting
      let displayHours = rawHours;
      let ampm = '';

      if (State.is24Hour) {
        ampm = '24H';
        this.modeIndicatorEl.textContent = 'MODE';
      } else {
        ampm = rawHours >= 12 ? 'PM' : 'AM';
        displayHours = rawHours % 12 || 12;
        this.modeIndicatorEl.textContent = '12H';
      }

      this.hoursEl.textContent = String(displayHours).padStart(2, '0');
      this.minutesEl.textContent = String(rawMinutes).padStart(2, '0');
      this.secondsEl.textContent = String(rawSeconds).padStart(2, '0');
      this.ampmEl.textContent = ampm;

      // 2. Full Date & Day Badge
      const dayName = DAYS[now.getDay()];
      const monthName = MONTHS[now.getMonth()];
      const dateNum = now.getDate();
      const yearNum = now.getFullYear();

      this.heroDayEl.textContent = dayName.toUpperCase();
      this.heroFullDateEl.textContent = `${dayName}, ${monthName} ${dateNum}, ${yearNum}`;

      // 3. Dynamic Greeting
      this.updateGreeting(rawHours);

      // 4. Analog Clock Hands
      const secondDeg = rawSeconds * 6;
      const minuteDeg = rawMinutes * 6 + (rawSeconds * 0.1);
      const hourDeg = (rawHours % 12) * 30 + (rawMinutes * 0.5);

      if (this.analogSecondHand) this.analogSecondHand.style.transform = `rotate(${secondDeg}deg)`;
      if (this.analogMinuteHand) this.analogMinuteHand.style.transform = `rotate(${minuteDeg}deg)`;
      if (this.analogHourHand) this.analogHourHand.style.transform = `rotate(${hourDeg}deg)`;

      // 5. Minute Progress Bar (0 to 59 seconds)
      const minutePct = ((rawSeconds + 1) / 60) * 100;
      if (this.minuteProgressEl) {
        this.minuteProgressEl.style.width = `${minutePct}%`;
      }

      // 6. Day Progress (00:00 to 23:59)
      const totalSecondsInDay = 86400;
      const currentSeconds = rawHours * 3600 + rawMinutes * 60 + rawSeconds;
      const dayPct = Math.round((currentSeconds / totalSecondsInDay) * 100);
      if (this.dayProgressFillEl) this.dayProgressFillEl.style.width = `${dayPct}%`;
      if (this.dayProgressPctEl) this.dayProgressPctEl.textContent = `${dayPct}%`;

      // 7. Check Alarms
      AlarmManager.checkAlarms(now, rawHours, rawMinutes, rawSeconds);

      // 8. Update World Clocks Live
      WorldClockManager.updateAllTimes();

      // 9. Subtle Audio Tick
      AudioEngine.playTick();
    },

    updateGreeting(hour) {
      let greeting = 'Good Morning';
      let icon = '🌅';

      if (hour >= 5 && hour < 12) {
        greeting = 'Good Morning';
        icon = '🌅';
      } else if (hour >= 12 && hour < 17) {
        greeting = 'Good Afternoon';
        icon = '☀️';
      } else if (hour >= 17 && hour < 21) {
        greeting = 'Good Evening';
        icon = '🌆';
      } else {
        greeting = 'Good Night';
        icon = '🌙';
      }

      if (this.greetingTextEl) this.greetingTextEl.textContent = `${greeting}, Explorer`;
      if (this.greetingIconEl) this.greetingIconEl.textContent = icon;
    }
  };

  // ==========================================================================
  // 4. World Clock Manager
  // ==========================================================================
  const WorldClockManager = {
    gridEl: document.getElementById('world-clocks-grid'),
    selectEl: document.getElementById('world-timezone-select'),
    addBtn: document.getElementById('add-world-clock-btn'),

    init() {
      this.render();
      if (this.addBtn) {
        this.addBtn.addEventListener('click', () => this.addCity());
      }
    },

    render() {
      if (!this.gridEl) return;
      this.gridEl.innerHTML = '';

      State.worldClocks.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'world-card';
        card.id = `world-card-${item.id}`;

        card.innerHTML = `
          <div class="world-card-top">
            <div>
              <div class="world-city">${item.city}</div>
              <div class="world-country">${item.country}</div>
            </div>
            <button type="button" class="world-card-delete-btn" data-id="${item.id}" title="Remove Clock">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="world-time-readout" id="world-time-${item.id}">--:--:--</div>
          <div class="world-card-bottom">
            <span id="world-date-${item.id}">--</span>
            <span class="world-offset-badge" id="world-offset-${item.id}">--</span>
          </div>
        `;

        this.gridEl.appendChild(card);
      });

      // Attach delete listeners
      this.gridEl.querySelectorAll('.world-card-delete-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          this.removeCity(id);
        });
      });

      this.updateAllTimes();
    },

    updateAllTimes() {
      const now = new Date();

      State.worldClocks.forEach((item) => {
        try {
          const options = {
            timeZone: item.timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: !State.is24Hour
          };

          const timeFormatter = new Intl.DateTimeFormat('en-US', options);
          const timeParts = timeFormatter.format(now);

          const dateFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: item.timezone,
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          });
          const dateParts = dateFormatter.format(now);

          // Calculate approximate hours difference from local
          const localOffset = -now.getTimezoneOffset(); // in minutes
          // Use formatToParts to get foreign hour
          const foreignDate = new Date(now.toLocaleString('en-US', { timeZone: item.timezone }));
          const diffHours = Math.round((foreignDate.getTime() - now.getTime()) / (1000 * 60 * 60));
          const diffText = diffHours === 0 ? 'Same time' : diffHours > 0 ? `+${diffHours}h ahead` : `${diffHours}h behind`;

          const timeEl = document.getElementById(`world-time-${item.id}`);
          const dateEl = document.getElementById(`world-date-${item.id}`);
          const offsetEl = document.getElementById(`world-offset-${item.id}`);

          if (timeEl) timeEl.textContent = timeParts;
          if (dateEl) dateEl.textContent = dateParts;
          if (offsetEl) offsetEl.textContent = diffText;
        } catch (err) {
          console.warn(`Timezone format error for ${item.timezone}:`, err);
        }
      });
    },

    addCity() {
      const val = this.selectEl.value;
      if (!val) {
        alert('Please select a time zone from the list.');
        return;
      }

      const [timezone, city, country] = val.split('|');
      const id = 'city_' + Date.now();

      // Check if already exists
      const exists = State.worldClocks.some((c) => c.timezone === timezone);
      if (exists) {
        alert(`${city} is already in your world clocks list.`);
        return;
      }

      State.worldClocks.push({ id, timezone, city, country });
      State.save();
      this.render();
      this.selectEl.value = '';
      AudioEngine.playBeep(800, 0.05);
    },

    removeCity(id) {
      State.worldClocks = State.worldClocks.filter((c) => c.id !== id);
      State.save();
      this.render();
      AudioEngine.playBeep(450, 0.05);
    }
  };

  // ==========================================================================
  // 5. Stopwatch Engine (High Precision with Laps)
  // ==========================================================================
  const StopwatchEngine = {
    displayEl: document.getElementById('stopwatch-display'),
    startBtn: document.getElementById('stopwatch-start-btn'),
    pauseBtn: document.getElementById('stopwatch-pause-btn'),
    lapBtn: document.getElementById('stopwatch-lap-btn'),
    resetBtn: document.getElementById('stopwatch-reset-btn'),
    lapsListEl: document.getElementById('stopwatch-laps-list'),
    lapsCountEl: document.getElementById('laps-count'),
    clearLapsBtn: document.getElementById('clear-laps-btn'),

    startTime: 0,
    elapsedTime: 0,
    timerInterval: null,
    isRunning: false,
    laps: [],

    init() {
      this.startBtn.addEventListener('click', () => this.start());
      this.pauseBtn.addEventListener('click', () => this.pause());
      this.lapBtn.addEventListener('click', () => this.recordLap());
      this.resetBtn.addEventListener('click', () => this.reset());
      this.clearLapsBtn.addEventListener('click', () => this.clearLaps());
    },

    formatTime(ms) {
      const hours = Math.floor(ms / 3600000);
      const minutes = Math.floor((ms % 3600000) / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      const centiseconds = Math.floor((ms % 1000) / 10);

      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
    },

    start() {
      this.isRunning = true;
      this.startTime = Date.now() - this.elapsedTime;
      this.timerInterval = setInterval(() => {
        this.elapsedTime = Date.now() - this.startTime;
        this.displayEl.textContent = this.formatTime(this.elapsedTime);
      }, 10);

      this.startBtn.classList.add('hidden');
      this.pauseBtn.classList.remove('hidden');
      this.lapBtn.disabled = false;
      this.resetBtn.disabled = false;
      AudioEngine.playBeep(700, 0.05);
    },

    pause() {
      this.isRunning = false;
      clearInterval(this.timerInterval);
      this.startBtn.classList.remove('hidden');
      this.pauseBtn.classList.add('hidden');
      this.startBtn.textContent = 'Resume';
      AudioEngine.playBeep(550, 0.05);
    },

    reset() {
      this.isRunning = false;
      clearInterval(this.timerInterval);
      this.elapsedTime = 0;
      this.displayEl.textContent = '00:00:00.00';
      this.startBtn.classList.remove('hidden');
      this.pauseBtn.classList.add('hidden');
      this.startBtn.textContent = 'Start';
      this.lapBtn.disabled = true;
      this.resetBtn.disabled = true;
      AudioEngine.playBeep(400, 0.08);
    },

    recordLap() {
      if (!this.isRunning) return;
      const lapTime = this.elapsedTime;
      const lastLapTime = this.laps.length > 0 ? this.laps[0].totalMs : 0;
      const splitTime = lapTime - lastLapTime;

      this.laps.unshift({
        num: this.laps.length + 1,
        splitMs: splitTime,
        totalMs: lapTime,
        splitFormatted: this.formatTime(splitTime),
        totalFormatted: this.formatTime(lapTime)
      });

      this.renderLaps();
      AudioEngine.playBeep(850, 0.04);
    },

    renderLaps() {
      this.lapsCountEl.textContent = this.laps.length;
      this.clearLapsBtn.disabled = this.laps.length === 0;

      if (this.laps.length === 0) {
        this.lapsListEl.innerHTML = '<div class="empty-laps-state">Press "Lap" while running to record split times.</div>';
        return;
      }

      // Identify fastest and slowest split times
      let fastestIdx = -1;
      let slowestIdx = -1;
      if (this.laps.length > 1) {
        let min = Infinity;
        let max = -Infinity;
        this.laps.forEach((lap, idx) => {
          if (lap.splitMs < min) { min = lap.splitMs; fastestIdx = idx; }
          if (lap.splitMs > max) { max = lap.splitMs; slowestIdx = idx; }
        });
      }

      this.lapsListEl.innerHTML = this.laps.map((lap, idx) => {
        let tagClass = '';
        if (idx === fastestIdx) tagClass = 'fastest';
        if (idx === slowestIdx) tagClass = 'slowest';

        return `
          <div class="lap-item ${tagClass}">
            <span>Lap #${lap.num}</span>
            <span>+${lap.splitFormatted}</span>
            <span>${lap.totalFormatted}</span>
          </div>
        `;
      }).join('');
    },

    clearLaps() {
      this.laps = [];
      this.renderLaps();
      AudioEngine.playBeep(450, 0.05);
    }
  };

  // ==========================================================================
  // 6. Countdown Timer Engine
  // ==========================================================================
  const TimerEngine = {
    digitsEl: document.getElementById('timer-digits-display'),
    statusEl: document.getElementById('timer-status-text'),
    progressRing: document.getElementById('timer-progress-ring'),
    hoursInput: document.getElementById('timer-input-hours'),
    minutesInput: document.getElementById('timer-input-minutes'),
    secondsInput: document.getElementById('timer-input-seconds'),
    startBtn: document.getElementById('timer-start-btn'),
    pauseBtn: document.getElementById('timer-pause-btn'),
    resetBtn: document.getElementById('timer-reset-btn'),

    totalSeconds: 300,
    remainingSeconds: 300,
    interval: null,
    isRunning: false,
    circumference: 2 * Math.PI * 105, // r = 105 -> ~659.73

    init() {
      this.progressRing.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
      this.progressRing.style.strokeDashoffset = 0;

      this.startBtn.addEventListener('click', () => this.start());
      this.pauseBtn.addEventListener('click', () => this.pause());
      this.resetBtn.addEventListener('click', () => this.reset());

      // Quick Presets
      document.querySelectorAll('.preset-pill').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const secs = parseInt(e.currentTarget.dataset.seconds, 10);
          this.setFromSeconds(secs);
          AudioEngine.playBeep(650, 0.04);
        });
      });

      // Synchronize inputs
      [this.hoursInput, this.minutesInput, this.secondsInput].forEach((input) => {
        input.addEventListener('change', () => this.readInputs());
      });

      this.readInputs();
    },

    setFromSeconds(total) {
      if (this.isRunning) this.pause();
      const hrs = Math.floor(total / 3600);
      const mins = Math.floor((total % 3600) / 60);
      const secs = total % 60;

      this.hoursInput.value = hrs;
      this.minutesInput.value = mins;
      this.secondsInput.value = secs;

      this.totalSeconds = total;
      this.remainingSeconds = total;
      this.updateDisplay();
    },

    readInputs() {
      const h = Math.max(0, parseInt(this.hoursInput.value, 10) || 0);
      const m = Math.max(0, Math.min(59, parseInt(this.minutesInput.value, 10) || 0));
      const s = Math.max(0, Math.min(59, parseInt(this.secondsInput.value, 10) || 0));

      this.totalSeconds = h * 3600 + m * 60 + s;
      if (this.totalSeconds <= 0) this.totalSeconds = 60;
      this.remainingSeconds = this.totalSeconds;
      this.updateDisplay();
    },

    updateDisplay() {
      const hrs = Math.floor(this.remainingSeconds / 3600);
      const mins = Math.floor((this.remainingSeconds % 3600) / 60);
      const secs = this.remainingSeconds % 60;

      this.digitsEl.textContent = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      // Progress Ring calculation
      const progressFraction = this.totalSeconds > 0 ? this.remainingSeconds / this.totalSeconds : 0;
      const offset = this.circumference - (progressFraction * this.circumference);
      this.progressRing.style.strokeDashoffset = offset;
    },

    start() {
      if (this.remainingSeconds <= 0) this.readInputs();
      this.isRunning = true;
      this.statusEl.textContent = 'Counting Down';

      this.startBtn.classList.add('hidden');
      this.pauseBtn.classList.remove('hidden');

      this.interval = setInterval(() => {
        if (this.remainingSeconds > 0) {
          this.remainingSeconds--;
          this.updateDisplay();
        } else {
          this.finish();
        }
      }, 1000);

      AudioEngine.playBeep(700, 0.05);
    },

    pause() {
      this.isRunning = false;
      clearInterval(this.interval);
      this.statusEl.textContent = 'Paused';
      this.startBtn.classList.remove('hidden');
      this.pauseBtn.classList.add('hidden');
      AudioEngine.playBeep(500, 0.05);
    },

    reset() {
      this.pause();
      this.readInputs();
      this.statusEl.textContent = 'Ready';
      AudioEngine.playBeep(400, 0.08);
    },

    finish() {
      this.pause();
      this.statusEl.textContent = 'Completed!';
      this.progressRing.style.strokeDashoffset = this.circumference;
      
      // Trigger Alarm Chime & Modal
      AlarmManager.triggerAlert('Timer Finished!', 'Your countdown timer has reached zero.');
    }
  };

  // ==========================================================================
  // 7. Alarm Manager Engine
  // ==========================================================================
  const AlarmManager = {
    gridEl: document.getElementById('alarms-list-container'),
    badgeEl: document.getElementById('active-alarms-badge'),
    openModalBtn: document.getElementById('open-alarm-modal-btn'),
    closeModalBtn: document.getElementById('close-alarm-modal-btn'),
    cancelBtn: document.getElementById('cancel-alarm-btn'),
    modalEl: document.getElementById('alarm-modal'),
    formEl: document.getElementById('alarm-form'),
    editIdInput: document.getElementById('alarm-edit-id'),
    timeInput: document.getElementById('alarm-time-input'),
    labelInput: document.getElementById('alarm-label-input'),
    modalTitle: document.getElementById('alarm-modal-title'),

    // Ringing Modal
    ringingModal: document.getElementById('ringing-modal'),
    ringingTitle: document.getElementById('ringing-title'),
    ringingMessage: document.getElementById('ringing-message'),
    dismissBtn: document.getElementById('dismiss-alarm-btn'),
    snoozeBtn: document.getElementById('snooze-alarm-btn'),

    lastFiredMinute: -1,

    init() {
      this.render();

      this.openModalBtn.addEventListener('click', () => this.openAddModal());
      this.closeModalBtn.addEventListener('click', () => this.closeModal());
      this.cancelBtn.addEventListener('click', () => this.closeModal());

      this.formEl.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveAlarm();
      });

      this.dismissBtn.addEventListener('click', () => this.dismissAlert());
      this.snoozeBtn.addEventListener('click', () => this.snoozeAlert());

      // Request notification permission if available
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    },

    render() {
      if (!this.gridEl) return;
      this.gridEl.innerHTML = '';

      const activeCount = State.alarms.filter((a) => a.enabled).length;
      if (this.badgeEl) this.badgeEl.textContent = activeCount;

      if (State.alarms.length === 0) {
        this.gridEl.innerHTML = '<div class="empty-laps-state" style="grid-column: 1/-1;">No alarms set. Click "Set New Alarm" above to add one.</div>';
        return;
      }

      State.alarms.forEach((alarm) => {
        const [h, m] = alarm.time.split(':');
        const numH = parseInt(h, 10);
        let ampm = '';
        let displayH = numH;

        if (State.is24Hour) {
          ampm = '24H';
        } else {
          ampm = numH >= 12 ? 'PM' : 'AM';
          displayH = numH % 12 || 12;
        }

        const daysDots = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayLetter, idx) => {
          const isActive = alarm.days.includes(idx);
          return `<span class="repeat-dot ${isActive ? 'active' : ''}">${dayLetter}</span>`;
        }).join('');

        const card = document.createElement('div');
        card.className = `alarm-card ${alarm.enabled ? '' : 'inactive'}`;
        card.innerHTML = `
          <div class="alarm-card-header">
            <div class="alarm-time-display">
              <span class="alarm-time-digits">${String(displayH).padStart(2, '0')}:${m}</span>
              <span class="alarm-time-ampm">${ampm}</span>
            </div>
            <label class="switch" title="Toggle Alarm On/Off">
              <input type="checkbox" class="alarm-toggle-checkbox" data-id="${alarm.id}" ${alarm.enabled ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
          <div class="alarm-label">${alarm.label || 'Alarm'}</div>
          <div class="alarm-repeat-chips">${daysDots}</div>
          <div class="alarm-actions-row">
            <button type="button" class="btn btn-outline btn-edit-alarm" data-id="${alarm.id}">Edit</button>
            <button type="button" class="btn btn-danger btn-delete-alarm" data-id="${alarm.id}">Delete</button>
          </div>
        `;

        this.gridEl.appendChild(card);
      });

      // Attach Toggle Listeners
      this.gridEl.querySelectorAll('.alarm-toggle-checkbox').forEach((checkbox) => {
        checkbox.addEventListener('change', (e) => {
          const id = e.currentTarget.dataset.id;
          const alarm = State.alarms.find((a) => a.id === id);
          if (alarm) {
            alarm.enabled = e.currentTarget.checked;
            State.save();
            this.render();
            AudioEngine.playBeep(e.currentTarget.checked ? 700 : 400, 0.04);
          }
        });
      });

      // Attach Edit Listeners
      this.gridEl.querySelectorAll('.btn-edit-alarm').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          this.openEditModal(id);
        });
      });

      // Attach Delete Listeners
      this.gridEl.querySelectorAll('.btn-delete-alarm').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          this.deleteAlarm(id);
        });
      });
    },

    openAddModal() {
      this.modalTitle.textContent = 'Set New Alarm';
      this.editIdInput.value = '';
      this.timeInput.value = '07:00';
      this.labelInput.value = 'Morning Alarm';
      
      // Default weekdays checked
      const checkboxes = this.formEl.querySelectorAll('input[name="alarm-day"]');
      checkboxes.forEach((cb) => {
        cb.checked = cb.value >= 1 && cb.value <= 5;
      });

      this.modalEl.classList.remove('hidden');
      AudioEngine.playBeep(600, 0.04);
    },

    openEditModal(id) {
      const alarm = State.alarms.find((a) => a.id === id);
      if (!alarm) return;

      this.modalTitle.textContent = 'Edit Alarm';
      this.editIdInput.value = alarm.id;
      this.timeInput.value = alarm.time;
      this.labelInput.value = alarm.label || '';

      const checkboxes = this.formEl.querySelectorAll('input[name="alarm-day"]');
      checkboxes.forEach((cb) => {
        cb.checked = alarm.days.includes(parseInt(cb.value, 10));
      });

      this.modalEl.classList.remove('hidden');
      AudioEngine.playBeep(600, 0.04);
    },

    closeModal() {
      this.modalEl.classList.add('hidden');
    },

    saveAlarm() {
      const id = this.editIdInput.value;
      const time = this.timeInput.value;
      const label = this.labelInput.value.trim() || 'Alarm';

      const selectedDays = [];
      this.formEl.querySelectorAll('input[name="alarm-day"]:checked').forEach((cb) => {
        selectedDays.push(parseInt(cb.value, 10));
      });

      if (!time) {
        alert('Please enter a valid time.');
        return;
      }

      if (id) {
        // Edit existing
        const existing = State.alarms.find((a) => a.id === id);
        if (existing) {
          existing.time = time;
          existing.label = label;
          existing.days = selectedDays;
          existing.enabled = true;
        }
      } else {
        // Create new
        State.alarms.push({
          id: 'alm_' + Date.now(),
          time,
          label,
          days: selectedDays.length ? selectedDays : [0, 1, 2, 3, 4, 5, 6], // default everyday if none selected
          enabled: true
        });
      }

      State.save();
      this.closeModal();
      this.render();
      AudioEngine.playBeep(800, 0.05);
    },

    deleteAlarm(id) {
      State.alarms = State.alarms.filter((a) => a.id !== id);
      State.save();
      this.render();
      AudioEngine.playBeep(450, 0.05);
    },

    checkAlarms(now, rawHours, rawMinutes, rawSeconds) {
      if (rawSeconds !== 0) return; // Only test at top of second

      const currentDay = now.getDay();
      const currentHHMM = `${String(rawHours).padStart(2, '0')}:${String(rawMinutes).padStart(2, '0')}`;

      State.alarms.forEach((alarm) => {
        if (!alarm.enabled) return;

        if (alarm.time === currentHHMM && alarm.days.includes(currentDay)) {
          this.triggerAlert(alarm.label || 'Alarm Ringing!', `Scheduled for ${alarm.time}`);
        }
      });
    },

    triggerAlert(title, message) {
      this.ringingTitle.textContent = title;
      this.ringingMessage.textContent = message;
      this.ringingModal.classList.remove('hidden');

      // Play audio chime
      AudioEngine.startAlarmChime();

      // Desktop notification
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, { body: message, icon: 'favicon.ico' });
        } catch (e) {}
      }
    },

    dismissAlert() {
      AudioEngine.stopAlarmChime();
      this.ringingModal.classList.add('hidden');
    },

    snoozeAlert() {
      AudioEngine.stopAlarmChime();
      this.ringingModal.classList.add('hidden');

      // Schedule snooze alarm 5 minutes into the future
      const now = new Date(Date.now() + 5 * 60 * 1000);
      const snoozeTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      State.alarms.push({
        id: 'snooze_' + Date.now(),
        time: snoozeTime,
        label: 'Snoozed: ' + this.ringingTitle.textContent,
        days: [0, 1, 2, 3, 4, 5, 6],
        enabled: true
      });
      State.save();
      this.render();
      alert(`Alarm snoozed for 5 minutes (will ring at ${snoozeTime}).`);
    }
  };

  // ==========================================================================
  // 8. Weather Service (Free Open-Meteo API with Graceful Error Fallback)
  // ==========================================================================
  const WeatherService = {
    tempEl: document.getElementById('weather-temp'),
    conditionEl: document.getElementById('weather-condition'),
    locationEl: document.getElementById('weather-location'),
    humidityEl: document.getElementById('weather-humidity'),
    windEl: document.getElementById('weather-wind'),
    refreshBtn: document.getElementById('weather-refresh-btn'),

    init() {
      this.fetchWeather();
      if (this.refreshBtn) {
        this.refreshBtn.addEventListener('click', () => {
          this.conditionEl.textContent = 'Updating forecast...';
          this.fetchWeather();
          AudioEngine.playBeep(750, 0.04);
        });
      }
    },

    async fetchWeather() {
      try {
        // Open-Meteo free public forecast endpoint (Zero API key needed)
        // Defaults to Delhi coordinates (28.6139° N, 77.2090° E) or browser location
        let lat = 28.6139;
        let lon = 77.2090;
        let city = 'New Delhi';

        // Check if browser geolocation is quickly available
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              lat = pos.coords.latitude;
              lon = pos.coords.longitude;
              city = 'Local Position';
              this.requestApi(lat, lon, city);
            },
            () => {
              // Fallback to default coordinates
              this.requestApi(lat, lon, city);
            },
            { timeout: 3000 }
          );
        } else {
          this.requestApi(lat, lon, city);
        }
      } catch (err) {
        this.loadFallbackWeather();
      }
    },

    async requestApi(lat, lon, city) {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Weather API error response');
        const data = await res.json();

        const current = data.current;
        const temp = Math.round(current.temperature_2m);
        const humidity = current.relative_humidity_2m;
        const wind = Math.round(current.wind_speed_10m);
        const code = current.weather_code;
        const condition = this.interpretWeatherCode(code);

        this.renderWeather(temp, condition, city, humidity, wind);
      } catch (e) {
        this.loadFallbackWeather();
      }
    },

    interpretWeatherCode(code) {
      // WMO Weather interpretation codes
      if (code === 0) return 'Clear Sky';
      if (code >= 1 && code <= 3) return 'Partly Cloudy';
      if (code >= 45 && code <= 48) return 'Foggy';
      if (code >= 51 && code <= 67) return 'Rain Showers';
      if (code >= 71 && code <= 77) return 'Snow';
      if (code >= 80 && code <= 82) return 'Heavy Rain';
      if (code >= 95) return 'Thunderstorm';
      return 'Mostly Clear';
    },

    loadFallbackWeather() {
      // Graceful offline simulated forecast
      this.renderWeather(24, 'Sunny & Mild', 'Local Station (Cached)', 48, 12);
    },

    renderWeather(temp, condition, location, humidity, wind) {
      if (this.tempEl) this.tempEl.textContent = `${temp}°C`;
      if (this.conditionEl) this.conditionEl.textContent = condition;
      if (this.locationEl) this.locationEl.textContent = location;
      if (this.humidityEl) this.humidityEl.textContent = `${humidity}%`;
      if (this.windEl) this.windEl.textContent = `${wind} km/h`;
    }
  };

  // ==========================================================================
  // 9. Calendar Widget Engine
  // ==========================================================================
  const CalendarWidget = {
    monthYearEl: document.getElementById('cal-month-year'),
    datesGridEl: document.getElementById('calendar-dates-grid'),
    prevBtn: document.getElementById('cal-prev-btn'),
    nextBtn: document.getElementById('cal-next-btn'),
    todayJumpBtn: document.getElementById('cal-today-jump-btn'),

    // Side details
    selectedDateStrEl: document.getElementById('cal-selected-date-str'),
    selectedDayStrEl: document.getElementById('cal-selected-day-str'),
    dayOfYearEl: document.getElementById('cal-day-of-year'),
    weekOfYearEl: document.getElementById('cal-week-of-year'),
    daysInMonthEl: document.getElementById('cal-days-in-month'),

    viewDate: new Date(),
    selectedDate: new Date(),

    init() {
      this.render();

      this.prevBtn.addEventListener('click', () => {
        this.viewDate.setMonth(this.viewDate.getMonth() - 1);
        this.render();
        AudioEngine.playBeep(600, 0.03);
      });

      this.nextBtn.addEventListener('click', () => {
        this.viewDate.setMonth(this.viewDate.getMonth() + 1);
        this.render();
        AudioEngine.playBeep(600, 0.03);
      });

      this.todayJumpBtn.addEventListener('click', () => {
        this.viewDate = new Date();
        this.selectedDate = new Date();
        this.render();
        AudioEngine.playBeep(750, 0.04);
      });
    },

    render() {
      const year = this.viewDate.getFullYear();
      const month = this.viewDate.getMonth();

      this.monthYearEl.textContent = `${MONTHS[month]} ${year}`;

      const firstDayIndex = new Date(year, month, 1).getDay();
      const lastDayDate = new Date(year, month + 1, 0).getDate();
      const prevLastDayDate = new Date(year, month, 0).getDate();

      const today = new Date();
      this.datesGridEl.innerHTML = '';

      // Days of previous month filling initial grid
      for (let i = firstDayIndex; i > 0; i--) {
        const dayNum = prevLastDayDate - i + 1;
        const cell = document.createElement('div');
        cell.className = 'cal-day-cell other-month';
        cell.textContent = dayNum;
        this.datesGridEl.appendChild(cell);
      }

      // Days of current month
      for (let day = 1; day <= lastDayDate; day++) {
        const cell = document.createElement('div');
        cell.className = 'cal-day-cell';
        cell.textContent = day;

        const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
        if (isToday) cell.classList.add('today');

        const isSelected = this.selectedDate.getFullYear() === year && this.selectedDate.getMonth() === month && this.selectedDate.getDate() === day;
        if (isSelected) cell.classList.add('selected');

        cell.addEventListener('click', () => {
          this.selectedDate = new Date(year, month, day);
          this.render();
          this.updateSideInfo();
          AudioEngine.playBeep(700, 0.03);
        });

        this.datesGridEl.appendChild(cell);
      }

      // Remaining days for 6-row alignment
      const totalCells = firstDayIndex + lastDayDate;
      const nextDays = (7 - (totalCells % 7)) % 7;
      for (let j = 1; j <= nextDays; j++) {
        const cell = document.createElement('div');
        cell.className = 'cal-day-cell other-month';
        cell.textContent = j;
        this.datesGridEl.appendChild(cell);
      }

      this.updateSideInfo();
    },

    updateSideInfo() {
      const d = this.selectedDate;
      const dayName = DAYS[d.getDay()];
      const monthName = MONTHS[d.getMonth()];
      const dateNum = d.getDate();
      const year = d.getFullYear();

      this.selectedDateStrEl.textContent = `${monthName} ${dateNum}, ${year}`;
      this.selectedDayStrEl.textContent = dayName;

      // Day of year calculation
      const startOfYear = new Date(year, 0, 1);
      const diffDays = Math.floor((d - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
      const totalYearDays = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
      this.dayOfYearEl.textContent = `Day ${diffDays} / ${totalYearDays}`;

      // Week of year calculation
      const weekNum = Math.ceil((((d - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
      this.weekOfYearEl.textContent = `Week ${weekNum}`;

      // Days in month
      const daysInMonth = new Date(year, d.getMonth() + 1, 0).getDate();
      this.daysInMonthEl.textContent = `${daysInMonth} Days`;
    }
  };

  // ==========================================================================
  // 10. UI & Master Controller
  // ==========================================================================
  const UIController = {
    formatToggleBtn: document.getElementById('format-toggle'),
    formatLabel: document.getElementById('format-label'),
    soundToggleBtn: document.getElementById('sound-toggle'),
    soundOnIcon: document.getElementById('sound-on-icon'),
    soundOffIcon: document.getElementById('sound-off-icon'),
    modeToggleBtn: document.getElementById('mode-toggle'),
    moonIcon: document.getElementById('moon-icon'),
    sunIcon: document.getElementById('sun-icon'),
    fullscreenToggleBtn: document.getElementById('fullscreen-toggle'),
    exitFullscreenBtn: document.getElementById('exit-fullscreen-btn'),
    themeBtn: document.getElementById('theme-btn'),
    themeMenuContainer: document.querySelector('.theme-dropdown-container'),
    navTabs: document.querySelectorAll('.nav-tab'),
    tabPanels: document.querySelectorAll('.tab-panel'),
    colorSwatches: document.querySelectorAll('.color-swatch'),

    init() {
      // 1. Navigation Tabs
      this.navTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          const tabId = tab.dataset.tab;
          this.switchTab(tabId);
          AudioEngine.playBeep(650, 0.04);
        });
      });

      // 2. 12H / 24H Toggle
      this.formatToggleBtn.addEventListener('click', () => {
        State.is24Hour = !State.is24Hour;
        State.save();
        this.updateFormatUI();
        ClockEngine.update();
        WorldClockManager.updateAllTimes();
        AlarmManager.render();
        AudioEngine.playBeep(700, 0.04);
      });

      // 3. Audio Toggle
      this.soundToggleBtn.addEventListener('click', () => {
        State.soundEnabled = !State.soundEnabled;
        State.save();
        this.updateSoundUI();
        if (State.soundEnabled) AudioEngine.playBeep(880, 0.05);
      });

      // 4. Dark / Light Mode Toggle
      this.modeToggleBtn.addEventListener('click', () => {
        State.mode = State.mode === 'dark' ? 'light' : 'dark';
        State.save();
        this.applyMode();
        AudioEngine.playBeep(600, 0.04);
      });

      // 5. Accent Theme Swatches
      this.themeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.themeMenuContainer.classList.toggle('open');
      });

      document.addEventListener('click', () => {
        this.themeMenuContainer.classList.remove('open');
      });

      this.colorSwatches.forEach((swatch) => {
        swatch.addEventListener('click', (e) => {
          e.stopPropagation();
          const color = swatch.dataset.color;
          State.theme = color;
          State.save();
          this.applyTheme(color);
          this.themeMenuContainer.classList.remove('open');
          AudioEngine.playBeep(750, 0.04);
        });
      });

      // 6. Fullscreen Mode
      this.fullscreenToggleBtn.addEventListener('click', () => this.toggleFullscreen());
      this.exitFullscreenBtn.addEventListener('click', () => this.exitFullscreen());

      // 7. Global Keyboard Shortcuts
      document.addEventListener('keydown', (e) => this.handleKeyboard(e));

      // Initial Apply
      this.updateFormatUI();
      this.updateSoundUI();
      this.applyMode();
      this.applyTheme(State.theme);
    },

    switchTab(tabId) {
      this.navTabs.forEach((tab) => {
        if (tab.dataset.tab === tabId) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });

      this.tabPanels.forEach((panel) => {
        if (panel.id === `tab-${tabId}`) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    },

    updateFormatUI() {
      this.formatLabel.textContent = State.is24Hour ? '24H' : '12H';
    },

    updateSoundUI() {
      if (State.soundEnabled) {
        this.soundOnIcon.classList.remove('hidden');
        this.soundOffIcon.classList.add('hidden');
      } else {
        this.soundOnIcon.classList.add('hidden');
        this.soundOffIcon.classList.remove('hidden');
      }
    },

    applyMode() {
      document.documentElement.setAttribute('data-mode', State.mode);
      if (State.mode === 'dark') {
        this.moonIcon.classList.remove('hidden');
        this.sunIcon.classList.add('hidden');
      } else {
        this.moonIcon.classList.add('hidden');
        this.sunIcon.classList.remove('hidden');
      }
    },

    applyTheme(color) {
      document.documentElement.setAttribute('data-theme', color);
      this.colorSwatches.forEach((swatch) => {
        if (swatch.dataset.color === color) {
          swatch.classList.add('active');
        } else {
          swatch.classList.remove('active');
        }
      });
    },

    toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        document.body.classList.add('fullscreen-mode');
        this.exitFullscreenBtn.classList.remove('hidden');
      } else {
        this.exitFullscreen();
      }
      AudioEngine.playBeep(700, 0.05);
    },

    exitFullscreen() {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      document.body.classList.remove('fullscreen-mode');
      this.exitFullscreenBtn.classList.add('hidden');
    },

    handleKeyboard(e) {
      // Don't intercept when user is typing in form inputs
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const key = e.key.toLowerCase();

      // Numbers 1 - 6 for Tabs
      if (key >= '1' && key <= '6') {
        const tabs = ['overview', 'world-clock', 'stopwatch', 'timer', 'alarms', 'calendar'];
        const targetTab = tabs[parseInt(key, 10) - 1];
        if (targetTab) {
          this.switchTab(targetTab);
          AudioEngine.playBeep(650, 0.04);
        }
      } else if (key === 'f') {
        this.toggleFullscreen();
      } else if (key === 'm') {
        this.formatToggleBtn.click();
      } else if (key === 's') {
        this.soundToggleBtn.click();
      } else if (key === 't') {
        // Cycle next theme
        const themes = ['cyan', 'purple', 'emerald', 'amber', 'pink'];
        const nextIdx = (themes.indexOf(State.theme) + 1) % themes.length;
        State.theme = themes[nextIdx];
        State.save();
        this.applyTheme(State.theme);
        AudioEngine.playBeep(750, 0.04);
      } else if (e.key === 'Escape') {
        this.exitFullscreen();
        AlarmManager.closeModal();
      }
    }
  };

  // ==========================================================================
  // Master Initialization
  // ==========================================================================
  UIController.init();
  ClockEngine.init();
  WorldClockManager.init();
  StopwatchEngine.init();
  TimerEngine.init();
  AlarmManager.init();
  WeatherService.init();
  CalendarWidget.init();
});
