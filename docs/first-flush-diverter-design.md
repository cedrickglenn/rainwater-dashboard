# First Flush Diverter — Design Rationale and System Logic

**Project:** RainSense — Smart Rainwater Harvesting and Filtration System
**Document scope:** Automated first flush diversion subsystem
**Audience:** Thesis panel / capstone review

---

## 1. Background and Problem Statement

Rainwater collected from rooftop catchment surfaces is not immediately safe for storage or use. During dry periods between rain events, rooftop surfaces accumulate a layer of atmospheric contaminants: particulate matter (PM2.5, PM10), bird and animal droppings, pollen, decomposed organic matter, and dust carrying heavy metals and microbial organisms. When rainfall begins, the first volume of runoff — called the **first flush** — carries a disproportionately high concentration of these contaminants.

Research has consistently quantified this effect: the initial 10–20 gallons (approximately 38–76 L) of runoff from an average-sized roof can carry up to 90% of the pollutant load present on the surface (Rainwater Harvesting Systems, TAMU). A further finding from washoff modelling shows that intercepting just the first 30% of total runoff volume removes approximately 62% of total suspended solids (TSS) load, 59% of chemical oxygen demand (COD), and 47% of total nitrogen (Quantifying the First-Flush Phenomenon, University of Portsmouth). The contamination profile follows a logarithmic decay: each subsequent millimetre of rainfall washes roughly half the remaining surface load (ntotank.com).

These findings justify a **first flush diversion mechanism** as the first stage of the RainSense treatment pipeline, before water reaches Container 2 (C2) for storage.

---

## 2. Physical Configuration

The flow sensor is installed inline on the pipe from the rooftop catchment outlet. Downstream of the sensor, the pipe reaches a tee junction with two outlets controlled by solenoid valves:

- **Valve 1 (V1)** — directs water into Container 2 (collection/storage)
- **Valve 8 (V8)** — directs water to drainage (first flush waste)

```
Rooftop catchment
       │
  [Flow sensor]
       │
    [Tee ─────── V8 → Drainage (first flush waste)]
       │
       V1
       │
  Container 2 (C2)
```

A critical physical constraint governs the detection strategy: **with both V1 and V8 closed, the tee is a hydraulic dead end.** Incoming water pressurises the pipe stub between the sensor and the tee, stops flowing, and the sensor reads zero regardless of actual rainfall. This means passive flow monitoring with closed valves cannot detect rain.

---

## 3. Rain Detection Strategy — The Idle Pulse

To resolve the dead-end problem, the firmware implements a periodic **idle rain-check pulse** in the `FF_IDLE` state. Every `IDLE_RAIN_CHECK_INTERVAL_MS` (default: 60 seconds), the system opens V8 for `IDLE_PULSE_MS` (default: 8 seconds). This creates a drain path at the tee, allowing any present rainwater to move through the sensor.

**Duty cycle:** 8 s open / 60 s interval ≈ 13%. During the 52 seconds per cycle when V8 is closed, a small volume of first-flush water is not captured — this is acceptable given the diversion objective (the goal is to direct this water to drain, not to collect it).

**Pulse duration rationale:** `IDLE_PULSE_MS` must exceed `FLOW_CONFIRM_MS` (the sustained-flow confirmation window, default 3 seconds) plus the pipe-fill latency — the time for pressurised water in the stub to drain and flow to resume past the sensor. An 8-second pulse provides approximately 6 sensor read cycles (at 1-second intervals) after an estimated 2-second fill-latency, giving 3–4 valid non-zero readings before the window closes. The value is configurable at runtime via the dashboard to accommodate longer pipe runs or lower-intensity rainfall.

---

## 4. State Machine Design

The first flush diverter is implemented as a five-state finite state machine (FSM) running on the Arduino Mega. All transitions are time-driven using `millis()` — the FSM is fully non-blocking and runs on every loop iteration.

### 4.1 States

| State | V1 | V8 | Description |
|---|---|---|---|
| `FF_IDLE` | Closed | Pulsing (13% duty) | Waiting for rain. Periodic V8 pulse to detect flow. |
| `FF_CONFIRMING` | Closed | Open | Flow detected. Waiting for sustained flow to rule out transients. |
| `FF_DIVERTING` | Closed | Open | Confirmed rain. Diverting first flush to drainage. Accumulating time and volume. |
| `FF_PAUSED` | Closed | Closed | Flow dropped mid-flush. Progress saved. Watching for rain to resume. |
| `FF_COLLECTING` | Open | Closed | First flush complete. Collecting clean water into C2. |

### 4.2 State Transition Diagram

```
              ┌─────────────────────────────────────────────────────────────┐
              │                       flow stops                            │
              ▼                   (< FLOW_CONFIRM_MS)                      │
┌──────────┐  flow during pulse  ┌─────────────┐  sustained flow confirmed ┌─────────────┐
│ FF_IDLE  │ ──────────────────► │FF_CONFIRMING│ ────────────────────────► │ FF_DIVERTING│
└──────────┘                     └─────────────┘                           └─────────────┘
     ▲                                                                            │
     │                                                          flow dropout      │
     │                                                        > FLOW_TIMEOUT_MS   │
     │                                                                            ▼
     │                                                                      ┌──────────┐
     │   pause window expires                                                │FF_PAUSED │
     │   (ffReentryWindowMs)                                                 └──────────┘
     │   no flow detected                                                          │
     └─────────────────────────────────────────────────────────────────────────────┘
                                                                                  │
                                                         flow returns (within     │
                                                         ffReentryWindowMs)       │
                                                                                  │
                                                              ┌─────────────┐ ◄───┘
                                                              │FF_CONFIRMING│ (resume path)
                                                              └─────────────┘
                                                                     │ confirmed
                                                                     ▼
                                                              ┌─────────────┐
                                                              │ FF_DIVERTING│ (counters preserved)
                                                              └─────────────┘
                                                                     │
                                            time OR volume threshold │
                                                  reached             ▼
                                                              ┌─────────────┐
                                                              │FF_COLLECTING│
                                                              └─────────────┘
                                                                     │
                                              collection window      │
                                              expired AND flow       │
                                              absent > FLOW_TIMEOUT  │
                                                                     ▼
                                                              ┌──────────┐
                                                              │ FF_IDLE  │
                                                              └──────────┘
```

### 4.3 State Logic in Detail

#### FF_IDLE
- Runs the idle V8 pulse cycle (open for `IDLE_PULSE_MS`, sleep for `IDLE_RAIN_CHECK_INTERVAL_MS`).
- On flow detection during a pulse: evaluates the **re-entry condition** (see Section 5), then transitions to `FF_CONFIRMING`.
- If `ffReentryWindowMs` has elapsed since the last completed collection, clears the `sessionFlushed` flag so the next rain event triggers a full flush.

#### FF_CONFIRMING
- V8 remains open from the idle pulse; no additional valve operation needed.
- If flow is sustained for `FLOW_CONFIRM_MS` (default 3 s): transitions to `FF_DIVERTING` (normal), `FF_COLLECTING` (re-entry skip), or `FF_DIVERTING` with preserved counters (pause resume).
- If flow drops before confirmation: false alarm — returns to `FF_IDLE` sleep.

#### FF_DIVERTING
- Accumulates **consistent flow time** (`flowConsistentMs`). Brief sub-`FLOW_TIMEOUT_MS` gaps freeze the counter without resetting it, accommodating gusty or intermittent tropical rainfall.
- Simultaneously integrates **diverted volume**: `divertedLitres += flowRateLpm × (Δt / 60)`.
- Transitions to `FF_COLLECTING` when **either** threshold is met first: `flowConsistentMs ≥ ffDurationMs` OR `divertedLitres ≥ ffVolumeLitres`. The dual gate (time AND volume, whichever is earlier) adapts to varying rainfall intensities — heavy rain reaches the volume gate sooner; light rain relies on the time gate.
- If flow drops for longer than `FLOW_TIMEOUT_MS`: transitions to `FF_PAUSED` (preserving counters).

#### FF_PAUSED
- Both valves closed. V8 idle pulse cycle resumes to monitor for returning rain.
- If flow is detected during a pulse: transitions to `FF_CONFIRMING` with a `pauseResume` flag set. On confirmation, the FSM re-enters `FF_DIVERTING` with `flowConsistentMs` and `divertedLitres` intact.
- If `ffReentryWindowMs` elapses with no returning flow: the pause window is considered expired. Counters are discarded and the FSM returns to `FF_IDLE`. The scientific rationale is that after a dry interval exceeding the re-entry window (default 2 hours), meaningful atmospheric dry deposition will have resumed on the roof surface, warranting a fresh first flush on the next rain event (see Section 6.2).

#### FF_COLLECTING
- V8 closed, V1 open. Water flows into C2.
- A **collection protection window** (`COLLECTION_WINDOW_MS`, default 1 hour) prevents the FSM from exiting to `FF_IDLE` during brief flow pauses within the window — common in tropical convective rain patterns. The window is held open even if flow stops, and the FSM only exits after both the window has expired AND flow has been absent for the flow pause tolerance (`FLOW_TIMEOUT_MS`, runtime-configurable).
- On exit: sets `sessionFlushed = true` and records `lastCollectEndMs` for re-entry window evaluation.

---

## 5. Re-Entry Logic (Completed Flush Skip)

After a completed flush-and-collect cycle, the roof surface is treated as clean for a configurable duration (`ffReentryWindowMs`, default 2 hours). If rain returns within this window, requiring a new first flush would divert already-clean roof water to drainage — an unnecessary water loss.

**Logic:**
1. When `FF_COLLECTING` exits to `FF_IDLE`, the FSM records `lastCollectEndMs` and sets `sessionFlushed = true`.
2. When `FF_IDLE` detects rain again, it checks: `sessionFlushed AND (now − lastCollectEndMs) < ffReentryWindowMs`.
3. If true (`reentryPending`): `FF_CONFIRMING` transitions directly to `FF_COLLECTING`, skipping `FF_DIVERTING` entirely.
4. When `ffReentryWindowMs` elapses: `sessionFlushed` is cleared and the next rain event triggers a full flush.

The same `ffReentryWindowMs` threshold is reused to govern `FF_PAUSED` expiry (Section 4.3), unifying the "roof is still clean" assumption under one configurable parameter.

---

## 6. Design Parameters and Configurability

All parameters are runtime-configurable via MQTT (sent from the dashboard, no firmware reflash required). They are persisted in MongoDB and re-sent to the device after any reconnection.

| Parameter | MQTT command | Default | Range | Rationale |
|---|---|---|---|---|
| Flow trigger threshold | `C,FF_CONFIG,THRESHOLD,<lpm>` | 0.5 L/min | 0.2–5.0 | Filters sensor noise. Lowered for slow/light rain. |
| Flush duration | `C,FF_CONFIG,DURATION,<ms>` | 5 min | 1–15 min | Based on roof area and local rainfall intensity. |
| Volume to divert | `C,FF_CONFIG,VOLUME,<L>` | 20 L | 5–50 L | AS/NZS 3500: 0.2 L/m² of roof area minimum. |
| Re-entry / pause window | `C,FF_CONFIG,REENTRY,<ms>` | 2 hours | 30 min–4 hr | Governs both completed-flush skip and paused-flush expiry. |
| Idle pulse duration | `C,FF_CONFIG,IDLE_PULSE,<ms>` | 8 s | 5–30 s | Adjustable for pipe length and rain intensity. |
| Flow pause tolerance | `C,FF_CONFIG,FLOW_TIMEOUT,<ms>` | 30 s | 15–300 s | How long flow can lapse during diversion before pausing. |

### 6.1 Flush Duration and Volume Sizing

The dual time-and-volume gate is intended to handle the full range of local rainfall intensities:

- **Light rain (low flow rate):** The volume gate may never be reached within the time window. The time gate (`ffDurationMs`) acts as the primary criterion.
- **Heavy rain (high flow rate):** The volume gate (`ffVolumeLitres`) is reached quickly, ending the flush early and beginning collection sooner — maximising water harvest without unnecessarily extending diversion.

The AS/NZS 3500 standard recommends a minimum diversion volume of 0.2 L per m² of roof catchment area. For a 100 m² roof, that is 20 L — the default `FF_VOLUME_LITRES` value. The configurable range (5–50 L) accommodates smaller or larger catchment areas.

### 6.2 Re-Entry Window — Scientific Justification

The 2-hour default for `ffReentryWindowMs` is justified by the rate of atmospheric dry deposition on rooftop surfaces. Research on roof runoff contamination identifies two deposition mechanisms during dry intervals: *atmospheric dry deposition* (PM2.5, PM10, gaseous pollutants) and *biological accumulation* (bird droppings, pollen, microbial matter) (Roof runoff contamination: a review, ResearchGate, 2021). Both accumulate continuously, but the contamination contribution from a 2-hour dry gap on a recently-flushed surface is negligible relative to the initial pre-rain surface load — the logarithmic washoff model implies the roof is still in its "post-flush clean" condition.

Beyond approximately 12 hours (overnight), meaningful re-contamination is expected. The `ffReentryWindowMs` maximum configurable value of 4 hours therefore represents a conservative bound that keeps the system within the "roof is still clean" regime.

---

## 7. Intermittent Rain Scenarios

The following table codifies expected FSM behaviour for the scenarios most likely to arise under local (Davao City) tropical convective rainfall patterns.

| Scenario | FSM behaviour | Justification |
|---|---|---|
| Rain stops during diversion, resumes in < 30 s | Counters freeze; resume seamlessly on return | `FLOW_TIMEOUT_MS` not exceeded; brief gusty pause |
| Rain stops during diversion, resumes in 30 s – 2 hr | Enters `FF_PAUSED`; resumes from saved progress on return | Dry gap insufficient for meaningful re-contamination |
| Rain stops during diversion, resumes after > 2 hr | Enters `FF_PAUSED`; window expires; resets to `FF_IDLE` | Roof treated as requiring fresh flush after extended dry gap |
| Rain stops after flush completes, resumes in < 2 hr | Re-entry path: skips diversion, goes straight to collecting | Roof already clean; additional flush wastes water |
| Rain stops after flush completes, resumes after > 2 hr | Full fresh flush on next rain event | Re-entry window expired; fresh deposition assumed |
| Very light rain — flow below threshold during idle pulse | Pulse closes; tries again in 60 s | Avoids false triggers from minimal flow |
| Calibration mode active | FSM suspended entirely; valves under manual control | Prevents interference with sensor calibration procedures |

---

## 8. Relationship to the Broader Treatment Pipeline

The first flush diverter is the **entry gate** of the treatment pipeline. Its output — water admitted to C2 — determines the quality of the feedstock for all downstream stages:

```
[Rooftop catchment]
       │
[First Flush Diverter]  ← this document
       │ (clean fraction)
      C2  →  [Filtration: C5]  →  [UV Sterilisation: C6]  →  [Potable output]
```

Getting the first flush logic right has outsized impact: contaminants passed into C2 propagate through the entire pipeline. The diverter is the lowest-cost point at which to reject them.

---

## 9. References

- Gikas, G.D., & Tsihrintzis, V.A. (2012). Assessment of water quality of first-flush roof runoff and harvested rainwater. *Journal of Hydrology*, 466–467, 115–126.
- Mitchell, V.G. (2007). How important is the selection of computational analysis method to the accuracy of rainwater tank behaviour modelling? *Hydrological Processes*, 21(21), 2850–2861.
- Farreny, R., Morales-Pinzón, T., Guisasola, A., Tayà, C., Rieradevall, J., & Gabarrell, X. (2011). Roof selection for rainwater harvesting: quantity and quality assessments in Spain. *Water Research*, 45(10), 3245–3254.
- University of Portsmouth (2013). *Quantifying the First-Flush Phenomenon: Effects of First-Flush on Water Yield*. Research Portal.
- Zobrist, J., Müller, S.R., Ammann, A., Bucheli, T.D., Mottier, V., Ochs, M., … & Schoenenberger, U. (2000). Quality of roof runoff for groundwater infiltration. *Water Research*, 34(5), 1455–1462.
- Standards Australia / Standards New Zealand. (2025). *AS/NZS 3500.3:2025 — Plumbing and Drainage: Stormwater Drainage*.
- World Health Organization. (2011). *Guidelines for Drinking-water Quality* (4th ed.). WHO Press.
- Texas Water Development Board. (2005). *The Texas Manual on Rainwater Harvesting* (3rd ed.). TWDB.
- ResearchGate (2021). Roof runoff contamination: a review on pollutant nature, material leaching and deposition.
- Czemiel Berndtsson, J. (2010). Green roof performance towards management of runoff water quantity and quality: A review. *Ecological Engineering*, 36(4), 351–360.
