import { tNow } from '../i18n';
import { ConditionReport, RentalRequest } from '../types/models';
import { parseRentalBoundaryDate } from './rentalDates';

const PICKUP_REPORT_START_HOURS_BEFORE = 2;
const PICKUP_REPORT_END_HOURS_AFTER = 2;
const RETURN_REPORT_DEADLINE_HOURS_AFTER = 3;

export interface ConditionReportRules {
  pickupReports: ConditionReport[];
  returnReports: ConditionReport[];
  userPickupReport?: ConditionReport;
  userReturnReport?: ConditionReport;
  isPickupWindowOpen: boolean;
  isPickupWindowPassed: boolean;
  isReturnWindowOpen: boolean;
  isReturnDeadlinePassed: boolean;
  hasAllPickupReports: boolean;
  hasAllReturnReports: boolean;
  canCreatePickupReport: boolean;
  canCreateReturnReport: boolean;
  canReleasePayment: boolean;
  pickupStatusMessage?: string;
  returnStatusMessage?: string;
}

export const getConditionReportRules = (
  rental: RentalRequest,
  reports: ConditionReport[],
  userEmail?: string | null,
  now = new Date(),
): ConditionReportRules => {
  const pickupReports = reports.filter((report) => report.report_type === 'pickup');
  const returnReports = reports.filter((report) => report.report_type === 'return');
  const normalizedEmail = userEmail?.toLowerCase();

  const userPickupReport = pickupReports.find(
    (report) => report.reported_by_email?.toLowerCase() === normalizedEmail,
  );
  const userReturnReport = returnReports.find(
    (report) => report.reported_by_email?.toLowerCase() === normalizedEmail,
  );

  const startDate = parseRentalBoundaryDate(rental.start_date);
  const endDate = parseRentalBoundaryDate(rental.end_date);
  const hoursSinceStart = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  const hoursSinceEnd = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60);

  const isPickupWindowOpen =
    hoursSinceStart >= -PICKUP_REPORT_START_HOURS_BEFORE &&
    hoursSinceStart <= PICKUP_REPORT_END_HOURS_AFTER;
  const isPickupWindowPassed = hoursSinceStart > PICKUP_REPORT_END_HOURS_AFTER;

  const isReturnWindowOpen =
    hoursSinceEnd >= 0 && hoursSinceEnd <= RETURN_REPORT_DEADLINE_HOURS_AFTER;
  const isReturnDeadlinePassed = hoursSinceEnd > RETURN_REPORT_DEADLINE_HOURS_AFTER;

  const hasAllPickupReports = pickupReports.length >= 2;
  const hasAllReturnReports = returnReports.length >= 2;
  const isRentalPaid = rental.status === 'paid';
  const isRentalFinished = now >= endDate;

  let pickupStatusMessage: string | undefined;
  if (rental.status !== 'paid' && !userPickupReport) {
    pickupStatusMessage = tNow('conditionRules.pickupPaidOnly');
  } else if (!userPickupReport && hoursSinceStart < -PICKUP_REPORT_START_HOURS_BEFORE) {
    pickupStatusMessage = tNow('conditionRules.pickupOpensBefore', { hours: PICKUP_REPORT_START_HOURS_BEFORE });
  } else if (!userPickupReport && isPickupWindowPassed) {
    pickupStatusMessage = tNow('conditionRules.pickupClosedAfter', { hours: PICKUP_REPORT_END_HOURS_AFTER });
  }

  let returnStatusMessage: string | undefined;
  if (rental.status !== 'paid' && !userReturnReport) {
    returnStatusMessage = tNow('conditionRules.returnPaidOnly');
  } else if (!userReturnReport && !hasAllPickupReports) {
    returnStatusMessage = tNow('conditionRules.returnNeedsPickup');
  } else if (!userReturnReport && hoursSinceEnd < 0) {
    returnStatusMessage = tNow('conditionRules.returnAfterEnd');
  } else if (!userReturnReport && isReturnDeadlinePassed) {
    returnStatusMessage = tNow('conditionRules.returnDeadlinePassed', { hours: RETURN_REPORT_DEADLINE_HOURS_AFTER });
  }

  return {
    pickupReports,
    returnReports,
    userPickupReport,
    userReturnReport,
    isPickupWindowOpen,
    isPickupWindowPassed,
    isReturnWindowOpen,
    isReturnDeadlinePassed,
    hasAllPickupReports,
    hasAllReturnReports,
    canCreatePickupReport: isRentalPaid && isPickupWindowOpen && !userPickupReport,
    canCreateReturnReport: isRentalPaid && hasAllPickupReports && isReturnWindowOpen && !userReturnReport,
    canReleasePayment: isRentalPaid && isRentalFinished && hasAllPickupReports && hasAllReturnReports,
    pickupStatusMessage,
    returnStatusMessage,
  };
};
