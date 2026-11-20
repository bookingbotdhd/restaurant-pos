"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.round2 = void 0;
exports.daysInclusive = daysInclusive;
exports.daysInMonthOf = daysInMonthOf;
exports.computePayroll = computePayroll;
exports.netWithAdjustments = netWithAdjustments;
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
exports.round2 = round2;
function daysInclusive(start, end) {
    const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
    return Math.round(ms / 86_400_000) + 1;
}
function daysInMonthOf(date) {
    const [y, m] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
function computePayroll(periodStart, periodEnd, tipPool, staff) {
    const periodDays = daysInclusive(periodStart, periodEnd);
    const monthDays = daysInMonthOf(periodStart);
    const totalHours = staff.reduce((s, p) => s + p.hoursWorked, 0);
    const tipRecipients = staff.filter((p) => p.hoursWorked > 0);
    const tips = new Map();
    if (tipPool > 0 && totalHours > 0) {
        let allocated = 0;
        tipRecipients.forEach((p, i) => {
            const share = i === tipRecipients.length - 1
                ? (0, exports.round2)(tipPool - allocated)
                : (0, exports.round2)((tipPool * p.hoursWorked) / totalHours);
            allocated = (0, exports.round2)(allocated + share);
            tips.set(p.userId, share);
        });
    }
    return staff.map((p) => {
        const hours = (0, exports.round2)(p.hoursWorked);
        let basePay;
        let deduction = 0;
        if (p.payType === 'HOURLY') {
            basePay = (0, exports.round2)(p.rate * p.hoursWorked);
        }
        else {
            basePay = (0, exports.round2)((p.rate * periodDays) / monthDays);
            deduction = (0, exports.round2)((p.rate / monthDays) * p.unpaidLeaveDays);
        }
        const tipShare = tips.get(p.userId) ?? 0;
        return {
            userId: p.userId,
            hoursWorked: hours,
            basePay,
            tipShare,
            unpaidLeaveDeduction: deduction,
            netPay: (0, exports.round2)(basePay - deduction + tipShare),
        };
    });
}
function netWithAdjustments(line, adj) {
    const earned = (0, exports.round2)(line.basePay + line.tipShare + adj.allowances + adj.bonus);
    const deducted = (0, exports.round2)(line.unpaidLeaveDeduction + adj.advanceRecovery + adj.otherDeductions);
    const net = (0, exports.round2)(earned - deducted);
    if (net < 0) {
        throw new RangeError(`Deductions (${deducted}) are more than the pay (${earned})`);
    }
    return net;
}
//# sourceMappingURL=payroll.calc.js.map