/**
 * Typical running power of household appliances sold in Pakistan, used by the electricity units and
 * solar sizing calculators. Watts are running draw, not nameplate peaks; the duty factor is the share of
 * switched-on time a thermostat-controlled appliance actually draws power.
 */
export const APPLIANCES = {
  reviewedAt: "2026-09-18",
  source: { title: "Manufacturer datasheets and energy labels (Orient, Dawlance, Haier, Gree, PEL, Super Asia) and NEEECA appliance labelling", publisher: "Searchable" },
  items: {
    fan: { label: "Ceiling fan", watts: 75, duty: 1 },
    led: { label: "LED bulb or tube", watts: 12, duty: 1 },
    fridge: { label: "Refrigerator (medium)", watts: 150, duty: 0.4 },
    acInverter: { label: "1.5 ton inverter AC", watts: 1_400, duty: 0.6 },
    acFixed: { label: "1.5 ton non-inverter AC", watts: 1_800, duty: 0.75 },
    tv: { label: "LED TV (43 inch)", watts: 80, duty: 1 },
    pump: { label: "Water pump (1 hp)", watts: 750, duty: 1 },
    iron: { label: "Electric iron", watts: 1_000, duty: 0.7 },
    washer: { label: "Washing machine", watts: 500, duty: 1 },
    geyser: { label: "Electric water heater", watts: 2_000, duty: 0.6 },
    laptop: { label: "Laptop, router, phone charging", watts: 70, duty: 1 },
    microwave: { label: "Microwave oven", watts: 1_200, duty: 1 },
  } as Record<string, { label: string; watts: number; duty: number }>,
};
