import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { APPOINTMENT_STATUS as S, canTransition } from '../../utils/constants.js';

describe('appointment status workflow', () => {
  it('allows the forward transitions', () => {
    assert.ok(canTransition(S.SCHEDULED, S.ARRIVED));
    assert.ok(canTransition(S.SCHEDULED, S.CANCELLED));
    assert.ok(canTransition(S.ARRIVED, S.COMPLETED));
  });

  it('rejects skipping or reversing steps', () => {
    assert.equal(canTransition(S.SCHEDULED, S.COMPLETED), false);
    assert.equal(canTransition(S.ARRIVED, S.SCHEDULED), false);
    assert.equal(canTransition(S.ARRIVED, S.CANCELLED), false);
  });

  it('treats completed and cancelled as terminal', () => {
    for (const to of Object.values(S)) {
      assert.equal(canTransition(S.COMPLETED, to), false);
      assert.equal(canTransition(S.CANCELLED, to), false);
    }
  });

  it('rejects unknown statuses', () => {
    assert.equal(canTransition('nope', S.ARRIVED), false);
  });
});
