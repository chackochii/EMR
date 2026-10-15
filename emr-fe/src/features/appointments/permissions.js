import { hasAccess } from '../../constants/roles';
import { APPOINTMENT_STATUS as STATUS } from '../../constants/statuses';

export const ACTIONS = Object.freeze({
  VIEW: 'view',
  ARRIVE: 'arrive',
  EDIT: 'edit',
  COMPLETE: 'complete',
  CANCEL: 'cancel',
});

/** Row actions a role may perform on an appointment in a given status. */
export function getAvailableActions(role, status) {
  const actions = [ACTIONS.VIEW];
  const frontDesk = hasAccess(role, 'MANAGE_FRONT_DESK');
  const isOpen = status === STATUS.SCHEDULED || status === STATUS.ARRIVED;

  if (frontDesk && status === STATUS.SCHEDULED) actions.push(ACTIONS.ARRIVE);
  if (isOpen) actions.push(ACTIONS.EDIT);
  if (hasAccess(role, 'COMPLETE_VISIT') && status === STATUS.ARRIVED) actions.push(ACTIONS.COMPLETE);
  if (frontDesk && status === STATUS.SCHEDULED) actions.push(ACTIONS.CANCEL);
  return actions;
}
