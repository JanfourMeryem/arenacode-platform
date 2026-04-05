/*
  Treasure challenge bridge.
  Responsibilities:
  - enable dedicated treasure execution mode
  - validate if generated data can be delivered to parent challenge page
  - send success/rejection events to parent via postMessage
*/

const DELIVERABLE_JUDGE_STATUSES = new Set([
  'success',
  'partial',
]);

export class TreasureChallengeBridge {
  constructor(runtimeContext, windowRef = window) {
    this.runtimeContext = runtimeContext;
    this.windowRef = windowRef;
  }

  get enabled() {
    return Boolean(this.runtimeContext?.isTreasureChallenge);
  }

  buildExecutionPayload(basePayload) {
    if (!this.enabled) return basePayload;
    return {
      ...basePayload,
      mode: 'treasure',
    };
  }

  isSimulationRejected(executionResponse) {
    if (!executionResponse || typeof executionResponse !== 'object') return false;
    if (executionResponse.treasureSimulationRejected === true) return true;
    if (executionResponse?.treasureJudge?.status === 'invalid_output') return true;
    if (executionResponse?.treasureJudge?.status === 'submission_rejected') return true;
    return false;
  }

  getSimulationDeliveryState(executionResponse) {
    if (!this.enabled) return { deliverable: false, reason: 'treasure_mode_disabled' };

    if (this.isSimulationRejected(executionResponse)) {
      return { deliverable: false, reason: 'simulation_rejected' };
    }

    const simulation = executionResponse?.treasureSimulation;
    if (!simulation || typeof simulation !== 'object') {
      return { deliverable: false, reason: 'missing_simulation' };
    }

    const judgeStatus = executionResponse?.treasureJudge?.status;
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
        type: 'treasure-simulation-generated',
        simulation: executionResponse?.treasureSimulation,
        judge: executionResponse?.treasureJudge || null,
      },
      '*'
    );

    return true;
  }

  postRejectionToParent(executionResponse, fallbackReason = 'Submission rejected by challenge rules.') {
    if (!this.enabled) return false;

    const parentWindow = this.windowRef.parent;
    if (!parentWindow || parentWindow === this.windowRef) return false;

    parentWindow.postMessage(
      {
        type: 'treasure-simulation-rejected',
        reason: fallbackReason,
        judge: executionResponse?.treasureJudge || null,
      },
      '*'
    );

    return true;
  }
}
