/*
  Rock Paper Scissors challenge bridge.
  Responsibilities:
  - enable dedicated RPS execution mode
  - validate if generated simulation can be delivered to parent challenge page
  - send success/rejection events to parent via postMessage
*/

const DELIVERABLE_JUDGE_STATUSES = new Set([
  'success',
  'defeat',
  'draw',
]);

export class RockPaperScissorsChallengeBridge {
  constructor(runtimeContext, windowRef = window) {
    this.runtimeContext = runtimeContext;
    this.windowRef = windowRef;
  }

  get enabled() {
    return Boolean(this.runtimeContext?.isRockPaperScissorsChallenge);
  }

  buildExecutionPayload(basePayload) {
    if (!this.enabled) return basePayload;
    return {
      ...basePayload,
      mode: 'rock-paper-scissors',
    };
  }

  isSimulationRejected(executionResponse) {
    if (!executionResponse || typeof executionResponse !== 'object') return false;
    if (executionResponse.rockPaperScissorsSimulationRejected === true) return true;
    if (executionResponse?.rockPaperScissorsJudge?.status === 'invalid_output') return true;
    if (executionResponse?.rockPaperScissorsJudge?.status === 'submission_rejected') return true;
    return false;
  }

  getSimulationDeliveryState(executionResponse) {
    if (!this.enabled) return { deliverable: false, reason: 'rock_paper_scissors_mode_disabled' };

    if (this.isSimulationRejected(executionResponse)) {
      return { deliverable: false, reason: 'simulation_rejected' };
    }

    const simulation = executionResponse?.rockPaperScissorsSimulation;
    if (!simulation || typeof simulation !== 'object') {
      return { deliverable: false, reason: 'missing_simulation' };
    }

    const judgeStatus = executionResponse?.rockPaperScissorsJudge?.status;
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
        type: 'rock-paper-scissors-simulation-generated',
        simulation: executionResponse?.rockPaperScissorsSimulation,
        judge: executionResponse?.rockPaperScissorsJudge || null,
      },
      '*'
    );

    return true;
  }

  postRejectionToParent(
    executionResponse,
    fallbackReason = 'Submission rejected by challenge rules.'
  ) {
    if (!this.enabled) return false;

    const parentWindow = this.windowRef.parent;
    if (!parentWindow || parentWindow === this.windowRef) return false;

    const normalizedFallback = typeof fallbackReason === 'string' && fallbackReason.trim().length
      ? fallbackReason.trim()
      : 'Submission rejected by challenge rules.';
    const reasonFromJudge = executionResponse?.rockPaperScissorsJudge?.reason;
    const reason = normalizedFallback || (
      typeof reasonFromJudge === 'string' && reasonFromJudge.trim().length
        ? reasonFromJudge.trim()
        : 'Submission rejected by challenge rules.'
    );

    parentWindow.postMessage(
      {
        type: 'rock-paper-scissors-simulation-rejected',
        reason,
        judge: executionResponse?.rockPaperScissorsJudge || null,
      },
      '*'
    );

    return true;
  }
}
