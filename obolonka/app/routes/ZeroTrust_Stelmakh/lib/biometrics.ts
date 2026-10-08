/**
 * Збирач поведінкової біометрії (динаміка клавіатури, миші, дотиків, сенсорів).
 *
 * Перенесено з frontend/static/js/biometric-collector.js без зміни формату
 * даних, які очікує бекенд. Відмінності від оригіналу:
 *  - обробники зберігаються як стрілкові поля класу, тож stop() справді
 *    знімає слухачів (у старій версії .bind() створював нові функції);
 *  - екземпляр створюється лише в браузері (усередині useEffect), бо
 *    оболонка рендерить сторінки на сервері (SSR).
 */

export type DeviceCategory = "desktop" | "mobile";

export interface BiometricBatch {
  data_type: "KEYSTROKE" | "MOUSE" | "TOUCH" | "SENSOR_FUSION";
  data: unknown[];
  device_category: DeviceCategory;
}

export interface CollectorCounts {
  keystroke: number;
  mouse: number;
}

export class BiometricCollector {
  private keystrokeData: any[] = [];
  private mouseData: any[] = [];
  private touchData: any[] = [];
  private sensorData: any[] = [];

  private lastKeyDown: Record<string, number> = {};
  private lastKeyUp: number | null = null;
  private lastInputTime: number | null = null;
  private lastMousePos: { x: number; y: number } | null = null;
  private lastMouseTime: number | null = null;
  private lastVelocity: number | undefined;

  private collecting = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly sendIntervalMs = 5000;

  private sessionKeystrokeCount = 0;
  private sessionMouseMoveCount = 0;

  onDataReady: ((batch: BiometricBatch) => Promise<unknown>) | null = null;
  onCountUpdate: ((counts: CollectorCounts) => void) | null = null;

  readonly deviceCategory: DeviceCategory;

  constructor() {
    this.deviceCategory = BiometricCollector.detectDeviceCategory();
  }

  static detectDeviceCategory(): DeviceCategory {
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const smallScreen = window.innerWidth < 768;
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

    if (hasCoarsePointer && mobileUA) return "mobile";
    if (hasFinePointer && !mobileUA) return "desktop";
    return smallScreen ? "mobile" : "desktop";
  }

  get isCollecting() {
    return this.collecting;
  }

  start() {
    if (this.collecting) return;
    this.collecting = true;
    this.sessionKeystrokeCount = 0;
    this.sessionMouseMoveCount = 0;
    this.bindEvents();
    this.startSensors();
    this.timer = setInterval(() => void this.sendCollectedData(), this.sendIntervalMs);
  }

  stop() {
    this.collecting = false;
    this.unbindEvents();
    this.stopSensors();
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // ---------- Підписка на події ----------

  private bindEvents() {
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
    if (this.deviceCategory === "mobile") {
      document.addEventListener("input", this.handleInput, true);
    }
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("click", this.handleMouseClick);
    document.addEventListener("wheel", this.handleMouseScroll, { passive: true });
    document.addEventListener("touchstart", this.handleTouchStart, { passive: true });
    document.addEventListener("touchmove", this.handleTouchMove, { passive: true });
    document.addEventListener("touchend", this.handleTouchEnd, { passive: true });
  }

  private unbindEvents() {
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
    document.removeEventListener("input", this.handleInput, true);
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("click", this.handleMouseClick);
    document.removeEventListener("wheel", this.handleMouseScroll);
    document.removeEventListener("touchstart", this.handleTouchStart);
    document.removeEventListener("touchmove", this.handleTouchMove);
    document.removeEventListener("touchend", this.handleTouchEnd);
  }

  private emitCounts() {
    this.onCountUpdate?.({ keystroke: this.sessionKeystrokeCount, mouse: this.sessionMouseMoveCount });
  }

  // ---------- Клавіатура ----------

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.collecting) return;
    if (!this.lastKeyDown[e.key]) this.lastKeyDown[e.key] = performance.now();
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (!this.collecting) return;
    const now = performance.now();
    const down = this.lastKeyDown[e.key];
    if (!down) return;

    this.keystrokeData.push({
      key: e.key.length === 1 ? "char" : e.key, // анонімізація символів
      key_down_time: down,
      key_up_time: now,
      hold_time: now - down,
      flight_time: this.lastKeyUp ? now - this.lastKeyUp : null,
    });
    delete this.lastKeyDown[e.key];
    this.lastKeyUp = now;
    this.sessionKeystrokeCount++;
    this.emitCounts();
  };

  /** Віртуальна клавіатура мобільних (iOS не генерує keydown/keyup). */
  private handleInput = (e: Event) => {
    if (!this.collecting || this.deviceCategory !== "mobile") return;
    const inputType = (e as InputEvent).inputType;
    if (inputType !== "insertText" && inputType !== "deleteContentBackward") return;

    const now = performance.now();
    const estimatedHold = 80 + Math.random() * 40;
    this.keystrokeData.push({
      key: "char",
      key_down_time: now - estimatedHold,
      key_up_time: now,
      hold_time: estimatedHold,
      flight_time: this.lastInputTime ? now - this.lastInputTime : null,
    });
    this.lastInputTime = now;
    this.sessionKeystrokeCount++;
    this.emitCounts();
  };

  // ---------- Миша ----------

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.collecting) return;
    const now = performance.now();
    const { clientX: x, clientY: y } = e;
    let velocity: number | null = null;
    let acceleration: number | null = null;

    if (this.lastMousePos && this.lastMouseTime) {
      const dx = x - this.lastMousePos.x;
      const dy = y - this.lastMousePos.y;
      const dt = now - this.lastMouseTime;
      if (dt > 0) {
        velocity = Math.sqrt(dx * dx + dy * dy) / dt;
        if (this.lastVelocity !== undefined) acceleration = (velocity - this.lastVelocity) / dt;
        this.lastVelocity = velocity;
      }
    }

    // Дискретизація раз на 50 мс
    if (!this.lastMouseTime || now - this.lastMouseTime > 50) {
      this.mouseData.push({ x, y, timestamp: now, event_type: "move", velocity, acceleration });
      this.lastMousePos = { x, y };
      this.lastMouseTime = now;
      this.sessionMouseMoveCount++;
    }
  };

  private handleMouseClick = (e: MouseEvent) => {
    if (!this.collecting) return;
    this.mouseData.push({
      x: e.clientX,
      y: e.clientY,
      timestamp: performance.now(),
      event_type: "click",
      button: e.button === 0 ? "left" : e.button === 2 ? "right" : "middle",
    });
  };

  private handleMouseScroll = (e: WheelEvent) => {
    if (!this.collecting) return;
    this.mouseData.push({
      x: e.clientX,
      y: e.clientY,
      timestamp: performance.now(),
      event_type: "scroll",
      deltaY: e.deltaY,
    });
  };

  // ---------- Дотики ----------

  private touchPoint(t: Touch, eventType: string, withPressure: boolean) {
    const point: Record<string, unknown> = {
      x: t.clientX,
      y: t.clientY,
      timestamp: performance.now(),
      event_type: eventType,
    };
    if (withPressure) {
      point.pressure = t.force || null;
      point.touch_area = t.radiusX && t.radiusY ? Math.PI * t.radiusX * t.radiusY : null;
    }
    return point;
  }

  private handleTouchStart = (e: TouchEvent) => {
    if (!this.collecting) return;
    for (const t of Array.from(e.touches)) this.touchData.push(this.touchPoint(t, "start", true));
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (!this.collecting) return;
    for (const t of Array.from(e.touches)) this.touchData.push(this.touchPoint(t, "move", true));
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (!this.collecting) return;
    for (const t of Array.from(e.changedTouches)) this.touchData.push(this.touchPoint(t, "end", false));
  };

  // ---------- Сенсори (акселерометр, гіроскоп) ----------

  private startSensors() {
    if (!("DeviceMotionEvent" in window)) return;
    const DME = window.DeviceMotionEvent as any;
    if (typeof DME.requestPermission === "function") {
      // iOS 13+: дозвіл надається лише у відповідь на жест користувача
      DME.requestPermission()
        .then((res: string) => {
          if (res === "granted") window.addEventListener("devicemotion", this.handleDeviceMotion);
        })
        .catch(() => {});
    } else {
      window.addEventListener("devicemotion", this.handleDeviceMotion);
    }
  }

  private stopSensors() {
    window.removeEventListener("devicemotion", this.handleDeviceMotion);
  }

  private handleDeviceMotion = (e: DeviceMotionEvent) => {
    if (!this.collecting) return;
    const accel = e.accelerationIncludingGravity;
    const gyro = e.rotationRate;
    const hasAccel = !!accel && (accel.x !== null || accel.y !== null || accel.z !== null);
    const hasGyro = !!gyro && (gyro.alpha !== null || gyro.beta !== null || gyro.gamma !== null);
    if (!hasAccel && !hasGyro) return;

    this.sensorData.push({
      accelerometer: hasAccel ? { x: accel!.x, y: accel!.y, z: accel!.z } : null,
      gyroscope: hasGyro ? { x: gyro!.alpha, y: gyro!.beta, z: gyro!.gamma } : null,
      timestamp: performance.now(),
    });
  };

  // ---------- Вибірка даних ----------

  private drain(key: "keystrokeData" | "mouseData" | "touchData" | "sensorData") {
    const data = this[key];
    this[key] = [];
    return data;
  }

  /** Дані, зібрані під час введення пароля — додаються до запиту входу. */
  takeLoginData(): Record<string, unknown> | null {
    const payload: Record<string, unknown> = { device_category: this.deviceCategory };
    const keystroke = this.drain("keystrokeData");
    const mouse = this.drain("mouseData");
    const touch = this.drain("touchData");
    if (keystroke.length) payload.keystroke = keystroke;
    if (mouse.length) payload.mouse = mouse;
    if (touch.length) payload.touch = touch;
    return Object.keys(payload).length > 1 ? payload : null;
  }

  private async sendCollectedData() {
    if (!this.onDataReady) return; // до входу дані накопичуються для запиту login

    const device = this.deviceCategory;
    const batches: BiometricBatch[] = [];
    const push = (data_type: BiometricBatch["data_type"], data: unknown[]) => {
      if (data.length) batches.push({ data_type, data, device_category: device });
    };
    push("KEYSTROKE", this.drain("keystrokeData"));
    push("MOUSE", this.drain("mouseData"));
    push("TOUCH", this.drain("touchData"));
    push("SENSOR_FUSION", this.drain("sensorData"));

    for (const batch of batches) {
      try {
        await this.onDataReady(batch);
      } catch {
        /* пропускаємо пакет, наступний надійде за 5 с */
      }
    }
  }
}
