import { describe, it, expect } from "vitest";
import { APP_NAME } from "../src/appInfo";

describe("앱 정보", () => {
  it("이름은 SELAH RTA 이다", () => {
    expect(APP_NAME).toBe("SELAH RTA");
  });
});
