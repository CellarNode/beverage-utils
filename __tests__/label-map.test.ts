import { describe, test, expect } from "vitest";
import { buildLabelMap } from "../src/label-map";

describe("buildLabelMap", () => {
  test("maps category ids to names", () => {
    const map = buildLabelMap({
      categories: [
        { id: "wine", name: "Still Wine", subtypes: [] },
        { id: "beer", name: "Beer", subtypes: [] },
      ],
    });
    expect(map["wine"]).toBe("Still Wine");
    expect(map["beer"]).toBe("Beer");
  });

  test("maps subtype ids to names with flat and composite keys", () => {
    const map = buildLabelMap({
      categories: [
        {
          id: "wine",
          name: "Still Wine",
          subtypes: [{ id: "red", name: "Red Wine" }],
        },
      ],
    });
    expect(map["red"]).toBe("Red Wine");
    expect(map["wine:red"]).toBe("Red Wine");
  });

  test("disambiguates subtypes across categories via composite keys", () => {
    const map = buildLabelMap({
      categories: [
        { id: "wine", name: "Still Wine", subtypes: [{ id: "red", name: "Red Wine" }] },
        { id: "sparkling_wine", name: "Sparkling Wine", subtypes: [{ id: "red", name: "Red Sparkling" }] },
      ],
    });
    expect(map["wine:red"]).toBe("Red Wine");
    expect(map["sparkling_wine:red"]).toBe("Red Sparkling");
    expect(map["red"]).toBe("Red Sparkling");
  });

  test("handles empty categories", () => {
    const map = buildLabelMap({ categories: [] });
    expect(Object.keys(map)).toHaveLength(0);
  });
});
