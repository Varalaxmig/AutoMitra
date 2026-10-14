import { describe, expect, it, beforeEach } from "vitest";
import {
  addDriver,
  initiate,
  claim,
  confirm,
  reject,
  cancel,
  getState,
  resetStoreForTesting,
  type Sms,
} from "@/lib/store";

describe("Driver Registration & Per-Driver Transaction SMS Workflow", () => {
  beforeEach(() => {
    resetStoreForTesting();
  });

  it("creates a brand new unique QR code slug for every newly registered driver", () => {
    const driver1 = addDriver({
      firstName: "Ganesh",
      vehicle: "MH02AA1111",
      driverPhone: "9082943684",
      proxyPhone: "9930011111",
      vpa: "ganesh.family@okaxis",
      lang: "hi",
    });

    const driver2 = addDriver({
      firstName: "Sunil",
      vehicle: "MH02BB2222",
      driverPhone: "9820022222",
      proxyPhone: "9930022222",
      vpa: "sunil.family@okhdfcbank",
      lang: "mr",
    });

    expect(driver1.slug).toBeDefined();
    expect(driver2.slug).toBeDefined();
    expect(driver1.slug).not.toBe(driver2.slug);
    expect(driver1.driverPhone).toBe("9082943684");
    expect(driver2.driverPhone).toBe("9820022222");
    expect(driver1.isSeed).toBe(false);
    expect(driver2.isSeed).toBe(false);
  });

  it("shares transaction SMS exclusively to driver 1's phone when commuter pays via driver 1's QR code", () => {
    const d1 = addDriver({
      firstName: "Ganesh",
      vehicle: "MH02AA1111",
      driverPhone: "9082943684",
      proxyPhone: "9930011111",
      vpa: "ganesh.family@okaxis",
      lang: "hi",
    });

    const d2 = addDriver({
      firstName: "Sunil",
      vehicle: "MH02BB2222",
      driverPhone: "9820022222",
      proxyPhone: "9930022222",
      vpa: "sunil.family@okhdfcbank",
      lang: "mr",
    });

    // Commuter scans driver 1's QR code and initiates payment
    const sessionD1 = initiate(d1.slug, 120, "passenger1@upi");
    claim(sessionD1.id);
    confirm(sessionD1.id);

    // Verify SMS logs in state
    const state = getState();
    const d1Sms = state.sms.filter((m: Sms) => m.to === "9082943684");
    const d2Sms = state.sms.filter((m: Sms) => m.to === "9820022222");

    // Driver 1 received the confirmation transaction SMS
    expect(d1Sms.some((m) => m.kind === "confirm")).toBe(true);
    const confirmMsg = d1Sms.find((m) => m.kind === "confirm")!;
    expect(confirmMsg.body).toContain("From AutoMitra");
    expect(confirmMsg.body).toContain("UPI ID: passenger1@upi");
    expect(confirmMsg.body).toContain("Amount: Rs.120");
    expect(confirmMsg.body).toContain("Transaction Status: सफल (Successful)");

    // Driver 2 must NOT receive driver 1's transaction SMS
    expect(d2Sms.some((m) => m.kind === "confirm")).toBe(false);
  });

  it("shares failed transaction SMS to driver 2 when fare is rejected on driver 2's QR code", () => {
    const d2 = addDriver({
      firstName: "Sunil",
      vehicle: "MH02BB2222",
      driverPhone: "9820022222",
      proxyPhone: "9930022222",
      vpa: "sunil.family@okhdfcbank",
      lang: "mr",
    });

    // Commuter scans driver 2's QR code
    const sessionD2 = initiate(d2.slug, 75, "passenger2@upi");
    claim(sessionD2.id);
    reject(sessionD2.id);

    const state = getState();
    const d2Sms = state.sms.filter((m: Sms) => m.to === "9820022222");
    const voidMsg = d2Sms.find((m) => m.kind === "void")!;

    expect(voidMsg).toBeDefined();
    expect(voidMsg.body).toContain("From AutoMitra");
    expect(voidMsg.body).toContain("UPI ID: passenger2@upi");
    expect(voidMsg.body).toContain("Amount: Rs.75");
    expect(voidMsg.body).toContain("Transaction Status: अयशस्वी (Failed)");
  });
});
