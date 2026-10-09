import { describe, expect, it } from 'vitest';
import { firstIncompleteStep, getDetailsErrors, type WizardFields } from './wizardSteps';

const area = (id: string) => ({ id, name: id, pathCode: '' });

const COMPLETE: WizardFields = {
  submitterType: 'individual',
  submissionChannel: 'web',
  identityValues: { fullName: 'Tigist Bekele', phoneCode: '+251', phoneNumber: '0911000000', faydaId: '1234567890123456' },
  serviceCategory: 'Inputs',
  grievanceType: 'GTYPE-00001',
  region: area('region-ET04'),
  zone: area('zone-ET0401'),
  woreda: area('woreda-ET040101'),
  description: 'Fertilizer allocated for the season has not reached the kebele store.',
};

describe('firstIncompleteStep', () => {
  it('allows Review & Submit only when every earlier step is valid', () => {
    expect(firstIncompleteStep(COMPLETE)).toBe(3);
  });

  it('stops at Step 1 when the submitter identity is incomplete', () => {
    expect(firstIncompleteStep({ ...COMPLETE, submissionChannel: '' })).toBe(1);
    expect(firstIncompleteStep({ ...COMPLETE, identityValues: {} })).toBe(1);
  });

  it('stops at Step 2 when a required detail is missing or the description is too short', () => {
    expect(firstIncompleteStep({ ...COMPLETE, woreda: null })).toBe(2);
    expect(firstIncompleteStep({ ...COMPLETE, description: 'Too short' })).toBe(2);
  });
});

describe('getDetailsErrors', () => {
  it('flags every missing required field, and never the optional kebele', () => {
    const errors = getDetailsErrors({
      serviceCategory: '',
      grievanceType: '',
      region: null,
      zone: null,
      woreda: null,
      description: '',
    });
    expect(Object.keys(errors).sort()).toEqual(
      ['description', 'grievanceType', 'region', 'serviceCategory', 'woreda', 'zone'].sort()
    );
  });
});
