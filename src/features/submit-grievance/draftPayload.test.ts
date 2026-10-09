import { describe, expect, it } from "vitest";
import { buildSaveDraftPayload, resolveContactEmail, resolveContactMobile, resolveSubmitterName } from "./draftPayload";

describe("resolveSubmitterName", () => {
  it("prefers the type-specific identity field over the account's own profile", () => {
    expect(
      resolveSubmitterName({
        submitterType: "individual",
        identityValues: { fullName: "Abebe Bikila" },
        userFullName: "Someone Else",
      })
    ).toBe("Abebe Bikila");
  });

  it("reads representativeName for both Cooperative and NGO, officeName for Woreda/Kebele, farmerName for Development Agent", () => {
    expect(resolveSubmitterName({ identityValues: { representativeName: "Rep Name" } })).toBe("Rep Name");
    expect(resolveSubmitterName({ identityValues: { officeName: "Office Name" } })).toBe("Office Name");
    expect(
      resolveSubmitterName({ submitterType: "development_agent", identityValues: { farmerName: "Farmer Name" } })
    ).toBe("Farmer Name");
  });

  it("falls back to the signed-in account's own profile for a self-submitting type", () => {
    expect(
      resolveSubmitterName({ submitterType: "individual", identityValues: {}, userFullName: "Account Holder" })
    ).toBe("Account Holder");
  });

  it("never falls back to the agent's own profile for a Development Agent — the farmer is the submitter of record, not the agent", () => {
    expect(
      resolveSubmitterName({
        submitterType: "development_agent",
        identityValues: {}, // farmerName not yet typed — Step 1's Save Draft is deliberately unvalidated
        userFullName: "The Signed-In Agent",
      })
    ).toBe("");
  });
});

describe("resolveContactMobile / resolveContactEmail", () => {
  it("never fall back to the agent's own phone/email for a Development Agent", () => {
    expect(
      resolveContactMobile({ submitterType: "development_agent", identityValues: {}, userMobile: "0911000000" })
    ).toBe("");
    expect(resolveContactEmail({ submitterType: "development_agent", identityValues: {}, userEmail: "agent@example.com" })).toBe(
      ""
    );
  });

  it("do fall back to the account's own phone/email for a self-submitting type", () => {
    expect(resolveContactMobile({ submitterType: "individual", identityValues: {}, userMobile: "0911000000" })).toBe(
      "+251911000000"
    );
    expect(resolveContactEmail({ submitterType: "individual", identityValues: {}, userEmail: "me@example.com" })).toBe(
      "me@example.com"
    );
  });
});

describe("buildSaveDraftPayload", () => {
  it("sends every optional field as an empty string, not omitted, so a cleared value can't resurface from an earlier save", () => {
    const payload = buildSaveDraftPayload({ clientSubmissionUuid: "uuid-1", identityValues: {} });
    expect(payload).toEqual({
      client_submission_uuid: "uuid-1",
      submission_channel: "",
      submitter_type: "",
      submitter_name: "",
      contact_mobile: "",
      country_code: "+251",
      phone_number: "",
      contact_email: "",
      administrative_area: undefined,
      administrative_unit: "",
      service_category: "",
      grievance_type: "",
      associated_service_provider: "",
      description: "",
      desired_outcome: "",
    });
  });

  it("omits administrative_area (rather than sending it empty) when it hasn't resolved yet", () => {
    const payload = buildSaveDraftPayload({ clientSubmissionUuid: "uuid-1", identityValues: {} });
    expect(payload.administrative_area).toBeUndefined();
    expect("administrative_area" in payload).toBe(true); // present as a key, just undefined — JSON.stringify drops it
  });
});
