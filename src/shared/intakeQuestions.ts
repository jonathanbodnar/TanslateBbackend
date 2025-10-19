export type FixedQuestion = {
  id: string;
  headline: string;
  leftLabel: string;
  rightLabel: string;
  helperText?: string;
};

// MVP curated quick-quiz (5–6 cards), aligned with docs examples
export const FIXED_QUICK_QUESTIONS: FixedQuestion[] = [
  {
    id: 'Q1',
    headline: 'Which pressure felt bigger?',
    leftLabel: 'Put on the spot now',
    rightLabel: 'Too many moving parts',
    helperText: 'Live vs unknowns.'
  },
  {
    id: 'Q2',
    headline: 'What kind of judgment landed?',
    leftLabel: 'Wanted exact steps & proof',
    rightLabel: 'Made it about what this means',
    helperText: 'Proof vs meaning.'
  },
  {
    id: 'Q4',
    headline: 'Which sounds more like it?',
    leftLabel: 'We’re okay',
    rightLabel: 'Lock steps',
    helperText: 'Pick one.'
  },
  {
    id: 'Q5',
    headline: 'Biggest fear here?',
    leftLabel: 'Not included',
    rightLabel: 'Not capable',
    helperText: 'Connection vs competence.'
  },
  {
    id: 'Q6',
    headline: 'What stung more?',
    leftLabel: 'Freedom boxed',
    rightLabel: 'Felt unstable',
    helperText: 'Tie-breaker.'
  }
];


