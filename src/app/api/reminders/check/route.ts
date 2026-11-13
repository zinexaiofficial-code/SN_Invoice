import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function GET(request: Request) {
  try {
    const preferences = storage.getNotificationPreferences();
    const cheques = storage.getCheques();

    const todayStr = new Date().toISOString().split("T")[0];

    const urgentList: any[] = [];
    const dueTodayList: any[] = [];
    const overdueList: any[] = [];
    const returnedList: any[] = [];

    for (const c of cheques) {
      if (c.status === "cleared" || c.status === "cancelled" || c.status === "replaced") {
        continue;
      }

      if (c.status === "returned") {
        returnedList.push({
          chequeNumber: c.chequeNumber,
          party: c.payerOrPayeeName,
          amount: c.amount,
          entity: c.billingEntityName,
          returnReason: c.returnReason,
          followUpDate: c.followUpDate
        });
        urgentList.push(c);
        continue;
      }

      const targetDate = c.expectedActionDate || c.chequeDate;
      if (!targetDate) continue;

      if (targetDate < todayStr) {
        overdueList.push({
          chequeNumber: c.chequeNumber,
          party: c.payerOrPayeeName,
          amount: c.amount,
          entity: c.billingEntityName,
          dueDate: targetDate,
          daysOverdue: Math.round(
            (new Date(todayStr).getTime() - new Date(targetDate).getTime()) / (1000 * 60 * 60 * 24)
          )
        });
        urgentList.push(c);
      } else if (targetDate === todayStr) {
        dueTodayList.push({
          chequeNumber: c.chequeNumber,
          party: c.payerOrPayeeName,
          amount: c.amount,
          entity: c.billingEntityName,
          type: c.type
        });
        urgentList.push(c);
      }
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      timezone: preferences.timezone,
      summary: {
        totalActiveCheques: cheques.filter(
          (c) => c.status !== "cleared" && c.status !== "cancelled"
        ).length,
        urgentCount: urgentList.length,
        dueTodayCount: dueTodayList.length,
        overdueCount: overdueList.length,
        returnedCount: returnedList.length
      },
      notifications: {
        emailEnabled: preferences.emailEnabled,
        emailRecipient: preferences.emailRecipient,
        pushEnabled: preferences.pushEnabled,
        status: "Reminders evaluated successfully"
      },
      dueToday: dueTodayList,
      overdue: overdueList,
      returned: returnedList
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check cheque reminders" },
      { status: 500 }
    );
  }
}
