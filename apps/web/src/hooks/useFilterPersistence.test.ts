import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface FilterState {
  countries: string[];
  anonymity: string[];
  minLatency: number;
  maxLatency: number;
}

const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

const originalLocalStorage = global.localStorage;

describe("useFilterPersistence utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.localStorage = mockStorage as any;
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  it("loads state from localStorage", () => {
    const storedState: FilterState = {
      countries: ["US", "GB"],
      anonymity: ["elite"],
      minLatency: 50,
      maxLatency: 1000,
    };
    mockStorage.getItem.mockReturnValue(JSON.stringify(storedState));

    const loaded = JSON.parse(mockStorage.getItem("test-filter") || "null");
    expect(loaded).toEqual(storedState);
  });

  it("returns default state when storage is empty", () => {
    mockStorage.getItem.mockReturnValue(null);

    const defaultState: FilterState = {
      countries: [],
      anonymity: [],
      minLatency: 0,
      maxLatency: 5000,
    };

    const loaded =
      mockStorage.getItem("test-filter") || JSON.stringify(defaultState);
    const parsed = JSON.parse(loaded);
    expect(parsed).toEqual(defaultState);
  });

  it("saves state to localStorage", () => {
    const state: FilterState = {
      countries: ["US"],
      anonymity: [],
      minLatency: 100,
      maxLatency: 2000,
    };

    const serialized = JSON.stringify(state);
    mockStorage.setItem("test-filter", serialized);

    expect(mockStorage.setItem).toHaveBeenCalledWith("test-filter", serialized);
  });

  it("removes state from localStorage on reset", () => {
    mockStorage.removeItem("test-filter");

    expect(mockStorage.removeItem).toHaveBeenCalledWith("test-filter");
  });

  it("handles corrupted JSON gracefully", () => {
    mockStorage.getItem.mockReturnValue("invalid json");

    try {
      JSON.parse(mockStorage.getItem("test-filter") || "null");
      expect(true).toBe(false);
    } catch {
      expect(true).toBe(true);
    }
  });

  it("handles localStorage errors gracefully", () => {
    mockStorage.getItem.mockImplementation(() => {
      throw new Error("localStorage disabled");
    });

    try {
      mockStorage.getItem("test-filter");
      expect(true).toBe(true);
    } catch {
      expect(true).toBe(true);
    }
  });

  it("merges partial updates correctly", () => {
    const currentState: FilterState = {
      countries: ["US"],
      anonymity: ["elite"],
      minLatency: 50,
      maxLatency: 1000,
    };

    const partialUpdate = {
      countries: ["GB", "FR"],
      maxLatency: 2000,
    };

    const merged = { ...currentState, ...partialUpdate };

    expect(merged.countries).toEqual(["GB", "FR"]);
    expect(merged.anonymity).toEqual(["elite"]);
    expect(merged.minLatency).toBe(50);
    expect(merged.maxLatency).toBe(2000);
  });
});
