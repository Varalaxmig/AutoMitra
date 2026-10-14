import { describe, expect, it, beforeEach } from "vitest";
import {
  initiate,
  claim,
  confirm,
  reject,
  cancel,
  getDriver,
  addDriver,
  rotateQr,
  resetDemo,
  useStore,
  type Sms,
} from "@/lib/store";
import { translateName } from "@/lib/i18n";

describe("AutoMitra Store & Fare Workflow", () => {
  beforeEach(() => {
    resetDemo();
  });

  it("seeds the default driver Ramesh (MH02AB1234)", () => {
    const driver = getDriver("K7M2QX9A");
    expect(driver).toBeDefined();
    expect(driver?.firstName).toBe("Ramesh");
    expect(driver?.vehicle).toBe("MH02AB1234");
    expect(driver?.active).toBe(true);
  });

  it("translates driver names properly in Hindi and Marathi", () => {
    expect(translateName("Ramesh", "hi")).toBe("रमेश");
    expect(translateName("Ramesh", "mr")).toBe("रमेश");
    expect(translateName("Ramesh", "en")).toBe("Ramesh");
    expect(translateName("Test xyz", "hi")).toBe("टेस्ट एक्सवाईजेड");
    expect(translateName("Test xyz", "mr")).toBe("टेस्ट एक्सवायझेड");
  });

  it("initiates a session with sender's name and unique 4-digit token", () => {
    const session = initiate("K7M2QX9A", 150, "Test xyz");
    expect(session.id).toBeDefined();
    expect(session.slug).toBe("K7M2QX9A");
    expect(session.amount).toBe(150);
    expect(session.senderName).toBe("Test xyz");
    expect(session.status).toBe("handed_off");
    expect(session.token).toMatch(/^\d{4}$/);
  });

  it("formats SMS with Sender's name, Amount, and Status", () => {
    const session = initiate("K7M2QX9A", 80, "Test xyz");
    claim(session.id);
    confirm(session.id);

    // Verify SMS format matches requested pattern
    const smsList = JSON.parse(localStorage.getItem("automitra-demo-v1") || "{}").sms || [];
    const confirmSms = smsList.find((m: Sms) => m.kind === "confirm");
    expect(confirmSms).toBeDefined();
    expect(confirmSms.body).toContain("From AutoMitra");
    expect(confirmSms.body).toContain("UPI ID: Test xyz");
    expect(confirmSms.body).toContain("Amount: Rs.80");
    expect(confirmSms.body).toContain("Transaction Status:");
    expect(confirmSms.body).toContain("Successful");
  });

  it("supports partial or custom credited amount on confirmation", () => {
    const session = initiate("K7M2QX9A", 120);
    claim(session.id);
    confirm(session.id, 100);
  });

  it("supports cancellation and rejection with Failed status in SMS", () => {
    const s1 = initiate("K7M2QX9A", 50, "Test xyz");
    cancel(s1.id);

    const s2 = initiate("K7M2QX9A", 60, "Test xyz");
    claim(s2.id);
    reject(s2.id);

    const smsList = JSON.parse(localStorage.getItem("automitra-demo-v1") || "{}").sms || [];
    const voidSms = smsList.find((m: Sms) => m.kind === "void");
    expect(voidSms).toBeDefined();
    expect(voidSms.body).toContain("Transaction Status:");
    expect(voidSms.body).toContain("Failed");
  });

  it("adds and rotates driver QR stickers", () => {
    const newDriver = addDriver({
      firstName: "Suresh",
      vehicle: "MH02CD5678",
      driverPhone: "9820098765",
      proxyPhone: "9930012345",
      vpa: "suresh@oksbi",
      lang: "mr",
    });

    expect(newDriver.slug).toBeDefined();
    expect(newDriver.active).toBe(true);

    const nextSlug = rotateQr(newDriver.slug);
    expect(nextSlug).not.toBe(newDriver.slug);
    expect(getDriver(newDriver.slug)).toBeUndefined();
    expect(getDriver(nextSlug)?.active).toBe(true);
  });
});
