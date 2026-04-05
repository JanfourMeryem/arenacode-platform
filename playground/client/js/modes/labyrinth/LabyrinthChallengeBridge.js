/*
  Labyrinth challenge bridge.
  Responsibilities:
  - enable dedicated labyrinth execution mode
  - validate whether simulation data can be sent to parent challenge page
  - send success/rejection events to parent via postMessage
*/

const DELIVERABLE_JUDGE_STATUSES = new Set([
  'success',
  'wall_collision',
  'out_of_bounds',
  'step_limit_reached',
  'no_exit',
]);

export class LabyrinthChallengeBridge {
  constructor(runtimeContext, windowRef = window) {
    this.runtimeContext = runtimeContext;
    this.windowRef = windowRef;
  }

  get enabled() {
    return Boolean(this.runtimeContext?.isLabyrinthChallenge);
  }

  buildExecutionPayload(basePayload) {
    if (!this.enabled) return basePayload;
    return {
      ...basePayload,
      mode: 'labyrinth',
    };
  }

  isSimulationRejected(executionResponse) {
    if (!executionResponse || typeof executionResponse !== 'object') return false;
    if (executionResponse.labyrinthSimulationRejected === true) return true;
    if (executionResponse?.labyrinthJudge?.status === 'invalid_output') return true;
    if (executionResponse?.labyrinthJudge?.status === 'submission_rejected') return true;
    return false;
  }

  getSimulationDeliveryState(executionResponse) {
    if (!this.enabled) return { deliverable: false, reason: 'labyrinth_mode_disabled' };

    if (this.isSimulationRejected(executionResponse)) {
      return { deliverable: false, reason: 'simulation_rejected' };
    }

    const simulation = executionResponse?.labyrinthSimulation;
    if (!simulation || typeof simulation !== 'object') {
      return { deliverable: false, reason: 'missing_simulation' };
    }

    const judgeStatus = executionResponse?.labyrinthJudge?.status;
    if (!DELIVERABLE_JUDGE_STATUSES.has(judgeStatus)) {
      return { deliverable: false, reason: 'invalid_judge_status' };
    }

    const parentWindow = this.windowRef.parent;
    if (!parentWindow || parentWindow === this.windowRef) {
      return { deliverable: false, reason: 'missing_parent' };
    }

    return { deliverable: true, reason: null, parentWindow };
  }

  postSimulationToParent(executionResponse) {
    const deliveryState = this.getSimulationDeliveryState(executionResponse);
    if (!deliveryState.deliverable) return false;

    deliveryState.parentWindow.postMessage(
      {
        type: 'labyrinth-simulation-generated',
        simulation: executionResponse?.labyrinthSimulation,
        judge: executionResponse?.labyrinthJudge || null,
      },
      '*'
    );

    return true;
  }

  postRejectionToParent(executionResponse, fallbackReason = 'Simulation rejected by challenge rules.') {
    if (!this.enabled) return false;

    const parentWindow = this.windowRef.parent;
    if (!parentWindow || parentWindow === this.windowRef) return false;

    const reasonFromJudge = executionResponse?.labyrinthJudge?.reason;
    const reason = typeof reasonFromJudge === 'string' && reasonFromJudge.trim().length
      ? reasonFromJudge.trim()
      : fallbackReason;

    parentWindow.postMessage(
      {
        type: 'labyrinth-simulation-rejected',
        reason,
        judge: executionResponse?.labyrinthJudge || null,
      },
      '*'
    );

    return true;
  }
}
