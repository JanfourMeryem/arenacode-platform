/*
  Snake challenge bridge.
  Responsibilities:
  - enrich run payload with snake mode/config
  - decide if a server response is safe to deliver to parent
  - send the final simulation via postMessage when valid
*/

import { resolveSnakeConfigFromParent } from './SnakeConfigProvider.js';

const DELIVERABLE_JUDGE_STATUSES = new Set([
  'success',
  'out_of_bounds',
  'revisited_cell',
]);

export class SnakeChallengeBridge {
  constructor(runtimeContext, windowRef = window) {
    this.runtimeContext = runtimeContext;
    this.windowRef = windowRef;
  }

  get enabled() {
    return Boolean(this.runtimeContext?.isSnakeChallenge);
  }

  buildExecutionPayload(basePayload) {
    if (!this.enabled) return basePayload;
    return {
      ...basePayload,
      mode: 'snake',
      snakeConfig: resolveSnakeConfigFromParent(this.windowRef),
    };
  }

  isSimulationRejected(executionResponse) {
    if (!executionResponse || typeof executionResponse !== 'object') return false;
    if (executionResponse.snakeSimulationRejected === true) return true;
    if (executionResponse?.snakeValidation?.accepted === false) return true;
    if (executionResponse?.snakeJudge?.status === 'submission_rejected') return true;
    return false;
  }

  getSimulationDeliveryState(executionResponse) {
    if (!this.enabled) return { deliverable: false, reason: 'snake_mode_disabled' };
    if (this.isSimulationRejected(executionResponse)) {
      return { deliverable: false, reason: 'submission_rejected' };
    }

    const simulation = executionResponse?.snakeSimulation;
    if (!simulation || typeof simulation !== 'object') {
      return { deliverable: false, reason: 'missing_simulation' };
    }

    const judgeStatus = executionResponse?.snakeJudge?.status;
    if (judgeStatus === 'invalid_output') {
      return { deliverable: false, reason: 'invalid_output' };
    }
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
    // Single gate: parent only receives simulations that passed delivery checks.
    const deliveryState = this.getSimulationDeliveryState(executionResponse);
    if (!deliveryState.deliverable) return false;
    const simulation = executionResponse?.snakeSimulation;

    deliveryState.parentWindow.postMessage(
      {
        type: 'snake-simulation-generated',
        simulation,
        judge: executionResponse?.snakeJudge || null,
      },
      '*'
    );
    return true;
  }

  postRejectionToParent(executionResponse, fallbackReason = 'Submission rejected by challenge rules.') {
    if (!this.enabled) return false;

    const parentWindow = this.windowRef.parent;
    if (!parentWindow || parentWindow === this.windowRef) return false;

    const reasonFromJudge = executionResponse?.snakeJudge?.reason;
    const reason = typeof reasonFromJudge === 'string' && reasonFromJudge.trim().length
      ? reasonFromJudge.trim()
      : fallbackReason;

    parentWindow.postMessage(
      {
        type: 'snake-simulation-rejected',
        reason,
        judge: executionResponse?.snakeJudge || null,
      },
      '*'
    );

    return true;
  }
}
