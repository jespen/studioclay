import { FlowType, GenericStep } from '@/components/common/BookingStepper';

// Maps generic steps to URL path segments for each flow type
const STEP_URL_SEGMENTS: Record<FlowType, Record<GenericStep, string>> = {
  [FlowType.COURSE_BOOKING]: {
    [GenericStep.ITEM_SELECTION]: '',        // /book-course/:id
    [GenericStep.USER_INFO]: 'personal-info', // /book-course/:id/personal-info
    [GenericStep.PAYMENT]: 'payment',        // /book-course/:id/payment
    [GenericStep.CONFIRMATION]: 'confirmation', // /book-course/:id/confirmation
    [GenericStep.DETAILS]: 'details',        // Not used in this flow
  },
  [FlowType.GIFT_CARD]: {
    [GenericStep.ITEM_SELECTION]: 'selection',  // /gift-card-flow/selection
    [GenericStep.USER_INFO]: 'personal-info',    // /gift-card-flow/personal-info 
    [GenericStep.PAYMENT]: 'payment',        // /gift-card-flow/payment
    [GenericStep.CONFIRMATION]: 'confirmation', // /gift-card-flow/confirmation
    [GenericStep.DETAILS]: 'details',        // Not used in this flow
  },
  [FlowType.ART_PURCHASE]: {
    [GenericStep.ITEM_SELECTION]: '',        // /shop/:id (not used now)
    [GenericStep.DETAILS]: 'details',        // /shop/:id/details
    [GenericStep.USER_INFO]: 'personal-info', // /shop/:id/personal-info
    [GenericStep.PAYMENT]: 'payment',        // /shop/:id/payment
    [GenericStep.CONFIRMATION]: 'confirmation', // /shop/:id/confirmation
  },
  [FlowType.WAITLIST]: {
    [GenericStep.ITEM_SELECTION]: '',        // /waitlist/:id
    [GenericStep.USER_INFO]: 'personal-info', // /waitlist/:id/personal-info 
    [GenericStep.CONFIRMATION]: 'confirmation', // /waitlist/:id/confirmation
    [GenericStep.PAYMENT]: 'payment',        // Not used in this flow
    [GenericStep.DETAILS]: 'details',        // Not used in this flow
  },
};

// Base paths for each flow type
const BASE_PATHS: Record<FlowType, string> = {
  [FlowType.COURSE_BOOKING]: '/book-course',
  [FlowType.GIFT_CARD]: '/gift-card-flow',
  [FlowType.ART_PURCHASE]: '/shop',
  [FlowType.WAITLIST]: '/waitlist',
};

/**
 * Generates a URL for the given flow type, step, and item ID
 */
export const getStepUrl = (
  flowType: FlowType, 
  step: GenericStep, 
  itemId?: string
): string => {
  const basePath = BASE_PATHS[flowType];
  const stepSegment = STEP_URL_SEGMENTS[flowType][step];
  
  // Special case for gift card flow - doesn't need ID
  if (flowType === FlowType.GIFT_CARD) {
    return stepSegment ? `${basePath}/${stepSegment}` : basePath;
  }
  
  // All other flows need an ID
  if (!itemId) {
    console.warn(`Missing itemId for ${flowType} flow with step ${step}`);
    return basePath;
  }
  
  return stepSegment ? `${basePath}/${itemId}/${stepSegment}` : `${basePath}/${itemId}`;
};

/**
 * Gets the next step in the flow
 */
export const getNextStep = (currentStep: GenericStep, flowType: FlowType): GenericStep | null => {
  // Define step sequences for each flow
  const stepSequences: Record<FlowType, GenericStep[]> = {
    [FlowType.COURSE_BOOKING]: [
      GenericStep.ITEM_SELECTION,
      GenericStep.USER_INFO,
      GenericStep.PAYMENT,
      GenericStep.CONFIRMATION
    ],
    [FlowType.GIFT_CARD]: [
      GenericStep.ITEM_SELECTION,
      GenericStep.USER_INFO,
      GenericStep.PAYMENT,
      GenericStep.CONFIRMATION
    ],
    [FlowType.ART_PURCHASE]: [
      GenericStep.DETAILS,    // Start with details
      GenericStep.USER_INFO,  // Then user info
      GenericStep.PAYMENT,
      GenericStep.CONFIRMATION
    ],
    [FlowType.WAITLIST]: [
      GenericStep.ITEM_SELECTION,
      GenericStep.USER_INFO,
      GenericStep.CONFIRMATION
    ]
  };
  
  const sequence = stepSequences[flowType];
  const currentIndex = sequence.indexOf(currentStep);
  
  if (currentIndex === -1 || currentIndex === sequence.length - 1) {
    return null;
  }
  
  return sequence[currentIndex + 1];
};

/**
 * Gets the previous step in the flow
 */
export const getPreviousStep = (currentStep: GenericStep, flowType: FlowType): GenericStep | null => {
  // Define step sequences for each flow
  const stepSequences: Record<FlowType, GenericStep[]> = {
    [FlowType.COURSE_BOOKING]: [
      GenericStep.ITEM_SELECTION,
      GenericStep.USER_INFO,
      GenericStep.PAYMENT,
      GenericStep.CONFIRMATION
    ],
    [FlowType.GIFT_CARD]: [
      GenericStep.ITEM_SELECTION,
      GenericStep.USER_INFO,
      GenericStep.PAYMENT,
      GenericStep.CONFIRMATION
    ],
    [FlowType.ART_PURCHASE]: [
      GenericStep.DETAILS,    // Start with details
      GenericStep.USER_INFO,  // Then user info
      GenericStep.PAYMENT,
      GenericStep.CONFIRMATION
    ],
    [FlowType.WAITLIST]: [
      GenericStep.ITEM_SELECTION,
      GenericStep.USER_INFO,
      GenericStep.CONFIRMATION
    ]
  };
  
  const sequence = stepSequences[flowType];
  const currentIndex = sequence.indexOf(currentStep);
  
  if (currentIndex <= 0) {
    return null;
  }
  
  return sequence[currentIndex - 1];
};

/**
 * Gets the URL for the next step
 */
export const getNextStepUrl = (
  currentStep: GenericStep, 
  flowType: FlowType, 
  itemId?: string
): string | null => {
  const nextStep = getNextStep(currentStep, flowType);
  if (nextStep === null) return null;
  
  return getStepUrl(flowType, nextStep, itemId);
};

/**
 * Gets the URL for the previous step
 */
export const getPreviousStepUrl = (
  currentStep: GenericStep, 
  flowType: FlowType, 
  itemId?: string
): string | null => {
  const previousStep = getPreviousStep(currentStep, flowType);
  if (previousStep === null) return null;
  
  return getStepUrl(flowType, previousStep, itemId);
}; 