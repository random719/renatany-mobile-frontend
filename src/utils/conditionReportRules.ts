import { ConditionReport, RentalRequest } from '../types/models';

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

  const startDate = new Date(rental.start_date);
  const endDate = new Date(rental.end_date);
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
    pickupStatusMessage = 'Pickup reports are only available while the rental is in paid status.';
  } else if (!userPickupReport && hoursSinceStart < -PICKUP_REPORT_START_HOURS_BEFORE) {
    pickupStatusMessage = 'Pickup reports open 2 hours before the rental start time.';
  } else if (!userPickupReport && isPickupWindowPassed) {
    pickupStatusMessage = 'The pickup report window closed 2 hours after the rental start time.';
  }

  let returnStatusMessage: string | undefined;
  if (rental.status !== 'paid' && !userReturnReport) {
    returnStatusMessage = 'Return reports are only available while the rental is in paid status.';
  } else if (!userReturnReport && !hasAllPickupReports) {
    returnStatusMessage = 'Both pickup reports must be submitted before return reports can be created.';
  } else if (!userReturnReport && hoursSinceEnd < 0) {
    returnStatusMessage = 'Return reports can only be submitted after the rental end time.';
  } else if (!userReturnReport && isReturnDeadlinePassed) {
    returnStatusMessage = 'The return report deadline passed 3 hours after the rental end time.';
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
