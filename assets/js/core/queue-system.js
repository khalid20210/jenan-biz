/**
 * queue-system.js — محرك الطوابير وإدارة الطلبات
 * يضمن معالجة آلاف الطلبات المتزامنة دون بطء أو تعارض
 */

class QueueSystem {
  constructor(config = {}) {
    this.maxConcurrent = config.maxConcurrent || 10;
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay   = config.retryDelay   || 1500;
    this.timeout      = config.requestTimeout || 30000;
    this.rateLimit    = config.rateLimitPerUser || 60;

    this._queue     = [];         // طابور الانتظار
    this._active    = new Map();  // العمليات الجارية { id -> promise }
    this._userCalls = new Map();  // تتبع معدل الطلبات { userId -> [timestamps] }
    this._listeners = {};
    this._idCounter = 0;
  }

  /* ---- واجهة عامة ---- */

  /**
   * إضافة مهمة للطابور
   * @param {Function} task — دالة async ترجع promise
   * @param {Object}   opts — { priority, userId, label }
   * @returns {Promise} يُحلّ بنتيجة المهمة
   */
  enqueue(task, opts = {}) {
    const { priority = 0, userId = "anonymous", label = "task" } = opts;

    if (!this._checkRateLimit(userId)) {
      return Promise.reject(new Error(`rate_limit: تجاوزت حد الطلبات (${this.rateLimit}/دقيقة)`));
    }

    return new Promise((resolve, reject) => {
      const job = {
        id: ++this._idCounter,
        task,
        priority,
        userId,
        label,
        resolve,
        reject,
        attempts: 0,
        enqueued: Date.now(),
      };

      this._insertByPriority(job);
      this._emit("enqueued", { id: job.id, label, queueSize: this._queue.length });
      this._tick();
    });
  }

  /** نظرة فورية على حالة الطابور */
  status() {
    return {
      queued:  this._queue.length,
      active:  this._active.size,
      capacity: this.maxConcurrent - this._active.size,
    };
  }

  /** مستمع للأحداث: enqueued | started | completed | failed | retry */
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return this; // للسلسلة
  }

  /* ---- منطق داخلي ---- */

  _tick() {
    while (this._active.size < this.maxConcurrent && this._queue.length > 0) {
      const job = this._queue.shift();
      this._run(job);
    }
  }

  async _run(job) {
    job.attempts++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    this._active.set(job.id, job);
    this._emit("started", { id: job.id, label: job.label, attempt: job.attempts });

    try {
      const result = await job.task({ signal: controller.signal });
      clearTimeout(timer);
      this._active.delete(job.id);
      this._emit("completed", { id: job.id, label: job.label, duration: Date.now() - job.enqueued });
      job.resolve(result);
    } catch (err) {
      clearTimeout(timer);
      this._active.delete(job.id);

      if (job.attempts < this.retryAttempts && err.name !== "AbortError") {
        this._emit("retry", { id: job.id, label: job.label, attempt: job.attempts, error: err.message });
        await this._sleep(this.retryDelay * job.attempts);
        this._insertByPriority(job);
      } else {
        this._emit("failed", { id: job.id, label: job.label, error: err.message });
        job.reject(err);
      }
    } finally {
      this._tick();
    }
  }

  _insertByPriority(job) {
    const idx = this._queue.findIndex(j => j.priority < job.priority);
    if (idx === -1) this._queue.push(job);
    else this._queue.splice(idx, 0, job);
  }

  _checkRateLimit(userId) {
    const now = Date.now();
    const window = 60_000; // دقيقة واحدة
    const calls = (this._userCalls.get(userId) || []).filter(t => now - t < window);
    if (calls.length >= this.rateLimit) return false;
    calls.push(now);
    this._userCalls.set(userId, calls);
    return true;
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  }

  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

// Singleton للموقع
const jenanQueue = new QueueSystem(
  typeof JENAN_CONFIG !== "undefined" ? JENAN_CONFIG.queue : {}
);

if (typeof module !== "undefined") module.exports = { QueueSystem, jenanQueue };
