'use strict';

const { analyzeSnakeSubmission } = require('./submissionAnalysis');

// Rule order matters: first match wins and becomes the rejection reason.
const RULES = Object.freeze([
  {
    code: 'hello_world_or_non_challenge_text',
    message:
      'Execution succeeded, but Snake simulation was refused: submission contains non-challenge text (hello world).',
    when: ({ analysis }) => analysis.containsHelloWorld,
  },
  {
    code: 'output_only_submission',
    message:
      'Execution succeeded, but Snake simulation was refused: submission appears to be output-only (print/echo of fixed moves).',
    when: ({ analysis }) => analysis.isOutputLiteralOnly,
  },
  {
    code: 'missing_challenge_input',
    message:
      'Execution succeeded, but Snake simulation was refused: challenge input was not read. Read the snake stdin contract first.',
    when: ({ analysis }) => !analysis.hasInputRead,
  },
  {
    code: 'missing_challenge_logic',
    message:
      'Execution succeeded, but Snake simulation was refused: submission is too trivial (no control-flow/decision logic detected).',
    when: ({ analysis }) => !analysis.hasControlFlow,
  },
]);

function toPublicAnalysis(analysis) {
  return {
    significantLineCount: analysis.significantLineCount,
    hasInputRead: analysis.hasInputRead,
    hasOutputCalls: analysis.hasOutputCalls,
    hasControlFlow: analysis.hasControlFlow,
    isOutputLiteralOnly: analysis.isOutputLiteralOnly,
    containsHelloWorld: analysis.containsHelloWorld,
  };
}

function validateSnakeSubmission(context) {
  const analysis = analyzeSnakeSubmission(context);
  const publicAnalysis = toPublicAnalysis(analysis);

  // Keep the first triggered rule to provide one clear feedback message.
  for (const rule of RULES) {
    if (rule.when({ ...context, analysis })) {
      return {
        accepted: false,
        code: rule.code,
        message: rule.message,
        analysis: publicAnalysis,
      };
    }
  }

  return {
    accepted: true,
    code: null,
    message: 'Submission accepted for snake simulation.',
    analysis: publicAnalysis,
  };
}

module.exports = {
  validateSnakeSubmission,
};
